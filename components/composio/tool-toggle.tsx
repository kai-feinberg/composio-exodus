'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Info, Lock } from 'lucide-react';
import type { ComposioTool } from '@/lib/composio/types';

interface ToolToggleProps {
  tool: ComposioTool;
  isEnabled: boolean;
  onToggle: (toolSlug: string, enabled: boolean) => Promise<void>;
  disabled?: boolean;
  showDetails?: boolean;
}

export function ToolToggle({ 
  tool, 
  isEnabled, 
  onToggle, 
  disabled = false,
  showDetails = false 
}: ToolToggleProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleToggle = async () => {
    if (disabled || loading) return;
    
    setLoading(true);
    try {
      await onToggle(tool.slug, !isEnabled);
    } catch (error) {
      console.error('Toggle failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`tool-toggle ${isEnabled ? 'ring-2 ring-green-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{tool.name}</CardTitle>
              {tool.requiresAuth && (
                <Lock className="size-4 text-amber-500" />
              )}
              <Badge variant="outline" className="text-xs">
                {tool.toolkitSlug}
              </Badge>
            </div>
            <CardDescription className="text-sm mt-1">
              {tool.description}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {showDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="p-1"
              >
                {expanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </Button>
            )}
            
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {isEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle}
                disabled={disabled || loading}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      {showDetails && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Required Scopes */}
                {tool.requiredScopes && tool.requiredScopes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Required Scopes:</h4>
                    <div className="flex flex-wrap gap-1">
                      {tool.requiredScopes.map(scope => (
                        <Badge key={scope} variant="secondary" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parameters */}
                {tool.parameters && Object.keys(tool.parameters).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Parameters:</h4>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(tool.parameters, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Tool Slug for reference */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Tool ID:</h4>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {tool.slug}
                  </code>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      )}
      
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
          <div className="animate-spin size-4 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}
    </Card>
  );
}

// Compact version for list views
export function ToolToggleCompact({ 
  tool, 
  isEnabled, 
  onToggle, 
  disabled = false 
}: ToolToggleProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (disabled || loading) return;
    
    setLoading(true);
    try {
      await onToggle(tool.slug, !isEnabled);
    } catch (error) {
      console.error('Toggle failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${
      isEnabled ? 'border-green-200 bg-green-50' : ''
    }`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{tool.name}</span>
          {tool.requiresAuth && (
            <Lock className="size-3 text-amber-500" />
          )}
          <Badge variant="outline" className="text-xs">
            {tool.toolkitSlug}
          </Badge>
          {tool.requiredScopes?.map(scope => (
            <Badge key={scope} variant="secondary" className="text-xs">
              {scope}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-1">{tool.description}</p>
      </div>
      
      <div className="flex items-center gap-2 ml-4">
        <span className={`text-sm ${isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
          {isEnabled ? 'On' : 'Off'}
        </span>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={disabled || loading}
          className="data-[state=checked]:bg-green-600"
        />
        {loading && (
          <div className="animate-spin size-3 border-2 border-blue-500 border-t-transparent rounded-full" />
        )}
      </div>
    </div>
  );
}