// Composio client utilities and API wrapper

import type { 
  ComposioTool, 
  Toolkit, 
  AuthConfig, 
  ToolSearchParams, 
  ToolkitListParams,
  EnabledToolsConfig 
} from './types';

export class ComposioClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/composio';
  }

  // Get all available toolkits
  async getToolkits(params: ToolkitListParams = {}): Promise<Toolkit[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params.category) searchParams.set('category', params.category);
      if (params.isLocal !== undefined) searchParams.set('isLocal', params.isLocal.toString());
      if (params.limit) searchParams.set('limit', params.limit.toString());

      const response = await fetch(`${this.baseUrl}/toolkits?${searchParams}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data || [];
    } catch (error) {
      console.error('Failed to fetch toolkits:', error);
      return [];
    }
  }

  // Get toolkit by slug
  async getToolkit(slug: string): Promise<Toolkit | null> {
    try {
      const response = await fetch(`${this.baseUrl}/toolkits/${slug}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data;
    } catch (error) {
      console.error(`Failed to fetch toolkit ${slug}:`, error);
      return null;
    }
  }

  // Search and filter tools
  async getTools(userId: string, params: ToolSearchParams = {}): Promise<ComposioTool[]> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('userId', userId);
      if (params.search) searchParams.set('search', params.search);
      if (params.toolkits) searchParams.set('toolkits', params.toolkits.join(','));
      if (params.scopes) searchParams.set('scopes', params.scopes.join(','));
      if (params.limit) searchParams.set('limit', params.limit.toString());

      const response = await fetch(`${this.baseUrl}/tools?${searchParams}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data || [];
    } catch (error) {
      console.error('Failed to fetch tools:', error);
      return [];
    }
  }

  // Get tools from specific toolkit
  async getToolkitTools(userId: string, toolkitSlug: string): Promise<ComposioTool[]> {
    return this.getTools(userId, { toolkits: [toolkitSlug], limit: 100 });
  }

  // Search tools by keyword
  async searchTools(userId: string, query: string, toolkits?: string[]): Promise<ComposioTool[]> {
    return this.getTools(userId, { 
      search: query, 
      toolkits, 
      limit: 50 
    });
  }

  // Get specific tool by slug
  async getTool(userId: string, toolSlug: string): Promise<ComposioTool | null> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('userId', userId);
      searchParams.set('toolSlug', toolSlug);

      const response = await fetch(`${this.baseUrl}/tools/single?${searchParams}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data;
    } catch (error) {
      console.error(`Failed to fetch tool ${toolSlug}:`, error);
      return null;
    }
  }

  // Get auth configs for a toolkit
  async getAuthConfigs(toolkitSlug?: string): Promise<AuthConfig[]> {
    try {
      const searchParams = new URLSearchParams();
      if (toolkitSlug) searchParams.set('toolkit', toolkitSlug);

      const response = await fetch(`${this.baseUrl}/auth-configs?${searchParams}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.data || [];
    } catch (error) {
      console.error('Failed to fetch auth configs:', error);
      return [];
    }
  }

  // Get auth config fields required for toolkit
  async getAuthConfigFields(toolkitSlug: string, authScheme: string = 'OAUTH2') {
    try {
      // TODO: Implement API route for auth config fields
      console.warn('getAuthConfigFields not yet implemented with API routes');
      return [];
    } catch (error) {
      console.error(`Failed to get auth fields for ${toolkitSlug}:`, error);
      return [];
    }
  }

  // Execute a tool
  async executeTool(userId: string, toolSlug: string, params: Record<string, any>) {
    try {
      // TODO: Implement API route for tool execution
      console.warn('executeTool not yet implemented with API routes');
      throw new Error('Tool execution not yet implemented');
    } catch (error) {
      console.error(`Failed to execute tool ${toolSlug}:`, error);
      throw error;
    }
  }

  // Get toolkit categories
  async getToolkitCategories() {
    try {
      // TODO: Implement API route for toolkit categories
      console.warn('getToolkitCategories not yet implemented with API routes');
      return [];
    } catch (error) {
      console.error('Failed to fetch toolkit categories:', error);
      return [];
    }
  }
}

// Singleton instance
export const composioClient = new ComposioClient();