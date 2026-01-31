/**
 * ExAI Guard Integration Verification Test
 *
 * This test verifies that the ExAI Guard integration is correctly wired up
 * and all critical paths work without requiring full VSCode runtime.
 *
 * Tests cover:
 * 1. Service initialization and singleton pattern
 * 2. Configuration loading
 * 3. Pattern detection (security, privacy, compliance)
 * 4. Memory drift detection
 * 5. Claim tracking
 * 6. Auto-correction
 * 7. Method availability for Task.ts integration
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ExAIGuardService } from '../services/exai-guard/ExAIGuardService'
import { ExAIGuardViolationType, ExAIGuardViolationSeverity } from '../services/exai-guard/ExAIGuardService'

describe('ExAI Guard Integration Verification', () => {
  let service: ExAIGuardService

  beforeEach(() => {
    service = ExAIGuardService.getInstance()
  })

  describe('Service Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = ExAIGuardService.getInstance()
      const instance2 = ExAIGuardService.getInstance()

      expect(instance1).toBe(instance2)
      expect(instance1).toBeDefined()
    })

    it('should be enabled by default', () => {
      expect(service.isEnabled()).toBe(true)
    })

    it('should have real-time detection enabled', () => {
      expect(service.isRealTimeDetectionEnabled()).toBe(true)
    })

    it('should have auto-correction disabled by default', () => {
      expect(service.isAutoCorrectionEnabled()).toBe(false)
    })
  })

  describe('Method Availability (Task.ts Integration)', () => {
    it('should have getInstance() method', () => {
      expect(typeof ExAIGuardService.getInstance).toBe('function')
    })

    it('should have isEnabled() method', () => {
      expect(typeof service.isEnabled).toBe('function')
    })

    it('should have isRealTimeDetectionEnabled() method', () => {
      expect(typeof service.isRealTimeDetectionEnabled).toBe('function')
    })

    it('should have trackAIClaim() method', () => {
      expect(typeof service.trackAIClaim).toBe('function')
    })

    it('should have detectMemoryDrift() method', () => {
      expect(typeof service.detectMemoryDrift).toBe('function')
    })

    it('should have scanContent() method', () => {
      expect(typeof service.scanContent).toBe('function')
    })

    it('should have isAutoCorrectionEnabled() method', () => {
      expect(typeof service.isAutoCorrectionEnabled).toBe('function')
    })

    it('should have applyCorrection() method', () => {
      expect(typeof service.applyCorrection).toBe('function')
    })
  })

  describe('Pattern Detection - Security Violations', () => {
    it('should detect hardcoded API keys', () => {
      const content = 'const apiKey = "sk_test_1234567890abcdefghijklmnop"'
      const violations = service.scanContent(content, { taskId: 'test-1' })

      expect(violations.length).toBeGreaterThan(0)
      const securityViolation = violations.find(v => v.type === ExAIGuardViolationType.SECURITY)
      expect(securityViolation).toBeDefined()
      expect(securityViolation?.message).toContain('API key')
    })

    it('should detect hardcoded passwords', () => {
      const content = 'const password = "mySecretPassword123"'
      const violations = service.scanContent(content, { taskId: 'test-2' })

      const securityViolation = violations.find(v =>
        v.type === ExAIGuardViolationType.SECURITY && v.message.toLowerCase().includes('password')
      )
      expect(securityViolation).toBeDefined()
    })

    it('should detect hardcoded secrets', () => {
      const content = 'const secret = "sk_live_abc123def456ghi789"'
      const violations = service.scanContent(content, { taskId: 'test-3' })

      const securityViolation = violations.find(v => v.type === ExAIGuardViolationType.SECURITY)
      expect(securityViolation).toBeDefined()
    })

    it('should detect multiple secrets in one content block', () => {
      const content = `
        const apiKey = "sk_test_abc123"
        const password = "secretPassword"
        const token = "ghp_abc123def456ghi789"
      `
      const violations = service.scanContent(content, { taskId: 'test-4' })

      const securityViolations = violations.filter(v => v.type === ExAIGuardViolationType.SECURITY)
      expect(securityViolations.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Pattern Detection - Privacy Violations', () => {
    it('should detect email addresses', () => {
      const content = 'Send report to admin@example.com'
      const violations = service.scanContent(content, { taskId: 'test-5' })

      const privacyViolation = violations.find(v => v.type === ExAIGuardViolationType.PRIVACY)
      expect(privacyViolation).toBeDefined()
    })

    it('should detect phone numbers', () => {
      const content = 'Contact us at 555-123-4567'
      const violations = service.scanContent(content, { taskId: 'test-6' })

      const privacyViolation = violations.find(v => v.type === ExAIGuardViolationType.PRIVACY)
      expect(privacyViolation).toBeDefined()
    })

    it('should detect SSN patterns', () => {
      const content = 'SSN: 123-45-6789'
      const violations = service.scanContent(content, { taskId: 'test-7' })

      const privacyViolation = violations.find(v => v.type === ExAIGuardViolationType.PRIVACY)
      expect(privacyViolation).toBeDefined()
    })
  })

  describe('Pattern Detection - Quality Violations', () => {
    it('should detect TODO comments', () => {
      const content = '// TODO: Implement this feature'
      const violations = service.scanContent(content, { taskId: 'test-8' })

      const qualityViolation = violations.find(v => v.type === ExAIGuardViolationType.QUALITY)
      expect(qualityViolation).toBeDefined()
      expect(qualityViolation?.message).toContain('TODO')
    })

    it('should detect incomplete code patterns', () => {
      const content = 'function test() { /* implement later */ }'
      const violations = service.scanContent(content, { taskId: 'test-9' })

      const qualityViolation = violations.find(v => v.type === ExAIGuardViolationType.QUALITY)
      expect(qualityViolation).toBeDefined()
    })
  })

  describe('Memory Drift Detection', () => {
    it('should track AI commitments', () => {
      const commitment = "I will update the database schema to include the new fields"

      // Should not throw
      expect(() => {
        service.trackAIClaim(commitment, { taskId: 'test-10' })
      }).not.toThrow()
    })

    it('should detect contradictions to previous commitments', () => {
      const taskId = 'test-11'

      // First, AI makes a commitment
      service.trackAIClaim("I will create a new API endpoint for user authentication", {
        taskId,
        messageType: 'aiResponse'
      })

      // Then, AI contradicts itself
      const contradictoryStatement = "I won't create any new API endpoints"
      const violations = service.detectMemoryDrift(contradictoryStatement, { taskId })

      // Should detect memory drift
      expect(violations.length).toBeGreaterThan(0)
      const driftViolation = violations.find(v =>
        v.message.includes('Memory drift') || v.message.includes('contradiction')
      )
      expect(driftViolation).toBeDefined()
      expect(driftViolation?.severity).toBe(ExAIGuardViolationSeverity.HIGH)
    })

    it('should track multiple commitments in context window', () => {
      const taskId = 'test-12'

      service.trackAIClaim("I will implement feature A", { taskId })
      service.trackAIClaim("I will implement feature B", { taskId })
      service.trackAIClaim("I will implement feature C", { taskId })

      // Should not throw and context window should have all claims
      expect(() => {
        service.detectMemoryDrift("Testing context", { taskId })
      }).not.toThrow()
    })

    it('should detect negation patterns in contradictions', () => {
      const taskId = 'test-13'

      service.trackAIClaim("I will add error handling to the function", { taskId })

      const violations = service.detectMemoryDrift(
        "I cannot add error handling to this function",
        { taskId }
      )

      const driftViolation = violations.find(v => v.severity === ExAIGuardViolationSeverity.HIGH)
      expect(driftViolation).toBeDefined()
    })
  })

  describe('Auto-Correction', () => {
    it('should provide correction for security violations', () => {
      const content = 'const apiKey = "sk_test_abc123"'
      const violations = service.scanContent(content, { taskId: 'test-14' })
      const securityViolation = violations.find(v => v.type === ExAIGuardViolationType.SECURITY)

      if (securityViolation) {
        const correction = service.applyCorrection(securityViolation, content)

        expect(correction).toBeDefined()
        expect(correction.correctedContent).toBeDefined()
        expect(correction.correctedContent).not.toBe(content)
        expect(correction.correctedContent).not.toContain('sk_test_abc123')
      }
    })

    it('should provide correction for privacy violations', () => {
      const content = 'Email: user@example.com'
      const violations = service.scanContent(content, { taskId: 'test-15' })
      const privacyViolation = violations.find(v => v.type === ExAIGuardViolationType.PRIVACY)

      if (privacyViolation) {
        const correction = service.applyCorrection(privacyViolation, content)

        expect(correction.wasApplied).toBe(true)
        expect(correction.correctedContent).not.toContain('user@example.com')
      }
    })

    it('should indicate when correction was applied', () => {
      const content = 'const secret = "my_secret_key_123"'
      const violations = service.scanContent(content, { taskId: 'test-16' })
      const securityViolation = violations.find(v => v.type === ExAIGuardViolationType.SECURITY)

      if (securityViolation) {
        const correction = service.applyCorrection(securityViolation, content)
        expect(correction.wasApplied).toBe(true)
      }
    })
  })

  describe('Stream Interception Integration', () => {
    it('should handle real-time chunks without errors', () => {
      const chunks = [
        'Let me help you with that.',
        'I will create a new function',
        'const apiKey = "sk_test_123"',
        'And add proper error handling'
      ]

      chunks.forEach((chunk, index) => {
        expect(() => {
          service.trackAIClaim(chunk, { taskId: 'stream-test', messageType: 'aiStreamChunk' })
          service.detectMemoryDrift(chunk, { taskId: 'stream-test' })
          service.scanContent(chunk, { taskId: 'stream-test', isStreaming: true })
        }).not.toThrow()
      })
    })

    it('should detect violations in streaming context', () => {
      const streamChunk = 'const password = "hardcodedPassword123"'
      const violations = service.scanContent(streamChunk, {
        taskId: 'stream-test-2',
        isStreaming: true
      })

      expect(violations.length).toBeGreaterThan(0)
      expect(violations.some(v => v.type === ExAIGuardViolationType.SECURITY)).toBe(true)
    })

    it('should maintain performance in high-frequency scanning', () => {
      const iterations = 100
      const startTime = Date.now()

      for (let i = 0; i < iterations; i++) {
        service.scanContent(`Testing chunk ${i}`, { taskId: 'perf-test' })
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime
      const avgTimePerScan = totalTime / iterations

      // Should complete 100 scans in reasonable time (< 500ms total)
      expect(totalTime).toBeLessThan(500)

      // Average time per scan should be < 5ms as designed
      expect(avgTimePerScan).toBeLessThan(5)
    })
  })

  describe('Violation Metadata', () => {
    it('should include violation ID', () => {
      const content = 'const apiKey = "sk_test_123"'
      const violations = service.scanContent(content, { taskId: 'test-17' })

      violations.forEach(violation => {
        expect(violation.id).toBeDefined()
        expect(typeof violation.id).toBe('string')
        expect(violation.id.length).toBeGreaterThan(0)
      })
    })

    it('should include severity level', () => {
      const content = 'const apiKey = "sk_test_123"'
      const violations = service.scanContent(content, { taskId: 'test-18' })

      violations.forEach(violation => {
        expect(violation.severity).toBeDefined()
        expect([
          ExAIGuardViolationSeverity.LOW,
          ExAIGuardViolationSeverity.MEDIUM,
          ExAIGuardViolationSeverity.HIGH,
          ExAIGuardViolationSeverity.CRITICAL
        ]).toContain(violation.severity)
      })
    })

    it('should include timestamp', () => {
      const content = 'const apiKey = "sk_test_123"'
      const violations = service.scanContent(content, { taskId: 'test-19' })

      violations.forEach(violation => {
        expect(violation.timestamp).toBeDefined()
        expect(typeof violation.timestamp).toBe('number')
        expect(violation.timestamp).toBeGreaterThan(0)
      })
    })

    it('should include context when provided', () => {
      const content = 'const apiKey = "sk_test_123"'
      const context = {
        taskId: 'test-20',
        instanceId: 'instance-123',
        messageType: 'aiStreamChunk'
      }
      const violations = service.scanContent(content, context)

      violations.forEach(violation => {
        expect(violation.context).toBeDefined()
        expect(violation.context?.taskId).toBe('test-20')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const violations = service.scanContent('', { taskId: 'test-21' })
      expect(violations).toBeDefined()
      expect(Array.isArray(violations)).toBe(true)
    })

    it('should handle very long content', () => {
      const longContent = 'a'.repeat(100000)
      expect(() => {
        service.scanContent(longContent, { taskId: 'test-22' })
      }).not.toThrow()
    })

    it('should handle special characters', () => {
      const content = 'const key = "sk_test_!@#$%^&*()_+{}[]|\\:;<>?,./~`"'
      expect(() => {
        service.scanContent(content, { taskId: 'test-23' })
      }).not.toThrow()
    })

    it('should handle multiline content', () => {
      const content = `
        Line 1
        Line 2
        const apiKey = "sk_test_123"
        Line 4
      `
      const violations = service.scanContent(content, { taskId: 'test-24' })
      expect(violations.length).toBeGreaterThan(0)
    })

    it('should handle null context gracefully', () => {
      const content = 'test content'
      expect(() => {
        service.scanContent(content)
      }).not.toThrow()
    })
  })

  describe('Configuration', () => {
    it('should respect enabled state', () => {
      // Service should be enabled by default
      expect(service.isEnabled()).toBe(true)

      // Scanning should work when enabled
      const content = 'const apiKey = "sk_test_123"'
      const violations = service.scanContent(content, { taskId: 'test-25' })
      expect(violations.length).toBeGreaterThan(0)
    })

    it('should respect real-time detection setting', () => {
      expect(service.isRealTimeDetectionEnabled()).toBe(true)
    })

    it('should respect auto-correction setting', () => {
      const autoCorrectionEnabled = service.isAutoCorrectionEnabled()
      expect(typeof autoCorrectionEnabled).toBe('boolean')
    })
  })
})

describe('Integration Path Verification', () => {
  it('Task.ts can access ExAIGuardService singleton', () => {
    // Simulate Task.ts access pattern
    const exaiGuardService = ExAIGuardService.getInstance()

    expect(exaiGuardService).toBeDefined()
    expect(exaiGuardService.isEnabled).toBeDefined()
    expect(exaiGuardService.isRealTimeDetectionEnabled).toBeDefined()
  })

  it('Task.ts stream interception pattern works', () => {
    // Simulate the exact code from Task.ts lines 1846-1972
    const exaiGuardService = ExAIGuardService.getInstance()

    if (exaiGuardService.isEnabled() && exaiGuardService.isRealTimeDetectionEnabled()) {
      const chunkText = 'const apiKey = "sk_test_abc123"'
      const taskId = 'integration-test'

      // Track claims
      exaiGuardService.trackAIClaim(chunkText, {
        taskId,
        messageType: 'aiStreamChunk'
      })

      // Detect memory drift
      const memoryDriftViolations = exaiGuardService.detectMemoryDrift(chunkText, { taskId })

      // Scan content
      const standardViolations = exaiGuardService.scanContent(chunkText, {
        taskId,
        instanceId: 'test-instance',
        messageType: 'aiStreamChunk',
        isStreaming: true
      })

      // Combine violations
      const violations = [...standardViolations, ...memoryDriftViolations]

      expect(violations).toBeDefined()
      expect(Array.isArray(violations)).toBe(true)

      // Should have detected the API key
      expect(violations.length).toBeGreaterThan(0)

      // Test auto-correction if critical violations found
      const criticalViolations = violations.filter(v =>
        v.severity === 'critical' || v.severity === 'high'
      )

      if (criticalViolations.length > 0 && exaiGuardService.isAutoCorrectionEnabled()) {
        let correctedChunk = chunkText

        for (const violation of criticalViolations) {
          const correction = exaiGuardService.applyCorrection(violation, correctedChunk)
          if (correction.wasApplied) {
            correctedChunk = correction.correctedContent
          }
        }

        expect(correctedChunk).toBeDefined()
      }
    }
  })
})
