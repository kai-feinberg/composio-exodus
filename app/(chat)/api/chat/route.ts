import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { auth, type UserType, ensureUserExists } from '@/lib/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  getAgentById,
} from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { aiSdkRequestSchema } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatModel } from '@/lib/ai/models';

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let json: any;
  try {
    json = await request.json();
    // console.log('🔍 Raw request body:', JSON.stringify(json, null, 2));
    // console.log('🔍 Request body keys:', Object.keys(json));
    // console.log(
    //   '🔍 Request body types:',
    //   Object.fromEntries(
    //     Object.entries(json).map(([key, value]) => [key, typeof value]),
    //   ),
    // );
    console.log('🔍 selectedAgentId value:', json.selectedAgentId);
    console.log('🔍 selectedAgentId type:', typeof json.selectedAgentId);
  } catch (error) {
    console.error(
      '❌ Failed to parse JSON:',
      error instanceof Error ? error.message : String(error),
    );
    return new ChatSDKError('bad_request:api').toResponse();
  }

  // Validate request with AI SDK v2 schema only
  const aiSdkResult = aiSdkRequestSchema.safeParse(json);
  if (!aiSdkResult.success) {
    // Create detailed validation error information for debugging
    const issues = aiSdkResult.error.issues.map((issue) => ({
      path: issue.path.join('.') || 'root',
      message: issue.message,
      code: issue.code,
      received: 'received' in issue ? issue.received : undefined,
      expected: 'expected' in issue ? issue.expected : undefined,
    }));

    // Log comprehensive debugging information
    console.error(
      '❌ AI SDK v2 schema validation failed:',
      {
        requestId: json.id || 'unknown',
        timestamp: new Date().toISOString(),
        receivedKeys: Object.keys(json),
        dataStructure: {
          hasId: !!json.id,
          idType: typeof json.id,
          hasMessages: !!json.messages,
          messagesCount: Array.isArray(json.messages)
            ? json.messages.length
            : 0,
          selectedChatModel: json.selectedChatModel,
          selectedAgentId: json.selectedAgentId,
        },
        validationResults: {
          totalIssues: issues.length,
          issues: issues,
          criticalPaths: issues.filter(
            (i) =>
              i.path.includes('id') ||
              i.path.includes('messages') ||
              i.path.includes('parts'),
          ),
        },
      },
    );

    // Create user-friendly error message based on specific validation failures
    const userErrorDetails: string[] = [];

    // Analyze specific issues to provide actionable feedback
    if (
      issues.some(
        (i) => i.path.includes('id') && i.code === 'invalid_string',
      )
    ) {
      userErrorDetails.push('Invalid chat ID format - must be a valid UUID');
    } else if (issues.some((i) => i.path.includes('id'))) {
      userErrorDetails.push('Missing or invalid chat ID');
    }

    if (issues.some((i) => i.path.includes('messages'))) {
      userErrorDetails.push(
        'Invalid message format - messages must contain valid content',
      );
    }

    if (issues.some((i) => i.path.includes('selectedChatModel'))) {
      userErrorDetails.push('Invalid chat model selection');
    }

    if (
      issues.some(
        (i) =>
          i.path.includes('selectedAgentId') && i.code === 'invalid_string',
      )
    ) {
      userErrorDetails.push('Invalid agent ID format - must be a valid UUID');
    }

    if (
      issues.some(
        (i) => i.path.includes('parts') && i.message.includes('array'),
      )
    ) {
      userErrorDetails.push('Message content is malformed');
    }

    const userMessage =
      userErrorDetails.length > 0
        ? `Request validation failed: ${userErrorDetails.join(', ')}`
        : 'Request format is invalid - please check your input and try again';

    return new ChatSDKError('bad_request:api', userMessage).toResponse();
  }

  console.log('✅ AI SDK v2 schema validation passed');
  const requestData = aiSdkResult.data;
  const message = requestData.messages.at(-1); // Get the latest message

  try {
    const {
      id,
      selectedChatModel = 'chat-model', // Default value
      selectedVisibilityType = 'private', // Default value
      selectedAgentId,
    } = requestData;

    console.log('🔍 API Request received:', {
      chatId: id,
      selectedChatModel,
      selectedVisibilityType,
      selectedAgentId,
      hasMessage: !!message,
      messagePreview:
        message?.parts?.[0]?.type === 'text'
          ? `${message.parts[0].text.slice(0, 50)}...`
          : 'non-text',
      rawRequestKeys: Object.keys(requestData),
    });

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    // Ensure user exists in database before proceeding
    await ensureUserExists(session.user.id, session.user.organizationId);

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    // Get agent configuration if provided
    let agentSystemPrompt: string | undefined;
    let effectiveChatModel = selectedChatModel;

    if (selectedAgentId) {
      console.log('🤖 Attempting to load agent:', selectedAgentId);
      try {
        const agent = await getAgentById({ id: selectedAgentId });
        // console.log('🤖 Agent retrieved from DB:', {
        //   found: !!agent,
        //   agentId: agent?.id,
        //   agentName: agent?.name,
        //   agentUserId: agent?.userId,
        //   sessionUserId: session.user.id,
        //   userMatch: agent?.userId === session.user.id,
        //   modelId: agent?.modelId,
        //   systemPromptLength: agent?.systemPrompt?.length,
        // });

        if (!agent) {
          console.warn('❌ Agent not found in database:', selectedAgentId);
        } else if (agent.userId !== session.user.id && !agent.isGlobal) {
          console.warn('❌ Agent belongs to different user and is not global:', {
            agentUserId: agent.userId,
            sessionUserId: session.user.id,
            isGlobal: agent.isGlobal,
          });
        } else {
          agentSystemPrompt = agent.systemPrompt;
          effectiveChatModel = agent.modelId as ChatModel['id'];
          console.log('✅ Agent configuration applied:', {
            agentName: agent.name,
            effectiveChatModel,
            isGlobal: agent.isGlobal,
            ownerUserId: agent.userId,
            currentUserId: session.user.id,
            systemPromptPreview: `${agentSystemPrompt.slice(0, 100)}...`,
          });
        }
      } catch (error) {
        // Agent not found or error - continue with default behavior
        console.error('❌ Agent retrieval error:', {
          selectedAgentId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    } else {
      console.log('🤖 No agent selected, using default configuration');
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const finalSystemPrompt = systemPrompt({
          selectedChatModel: effectiveChatModel,
          requestHints,
          agentSystemPrompt,
        });

        console.log('📝 Final system prompt configuration:', {
          effectiveChatModel,
          hasAgentPrompt: !!agentSystemPrompt,
          agentPromptPreview: agentSystemPrompt
            ? `${agentSystemPrompt.slice(0, 100)}...`
            : 'none',
          finalPromptLength: finalSystemPrompt.length,
          finalPromptPreview: `${finalSystemPrompt.slice(0, 200)}...`,
        });

        const result = streamText({
          model: myProvider.languageModel(effectiveChatModel),
          system: finalSystemPrompt,
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools: [
            'getWeather',
            'createDocument',
            'updateDocument',
            'requestSuggestions',
          ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
