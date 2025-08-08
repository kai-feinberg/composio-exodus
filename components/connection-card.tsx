'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, Loader2, Settings, Trash2 } from 'lucide-react';

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
  auth_type?: 'oauth' | 'api_key';
}

interface ConnectionCardProps {
  toolkit: Toolkit;
  onConnect: (toolkit: Toolkit) => Promise<void>;
  onDisconnect: (connectionId: string) => Promise<void>;
  isLoading?: boolean;
}

export function ConnectionCard({ toolkit, onConnect, onDisconnect, isLoading = false }: ConnectionCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect(toolkit);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!toolkit.connectionId) return;
    
    setIsDisconnecting(true);
    try {
      await onDisconnect(toolkit.connectionId);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {toolkit.logo ? (
              <img 
                src={toolkit.logo} 
                alt={`${toolkit.name} logo`}
                className="size-8 rounded-md"
              />
            ) : (
              <div className="size-8 rounded-md bg-muted flex items-center justify-center">
                <Settings className="size-4" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{toolkit.name}</CardTitle>
              {toolkit.categories && toolkit.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {toolkit.categories.slice(0, 2).map((category) => (
                    <Badge key={category.slug} variant="secondary" className="text-xs">
                      {category.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {toolkit.isConnected ? (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                <CheckCircle className="size-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="size-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4 min-h-[40px]">
          {toolkit.description || `Connect your ${toolkit.name} account to enable AI-powered automation and interactions.`}
        </CardDescription>
        
        <div className="flex justify-between items-center">
          {toolkit.isConnected ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={isDisconnecting || isLoading}
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-4 mr-2" />
                      Disconnect
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect {toolkit.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove access to your {toolkit.name} account. You can reconnect at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button 
              onClick={handleConnect}
              disabled={isConnecting || isLoading}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                `Connect ${toolkit.name}`
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}