import composio, { getConnectedToolkits } from '@/lib/services/composio';
import { sanitizeToolResult } from './result-sanitizer';
import { getEnabledToolsForUser, getEnabledToolsForAgent } from '@/lib/db/queries';

/**
 * Validates and fixes tool schema to ensure AI SDK v5 compatibility
 * AI SDK v5 requires tools to have inputSchema (not parameters) with proper structure
 */
function validateAndFixToolSchema(tool: any): any {
  // Ensure the tool has the required structure
  if (!tool || typeof tool !== 'object') {
    return null;
  }

  // Convert parameters to inputSchema for AI SDK v5 compatibility
  let processedTool = tool;
  if (tool.parameters && !tool.inputSchema) {
    const { parameters, ...toolWithoutParameters } = tool;
    processedTool = { ...toolWithoutParameters, inputSchema: parameters };
  }

  // Fix missing inputSchema type field
  if (processedTool.inputSchema && !processedTool.inputSchema.type) {
    processedTool = {
      ...processedTool,
      inputSchema: { ...processedTool.inputSchema, type: 'object' },
    };
  }

  // Ensure properties exist
  if (processedTool.inputSchema && !processedTool.inputSchema.properties) {
    processedTool = {
      ...processedTool,
      inputSchema: { ...processedTool.inputSchema, properties: {} },
    };
  }

  // Validate the final structure for AI SDK v5
  const isValid =
    processedTool.description &&
    processedTool.inputSchema &&
    processedTool.inputSchema.type === 'object' &&
    processedTool.inputSchema.properties &&
    typeof processedTool.inputSchema.properties === 'object';

  if (!isValid) {
    return null;
  }

  return processedTool;
}

/**
 * Fetches Composio tools for a user based on their tool preferences or agent configuration
 * Now supports selective tool loading by slug
 */
export async function getComposioTools(
  userId: string,
  options?: {
    agentId?: string;
    requestedToolkits?: string[];
  }
) {
  try {
    // Get connected toolkits first
    const connectedToolkits = await getConnectedToolkits(userId);
    if (connectedToolkits.length === 0) {
      return {};
    }

    // Get enabled tools based on context (agent vs user)
    let enabledToolSlugs: string[] = [];
    
    if (options?.agentId) {
      // Get agent-specific tools
      enabledToolSlugs = await getEnabledToolsForAgent(options.agentId);
    } else {
      // Get user-level tools for general usage
      enabledToolSlugs = await getEnabledToolsForUser(userId);
    }

    if (enabledToolSlugs.length === 0) {
      console.log(`No tools enabled for ${options?.agentId ? `agent ${options.agentId}` : `user ${userId}`}`);
      return {};
    }

    // Use Composio's native tool filtering by slug
    const firstConnectionId = connectedToolkits[0]?.connectionId;
    const rawTools = await composio.tools.get(userId, {
      tools: enabledToolSlugs, // Filter by specific tool slugs
      ...(firstConnectionId && { connectedAccountId: firstConnectionId }),
    });

    // Filter out tools from disconnected toolkits
    const toolkitConnectionMap: Record<string, string> = {};
    connectedToolkits.forEach((tk: any) => {
      toolkitConnectionMap[tk.toolkit] = tk.connectionId;
    });

    // Validate and fix each tool schema
    const validatedTools: Record<string, any> = {};
    
    for (const [toolName, tool] of Object.entries(rawTools)) {
      const validatedTool = validateAndFixToolSchema(tool);
      if (validatedTool) {
        const toolkitName = toolName.split('_')[0];
        const connectionId = toolkitConnectionMap[toolkitName];
        
        if (connectionId) {
          validatedTool.connectedAccountId = connectionId;
          validatedTools[toolName] = validatedTool;
        } else {
          console.warn(`Tool ${toolName} skipped - toolkit ${toolkitName} not connected`);
        }
      }
    }

    console.log(`📦 [Composio] Successfully loaded ${Object.keys(validatedTools).length} tools`);
    return validatedTools;

  } catch (error) {
    console.error('❌ [Composio] Failed to fetch tools:', error);
    return {};
  }
}
