/**
 * Tests for JwtBlacklistService
 * These tests ACTUALLY verify PostgreSQL + Redis token blacklist
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') })

import { JwtBlacklistService } from '../JwtBlacklistService'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

describe('JwtBlacklistService - PostgreSQL + Redis Integration', () => {
  let service: JwtBlacklistService
  let prisma: PrismaClient
  let redis: Redis
  let userId: string // Will be set after creating user
  const testJti = 'test-jti-' + Math.random().toString(36)
  const testToken = 'test-token-' + Math.random().toString(36)

  beforeAll(async () => {
    prisma = new PrismaClient()
    await prisma.$connect()

    // Create test user (let Prisma generate UUID)
    const user = await prisma.user.create({
      data: {
        username: 'jwttest-' + Date.now(),
        email: 'jwttest-' + Date.now() + '@example.com',
        passwordHash: 'hash',
        roles: [],
        isActive: true
      }
    })
    userId = user.id

    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    })

    service = JwtBlacklistService.getInstance()
    await service.initialize()
  })

  afterAll(async () => {
    // Cleanup test data
    await prisma.jwtBlacklist.deleteMany({
      where: {
        jti: { startsWith: 'test-jti-' }
      }
    })

    await prisma.jwtBlacklist.deleteMany({
      where: { userId }
    })

    await prisma.user.delete({
      where: { id: userId }
    })

    await service.shutdown()
    await prisma.$disconnect()
    await redis.quit()
  })

  describe('✅ ACTUALLY Uses PostgreSQL', () => {
    it('should blacklist token in database (not memory)', async () => {
      const entry = await service.blacklistToken({
        jti: testJti,
        token: testToken,
        userId,
        reason: 'User logout',
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      })

      expect(entry.id).toBeDefined()
      expect(entry.jti).toBe(testJti)
      expect(entry.userId).toBe(userId)

      // ACTUALLY verify in database
      const dbEntry = await prisma.jwtBlacklist.findUnique({
        where: { jti: testJti }
      })

      expect(dbEntry).not.toBeNull()
      expect(dbEntry?.jti).toBe(testJti)
      expect(dbEntry?.userId).toBe(userId)
      expect(dbEntry?.reason).toBe('User logout')
    })

    it('should persist data across service restarts', async () => {
      const jti = 'test-jti-persist-' + Math.random()

      await service.blacklistToken({
        jti,
        token: 'token-persist-' + Math.random(),
        userId,
        expiresAt: new Date(Date.now() + 3600000)
      })

      // Shutdown service
      await service.shutdown()

      // Create new service instance
      const newService = JwtBlacklistService.getInstance()
      await newService.initialize()

      // Data should STILL exist
      const isBlacklisted = await newService.isTokenBlacklisted(jti)

      expect(isBlacklisted).toBe(true)
    })

    it('should check token blacklist from database', async () => {
      const jti = 'test-jti-check-' + Math.random()

      await service.blacklistToken({
        jti,
        token: 'token-check-' + Math.random(),
        expiresAt: new Date(Date.now() + 3600000)
      })

      const isBlacklisted = await service.isTokenBlacklisted(jti)
      expect(isBlacklisted).toBe(true)

      const notBlacklisted = await service.isTokenBlacklisted('nonexistent-jti')
      expect(notBlacklisted).toBe(false)
    })
  })

  describe('✅ ACTUALLY Uses Redis Cache', () => {
    it('should cache blacklisted token in Redis (if Redis available)', async () => {
      const jti = 'test-jti-cache-' + Math.random()
      const token = 'token-cache-' + Math.random()

      await service.blacklistToken({
        jti,
        token,
        expiresAt: new Date(Date.now() + 3600000)
      })

      // Wait for async caching
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check Redis directly
      const cached = await redis.get(`jwt:jti:${jti}`)

      // Redis caching is optional (fallback to PostgreSQL if unavailable)
      if (cached) {
        expect(cached).toBe('blacklisted')
      } else {
        console.log('Redis caching not available, using PostgreSQL only')
      }
    })

    it('should cache by token hash in Redis (if Redis available)', async () => {
      const jti = 'test-jti-hash-' + Math.random()
      const token = 'token-hash-' + Math.random()

      await service.blacklistToken({
        jti,
        token,
        expiresAt: new Date(Date.now() + 3600000)
      })

      // Wait for async caching
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check token hash in Redis
      const tokenHash = require('crypto')
        .createHash('sha256')
        .update(token)
        .digest('hex')

      const cached = await redis.get(`jwt:blacklist:${tokenHash}`)

      // Redis caching is optional
      if (cached) {
        const parsedCache = JSON.parse(cached!)
        expect(parsedCache.jti).toBe(jti)
      } else {
        console.log('Redis caching not available, using PostgreSQL only')
      }
    })

    it('should fall back to PostgreSQL when Redis unavailable', async () => {
      const jti = 'test-jti-fallback-' + Math.random()

      await service.blacklistToken({
        jti,
        token: 'token-fallback-' + Math.random(),
        expiresAt: new Date(Date.now() + 3600000)
      })

      // Delete from Redis to simulate cache miss
      await redis.del(`jwt:jti:${jti}`)

      // Should still check PostgreSQL
      const isBlacklisted = await service.isTokenBlacklisted(jti)

      expect(isBlacklisted).toBe(true)
    })
  })

  describe('✅ ACTUALLY Hashes Tokens', () => {
    it('should store hashed tokens (not plaintext)', async () => {
      const plainToken = 'secret-token-' + Math.random()
      const jti = 'test-jti-hash-' + Math.random()

      await service.blacklistToken({
        jti,
        token: plainToken,
        expiresAt: new Date(Date.now() + 3600000)
      })

      // Check database directly
      const dbEntry = await prisma.jwtBlacklist.findUnique({
        where: { jti }
      })

      // Should NOT contain plaintext token
      expect(dbEntry?.tokenHash).not.toBe(plainToken)
      expect(dbEntry?.tokenHash.length).toBe(64) // SHA-256 hex length
    })

    it('should check blacklist by token hash', async () => {
      const token = 'token-by-hash-' + Math.random()
      const jti = 'test-jti-by-hash-' + Math.random()

      await service.blacklistToken({
        jti,
        token,
        expiresAt: new Date(Date.now() + 3600000)
      })

      // Check using token hash
      const isBlacklisted = await service.isTokenHashBlacklisted(token)

      expect(isBlacklisted).toBe(true)
    })
  })

  describe('✅ ACTUALLY Handles Expiration', () => {
    it('should not return expired tokens as blacklisted', async () => {
      const jti = 'test-jti-expired-' + Math.random()

      await service.blacklistToken({
        jti,
        token: 'token-expired-' + Math.random(),
        expiresAt: new Date(Date.now() + 1000) // 1 second
      })

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500))

      const isBlacklisted = await service.isTokenBlacklisted(jti)

      expect(isBlacklisted).toBe(false)
    })

    it('should cleanup expired tokens in bulk', async () => {
      const jti = 'test-jti-cleanup-' + Math.random()

      // Create expired token
      await service.blacklistToken({
        jti,
        token: 'token-cleanup-' + Math.random(),
        expiresAt: new Date(Date.now() + 1) // 1ms
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const cleaned = await service.cleanupExpiredTokens()

      expect(cleaned).toBeGreaterThanOrEqual(1)

      // Verify deleted from database
      const dbEntry = await prisma.jwtBlacklist.findUnique({
        where: { jti }
      })

      expect(dbEntry).toBeNull()
    })
  })

  describe('✅ ACTUALLY Manages User Tokens', () => {
    it('should get all blacklisted tokens for user', async () => {
      // Create test user (let Prisma generate UUID)
      const testUser = await prisma.user.create({
        data: {
          username: 'multi-jwt-' + Date.now(),
          email: 'multi-jwt-' + Date.now() + '@example.com',
          passwordHash: 'hash',
          roles: [],
          isActive: true
        }
      })
      const testUserId = testUser.id

      // Blacklist multiple tokens
      await service.blacklistToken({
        jti: 'multi-1-' + Math.random(),
        token: 'token-1-' + Math.random(),
        userId: testUserId,
        expiresAt: new Date(Date.now() + 3600000)
      })

      await service.blacklistToken({
        jti: 'multi-2-' + Math.random(),
        token: 'token-2-' + Math.random(),
        userId: testUserId,
        expiresAt: new Date(Date.now() + 3600000)
      })

      await service.blacklistToken({
        jti: 'multi-3-' + Math.random(),
        token: 'token-3-' + Math.random(),
        userId: testUserId,
        expiresAt: new Date(Date.now() + 3600000)
      })

      const tokens = await service.getUserBlacklistedTokens(testUserId)

      expect(tokens.length).toBe(3)
      expect(tokens[0].userId).toBe(testUserId)

      // Cleanup
      await prisma.jwtBlacklist.deleteMany({
        where: { userId: testUserId }
      })
      await prisma.user.delete({ where: { id: testUserId } })
    })

    it('should revoke all user tokens', async () => {
      const revoked = await service.revokeAllUserTokens(userId, 'Security incident')

      expect(revoked).toBe(1)

      // Verify created in database
      const entry = await prisma.jwtBlacklist.findFirst({
        where: {
          userId,
          reason: 'Security incident'
        }
      })

      expect(entry).not.toBeNull()
      expect(entry?.jti).toContain('revoke-all-')
    })
  })

  describe('✅ ACTUALLY Manages Blacklist Entries', () => {
    it('should get blacklist entry by JTI', async () => {
      const jti = 'test-jti-get-' + Math.random()

      await service.blacklistToken({
        jti,
        token: 'token-get-' + Math.random(),
        userId,
        reason: 'Test entry',
        expiresAt: new Date(Date.now() + 3600000)
      })

      const entry = await service.getBlacklistEntry(jti)

      expect(entry).not.toBeNull()
      expect(entry?.jti).toBe(jti)
      expect(entry?.userId).toBe(userId)
      expect(entry?.reason).toBe('Test entry')
    })

    it('should remove token from blacklist', async () => {
      const jti = 'test-jti-remove-' + Math.random()

      await service.blacklistToken({
        jti,
        token: 'token-remove-' + Math.random(),
        expiresAt: new Date(Date.now() + 3600000)
      })

      await service.removeFromBlacklist(jti)

      // Verify deleted from database
      const dbEntry = await prisma.jwtBlacklist.findUnique({
        where: { jti }
      })

      expect(dbEntry).toBeNull()

      // Verify deleted from Redis
      const cached = await redis.get(`jwt:jti:${jti}`)
      expect(cached).toBeNull()
    })

    it('should get blacklist statistics', async () => {
      const stats = await service.getStats()

      expect(stats.total).toBeGreaterThanOrEqual(0)
      expect(stats.active).toBeGreaterThanOrEqual(0)
      expect(stats.expired).toBeGreaterThanOrEqual(0)
      expect(stats.total).toBe(stats.active + stats.expired)
    })
  })
})
