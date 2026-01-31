import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import * as vscode from "vscode"

import { ExAIGuardService } from "../services/exai-guard/ExAIGuardService"
import { ExAIGuardViolationType, ExAIGuardViolationSeverity } from "../services/exai-guard/ExAIGuardService"

describe("ExAI Guard Integration", () => {
  let exaiGuard: ExAIGuardService

  beforeEach(() => {
    exaiGuard = ExAIGuardService.getInstance()
  })

  afterEach(() => {
    exaiGuard.dispose()
  })

  it("should detect security violations in content", () => {
    const content = `
      const apiKey = "AKIA1234567890123456"
      const secret = "my-secret-password"
    `

    const violations = exaiGuard.scanContent(content)
    
    expect(violations.length).toBeGreaterThan(0)
    expect(violations.some(v => v.type === ExAIGuardViolationType.SECURITY)).toBe(true)
  })

  it("should detect privacy violations in content", () => {
    const content = `
      const email = "test@example.com"
      const phone = "555-123-4567"
    `

    const violations = exaiGuard.scanContent(content)
    
    expect(violations.length).toBeGreaterThan(0)
    expect(violations.some(v => v.type === ExAIGuardViolationType.PRIVACY)).toBe(true)
  })

  it("should detect quality violations in content", () => {
    const content = `
      // TODO: Implement this function
      function incompleteFunction() {
        // FIXME: Add error handling
      }
    `

    console.log("Testing content:", content)
    console.log("Quality patterns:", exaiGuard["qualityPatterns"])
    
    const violations = exaiGuard.scanContent(content)
    
    console.log("Violations found:", violations)
    console.log("Violation types:", violations.map(v => v.type))
    
    expect(violations.length).toBeGreaterThan(0)
    expect(violations.some(v => v.type === ExAIGuardViolationType.QUALITY)).toBe(true)
  })

  it("should apply corrections to violations", () => {
    const content = `
      const apiKey = "AKIA1234567890123456"
    `

    const violations = exaiGuard.scanContent(content)
    
    if (violations.length > 0) {
      const violation = violations[0]
      const result = exaiGuard.applyCorrection(violation, content)
      
      expect(result.wasApplied).toBe(true)
      expect(result.correctedContent).not.toContain("AKIA1234567890123456")
    }
  })

  it("should intercept streams for incomplete code", () => {
    const content = `
      function myFunction() {
        // TODO: Implement this properly
        // For now, just return a placeholder...
        return "placeholder"
      }
    `

    const result = exaiGuard.interceptStream(content, { taskId: "test-task" })
    
    expect(result.intercepted).toBe(true)
    expect(result.violations.length).toBeGreaterThan(0)
    expect(result.subtasks.length).toBeGreaterThan(0)
  })

  it("should generate fixes for violations", async () => {
    const content = `
      const apiKey = "AKIA1234567890123456"
    `

    const violations = exaiGuard.scanContent(content)
    
    if (violations.length > 0) {
      const violation = violations[0]
      const fix = await exaiGuard.generateFix(violation, content)
      
      expect(fix).toBeDefined()
      expect(typeof fix).toBe("string")
    }
  })

  it("should handle orchestration subtasks", () => {
    const content = `
      // TODO: Implement this function
      function incompleteFunction() {
        // FIXME: Add error handling
      }
    `

    const result = exaiGuard.interceptStream(content, { taskId: "test-task" })
    
    expect(result.subtasks.length).toBeGreaterThan(0)
    
    const subtask = result.subtasks[0]
    expect(subtask.title).toBeDefined()
    expect(subtask.description).toBeDefined()
    expect(subtask.priority).toBeDefined()
    expect(subtask.status).toBe("pending")
  })

  it("should provide orchestration status", () => {
    const status = exaiGuard.getOrchestrationStatus()
    
    expect(status).toBeDefined()
    expect(status.totalSubtasks).toBeDefined()
    expect(status.pending).toBeDefined()
    expect(status.completed).toBeDefined()
  })

  it("should get active subtasks", () => {
    const activeSubtasks = exaiGuard.getActiveSubtasks()
    
    expect(Array.isArray(activeSubtasks)).toBe(true)
  })
})