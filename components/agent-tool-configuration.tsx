'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, Search, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Tool {
  slug: string;
  toolkitSlug: string;
  toolkitName: string;
  displayName?: string;
  description?: string;
  isEnabled: boolean;
}

interface GroupedTools {
  [toolkitName: string]: Tool[];
}

interface AgentToolConfigurationProps {
  agentId: string;
  agentName?: string;
  onConfigurationChange?: () => void;
}

export function AgentToolConfiguration({ 
  agentId, 
  agentName,
  onConfigurationChange 
}: AgentToolConfigurationProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedToolkits, setExpandedToolkits] = useState<Set<string>>(new Set());

  const fetchAgentTools = useCallback(async () => {
    try {
      const response = await fetch(`/api/tools/agent/${agentId}`);
      if (!response.ok) throw new Error('Failed to fetch agent tools');
      
      const data = await response.json();
      setTools(data.tools || []);
      
      // Auto-expand toolkits with enabled tools
      const toolkitsWithEnabledTools = new Set<string>();
      data.tools?.forEach((tool: Tool) => {
        if (tool.isEnabled) {
          toolkitsWithEnabledTools.add(tool.toolkitName);
        }
      });
      setExpandedToolkits(toolkitsWithEnabledTools);
    } catch (error) {
      console.error('Failed to fetch agent tools:', error);
      toast.error('Failed to load agent tool configuration');
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgentTools();
  }, [fetchAgentTools]);

  const handleToolToggle = async (toolSlug: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/tools/agent/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolSlug, enabled }),
      });

      if (!response.ok) throw new Error('Failed to update tool configuration');

      setTools(prev => prev.map(tool => 
        tool.slug === toolSlug ? { ...tool, isEnabled: enabled } : tool
      ));

      toast.success(`${enabled ? 'Enabled' : 'Disabled'} tool for agent`);
      onConfigurationChange?.();
    } catch (error) {
      console.error('Failed to update agent tool configuration:', error);
      toast.error('Failed to update tool configuration');
    }
  };

  const handleToolkitToggle = async (toolkitName: string, enabled: boolean) => {
    const toolkitTools = groupedTools[toolkitName];
    const toolUpdates = toolkitTools.map(tool => ({ slug: tool.slug, enabled }));

    try {
      const response = await fetch(`/api/tools/agent/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: toolUpdates }),
      });

      if (!response.ok) throw new Error('Failed to bulk update tools');

      setTools(prev => prev.map(tool => 
        toolkitTools.some(t => t.slug === tool.slug) 
          ? { ...tool, isEnabled: enabled }
          : tool
      ));

      toast.success(`${enabled ? 'Enabled' : 'Disabled'} all ${toolkitName} tools for agent`);
      onConfigurationChange?.();
    } catch (error) {
      console.error('Failed to bulk update agent tools:', error);
      toast.error('Failed to update toolkit tools');
    }
  };

  const copyFromUserDefaults = async () => {
    try {
      // First fetch user tool preferences
      const userResponse = await fetch('/api/tools/user');
      if (!userResponse.ok) throw new Error('Failed to fetch user tools');
      
      const userData = await userResponse.json();
      const enabledUserTools = userData.tools.filter((tool: Tool) => tool.isEnabled);
      
      if (enabledUserTools.length === 0) {
        toast.info('No user tools enabled to copy');
        return;
      }

      // Apply user preferences to agent
      const toolUpdates = enabledUserTools.map((tool: Tool) => ({ slug: tool.slug, enabled: true }));
      
      const response = await fetch(`/api/tools/agent/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: toolUpdates }),
      });

      if (!response.ok) throw new Error('Failed to copy user tools');

      // Refresh agent tools
      await fetchAgentTools();
      toast.success('Copied enabled tools from user defaults');
      onConfigurationChange?.();
    } catch (error) {
      console.error('Failed to copy user tools:', error);
      toast.error('Failed to copy user tool preferences');
    }
  };

  const toggleToolkitExpansion = (toolkitName: string) => {
    setExpandedToolkits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolkitName)) {
        newSet.delete(toolkitName);
      } else {
        newSet.add(toolkitName);
      }
      return newSet;
    });
  };

  // Filter and group tools
  const filteredTools = tools.filter(tool => {
    const searchLower = searchQuery.toLowerCase();
    return (
      tool.displayName?.toLowerCase().includes(searchLower) ||
      tool.toolkitName.toLowerCase().includes(searchLower) ||
      tool.description?.toLowerCase().includes(searchLower) ||
      tool.slug.toLowerCase().includes(searchLower)
    );
  });

  const groupedTools: GroupedTools = filteredTools.reduce((acc, tool) => {
    if (!acc[tool.toolkitName]) {
      acc[tool.toolkitName] = [];
    }
    acc[tool.toolkitName].push(tool);
    return acc;
  }, {} as GroupedTools);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin mr-2" />
        <span>Loading agent tool configuration...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tool Configuration</CardTitle>
            <CardDescription>
              Configure which tools are available for {agentName || 'this agent'}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={copyFromUserDefaults} size="sm">
            <Copy className="size-4 mr-2" />
            Copy from User Defaults
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-6">
          <Search className="size-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="space-y-4">
          {Object.entries(groupedTools).map(([toolkitName, toolkitTools]) => {
            const enabledCount = toolkitTools.filter(tool => tool.isEnabled).length;
            const totalCount = toolkitTools.length;
            const isExpanded = expandedToolkits.has(toolkitName);

            return (
              <Card key={toolkitName} className="border-l-4 border-l-primary/20">
                <Collapsible open={isExpanded} onOpenChange={() => toggleToolkitExpansion(toolkitName)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground" />
                          )}
                          <div>
                            <CardTitle className="text-lg">{toolkitName}</CardTitle>
                            <CardDescription>
                              {enabledCount} of {totalCount} tools enabled
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={enabledCount > 0 ? "default" : "secondary"}>
                            {enabledCount}/{totalCount}
                          </Badge>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToolkitToggle(toolkitName, true);
                              }}
                              disabled={enabledCount === totalCount}
                            >
                              Enable All
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToolkitToggle(toolkitName, false);
                              }}
                              disabled={enabledCount === 0}
                            >
                              Disable All
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3 pt-0">
                      {toolkitTools.map((tool) => (
                        <div
                          key={tool.slug}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">
                                {tool.displayName || tool.slug}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {tool.slug}
                              </Badge>
                            </div>
                            {tool.description && (
                              <p className="text-sm text-muted-foreground">
                                {tool.description}
                              </p>
                            )}
                          </div>
                          <Switch
                            checked={tool.isEnabled}
                            onCheckedChange={(checked) => handleToolToggle(tool.slug, checked)}
                          />
                        </div>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>

        {Object.keys(groupedTools).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No tools match your search query.' : 'No tools available.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}