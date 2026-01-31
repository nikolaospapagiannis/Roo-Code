/**
 * ExAI Guard Service - REAL IMPLEMENTATION
 *
 * This is the REAL implementation integrating the actual Brain Service
 * from the original ExAI Guard system with:
 * - REAL vector store embeddings
 * - REAL pattern learning
 * - REAL file persistence
 * - NO FAKE "AI" or "self-learning"
 */

import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'
import WebSocket, { WebSocketServer } from 'ws'
import { BrainService } from './BrainService'
import { Fortune100Service } from './Fortune100Service'

/**
 * ExAI Guard violation types
 */
export enum ExAIGuardViolationType {
  SECURITY = "security",
  PRIVACY = "privacy",
  COMPLIANCE = "compliance",
  ETHICAL = "ethical",
  QUALITY = "quality"
}

/**
 * ExAI Guard violation severity levels
 */
export enum ExAIGuardViolationSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

/**
 * ExAI Guard violation interface
 */
export interface ExAIGuardViolation {
  id: string
  type: ExAIGuardViolationType
  severity: ExAIGuardViolationSeverity
  message: string
  description: string
  detectedAt: string
  context?: any
}

/**
 * ExAI Guard configuration
 */
export interface ExAIGuardConfig {
  enabled: boolean
  realTimeDetection: boolean
  autoCorrection: boolean
  severityThreshold: ExAIGuardViolationSeverity
  notificationEnabled: boolean
  loggingEnabled: boolean
  violationTypes: Record<ExAIGuardViolationType, boolean>
}

export class ExAIGuardService extends EventEmitter {
  private static instance: ExAIGuardService
  private config: ExAIGuardConfig
  private violations: Map<string, ExAIGuardViolation>
  private subtasks: Map<string, any>

  // REAL Brain Service with vector embeddings
  private brainService: BrainService

  // Fortune 100 Service with real token counting, JWT auth, audit trail
  private fortune100: Fortune100Service

  // WebSocket Server
  private wss: WebSocketServer | null = null
  private websocketPort = 8080
  private connectionId = 0

