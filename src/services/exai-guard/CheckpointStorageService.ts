/**
 * Checkpoint Storage Service
 *
 * PostgreSQL-backed checkpoint storage for conversation recovery
 * NO MOCKS - Uses actual Prisma + PostgreSQL
 */

import { PrismaClient, Checkpoint as PrismaCheckpoint } from '@prisma/client'
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'
import { EventEmitter } from 'events'

export interface CheckpointData {
  messages: any[]
  tokenCount: number
  messageCount: number
  metadata?: Record<string, any>
}

export interface Checkpoint {
  id: string
  sessionId: string
  userId?: string | null
  data: CheckpointData
  version: number
  tokenCount: number
  messageCount: number
  createdAt: Date
  expiresAt?: Date | null
  signature?: string | null
  status: string
}

export class CheckpointStorageService extends EventEmitter {
  private static instance: CheckpointStorageService | null = null
  private prisma: PrismaClient
  private encryptionKey: Buffer
  private algorithm = 'aes-256-gcm'

  private constructor() {
    super()
    this.prisma = new PrismaClient()

    // Get encryption key from environment
    const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET
    if (!key) {
      throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set in environment')
    }

    // Ensure key is 32 bytes for AES-256
    this.encryptionKey = Buffer.from(
      createHash('sha256').update(key).digest('hex').slice(0, 64),
      'hex'
    )
  }

  static getInstance(): CheckpointStorageService {
    if (!CheckpointStorageService.instance) {
      CheckpointStorageService.instance = new CheckpointStorageService()
    }
    return CheckpointStorageService.instance
  }

  async initialize(): Promise<void> {
    await this.prisma.$connect()
    this.emit('initialized')
  }

