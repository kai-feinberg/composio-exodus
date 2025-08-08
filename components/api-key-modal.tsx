'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Toolkit {
  name: string;
  slug: string;
  auth_type?: 'oauth' | 'api_key';
}

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolkit: Toolkit | null;
  onConnect: (apiKey: string, apiUrl?: string) => Promise<void>;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  toolkit,
  onConnect,
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      toast.error('Please enter your API key');
      return;
    }

    // Check if API URL is required for ActiveCampaign
    const isActiveCampaign = toolkit?.slug === 'active_campaign' || toolkit?.slug === 'activecampaign';
    if (isActiveCampaign && !apiUrl.trim()) {
      toast.error('Please enter your ActiveCampaign API URL');
      return;
    }

    setIsConnecting(true);
    try {
      await onConnect(apiKey.trim(), apiUrl.trim() || undefined);
      setApiKey('');
      setApiUrl('');
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    if (!isConnecting) {
      setApiKey('');
      setApiUrl('');
      onClose();
    }
  };

  const getApiKeyPlaceholder = (toolkitName: string) => {
    const placeholders: Record<string, string> = {
      'active_campaign': 'Enter your Active Campaign API key',
      'activecampaign': 'Enter your Active Campaign API key',
      'openai': 'sk-...',
      'anthropic': 'ak-...',
      default: 'Enter your API key'
    };

    const key = toolkitName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return placeholders[key] || placeholders.default;
  };

  const getInstructions = (toolkitName: string) => {
    const instructions: Record<string, string> = {
      'active_campaign': 'You can find your API key and API URL in your ActiveCampaign account under Settings > Developer.',
      'activecampaign': 'You can find your API key and API URL in your ActiveCampaign account under Settings > Developer.',
      default: `You can find your API key in your ${toolkitName} account settings.`
    };

    const key = toolkitName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return instructions[key] || instructions.default;
  };

  if (!toolkit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Connect {toolkit.name}</DialogTitle>
            <DialogDescription>
              Enter your API key to connect your {toolkit.name} account.
              {' '}
              {getInstructions(toolkit.slug)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apiKey" className="text-right">
                API Key
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={getApiKeyPlaceholder(toolkit.slug)}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isConnecting}
                  className="pr-10"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                  disabled={isConnecting}
                >
                  {showApiKey ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Show API URL field for ActiveCampaign */}
            {(toolkit.slug === 'active_campaign' || toolkit.slug === 'activecampaign') && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="apiUrl" className="text-right">
                  API URL
                </Label>
                <div className="col-span-3">
                  <Input
                    id="apiUrl"
                    type="text"
                    placeholder="https://youraccount.api-us1.com"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    disabled={isConnecting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your ActiveCampaign API URL (found in Settings → Developer)
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isConnecting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                isConnecting || 
                !apiKey.trim() || 
                ((toolkit?.slug === 'active_campaign' || toolkit?.slug === 'activecampaign') && !apiUrl.trim())
              }
            >
              {isConnecting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}