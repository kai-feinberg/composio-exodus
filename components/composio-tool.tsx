'use client';

import {
  AITool,
  AIToolHeader,
  AIToolContent,
  AIToolParameters,
  AIToolResult,
  type AIToolStatus,
} from '@/components/ui/kibo-ui/ai/tool';

interface ComposioToolProps {
  toolName: string;
  toolCallId: string;
  state?: 'partial-call' | 'call' | 'result' | 'output-available';
  input?: any;
  output?: any;
}

// Helper function to convert AI SDK state to AITool status
const getToolStatus = (state?: string, hasError?: boolean): AIToolStatus => {
  if (hasError) return 'error';

  switch (state) {
    case 'partial-call':
      return 'pending';
    case 'call':
      return 'running';
    case 'result':
      return 'running';
    case 'output-available':
      return 'completed';
    default:
      return 'pending';
  }
};

// Helper function to format tool name for display
const formatToolName = (toolName: string): string => {
  // Convert GMAIL_SEND_EMAIL to "Gmail Send Email"
  return toolName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Helper function to get tool description
const getToolDescription = (toolName: string): string => {
  const toolkit = toolName.split('_')[0].toLowerCase();
  const action = toolName.split('_').slice(1).join(' ').toLowerCase();

  return `${toolkit.charAt(0).toUpperCase() + toolkit.slice(1)} - ${action}`;
};

export const ComposioTool = ({
  toolName,
  toolCallId,
  state,
  input,
  output,
}: ComposioToolProps) => {
  const displayName = formatToolName(toolName);
  const description = getToolDescription(toolName);

  // Check if there's an error in the output
  // Only consider it an error if the top-level output has an error property
  // AND there's no data/success indication at the top level
  const hasError =
    output &&
    typeof output === 'object' &&
    ('error' in output || 'errorMessage' in output) &&
    !('data' in output || 'success' in output || 'result' in output);
  const status = getToolStatus(state, hasError);

  // Determine if the tool should be open by default
  const shouldOpenByDefault = status === 'completed' || status === 'error';

  // Format output for display
  const formatOutput = (data: any) => {
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return String(data);
      }
    }
    return String(data);
  };

  return (
    <AITool defaultOpen={shouldOpenByDefault}>
      <AIToolHeader
        status={status}
        name={displayName}
        description={description}
      />
      <AIToolContent>
        {input && Object.keys(input).length > 0 && (
          <AIToolParameters parameters={input} />
        )}

        {state === 'output-available' && output && (
          <AIToolResult
            result={hasError ? undefined : formatOutput(output)}
            error={
              hasError
                ? String(output.error || output.message || 'Unknown error')
                : undefined
            }
          />
        )}

        {(state === 'result' || state === 'call' || state === 'partial-call') &&
          !output && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted/50 rounded">
              <div className="animate-pulse">⏳</div>
              Executing {displayName.toLowerCase()}...
            </div>
          )}
      </AIToolContent>
    </AITool>
  );
};
