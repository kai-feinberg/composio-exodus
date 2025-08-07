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

interface ToolkitSelectorProps {
  selectedToolkits?: string[];
  onSelectionChange?: (selectedToolkits: string[]) => void;
}

export function ToolkitSelector({
  selectedToolkits = [],
  onSelectionChange,
}: ToolkitSelectorProps) {
  const [toolkits, setToolkits] = useState<Toolkit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchToolkits = useCallback(async () => {
    try {
      const response = await fetch('/api/tools/user/toolkits');
      if (!response.ok) throw new Error('Failed to fetch toolkits');

      const data = await response.json();
      
      // Map the toolkits to reflect current selections instead of user defaults
      const toolkitsWithSelection = data.toolkits.map((toolkit: Toolkit) => ({
        ...toolkit,
        isEnabled: selectedToolkits.includes(toolkit.toolkitName),
      }));
      
      setToolkits(toolkitsWithSelection);
    } catch (error) {
      console.error('Failed to fetch toolkits:', error);
      toast.error('Failed to load toolkit configuration');
    } finally {
      setIsLoading(false);
    }
  }, [selectedToolkits]);

  useEffect(() => {
    fetchToolkits();
  }, [fetchToolkits]);

  const handleToolkitToggle = (toolkitName: string, enabled: boolean) => {
    setToolkits((prev) =>
      prev.map((toolkit) =>
        toolkit.toolkitName === toolkitName
          ? { ...toolkit, isEnabled: enabled }
          : toolkit,
      ),
    );

    const newSelection = enabled
      ? [...selectedToolkits, toolkitName]
      : selectedToolkits.filter((name) => name !== toolkitName);
    
    onSelectionChange?.(newSelection);
  };

  const handleSelectAll = () => {
    const allToolkitNames = filteredToolkits.map((toolkit) => toolkit.toolkitName);
    setToolkits((prev) =>
      prev.map((toolkit) => ({ ...toolkit, isEnabled: true })),
    );
    onSelectionChange?.(allToolkitNames);
  };

  const handleSelectNone = () => {
    setToolkits((prev) =>
      prev.map((toolkit) => ({ ...toolkit, isEnabled: false })),
    );
    onSelectionChange?.([]);
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
        <span>Loading toolkit configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Package className="size-4" />
            Toolkit Configuration
          </h3>
          <p className="text-xs text-muted-foreground">
            {enabledCount} of {totalCount} toolkits selected
          </p>
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

      <div className="space-y-2 max-h-48 overflow-y-auto w-full">
        {filteredToolkits.map((toolkit) => (
          <div
            key={`${toolkit.toolkitSlug}`}
            className="flex items-center justify-between p-2 rounded border bg-card/50 hover:bg-muted/50 transition-colors w-full"
          >
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate flex-1">
                  {toolkit.toolkitName}
                </h4>
                <Badge
                  variant="outline"
                  className="text-xs h-4 px-1 shrink-0"
                >
                  {toolkit.toolCount}
                </Badge>
              </div>
              {toolkit.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {toolkit.description}
                </p>
              )}
            </div>
            <Switch
              checked={toolkit.isEnabled}
              onCheckedChange={(checked) =>
                handleToolkitToggle(toolkit.toolkitName, checked)
              }
              className="shrink-0 scale-75"
            />
          </div>
        ))}
      </div>

      {filteredToolkits.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-xs w-full">
          {searchQuery
            ? 'No toolkits match your search query.'
            : 'No toolkits available.'}
        </div>
      )}
    </div>
  );
}