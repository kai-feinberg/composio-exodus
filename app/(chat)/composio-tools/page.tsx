'use client';

import { useState } from 'react';
import { Settings, Search, Zap, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToolkitExplorer } from '@/components/composio/toolkit-explorer';
import { ToolConfigManager } from '@/components/composio/tool-config-manager';
import { useComposioTools } from '@/hooks/use-composio-tools';
import type { ComposioTool } from '@/lib/composio/types';

export default function ComposioToolsPage() {
  const [selectedTools, setSelectedTools] = useState<ComposioTool[]>([]);
  const [activeTab, setActiveTab] = useState('explore');
  
  // For now, using a default user ID - in a real app this would come from auth
  const userId = 'default';
  
  const {
    tools,
    toolkits,
    enabledTools,
    loading,
    error,
    getEnabledTools,
    getEnabledToolsByToolkit
  } = useComposioTools(userId);

  const handleToolsSelected = (newTools: ComposioTool[]) => {
    setSelectedTools(newTools);
    if (newTools.length > 0 && activeTab === 'explore') {
      setActiveTab('configure');
    }
  };

  const enabledToolsData = getEnabledTools();
  const enabledByToolkit = getEnabledToolsByToolkit();

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="size-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Composio Tools</h1>
            <p className="text-gray-600">
              Discover and configure AI tools for your chatbot
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Available Toolkits</p>
                  <p className="text-2xl font-bold">{toolkits.length}</p>
                </div>
                <BookOpen className="size-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Available Tools</p>
                  <p className="text-2xl font-bold">{tools.length}</p>
                </div>
                <Search className="size-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Enabled Tools</p>
                  <p className="text-2xl font-bold">{enabledTools.length}</p>
                </div>
                <Settings className="size-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Toolkits</p>
                  <p className="text-2xl font-bold">{Object.keys(enabledByToolkit).length}</p>
                </div>
                <Zap className="size-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enabled Tools Quick View */}
        {enabledTools.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Currently Enabled Tools</CardTitle>
              <CardDescription>
                These tools are active and available for your AI agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(enabledByToolkit).map(([toolkitSlug, toolkitTools]) => (
                  <div key={toolkitSlug} className="flex items-center gap-2">
                    <Badge variant="outline" className="font-medium">
                      {toolkitSlug}
                    </Badge>
                    <div className="flex flex-wrap gap-1">
                      {toolkitTools.slice(0, 5).map(tool => (
                        <Badge key={tool.slug} variant="secondary" className="text-xs">
                          {tool.name}
                        </Badge>
                      ))}
                      {toolkitTools.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{toolkitTools.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="explore" className="flex items-center gap-2">
            <Search className="size-4" />
            Explore Tools
          </TabsTrigger>
          <TabsTrigger value="configure" className="flex items-center gap-2">
            <Settings className="size-4" />
            Configure Tools
            {selectedTools.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedTools.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Discover Tools</h2>
              <p className="text-gray-600">
                Browse available toolkits and search for specific tools like Twitter bookmarks, 
                GitHub issues, Gmail sending, and more.
              </p>
            </div>

            <ToolkitExplorer
              userId={userId}
              onToolsSelected={handleToolsSelected}
            />
          </div>
        </TabsContent>

        <TabsContent value="configure" className="space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Configure Tools</h2>
              <p className="text-gray-600">
                Enable or disable individual tools. Only enabled tools will be available 
                to your AI agent for execution.
              </p>
            </div>

            {selectedTools.length > 0 ? (
              <ToolConfigManager
                userId={userId}
                tools={selectedTools}
              />
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center space-y-4">
                    <Settings className="size-12 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="text-lg font-medium">No Tools Selected</h3>
                      <p className="text-gray-600">
                        Go to the &quot;Explore Tools&quot; tab to browse and select tools to configure.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Use Cases</CardTitle>
          <CardDescription>
            Here are some examples of what you can do with Composio tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Twitter Bookmarks</h4>
              <p className="text-sm text-gray-600 mb-2">
                Save interesting tweets to your bookmarks automatically
              </p>
              <Badge variant="outline" className="text-xs">TWITTER_CREATE_BOOKMARK</Badge>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">GitHub Issues</h4>
              <p className="text-sm text-gray-600 mb-2">
                Create and manage GitHub issues from your chat
              </p>
              <Badge variant="outline" className="text-xs">GITHUB_CREATE_ISSUE</Badge>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Send Emails</h4>
              <p className="text-sm text-gray-600 mb-2">
                Compose and send emails through Gmail
              </p>
              <Badge variant="outline" className="text-xs">GMAIL_SEND_EMAIL</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}