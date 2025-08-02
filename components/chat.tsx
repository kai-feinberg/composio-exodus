'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useState, useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat-header';
import type { Vote, Agent } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { Session } from '@/lib/auth';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';
import type { Attachment, ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';
import { useLocalStorage } from 'usehooks-ts';

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  session,
  autoResume,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const [selectedAgentId, setSelectedAgentId] = useLocalStorage<
    string | undefined
  >('selectedAgentId', undefined);

  // Fetch agents to ensure we have a fallback when no agent is selected
  const { data: agentsData } = useSWR<{ agents: Agent[] }>(
    '/api/agents',
    fetcher,
  );

  // Function to get the current agent ID dynamically
  const getCurrentAgentId = useCallback(() => {
    // First check if we have a selected agent
    if (selectedAgentId) {
      return selectedAgentId;
    }
    // Fallback to first available agent
    if (agentsData?.agents && agentsData.agents.length > 0) {
      return agentsData.agents[0].id;
    }
    // No agent available
    return undefined;
  }, [selectedAgentId, agentsData?.agents]);

  const handleAgentChange = (agentId: string) => {
    console.log('🔄 Agent changed:', { from: selectedAgentId, to: agentId });

    // Defensive programming: validate input
    if (!agentId || typeof agentId !== 'string') {
      console.error('❌ Invalid agent ID provided:', agentId);
      return;
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(agentId)) {
      console.error('❌ Invalid agent ID format:', agentId);
      toast({
        type: 'error',
        description: 'Invalid agent ID format',
      });
      return;
    }

    // Update selected agent
    setSelectedAgentId(agentId);
  };

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>('');

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
          description: error.message,
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage(
        {
          role: 'user' as const,
          parts: [{ type: 'text', text: query }],
        },
        {
          body: {
            selectedChatModel: initialChatModel,
            selectedVisibilityType: visibilityType,
            selectedAgentId: getCurrentAgentId(),
          },
        },
      );

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [
    query,
    sendMessage,
    hasAppendedQuery,
    id,
    initialChatModel,
    visibilityType,
    getCurrentAgentId,
  ]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  // Debug logging for agent hotswitch
  useEffect(() => {
    console.log('🔥 Agent hotswitch - no remount needed:', {
      selectedAgentId,
      currentAgentId: getCurrentAgentId(),
      messageCount: messages.length,
    });
  }, [selectedAgentId, getCurrentAgentId, messages.length]);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background transition-colors duration-200">
        <ChatHeader
          chatId={id}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="flex mx-auto px-4 bg-background/80 backdrop-blur-sm border-t border-border/50 pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType={visibilityType}
              selectedAgentId={getCurrentAgentId()}
              selectedChatModel={initialChatModel}
              onAgentChange={handleAgentChange}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        sendMessage={sendMessage}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
        selectedAgentId={getCurrentAgentId()}
        selectedChatModel={initialChatModel}
        onAgentChange={handleAgentChange}
      />
    </>
  );
}
