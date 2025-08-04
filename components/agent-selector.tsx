'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Check, ChevronDown, Bot } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { fetcher, cn } from '@/lib/utils';
import type { Agent } from '@/lib/db/schema';
import { toast } from 'sonner';

interface AgentSelectorProps {
  selectedAgentId?: string;
  onAgentChange: (agentId: string) => void;
  disabled?: boolean;
}

export function AgentSelector({
  selectedAgentId,
  onAgentChange,
  disabled = false,
}: AgentSelectorProps) {
  const { has } = useAuth();
  const isAdmin = has?.({ role: 'org:admin' }) ?? false;

  // Use admin endpoint for admins, browse endpoint for regular users
  const apiEndpoint = isAdmin ? '/api/agents' : '/api/agents/browse';

  const { data, error, mutate } = useSWR<{ agents: Agent[] }>(
    apiEndpoint,
    fetcher,
  );

  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize default agents if none exist (admin only)
  useEffect(() => {
    if (!data || isInitialized) return;

    if (data.agents.length === 0 && isAdmin) {
      // Initialize default agents (only for admins)
      fetch('/api/agents/initialize', {
        method: 'POST',
      })
        .then((res) => res.json())
        .then(() => {
          mutate(); // Refresh the agents list
          setIsInitialized(true);
        })
        .catch((err) => {
          console.error('Failed to initialize agents:', err);
          toast.error('Failed to initialize default agents');
        });
    } else {
      setIsInitialized(true);
    }
  }, [data, mutate, isInitialized, isAdmin]);

  const agents = data?.agents || [];
  const selectedAgent =
    agents.find((agent) => agent.id === selectedAgentId) || agents[0];

  // Ensure proper state synchronization when falling back to first agent
  useEffect(() => {
    // Only trigger fallback after data is loaded and component is initialized
    if (
      data &&
      isInitialized &&
      agents.length > 0 &&
      !selectedAgentId &&
      selectedAgent &&
      onAgentChange
    ) {
      console.log(
        '🔄 AgentSelector: No agent selected, triggering fallback to first agent:',
        selectedAgent.id,
      );
      onAgentChange(selectedAgent.id);
    }
  }, [
    data,
    isInitialized,
    agents,
    selectedAgentId,
    selectedAgent,
    onAgentChange,
  ]);

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bot size={16} />
        <span>Failed to load agents</span>
      </div>
    );
  }

  if (!data || agents.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bot size={16} />
        <span>Loading agents...</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 text-sm h-8 px-2 hover:bg-muted/50',
            'border border-transparent hover:border-border',
            'focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring',
          )}
        >
          <Bot size={16} />
          <span className="truncate max-w-[150px]">
            {selectedAgent?.name || 'Select Agent'}
          </span>
          <ChevronDown size={14} className="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Bot size={14} />
          Choose Agent
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {agents.map((agent) => (
          <DropdownMenuItem
            key={agent.id}
            onClick={() => onAgentChange(agent.id)}
            className="flex items-start gap-3 py-3 cursor-pointer"
          >
            <div className="shrink-0 mt-0.5">
              {selectedAgentId === agent.id ? (
                <Check size={14} className="text-primary" />
              ) : (
                <div className="size-3.5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{agent.name}</div>
              {agent.description && (
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {agent.description}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                Model: {agent.modelId === 'chat-model' ? 'Chat' : 'Reasoning'}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
