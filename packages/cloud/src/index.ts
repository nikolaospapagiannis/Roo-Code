// Stub cloud package for Founder-X-AI rebranding
// This is a placeholder since the original @roo-code/cloud package is not available

export interface CloudUserInfo {
  id: string;
  email: string;
  name: string;
}

export interface OrganizationAllowList {
  allowed: string[];
  allowAll: boolean;
  providers?: Record<string, string[]>;
}

export interface ShareVisibility {
  public: boolean;
  organization: boolean;
}

export interface OrganizationSettings {
  id: string;
  name: string;
  allowList: OrganizationAllowList;
}

export const ORGANIZATION_ALLOW_ALL: OrganizationAllowList = { allowed: [], allowAll: true, providers: {} };

export class CloudService {
  private static _instance: CloudService | null = null;
  
  static get instance(): CloudService {
    if (!this._instance) {
      this._instance = new CloudService();
    }
    return this._instance;
  }
  
  async getUserInfo(): Promise<CloudUserInfo | null> {
    return null;
  }
  
  async getOrganizationSettings(): Promise<OrganizationSettings | null> {
    return null;
  }
  
  async isAuthenticated(): Promise<boolean> {
    return false;
  }
}

export class ExtensionBridgeService {
  private static _instance: ExtensionBridgeService | null = null;
  
  static get instance(): ExtensionBridgeService {
    if (!this._instance) {
      this._instance = new ExtensionBridgeService();
    }
    return this._instance;
  }
  
  async isEnabled(): Promise<boolean> {
    return false;
  }
  
  async enable(): Promise<void> {
    // No-op
  }
  
  async disable(): Promise<void> {
    // No-op
  }
}

export function getRooCodeApiUrl(): string {
  return "https://api.founder-x-ai.com";
}

export function getClerkBaseUrl(): string {
  return "https://clerk.founder-x-ai.com";
}

export const PRODUCTION_CLERK_BASE_URL = "https://clerk.founder-x-ai.com";