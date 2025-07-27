'use client';

import { useState, useEffect } from 'react';
import { Plus, Bot, Edit, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/toast';

interface Agent {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  modelId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface AgentFormData {
  name: string;
  description: string;
  systemPrompt: string;
  modelId: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    systemPrompt: '',
    modelId: 'chat-model',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.systemPrompt.trim()) {
      toast({
        type: 'error',
        description: 'Name and system prompt are required',
      });
      return;
    }

    try {
      const url = editingAgent ? `/api/agents/${editingAgent.id}` : '/api/agents';
      const method = editingAgent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingAgent ? 'update' : 'create'} agent`);
      }

      toast({
        type: 'success',
        description: `Agent ${editingAgent ? 'updated' : 'created'} successfully`,
      });

      setFormData({ name: '', description: '', systemPrompt: '', modelId: 'chat-model' });
      setIsCreateDialogOpen(false);
      setEditingAgent(null);
      fetchAgents();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast({
        type: 'error',
        description: `Failed to ${editingAgent ? 'update' : 'create'} agent`,
      });
    }
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description || '',
      systemPrompt: agent.systemPrompt,
      modelId: agent.modelId,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
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

  const handleCreateNew = () => {
    setEditingAgent(null);
    setFormData({ name: '', description: '', systemPrompt: '', modelId: 'chat-model' });
    setIsCreateDialogOpen(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', systemPrompt: '', modelId: 'chat-model' });
    setIsCreateDialogOpen(false);
    setEditingAgent(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Management</h1>
          <p className="text-muted-foreground">Create and manage your AI agents</p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="size-4" />
          Create Agent
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5', 'agent-6'].map((skeletonId) => (
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
          <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first AI agent to get started
          </p>
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="size-4" />
            Create Your First Agent
          </Button>
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
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Model</Label>
                    <p className="text-sm">{agent.modelId}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">System Prompt</Label>
                    <p className="text-sm line-clamp-3">{agent.systemPrompt}</p>
                  </div>
                </div>
              </CardContent>
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
                        Are you sure you want to delete &quot;{agent.name}&quot;? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(agent.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-screen-toast-mobile">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? 'Edit Agent' : 'Create New Agent'}
            </DialogTitle>
            <DialogDescription>
              {editingAgent
                ? 'Update your agent\'s configuration'
                : 'Create a new AI agent with custom instructions'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter agent name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter agent description (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelId">Model</Label>
              <Select
                value={formData.modelId}
                onValueChange={(value) => setFormData({ ...formData, modelId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chat-model">Chat Model</SelectItem>
                  <SelectItem value="chat-model-reasoning">Chat Model with Reasoning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt *</Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                placeholder="Enter the system prompt that defines the agent's behavior..."
                rows={6}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="size-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit">
                <Save className="size-4 mr-2" />
                {editingAgent ? 'Update Agent' : 'Create Agent'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}