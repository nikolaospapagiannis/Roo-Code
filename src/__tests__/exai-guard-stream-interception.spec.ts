import { describe, test, expect, vi, beforeEach } from "vitest"
import { Task } from "../core/task/Task"
import { ExAIGuardService, ExAIGuardViolationType, ExAIGuardViolationSeverity } from "../services/exai-guard/ExAIGuardService"
import { ClineProvider } from "../core/webview/ClineProvider"

// Mock the ClineProvider
vi.mock("../core/webview/ClineProvider", () => ({
	ClineProvider: vi.fn().mockImplementation(() => ({
		postMessageToWebview: vi.fn(),
		postStateToWebview: vi.fn(),
		getState: vi.fn().mockReturnValue({
			exaiGuardEnabled: true,
			exaiGuardRealtimeViolation: true,
			exaiGuardRealtimeCorrection: true
		})
	}))
}))

// Mock the ExAIGuardService
vi.mock("../services/exai-guard/ExAIGuardService", () => ({
	ExAIGuardService: {
		getInstance: vi.fn().mockReturnValue({
			isEnabled: vi.fn().mockReturnValue(true),
			interceptStream: vi.fn().mockReturnValue({
				intercepted: true,
				violations: [
					{
						id: "violation-1",
						type: "incompleteCode",
						patternType: "todoComment",
						description: "Found TODO comment that needs completion",
						severity: "medium",
						location: { line: 1, column: 1 },
						suggestedFix: "Complete the TODO comment"
					}
				],
				subtasks: [
					{
						id: "test-subtask-1",
						title: "Complete TODO comment",
						description: "Found TODO comment that needs completion",
						patternType: "todoComment"
					}
				],
				correctedContent: "This is the corrected content without TODO comments"
			})
		})
	}
}))

