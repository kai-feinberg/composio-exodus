import { auth } from '@/lib/auth';
import { 
  createAgent, 
  getAgentsByUserId 
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { z } from 'zod';

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  systemPrompt: z.string().min(1).max(100000), // 100KB limit for large prompts from DOCX files
  modelId: z.enum(['chat-model', 'chat-model-reasoning']),
});

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const agents = await getAgentsByUserId({ userId: session.user.id });

    return Response.json({ agents }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return new ChatSDKError('bad_request:api', 'Failed to get agents').toResponse();
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  try {

    const json = await request.json();
    
    // Use safeParse for better error handling
    const validationResult = createAgentSchema.safeParse(json);
    
    if (!validationResult.success) {
      // Create detailed validation error information
      const issues = validationResult.error.issues.map(issue => ({
        path: issue.path.join('.') || 'root',
        message: issue.message,
        code: issue.code,
        received: 'received' in issue ? issue.received : undefined,
      }));

      console.error('❌ Agent validation failed:', {
        timestamp: new Date().toISOString(),
        userId: session.user.id,
        receivedData: json,
        validationIssues: issues,
        commonProblems: {
          missingName: !json.name,
          nameLength: json.name ? json.name.length : 0,
          invalidModelId: json.modelId && !['chat-model', 'chat-model-reasoning'].includes(json.modelId),
          systemPromptLength: json.systemPrompt ? json.systemPrompt.length : 0,
        },
      });

      // Create user-friendly error message
      const userErrorDetails: string[] = [];
      
      if (issues.some(i => i.path.includes('name'))) {
        if (issues.some(i => i.code === 'too_small' && i.path.includes('name'))) {
          userErrorDetails.push('Agent name is required');
        } else if (issues.some(i => i.code === 'too_big' && i.path.includes('name'))) {
          userErrorDetails.push('Agent name must be 100 characters or less');
        } else {
          userErrorDetails.push('Invalid agent name');
        }
      }
      
      if (issues.some(i => i.path.includes('systemPrompt'))) {
        if (issues.some(i => i.code === 'too_small' && i.path.includes('systemPrompt'))) {
          userErrorDetails.push('System prompt is required');
        } else if (issues.some(i => i.code === 'too_big' && i.path.includes('systemPrompt'))) {
          userErrorDetails.push('System prompt must be 100,000 characters or less');
        } else {
          userErrorDetails.push('Invalid system prompt');
        }
      }
      
      if (issues.some(i => i.path.includes('modelId'))) {
        userErrorDetails.push('Invalid model selection - must be chat-model or chat-model-reasoning');
      }

      const userMessage = userErrorDetails.length > 0 
        ? `Agent validation failed: ${userErrorDetails.join(', ')}`
        : 'Invalid agent data - please check your input and try again';

      return new ChatSDKError('bad_request:api', userMessage).toResponse();
    }
    
    const validatedData = validationResult.data;

    const agent = await createAgent({
      ...validatedData,
      userId: session.user.id,
    });

    return Response.json({ agent }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    console.error('❌ Agent creation failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: session?.user?.id || 'unknown',
      timestamp: new Date().toISOString(),
    });
    
    return new ChatSDKError('bad_request:api', 'Failed to create agent').toResponse();
  }
}