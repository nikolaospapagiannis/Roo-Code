/**
 * Self-Learning Service - AI-Powered Pattern Recognition and Solution Caching
 *
 * Enterprise Fortune 100 self-learning system with:
 * - Automatic error pattern recognition
 * - Solution caching with success rate tracking
 * - Adaptive learning from outcomes
 * - PostgreSQL-backed persistence
 *
 * NO MOCKS - Uses actual Prisma + PostgreSQL
 */

import { PrismaClient } from '@prisma/client'
import { EventEmitter } from 'events'
import { createHash } from 'crypto'

export interface ErrorPattern {
  id: string
  patternHash: string
  patternSignature: string
  errorType?: string
  language?: string
  framework?: string
  occurrenceCount: number
  firstSeen: Date
  lastSeen: Date
  confidenceScore: number
  metadata: Record<string, any>
}

export interface Solution {
  id: string
  patternId: string
  solutionHash: string
  solutionText: string
  solutionType?: string
  successCount: number
  failureCount: number
  successRate: number
  avgResolutionTime?: number
  contextTags: string[]
  prerequisites: any[]
  sideEffects: any[]
  lastUsed?: Date
}

export interface SolutionApplication {
  id: string
  solutionId: string
  patternId: string
  userId?: string
  sessionId?: string
  appliedAt: Date
  resolutionTime?: number
  outcome: 'success' | 'failure' | 'partial'
  confidence?: number
  feedback?: string
  errorContext: Record<string, any>
}

export interface LearningMetrics {
  totalPatternsRecognized: number
  totalSolutionsCached: number
  averageSuccessRate: number
  totalApplications: number
  successfulApplications: number
}

export interface RecognizeErrorOptions {
  errorMessage: string
  errorType?: string
  language?: string
  framework?: string
  stackTrace?: string
  context?: Record<string, any>
}

export interface CacheSolutionOptions {
  patternId: string
  solutionText: string
  solutionType?: string
  contextTags?: string[]
  prerequisites?: any[]
  sideEffects?: any[]
}

export interface ApplySolutionOptions {
  solutionId: string
  patternId: string
  userId?: string
  sessionId?: string
  outcome: 'success' | 'failure' | 'partial'
  resolutionTime?: number
  confidence?: number
  feedback?: string
  errorContext?: Record<string, any>
}

export class SelfLearningService extends EventEmitter {
  private static instance: SelfLearningService | null = null
  private prisma: PrismaClient

  private constructor() {
    super()
    this.prisma = new PrismaClient()
  }

  static getInstance(): SelfLearningService {
    if (!SelfLearningService.instance) {
      SelfLearningService.instance = new SelfLearningService()
    }
    return SelfLearningService.instance
  }

  async initialize(): Promise<void> {
    await this.prisma.$connect()
    this.emit('initialized')
  }

  /**
   * Normalize error message to create pattern signature
   * Replaces variable content with placeholders for better matching
   */
  private normalizeError(errorMessage: string, stackTrace?: string): string {
    let normalized = errorMessage

    // Replace numbers with placeholder
    normalized = normalized.replace(/\b\d+\b/g, '<NUMBER>')

    // Replace quoted strings with placeholder
    normalized = normalized.replace(/'[^']*'/g, '<STRING>')
    normalized = normalized.replace(/"[^"]*"/g, '<STRING>')

    // Replace file paths with placeholder
    normalized = normalized.replace(/([A-Za-z]:)?[\/\\][\w\/\\.-]+/g, '<PATH>')

    // Replace URLs with placeholder
    normalized = normalized.replace(/https?:\/\/[^\s]+/g, '<URL>')

    // Replace hex values with placeholder
    normalized = normalized.replace(/0x[0-9a-fA-F]+/g, '<HEX>')

    // Replace UUIDs with placeholder
    normalized = normalized.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')

    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim()

    // If stack trace provided, extract key patterns
    if (stackTrace) {
      // Extract function names from stack trace
      const functionMatches = stackTrace.match(/at\s+(\w+)\s+\(/g)
      if (functionMatches) {
        normalized += ' | functions: ' + functionMatches.join(',')
      }
    }

    return normalized
  }

  /**
   * Generate hash for pattern/solution
   */
  private generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex')
  }

