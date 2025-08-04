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
      title: 'Create email campaign',
      label: 'using Gmail tools for marketing',
      action:
        'Help me create an email marketing campaign using Gmail tools with audience segmentation and tracking',
    },
    {
      title: 'Design email template',
      label: 'with responsive HTML layout',
      action:
        'Design a professional email template with responsive HTML layout for marketing campaigns',
    },
    {
      title: 'Set up email automation',
      label: 'for lead nurturing sequence',
      action:
        'Set up an automated email sequence for lead nurturing using Gmail and marketing tools',
    },
    {
      title: 'Analyze campaign performance',
      label: 'with metrics and insights',
      action:
        'Analyze email campaign performance metrics and provide insights for optimization',
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
