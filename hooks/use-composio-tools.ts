import { useState, useEffect, useCallback } from 'react';
import { composioClient } from '@/lib/composio/client';
import type { ComposioTool, Toolkit, EnabledToolsConfig } from '@/lib/composio/types';

export function useComposioTools(userId: string) {
  const [tools, setTools] = useState<ComposioTool[]>([]);
  const [toolkits, setToolkits] = useState<Toolkit[]>([]);
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadToolkits();
    loadEnabledTools();
  }, [userId]);

  const loadToolkits = async () => {
    try {
      setLoading(true);
      const allToolkits = await composioClient.getToolkits();
      setToolkits(allToolkits);
    } catch (err) {
      setError('Failed to load toolkits');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEnabledTools = useCallback(async () => {
    try {
      const savedConfig = localStorage.getItem(`composio-tools-${userId}`);
      if (savedConfig) {
        const config: EnabledToolsConfig = JSON.parse(savedConfig);
        setEnabledTools(new Set(config.enabledTools));
      }
    } catch (err) {
      console.error('Failed to load enabled tools:', err);
    }
  }, [userId]);

  const searchTools = async (query: string, toolkitSlugs?: string[]) => {
    try {
      setLoading(true);
      setError(null);
      const results = await composioClient.searchTools(userId, query, toolkitSlugs);
      setTools(results);
      return results;
    } catch (err) {
      setError('Search failed');
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadToolkitTools = async (toolkitSlug: string) => {
    try {
      setLoading(true);
      setError(null);
      const toolkitTools = await composioClient.getToolkitTools(userId, toolkitSlug);
      setTools(toolkitTools);
      return toolkitTools;
    } catch (err) {
      setError('Failed to load toolkit tools');
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const toggleTool = useCallback(async (toolSlug: string, enabled: boolean) => {
    const newEnabledTools = new Set(enabledTools);
    
    if (enabled) {
      newEnabledTools.add(toolSlug);
    } else {
      newEnabledTools.delete(toolSlug);
    }
    
    setEnabledTools(newEnabledTools);
    
    // Auto-save to localStorage
    const config: EnabledToolsConfig = {
      userId,
      enabledTools: Array.from(newEnabledTools),
      toolkitConfigs: {}
    };
    
    try {
      localStorage.setItem(`composio-tools-${userId}`, JSON.stringify(config));
    } catch (err) {
      console.error('Failed to save tool configuration:', err);
    }
  }, [userId, enabledTools]);

  const isToolEnabled = useCallback((toolSlug: string) => {
    return enabledTools.has(toolSlug);
  }, [enabledTools]);

  const getEnabledTools = useCallback(() => {
    return tools.filter(tool => enabledTools.has(tool.slug));
  }, [tools, enabledTools]);

  const getEnabledToolsByToolkit = useCallback(() => {
    const enabledToolsList = getEnabledTools();
    return enabledToolsList.reduce((acc, tool) => {
      if (!acc[tool.toolkitSlug]) {
        acc[tool.toolkitSlug] = [];
      }
      acc[tool.toolkitSlug].push(tool);
      return acc;
    }, {} as Record<string, ComposioTool[]>);
  }, [getEnabledTools]);

  return {
    tools,
    toolkits,
    enabledTools: Array.from(enabledTools),
    loading,
    error,
    searchTools,
    loadToolkitTools,
    toggleTool,
    isToolEnabled,
    getEnabledTools,
    getEnabledToolsByToolkit,
    refreshEnabledTools: loadEnabledTools
  };
}

export function useComposioAuth() {
  const [authConfigs, setAuthConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAuthConfigs = async (toolkitSlug?: string) => {
    try {
      setLoading(true);
      const configs = await composioClient.getAuthConfigs(toolkitSlug);
      setAuthConfigs(configs);
      return configs;
    } catch (error) {
      console.error('Failed to load auth configs:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getAuthStatus = (toolkitSlug: string) => {
    const config = authConfigs.find(config => config.toolkit === toolkitSlug);
    return config ? 'connected' : 'disconnected';
  };

  return {
    authConfigs,
    loading,
    loadAuthConfigs,
    getAuthStatus
  };
}