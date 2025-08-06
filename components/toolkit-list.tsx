'use client';

import { useState, useEffect } from 'react';
import { ConnectionCard } from './connection-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Toolkit {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  categories?: Array<{
    name: string;
    slug: string;
  }>;
  isConnected: boolean;
  connectionId?: string;
}

interface ToolkitListProps {
  onConnectionChange?: () => void;
}

export function ToolkitList({ onConnectionChange }: ToolkitListProps) {
  const [toolkits, setToolkits] = useState<Toolkit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToolkits = async () => {
    try {
      setError(null);
      const response = await fetch('/api/toolkits');

      if (!response.ok) {
        throw new Error(`Failed to fetch toolkits: ${response.statusText}`);
      }

      const data = await response.json();
      setToolkits(data.toolkits || []);
    } catch (error) {
      console.error('Failed to fetch toolkits:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load toolkits',
      );
      toast.error('Failed to load available services');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (toolkit: Toolkit) => {
    try {
      // Map toolkit slugs to their corresponding auth config IDs
      const authConfigMap: Record<string, string> = {
        youtube: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_YOUTUBE || '',
        twitter: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_TWITTER || '',
        reddit: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_REDDIT || '',
        notion: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_NOTION || '',
        slack: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_SLACK || '',
        slackbot: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_SLACKBOT || '',
        active_campaign:
          process.env.NEXT_PUBLIC_COMPOSIO_AUTH_ACTIVE_CAMPAIGN || '',
        exa: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_EXA || '',
        googledocs: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_GOOGLEDOCS || '',
        gmail: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_GMAIL || '',
        googledrive: process.env.NEXT_PUBLIC_COMPOSIO_AUTH_GOOGLEDRIVE || '',
      };

      const authConfigId = authConfigMap[toolkit.slug];

      if (!authConfigId) {
        toast.error(
          `No auth configuration found for ${toolkit.name}. Please check your environment variables.`,
        );
        return;
      }

      // Initiate the connection
      const response = await fetch('/api/connections/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authConfigId,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to initiate connection: ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (data.redirectUrl) {
        // Open the OAuth URL in a new window
        const authWindow = window.open(
          data.redirectUrl,
          'oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes',
        );

        if (!authWindow) {
          toast.error('Please allow popups to complete the connection');
          return;
        }

        // Poll for connection status
        const pollStatus = async () => {
          try {
            const statusResponse = await fetch(
              `/api/connections/status?connectionId=${data.connectionId}`,
            );

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();

              if (statusData.status === 'ACTIVE') {
                connectionCompleted = true;
                authWindow.close();
                toast.success(`Successfully connected to ${toolkit.name}!`);
                await fetchToolkits(); // Refresh the list
                onConnectionChange?.();
                return;
              } else if (
                statusData.status === 'FAILED' ||
                statusData.status === 'EXPIRED'
              ) {
                connectionCompleted = true;
                authWindow.close();
                toast.error(`Failed to connect to ${toolkit.name}`);
                return;
              }
            }

            // Continue polling if still in progress
            setTimeout(pollStatus, 2000);
          } catch (error) {
            console.error('Error polling connection status:', error);
            // Continue polling on error
            setTimeout(pollStatus, 2000);
          }
        };

        // Start polling after a short delay
        setTimeout(pollStatus, 2000);

        // Also listen for the window to close manually
        let connectionCompleted = false;
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            // Only refresh if connection wasn't already completed
            if (!connectionCompleted) {
              // User closed window manually - check final status after a delay
              setTimeout(async () => {
                try {
                  const statusResponse = await fetch(
                    `/api/connections/status?connectionId=${data.connectionId}`,
                  );
                  if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    if (statusData.status === 'ACTIVE') {
                      toast.success(`Successfully connected to ${toolkit.name}!`);
                      await fetchToolkits();
                      onConnectionChange?.();
                    } else if (statusData.status === 'FAILED' || statusData.status === 'EXPIRED') {
                      toast.error(`Failed to connect to ${toolkit.name}`);
                    }
                    // For other statuses (INITIALIZING, INITIATED), don't show anything
                    // as the connection was likely cancelled
                  }
                } catch (error) {
                  // Don't show error for cancelled connections
                  console.log('Connection check after window close failed:', error);
                }
              }, 2000);
            }
          }
        }, 1000);
      } else {
        toast.error('No authorization URL received');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      toast.error(`Failed to connect to ${toolkit.name}`);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      const response = await fetch(
        `/api/connections?connectionId=${connectionId}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to disconnect: ${response.statusText}`);
      }

      toast.success('Successfully disconnected');
      await fetchToolkits(); // Refresh the list
      onConnectionChange?.();
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect service');
    }
  };

  useEffect(() => {
    fetchToolkits();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin" />
        <span className="ml-2">Loading available services...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8">
          <AlertCircle className="size-8 text-destructive mb-2" />
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchToolkits} variant="outline">
            <RefreshCw className="size-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const connectedToolkits = toolkits.filter((t) => t.isConnected);
  const availableToolkits = toolkits.filter((t) => !t.isConnected);

  return (
    <div className="space-y-8">
      {/* Connected Services */}
      {connectedToolkits.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Connected Services</h2>
            <Button onClick={fetchToolkits} variant="outline" size="sm">
              <RefreshCw className="size-4 mr-2" />
              Refresh
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedToolkits.map((toolkit) => (
              <ConnectionCard
                key={toolkit.slug}
                toolkit={toolkit}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Services */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Available Services</h2>
            <p className="text-muted-foreground text-sm">
              Connect your accounts to enable AI-powered automation
            </p>
          </div>
          {connectedToolkits.length === 0 && (
            <Button onClick={fetchToolkits} variant="outline" size="sm">
              <RefreshCw className="size-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>

        {availableToolkits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableToolkits.map((toolkit) => (
              <ConnectionCard
                key={toolkit.slug}
                toolkit={toolkit}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <p className="text-muted-foreground">
                All available services are connected!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="space-y-2">
            <p>
              Connect your external accounts to enable AI-powered automation in
              your chats. Once connected, you can ask the AI to perform actions
              like:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <strong>Gmail:</strong> Send emails, read your inbox, organize
                messages
              </li>
              <li>
                <strong>Google Docs:</strong> Create, edit, and manage documents
              </li>
              <li>
                <strong>Google Drive:</strong> Manage files, folders, and
                sharing permissions
              </li>
              <li>
                <strong>Twitter:</strong> Post tweets, manage your Twitter
                presence, engage with followers
              </li>
              <li>
                <strong>YouTube:</strong> Manage your channel, upload videos,
                and interact with content
              </li>
              <li>
                <strong>Reddit:</strong> Post content, manage subreddits, and
                engage with communities
              </li>
              <li>
                <strong>Notion:</strong> Create and manage pages, databases, and
                workspace content
              </li>
              <li>
                <strong>Slack:</strong> Send messages, manage channels, and
                collaborate with your team
              </li>
              <li>
                <strong>Active Campaign:</strong> Manage email marketing
                campaigns and automation
              </li>
              <li>
                <strong>EXA:</strong> Enhanced web search and content discovery
              </li>
            </ul>
            <p className="mt-4 text-sm">
              Your data is secure - we only access what you explicitly authorize
              through OAuth.
            </p>
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
