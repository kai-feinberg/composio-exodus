'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Edit, Trash2, Bot, Save, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { fetcher } from '@/lib/utils';
import type { Agent } from '@/lib/db/schema';
import { toast } from 'sonner';
import { chatModels } from '@/lib/ai/models';

interface AgentManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AgentFormData {
  name: string;
  description: string;
  systemPrompt: string;
  modelId: string;
}

const initialFormData: AgentFormData = {
  name: '',
  description: '',
  systemPrompt: '',
  modelId: 'chat-model',
};

export function AgentManagement({ isOpen, onClose }: AgentManagementProps) {
  const { data, mutate } = useSWR<{ agents: Agent[] }>(
    '/api/agents',
    fetcher
  );

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const agents = data?.agents || [];

  const handleCreate = () => {
    setEditingAgent(null);
    setFormData(initialFormData);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description || '',
      systemPrompt: agent.systemPrompt,
      modelId: agent.modelId,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.systemPrompt.trim()) {
      toast.error('Name and system prompt are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingAgent ? `/api/agents/${editingAgent.id}` : '/api/agents';
      const method = editingAgent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          systemPrompt: formData.systemPrompt.trim(),
          modelId: formData.modelId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingAgent ? 'update' : 'create'} agent`);
      }

      toast.success(`Agent ${editingAgent ? 'updated' : 'created'} successfully`);
      setEditingAgent(null);
      setFormData(initialFormData);
      mutate();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error(`Failed to ${editingAgent ? 'update' : 'create'} agent`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      toast.success('Agent deleted successfully');
      mutate();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
    }
  };

  const handleCancel = () => {
    setEditingAgent(null);
    setFormData(initialFormData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot size={20} />
            Manage Agents
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Your Agents</h3>
              <Button onClick={handleCreate} size="sm">
                <Plus size={16} className="mr-1" />
                New Agent
              </Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {agents.map((agent) => (
                <Card key={agent.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm truncate">
                          {agent.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Model: {chatModels.find(m => m.id === agent.modelId)?.name}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handleEdit(agent)}
                          size="sm"
                          variant="ghost"
                          className="size-7 p-0"
                        >
                          <Edit size={12} />
                        </Button>
                        <Button
                          onClick={() => handleDelete(agent)}
                          size="sm"
                          variant="ghost"
                          className="size-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {agent.description && (
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {agent.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}

              {agents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No agents yet. Create your first agent to get started.</p>
                </div>
              )}
            </div>
          </div>

          {/* Agent Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              {editingAgent ? 'Edit Agent' : 'Create New Agent'}
            </h3>

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
                  placeholder="Brief description of the agent's purpose"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelId">Model</Label>
                <Select
                  value={formData.modelId}
                  onValueChange={(value) => setFormData({ ...formData, modelId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chatModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {model.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt *</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  placeholder="Define how the agent should behave and respond..."
                  rows={8}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <Save size={16} className="mr-1" />
                  {isSubmitting 
                    ? 'Saving...' 
                    : editingAgent 
                      ? 'Update Agent' 
                      : 'Create Agent'
                  }
                </Button>
                
                {editingAgent && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    <X size={16} className="mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}