describe("ExAI Guard Stream Interception", () => {
	let task: Task
	let mockProvider: ClineProvider

	beforeEach(() => {
		mockProvider = new ClineProvider({} as any, {} as any, {} as any, {} as any)
		task = new Task({
			task: "test-task-1",
			provider: mockProvider,
			apiConfiguration: {} as any,
			startTask: false
		})
	})

	test("should intercept AI responses with incomplete code patterns", async () => {
		const exaiGuardService = ExAIGuardService.getInstance()
		const interceptStreamSpy = vi.spyOn(exaiGuardService, "interceptStream")
		const postMessageSpy = vi.spyOn(mockProvider, "postMessageToWebview")
		const postStateSpy = vi.spyOn(mockProvider, "postStateToWebview")

		// Simulate an AI response with incomplete code
		const aiResponse = "Here's some code with TODO: implement this function"
		await task.say("text", aiResponse)

		// Verify that ExAI Guard intercepted the stream
		expect(interceptStreamSpy).toHaveBeenCalledWith(aiResponse, {
			taskId: "test-task-1",
			instanceId: "test-instance-1",
			messageType: "aiResponse"
		})

		// Verify that violations were reported
		expect(postMessageSpy).toHaveBeenCalledWith({
			type: "exaiGuardViolations",
			violations: [
				{
					type: "incompleteCode",
					patternType: "todoComment",
					description: "Found TODO comment that needs completion",
					subtaskId: "test-subtask-1",
					context: "aiResponse"
				}
			]
		})

		// Verify that todo list was updated
		expect(postStateSpy).toHaveBeenCalled()
	})

	test("should add subtasks to todo list when incomplete code is detected", async () => {
		const exaiGuardService = ExAIGuardService.getInstance()
		const postStateSpy = vi.spyOn(mockProvider, "postStateToWebview")

		// Simulate an AI response with incomplete code
		const aiResponse = "Here's some code with TODO: implement this function"
		await task.say("text", aiResponse)

		// Verify that todo list was updated
		expect(postStateSpy).toHaveBeenCalled()

		// Verify that the todo list contains the subtask
		expect(task.todoList).toBeDefined()
		expect(task.todoList?.length).toBeGreaterThan(0)
		expect(task.todoList?.[0].content).toContain("Complete incomplete code patterns")
		expect(task.todoList?.[0].status).toBe("pending")
	})

	test("should use corrected content when available", async () => {
		const exaiGuardService = ExAIGuardService.getInstance()
		const interceptStreamSpy = vi.spyOn(exaiGuardService, "interceptStream")

		// Simulate an AI response with incomplete code
		const aiResponse = "Here's some code with TODO: implement this function"
		await task.say("text", aiResponse)

		// Verify that the corrected content was used
		expect(interceptStreamSpy).toHaveReturnedWith({
			intercepted: true,
			subtasks: [
				{
					id: "test-subtask-1",
					title: "Complete TODO comment",
					description: "Found TODO comment that needs completion",
					patternType: "todoComment"
				}
			],
			correctedContent: "This is the corrected content without TODO comments"
		})
	})

	test("should not intercept when ExAI Guard is disabled", async () => {
		const exaiGuardService = ExAIGuardService.getInstance()
		vi.spyOn(exaiGuardService, "isEnabled").mockReturnValue(false)
		const interceptStreamSpy = vi.spyOn(exaiGuardService, "interceptStream")

		// Simulate an AI response
		const aiResponse = "Here's some code with TODO: implement this function"
		await task.say("text", aiResponse)

		// Verify that ExAI Guard did not intercept the stream
		expect(interceptStreamSpy).not.toHaveBeenCalled()
	})

	test("should not intercept partial messages", async () => {
		const exaiGuardService = ExAIGuardService.getInstance()
		const interceptStreamSpy = vi.spyOn(exaiGuardService, "interceptStream")

		// Simulate a partial AI response
		const partialResponse = "Here's some code with TODO:"
		await task.say("text", partialResponse, undefined, true)

		// Verify that ExAI Guard did not intercept the partial stream
		expect(interceptStreamSpy).not.toHaveBeenCalled()
	})

	test("should handle multiple incomplete code patterns", async () => {
		const exaiGuardService = ExAIGuardService.getInstance()
		vi.spyOn(exaiGuardService, "interceptStream").mockReturnValue({
			intercepted: true,
			violations: [
				{
					id: "violation-1",
					type: ExAIGuardViolationType.QUALITY,
					severity: ExAIGuardViolationSeverity.MEDIUM,
					message: "Incomplete code pattern detected: TODO comment",
					description: "Found TODO comment that needs completion",
					timestamp: Date.now(),
					context: {
						taskId: "test-task-1",
						messageId: "test-message-1"
					},
					correction: {
						suggestedAction: "Complete the TODO comment",
						autoCorrectable: true
					}
				},
				{
					id: "violation-2",
					type: ExAIGuardViolationType.QUALITY,
					severity: ExAIGuardViolationSeverity.MEDIUM,
					message: "Incomplete code pattern detected: function stub",
					description: "Found function stub that needs implementation",
					timestamp: Date.now(),
					context: {
						taskId: "test-task-1",
						messageId: "test-message-1"
					},
					correction: {
						suggestedAction: "Implement the function stub",
						autoCorrectable: true
					}
				}
			],
			subtasks: [
				{
					id: "subtask-1",
					title: "Complete TODO comment",
					description: "Found TODO comment that needs completion",
					patternType: "todoComment"
				},
				{
					id: "subtask-2",
					title: "Complete stub function",
					description: "Found function stub that needs implementation",
					patternType: "functionStub"
				}
			],
			correctedContent: "This is the corrected content without incomplete code"
		})

		const postMessageSpy = vi.spyOn(mockProvider, "postMessageToWebview")
		const postStateSpy = vi.spyOn(mockProvider, "postStateToWebview")

		// Simulate an AI response with multiple incomplete code patterns
		const aiResponse = "TODO: implement this\nfunction stub() {}\n// For now, just return null"
		await task.say("text", aiResponse)

		// Verify that multiple violations were reported
		expect(postMessageSpy).toHaveBeenCalledWith({
			type: "exaiGuardViolations",
			violations: [
				{
					type: "incompleteCode",
					patternType: "todoComment",
					description: "Found TODO comment that needs completion",
					subtaskId: "subtask-1",
					context: "aiResponse"
				},
				{
					type: "incompleteCode",
					patternType: "functionStub",
					description: "Found function stub that needs implementation",
					subtaskId: "subtask-2",
					context: "aiResponse"
				}
			]
		})

		// Verify that multiple todo items were added
		expect(postStateSpy).toHaveBeenCalled()
		expect(task.todoList?.length).toBe(2)
	})
})