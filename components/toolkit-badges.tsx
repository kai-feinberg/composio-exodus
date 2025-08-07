'use client';

import { Badge } from '@/components/ui/badge';
import { Package, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ToolkitBadge {
  toolkitName: string;
  toolkitSlug: string;
  toolCount: number;
  description?: string;
}

interface ToolkitBadgesProps {
  agentId: string;
  className?: string;
  maxVisible?: number;
  showCount?: boolean;
  variant?: 'default' | 'secondary' | 'outline';
  size?: 'sm' | 'default';
}

export function ToolkitBadges({
  agentId,
  className = '',
  maxVisible = 3,
  showCount = true,
  variant = 'outline',
  size = 'sm',
}: ToolkitBadgesProps) {
  const [toolkits, setToolkits] = useState<ToolkitBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchEnabledToolkits = async () => {
      try {
        setIsLoading(true);
        setError(false);
        
        const response = await fetch(`/api/tools/agent/${agentId}/toolkits`);
        if (!response.ok) {
          throw new Error('Failed to fetch toolkit configuration');
        }

        const data = await response.json();
        const enabledToolkits = data.toolkits.filter((toolkit: any) => toolkit.isEnabled);
        setToolkits(enabledToolkits);
      } catch (error) {
        console.error('Failed to fetch enabled toolkits:', error);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (agentId) {
      fetchEnabledToolkits();
    }
  }, [agentId]);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Loader2 className="size-3 animate-spin" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (error || !toolkits.length) {
    return (
      <div className={`flex items-center gap-1 text-muted-foreground ${className}`}>
        <Package className="size-3" />
        <span className="text-xs">No toolkits</span>
      </div>
    );
  }

  const visibleToolkits = toolkits.slice(0, maxVisible);
  const remainingCount = Math.max(0, toolkits.length - maxVisible);

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {visibleToolkits.map((toolkit) => (
        <Badge
          key={toolkit.toolkitSlug}
          variant={variant}
          className={`${
            size === 'sm' 
              ? 'h-4 px-1.5 text-xs' 
              : 'h-5 px-2 text-sm'
          } flex items-center gap-1`}
          title={toolkit.description || toolkit.toolkitName}
        >
          <Package className="size-2.5" />
          {toolkit.toolkitName}
          {showCount && (
            <span className="text-muted-foreground">
              ({toolkit.toolCount})
            </span>
          )}
        </Badge>
      ))}
      
      {remainingCount > 0 && (
        <Badge
          variant="secondary"
          className={`${
            size === 'sm' 
              ? 'h-4 px-1.5 text-xs' 
              : 'h-5 px-2 text-sm'
          } text-muted-foreground`}
          title={`${remainingCount} more toolkit${remainingCount === 1 ? '' : 's'}`}
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}