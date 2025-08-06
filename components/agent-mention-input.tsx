'use client';

import React, { forwardRef, useCallback, useMemo } from 'react';
import { Bot } from 'lucide-react';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { cn, fetcher } from '@/lib/utils';
import * as Mention from '@diceui/mention';
import { Textarea } from './ui/textarea';
import type { Agent } from '@/lib/db/schema';

interface AgentMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onAgentSwitch?: (agentId: string, agentName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
  rows?: number;
}

export const AgentMentionInput = forwardRef<HTMLTextAreaElement, AgentMentionInputProps>(
  ({ 
    value, 
    onChange, 
    onAgentSwitch,
    placeholder = "Send a message... (Type @ to mention agents)",
    disabled = false,
    className,
    onKeyDown,
    autoFocus = false,
    rows = 2,
    ...props 
  }, ref) => {
    const { has } = useAuth();
    const isAdmin = has?.({ role: 'org:admin' }) ?? false;
    
    // Use admin endpoint for admins, browse endpoint for regular users
    const apiEndpoint = isAdmin ? '/api/agents' : '/api/agents/browse';
    
    const { data, error } = useSWR<{ agents: Agent[] }>(
      disabled ? null : apiEndpoint,
      fetcher,
    );

    const agents = useMemo(() => data?.agents || [], [data?.agents]);

    // Filter function for mention component
    const handleFilter = useCallback((options: string[], term: string) => {
      if (!term.trim()) return options;
      
      const searchTerm = term.toLowerCase().trim();
      return options.filter(agentName => {
        const agent = agents.find(a => a.name === agentName);
        if (!agent) return false;
        
        return (
          agent.name.toLowerCase().includes(searchTerm) ||
          agent.description?.toLowerCase().includes(searchTerm) ||
          false
        );
      });
    }, [agents]);

    // Handle agent selection from mention
    const handleValueChange = useCallback((selectedValues: string[]) => {
      if (selectedValues.length > 0 && onAgentSwitch) {
        const lastSelectedName = selectedValues[selectedValues.length - 1];
        const agent = agents.find(a => a.name === lastSelectedName);
        
        if (agent) {
          onAgentSwitch(agent.id, agent.name);
        }
      }
    }, [agents, onAgentSwitch]);

    // Handle input value changes
    const handleInputValueChange = useCallback((newValue: string) => {
      onChange(newValue);
    }, [onChange]);

    // Convert agents to mention options (using agent names as values)
    const mentionOptions = agents.map(agent => agent.name);

    return (
      <Mention.Root
        trigger="@"
        onFilter={handleFilter}
        onValueChange={handleValueChange}
        onInputValueChange={handleInputValueChange}
        disabled={disabled}
        exactMatch={false}
        loop={true}
        modal={false}
        className="w-full **:data-tag:rounded **:data-tag:bg-blue-500/20 **:data-tag:px-1 **:data-tag:py-0.5 **:data-tag:text-blue-700 dark:**:data-tag:bg-blue-500/30 dark:**:data-tag:text-blue-300 **:data-tag:font-medium"
      >
        <Mention.Input
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            'min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-2xl !text-base bg-muted pb-10 dark:border-zinc-700',
            className
          )}
          asChild
        >
          <Textarea
            ref={ref}
            value={value}
            onChange={(e) => handleInputValueChange(e.target.value)}
            onKeyDown={onKeyDown}
            rows={rows}
            {...props}
          />
        </Mention.Input>
        
        <Mention.Portal>
          <Mention.Content
            className={cn(
              // Base UI wrapper styles
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=closed]:animate-out data-[state=open]:animate-in",
              // Custom sizing for agent popover with scroll
              "w-48 max-h-80 overflow-y-auto"
            )}
            side="top"
            align="start"
            sideOffset={8}
            avoidCollisions={true}
            fitViewport={true}
          >
          {error ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Bot size={16} />
              <span>Failed to load agents</span>
            </div>
          ) : !data ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Bot size={16} />
              <span>Loading agents...</span>
            </div>
          ) : mentionOptions.length === 0 ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Bot size={16} />
              <span>No agents available</span>
            </div>
          ) : (
            mentionOptions.map((agentName) => {
              const agent = agents.find(a => a.name === agentName);
              if (!agent) return null;
              
              return (
                <Mention.Item
                  key={agent.id}
                  value={agent.name}
                  className={cn(
                    // Base UI wrapper styles
                    "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50",
                    // Custom styling for agent items
                    "items-start gap-2"
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    <Bot size={14} className="text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {agent.name}
                    </div>
                    {agent.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 truncate">
                        {agent.description}
                      </div>
                    )}
                  </div>
                </Mention.Item>
              );
            })
          )}
          </Mention.Content>
        </Mention.Portal>
      </Mention.Root>
    );
  }
);

AgentMentionInput.displayName = 'AgentMentionInput';