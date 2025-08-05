'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Grid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { composioClient } from '@/lib/composio/client';
import type { Toolkit, ComposioTool } from '@/lib/composio/types';

interface ToolkitExplorerProps {
  userId: string;
  onToolsSelected: (tools: ComposioTool[]) => void;
}

export function ToolkitExplorer({ userId, onToolsSelected }: ToolkitExplorerProps) {
  const [toolkits, setToolkits] = useState<Toolkit[]>([]);
  const [selectedToolkit, setSelectedToolkit] = useState<string | null>(null);
  const [tools, setTools] = useState<ComposioTool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load all available toolkits on mount
  useEffect(() => {
    loadToolkits();
  }, []);

  // Load toolkit tools when a toolkit is selected
  useEffect(() => {
    if (selectedToolkit) {
      loadToolkitTools(selectedToolkit);
    }
  }, [selectedToolkit, userId]);

  const loadToolkits = async () => {
    setLoading(true);
    try {
      const allToolkits = await composioClient.getToolkits();
      setToolkits(allToolkits);
    } catch (error) {
      console.error('Failed to load toolkits:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadToolkitTools = async (toolkitSlug: string) => {
    setToolsLoading(true);
    try {
      const toolkitTools = await composioClient.getToolkitTools(userId, toolkitSlug);
      setTools(toolkitTools);
      onToolsSelected(toolkitTools);
    } catch (error) {
      console.error('Failed to load toolkit tools:', error);
    } finally {
      setToolsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setToolsLoading(true);
    try {
      const searchResults = await composioClient.searchTools(
        userId, 
        searchQuery,
        selectedToolkit ? [selectedToolkit] : undefined
      );
      setTools(searchResults);
      onToolsSelected(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setToolsLoading(false);
    }
  };

  const handleToolkitSelect = (toolkitSlug: string) => {
    setSelectedToolkit(toolkitSlug);
    setSearchQuery(''); // Clear search when switching toolkits
  };

  const clearSelection = () => {
    setSelectedToolkit(null);
    setTools([]);
    setSearchQuery('');
    onToolsSelected([]);
  };

  return (
    <div className="toolkit-explorer space-y-6">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-4" />
          <Input
            placeholder="Search tools (e.g., 'bookmark', 'send tweet', 'upload file')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={!searchQuery.trim() || toolsLoading}>
          Search
        </Button>
        {selectedToolkit && (
          <Button variant="outline" onClick={clearSelection}>
            Clear Selection
          </Button>
        )}
      </div>

      <Tabs defaultValue="toolkits" className="w-full">
        <TabsList>
          <TabsTrigger value="toolkits">Browse Toolkits</TabsTrigger>
          <TabsTrigger value="tools" disabled={tools.length === 0}>
            Tools ({tools.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="toolkits" className="space-y-4">
          {/* Toolkit Grid */}
          {loading ? (
            <div className="text-center py-8">Loading toolkits...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {toolkits?.map(toolkit => (
                <Card 
                  key={toolkit.key}
                  className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedToolkit === toolkit.key ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleToolkitSelect(toolkit.key)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{toolkit.displayName}</CardTitle>
                      <Badge variant="secondary">{toolkit.meta?.actionsCount || 0} tools</Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {toolkit.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="flex flex-wrap gap-1">
                      {toolkit.categories?.map(category => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                      {toolkit.auth_schemes?.map(scheme => (
                        <Badge key={scheme} variant="outline" className="text-xs">
                          {scheme}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )) || []}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          {/* View Mode Toggle */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {selectedToolkit ? `${selectedToolkit} Tools` : 'Search Results'}
            </h3>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="size-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>

          {/* Tools Display */}
          {toolsLoading ? (
            <div className="text-center py-8">Loading tools...</div>
          ) : tools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tools found. Try searching or selecting a toolkit.
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map(tool => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {tools.map(tool => (
                <ToolListItem key={tool.slug} tool={tool} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToolCard({ tool }: { tool: ComposioTool }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{tool.name}</CardTitle>
          {tool.requiresAuth && (
            <Badge variant="secondary" className="text-xs">Auth Required</Badge>
          )}
        </div>
        <CardDescription className="text-sm">
          {tool.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {tool.toolkitSlug}
          </Badge>
          {tool.requiredScopes?.map(scope => (
            <Badge key={scope} variant="outline" className="text-xs">
              {scope}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ToolListItem({ tool }: { tool: ComposioTool }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{tool.name}</span>
          {tool.requiresAuth && (
            <Badge variant="secondary" className="text-xs">Auth</Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {tool.toolkitSlug}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
      </div>
    </div>
  );
}