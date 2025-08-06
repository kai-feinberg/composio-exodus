import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  max,
  or,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  agent,
  availableTools,
  userTools,
  agentTools,
  type AvailableTool,
  type UserTool,
  type AgentTool,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(id: string, email: string, password?: string) {
  const hashedPassword = password ? generateHashedPassword(password) : null;

  try {
    return await db
      .insert(user)
      .values({ id, email, password: hashedPassword });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser() {
  const id = `guest-${generateUUID()}`;
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ id, email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt))
      .limit(5);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

// Agent-related queries
export async function createAgent({
  name,
  description,
  systemPrompt,
  modelId,
  userId,
  organizationId,
  isGlobal = true,
}: {
  name: string;
  description?: string;
  systemPrompt: string;
  modelId: string;
  userId: string;
  organizationId?: string;
  isGlobal?: boolean;
}) {
  try {
    const [createdAgent] = await db
      .insert(agent)
      .values({
        name,
        description,
        systemPrompt,
        modelId,
        userId,
        organizationId,
        isGlobal,
      })
      .returning();

    return createdAgent;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create agent');
  }
}

export async function getAgentsByUserId({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId?: string;
}) {
  try {
    // Get agents owned by user/organization AND global agents
    const whereCondition = organizationId
      ? or(eq(agent.organizationId, organizationId), eq(agent.isGlobal, true))
      : or(eq(agent.userId, userId), eq(agent.isGlobal, true));

    return await db
      .select()
      .from(agent)
      .where(whereCondition)
      .orderBy(desc(agent.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get agents by user id',
    );
  }
}

export async function getAgentById({ id }: { id: string }) {
  try {
    const [agentData] = await db.select().from(agent).where(eq(agent.id, id));

    return agentData;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get agent by id');
  }
}

export async function updateAgent({
  id,
  name,
  description,
  systemPrompt,
  modelId,
  isGlobal,
}: {
  id: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
  modelId?: string;
  isGlobal?: boolean;
}) {
  try {
    const updateData: any = { updatedAt: new Date() };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (modelId !== undefined) updateData.modelId = modelId;
    if (isGlobal !== undefined) updateData.isGlobal = isGlobal;

    const [updatedAgent] = await db
      .update(agent)
      .set(updateData)
      .where(eq(agent.id, id))
      .returning();

    return updatedAgent;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update agent');
  }
}

export async function deleteAgent({ id }: { id: string }) {
  try {
    const [deletedAgent] = await db
      .delete(agent)
      .where(eq(agent.id, id))
      .returning();

    return deletedAgent;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete agent');
  }
}

// Tool Management Queries

export async function getEnabledToolsForUser(
  userId: string,
): Promise<string[]> {
  try {
    const enabledTools = await db
      .select({ toolSlug: userTools.toolSlug })
      .from(userTools)
      .where(and(eq(userTools.userId, userId), eq(userTools.isEnabled, true)));

    return enabledTools.map((tool) => tool.toolSlug);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get enabled tools for user',
    );
  }
}

export async function getEnabledToolsForAgent(
  agentId: string,
): Promise<string[]> {
  try {
    const enabledTools = await db
      .select({ toolSlug: agentTools.toolSlug })
      .from(agentTools)
      .where(
        and(eq(agentTools.agentId, agentId), eq(agentTools.isEnabled, true)),
      );

    return enabledTools.map((tool) => tool.toolSlug);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get enabled tools for agent',
    );
  }
}

export async function getAvailableTools(): Promise<AvailableTool[]> {
  try {
    return await db
      .select()
      .from(availableTools)
      .where(eq(availableTools.isActive, true))
      .orderBy(availableTools.displayName);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get available tools',
    );
  }
}

export async function getUserToolPreferences(
  userId: string,
): Promise<UserTool[]> {
  try {
    return await db
      .select()
      .from(userTools)
      .where(eq(userTools.userId, userId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user tool preferences',
    );
  }
}

export async function getAgentToolConfiguration(
  agentId: string,
): Promise<AgentTool[]> {
  try {
    return await db
      .select()
      .from(agentTools)
      .where(eq(agentTools.agentId, agentId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get agent tool configuration',
    );
  }
}

// Tool management mutations

export async function setUserToolEnabled(
  userId: string,
  toolSlug: string,
  enabled: boolean,
) {
  try {
    await db
      .insert(userTools)
      .values({ userId, toolSlug, isEnabled: enabled })
      .onConflictDoUpdate({
        target: [userTools.userId, userTools.toolSlug],
        set: { isEnabled: enabled, enabledAt: new Date() },
      });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to set user tool enabled',
    );
  }
}

export async function setAgentToolEnabled(
  agentId: string,
  toolSlug: string,
  enabled: boolean,
) {
  try {
    await db
      .insert(agentTools)
      .values({ agentId, toolSlug, isEnabled: enabled })
      .onConflictDoUpdate({
        target: [agentTools.agentId, agentTools.toolSlug],
        set: { isEnabled: enabled, enabledAt: new Date() },
      });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to set agent tool enabled',
    );
  }
}

export async function addAvailableTool(tool: {
  slug: string;
  toolkitSlug: string;
  toolkitName: string;
  displayName?: string;
  description?: string;
}) {
  try {
    await db.insert(availableTools).values(tool);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to add available tool',
    );
  }
}

