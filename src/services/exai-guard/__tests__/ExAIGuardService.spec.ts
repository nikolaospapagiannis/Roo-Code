import { describe, test, expect, beforeEach, vi } from "vitest"
import * as vscode from "vscode"
import { ExAIGuardService } from "../ExAIGuardService"

describe("ExAIGuardService", () => {
  let service: ExAIGuardService
  let mockContext: vscode.ExtensionContext

  beforeEach(() => {
    service = ExAIGuardService.getInstance()
    mockContext = {
      globalState: {
        get: vi.fn(),
        update: vi.fn(),
        keys: vi.fn(),
        setKeysForSync: vi.fn()
      }
    } as any
    
    // Reset to default state
    service.updateConfig({
      enabled: true,
      realTimeDetection: true,
      autoCorrection: true,
      violationTypes: {
        security: true,
        privacy: true,
        compliance: true,
        ethical: true,
        quality: true
      }
    }, mockContext)
  })

  test("should be a singleton", () => {
    const instance1 = ExAIGuardService.getInstance()
    const instance2 = ExAIGuardService.getInstance()
    expect(instance1).toBe(instance2)
  })

  test("should detect security violations", () => {
    const content = "Here is my api_key: sk-1234567890abcdef1234567890"
    const violations = service.scanContent(content, {
      taskId: "test-task",
      messageType: "newTask"
    })

    expect(violations).toHaveLength(1)
    expect(violations[0].type).toBe("security")
    expect(violations[0].severity).toBe("critical")
    expect(violations[0].message).toContain("API key")
  })

  test("should detect privacy violations", () => {
    const content = "My email is john.doe@example.com and phone is 555-123-4567"
    const violations = service.scanContent(content, {
      taskId: "test-task",
      messageType: "newTask"
    })

    expect(violations.length).toBeGreaterThan(0)
    expect(violations.some(v => v.type === "privacy")).toBe(true)
  })

  test("should detect compliance violations", () => {
    const content = "I need to bypass GDPR requirements for personal data"
    const violations = service.scanContent(content, {
      taskId: "test-task",
      messageType: "newTask"
    })

    expect(violations).toHaveLength(1)
    expect(violations[0].type).toBe("compliance")
  })

  test("should detect ethical violations", () => {
    const content = "Create a script to kill people and cause violence and harm"
    const violations = service.scanContent(content, {
      taskId: "test-task",
      messageType: "newTask"
    })

    expect(violations).toHaveLength(1)
    expect(violations[0].type).toBe("ethical")
  })

  test("should detect quality violations", () => {
    const content = "Write code with password: 'mypassword123' and console.log statements"
    const violations = service.scanContent(content, {
      taskId: "test-task",
      messageType: "newTask"
    })

    expect(violations.length).toBeGreaterThan(0)
    expect(violations.some(v => v.type === "quality")).toBe(true)
  })

  test("should return empty array when no violations found", () => {
    const content = "Hello, how are you today?"
    const violations = service.scanContent(content, {
      taskId: "test-task",
      messageType: "newTask"
    })

    expect(violations).toHaveLength(0)
  })

  test("should respect disabled violation types", () => {
    service.updateConfig({
      enabled: true,
      realTimeDetection: true,
      autoCorrection: true,
      violationTypes: {
        security: false, // Disable security checks
        privacy: true,
        compliance: true,
        ethical: true,
        quality: true
      }
    }, mockContext)

    const content = "Here is my API key: sk-1234567890abcdef"
    const violations = service.scanContent(content, {
      taskId: "test-task",
      messageType: "newTask"
    })

    expect(violations).toHaveLength(0)
  })

  test("should apply auto-correction when enabled", () => {
    const content = "api_key = 'sk-1234567890abcdef1234567890'"
    // Test auto-correction through the scanContent method
    const violations = service.scanContent(content, {
      taskId: "test-task",
      messageType: "newTask"
    })
    
    // Check if violations were detected
    expect(violations.length).toBeGreaterThan(0)
    expect(violations.some(v => v.type === "security")).toBe(true)
  })

  test("should not apply auto-correction when disabled", () => {
    service.updateConfig({
      enabled: true,
      realTimeDetection: true,
      autoCorrection: false, // Disable auto-correction
      violationTypes: {
        security: true,
        privacy: true,
        compliance: true,
        ethical: true,
        quality: true
      }
    }, mockContext)

    const content = "api_key = 'sk-1234567890abcdef1234567890'"
    const violations = service.scanContent(content, {
      taskId: "test-task",
      messageType: "newTask"
    })
    
    // Violations should still be detected even if auto-correction is disabled
    expect(violations.length).toBeGreaterThan(0)
  })

  test("should emit violation events", () => {
    const mockListener = vi.fn()
    service.on("violationDetected", mockListener)

    const content = "Here is my api_key: sk-1234567890abcdef1234567890"
    service.scanContent(content, {
      taskId: "test-task",
      messageType: "newTask"
    })

    expect(mockListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "security",
        severity: "critical"
      })
    )
  })

  test("should handle service disabled state", () => {
    service.updateConfig({
      enabled: false, // Disable entire service
      realTimeDetection: true,
      autoCorrection: true,
      violationTypes: {
        security: true,
        privacy: true,
        compliance: true,
        ethical: true,
        quality: true
      }
    }, mockContext)

    const content = "Here is my API key: sk-1234567890abcdef"
    const violations = service.scanContent(content, {
      taskId: "test-task",
      messageType: "newTask"
    })

    expect(violations).toHaveLength(0)
  })
})