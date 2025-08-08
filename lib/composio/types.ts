// Composio types and interfaces for tool management

export interface ComposioTool {
  name: string;
  enum: string;
  displayName: string;
  description: string;
  appKey: string;
  parameters: Record<string, any>;
  requiredScopes?: string[];
  no_auth: boolean;
  tags?: string[];
  // Additional properties needed by utils
  slug: string;
  toolkitSlug: string;
  requiresAuth: boolean;
}

export interface Toolkit {
  key: string;
  name: string;
  displayName: string;
  description: string;
  categories: string[];
  logo?: string;
  auth_schemes: string[];
  auth_type?: 'oauth' | 'api_key';
  meta: {
    actionsCount: number;
    triggersCount: number;
  };
}

export interface AuthConfig {
  id: string;
  toolkit: string;
  authScheme: string;
  isActive: boolean;
  createdAt: string;
}

export interface ToolkitCategory {
  slug: string;
  name: string;
  description: string;
}

export interface ToolSearchParams {
  search?: string;
  toolkits?: string[];
  scopes?: string[];
  limit?: number;
}

export interface ToolkitListParams {
  category?: string;
  isLocal?: boolean;
  limit?: number;
}

export interface EnabledToolsConfig {
  userId: string;
  enabledTools: string[];
  toolkitConfigs: Record<string, {
    authConfigId: string;
    enabledTools: string[];
  }>;
}

export interface ToolExecutionResult {
  data: any;
  error: string | null;
  successful: boolean;
}