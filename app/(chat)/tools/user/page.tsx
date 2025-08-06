'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Settings, ChevronDown, ChevronRight } from 'lucide-react';
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

export default function UserToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedToolkits, setExpandedToolkits] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/tools/user');
      if (!response.ok) throw new Error('Failed to fetch tools');
      
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
      console.error('Failed to fetch tools:', error);
      toast.error('Failed to load tool preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolToggle = async (toolSlug: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/tools/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolSlug, enabled }),
      });

      if (!response.ok) throw new Error('Failed to update tool preference');

      setTools(prev => prev.map(tool => 
        tool.slug === toolSlug ? { ...tool, isEnabled: enabled } : tool
      ));

      toast.success(`${enabled ? 'Enabled' : 'Disabled'} tool successfully`);
    } catch (error) {
      console.error('Failed to update tool preference:', error);
      toast.error('Failed to update tool preference');
    }
  };

  const handleToolkitToggle = async (toolkitName: string, enabled: boolean) => {
    const toolkitTools = groupedTools[toolkitName];
    const toolUpdates = toolkitTools.map(tool => ({ slug: tool.slug, enabled }));

    try {
      const response = await fetch('/api/tools/user', {
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

      toast.success(`${enabled ? 'Enabled' : 'Disabled'} all ${toolkitName} tools`);
    } catch (error) {
      console.error('Failed to bulk update tools:', error);
      toast.error('Failed to update toolkit tools');
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
        <span>Loading tool preferences...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="size-6" />
        <h1 className="text-2xl font-bold">Tool Preferences</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configure Your Tools</CardTitle>
          <CardDescription>
            Select which tools you want to have available when chatting. 
            These preferences apply when using the default assistant or agents without specific tool configurations.
          </CardDescription>
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
    </div>
  );
}