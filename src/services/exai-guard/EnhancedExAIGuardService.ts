import * as vscode from 'vscode'
import { EventEmitter } from 'events'

import { Package } from '../../shared/package'
import { t } from '../../i18n'
import { TelemetryService } from '@founder-x-ai/telemetry'

import {
  ExAIGuardViolation,
  ExAIGuardViolationType,
  ExAIGuardViolationSeverity,
  ExAIGuardConfig,
  OrchestrationSubtask,
  StreamInterceptionResult,
  ExAIGuardEvents
} from './ExAIGuardService'

import {
  AIGuardIntegrationService,
  AIGuardIntegrationConfig
} from './AIGuardIntegrationService'

/**
 * Enhanced ExAI Guard Service
 * 
 * Combines the existing ExAI Guard capabilities with the external AI Guard service
 * for comprehensive violation detection, real-time monitoring, and automatic correction.
 */
export class EnhancedExAIGuardService extends EventEmitter<ExAIGuardEvents> {
  private static instance: EnhancedExAIGuardService
  private config: ExAIGuardConfig
  private aiGuardIntegration: AIGuardIntegrationService
  private violations: Map<string, ExAIGuardViolation> = new Map()
  private subtasks: Map<string, OrchestrationSubtask> = new Map()
  private isInitialized = false
  private streamInterceptionEnabled = true
  private orchestrationEnabled = true

  // Statistics
  private stats = {
    totalScans: 0,
    violationsDetected: 0,
    violationsCorrected: 0,
    aiGuardValidations: 0,
    aiGuardViolations: 0,
    averageResponseTime: 0
  }

  private constructor() {
    super()
    this.config = this.getDefaultConfig()
    this.aiGuardIntegration = AIGuardIntegrationService.getInstance()
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EnhancedExAIGuardService {
    if (!EnhancedExAIGuardService.instance) {
      EnhancedExAIGuardService.instance = new EnhancedExAIGuardService()
    }
    return EnhancedExAIGuardService.instance
  }

  /**
   * Initialize the enhanced service
   */
  public async initialize(context: vscode.ExtensionContext): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Load configuration from global state
      const globalState = context.globalState
      const savedConfig = globalState.get<ExAIGuardConfig>("exaiGuardConfig")
      
      if (savedConfig) {
        this.config = { ...this.getDefaultConfig(), ...savedConfig }
      }

      // Initialize AI Guard integration
      await this.aiGuardIntegration.initialize(context)

      this.isInitialized = true
      console.log("Enhanced ExAI Guard Service initialized successfully")

      // Set up event listeners for AI Guard integration
      this.setupEventListeners()

    } catch (error) {
      console.error("Failed to initialize Enhanced ExAI Guard Service:", error)
      throw error
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): ExAIGuardConfig {
    return {
      enabled: true,
      realTimeDetection: true,
      autoCorrection: true,
      violationTypes: {
        [ExAIGuardViolationType.SECURITY]: true,
        [ExAIGuardViolationType.PRIVACY]: true,
        [ExAIGuardViolationType.COMPLIANCE]: true,
        [ExAIGuardViolationType.ETHICAL]: true,
        [ExAIGuardViolationType.QUALITY]: true
      },
      severityThreshold: ExAIGuardViolationSeverity.LOW,
      notificationEnabled: true,
      loggingEnabled: true
    }
  }

  /**
   * Set up event listeners for AI Guard integration
   */
  private setupEventListeners(): void {
    // Listen for subtask creation from AI Guard
    this.aiGuardIntegration.on('subtaskCreated', (subtask: OrchestrationSubtask) => {
      this.subtasks.set(subtask.id, subtask)
      this.emit('subtaskCreated', subtask)
      
      if (this.config.notificationEnabled) {
        vscode.window.showInformationMessage(
          `AI Guard created task: ${subtask.title}`,
          'View Tasks'
        ).then(selection => {
          if (selection === 'View Tasks') {
            this.showTasksPanel()
          }
        })
      }
    })
  }

