import * as vscode from 'vscode'
import { EventEmitter } from 'events'
import axios, { AxiosInstance } from 'axios'

import { Package } from '../../shared/package'
import { t } from '../../i18n'
import { TelemetryService } from '@founder-x-ai/telemetry'

import {
  ExAIGuardViolation,
  ExAIGuardViolationType,
  ExAIGuardViolationSeverity,
  ExAIGuardConfig,
  OrchestrationSubtask,
  StreamInterceptionResult
} from './ExAIGuardService'

/**
 * AI Guard Service Integration Configuration
 */
export interface AIGuardIntegrationConfig {
  enabled: boolean
  serviceUrl: string
  wsUrl: string
  apiKey?: string
  tenantId?: string
  realTimeMonitoring: boolean
  autoCorrection: boolean
  strictMode: boolean
  confidenceThreshold: number
  maxViolationsPerFile: number
}

/**
 * AI Guard Service Response Types
 */
export interface AIGuardValidationResponse {
  blocked: boolean
  violations: AIGuardViolation[]
  tasks?: AIGuardTask[]
  summary?: {
    total: number
    critical: number
    error: number
    warning: number
    tasksCreated: number
  }
  responseTime?: number
}

export interface AIGuardViolation {
  id: string
  type: string
  severity: 'critical' | 'error' | 'warning' | 'info'
  message: string
  line?: number
  column?: number
  evidence?: string
  confidence: number
  source?: string
  category?: string
}

export interface AIGuardTask {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high'
  estimatedEffort: number
  file?: string
  line?: number
  type?: string
  issue?: string
  fix?: string
}

export interface AIGuardRealtimeMessage {
  type: 'violation_detected' | 'task_completed' | 'new_tasks_available' | 'system_status'
  filePath?: string
  violations?: number
  tasks?: number
  taskId?: string
  fix?: string
  count?: number
  priority?: string
  status?: any
  timestamp?: string
}

/**
 * AI Guard Integration Service
 * 
 * Provides integration with the external AI Guard service for enhanced
 * violation detection, real-time monitoring, and task orchestration.
 */
export class AIGuardIntegrationService extends EventEmitter {
  private static instance: AIGuardIntegrationService
  private config: AIGuardIntegrationConfig
  private httpClient: AxiosInstance
  private isInitialized = false
  private projectId: string = ''

  // Statistics
  private stats = {
    totalValidations: 0,
    violationsDetected: 0,
    tasksCreated: 0,
    tasksCompleted: 0,
    averageResponseTime: 0,
    lastConnectionTime: 0
  }

