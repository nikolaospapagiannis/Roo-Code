import React from "react"
import { vscode } from "../../utils/vscode"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"

interface ExAIGuardViolation {
  id: string
  type: string
  severity: "low" | "medium" | "high" | "critical"
  message: string
  description: string
  timestamp: number
  context?: {
    taskId?: string
    messageId?: string
    toolName?: string
    filePath?: string
    command?: string
    lineNumber?: string
    patternId?: string
    confidence?: string
    riskScore?: string
  }
  correction?: {
    suggestedAction: string
    correctedContent?: string
    autoCorrectable: boolean
  }
}

interface ExAIGuardViolationDialogProps {
  isOpen: boolean
  violations: ExAIGuardViolation[]
  onClose: () => void
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-red-500 text-white"
    case "high":
      return "bg-orange-500 text-white"
    case "medium":
      return "bg-yellow-500 text-white"
    case "low":
      return "bg-blue-500 text-white"
    default:
      return "bg-gray-500 text-white"
  }
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "critical":
      return "🔴"
    case "high":
      return "🟠"
    case "medium":
      return "🟡"
    case "low":
      return "🔵"
    default:
      return "⚪"
  }
}

export const ExAIGuardViolationDialog: React.FC<ExAIGuardViolationDialogProps> = ({
  isOpen,
  violations,
  onClose,
}) => {
  if (!isOpen || violations.length === 0) {
    return null
  }

  const handleApplyCorrection = (violationId: string, originalContent?: string) => {
    vscode.postMessage({
      type: "exaiGuardApplyCorrection",
      violationId,
      originalContent,
    })
  }

  const handleClearViolations = () => {
    vscode.postMessage({
      type: "exaiGuardClearViolations",
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-vscode-editor-background border border-vscode-panel-border rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-vscode-panel-border">
          <h2 className="text-lg font-semibold text-vscode-editor-foreground">
            ExAI Guard Violations Detected
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-vscode-descriptionForeground hover:text-vscode-editor-foreground"
          >
            ✕
          </Button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {violations.map((violation) => (
              <div
                key={violation.id}
                className={`p-4 border-l-4 bg-vscode-panel-background rounded ${
                  violation.severity === "critical"
                    ? "border-red-500"
                    : violation.severity === "high"
                    ? "border-orange-500"
                    : violation.severity === "medium"
                    ? "border-yellow-500"
                    : "border-blue-500"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span>{getSeverityIcon(violation.severity)}</span>
                      <Badge className={getSeverityColor(violation.severity)}>
                        {violation.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-vscode-descriptionForeground">
                        {violation.type}
                      </Badge>
                    </div>
                    
                    <div className="text-vscode-editor-foreground">
                      <div className="font-medium mb-1">{violation.message}</div>
                      <div className="text-sm text-vscode-descriptionForeground mb-2">
                        {violation.description}
                      </div>

                      {violation.context && (
                        <div className="text-xs text-vscode-descriptionForeground space-y-1 mb-2">
                          {violation.context.filePath && (
                            <div>File: {violation.context.filePath}</div>
                          )}
                          {violation.context.lineNumber && (
                            <div>Line: {violation.context.lineNumber}</div>
                          )}
                          {violation.context.toolName && (
                            <div>Tool: {violation.context.toolName}</div>
                          )}
                        </div>
                      )}

                      {violation.correction && (
                        <div className="mt-2 p-2 bg-vscode-input-background rounded border border-vscode-input-border">
                          <div className="text-sm font-medium text-vscode-editor-foreground mb-1">
                            Suggested Fix:
                          </div>
                          <div className="text-sm text-vscode-descriptionForeground">
                            {violation.correction.suggestedAction}
                          </div>
                          {violation.correction.autoCorrectable && (
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => handleApplyCorrection(violation.id, violation.correction?.correctedContent)}
                            >
                              Apply Fix
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center p-4 border-t border-vscode-panel-border bg-vscode-panel-background">
          <div className="text-sm text-vscode-descriptionForeground">
            {violations.length} violation{violations.length !== 1 ? "s" : ""} detected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClearViolations}>
              Clear All
            </Button>
            <Button onClick={onClose}>
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}