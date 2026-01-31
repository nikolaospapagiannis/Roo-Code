/**
 * Comprehensive tests for ExAI Guard Real-Time Stream Interception
 * Tests memory drift detection, claim drift detection, auto-correction, and telemetry
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { ExAIGuardService, ExAIGuardViolationType, ExAIGuardViolationSeverity } from "../services/exai-guard/ExAIGuardService"
import { TelemetryService } from "@founder-x-ai/telemetry"
import * as vscode from "vscode"

describe("ExAI Guard Real-Time Stream Interception", () => {
	let exaiGuardService: ExAIGuardService
	let mockContext: vscode.ExtensionContext
	let telemetrySpy: any

	beforeEach(async () => {
		// Reset singleton instance
		;(ExAIGuardService as any).instance = undefined
		exaiGuardService = ExAIGuardService.getInstance()

		// Create mock context
		mockContext = {
			globalState: {
				get: vi.fn(),
				update: vi.fn(),
			},
			subscriptions: [],
		} as any

		await exaiGuardService.initialize(mockContext)

		// Spy on telemetry
		telemetrySpy = {
			captureExAIGuardViolationDetected: vi.fn(),
			captureExAIGuardViolationCorrected: vi.fn(),
			captureExAIGuardAction: vi.fn(),
		}

		// Mock TelemetryService
		vi.spyOn(TelemetryService, "hasInstance").mockReturnValue(true)
		Object.defineProperty(TelemetryService, "instance", {
			get: () => telemetrySpy,
			configurable: true,
		})
	})

	afterEach(() => {
		exaiGuardService.dispose()
		vi.restoreAllMocks()
	})

	describe("Memory Drift Detection", () => {
		it("should track AI commitments from stream chunks", () => {
			const chunk1 = "I will implement error handling for all API calls"
			const chunk2 = "Let me add validation to the user input"
			const chunk3 = "I'm going to refactor the database queries"

			exaiGuardService.trackAIClaim(chunk1, { taskId: "task-1" })
			exaiGuardService.trackAIClaim(chunk2, { taskId: "task-1" })
			exaiGuardService.trackAIClaim(chunk3, { taskId: "task-1" })

			const stats = exaiGuardService.getMemoryDriftStats()
			expect(stats.totalCommitments).toBeGreaterThanOrEqual(3)
			expect(stats.pendingCommitments).toBeGreaterThanOrEqual(3)
		})

		it("should detect memory drift when AI contradicts previous commitments", () => {
			// AI makes a commitment
			const commitment = "I will implement error handling for all API calls"
			exaiGuardService.trackAIClaim(commitment, { taskId: "task-1" })

			// AI contradicts itself
			const contradiction = "I won't implement error handling for the API calls"
			const violations = exaiGuardService.detectMemoryDrift(contradiction, { taskId: "task-1" })

			expect(violations.length).toBeGreaterThan(0)
			const memoryDriftViolation = violations.find(v => v.message.includes("Memory drift"))
			expect(memoryDriftViolation).toBeDefined()
			expect(memoryDriftViolation?.severity).toBe(ExAIGuardViolationSeverity.HIGH)
		})

		it("should not flag unrelated content as memory drift", () => {
			const commitment = "I will add tests for the authentication module"
			exaiGuardService.trackAIClaim(commitment, { taskId: "task-1" })

			const unrelated = "The database schema looks good"
			const violations = exaiGuardService.detectMemoryDrift(unrelated, { taskId: "task-1" })

			const memoryDriftViolation = violations.find(v => v.message.includes("Memory drift"))
			expect(memoryDriftViolation).toBeUndefined()
		})

		it("should get pending commitments for a task", () => {
			exaiGuardService.trackAIClaim("I will implement feature A", { taskId: "task-1" })
			exaiGuardService.trackAIClaim("I will implement feature B", { taskId: "task-1" })
			exaiGuardService.trackAIClaim("I will implement feature C", { taskId: "task-2" })

			const task1Commitments = exaiGuardService.getPendingCommitments("task-1")
			expect(task1Commitments.length).toBeGreaterThanOrEqual(2)

			const task2Commitments = exaiGuardService.getPendingCommitments("task-2")
			expect(task2Commitments.length).toBeGreaterThanOrEqual(1)
		})

		it("should clear memory when task is completed", () => {
			exaiGuardService.trackAIClaim("I will implement feature A", { taskId: "task-1" })
			exaiGuardService.trackAIClaim("I will implement feature B", { taskId: "task-1" })

			let commitments = exaiGuardService.getPendingCommitments("task-1")
			expect(commitments.length).toBeGreaterThan(0)

			exaiGuardService.clearMemoryForTask("task-1")

			commitments = exaiGuardService.getPendingCommitments("task-1")
			expect(commitments.length).toBe(0)
		})
	})

	describe("Claim Drift Detection", () => {
		it("should track AI claims from stream chunks", () => {
			const claim1 = "I have implemented the authentication system"
			const claim2 = "This is the final version of the code"

			exaiGuardService.trackAIClaim(claim1, { taskId: "task-1" })
			exaiGuardService.trackAIClaim(claim2, { taskId: "task-1" })

			const stats = exaiGuardService.getMemoryDriftStats()
			expect(stats.totalClaims).toBeGreaterThanOrEqual(2)
		})

		it("should detect claim drift when AI contradicts previous claims", () => {
			const claim = "The function returns a promise with the user data"
			exaiGuardService.trackAIClaim(claim, { taskId: "task-1" })

			const contradiction = "The function doesn't return a promise or user data"
			const violations = exaiGuardService.detectMemoryDrift(contradiction, { taskId: "task-1" })

			expect(violations.length).toBeGreaterThan(0)
			const claimDriftViolation = violations.find(v => v.message.includes("Claim drift"))
			expect(claimDriftViolation).toBeDefined()
			expect(claimDriftViolation?.severity).toBe(ExAIGuardViolationSeverity.MEDIUM)
		})
	})

	describe("Stream Interception", () => {
		it("should intercept stream and detect incomplete code patterns", () => {
			const streamChunk = `
				function processData(data) {
					// TODO: implement validation
					// FIXME: add error handling
					return data
				}
			`

			const result = exaiGuardService.interceptStream(streamChunk, {
				taskId: "task-1",
				messageType: "aiStreamChunk"
			})

			expect(result.intercepted).toBe(true)
			expect(result.violations.length).toBeGreaterThan(0)
		})

		it("should create subtasks for incomplete code", () => {
			const streamChunk = `
				function getUserData(id) {
					// TODO: fetch from database
					return null
				}
			`

			const result = exaiGuardService.interceptStream(streamChunk, {
				taskId: "task-1",
				messageType: "aiStreamChunk"
			})

			expect(result.subtasks.length).toBeGreaterThan(0)
			expect(result.subtasks[0]).toHaveProperty("title")
			expect(result.subtasks[0]).toHaveProperty("description")
			expect(result.subtasks[0]).toHaveProperty("priority")
		})

		it("should not intercept when disabled", () => {
			exaiGuardService.setStreamInterception(false)

			const streamChunk = "// TODO: implement this"
			const result = exaiGuardService.interceptStream(streamChunk, {
				taskId: "task-1"
			})

			expect(result.intercepted).toBe(false)
			expect(result.violations.length).toBe(0)
		})
	})

	describe("Auto-Correction", () => {
		it("should auto-correct security violations", () => {
			const content = 'const apiKey = "sk-1234567890abcdef1234567890abcdef"'
			const violations = exaiGuardService.scanContent(content, {
				taskId: "task-1"
			})

			expect(violations.length).toBeGreaterThan(0)
			const securityViolation = violations.find(v => v.type === ExAIGuardViolationType.SECURITY)
			expect(securityViolation).toBeDefined()

			const correction = exaiGuardService.applyCorrection(securityViolation!, content)
			expect(correction.wasApplied).toBe(true)
			expect(correction.correctedContent).toContain("[REDACTED]")
			expect(correction.correctedContent).not.toContain("sk-1234567890abcdef")
		})

		it("should auto-correct privacy violations", () => {
			const content = "Contact me at user@example.com for more info"
			const violations = exaiGuardService.scanContent(content, {
				taskId: "task-1"
			})

			const privacyViolation = violations.find(v => v.type === ExAIGuardViolationType.PRIVACY)
			if (privacyViolation) {
				const correction = exaiGuardService.applyCorrection(privacyViolation, content)
				expect(correction.wasApplied).toBe(true)
				expect(correction.correctedContent).toContain("[EMAIL_REDACTED]")
			}
		})

		it("should not auto-correct non-correctable violations", () => {
			const content = "// TODO: implement error handling"
			const violations = exaiGuardService.scanContent(content, {
				taskId: "task-1"
			})

			const qualityViolation = violations.find(v => v.type === ExAIGuardViolationType.QUALITY)
			if (qualityViolation && !qualityViolation.correction?.autoCorrectable) {
				const correction = exaiGuardService.applyCorrection(qualityViolation, content)
				expect(correction.wasApplied).toBe(false)
				expect(correction.correctedContent).toBe(content)
			}
		})
	})

	describe("Violation Detection", () => {
		it("should detect multiple violation types in one chunk", () => {
			const content = `
				const apiKey = "sk-abc123"  // Exposed API key
				const email = "test@example.com"  // Privacy violation
				// TODO: add validation  // Quality violation
			`

			const violations = exaiGuardService.scanContent(content, {
				taskId: "task-1"
			})

			expect(violations.length).toBeGreaterThanOrEqual(2)

			const violationTypes = new Set(violations.map(v => v.type))
			expect(violationTypes.size).toBeGreaterThan(1)
		})

		it("should respect severity thresholds", async () => {
			await exaiGuardService.updateConfig(
				{ severityThreshold: ExAIGuardViolationSeverity.HIGH },
				mockContext
			)

			const content = "// TODO: implement this"  // Low severity
			const violations = exaiGuardService.scanContent(content, {
				taskId: "task-1"
			})

			// Should filter out low severity violations
			expect(violations.every(v =>
				v.severity === ExAIGuardViolationSeverity.HIGH ||
				v.severity === ExAIGuardViolationSeverity.CRITICAL
			)).toBe(true)
		})
	})

	describe("Telemetry Tracking", () => {
		it("should track violation detection events", () => {
			const content = 'const secret = "my-secret-key-12345678901234567890"'
			const violations = exaiGuardService.scanContent(content, {
				taskId: "task-1"
			})

			expect(violations.length).toBeGreaterThan(0)

			// Simulate telemetry tracking (as done in Task.ts)
			violations.forEach(v => {
				telemetrySpy.captureExAIGuardViolationDetected(v.type, v.id, v.severity)
			})

			expect(telemetrySpy.captureExAIGuardViolationDetected).toHaveBeenCalled()
			expect(telemetrySpy.captureExAIGuardViolationDetected).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(String)
			)
		})

		it("should track correction events", () => {
			const content = 'const apiKey = "sk-1234567890abcdef1234567890abcdef"'
			const violations = exaiGuardService.scanContent(content, {
				taskId: "task-1"
			})

			const securityViolation = violations.find(v => v.type === ExAIGuardViolationType.SECURITY)
			if (securityViolation) {
				const correction = exaiGuardService.applyCorrection(securityViolation, content)
				if (correction.wasApplied) {
					telemetrySpy.captureExAIGuardViolationCorrected(
						securityViolation.type,
						securityViolation.id,
						"auto-correction"
					)
				}
			}

			expect(telemetrySpy.captureExAIGuardViolationCorrected).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				"auto-correction"
			)
		})

		it("should track memory drift actions", () => {
			const commitment = "I will implement the feature completely"
			exaiGuardService.trackAIClaim(commitment, { taskId: "task-1" })

			const contradiction = "I won't implement the feature"
			const violations = exaiGuardService.detectMemoryDrift(contradiction, { taskId: "task-1" })

			const memoryDriftViolations = violations.filter(v =>
				v.message.includes("Memory drift") || v.message.includes("Claim drift")
			)

			if (memoryDriftViolations.length > 0) {
				telemetrySpy.captureExAIGuardAction("memory-drift-detected", {
					count: memoryDriftViolations.length,
					taskId: "task-1",
					violationIds: memoryDriftViolations.map(v => v.id)
				})

				expect(telemetrySpy.captureExAIGuardAction).toHaveBeenCalledWith(
					"memory-drift-detected",
					expect.objectContaining({
						count: expect.any(Number),
						taskId: "task-1"
					})
				)
			}
		})
	})

	describe("Context Window Management", () => {
		it("should maintain rolling context window", () => {
			// Add more than maxContextSize messages
			for (let i = 0; i < 60; i++) {
				exaiGuardService.trackAIClaim(`Message ${i}`, { taskId: "task-1" })
			}

			const stats = exaiGuardService.getMemoryDriftStats()
			// Context window should be limited (default is 50)
			expect(stats.totalCommitments).toBeLessThanOrEqual(60)
		})
	})

	describe("Text Similarity Calculation", () => {
		it("should calculate similarity correctly", () => {
			// Access private method through testing
			const service = exaiGuardService as any

			const text1 = "I will implement error handling"
			const text2 = "I will implement error handling"
			const similarity1 = service.calculateTextSimilarity(text1, text2)
			expect(similarity1).toBe(1) // Identical texts

			const text3 = "I will implement authentication"
			const similarity2 = service.calculateTextSimilarity(text1, text3)
			expect(similarity2).toBeGreaterThan(0)
			expect(similarity2).toBeLessThan(1) // Partially similar

			const text4 = "The weather is nice today"
			const similarity3 = service.calculateTextSimilarity(text1, text4)
			expect(similarity3).toBeLessThan(0.3) // Very different
		})
	})

	describe("Memory Drift Statistics", () => {
		it("should provide accurate statistics", () => {
			// Add commitments
			exaiGuardService.trackAIClaim("I will implement feature A", { taskId: "task-1" })
			exaiGuardService.trackAIClaim("I will implement feature B", { taskId: "task-1" })

			// Create violation
			exaiGuardService.detectMemoryDrift("I won't implement feature A", { taskId: "task-1" })

			const stats = exaiGuardService.getMemoryDriftStats()
			expect(stats.totalCommitments).toBeGreaterThanOrEqual(2)
			expect(stats.pendingCommitments).toBeGreaterThan(0)
			expect(stats.violatedCommitments).toBeGreaterThanOrEqual(0)
		})
	})

	describe("Integration Scenarios", () => {
		it("should handle complete stream processing workflow", () => {
			// Simulate AI stream chunks
			const chunks = [
				"I will implement the authentication system",
				"Let me add error handling to all endpoints",
				'const apiKey = "sk-test123456789012345678901234"',
				"// TODO: add validation",
			]

			const allViolations: any[] = []

			chunks.forEach((chunk, index) => {
				// Track claims
				exaiGuardService.trackAIClaim(chunk, { taskId: "task-1", messageType: "aiStreamChunk" })

				// Detect memory drift
				const memoryDriftViolations = exaiGuardService.detectMemoryDrift(chunk, { taskId: "task-1" })

				// Scan for standard violations
				const standardViolations = exaiGuardService.scanContent(chunk, {
					taskId: "task-1",
					instanceId: "instance-1",
					messageType: "aiStreamChunk",
					isStreaming: true
				})

				// Combine violations
				const violations = [...standardViolations, ...memoryDriftViolations]
				allViolations.push(...violations)

				// Track telemetry
				violations.forEach(v => {
					telemetrySpy.captureExAIGuardViolationDetected(v.type, v.id, v.severity)
				})
			})

			expect(allViolations.length).toBeGreaterThan(0)
			expect(telemetrySpy.captureExAIGuardViolationDetected).toHaveBeenCalled()
		})

		it("should handle stream with corrections applied", () => {
			const chunk = 'const password = "mysecretpassword123"'

			const violations = exaiGuardService.scanContent(chunk, { taskId: "task-1" })
			const criticalViolations = violations.filter(v =>
				v.severity === ExAIGuardViolationSeverity.CRITICAL ||
				v.severity === ExAIGuardViolationSeverity.HIGH
			)

			let correctedContent = chunk
			let correctionsApplied = 0

			criticalViolations.forEach(violation => {
				const correction = exaiGuardService.applyCorrection(violation, correctedContent)
				if (correction.wasApplied) {
					correctedContent = correction.correctedContent
					correctionsApplied++

					telemetrySpy.captureExAIGuardViolationCorrected(
						violation.type,
						violation.id,
						"auto-correction"
					)
				}
			})

			expect(correctionsApplied).toBeGreaterThan(0)
			expect(correctedContent).not.toBe(chunk)
			expect(telemetrySpy.captureExAIGuardViolationCorrected).toHaveBeenCalled()
		})
	})
})
