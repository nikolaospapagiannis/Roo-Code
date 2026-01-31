/**
 * Session Storage Service
 *
 * PostgreSQL + Redis session storage for distributed systems
 * NO MOCKS - Uses actual Prisma + PostgreSQL + Redis
 */

import { PrismaClient, Session as PrismaSession } from '@prisma/client'
import Redis from 'ioredis'
import { EventEmitter } from 'events'
import { createHash, randomBytes } from 'crypto'

export interface SessionData {
  id: string
  userId: string
  tokenHash: string
  createdAt: Date
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
  tokenCount: number
  contextWindow: number
  lastActivity: Date
}

export interface SessionCreateOptions {
  userId: string
  token: string
  expiresIn?: number // milliseconds, default 24h
  ipAddress?: string
  userAgent?: string
  contextWindow?: number
}

export class SessionStorageService extends EventEmitter {
  private static instance: SessionStorageService | null = null
  private prisma: PrismaClient
  private redis: Redis
  private redisAvailable: boolean = false
  private readonly SESSION_PREFIX = 'session:'
  private readonly DEFAULT_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours
  private readonly DEFAULT_CONTEXT_WINDOW = 8192

  private constructor() {
    super()
    this.prisma = new PrismaClient()

    // Initialize Redis
    const redisHost = process.env.REDIS_HOST || 'localhost'
    const redisPort = parseInt(process.env.REDIS_PORT || '6379')

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
          this.redisAvailable = false
          return null
        }
        return Math.min(times * 50, 2000)
      },
      maxRetriesPerRequest: 3
    })

    this.redis.on('connect', () => {
      this.redisAvailable = true
      this.emit('redis:connected')
    })

    this.redis.on('error', (err) => {
      this.redisAvailable = false
      this.emit('redis:error', err)
    })
  }

  static getInstance(): SessionStorageService {
    if (!SessionStorageService.instance) {
      SessionStorageService.instance = new SessionStorageService()
    }
    return SessionStorageService.instance
  }

  async initialize(): Promise<void> {
    await this.prisma.$connect()

    // Test Redis connection
    try {
      await this.redis.ping()
      this.redisAvailable = true
    } catch (error) {
      this.redisAvailable = false
      console.warn('Redis not available, using PostgreSQL only')
    }

    this.emit('initialized', { redis: this.redisAvailable })
  }

  /**
   * Hash token for storage (SHA-256)
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  /**
   * Create session in PostgreSQL + Redis
   */
  async createSession(options: SessionCreateOptions): Promise<SessionData> {
    const {
      userId,
      token,
      expiresIn = this.DEFAULT_EXPIRY,
      ipAddress,
      userAgent,
      contextWindow = this.DEFAULT_CONTEXT_WINDOW
    } = options

    const tokenHash = this.hashToken(token)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + expiresIn)

    // Create in PostgreSQL (source of truth)
    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        createdAt: now,
        expiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        tokenCount: 0,
        contextWindow,
        lastActivity: now
      }
    })

    const sessionData = this.mapPrismaToSession(session)

    // Cache in Redis for fast lookup
    if (this.redisAvailable) {
      try {
        const ttlSeconds = Math.floor(expiresIn / 1000)
        await this.redis.setex(
          `${this.SESSION_PREFIX}${session.id}`,
          ttlSeconds,
          JSON.stringify(sessionData)
        )

        // Also index by token hash for quick lookup
        await this.redis.setex(
          `${this.SESSION_PREFIX}token:${tokenHash}`,
          ttlSeconds,
          session.id
        )
      } catch (error) {
        // Redis cache failed, but PostgreSQL succeeded
        this.emit('redis:cache_failed', { sessionId: session.id, error })
      }
    }

    this.emit('session:created', { sessionId: session.id, userId })

    return sessionData
  }

  /**
   * Get session by ID (tries Redis first, falls back to PostgreSQL)
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    // Try Redis cache first
    if (this.redisAvailable) {
      try {
        const cached = await this.redis.get(`${this.SESSION_PREFIX}${sessionId}`)
        if (cached) {
          const session = JSON.parse(cached)
          // Verify not expired
          if (new Date(session.expiresAt) > new Date()) {
            return session
          }
        }
      } catch (error) {
        // Redis failed, fall through to database
        this.emit('redis:read_failed', { sessionId, error })
      }
    }

    // Fall back to PostgreSQL
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        expiresAt: { gt: new Date() }
      }
    })

    if (!session) {
      return null
    }

    const sessionData = this.mapPrismaToSession(session)

    // Update Redis cache if available
    if (this.redisAvailable && session) {
      try {
        const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
        if (ttl > 0) {
          await this.redis.setex(
            `${this.SESSION_PREFIX}${sessionId}`,
            ttl,
            JSON.stringify(sessionData)
          )
        }
      } catch (error) {
        // Redis cache update failed, not critical
      }
    }

    return sessionData
  }

  /**
   * Get session by token
   */
  async getSessionByToken(token: string): Promise<SessionData | null> {
    const tokenHash = this.hashToken(token)

    // Try Redis index first
    if (this.redisAvailable) {
      try {
        const sessionId = await this.redis.get(`${this.SESSION_PREFIX}token:${tokenHash}`)
        if (sessionId) {
          return await this.getSession(sessionId)
        }
      } catch (error) {
        // Redis failed, fall through
      }
    }

    // Query PostgreSQL
    const session = await this.prisma.session.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() }
      }
    })

    if (!session) {
      return null
    }

    return this.mapPrismaToSession(session)
  }

  /**
   * Update token count (for context window management)
   */
  async updateTokenCount(sessionId: string, tokenCount: number): Promise<void> {
    // Update in PostgreSQL
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        tokenCount,
        lastActivity: new Date()
      }
    })

    // Invalidate Redis cache
    if (this.redisAvailable) {
      try {
        await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`)
      } catch (error) {
        // Not critical
      }
    }

    this.emit('session:token_count_updated', { sessionId, tokenCount })
  }

  /**
   * Update last activity timestamp
   */
  async updateActivity(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        lastActivity: new Date()
      }
    })

    // Invalidate cache
    if (this.redisAvailable) {
      try {
        await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`)
      } catch (error) {
        // Not critical
      }
    }
  }

  /**
   * Delete session (logout)
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Get session first to get token hash
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId }
    })

    // Delete from PostgreSQL
    await this.prisma.session.delete({
      where: { id: sessionId }
    })

    // Delete from Redis
    if (this.redisAvailable && session) {
      try {
        await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`)
        await this.redis.del(`${this.SESSION_PREFIX}token:${session.tokenHash}`)
      } catch (error) {
        // Not critical
      }
    }

    this.emit('session:deleted', { sessionId })
  }

  /**
   * Delete all sessions for user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    // Get all sessions for cache invalidation
    const sessions = await this.prisma.session.findMany({
      where: { userId }
    })

    // Delete from PostgreSQL
    const result = await this.prisma.session.deleteMany({
      where: { userId }
    })

    // Delete from Redis
    if (this.redisAvailable && sessions.length > 0) {
      try {
        const keys = sessions.flatMap(s => [
          `${this.SESSION_PREFIX}${s.id}`,
          `${this.SESSION_PREFIX}token:${s.tokenHash}`
        ])
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      } catch (error) {
        // Not critical
      }
    }

    this.emit('session:user_sessions_deleted', { userId, count: result.count })

    return result.count
  }

  /**
   * Get all active sessions for user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: {
        lastActivity: 'desc'
      }
    })

    return sessions.map(s => this.mapPrismaToSession(s))
  }

  /**
   * Cleanup expired sessions (run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const expired = await this.prisma.session.findMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    })

    // Delete from PostgreSQL
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    })

    // Clean Redis cache
    if (this.redisAvailable && expired.length > 0) {
      try {
        const keys = expired.flatMap(s => [
          `${this.SESSION_PREFIX}${s.id}`,
          `${this.SESSION_PREFIX}token:${s.tokenHash}`
        ])
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      } catch (error) {
        // Not critical
      }
    }

    this.emit('session:cleanup', { count: result.count })

    return result.count
  }

  /**
   * Get session count
   */
  async getSessionCount(userId?: string): Promise<number> {
    return await this.prisma.session.count({
      where: userId ? {
        userId,
        expiresAt: { gt: new Date() }
      } : {
        expiresAt: { gt: new Date() }
      }
    })
  }

  /**
   * Helper to map Prisma model to interface
   */
  private mapPrismaToSession(prismaSession: PrismaSession): SessionData {
    return {
      id: prismaSession.id,
      userId: prismaSession.userId,
      tokenHash: prismaSession.tokenHash,
      createdAt: prismaSession.createdAt,
      expiresAt: prismaSession.expiresAt,
      ipAddress: prismaSession.ipAddress || undefined,
      userAgent: prismaSession.userAgent || undefined,
      tokenCount: prismaSession.tokenCount,
      contextWindow: prismaSession.contextWindow,
      lastActivity: prismaSession.lastActivity
    }
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    await this.prisma.$disconnect()

    if (this.redis.status === 'ready') {
      await this.redis.quit()
    }

    this.emit('shutdown')
  }
}
