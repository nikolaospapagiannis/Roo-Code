// Define types locally to avoid circular dependency with cloud package
export interface CloudUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  organizationName?: string;
  organizationImageUrl?: string;
  extensionBridgeEnabled?: boolean;
}

export interface OrganizationAllowList {
  allowed: boolean;
  allowAll?: boolean;
  organizationId?: string;
  providers?: string[];
  models?: Record<string, string[]>;
}

export type ShareVisibility = "public" | "organization" | "private"

export const ORGANIZATION_ALLOW_ALL: OrganizationAllowList = {
	allowed: true,
	allowAll: true
} as const
