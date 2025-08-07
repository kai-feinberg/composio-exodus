import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/lib/auth';
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
import {
  convertToUIMessages,
  generateUUID,
  getMessageStats,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { getComposioTools } from '@/lib/ai/tools/composio';
import { sanitizeToolResult } from '@/lib/ai/tools/result-sanitizer';
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
import { SUPPORTED_MODEL_IDS } from '@/lib/ai/models';
import {
  validateWithDetailedErrors,
  logValidationError,
  createContextualErrorMessage,
} from '@/lib/validation';

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

  // Validate request with AI SDK v2 schema using improved validation
  const validationResult = validateWithDetailedErrors(
    aiSdkRequestSchema,
    json,
    {
      prefix: 'AI SDK v2 schema validation',
      context: 'Chat API request',
    },
  );

  if (!validationResult.success) {
    // Log comprehensive debugging information
    logValidationError(validationResult.error, {
      requestId: json.id || 'unknown',
      endpoint: 'POST /api/chat',
      additionalData: {
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
      },
    });

    // Create user-friendly error message with supported models
    const userMessage = createContextualErrorMessage(
      validationResult.error.issues,
      [...SUPPORTED_MODEL_IDS],
    );

    return new ChatSDKError('bad_request:api', userMessage).toResponse();
  }

  console.log('✅ AI SDK v2 schema validation passed');
  const requestData = validationResult.data;
  const message = requestData.messages.at(-1); // Get the latest message

  if (!message) {
    return new ChatSDKError(
      'bad_request:api',
      'No message found in request',
    ).toResponse();
  }

  // Log user prompt and token/character counts
  const messageStats = getMessageStats(message);
  console.log('📊 User Input Stats:', {
    messageId: message.id,
    characterCount: messageStats.characterCount,
    estimatedTokenCount: messageStats.estimatedTokenCount,
    textPreview:
      messageStats.text.slice(0, 100) +
      (messageStats.text.length > 100 ? '...' : ''),
    timestamp: new Date().toISOString(),
  });

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
        message?.parts?.[0]?.type === 'text' && 'text' in message.parts[0]
          ? `${message.parts[0].text.slice(0, 50)}...`
          : 'non-text',
      rawRequestKeys: Object.keys(requestData),
    });

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const userType: UserType = session.user.type;

    // User existence is now ensured by middleware
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
        message: message as any, // Type assertion for gateway compatibility
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
    let effectiveChatModel: string = selectedChatModel;

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
          console.warn(
            '❌ Agent belongs to different user and is not global:',
            {
              agentUserId: agent.userId,
              sessionUserId: session.user.id,
              isGlobal: agent.isGlobal,
            },
          );
        } else {
          agentSystemPrompt = agent.systemPrompt;
          effectiveChatModel = agent.modelId as string;
          console.log('✅ Agent configuration applied:', {
            agentId: selectedAgentId,
            agentName: agent.name,
            effectiveChatModel,
            modelProvider: effectiveChatModel.includes('-')
              ? 'gateway'
              : 'direct',
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
      console.log('🤖 No agent selected, using default configuration:', {
        selectedChatModel,
        effectiveChatModel,
        modelProvider: effectiveChatModel.includes('-') ? 'gateway' : 'direct',
      });
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
      execute: async ({ writer: dataStream }) => {
        // Fetch user's connected toolkits and Composio tools
        let composioTools = {};
        try {
          console.log(`🔄 Loading Composio tools for user: ${session.user.id}${selectedAgentId ? `, agent: ${selectedAgentId}` : ''}`);
          composioTools = await getComposioTools(session.user.id, { agentId: selectedAgentId });
          const toolNames = Object.keys(composioTools);
          console.log(`✅ Loaded ${toolNames.length} tools:`, toolNames.slice(0, 5));
        } catch (error) {
          console.error('❌ Failed to load Composio tools:', error);
          // Continue without Composio tools if this fails
        }

        const finalSystemPrompt = systemPrompt({
          selectedChatModel: effectiveChatModel,
          requestHints,
          agentSystemPrompt,
          availableTools: Object.keys(composioTools),
        });

        console.log('📝 Final system prompt configuration:', {
          chatId: id,
          effectiveChatModel,
          modelProvider: effectiveChatModel.includes('-')
            ? 'gateway'
            : 'direct',
          selectedChatModel,
          modelOverridden: effectiveChatModel !== selectedChatModel,
          hasAgentPrompt: !!agentSystemPrompt,
          agentPromptPreview: agentSystemPrompt
            ? `${agentSystemPrompt.slice(0, 100)}...`
            : 'none',
          finalPromptLength: finalSystemPrompt.length,
          finalPromptPreview: `${finalSystemPrompt.slice(0, 200)}...`,
          availableToolsCount: Object.keys(composioTools).length,
        });

        // Wrap Composio tools with logging
        const loggedComposioTools: Record<string, any> = {};
        for (const [toolName, tool] of Object.entries(composioTools)) {
          const typedTool = tool as any;

          if (typeof typedTool.execute !== 'function') {
            console.warn(
              `⚠️ [${toolName}] Tool missing execute function, using original tool`,
            );
            loggedComposioTools[toolName] = typedTool;
            continue;
          }

          loggedComposioTools[toolName] = {
            ...typedTool,
            execute: async (params: any) => {
              console.log(
                `🔧 [${toolName}] Tool called with params:`,
                JSON.stringify(params, null, 2),
              );
              const startTime = Date.now();

              try {
                const rawResult = await typedTool.execute(params);
                const endTime = Date.now();

                // Sanitize the result to prevent token limit issues
                const sanitizedResult = sanitizeToolResult(rawResult, toolName);

                console.log(
                  `✅ [${toolName}] Tool completed in ${endTime - startTime}ms`,
                );

                // Log result size information for monitoring
                const rawSize = JSON.stringify(rawResult).length;
                const sanitizedSize = JSON.stringify(sanitizedResult).length;
                if (rawSize > 5000) {
                  console.log(
                    `🧹 [${toolName}] Result sanitized: ${rawSize} → ${sanitizedSize} chars (${(((rawSize - sanitizedSize) / rawSize) * 100).toFixed(1)}% reduction)`,
                  );
                }

                return sanitizedResult;
              } catch (error) {
                const endTime = Date.now();
                console.error(
                  `❌ [${toolName}] Tool failed in ${endTime - startTime}ms:`,
                  error,
                );
                throw error;
              }
            },
          };
        }

        // Combine existing tools with logged Composio tools
        const allTools = {
          getWeather,
          // createDocument: createDocument({ session, dataStream }),
          // updateDocument: updateDocument({ session, dataStream }),
          // requestSuggestions: requestSuggestions({
          //   session,
          //   dataStream,
          // }),
          ...loggedComposioTools,
        };

        console.log(`🎯 [AI SDK] Final tool configuration:`, {
          totalTools: Object.keys(allTools).length,
          composioTools: Object.keys(loggedComposioTools),
        });

        const result = streamText({
          model: myProvider.languageModel(effectiveChatModel),
          system: finalSystemPrompt,
          messages: convertToModelMessages(uiMessages as any),
          stopWhen: stepCountIs(5),
          experimental_transform: smoothStream({
            delayInMs: 20,
            // chunking: 'word',
            chunking: /./g, // Use regex to chunk by character
          }),
          tools: allTools,
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
    console.error('❌ Unexpected error in chat API:', error);
    return new ChatSDKError('offline:chat').toResponse();
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
