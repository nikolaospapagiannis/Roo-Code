import * as vscode from 'vscode'
import { EnhancedExAIGuardService } from './EnhancedExAIGuardService'
import { AIGuardIntegrationConfig } from './AIGuardIntegrationService'
import { ExAIGuardConfig, ExAIGuardViolationSeverity } from './ExAIGuardService'

/**
 * AI Guard Commands
 * 
 * Provides commands for configuring and managing the AI Guard integration.
 */
export class AIGuardCommands {
  private static instance: AIGuardCommands
  private exaiGuardService: EnhancedExAIGuardService

  private constructor() {
    this.exaiGuardService = EnhancedExAIGuardService.getInstance()
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AIGuardCommands {
    if (!AIGuardCommands.instance) {
      AIGuardCommands.instance = new AIGuardCommands()
    }
    return AIGuardCommands.instance
  }

  /**
   * Register all AI Guard commands
   */
  public registerCommands(context: vscode.ExtensionContext): void {
    const commands = [
      // Configuration commands
      vscode.commands.registerCommand('founder-x-ai.exai-guard.configure', () => 
        this.configureExAIGuard(context)
      ),
      vscode.commands.registerCommand('founder-x-ai.ai-guard.configure', () => 
        this.configureAIGuardIntegration(context)
      ),
      
      // Validation commands
      vscode.commands.registerCommand('founder-x-ai.exai-guard.validateCurrentFile', () => 
        this.validateCurrentFile()
      ),
      vscode.commands.registerCommand('founder-x-ai.exai-guard.validateProject', () => 
        this.validateProject()
      ),
      
      // Status commands
      vscode.commands.registerCommand('founder-x-ai.exai-guard.showStatus', () => 
        this.showStatus()
      ),
      vscode.commands.registerCommand('founder-x-ai.exai-guard.showStats', () => 
        this.showStats()
      ),

      // Toggle commands
      vscode.commands.registerCommand('founder-x-ai.exai-guard.toggle', () => 
        this.toggleExAIGuard(context)
      ),
      vscode.commands.registerCommand('founder-x-ai.ai-guard.toggle', () => 
        this.toggleAIGuardIntegration(context)
      )
    ]

    commands.forEach(command => context.subscriptions.push(command))
  }

  /**
   * Configure ExAI Guard settings
   */
  private async configureExAIGuard(context: vscode.ExtensionContext): Promise<void> {
    const config = this.exaiGuardService.getConfig()
    
    const violationTypes = await vscode.window.showQuickPick([
      { label: 'Security Violations', picked: config.violationTypes.security },
      { label: 'Privacy Violations', picked: config.violationTypes.privacy },
      { label: 'Compliance Violations', picked: config.violationTypes.compliance },
      { label: 'Ethical Violations', picked: config.violationTypes.ethical },
      { label: 'Quality Violations', picked: config.violationTypes.quality }
    ], {
      canPickMany: true,
      placeHolder: 'Select violation types to detect'
    })

    if (!violationTypes) return

    const severity = await vscode.window.showQuickPick([
      { label: 'Low', value: ExAIGuardViolationSeverity.LOW },
      { label: 'Medium', value: ExAIGuardViolationSeverity.MEDIUM },
      { label: 'High', value: ExAIGuardViolationSeverity.HIGH },
      { label: 'Critical', value: ExAIGuardViolationSeverity.CRITICAL }
    ], {
      placeHolder: 'Select minimum severity threshold'
    })

    if (!severity) return

    const autoCorrection = await vscode.window.showQuickPick([
      { label: 'Enable Auto-Correction', picked: config.autoCorrection },
      { label: 'Disable Auto-Correction', picked: !config.autoCorrection }
    ], {
      placeHolder: 'Auto-correction settings'
    })

    if (!autoCorrection) return

    const realTimeDetection = await vscode.window.showQuickPick([
      { label: 'Enable Real-time Detection', picked: config.realTimeDetection },
      { label: 'Disable Real-time Detection', picked: !config.realTimeDetection }
    ], {
      placeHolder: 'Real-time detection settings'
    })

    if (!realTimeDetection) return

    const newConfig: Partial<ExAIGuardConfig> = {
      violationTypes: {
        security: violationTypes.some(t => t.label === 'Security Violations'),
        privacy: violationTypes.some(t => t.label === 'Privacy Violations'),
        compliance: violationTypes.some(t => t.label === 'Compliance Violations'),
        ethical: violationTypes.some(t => t.label === 'Ethical Violations'),
        quality: violationTypes.some(t => t.label === 'Quality Violations')
      },
      severityThreshold: severity.value,
      autoCorrection: autoCorrection.label === 'Enable Auto-Correction',
      realTimeDetection: realTimeDetection.label === 'Enable Real-time Detection'
    }

    await this.exaiGuardService.updateConfig(newConfig, context)
    vscode.window.showInformationMessage('ExAI Guard configuration updated successfully')
  }

  /**
   * Configure AI Guard integration settings
   */
  private async configureAIGuardIntegration(context: vscode.ExtensionContext): Promise<void> {
    const config = this.exaiGuardService.getAIGuardConfig()
    
    const serviceUrl = await vscode.window.showInputBox({
      placeHolder: 'AI Guard Service URL',
      value: config.serviceUrl,
      prompt: 'Enter the URL of the AI Guard service (e.g., http://localhost:3001)'
    })

    if (serviceUrl === undefined) return

    const enabled = await vscode.window.showQuickPick([
      { label: 'Enable AI Guard Integration', picked: config.enabled },
      { label: 'Disable AI Guard Integration', picked: !config.enabled }
    ], {
      placeHolder: 'AI Guard integration status'
    })

    if (!enabled) return

    const strictMode = await vscode.window.showQuickPick([
      { label: 'Enable Strict Mode', picked: config.strictMode },
      { label: 'Disable Strict Mode', picked: !config.strictMode }
    ], {
      placeHolder: 'Strict validation mode'
    })

    if (!strictMode) return

    const newConfig: Partial<AIGuardIntegrationConfig> = {
      enabled: enabled.label === 'Enable AI Guard Integration',
      serviceUrl: serviceUrl || config.serviceUrl,
      strictMode: strictMode.label === 'Enable Strict Mode'
    }

    await this.exaiGuardService.updateAIGuardConfig(newConfig, context)
    
    // Test connection if enabled
    if (newConfig.enabled) {
      const isAvailable = await this.exaiGuardService.isAIGuardAvailable()
      if (isAvailable) {
        vscode.window.showInformationMessage('AI Guard integration configured and connected successfully')
      } else {
        vscode.window.showWarningMessage('AI Guard integration configured but service is not available')
      }
    } else {
      vscode.window.showInformationMessage('AI Guard integration configuration updated')
    }
  }

  /**
   * Validate current file
   */
  private async validateCurrentFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found')
      return
    }

