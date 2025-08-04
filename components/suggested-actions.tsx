'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import type { ChatMessage } from '@/lib/types';

interface SuggestedActionsProps {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  selectedVisibilityType: VisibilityType;
  selectedAgentId?: string;
  selectedChatModel: string;
}

function PureSuggestedActions({
  chatId,
  sendMessage,
  selectedVisibilityType,
  selectedAgentId,
  selectedChatModel,
}: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'Analyze this codebase',
      label: 'and suggest improvements',
      action:
        'Analyze my codebase architecture and suggest performance improvements',
    },
    {
      title: 'Build a React component',
      label: 'with TypeScript and accessibility',
      action:
        'Build a React component with TypeScript that includes proper accessibility features',
    },
    {
      title: 'Debug this error',
      label: 'and explain the root cause',
      action: 'Help me debug this error and explain the root cause with a fix',
    },
    {
      title: 'Create API documentation',
      label: 'from my Express routes',
      action:
        'Generate comprehensive API documentation from my Express.js routes',
    },
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-3 w-full max-w-4xl mx-auto"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.1 * index, duration: 0.4 }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="outline"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);

              sendMessage(
                {
                  role: 'user',
                  parts: [{ type: 'text', text: suggestedAction.action }],
                },
                {
                  body: {
                    selectedChatModel: selectedChatModel,
                    selectedVisibilityType: selectedVisibilityType,
                    selectedAgentId: selectedAgentId,
                  },
                },
              );
            }}
            className="text-left rounded-lg p-4 text-sm flex-1 gap-2 sm:flex-col w-full h-auto justify-start items-start hover:bg-muted hover:border-muted-foreground/50 transition-all duration-200 group hover:shadow-sm"
          >
            <div className="text-left space-y-1">
              <span className="font-semibold text-foreground group-hover:text-foreground">
                {suggestedAction.title}
              </span>
              <span className="text-muted-foreground text-xs leading-relaxed block">
                {suggestedAction.label}
              </span>
            </div>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;
    if (prevProps.selectedAgentId !== nextProps.selectedAgentId) return false;
    if (prevProps.selectedChatModel !== nextProps.selectedChatModel)
      return false;

    return true;
  },
);