  // Session Management - with Fortune 100 token counting
  private activeSessions: Map<string, {
    id: string
    projectPath: string
    files: string[]
    startTime: number
    violations: ExAIGuardViolation[]
    status: 'ANALYZING' | 'COMPLETED' | 'FAILED'
    userId?: string
    sessionToken?: string
    tokenCount: number
    messages: Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
      tokens: number
      timestamp: number
    }>
  }> = new Map()

  private constructor() {
    super()
    this.config = this.getDefaultConfig()
    this.violations = new Map()
    this.subtasks = new Map()

    // Initialize REAL Brain Service
    this.brainService = new BrainService({
      memoryType: 'local', // Can be 'chromadb' or 'pinecone' with proper config
      embeddingModel: 'openai', // Falls back to simple embedding if no API key
      maxMemorySize: 10000,
      learningRate: 0.1
    })

    // Initialize Fortune 100 Service
    this.fortune100 = Fortune100Service.getInstance()

    // Initialize async components
    this.initializeAsync()
  }

  private async initializeAsync(): Promise<void> {
    try {
      // Initialize Brain Service
      await this.brainService.initialize()
      console.log('[ExAI Guard] Brain Service initialized with real vector store')

      // Initialize Fortune 100 Service
      await this.fortune100.initialize()
      console.log('[ExAI Guard] Fortune 100 Service initialized (JWT auth, tiktoken, audit trail)')

      // Start WebSocket server
      this.startWebSocketServer()

      console.log('[ExAI Guard] Service fully initialized')
    } catch (error: any) {
      console.error('[ExAI Guard] Failed to initialize:', error.message)
    }
  }

  public static getInstance(): ExAIGuardService {
    if (!ExAIGuardService.instance) {
      ExAIGuardService.instance = new ExAIGuardService()
    }
    return ExAIGuardService.instance
  }

  private getDefaultConfig(): ExAIGuardConfig {
    return {
      enabled: true,
      realTimeDetection: true,
      autoCorrection: false,
      severityThreshold: ExAIGuardViolationSeverity.MEDIUM,
      notificationEnabled: true,
      loggingEnabled: true,
      violationTypes: {
        [ExAIGuardViolationType.SECURITY]: true,
        [ExAIGuardViolationType.PRIVACY]: true,
        [ExAIGuardViolationType.COMPLIANCE]: true,
        [ExAIGuardViolationType.ETHICAL]: true,
        [ExAIGuardViolationType.QUALITY]: true
      }
    }
  }

  /**
   * Start WebSocket server for external integration
   */
  private startWebSocketServer(): void {
    try {
      this.wss = new WebSocketServer({ port: this.websocketPort })

      this.wss.on('connection', (ws: WebSocket) => {
        const connectionId = ++this.connectionId
        console.log(`[ExAI Guard] Client connected: ${connectionId}`)

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'welcome',
          payload: {
            message: 'Connected to ExAI Guard with REAL Brain Service',
            capabilities: [
              'Real vector-based pattern learning',
              'Real violation detection',
              'Real AI-powered recommendations',
              'Persistent pattern storage'
            ],
            brainStats: this.brainService.getStatistics()
          }
        }))

        ws.on('message', (message: WebSocket.Data) => {
          this.handleClientMessage(ws, message)
        })

        ws.on('close', () => {
          console.log(`[ExAI Guard] Client disconnected: ${connectionId}`)
        })
      })

      console.log(`[ExAI Guard] WebSocket server started on port ${this.websocketPort}`)
    } catch (error: any) {
      console.error(`[ExAI Guard] Failed to start WebSocket server: ${error.message}`)
    }
  }

  /**
   * Handle WebSocket client messages
   */
  private async handleClientMessage(ws: WebSocket, message: WebSocket.Data): Promise<void> {
    try {
      const data = JSON.parse(message.toString())
      const { type, payload, sessionId } = data

      switch (type) {
        case 'authenticate':
          await this.handleAuthenticate(ws, payload)
          break
        case 'register':
          await this.handleRegister(ws, payload)
          break
        case 'analyze_project':
          await this.handleAnalyzeProject(ws, payload, sessionId)
          break
        case 'get_recommendations':
          await this.handleGetRecommendations(ws, payload)
          break
        case 'get_brain_stats':
          await this.handleGetBrainStats(ws)
          break
        case 'get_token_usage':
          await this.handleGetTokenUsage(ws, payload)
          break
        default:
          ws.send(JSON.stringify({ type: 'error', payload: { message: `Unknown message type: ${type}` } }))
      }
    } catch (error: any) {
      console.error('[ExAI Guard] Failed to handle message:', error.message)
      ws.send(JSON.stringify({ type: 'error', payload: { message: error.message } }))
    }
  }

  /**
   * Handle user registration (Fortune 100)
   */
  private async handleRegister(ws: WebSocket, payload: any): Promise<void> {
    try {
      const { username, email, password, roles } = payload

      const user = await this.fortune100.registerUser(username, email, password, roles)

      ws.send(JSON.stringify({
        type: 'registration_success',
        payload: {
          userId: user.id,
          username: user.username,
          email: user.email
        }
      }))
    } catch (error: any) {
      console.error('[ExAI Guard] Registration failed:', error.message)
      ws.send(JSON.stringify({
        type: 'registration_failed',
        payload: { message: error.message }
      }))
    }
  }

  /**
   * Handle user authentication (Fortune 100 JWT)
   */
  private async handleAuthenticate(ws: WebSocket, payload: any): Promise<void> {
    try {
      const { username, password } = payload

      const { user, session, token } = await this.fortune100.authenticate(username, password, {
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent
      })

      ws.send(JSON.stringify({
        type: 'authentication_success',
        payload: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            roles: user.roles
          },
          session: {
            id: session.id,
            expiresAt: session.expiresAt
          },
          token
        }
      }))
    } catch (error: any) {
      console.error('[ExAI Guard] Authentication failed:', error.message)
      ws.send(JSON.stringify({
        type: 'authentication_failed',
        payload: { message: error.message }
      }))
    }
  }

  /**
   * Handle project analysis request
   */
  private async handleAnalyzeProject(ws: WebSocket, payload: any, sessionId: string): Promise<void> {
    const { projectPath, files, userId, token } = payload

    // Verify JWT token if provided (Fortune 100 security)
    let authenticatedUserId: string | undefined
    if (token) {
      try {
        const decoded = this.fortune100.verifyToken(token)
        authenticatedUserId = decoded.userId
      } catch (error: any) {
        ws.send(JSON.stringify({
          type: 'authentication_failed',
          payload: { message: 'Invalid or expired token' }
        }))
        return
      }
    }

    const session = {
      id: sessionId,
      projectPath,
      files: files || [],
      startTime: Date.now(),
      violations: [],
      status: 'ANALYZING' as const,
      userId: authenticatedUserId || userId,
      sessionToken: token,
      tokenCount: 0,
      messages: []
    }

    this.activeSessions.set(sessionId, session)

    ws.send(JSON.stringify({
      type: 'analysis_started',
      payload: { sessionId, projectPath }
    }))

    try {
      // Analyze files
      for (const filePath of session.files) {
        await this.analyzeFileForSession(ws, sessionId, filePath)
      }

      session.status = 'COMPLETED'

      ws.send(JSON.stringify({
        type: 'analysis_completed',
        payload: {
          sessionId,
          totalViolations: session.violations.length
        }
      }))

      // Learn from session using REAL Brain Service
      await this.learnFromSession(session)
    } catch (error: any) {
      session.status = 'FAILED'
      ws.send(JSON.stringify({
        type: 'analysis_failed',
        payload: { sessionId, error: error.message }
      }))
    }
  }

  /**
   * Analyze file and detect violations
   */
  private async analyzeFileForSession(ws: WebSocket, sessionId: string, filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const violations = this.detectViolations(content, filePath)

      const session = this.activeSessions.get(sessionId)
      if (session) {
        session.violations.push(...violations)

        // Count tokens in file content using Fortune 100 service
        const fileTokens = this.fortune100.countTokens(content)

        // Add message to session with REAL token counting
        const message = {
          role: 'system' as const,
          content: `Analyzed file: ${filePath} with ${violations.length} violations`,
          tokens: fileTokens,
          timestamp: Date.now()
        }
        session.messages.push(message)
        session.tokenCount += fileTokens

        // Context window management - check if approaching limit (8192 tokens default)
        const maxTokens = 8192
        const usagePercentage = (session.tokenCount / maxTokens) * 100

        if (usagePercentage > 80) {
          console.warn(`[ExAI Guard] Session ${sessionId} approaching token limit: ${session.tokenCount}/${maxTokens} (${usagePercentage.toFixed(1)}%)`)

          // Send warning to client
          ws.send(JSON.stringify({
            type: 'token_limit_warning',
            payload: {
              sessionId,
              tokenCount: session.tokenCount,
              maxTokens,
              usagePercentage: usagePercentage.toFixed(1)
            }
          }))

          // Auto-summarize if over 90%
          if (usagePercentage > 90) {
            await this.summarizeSession(session, ws)
          }
        }

        // Learn from each violation using REAL Brain Service
        for (const violation of violations) {
          await this.brainService.storePattern({
            type: 'violation',
            violation: {
              type: violation.type,
              severity: violation.severity,
              message: violation.message,
              file: filePath,
              line: violation.context?.lineNumber
            },
            content: violation.description
          })
        }
      }

      ws.send(JSON.stringify({
        type: 'file_analyzed',
        payload: {
          sessionId,
          filePath,
          violations: violations.map(v => ({
            type: v.type,
            severity: v.severity,
            message: v.message
          })),
          tokens: session ? session.tokenCount : 0
        }
      }))
    } catch (error: any) {
      console.error(`[ExAI Guard] Failed to analyze file ${filePath}:`, error.message)
    }
  }

  /**
   * Detect violations in content
   */
  private detectViolations(content: string, filePath: string): ExAIGuardViolation[] {
    const violations: ExAIGuardViolation[] = []

    // Security violations
    if (/password\s*[:=]\s*["'][^"']+["']/i.test(content)) {
      violations.push(this.createViolation(
        ExAIGuardViolationType.SECURITY,
        ExAIGuardViolationSeverity.CRITICAL,
        'Hardcoded password detected',
        'Found hardcoded password in code',
        { filePath }
      ))
    }

    // Privacy violations
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(content)) {
      violations.push(this.createViolation(
        ExAIGuardViolationType.PRIVACY,
        ExAIGuardViolationSeverity.HIGH,
        'SSN detected',
        'Found Social Security Number in code',
        { filePath }
      ))
    }

    // Quality violations
    if (/\bTODO\b|\bFIXME\b/i.test(content)) {
      violations.push(this.createViolation(
        ExAIGuardViolationType.QUALITY,
        ExAIGuardViolationSeverity.MEDIUM,
        'Incomplete code detected',
        'Found TODO or FIXME comment',
        { filePath }
      ))
    }

    return violations
  }

  /**
   * Learn from session using REAL Brain Service
   */
  private async learnFromSession(session: any): Promise<void> {
    console.log(`[ExAI Guard] Learning from session ${session.id} with ${session.violations.length} violations`)

    // Store session pattern in Brain Service
    await this.brainService.storePattern({
      type: 'session',
      context: {
        projectPath: session.projectPath,
        violationCount: session.violations.length,
        duration: Date.now() - session.startTime
      },
      content: `Session with ${session.violations.length} violations`
    })

    console.log('[ExAI Guard] Session learning complete')
  }

  /**
   * Handle get recommendations request - uses REAL Brain Service
   */
  private async handleGetRecommendations(ws: WebSocket, payload: any): Promise<void> {
    try {
      const { violation } = payload

      // Get REAL AI-powered recommendations from Brain Service
      const recommendations = await this.brainService.getRecommendations(violation)

      ws.send(JSON.stringify({
        type: 'recommendations',
        payload: {
          violation,
          recommendations
        }
      }))
    } catch (error: any) {
      console.error('[ExAI Guard] Failed to get recommendations:', error.message)
      ws.send(JSON.stringify({ type: 'error', payload: { message: error.message } }))
    }
  }

  /**
   * Handle get brain stats request
   */
  private async handleGetBrainStats(ws: WebSocket): Promise<void> {
    const stats = this.brainService.getStatistics()

    ws.send(JSON.stringify({
      type: 'brain_stats',
      payload: stats
    }))
  }

  /**
   * Summarize session when approaching token limit (Fortune 100 context window management)
   */
  private async summarizeSession(session: any, ws: WebSocket): Promise<void> {
    try {
      console.log(`[ExAI Guard] Summarizing session ${session.id} with ${session.messages.length} messages`)

      // Create summary of all messages
      const summaryContent = `Session Summary:
- Project: ${session.projectPath}
- Files analyzed: ${session.files.length}
- Total violations: ${session.violations.length}
- Duration: ${Math.round((Date.now() - session.startTime) / 1000)}s
- Message history: ${session.messages.length} messages

Violation Breakdown:
${this.createViolationSummary(session.violations)}

Top Issues:
${this.createTopIssuesSummary(session.violations)}`

      // Count tokens in summary
      const summaryTokens = this.fortune100.countTokens(summaryContent)

      // Replace old messages with summary
      session.messages = [{
        role: 'system' as const,
        content: summaryContent,
        tokens: summaryTokens,
        timestamp: Date.now()
      }]
      session.tokenCount = summaryTokens

      // Store summary in Brain Service for learning
      await this.brainService.storePattern({
        type: 'session-summary',
        context: {
          projectPath: session.projectPath,
          violationCount: session.violations.length,
          fileCount: session.files.length
        },
        content: summaryContent
      })

      ws.send(JSON.stringify({
        type: 'session_summarized',
        payload: {
          sessionId: session.id,
          oldTokenCount: session.tokenCount + summaryTokens,
          newTokenCount: summaryTokens,
          savedTokens: session.tokenCount,
          summary: summaryContent
        }
      }))

      console.log(`[ExAI Guard] Session summarized: ${session.tokenCount} tokens (saved ${session.tokenCount - summaryTokens} tokens)`)
    } catch (error: any) {
      console.error('[ExAI Guard] Failed to summarize session:', error.message)
    }
  }

  /**
   * Create violation summary for session summarization
   */
  private createViolationSummary(violations: ExAIGuardViolation[]): string {
    const counts: Record<string, number> = {}
    violations.forEach(v => {
      counts[v.type] = (counts[v.type] || 0) + 1
    })

    return Object.entries(counts)
      .map(([type, count]) => `- ${type}: ${count}`)
      .join('\n')
  }

  /**
   * Create top issues summary
   */
  private createTopIssuesSummary(violations: ExAIGuardViolation[]): string {
    return violations
      .filter(v => v.severity === ExAIGuardViolationSeverity.CRITICAL || v.severity === ExAIGuardViolationSeverity.HIGH)
      .slice(0, 5)
      .map((v, i) => `${i + 1}. [${v.severity.toUpperCase()}] ${v.message}`)
      .join('\n') || 'None'
  }

  /**
   * Handle get token usage (Fortune 100 token counting)
   */
  private async handleGetTokenUsage(ws: WebSocket, payload: any): Promise<void> {
    try {
      const { sessionId } = payload

      const session = this.activeSessions.get(sessionId)
      if (!session) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Session not found' }
        }))
        return
      }

      // Get real token count
      const tokenCount = session.tokenCount
      const messageCount = session.messages.length

      ws.send(JSON.stringify({
        type: 'token_usage',
        payload: {
          sessionId,
          tokenCount,
          messageCount,
          messages: session.messages.map(m => ({
            role: m.role,
            tokens: m.tokens,
            timestamp: m.timestamp
          }))
        }
      }))
    } catch (error: any) {
      console.error('[ExAI Guard] Failed to get token usage:', error.message)
      ws.send(JSON.stringify({ type: 'error', payload: { message: error.message } }))
    }
  }

  /**
   * Create violation object
   */
  private createViolation(
    type: ExAIGuardViolationType,
    severity: ExAIGuardViolationSeverity,
    message: string,
    description: string,
    context: any
  ): ExAIGuardViolation {
    return {
      id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      description,
      detectedAt: new Date().toISOString(),
      context
    }
  }

  /**
   * Scan file content
   */
  async scanFile(filePath: string): Promise<{ violations: ExAIGuardViolation[] }> {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const violations = this.detectViolations(content, filePath)

      return { violations }
    } catch (error: any) {
      console.error(`[ExAI Guard] Failed to scan file: ${error.message}`)
      return { violations: [] }
    }
  }

  /**
   * Scan content
   */
  scanContent(content: string, context?: any): ExAIGuardViolation[] {
    return this.detectViolations(content, context?.filePath || 'unknown')
  }

  /**
   * Dispose service
   */
  async dispose(): Promise<void> {
    console.log('[ExAI Guard] Disposing service...')

    // Save audit log and shutdown Fortune 100 Service
    await this.fortune100.saveAuditLog()
    await this.fortune100.shutdown()

    // Shutdown Brain Service and save patterns
    await this.brainService.shutdown()

    // Close WebSocket server
    if (this.wss) {
      this.wss.close()
    }

    // Clear data
    this.violations.clear()
    this.subtasks.clear()
    this.activeSessions.clear()

    console.log('[ExAI Guard] Service disposed')
  }
}