export async function updateAvailableTool(
  slug: string,
  updates: {
    displayName?: string;
    description?: string;
    isActive?: boolean;
  },
) {
  try {
    const updateData = { ...updates, updatedAt: new Date() };

    const [updatedTool] = await db
      .update(availableTools)
      .set(updateData)
      .where(eq(availableTools.slug, slug))
      .returning();

    return updatedTool;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update available tool',
    );
  }
}

export async function deleteAvailableTool(slug: string) {
  try {
    // First delete all user and agent associations
    await db.delete(userTools).where(eq(userTools.toolSlug, slug));
    await db.delete(agentTools).where(eq(agentTools.toolSlug, slug));

    // Then delete the tool itself
    const [deletedTool] = await db
      .delete(availableTools)
      .where(eq(availableTools.slug, slug))
      .returning();

    return deletedTool;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete available tool',
    );
  }
}

// Toolkit-level queries
export async function getAvailableToolkits(): Promise<
  Array<{
    toolkitName: string;
    toolkitSlug: string;
    toolCount: number;
    description?: string;
  }>
> {
  try {
    const toolkits = await db
      .select({
        toolkitName: availableTools.toolkitName,
        toolkitSlug: availableTools.toolkitSlug,
        toolCount: count(availableTools.slug),
        // Take the first description found for the toolkit (using max as a simple way to get one)
        description: max(availableTools.description),
      })
      .from(availableTools)
      .where(eq(availableTools.isActive, true))
      .groupBy(availableTools.toolkitName, availableTools.toolkitSlug)
      .orderBy(availableTools.toolkitName);

    // Convert null to undefined for TypeScript compatibility
    return toolkits.map(toolkit => ({
      ...toolkit,
      description: toolkit.description || undefined
    }));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get available toolkits',
    );
  }
}

export async function getAgentEnabledToolkits(
  agentId: string,
): Promise<string[]> {
  try {
    // Get all available toolkits
    const availableToolkitData = await db
      .select({
        toolkitName: availableTools.toolkitName,
        toolCount: count(availableTools.slug),
      })
      .from(availableTools)
      .where(eq(availableTools.isActive, true))
      .groupBy(availableTools.toolkitName);

    // Get enabled tools for the agent
    const enabledTools = await db
      .select({
        toolkitName: availableTools.toolkitName,
        enabledCount: count(agentTools.toolSlug),
      })
      .from(agentTools)
      .innerJoin(availableTools, eq(agentTools.toolSlug, availableTools.slug))
      .where(
        and(eq(agentTools.agentId, agentId), eq(agentTools.isEnabled, true)),
      )
      .groupBy(availableTools.toolkitName);

    // Find toolkits where all tools are enabled
    const fullyEnabledToolkits: string[] = [];

    for (const available of availableToolkitData) {
      const enabled = enabledTools.find(
        (e) => e.toolkitName === available.toolkitName,
      );
      if (enabled && enabled.enabledCount === available.toolCount) {
        fullyEnabledToolkits.push(available.toolkitName);
      }
    }

    return fullyEnabledToolkits;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get agent enabled toolkits',
    );
  }
}

export async function setAgentToolkitEnabled(
  agentId: string,
  toolkitName: string,
  enabled: boolean,
) {
  try {
    // Get all tools for the toolkit
    const toolkitTools = await db
      .select({ slug: availableTools.slug })
      .from(availableTools)
      .where(
        and(
          eq(availableTools.toolkitName, toolkitName),
          eq(availableTools.isActive, true),
        ),
      );

    // Enable/disable all tools in the toolkit
    for (const tool of toolkitTools) {
      await db
        .insert(agentTools)
        .values({ agentId, toolSlug: tool.slug, isEnabled: enabled })
        .onConflictDoUpdate({
          target: [agentTools.agentId, agentTools.toolSlug],
          set: { isEnabled: enabled, enabledAt: new Date() },
        });
    }

    return toolkitTools.length;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to set agent toolkit enabled',
    );
  }
}

export async function getUserEnabledToolkits(userId: string): Promise<string[]> {
  try {
    // Get all available toolkits
    const availableToolkitData = await db
      .select({
        toolkitName: availableTools.toolkitName,
        toolCount: count(availableTools.slug),
      })
      .from(availableTools)
      .where(eq(availableTools.isActive, true))
      .groupBy(availableTools.toolkitName);

    // Get enabled tools for the user  
    const enabledTools = await db
      .select({
        toolkitName: availableTools.toolkitName,
        enabledCount: count(userTools.toolSlug),
      })
      .from(userTools)
      .innerJoin(availableTools, eq(userTools.toolSlug, availableTools.slug))
      .where(and(
        eq(userTools.userId, userId),
        eq(userTools.isEnabled, true)
      ))
      .groupBy(availableTools.toolkitName);

    // Find toolkits where all tools are enabled
    const fullyEnabledToolkits: string[] = [];
    
    for (const available of availableToolkitData) {
      const enabled = enabledTools.find(e => e.toolkitName === available.toolkitName);
      if (enabled && enabled.enabledCount === available.toolCount) {
        fullyEnabledToolkits.push(available.toolkitName);
      }
    }

    return fullyEnabledToolkits;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user enabled toolkits',
    );
  }
}