  /**
   * Enhanced content scanning with AI Guard integration
   */
  public async scanContent(content: string, context?: any): Promise<ExAIGuardViolation[]> {
    if (!this.config.enabled) {
      return []
    }

    const startTime = Date.now()
    const violations: ExAIGuardViolation[] = []

    try {
      // Run local ExAI Guard scanning
      const localViolations = this.scanContentLocally(content, context)
      violations.push(...localViolations)

      // Run AI Guard service validation if enabled
      const aiGuardViolations = await this.scanWithAIGuard(content, context)
      violations.push(...aiGuardViolations)

      // Update statistics
      this.stats.totalScans++
      this.stats.violationsDetected += violations.length
      this.stats.aiGuardValidations++
      this.stats.aiGuardViolations += aiGuardViolations.length

      const responseTime = Date.now() - startTime
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * (this.stats.totalScans - 1) + responseTime) / 
        this.stats.totalScans

      // Store violations and emit events
      violations.forEach(violation => {
        this.violations.set(violation.id, violation)
        this.emit("violationDetected", violation)
      })

      // Apply auto-correction if enabled
      if (this.config.autoCorrection && violations.length > 0) {
        await this.applyAutoCorrections(violations, content, context)
      }

      return violations

    } catch (error) {
      console.error('Error during enhanced content scanning:', error)
      return []
    }
  }

  /**
   * Scan content using local ExAI Guard patterns
   */
  private scanContentLocally(content: string, context?: any): ExAIGuardViolation[] {
    // This would use the existing ExAIGuardService patterns
    // For now, return empty array - we'll rely on AI Guard service
    return []
  }

  /**
   * Scan content using external AI Guard service
   */
  private async scanWithAIGuard(content: string, context?: any): Promise<ExAIGuardViolation[]> {
    if (!this.aiGuardIntegration.getConfig().enabled) {
      return []
    }

    try {
      const filePath = context?.filePath || 'unknown-file'
      const violations = await this.aiGuardIntegration.validateFile(filePath, content)
      
      // Filter violations based on configured types and severity
      const filteredViolations = violations.filter(violation => 
        this.config.violationTypes[violation.type] &&
        this.getSeverityLevel(violation.severity) >= this.getSeverityLevel(this.config.severityThreshold)
      )

      return filteredViolations

    } catch (error) {
      console.error('Error scanning with AI Guard service:', error)
      return []
    }
  }

  /**
   * Apply automatic corrections for violations
   */
  private async applyAutoCorrections(
    violations: ExAIGuardViolation[], 
    originalContent: string, 
    context?: any
  ): Promise<void> {
    const autoCorrectableViolations = violations.filter(v => 
      v.correction?.autoCorrectable === true
    )

    if (autoCorrectableViolations.length === 0) {
      return
    }

    let correctedContent = originalContent

    for (const violation of autoCorrectableViolations) {
      try {
        const correctionResult = this.applyCorrection(violation, correctedContent)
        if (correctionResult.wasApplied) {
          correctedContent = correctionResult.correctedContent
          this.stats.violationsCorrected++
          this.emit("violationCorrected", violation)

          if (this.config.notificationEnabled) {
            vscode.window.showInformationMessage(
              `Auto-corrected: ${violation.message}`,
              'View Changes'
            )
          }
        }
      } catch (error) {
        console.error(`Failed to auto-correct violation ${violation.id}:`, error)
      }
    }

    // If we have a file context, update the file
    if (context?.filePath && correctedContent !== originalContent) {
      await this.updateFileContent(context.filePath, correctedContent)
    }
  }

  /**
   * Apply correction for a single violation
   */
  public applyCorrection(violation: ExAIGuardViolation, originalContent: string): { 
    correctedContent: string; 
    wasApplied: boolean 
  } {
    if (!violation.correction?.correctedContent) {
      return { correctedContent: originalContent, wasApplied: false }
    }

    // Simple string replacement for now
    // In a real implementation, this would use more sophisticated pattern matching
    const correctedContent = violation.correction.correctedContent
    
    return {
      correctedContent,
      wasApplied: correctedContent !== originalContent
    }
  }

  /**
   * Update file content with corrections
   */
  private async updateFileContent(filePath: string, content: string): Promise<void> {
    try {
      const uri = vscode.Uri.file(filePath)
      const document = await vscode.workspace.openTextDocument(uri)
      const edit = new vscode.WorkspaceEdit()
      
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      )
      
      edit.replace(uri, fullRange, content)
      await vscode.workspace.applyEdit(edit)
      
      console.log(`Updated file: ${filePath}`)
    } catch (error) {
      console.error(`Failed to update file ${filePath}:`, error)
    }
  }

  /**
   * Enhanced stream interception with AI Guard integration
   */
  public async interceptStream(content: string, context: any = {}): Promise<StreamInterceptionResult> {
    if (!this.streamInterceptionEnabled) {
      return {
        intercepted: false,
        violations: [],
        subtasks: [],
        correctedContent: content
      }
    }

    try {
      // Run enhanced scanning on stream content
      const violations = await this.scanContent(content, context)
      
      if (violations.length > 0) {
        const subtasks = violations.map(violation => 
          this.createSubtask(violation, context)
        )

        subtasks.forEach(subtask => {
          this.subtasks.set(subtask.id, subtask)
          this.emit('subtaskCreated', subtask)
        })

        // Apply corrections if auto-correction is enabled
        let correctedContent = content
        if (this.config.autoCorrection) {
          const correctionResult = this.applyStreamCorrections(violations, content)
          correctedContent = correctionResult.correctedContent
        }

        const result: StreamInterceptionResult = {
          intercepted: true,
          violations,
          subtasks,
          correctedContent
        }

        this.emit('streamIntercepted', result)
        return result
      }

    } catch (error) {
      console.error('Error during stream interception:', error)
    }

    return {
      intercepted: false,
      violations: [],
      subtasks: [],
      correctedContent: content
    }
  }

  /**
   * Apply corrections to stream content
   */
  private applyStreamCorrections(violations: ExAIGuardViolation[], content: string): { 
    correctedContent: string 
  } {
    let correctedContent = content

    for (const violation of violations) {
      if (violation.correction?.autoCorrectable && violation.correction.correctedContent) {
        correctedContent = violation.correction.correctedContent
      }
    }

    return { correctedContent }
  }

  /**
   * Create orchestration subtask from violation
   */
  private createSubtask(violation: ExAIGuardViolation, context: any): OrchestrationSubtask {
    const subtask: OrchestrationSubtask = {
      id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `Fix: ${violation.message}`,
      description: violation.description,
      priority: this.getTaskPriority(violation.severity),
      status: 'pending',
      violationId: violation.id,
      createdAt: Date.now(),
      result: {
        file: context.filePath,
        violation: violation.message,
        suggestedFix: violation.correction?.suggestedAction
      }
    }

    return subtask
  }

  /**
   * Get task priority based on violation severity
   */
  private getTaskPriority(severity: ExAIGuardViolationSeverity): 'low' | 'medium' | 'high' {
    switch (severity) {
      case ExAIGuardViolationSeverity.CRITICAL:
      case ExAIGuardViolationSeverity.HIGH:
        return 'high'
      case ExAIGuardViolationSeverity.MEDIUM:
        return 'medium'
      default:
        return 'low'
    }
  }

  /**
   * Get severity level as numeric value
   */
  private getSeverityLevel(severity: ExAIGuardViolationSeverity): number {
    const levels = {
      [ExAIGuardViolationSeverity.LOW]: 1,
      [ExAIGuardViolationSeverity.MEDIUM]: 2,
      [ExAIGuardViolationSeverity.HIGH]: 3,
      [ExAIGuardViolationSeverity.CRITICAL]: 4
    }
    return levels[severity] || 1
  }

  /**
   * Show tasks panel in UI
   */
  private showTasksPanel(): void {
    // This would open a custom tasks view in the extension
    vscode.window.showInformationMessage('Tasks panel would open here')
  }

  /**
   * Update configuration
   */
  public async updateConfig(newConfig: Partial<ExAIGuardConfig>, context: vscode.ExtensionContext): Promise<void> {
    this.config = { ...this.config, ...newConfig }
    
    // Save to global state
    await context.globalState.update("exaiGuardConfig", this.config)
    
    this.emit("configUpdated", this.config)
  }

  /**
   * Get current configuration
   */
  public getConfig(): ExAIGuardConfig {
    return { ...this.config }
  }

  /**
   * Get AI Guard integration configuration
   */
  public getAIGuardConfig(): AIGuardIntegrationConfig {
    return this.aiGuardIntegration.getConfig()
  }

  /**
   * Update AI Guard integration configuration
   */
  public async updateAIGuardConfig(
    newConfig: Partial<AIGuardIntegrationConfig>, 
    context: vscode.ExtensionContext
  ): Promise<void> {
    await this.aiGuardIntegration.updateConfig(newConfig, context)
  }

  /**
   * Get service statistics
   */
  public getStats() {
    return {
      ...this.stats,
      aiGuardStats: this.aiGuardIntegration.getStats()
    }
  }

  /**
   * Check if AI Guard service is available
   */
  public async isAIGuardAvailable(): Promise<boolean> {
    return await this.aiGuardIntegration.isServiceAvailable()
  }

  /**
   * Validate entire project with AI Guard
   */
  public async validateProject(projectPath: string): Promise<ExAIGuardViolation[]> {
    return await this.aiGuardIntegration.validateProject(projectPath)
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.aiGuardIntegration.dispose()
  }
}