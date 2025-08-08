import composio, { getConnectedToolkits } from '@/lib/services/composio';
import { auth as appAuth } from '@/lib/auth';
import { sanitizeToolResult } from './result-sanitizer';
import {
  getEnabledToolsForUser,
  getEnabledToolsForAgent,
  getAgentEnabledToolkits,
  getUserEnabledToolkits,
  getAvailableTools,
} from '@/lib/db/queries';
import { parseComposioResponse } from './composio-response-parser';

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
 * Fetches Composio tools for a user based on their toolkit preferences or agent configuration
 * Now supports toolkit-level selection - enables all tools within selected toolkits
 */
export async function getComposioTools(
  userId: string,
  options?: {
    agentId?: string;
    requestedToolkits?: string[];
  },
) {
  try {
    // Resolve the effective Clerk user ID using the app's Clerk wrapper
    const session = await appAuth();
    const clerkUserIdFromAuth = session?.user?.id;
    const effectiveUserId = clerkUserIdFromAuth || userId;

    if (!effectiveUserId) {
      console.error(
        '❌ [Composio] No Clerk user ID available for tool loading',
      );
      return {};
    }

    if (clerkUserIdFromAuth && clerkUserIdFromAuth !== userId) {
      console.log(
        `🔑 [DEBUG] Overriding provided userId with Clerk userId from auth(): ${clerkUserIdFromAuth}`,
      );
    }

    // Get connected toolkits first
    const connectedToolkits = await getConnectedToolkits(effectiveUserId);
    if (connectedToolkits.length === 0) {
      return {};
    }

    // Get enabled tool slugs based on context (agent vs user)
    let enabledToolSlugs: string[] = [];

    if (options?.agentId) {
      // Get agent-specific enabled tool slugs
      enabledToolSlugs = await getEnabledToolsForAgent(options.agentId);
    } else {
      // Get user-level enabled tool slugs
      enabledToolSlugs = await getEnabledToolsForUser(userId);
    }

    if (enabledToolSlugs.length === 0) {
      console.log(
        `No tools enabled for ${options?.agentId ? `agent ${options.agentId}` : `user ${userId}`}`,
      );
      return {};
    }

    console.log(
      `🔍 [DEBUG] Enabled tool slugs from DB: ${enabledToolSlugs.join(', ')}`,
    );

    console.log(
      `📦 [Composio] Loading specific tools: ${enabledToolSlugs.join(', ')}`,
    );

    // Use specific tool slugs instead of toolkit-based filtering
    const toolsGetParams = {
      tools: enabledToolSlugs, // Request specific tools that are enabled
    };
    console.log(`🔍 [DEBUG] composio.tools.get() parameters:`, toolsGetParams);

    const rawTools = await composio.tools.get(effectiveUserId, toolsGetParams, {
      afterExecute: ({
        toolSlug,
        toolkitSlug,
        result,
      }: { toolSlug: string; toolkitSlug: string; result: any }) =>
        parseComposioResponse(toolSlug, toolkitSlug, result),
    });

    console.log(`🔍 [DEBUG] Raw tools returned from composio.tools.get():`, {
      toolCount: Object.keys(rawTools).length,
      toolNames: Object.keys(rawTools),
    });

    // Build connection map for adding connection IDs to tools
    const toolkitConnectionMap: Record<string, string> = {};
    const toolkitUserIdMap: Record<string, string> = {};
    connectedToolkits.forEach((tk: any) => {
      toolkitConnectionMap[tk.toolkit] = tk.connectionId;
      if (tk.userId) {
        toolkitUserIdMap[tk.toolkit] = tk.userId;
      }
    });
    console.log(`🔍 [DEBUG] Toolkit connection map:`, toolkitConnectionMap);
    console.log(`🔍 [DEBUG] Toolkit userId map:`, toolkitUserIdMap);

    // Validate and fix each tool schema (Composio has already filtered to connected tools)
    const validatedTools: Record<string, any> = {};

    console.log(
      `🔍 [DEBUG] Starting tool validation for ${Object.keys(rawTools).length} tools`,
    );

    for (const [toolName, tool] of Object.entries(rawTools)) {
      const validatedTool = validateAndFixToolSchema(tool);
      if (validatedTool) {
        const toolkitName = toolName.split('_')[0];
        const connectionId = toolkitConnectionMap[toolkitName];
        const clerkUserId = toolkitUserIdMap[toolkitName];

        console.log(
          `🔍 [DEBUG] Processing tool ${toolName}: toolkitName=${toolkitName}, connectionId=${connectionId}, clerkUserId=${clerkUserId}`,
        );

        // Use Clerk user ID if available (as it appears in dashboard), otherwise fall back to connection ID
        const accountId = clerkUserId || connectionId;

        if (accountId) {
          // Attach the account ID for execution
          validatedTool.connectedAccountId = accountId;
          validatedTools[toolName] = validatedTool;
          console.log(
            `✅ [DEBUG] Tool ${toolName} included with accountId=${accountId} (${clerkUserId ? 'using clerkUserId' : 'using connectionId'})`,
          );
        } else {
          // Tool was returned by Composio but we don't have connection mapping
          // This might happen with API key connections that have different naming
          console.warn(
            `⚠️ [DEBUG] Tool ${toolName} returned by Composio but no connection ID found`,
          );
          console.log(
            `🔍 [DEBUG] Available connection map keys:`,
            Object.keys(toolkitConnectionMap),
          );
          console.log(
            `🔍 [DEBUG] Trying to find connection for toolkit: ${toolkitName}`,
          );

          // Try to find connection by partial match or case-insensitive match
          const connectionKey = Object.keys(toolkitConnectionMap).find(
            (key) => key.toLowerCase() === toolkitName.toLowerCase(),
          );

          if (connectionKey) {
            const fallbackConnectionId = toolkitConnectionMap[connectionKey];
            const fallbackClerkUserId = toolkitUserIdMap[connectionKey];
            const fallbackAccountId =
              fallbackClerkUserId || fallbackConnectionId;

            console.log(
              `✅ [DEBUG] Found connection via fallback: ${connectionKey} -> ${fallbackAccountId} (${fallbackClerkUserId ? 'using clerkUserId' : 'using connectionId'})`,
            );
            validatedTool.connectedAccountId = fallbackAccountId;
            validatedTools[toolName] = validatedTool;
          } else {
            // Include tool anyway since Composio returned it (it must be connected)
            console.log(
              `⚠️ [DEBUG] Including tool ${toolName} without explicit connection ID (Composio filtered it as available)`,
            );
            validatedTools[toolName] = validatedTool;
          }
        }
      } else {
        console.warn(`❌ Tool ${toolName} failed schema validation`);
      }
    }

    console.log(
      `📦 [Composio] Successfully loaded ${Object.keys(validatedTools).length} tools`,
    );
    return validatedTools;
  } catch (error) {
    console.error('❌ [Composio] Failed to fetch tools:', error);
    return {};
  }
}
