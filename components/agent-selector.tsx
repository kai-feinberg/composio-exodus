'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Check, ChevronDown, Bot, Settings } from 'lucide-react';
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
  onManageAgents?: () => void;
  disabled?: boolean;
}

export function AgentSelector({
  selectedAgentId,
  onAgentChange,
  onManageAgents,
  disabled = false,
}: AgentSelectorProps) {
  const { data, error, mutate } = useSWR<{ agents: Agent[] }>(
    '/api/agents',
    fetcher
  );

  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize default agents if none exist
  useEffect(() => {
    if (!data || isInitialized) return;

    if (data.agents.length === 0) {
      // Initialize default agents
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
  }, [data, mutate, isInitialized]);

  const agents = data?.agents || [];
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) || agents[0];

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
            "flex items-center gap-2 text-sm h-8 px-2 hover:bg-muted/50",
            "border border-transparent hover:border-border",
            "focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
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
              <div className="font-medium text-sm truncate">
                {agent.name}
              </div>
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
        
        {onManageAgents && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onManageAgents}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Settings size={14} />
              Manage Agents
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}