  private constructor() {
    super()
    this.config = this.getDefaultConfig()
    this.httpClient = this.createHttpClient()
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AIGuardIntegrationService {
    if (!AIGuardIntegrationService.instance) {
      AIGuardIntegrationService.instance = new AIGuardIntegrationService()
    }
    return AIGuardIntegrationService.instance
  }

  /**
   * Initialize the integration service
   */
  public async initialize(context: vscode.ExtensionContext): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Load configuration from global state
      const globalState = context.globalState
      const savedConfig = globalState.get<AIGuardIntegrationConfig>('aiGuardIntegrationConfig')
      
      if (savedConfig) {
        this.config = { ...this.getDefaultConfig(), ...savedConfig }
      }

      // Generate project ID based on workspace
      this.projectId = this.generateProjectId()

      // Update HTTP client with new config
      this.httpClient = this.createHttpClient()

      this.isInitialized = true
      console.log('AI Guard Integration Service initialized successfully')

    } catch (error) {
      console.error('Failed to initialize AI Guard Integration Service:', error)
      throw error
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AIGuardIntegrationConfig {
    return {
      enabled: true,
      serviceUrl: 'http://localhost:3001',
      wsUrl: 'ws://localhost:3001/agent-ws',
      realTimeMonitoring: false, // Disabled by default due to WebSocket dependency
      autoCorrection: true,
      strictMode: true,
      confidenceThreshold: 0.7,
      maxViolationsPerFile: 100
    }
  }

  /**
   * Create HTTP client with proper configuration
   */
  private createHttpClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.serviceUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Founder-X-AI-Guard-Integration/1.0'
      }
    })
  }

  /**
   * Generate unique project ID based on workspace
   */
  private generateProjectId(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspacePath = workspaceFolders[0].uri.fsPath
      return `founder-x-${Buffer.from(workspacePath).toString('base64').substring(0, 16)}`
    }
    return `founder-x-${Date.now()}`
  }

  /**
   * Check if AI Guard service is available
   */
  public async isServiceAvailable(): Promise<boolean> {
    if (!this.config.enabled) {
      return false
    }

    try {
      const response = await this.httpClient.get('/health')
      return response.status === 200
    } catch (error) {
      console.warn('AI Guard service is not available:', error)
      return false
    }
  }

  /**
   * Validate file content with AI Guard service
   */
  public async validateFile(filePath: string, content: string): Promise<ExAIGuardViolation[]> {
    if (!this.config.enabled || !await this.isServiceAvailable()) {
      return []
    }

    const startTime = Date.now()

    try {
      const response = await this.httpClient.post<AIGuardValidationResponse>('/validate', {
        filePath,
        content,
        strictMode: this.config.strictMode
      })

      const responseTime = Date.now() - startTime
      this.updateStats(response.data.violations?.length || 0, responseTime)

      // Convert AI Guard violations to ExAI Guard violations
      const violations = this.convertViolations(response.data.violations || [], filePath, content)

      // Handle tasks if violations were found
      if (response.data.tasks && response.data.tasks.length > 0) {
        this.handleTasks(response.data.tasks, filePath)
      }

      return violations

    } catch (error: any) {
      if (error.response?.status === 400) {
        // Service returned violations (blocked response)
        const responseData = error.response.data as AIGuardValidationResponse
        const responseTime = Date.now() - startTime
        
        this.updateStats(responseData.violations?.length || 0, responseTime)

        const violations = this.convertViolations(responseData.violations || [], filePath, content)

        // Handle tasks from blocked response
        if (responseData.tasks && responseData.tasks.length > 0) {
          this.handleTasks(responseData.tasks, filePath)
        }

        return violations
      }

      console.error('Error validating file with AI Guard service:', error)
      return []
    }
  }

  /**
   * Validate entire project directory
   */
  public async validateProject(projectPath: string): Promise<ExAIGuardViolation[]> {
    if (!this.config.enabled || !await this.isServiceAvailable()) {
      return []
    }

    try {
      const response = await this.httpClient.post<AIGuardValidationResponse>('/validate-project', {
        projectPath,
        patterns: ['**/*.{js,ts,jsx,tsx,py,java}'],
        exclude: ['node_modules/**', 'dist/**', 'build/**']
      })

      // Convert violations
      const violations = this.convertViolations(response.data.violations || [], projectPath, '')

      return violations

    } catch (error: any) {
      if (error.response?.status === 400) {
        const responseData = error.response.data as AIGuardValidationResponse
        return this.convertViolations(responseData.violations || [], projectPath, '')
      }

      console.error('Error validating project with AI Guard service:', error)
      return []
    }
  }

  /**
   * Convert AI Guard violations to ExAI Guard violations
   */
  private convertViolations(
    aiGuardViolations: AIGuardViolation[], 
    filePath: string, 
    content: string
  ): ExAIGuardViolation[] {
    return aiGuardViolations.map(violation => {
      // Map severity levels
      let severity: ExAIGuardViolationSeverity
      switch (violation.severity) {
        case 'critical':
          severity = ExAIGuardViolationSeverity.CRITICAL
          break
        case 'error':
          severity = ExAIGuardViolationSeverity.HIGH
          break
        case 'warning':
          severity = ExAIGuardViolationSeverity.MEDIUM
          break
        default:
          severity = ExAIGuardViolationSeverity.LOW
      }

      // Map violation types
      let type: ExAIGuardViolationType
      switch (violation.category) {
        case 'security':
          type = ExAIGuardViolationType.SECURITY
          break
        case 'stub_detection':
          type = ExAIGuardViolationType.QUALITY
          break
        case 'performance':
          type = ExAIGuardViolationType.QUALITY
          break
        case 'maintainability':
          type = ExAIGuardViolationType.QUALITY
          break
        default:
          type = ExAIGuardViolationType.QUALITY
      }

      return {
        id: violation.id,
        type,
        severity,
        message: violation.message,
        description: `AI Guard detected: ${violation.message}`,
        timestamp: Date.now(),
        context: {
          filePath,
          lineNumber: violation.line?.toString(),
          patternId: violation.source,
          confidence: violation.confidence.toString(),
          evidence: violation.evidence
        },
        correction: {
          suggestedAction: this.generateFixSuggestion(violation),
          autoCorrectable: this.isAutoCorrectable(violation)
        }
      }
    })
  }

  /**
   * Generate fix suggestion for violation
   */
  private generateFixSuggestion(violation: AIGuardViolation): string {
    const suggestions: Record<string, string> = {
      'security': 'Review and implement secure coding practices',
      'stub_detection': 'Replace placeholder implementation with real business logic',
      'performance': 'Optimize code for better performance',
      'maintainability': 'Refactor code to improve maintainability',
      'quality': 'Improve code quality and follow best practices'
    }

    return suggestions[violation.category || 'quality'] || 'Review and fix the identified issue'
  }

  /**
   * Check if violation is auto-correctable
   */
  private isAutoCorrectable(violation: AIGuardViolation): boolean {
    // Only certain types of violations can be auto-corrected
    const autoCorrectableTypes = ['stub_detection', 'quality', 'maintainability']
    return autoCorrectableTypes.includes(violation.category || '') && violation.confidence > 0.8
  }

  /**
   * Handle tasks from AI Guard service
   */
  private handleTasks(tasks: AIGuardTask[], filePath: string): void {
    tasks.forEach(task => {
      const subtask: OrchestrationSubtask = {
        id: task.id,
        title: task.title,
        description: task.issue || task.title,
        priority: task.priority,
        status: 'pending',
        createdAt: Date.now(),
        result: {
          file: filePath,
          line: task.line,
          fix: task.fix
        }
      }

      this.stats.tasksCreated++
      
      // Emit subtask created event
      this.emit('subtaskCreated', subtask)
    })
  }

  /**
   * Connect to real-time monitoring (placeholder - requires WebSocket dependency)
   */
  public async connectRealTime(): Promise<boolean> {
    if (!this.config.enabled || !this.config.realTimeMonitoring) {
      return false
    }

    console.warn('Real-time monitoring requires WebSocket dependency. Install "ws" package for full functionality.')
    return false
  }

  /**
   * Handle real-time messages (placeholder)
   */
  private handleRealtimeMessage(message: AIGuardRealtimeMessage): void {
    // This would handle real-time messages if WebSocket was available
    console.log('Real-time message received (WebSocket not available):', message)
  }

  /**
   * Disconnect from real-time monitoring (placeholder)
   */
  public disconnectRealTime(): void {
    // No-op since WebSocket is not available
  }

  /**
   * Update statistics
   */
  private updateStats(violationCount: number, responseTime: number): void {
    this.stats.totalValidations++
    this.stats.violationsDetected += violationCount
    
    // Update average response time
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalValidations - 1) + responseTime) / 
      this.stats.totalValidations
  }

  /**
   * Get service statistics
   */
  public getStats() {
    return { ...this.stats }
  }

  /**
   * Update configuration
   */
  public async updateConfig(newConfig: Partial<AIGuardIntegrationConfig>, context: vscode.ExtensionContext): Promise<void> {
    this.config = { ...this.config, ...newConfig }
    
    // Update HTTP client with new config
    this.httpClient = this.createHttpClient()

    // Save to global state
    await context.globalState.update('aiGuardIntegrationConfig', this.config)
  }

  /**
   * Get current configuration
   */
  public getConfig(): AIGuardIntegrationConfig {
    return { ...this.config }
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    // No WebSocket cleanup needed
  }
}