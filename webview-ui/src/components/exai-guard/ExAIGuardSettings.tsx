import React, { useState, useEffect } from "react"
import { vscode } from "../../utils/vscode"
import { Button } from "../ui/button"
import { ToggleSwitch } from "../ui/toggle-switch"
import { Badge } from "../ui/badge"

interface ExAIGuardConfig {
  enabled: boolean
  realtimeDetection: boolean
  autoCorrection: boolean
  securityPatterns: boolean
  privacyPatterns: boolean
  compliancePatterns: boolean
  qualityPatterns: boolean
  confidenceThreshold: number
  riskThreshold: number
}

export const ExAIGuardSettings: React.FC = () => {
  const [config, setConfig] = useState<ExAIGuardConfig>({
    enabled: true,
    realtimeDetection: true,
    autoCorrection: true,
    securityPatterns: true,
    privacyPatterns: true,
    compliancePatterns: true,
    qualityPatterns: true,
    confidenceThreshold: 0.8,
    riskThreshold: 0.7,
  })

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Load initial configuration
    const handleMessage = (e: MessageEvent) => {
      const message = e.data
      if (message.type === "exaiGuardConfig" && message.values) {
        setConfig(message.values)
      }
    }

    window.addEventListener("message", handleMessage)

    // Request current configuration
    vscode.postMessage({ type: "exaiGuardConfig" as any })

    return () => {
      window.removeEventListener("message", handleMessage)
    }
  }, [])

  const handleConfigUpdate = (updates: Partial<ExAIGuardConfig>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    
    setIsLoading(true)
    vscode.postMessage({
      type: "exaiGuardConfig",
      values: newConfig,
    })

    // Reset loading state after a short delay
    setTimeout(() => setIsLoading(false), 500)
  }

  const handleResetToDefaults = () => {
    const defaultConfig: ExAIGuardConfig = {
      enabled: true,
      realtimeDetection: true,
      autoCorrection: true,
      securityPatterns: true,
      privacyPatterns: true,
      compliancePatterns: true,
      qualityPatterns: true,
      confidenceThreshold: 0.8,
      riskThreshold: 0.7,
    }
    handleConfigUpdate(defaultConfig)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-vscode-editor-foreground">
            ExAI Guard Settings
          </h3>
          <p className="text-sm text-vscode-descriptionForeground">
            Configure real-time AI code quality and security monitoring
          </p>
        </div>
        <Badge variant={config.enabled ? "default" : "outline"}>
          {config.enabled ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Core Settings */}
        <div className="space-y-4 p-4 bg-vscode-input-background rounded border border-vscode-input-border">
          <h4 className="font-medium text-vscode-editor-foreground">Core Features</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-vscode-editor-foreground">Enable ExAI Guard</div>
              <div className="text-sm text-vscode-descriptionForeground">
                Activate real-time violation detection
              </div>
            </div>
            <ToggleSwitch
              checked={config.enabled}
              onChange={() => handleConfigUpdate({ enabled: !config.enabled })}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-vscode-editor-foreground">Real-time Detection</div>
              <div className="text-sm text-vscode-descriptionForeground">
                Monitor AI responses in real-time
              </div>
            </div>
            <ToggleSwitch
              checked={config.realtimeDetection}
              onChange={() => handleConfigUpdate({ realtimeDetection: !config.realtimeDetection })}
              disabled={isLoading || !config.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-vscode-editor-foreground">Auto-correction</div>
              <div className="text-sm text-vscode-descriptionForeground">
                Automatically apply safe fixes
              </div>
            </div>
            <ToggleSwitch
              checked={config.autoCorrection}
              onChange={() => handleConfigUpdate({ autoCorrection: !config.autoCorrection })}
              disabled={isLoading || !config.enabled}
            />
          </div>
        </div>

        {/* Detection Patterns */}
        <div className="space-y-4 p-4 bg-vscode-input-background rounded border border-vscode-input-border">
          <h4 className="font-medium text-vscode-editor-foreground">Detection Patterns</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-vscode-editor-foreground">Security Patterns</div>
              <div className="text-sm text-vscode-descriptionForeground">
                Detect security vulnerabilities
              </div>
            </div>
            <ToggleSwitch
              checked={config.securityPatterns}
              onChange={() => handleConfigUpdate({ securityPatterns: !config.securityPatterns })}
              disabled={isLoading || !config.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-vscode-editor-foreground">Privacy Patterns</div>
              <div className="text-sm text-vscode-descriptionForeground">
                Detect privacy violations
              </div>
            </div>
            <ToggleSwitch
              checked={config.privacyPatterns}
              onChange={() => handleConfigUpdate({ privacyPatterns: !config.privacyPatterns })}
              disabled={isLoading || !config.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-vscode-editor-foreground">Compliance Patterns</div>
              <div className="text-sm text-vscode-descriptionForeground">
                Detect compliance issues
              </div>
            </div>
            <ToggleSwitch
              checked={config.compliancePatterns}
              onChange={() => handleConfigUpdate({ compliancePatterns: !config.compliancePatterns })}
              disabled={isLoading || !config.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-vscode-editor-foreground">Quality Patterns</div>
              <div className="text-sm text-vscode-descriptionForeground">
                Detect code quality issues
              </div>
            </div>
            <ToggleSwitch
              checked={config.qualityPatterns}
              onChange={() => handleConfigUpdate({ qualityPatterns: !config.qualityPatterns })}
              disabled={isLoading || !config.enabled}
            />
          </div>
        </div>

        {/* Threshold Settings */}
        <div className="space-y-4 p-4 bg-vscode-input-background rounded border border-vscode-input-border">
          <h4 className="font-medium text-vscode-editor-foreground">Detection Thresholds</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-vscode-editor-foreground">Confidence Threshold</div>
                <div className="text-sm text-vscode-descriptionForeground">
                  Minimum confidence level for violations ({config.confidenceThreshold})
                </div>
              </div>
              <div className="text-sm font-medium text-vscode-editor-foreground">
                {Math.round(config.confidenceThreshold * 100)}%
              </div>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={config.confidenceThreshold}
              onChange={(e) => handleConfigUpdate({ confidenceThreshold: parseFloat(e.target.value) })}
              disabled={isLoading || !config.enabled}
              className="w-full h-2 bg-vscode-input-border rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-vscode-editor-foreground">Risk Threshold</div>
                <div className="text-sm text-vscode-descriptionForeground">
                  Minimum risk level for violations ({config.riskThreshold})
                </div>
              </div>
              <div className="text-sm font-medium text-vscode-editor-foreground">
                {Math.round(config.riskThreshold * 100)}%
              </div>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={config.riskThreshold}
              onChange={(e) => handleConfigUpdate({ riskThreshold: parseFloat(e.target.value) })}
              disabled={isLoading || !config.enabled}
              className="w-full h-2 bg-vscode-input-border rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleResetToDefaults}
            disabled={isLoading}
          >
            Reset to Defaults
          </Button>
          <div className="text-sm text-vscode-descriptionForeground">
            {isLoading ? "Saving..." : "Settings saved automatically"}
          </div>
        </div>
      </div>
    </div>
  )
}