'use client';

import { useState, useEffect } from 'react';
import { Save, Settings, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ToolToggle, ToolToggleCompact } from './tool-toggle';
import { composioClient } from '@/lib/composio/client';
import type { ComposioTool, EnabledToolsConfig } from '@/lib/composio/types';

interface ToolConfigManagerProps {
  userId: string;
  tools: ComposioTool[];
}

export function ToolConfigManager({ userId, tools }: ToolConfigManagerProps) {
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('compact');

  // Load existing configuration
  useEffect(() => {
    loadEnabledTools();
  }, [userId]);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [enabledTools]);

  const loadEnabledTools = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would load from your database/storage
      const savedConfig = localStorage.getItem(`composio-tools-${userId}`);
      if (savedConfig) {
        const config: EnabledToolsConfig = JSON.parse(savedConfig);
        setEnabledTools(new Set(config.enabledTools));
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Failed to load enabled tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const config: EnabledToolsConfig = {
        userId,
        enabledTools: Array.from(enabledTools),
        toolkitConfigs: {} // Could be expanded for per-toolkit auth configs
      };

      // In a real implementation, this would save to your database
      localStorage.setItem(`composio-tools-${userId}`, JSON.stringify(config));
      setHasChanges(false);
      
      console.log('Configuration saved:', config);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToolToggle = async (toolSlug: string, enabled: boolean) => {
    const newEnabledTools = new Set(enabledTools);
    
    if (enabled) {
      newEnabledTools.add(toolSlug);
    } else {
      newEnabledTools.delete(toolSlug);
    }
    
    setEnabledTools(newEnabledTools);
  };

  const enableAllTools = () => {
    const allToolSlugs = tools.map(tool => tool.slug);
    setEnabledTools(new Set(allToolSlugs));
  };

  const disableAllTools = () => {
    setEnabledTools(new Set());
  };

  const getToolsByToolkit = () => {
    const toolkitGroups = tools.reduce((acc, tool) => {
      if (!acc[tool.toolkitSlug]) {
        acc[tool.toolkitSlug] = [];
      }
      acc[tool.toolkitSlug].push(tool);
      return acc;
    }, {} as Record<string, ComposioTool[]>);

    return toolkitGroups;
  };

  const toolkitGroups = getToolsByToolkit();
  const enabledCount = enabledTools.size;
  const totalCount = tools.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="size-6 animate-spin" />
        <span className="ml-2">Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="tool-config-manager space-y-6">
      {/* Header with stats and actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="size-5" />
                Tool Configuration
              </CardTitle>
              <CardDescription>
                Manage which Composio tools are enabled for your AI agent
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {enabledCount} / {totalCount} enabled
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'detailed' ? 'compact' : 'detailed')}
              >
                {viewMode === 'detailed' ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {viewMode === 'detailed' ? 'Compact' : 'Detailed'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={enableAllTools} variant="outline" size="sm">
              Enable All
            </Button>
            <Button onClick={disableAllTools} variant="outline" size="sm">
              Disable All
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button 
              onClick={saveConfiguration} 
              disabled={!hasChanges || saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="size-4 mr-2" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
            
            {hasChanges && (
              <Badge variant="secondary">Unsaved changes</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tools organized by toolkit */}
      <Tabs defaultValue="by-toolkit" className="w-full">
        <TabsList>
          <TabsTrigger value="by-toolkit">By Toolkit</TabsTrigger>
          <TabsTrigger value="all-tools">All Tools</TabsTrigger>
          <TabsTrigger value="enabled-only">Enabled Only ({enabledCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="by-toolkit" className="space-y-4">
          {Object.entries(toolkitGroups).map(([toolkitSlug, toolkitTools]) => {
            const enabledInToolkit = toolkitTools.filter(tool => 
              enabledTools.has(tool.slug)
            ).length;

            return (
              <Card key={toolkitSlug}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{toolkitSlug}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {enabledInToolkit} / {toolkitTools.length} enabled
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Toggle all tools in this toolkit
                          const allEnabled = toolkitTools.every(tool => 
                            enabledTools.has(tool.slug)
                          );
                          
                          const newEnabledTools = new Set(enabledTools);
                          toolkitTools.forEach(tool => {
                            if (allEnabled) {
                              newEnabledTools.delete(tool.slug);
                            } else {
                              newEnabledTools.add(tool.slug);
                            }
                          });
                          setEnabledTools(newEnabledTools);
                        }}
                      >
                        {toolkitTools.every(tool => enabledTools.has(tool.slug)) 
                          ? 'Disable All' 
                          : 'Enable All'
                        }
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {toolkitTools.map(tool => (
                    viewMode === 'detailed' ? (
                      <ToolToggle
                        key={tool.slug}
                        tool={tool}
                        isEnabled={enabledTools.has(tool.slug)}
                        onToggle={handleToolToggle}
                        showDetails={true}
                      />
                    ) : (
                      <ToolToggleCompact
                        key={tool.slug}
                        tool={tool}
                        isEnabled={enabledTools.has(tool.slug)}
                        onToggle={handleToolToggle}
                      />
                    )
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="all-tools" className="space-y-3">
          {tools.map(tool => (
            viewMode === 'detailed' ? (
              <ToolToggle
                key={tool.slug}
                tool={tool}
                isEnabled={enabledTools.has(tool.slug)}
                onToggle={handleToolToggle}
                showDetails={true}
              />
            ) : (
              <ToolToggleCompact
                key={tool.slug}
                tool={tool}
                isEnabled={enabledTools.has(tool.slug)}
                onToggle={handleToolToggle}
              />
            )
          ))}
        </TabsContent>

        <TabsContent value="enabled-only" className="space-y-3">
          {tools
            .filter(tool => enabledTools.has(tool.slug))
            .map(tool => (
              viewMode === 'detailed' ? (
                <ToolToggle
                  key={tool.slug}
                  tool={tool}
                  isEnabled={true}
                  onToggle={handleToolToggle}
                  showDetails={true}
                />
              ) : (
                <ToolToggleCompact
                  key={tool.slug}
                  tool={tool}
                  isEnabled={true}
                  onToggle={handleToolToggle}
                />
              )
            ))}
          {enabledCount === 0 && (
            <div className="text-center py-8 text-gray-500">
              No tools enabled yet. Browse toolkits to find and enable tools.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}