  /**
   * Encrypt checkpoint data using AES-256-GCM
   */
  private encrypt(data: string): { encrypted: string; iv: string; tag: string } {
    const iv = randomBytes(16)
    const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv)

    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // Get auth tag for GCM mode
    const tag = cipher.getAuthTag().toString('hex')

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag
    }
  }

  /**
   * Decrypt checkpoint data
   */
  private decrypt(encrypted: string, iv: string, tag?: string): string {
    const decipher = createDecipheriv(this.algorithm, this.encryptionKey, Buffer.from(iv, 'hex'))

    // Set auth tag (GCM mode)
    if (tag) {
      decipher.setAuthTag(Buffer.from(tag, 'hex'))
    }

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * Generate signature for tamper detection (SHA-256)
   */
  private generateSignature(data: string): string {
    return createHash('sha256')
      .update(data + this.encryptionKey.toString('hex'))
      .digest('hex')
  }

  /**
   * Save checkpoint to PostgreSQL
   */
  async saveCheckpoint(
    sessionId: string,
    data: CheckpointData,
    userId?: string,
    expiresIn?: number // milliseconds
  ): Promise<Checkpoint> {
    // Serialize and encrypt data
    const dataJson = JSON.stringify(data)
    const { encrypted, iv, tag } = this.encrypt(dataJson)

    // Store encryption metadata with encrypted data
    const encryptedPayload = JSON.stringify({ encrypted, iv, tag })

    // Generate signature
    const signature = this.generateSignature(encryptedPayload)

    // Calculate expiration
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn)
      : null

    // Save to database using Prisma
    const checkpoint = await this.prisma.checkpoint.create({
      data: {
        sessionId,
        userId: userId || null,
        dataEncrypted: encryptedPayload,
        version: 1,
        tokenCount: data.tokenCount,
        messageCount: data.messageCount,
        expiresAt,
        signature,
        status: 'active'
      }
    })

    this.emit('checkpoint:saved', { id: checkpoint.id, sessionId })

    return this.mapPrismaToCheckpoint(checkpoint, data)
  }

  /**
   * Load checkpoint from PostgreSQL
   */
  async loadCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
    const checkpoint = await this.prisma.checkpoint.findUnique({
      where: { id: checkpointId }
    })

    if (!checkpoint) {
      return null
    }

    // Check if expired
    if (checkpoint.expiresAt && checkpoint.expiresAt < new Date()) {
      await this.expireCheckpoint(checkpointId)
      return null
    }

    // Decrypt data
    const payload = JSON.parse(checkpoint.dataEncrypted)
    const decrypted = this.decrypt(payload.encrypted, payload.iv, payload.tag)
    const data: CheckpointData = JSON.parse(decrypted)

    // Verify signature
    if (checkpoint.signature) {
      const expectedSignature = this.generateSignature(checkpoint.dataEncrypted)
      if (expectedSignature !== checkpoint.signature) {
        this.emit('checkpoint:tampered', { id: checkpointId })
        throw new Error(`Checkpoint ${checkpointId} signature verification failed - possible tampering`)
      }
    }

    return this.mapPrismaToCheckpoint(checkpoint, data)
  }

  /**
   * Get all checkpoints for a session
   */
  async getSessionCheckpoints(sessionId: string): Promise<Checkpoint[]> {
    const checkpoints = await this.prisma.checkpoint.findMany({
      where: {
        sessionId,
        status: 'active'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const decrypted: Checkpoint[] = []

    for (const checkpoint of checkpoints) {
      try {
        const payload = JSON.parse(checkpoint.dataEncrypted)
        const decryptedData = this.decrypt(payload.encrypted, payload.iv, payload.tag)
        const data: CheckpointData = JSON.parse(decryptedData)

        decrypted.push(this.mapPrismaToCheckpoint(checkpoint, data))
      } catch (error) {
        console.error(`Failed to decrypt checkpoint ${checkpoint.id}:`, error)
      }
    }

    return decrypted
  }

  /**
   * Delete checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    await this.prisma.checkpoint.delete({
      where: { id: checkpointId }
    })

    this.emit('checkpoint:deleted', { id: checkpointId })
  }

  /**
   * Archive checkpoint (change status)
   */
  async archiveCheckpoint(checkpointId: string): Promise<void> {
    await this.prisma.checkpoint.update({
      where: { id: checkpointId },
      data: { status: 'archived' }
    })

    this.emit('checkpoint:archived', { id: checkpointId })
  }

  /**
   * Expire checkpoint
   */
  async expireCheckpoint(checkpointId: string): Promise<void> {
    await this.prisma.checkpoint.update({
      where: { id: checkpointId },
      data: { status: 'expired' }
    })

    this.emit('checkpoint:expired', { id: checkpointId })
  }

  /**
   * Cleanup expired checkpoints (run periodically)
   */
  async cleanupExpiredCheckpoints(): Promise<number> {
    const result = await this.prisma.checkpoint.updateMany({
      where: {
        expiresAt: {
          lt: new Date()
        },
        status: 'active'
      },
      data: {
        status: 'expired'
      }
    })

    return result.count
  }

  /**
   * Get checkpoint count for session
   */
  async getCheckpointCount(sessionId: string): Promise<number> {
    return await this.prisma.checkpoint.count({
      where: {
        sessionId,
        status: 'active'
      }
    })
  }

  /**
   * Helper to map Prisma model to our interface
   */
  private mapPrismaToCheckpoint(
    prismaCheckpoint: PrismaCheckpoint,
    data: CheckpointData
  ): Checkpoint {
    return {
      id: prismaCheckpoint.id,
      sessionId: prismaCheckpoint.sessionId,
      userId: prismaCheckpoint.userId,
      data,
      version: prismaCheckpoint.version,
      tokenCount: prismaCheckpoint.tokenCount,
      messageCount: prismaCheckpoint.messageCount,
      createdAt: prismaCheckpoint.createdAt,
      expiresAt: prismaCheckpoint.expiresAt,
      signature: prismaCheckpoint.signature,
      status: prismaCheckpoint.status
    }
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    await this.prisma.$disconnect()
    this.emit('shutdown')
  }
}
