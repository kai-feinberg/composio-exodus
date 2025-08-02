import type { z } from 'zod';

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: {
    message: string;
    humanReadableError: string;
    issues: Array<{
      path: string;
      message: string;
      code: string;
      received?: unknown;
      expected?: unknown;
    }>;
    rawError: string;
  };
}

export function validateWithDetailedErrors<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  options?: {
    prefix?: string;
    context?: string;
  }
): ValidationResult<T> | ValidationError {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  // Extract detailed issue information
  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join('.') || 'root',
    message: issue.message,
    code: issue.code,
    received: 'received' in issue ? issue.received : undefined,
    expected: 'expected' in issue ? issue.expected : undefined,
  }));

  // Generate human-readable error manually since fromZodError has type issues
  const humanReadableError = issues.map(issue => 
    `${issue.path}: ${issue.message}`
  ).join('; ');

  const errorMessage = `${options?.prefix || "Validation error"}: ${humanReadableError}`;

  return {
    success: false,
    error: {
      message: `${options?.context ? `${options.context}: ` : ''}${errorMessage}`,
      humanReadableError: errorMessage,
      issues,
      rawError: result.error.toString(),
    },
  };
}

export function logValidationError(
  error: ValidationError['error'],
  context: {
    requestId?: string;
    endpoint?: string;
    additionalData?: Record<string, unknown>;
  }
): void {
  console.error(
    `❌ Schema validation failed${context.endpoint ? ` in ${context.endpoint}` : ''}:`,
    {
      requestId: context.requestId || 'unknown',
      timestamp: new Date().toISOString(),
      endpoint: context.endpoint,
      humanReadableError: error.humanReadableError,
      validationResults: {
        totalIssues: error.issues.length,
        detailedIssues: error.issues,
        criticalPaths: error.issues.filter(
          (i) =>
            i.path.includes('id') ||
            i.path.includes('messages') ||
            i.path.includes('parts') ||
            i.path.includes('selectedChatModel'),
        ),
      },
      rawZodError: error.rawError,
      ...context.additionalData,
    },
  );
}

export function createContextualErrorMessage(
  issues: Array<{
    path: string;
    message: string;
    code: string;
    received?: unknown;
    expected?: unknown;
  }>,
  supportedModels?: string[]
): string {
  // Model validation errors
  if (issues.some((i) => i.path.includes('selectedChatModel'))) {
    const modelIssue = issues.find((i) => i.path.includes('selectedChatModel'));
    if (modelIssue?.received && supportedModels) {
      return `Invalid chat model '${modelIssue.received}'. Supported models: ${supportedModels.join(', ')}`;
    }
    return 'Invalid or missing chat model selection';
  }

  // Agent ID validation errors
  if (issues.some((i) => i.path.includes('selectedAgentId'))) {
    return 'Invalid agent ID format - must be a valid UUID';
  }

  // Chat ID validation errors
  if (issues.some((i) => i.path.includes('id'))) {
    return 'Invalid chat ID format - must be a valid UUID';
  }

  // Message validation errors
  if (issues.some((i) => i.path.includes('messages') || i.path.includes('parts'))) {
    return 'Invalid message format - messages must contain valid content with proper structure';
  }

  // Default fallback with first issue
  return `Validation error: ${issues[0]?.message || 'Invalid request format'}`;
}