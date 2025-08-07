'use client';

import { useState, useEffect } from 'react';
import { Bot, } from 'lucide-react';
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
import { ToolkitBadges } from '@/components/toolkit-badges';

interface PublicAgent {
  id: string;
  name: string;
  description?: string;
  modelId: string;
  userId: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function BrowseAgentsPage() {
  const [agents, setAgents] = useState<PublicAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents/browse');
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

  const handleUseAgent = (agent: PublicAgent) => {
    // This could redirect to a new chat with the agent selected
    // For now, we'll just show a toast
    toast({
      type: 'success',
      description: `Starting chat with ${agent.name}`,
    });
    // TODO: Implement chat redirection with agent selection
    // router.push(`/?agent=${agent.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Available Agents
          </h1>
          <p className="text-muted-foreground">
            Browse and use AI agents created by your organization administrators
          </p>
        </div>
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
                <Skeleton className="h-8 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="mx-auto size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No agents available</h3>
          <p className="text-muted-foreground mb-4">
            Your organization administrators haven&apos;t created any agents
            yet. Contact an admin to create some specialized agents for your
            team!
          </p>
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
                  {agent.description || 'No description available'}
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
                      Created
                    </p>
                    <p className="text-sm">
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
