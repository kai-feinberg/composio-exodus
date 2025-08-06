import composio, { getConnectedToolkits } from '@/lib/services/composio';
import { sanitizeToolResult } from './result-sanitizer';

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
 * Fetches Composio tools for a user based on their active connections
 * Validates and fixes tool schemas to ensure AI SDK v5 compatibility
 */
export async function getComposioTools(
  userId: string,
  requestedToolkits?: string[],
) {
  try {
    // Get connected toolkits first to avoid unnecessary calls
    const connectedToolkits = await getConnectedToolkits(userId);

    if (connectedToolkits.length === 0) {
      return {};
    }

    // Create mapping of toolkit to connectionId for proper account selection
    const toolkitConnectionMap: Record<string, string> = {};
    connectedToolkits.forEach((tk: any) => {
      toolkitConnectionMap[tk.toolkit] = tk.connectionId;
    });

    const toolkitNames = connectedToolkits.map((tk: any) => tk.toolkit);

    // Get tools from Composio with connection mapping
    // Pass the first connected account for the user context

    // TO DO: FILTER TO SPECIFIC TOOLS BY NAME
    // TO DO: ADD TOOL RESULT PARSING LOGIC WITH AFTER EXECUTION MODIFIER
    const firstConnectionId = connectedToolkits[0]?.connectionId;
    const rawTools = await composio.tools.get(userId, {
      toolkits: toolkitNames,
      ...(firstConnectionId && { connectedAccountId: firstConnectionId }),
    });

    // Validate and fix each tool schema, adding connectionId for proper account selection
    const validatedTools: Record<string, any> = {};

    for (const [toolName, tool] of Object.entries(rawTools)) {
      const validatedTool = validateAndFixToolSchema(tool);
      if (validatedTool) {
        // Extract toolkit name from tool name (e.g., GMAIL_SEND_EMAIL -> GMAIL)
        const toolkitName = toolName.split('_')[0];
        const connectionId = toolkitConnectionMap[toolkitName];

        // Add connectedAccountId to tool for proper account selection
        if (connectionId) {
          validatedTool.connectedAccountId = connectionId;
          console.log(`🔗 [${toolName}] Connected to account: ${connectionId}`);
        } else {
          console.warn(
            `⚠️ [${toolName}] No connection ID found for toolkit: ${toolkitName}`,
          );
        }

        validatedTools[toolName] = validatedTool;
      }
    }

    const toolCount = Object.keys(validatedTools).length;
    console.log(
      `📦 [Composio] Successfully prepared ${toolCount} tools for AI SDK`,
    );

    return validatedTools;
  } catch (error) {
    console.error('❌ [Composio] Failed to fetch tools:', error);
    return {};
  }
}
