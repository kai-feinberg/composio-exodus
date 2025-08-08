'use client';

import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Toolkit {
  toolkitName: string;
  toolkitSlug: string;
  toolCount: number;
  description?: string;
  isEnabled: boolean;
}

interface AgentToolkitSelectorProps {
  agentId: string;
  agentName?: string;
  onConfigurationChange?: () => void;
}

export function AgentToolkitSelector({
  agentId,
  agentName,
  onConfigurationChange,
}: AgentToolkitSelectorProps) {
  const [toolkits, setToolkits] = useState<Toolkit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAgentToolkits = useCallback(async () => {
    try {
      const response = await fetch(`/api/tools/agent/${agentId}/toolkits`);
      if (!response.ok) throw new Error('Failed to fetch agent toolkits');

      const data = await response.json();
      setToolkits(data.toolkits || []);
    } catch (error) {
      console.error('Failed to fetch agent toolkits:', error);
      toast.error('Failed to load agent toolkit configuration');
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgentToolkits();
  }, [fetchAgentToolkits]);

  const handleToolkitToggle = async (toolkitName: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/tools/agent/${agentId}/toolkits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolkitName, enabled }),
      });

      if (!response.ok)
        throw new Error('Failed to update toolkit configuration');

      setToolkits((prev) =>
        prev.map((toolkit) =>
          toolkit.toolkitName === toolkitName
            ? { ...toolkit, isEnabled: enabled }
            : toolkit,
        ),
      );

      toast.success(
        `${enabled ? 'Enabled' : 'Disabled'} ${toolkitName} toolkit for agent`,
      );
      onConfigurationChange?.();
    } catch (error) {
      console.error('Failed to update agent toolkit configuration:', error);
      toast.error('Failed to update toolkit configuration');
    }
  };

  const handleSelectAll = async () => {
    try {
      const response = await fetch(
        `/api/tools/agent/${agentId}/toolkits/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: true }),
        },
      );

      if (!response.ok) throw new Error('Failed to enable all toolkits');

      setToolkits((prev) =>
        prev.map((toolkit) => ({ ...toolkit, isEnabled: true })),
      );
      toast.success('Enabled all toolkits for agent');
      onConfigurationChange?.();
    } catch (error) {
      console.error('Failed to enable all toolkits:', error);
      toast.error('Failed to enable all toolkits');
    }
  };

  const handleSelectNone = async () => {
    try {
      const response = await fetch(
        `/api/tools/agent/${agentId}/toolkits/bulk`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: false }),
        },
      );

      if (!response.ok) throw new Error('Failed to disable all toolkits');

      setToolkits((prev) =>
        prev.map((toolkit) => ({ ...toolkit, isEnabled: false })),
      );
      toast.success('Disabled all toolkits for agent');
      onConfigurationChange?.();
    } catch (error) {
      console.error('Failed to disable all toolkits:', error);
      toast.error('Failed to disable all toolkits');
    }
  };

  // Filter toolkits based on search
  const filteredToolkits = toolkits.filter((toolkit) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      toolkit.toolkitName.toLowerCase().includes(searchLower) ||
      toolkit.description?.toLowerCase().includes(searchLower) ||
      toolkit.toolkitSlug.toLowerCase().includes(searchLower)
    );
  });

  const enabledCount = filteredToolkits.filter((t) => t.isEnabled).length;
  const totalCount = filteredToolkits.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin mr-2" />
        <span>Loading agent toolkit configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Package className="size-4" />
            Toolkit Configuration ({enabledCount} of {totalCount} enabled)
          </h3>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            onClick={handleSelectAll}
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={enabledCount === totalCount}
          >
            All
          </Button>
          <Button
            variant="ghost"
            onClick={handleSelectNone}
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={enabledCount === 0}
          >
            None
          </Button>
        </div>
      </div>
      <div className="flex items-center space-x-2 mb-3">
        <Search className="size-3 text-muted-foreground" />
        <Input
          placeholder="Search toolkits..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-7 text-xs flex-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5 max-h-96 overflow-y-auto w-full">
        {filteredToolkits.map((toolkit) => (
          <div
            key={`${toolkit.toolkitSlug}`}
            className="flex items-center justify-between p-2 rounded border bg-card/50 hover:bg-muted/50 transition-colors w-full"
          >
            <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
              <h4 className="font-medium text-xs truncate flex-1">
                {toolkit.toolkitName}
              </h4>
              <Badge variant="outline" className="text-xs h-3.5 px-1 shrink-0">
                {toolkit.toolCount}
              </Badge>
            </div>
            <Switch
              checked={toolkit.isEnabled}
              onCheckedChange={(checked) =>
                handleToolkitToggle(toolkit.toolkitName, checked)
              }
              className="shrink-0"
            />
          </div>
        ))}
      </div>

      {filteredToolkits.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm w-full">
          {searchQuery
            ? 'No toolkits match your search query.'
            : 'No toolkits available.'}
        </div>
      )}
    </div>
  );
}