  /**
   * Recognize error pattern or create new one
   */
  async recognizeError(options: RecognizeErrorOptions): Promise<ErrorPattern> {
    const { errorMessage, errorType, language, framework, stackTrace, context } = options

    // Normalize error to create pattern signature
    const patternSignature = this.normalizeError(errorMessage, stackTrace)
    const patternHash = this.generateHash(patternSignature)

    // Check if pattern exists
    let pattern = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM error_patterns WHERE pattern_hash = ${patternHash}
    `

    if (pattern.length > 0) {
      // Pattern exists - increment occurrence count
      const existing = pattern[0]

      await this.prisma.$executeRaw`
        SELECT increment_pattern_occurrence(${patternHash})
      `

      // Recalculate confidence score based on occurrences
      const occurrenceCount = existing.occurrence_count + 1
      const confidenceScore = Math.min(0.95, occurrenceCount / (occurrenceCount + 10))

      await this.prisma.$executeRaw`
        UPDATE error_patterns
        SET confidence_score = ${confidenceScore}
        WHERE pattern_hash = ${patternHash}
      `

      this.emit('pattern:recognized', { patternHash, occurrenceCount })

      return this.mapDbToErrorPattern({ ...existing, occurrence_count: occurrenceCount, confidence_score: confidenceScore })
    }

    // New pattern - create it
    const newPattern = await this.prisma.$queryRaw<any[]>`
      INSERT INTO error_patterns (
        pattern_hash,
        pattern_signature,
        error_type,
        language,
        framework,
        occurrence_count,
        confidence_score,
        metadata
      ) VALUES (
        ${patternHash},
        ${patternSignature},
        ${errorType || null},
        ${language || null},
        ${framework || null},
        1,
        0.05,
        ${JSON.stringify(context || {})}::jsonb
      )
      RETURNING *
    `

    this.emit('pattern:created', { patternHash })

    return this.mapDbToErrorPattern(newPattern[0])
  }

  /**
   * Cache solution for a pattern
   */
  async cacheSolution(options: CacheSolutionOptions): Promise<Solution> {
    const { patternId, solutionText, solutionType, contextTags, prerequisites, sideEffects } = options

    const solutionHash = this.generateHash(solutionText)

    // Check if solution already exists for this pattern
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM solution_cache
      WHERE pattern_id = ${patternId}::uuid
      AND solution_hash = ${solutionHash}
    `

    if (existing.length > 0) {
      this.emit('solution:exists', { solutionId: existing[0].id })
      return this.mapDbToSolution(existing[0])
    }

    // Create new solution
    // Use ARRAY constructor for PostgreSQL arrays
    const tagsArray = (contextTags || []).length > 0
      ? `ARRAY[${(contextTags || []).map(t => `'${t.replace(/'/g, "''")}'`).join(',')}]::text[]`
      : 'ARRAY[]::text[]'

    const solution = await this.prisma.$queryRawUnsafe(`
      INSERT INTO solution_cache (
        pattern_id,
        solution_hash,
        solution_text,
        solution_type,
        context_tags,
        prerequisites,
        side_effects
      ) VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        ${tagsArray},
        $5::jsonb,
        $6::jsonb
      )
      RETURNING *
    `, patternId, solutionHash, solutionText, solutionType || null, JSON.stringify(prerequisites || []), JSON.stringify(sideEffects || []))

    this.emit('solution:cached', { solutionId: solution[0].id, patternId })

    return this.mapDbToSolution(solution[0])
  }

  /**
   * Get recommended solutions for a pattern
   */
  async getSolutionsForPattern(patternId: string, limit: number = 5): Promise<Solution[]> {
    const solutions = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM solution_cache
      WHERE pattern_id = ${patternId}::uuid
      ORDER BY success_rate DESC, success_count DESC
      LIMIT ${limit}
    `

    return solutions.map(s => this.mapDbToSolution(s))
  }

  /**
   * Find similar patterns using pattern signatures
   */
  async findSimilarPatterns(errorMessage: string, limit: number = 10): Promise<ErrorPattern[]> {
    const patternSignature = this.normalizeError(errorMessage)

    // Use PostgreSQL similarity search (requires pg_trgm extension)
    // For now, use simple LIKE matching
    const patterns = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM error_patterns
      WHERE pattern_signature LIKE '%' || ${patternSignature.substring(0, 50)} || '%'
      ORDER BY confidence_score DESC, occurrence_count DESC
      LIMIT ${limit}
    `

    return patterns.map(p => this.mapDbToErrorPattern(p))
  }

  /**
   * Record solution application and outcome
   */
  async recordSolutionApplication(options: ApplySolutionOptions): Promise<SolutionApplication> {
    const { solutionId, patternId, userId, sessionId, outcome, resolutionTime, confidence, feedback, errorContext } = options

    // Record application
    const application = await this.prisma.$queryRaw<any[]>`
      INSERT INTO solution_applications (
        solution_id,
        pattern_id,
        user_id,
        session_id,
        outcome,
        resolution_time,
        confidence,
        feedback,
        error_context
      ) VALUES (
        ${solutionId}::uuid,
        ${patternId}::uuid,
        ${userId || null},
        ${sessionId || null},
        ${outcome},
        ${resolutionTime || null},
        ${confidence || null},
        ${feedback || null},
        ${JSON.stringify(errorContext || {})}::jsonb
      )
      RETURNING *
    `

    // Update solution success/failure counts
    await this.prisma.$executeRaw`
      SELECT record_solution_outcome(${solutionId}::uuid, ${outcome})
    `

    this.emit('solution:applied', { solutionId, outcome })

    return this.mapDbToApplication(application[0])
  }

  /**
   * Get learning metrics and statistics
   */
  async getMetrics(): Promise<LearningMetrics> {
    // Total patterns
    const patternsResult = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM error_patterns
    `
    const totalPatternsRecognized = parseInt(patternsResult[0].count)

    // Total solutions
    const solutionsResult = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM solution_cache
    `
    const totalSolutionsCached = parseInt(solutionsResult[0].count)

    // Average success rate
    const successRateResult = await this.prisma.$queryRaw<any[]>`
      SELECT AVG(success_rate) as avg_rate FROM solution_cache
      WHERE (success_count + failure_count) > 0
    `
    const averageSuccessRate = parseFloat(successRateResult[0]?.avg_rate || '0')

    // Total applications
    const applicationsResult = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successful
      FROM solution_applications
    `
    const totalApplications = parseInt(applicationsResult[0].total)
    const successfulApplications = parseInt(applicationsResult[0].successful)

    return {
      totalPatternsRecognized,
      totalSolutionsCached,
      averageSuccessRate,
      totalApplications,
      successfulApplications
    }
  }

  /**
   * Get top performing solutions
   */
  async getTopSolutions(limit: number = 20): Promise<Solution[]> {
    const solutions = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM solution_cache
      WHERE (success_count + failure_count) >= 3
      ORDER BY success_rate DESC, success_count DESC
      LIMIT ${limit}
    `

    return solutions.map(s => this.mapDbToSolution(s))
  }

  /**
   * Get frequently occurring error patterns
   */
  async getFrequentPatterns(limit: number = 20): Promise<ErrorPattern[]> {
    const patterns = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM error_patterns
      ORDER BY occurrence_count DESC, confidence_score DESC
      LIMIT ${limit}
    `

    return patterns.map(p => this.mapDbToErrorPattern(p))
  }

  /**
   * Cleanup old learning data
   */
  async cleanupOldData(daysToKeep: number = 90): Promise<number> {
    const result = await this.prisma.$queryRawUnsafe(`
      SELECT cleanup_old_learning_data($1::INTEGER)
    `, daysToKeep)

    const deletedCount = parseInt((result as any[])[0].cleanup_old_learning_data)

    this.emit('cleanup:completed', { deletedCount, daysToKeep })

    return deletedCount
  }

  /**
   * Helper to map DB row to ErrorPattern
   */
  private mapDbToErrorPattern(row: any): ErrorPattern {
    return {
      id: row.id,
      patternHash: row.pattern_hash,
      patternSignature: row.pattern_signature,
      errorType: row.error_type,
      language: row.language,
      framework: row.framework,
      occurrenceCount: row.occurrence_count,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      confidenceScore: parseFloat(row.confidence_score),
      metadata: row.metadata || {}
    }
  }

  /**
   * Helper to map DB row to Solution
   */
  private mapDbToSolution(row: any): Solution {
    return {
      id: row.id,
      patternId: row.pattern_id,
      solutionHash: row.solution_hash,
      solutionText: row.solution_text,
      solutionType: row.solution_type,
      successCount: row.success_count,
      failureCount: row.failure_count,
      successRate: parseFloat(row.success_rate),
      avgResolutionTime: row.avg_resolution_time,
      contextTags: row.context_tags || [],
      prerequisites: row.prerequisites || [],
      sideEffects: row.side_effects || [],
      lastUsed: row.last_used
    }
  }

  /**
   * Helper to map DB row to SolutionApplication
   */
  private mapDbToApplication(row: any): SolutionApplication {
    return {
      id: row.id,
      solutionId: row.solution_id,
      patternId: row.pattern_id,
      userId: row.user_id,
      sessionId: row.session_id,
      appliedAt: row.applied_at,
      resolutionTime: row.resolution_time,
      outcome: row.outcome,
      confidence: row.confidence ? parseFloat(row.confidence) : undefined,
      feedback: row.feedback,
      errorContext: row.error_context || {}
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
