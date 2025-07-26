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
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { aiSdkRequestSchema, postRequestBodySchema } from './schema';
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
    console.log('🔍 Raw request body:', JSON.stringify(json, null, 2));
    console.log('🔍 Request body keys:', Object.keys(json));
    console.log(
      '🔍 Request body types:',
      Object.fromEntries(
        Object.entries(json).map(([key, value]) => [key, typeof value]),
      ),
    );
    console.log('🔍 selectedAgentId value:', json.selectedAgentId);
    console.log('🔍 selectedAgentId type:', typeof json.selectedAgentId);
  } catch (error) {
    console.error(
      '❌ Failed to parse JSON:',
      error instanceof Error ? error.message : String(error),
    );
    return new ChatSDKError('bad_request:api').toResponse();
  }

  // Try AI SDK v2 schema first, then fall back to legacy
  let requestData: any;
  let message: any;

  const aiSdkResult = aiSdkRequestSchema.safeParse(json);
  if (aiSdkResult.success) {
    console.log('✅ AI SDK v2 schema validation passed');
    requestData = aiSdkResult.data;
    message = requestData.messages.at(-1); // Get the latest message
  } else {
    // Try legacy schema
    const legacyResult = postRequestBodySchema.safeParse(json);
    if (legacyResult.success) {
      console.log('✅ Legacy schema validation passed');
      requestData = legacyResult.data;
      message = requestData.message;
    } else {
      console.error('❌ Both schema validations failed:', {
        aiSdkErrors: aiSdkResult.error.format(),
        legacyErrors: legacyResult.error.format(),
        receivedData: JSON.stringify(json, null, 2),
      });
      return new ChatSDKError('bad_request:api').toResponse();
    }
  }

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
        console.log('🤖 Agent retrieved from DB:', {
          found: !!agent,
          agentId: agent?.id,
          agentName: agent?.name,
          agentUserId: agent?.userId,
          sessionUserId: session.user.id,
          userMatch: agent?.userId === session.user.id,
          modelId: agent?.modelId,
          systemPromptLength: agent?.systemPrompt?.length,
        });

        if (!agent) {
          console.warn('❌ Agent not found in database:', selectedAgentId);
        } else if (agent.userId !== session.user.id) {
          console.warn('❌ Agent belongs to different user:', {
            agentUserId: agent.userId,
            sessionUserId: session.user.id,
          });
        } else {
          agentSystemPrompt = agent.systemPrompt;
          effectiveChatModel = agent.modelId as ChatModel['id'];
          console.log('✅ Agent configuration applied:', {
            agentName: agent.name,
            effectiveChatModel,
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
          experimental_activeTools:
            effectiveChatModel === 'chat-model-reasoning'
              ? []
              : [
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
