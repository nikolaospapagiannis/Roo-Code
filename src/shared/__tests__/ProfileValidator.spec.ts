// npx vitest run src/shared/__tests__/ProfileValidator.spec.ts

import { type ProviderSettings } from "@founder-x-ai/types"
import { type OrganizationAllowList } from "@founder-x-ai/cloud"

import { ProfileValidator } from "../ProfileValidator"

describe("ProfileValidator", () => {
	describe("isProfileAllowed", () => {
		it("should always allow profiles when OrganizationAllowList exists", () => {
			const allowList: OrganizationAllowList = {
				allowed: true
			}
			const profile: ProviderSettings = {
				apiProvider: "openai",
				openAiModelId: "gpt-4",
			}

			expect(ProfileValidator.isProfileAllowed(profile, allowList)).toBe(true)
		})

		it("should always allow profiles even with empty allowList", () => {
			const allowList: OrganizationAllowList = {
				allowed: false
			}
			const profile: ProviderSettings = {
				apiProvider: "anthropic",
				apiModelId: "claude-3-opus",
			}

			expect(ProfileValidator.isProfileAllowed(profile, allowList)).toBe(true)
		})

		it("should always allow human-relay provider", () => {
			const allowList: OrganizationAllowList = {
				allowed: false
			}
			const profile: ProviderSettings = {
				apiProvider: "human-relay",
			}

			expect(ProfileValidator.isProfileAllowed(profile, allowList)).toBe(true)
		})

		it("should always allow profiles without apiProvider", () => {
			const allowList: OrganizationAllowList = {
				allowed: true
			}
			const profile: Partial<ProviderSettings> = {}

			expect(ProfileValidator.isProfileAllowed(profile as ProviderSettings, allowList)).toBe(true)
		})

		it("should handle various provider types", () => {
			const allowList: OrganizationAllowList = {
				allowed: true
			}

			const providers = [
				{ apiProvider: "openai", openAiModelId: "gpt-4" },
				{ apiProvider: "anthropic", apiModelId: "claude-3-opus" },
				{ apiProvider: "ollama", ollamaModelId: "llama3" },
				{ apiProvider: "litellm", litellmModelId: "test-model" },
				{ apiProvider: "io-intelligence", ioIntelligenceModelId: "test-model" },
				{ apiProvider: "vscode-lm", vsCodeLmModelSelector: { id: "copilot-gpt-3.5" } },
				{ apiProvider: "unbound", unboundModelId: "unbound-model" },
				{ apiProvider: "lmstudio", lmStudioModelId: "lmstudio-model" },
				{ apiProvider: "openrouter", openRouterModelId: "openrouter-model" },
				{ apiProvider: "glama", glamaModelId: "glama-model" },
				{ apiProvider: "requesty", requestyModelId: "requesty-model" },
				{ apiProvider: "fake-ai" },
			]

			providers.forEach(profile => {
				expect(ProfileValidator.isProfileAllowed(profile as ProviderSettings, allowList)).toBe(true)
			})
		})

		it("should handle apiModelId providers", () => {
			const allowList: OrganizationAllowList = {
				allowed: true
			}

			const apiModelProviders = [
				"anthropic",
				"openai-native",
				"bedrock",
				"vertex",
				"gemini",
				"mistral",
				"deepseek",
				"xai",
				"groq",
				"chutes",
				"sambanova",
				"fireworks",
				"featherless",
			]

			apiModelProviders.forEach(provider => {
				const profile: ProviderSettings = {
					apiProvider: provider as any,
					apiModelId: "test-model",
				}
				expect(ProfileValidator.isProfileAllowed(profile, allowList)).toBe(true)
			})
		})
	})
})