    const document = editor.document
    const content = document.getText()
    const filePath = document.fileName

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Validating file with AI Guard...',
      cancellable: false
    }, async (progress) => {
      try {
        const violations = await this.exaiGuardService.scanContent(content, { filePath })
        
        if (violations.length === 0) {
          vscode.window.showInformationMessage('No violations found in current file')
        } else {
          const violationCount = violations.length
          const criticalCount = violations.filter(v => 
            v.severity === ExAIGuardViolationSeverity.CRITICAL || 
            v.severity === ExAIGuardViolationSeverity.HIGH
          ).length

          const message = `Found ${violationCount} violations (${criticalCount} critical/high)`
          
          const action = await vscode.window.showWarningMessage(
            message,
            'View Details',
            'Auto-Correct'
          )

          if (action === 'View Details') {
            this.showViolationDetails(violations)
          } else if (action === 'Auto-Correct') {
            await this.applyAutoCorrections(violations, content, { filePath })
          }
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Validation failed: ${error}`)
      }
    })
  }

  /**
   * Validate entire project
   */
  private async validateProject(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage('No workspace folder found')
      return
    }

    const projectPath = workspaceFolders[0].uri.fsPath

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Validating project with AI Guard...',
      cancellable: false
    }, async (progress) => {
      try {
        const violations = await this.exaiGuardService.validateProject(projectPath)
        
        if (violations.length === 0) {
          vscode.window.showInformationMessage('No violations found in project')
        } else {
          const violationCount = violations.length
          const criticalCount = violations.filter(v => 
            v.severity === ExAIGuardViolationSeverity.CRITICAL || 
            v.severity === ExAIGuardViolationSeverity.HIGH
          ).length

          vscode.window.showWarningMessage(
            `Found ${violationCount} violations in project (${criticalCount} critical/high)`,
            'View Details'
          ).then(selection => {
            if (selection === 'View Details') {
              this.showViolationDetails(violations)
            }
          })
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Project validation failed: ${error}`)
      }
    })
  }

  /**
   * Show violation details
   */
  private showViolationDetails(violations: any[]): void {
    // Create a webview or output channel to show detailed violation information
    const outputChannel = vscode.window.createOutputChannel('AI Guard Violations')
    outputChannel.show()
    
    outputChannel.appendLine('=== AI Guard Violations ===')
    outputChannel.appendLine('')
    
    violations.forEach((violation, index) => {
      outputChannel.appendLine(`${index + 1}. ${violation.message}`)
      outputChannel.appendLine(`   Type: ${violation.type}`)
      outputChannel.appendLine(`   Severity: ${violation.severity}`)
      outputChannel.appendLine(`   File: ${violation.context?.filePath || 'Unknown'}`)
      outputChannel.appendLine(`   Line: ${violation.context?.lineNumber || 'Unknown'}`)
      outputChannel.appendLine(`   Suggestion: ${violation.correction?.suggestedAction || 'None'}`)
      outputChannel.appendLine('')
    })
  }

  /**
   * Apply auto-corrections
   */
  private async applyAutoCorrections(violations: any[], content: string, context: any): Promise<void> {
    // This would trigger the auto-correction logic in the service
    vscode.window.showInformationMessage('Auto-correction feature would apply fixes here')
  }

  /**
   * Show service status
   */
  private async showStatus(): Promise<void> {
    const config = this.exaiGuardService.getConfig()
    const aiGuardConfig = this.exaiGuardService.getAIGuardConfig()
    const isAIGuardAvailable = await this.exaiGuardService.isAIGuardAvailable()

    const statusMessage = [
      '=== ExAI Guard Status ===',
      `Enabled: ${config.enabled ? 'Yes' : 'No'}`,
      `Real-time Detection: ${config.realTimeDetection ? 'Yes' : 'No'}`,
      `Auto-Correction: ${config.autoCorrection ? 'Yes' : 'No'}`,
      '',
      '=== AI Guard Integration ===',
      `Enabled: ${aiGuardConfig.enabled ? 'Yes' : 'No'}`,
      `Service Available: ${isAIGuardAvailable ? 'Yes' : 'No'}`,
      `Service URL: ${aiGuardConfig.serviceUrl}`,
      `Strict Mode: ${aiGuardConfig.strictMode ? 'Yes' : 'No'}`
    ].join('\n')

    vscode.window.showInformationMessage(statusMessage, 'Configure', 'View Stats')
      .then(selection => {
        if (selection === 'Configure') {
          vscode.commands.executeCommand('founder-x-ai.exai-guard.configure')
        } else if (selection === 'View Stats') {
          vscode.commands.executeCommand('founder-x-ai.exai-guard.showStats')
        }
      })
  }

  /**
   * Show service statistics
   */
  private showStats(): void {
    const stats = this.exaiGuardService.getStats()
    
    const statsMessage = [
      '=== ExAI Guard Statistics ===',
      `Total Scans: ${stats.totalScans}`,
      `Violations Detected: ${stats.violationsDetected}`,
      `Violations Corrected: ${stats.violationsCorrected}`,
      `Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms`,
      '',
      '=== AI Guard Statistics ===',
      `Validations: ${stats.aiGuardStats.totalValidations}`,
      `Violations Found: ${stats.aiGuardStats.violationsDetected}`,
      `Tasks Created: ${stats.aiGuardStats.tasksCreated}`,
      `Average Response Time: ${stats.aiGuardStats.averageResponseTime.toFixed(2)}ms`
    ].join('\n')

    vscode.window.showInformationMessage(statsMessage)
  }

  /**
   * Toggle ExAI Guard
   */
  private async toggleExAIGuard(context: vscode.ExtensionContext): Promise<void> {
    const config = this.exaiGuardService.getConfig()
    const newEnabled = !config.enabled
    
    await this.exaiGuardService.updateConfig({ enabled: newEnabled }, context)
    
    vscode.window.showInformationMessage(
      `ExAI Guard ${newEnabled ? 'enabled' : 'disabled'}`
    )
  }

  /**
   * Toggle AI Guard integration
   */
  private async toggleAIGuardIntegration(context: vscode.ExtensionContext): Promise<void> {
    const config = this.exaiGuardService.getAIGuardConfig()
    const newEnabled = !config.enabled
    
    await this.exaiGuardService.updateAIGuardConfig({ enabled: newEnabled }, context)
    
    vscode.window.showInformationMessage(
      `AI Guard Integration ${newEnabled ? 'enabled' : 'disabled'}`
    )
  }
}