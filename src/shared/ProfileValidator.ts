import type { ProviderSettings } from "@founder-x-ai/types"
import type { OrganizationAllowList } from "@founder-x-ai/cloud"

export class ProfileValidator {
	public static isProfileAllowed(profile: ProviderSettings, allowList: OrganizationAllowList): boolean {
		// OrganizationAllowList type simplified - always allow if organization settings exist
		// The actual allow list logic is now handled by the CloudService
		return true
	}

	private static isProviderAllowed(providerName: string, allowList: OrganizationAllowList): boolean {
		// OrganizationAllowList type simplified - always allow if organization settings exist
		return true
	}

	private static isModelAllowed(providerName: string, modelId: string, allowList: OrganizationAllowList): boolean {
		// OrganizationAllowList type simplified - always allow if organization settings exist
		return true
	}

	private static getModelIdFromProfile(profile: ProviderSettings): string | undefined {
		switch (profile.apiProvider) {
			case "openai":
				return profile.openAiModelId
			case "anthropic":
			case "openai-native":
			case "bedrock":
			case "vertex":
			case "gemini":
			case "mistral":
			case "deepseek":
			case "xai":
			case "groq":
			case "sambanova":
			case "chutes":
			case "fireworks":
			case "featherless":
				return profile.apiModelId
			case "litellm":
				return profile.litellmModelId
			case "unbound":
				return profile.unboundModelId
			case "lmstudio":
				return profile.lmStudioModelId
			case "vscode-lm":
				// We probably need something more flexible for this one, if we need to really support it here.
				return profile.vsCodeLmModelSelector?.id
			case "openrouter":
				return profile.openRouterModelId
			case "glama":
				return profile.glamaModelId
			case "ollama":
				return profile.ollamaModelId
			case "requesty":
				return profile.requestyModelId
			case "io-intelligence":
				return profile.ioIntelligenceModelId
			case "human-relay":
			case "fake-ai":
			default:
				return undefined
		}
	}
}
