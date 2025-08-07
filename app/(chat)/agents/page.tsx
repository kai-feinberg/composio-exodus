'use client';

import { useState, useEffect } from 'react';
import { Plus, Bot, Edit, Trash2, } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AgentManagement } from '@/components/agent-management';
import { ToolkitBadges } from '@/components/toolkit-badges';
import { chatModels } from '@/lib/ai/models';
import type { Agent } from '@/lib/db/schema';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAgentManagementOpen, setIsAgentManagementOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const { has, isLoaded } = useAuth();
  const router = useRouter();
  const isAdmin = has?.({ role: 'org:admin' }) ?? false;

  // No redirect - allow all users to view agents

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      const data = await response.json();
      setAgents(data.agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        type: 'error',
        description: 'Failed to load agents',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreateNew = () => {
    setEditingAgent(null);
    setIsAgentManagementOpen(true);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsAgentManagementOpen(true);
  };

  const handleDelete = async (agent: Agent) => {
    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      toast({
        type: 'success',
        description: 'Agent deleted successfully',
      });

      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        type: 'error',
        description: 'Failed to delete agent',
      });
    }
  };

  const handleCloseManagement = () => {
    setIsAgentManagementOpen(false);
    setEditingAgent(null);
    // Refresh agents list when management dialog closes
    fetchAgents();
  };

  // Show loading while auth is loading
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center py-12">
          <Bot className="mx-auto size-12 text-muted-foreground mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold mb-2">Loading agents...</h3>
          <p className="text-muted-foreground mb-4">
            Getting your organization&apos;s AI agents
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isAdmin ? 'Agent Management' : 'Available Agents'}
            </h1>
            <p className="text-muted-foreground">
              {isAdmin 
                ? 'Create and manage your organization&apos;s AI agents with support for .docx file uploads'
                : 'View and use your organization&apos;s available AI agents'
              }
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="size-4" />
              Create Agent
            </Button>
          )}
        </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            'agent-1',
            'agent-2',
            'agent-3',
            'agent-4',
            'agent-5',
            'agent-6',
          ].map((skeletonId) => (
            <Card key={skeletonId}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16 ml-2" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="mx-auto size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No agents available</h3>
          <p className="text-muted-foreground mb-4">
            {isAdmin 
              ? 'Create your first AI agent to get started. You can upload .docx files for system prompts!'
              : 'No AI agents have been created yet. Contact your administrator to create agents for your organization.'
            }
          </p>
          {isAdmin && (
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="size-4" />
              Create Your First Agent
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="size-5" />
                  {agent.name}
                </CardTitle>
                <CardDescription>
                  {agent.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Enabled Toolkits
                    </p>
                    <ToolkitBadges 
                      agentId={agent.id}
                      maxVisible={4}
                      variant="secondary"
                      size="sm"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Model
                    </p>
                    <p className="text-sm">
                      {chatModels.find((m) => m.id === agent.modelId)?.name ||
                        agent.modelId}
                    </p>
                  </div>
                  {isAdmin && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        System Prompt
                      </p>
                      <p className="text-sm line-clamp-3">{agent.systemPrompt}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              {isAdmin && (
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(agent)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="size-3" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{agent.name}
                          &quot;? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(agent)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      <AgentManagement
        isOpen={isAgentManagementOpen}
        onClose={handleCloseManagement}
        editingAgent={editingAgent}
      />
    </div>
  );
}
