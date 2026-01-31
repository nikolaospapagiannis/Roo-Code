/**
 * Tests for CheckpointStorageService
 * These tests ACTUALLY verify PostgreSQL checkpoint storage
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') })

import { CheckpointStorageService, CheckpointData } from '../CheckpointStorageService'
import { PrismaClient } from '@prisma/client'

describe('CheckpointStorageService - PostgreSQL Integration', () => {
  let service: CheckpointStorageService
  let prisma: PrismaClient
  const sessionId = 'test-session-' + Date.now()
  const userId = 'test-user-' + Date.now()

  beforeAll(async () => {
    prisma = new PrismaClient()
    await prisma.$connect()

    service = CheckpointStorageService.getInstance()
    await service.initialize()
  })

  afterAll(async () => {
    // Cleanup test data
    await prisma.checkpoint.deleteMany({
      where: {
        sessionId: { startsWith: 'test-session-' }
      }
    })

    await service.shutdown()
    await prisma.$disconnect()
  })

  describe('✅ ACTUALLY Uses PostgreSQL', () => {
    it('should save checkpoint to database (not memory)', async () => {
      const data: CheckpointData = {
        messages: [{ role: 'user', content: 'test message' }],
        tokenCount: 10,
        messageCount: 1,
        metadata: { test: true }
      }

      const checkpoint = await service.saveCheckpoint(sessionId, data, userId)

      expect(checkpoint.id).toBeDefined()
      expect(checkpoint.sessionId).toBe(sessionId)

      // ACTUALLY verify in database using Prisma directly
      const dbCheckpoint = await prisma.checkpoint.findUnique({
        where: { id: checkpoint.id }
      })

      expect(dbCheckpoint).not.toBeNull()
      expect(dbCheckpoint?.sessionId).toBe(sessionId)
      expect(dbCheckpoint?.tokenCount).toBe(10)
      expect(dbCheckpoint?.messageCount).toBe(1)
    })

    it('should load checkpoint from database', async () => {
      const data: CheckpointData = {
        messages: [{ role: 'user', content: 'load test' }],
        tokenCount: 20,
        messageCount: 1
      }

      const saved = await service.saveCheckpoint(sessionId, data, userId)

      // Load from database
      const loaded = await service.loadCheckpoint(saved.id)

      expect(loaded).not.toBeNull()
      expect(loaded?.id).toBe(saved.id)
      expect(loaded?.data.messages).toEqual(data.messages)
      expect(loaded?.data.tokenCount).toBe(20)
    })

    it('should persist data across service restarts', async () => {
      const data: CheckpointData = {
        messages: [{ role: 'user', content: 'persistence test' }],
        tokenCount: 30,
        messageCount: 1
      }

      const saved = await service.saveCheckpoint(sessionId, data, userId)
      const checkpointId = saved.id

      // Shutdown service (would lose memory-based data)
      await service.shutdown()

      // Create new service instance
      const newService = CheckpointStorageService.getInstance()
      await newService.initialize()

      // Data should STILL exist in database
      const loaded = await newService.loadCheckpoint(checkpointId)

      expect(loaded).not.toBeNull()
      expect(loaded?.data.messages).toEqual(data.messages)
    })
  })

  describe('✅ ACTUALLY Encrypts Data', () => {
    it('should store encrypted data in database', async () => {
      const data: CheckpointData = {
        messages: [{ role: 'user', content: 'secret message' }],
        tokenCount: 40,
        messageCount: 1,
        metadata: { password: 'super-secret' }
      }

      const checkpoint = await service.saveCheckpoint(sessionId, data, userId)

      // Check database directly
      const dbCheckpoint = await prisma.checkpoint.findUnique({
        where: { id: checkpoint.id }
      })

      // dataEncrypted should NOT contain plaintext
      expect(dbCheckpoint?.dataEncrypted).not.toContain('secret message')
      expect(dbCheckpoint?.dataEncrypted).not.toContain('super-secret')

      // Should contain encryption metadata
      const payload = JSON.parse(dbCheckpoint!.dataEncrypted)
      expect(payload.encrypted).toBeDefined()
      expect(payload.iv).toBeDefined()
    })

    it('should decrypt data correctly when loading', async () => {
      const data: CheckpointData = {
        messages: [{ role: 'user', content: 'encrypted test' }],
        tokenCount: 50,
        messageCount: 1,
        metadata: { key: 'value' }
      }

      const saved = await service.saveCheckpoint(sessionId, data, userId)
      const loaded = await service.loadCheckpoint(saved.id)

      expect(loaded?.data.messages).toEqual(data.messages)
      expect(loaded?.data.metadata).toEqual(data.metadata)
    })
  })

  describe('✅ ACTUALLY Validates Signatures', () => {
    it('should generate signature for tamper detection', async () => {
      const data: CheckpointData = {
        messages: [{ role: 'user', content: 'signed message' }],
        tokenCount: 60,
        messageCount: 1
      }

      const checkpoint = await service.saveCheckpoint(sessionId, data, userId)

      // Check database
      const dbCheckpoint = await prisma.checkpoint.findUnique({
        where: { id: checkpoint.id }
      })

      expect(dbCheckpoint?.signature).toBeDefined()
      expect(dbCheckpoint?.signature?.length).toBeGreaterThan(0)
    })

    it('should detect tampered data', async () => {
      const data: CheckpointData = {
        messages: [{ role: 'user', content: 'tamper test' }],
        tokenCount: 70,
        messageCount: 1
      }

      const checkpoint = await service.saveCheckpoint(sessionId, data, userId)

      // Tamper with database directly
      await prisma.checkpoint.update({
        where: { id: checkpoint.id },
        data: {
          dataEncrypted: JSON.stringify({
            encrypted: 'tampered',
            iv: 'fake',
            tag: 'fake'
          })
        }
      })

      // Should throw error on load (either signature or decryption error)
      await expect(service.loadCheckpoint(checkpoint.id)).rejects.toThrow()
    })
  })

  describe('✅ ACTUALLY Manages Sessions', () => {
    it('should get all checkpoints for session', async () => {
      const testSessionId = 'test-session-multi-' + Date.now()

      // Create multiple checkpoints
      await service.saveCheckpoint(testSessionId, {
        messages: [],
        tokenCount: 10,
        messageCount: 1
      }, userId)

      await service.saveCheckpoint(testSessionId, {
        messages: [],
        tokenCount: 20,
        messageCount: 2
      }, userId)

      await service.saveCheckpoint(testSessionId, {
        messages: [],
        tokenCount: 30,
        messageCount: 3
      }, userId)

      const checkpoints = await service.getSessionCheckpoints(testSessionId)

      expect(checkpoints.length).toBe(3)
      // Should be ordered by created_at DESC
      expect(checkpoints[0].tokenCount).toBe(30)
      expect(checkpoints[1].tokenCount).toBe(20)
      expect(checkpoints[2].tokenCount).toBe(10)
    })

    it('should count checkpoints for session', async () => {
      const testSessionId = 'test-session-count-' + Date.now()

      await service.saveCheckpoint(testSessionId, {
        messages: [],
        tokenCount: 10,
        messageCount: 1
      }, userId)

      await service.saveCheckpoint(testSessionId, {
        messages: [],
        tokenCount: 20,
        messageCount: 2
      }, userId)

      const count = await service.getCheckpointCount(testSessionId)
      expect(count).toBe(2)
    })
  })

  describe('✅ ACTUALLY Handles Expiration', () => {
    it('should not return expired checkpoints', async () => {
      const data: CheckpointData = {
        messages: [{ role: 'user', content: 'expired test' }],
        tokenCount: 80,
        messageCount: 1
      }

      // Create checkpoint that expires in 1 second
      const checkpoint = await service.saveCheckpoint(
        sessionId,
        data,
        userId,
        1000 // 1 second
      )

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Should return null
      const loaded = await service.loadCheckpoint(checkpoint.id)
      expect(loaded).toBeNull()

      // Check status updated in database
      const dbCheckpoint = await prisma.checkpoint.findUnique({
        where: { id: checkpoint.id }
      })

      expect(dbCheckpoint?.status).toBe('expired')
    })

    it('should cleanup expired checkpoints in bulk', async () => {
      const testSessionId = 'test-session-cleanup-' + Date.now()

      // Create checkpoint with immediate expiration
      await service.saveCheckpoint(
        testSessionId,
        { messages: [], tokenCount: 10, messageCount: 1 },
        userId,
        1 // 1ms
      )

      await new Promise(resolve => setTimeout(resolve, 100))

      const cleaned = await service.cleanupExpiredCheckpoints()
      expect(cleaned).toBeGreaterThanOrEqual(1)
    })
  })

  describe('✅ ACTUALLY Manages Checkpoint Status', () => {
    it('should delete checkpoint from database', async () => {
      const data: CheckpointData = {
        messages: [],
        tokenCount: 90,
        messageCount: 1
      }

      const checkpoint = await service.saveCheckpoint(sessionId, data, userId)

      await service.deleteCheckpoint(checkpoint.id)

      // Verify deleted from database
      const dbCheckpoint = await prisma.checkpoint.findUnique({
        where: { id: checkpoint.id }
      })

      expect(dbCheckpoint).toBeNull()
    })

    it('should archive checkpoint', async () => {
      const data: CheckpointData = {
        messages: [],
        tokenCount: 100,
        messageCount: 1
      }

      const checkpoint = await service.saveCheckpoint(sessionId, data, userId)

      await service.archiveCheckpoint(checkpoint.id)

      // Verify status updated in database
      const dbCheckpoint = await prisma.checkpoint.findUnique({
        where: { id: checkpoint.id }
      })

      expect(dbCheckpoint?.status).toBe('archived')
    })
  })
})
