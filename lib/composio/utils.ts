import type { ComposioTool, Toolkit } from './types';

// Filter tools by various criteria
export function filterTools(tools: ComposioTool[], filters: {
  search?: string;
  toolkit?: string;
  requiresAuth?: boolean;
  scopes?: string[];
}): ComposioTool[] {
  return tools.filter(tool => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        tool.name.toLowerCase().includes(searchLower) ||
        tool.description.toLowerCase().includes(searchLower) ||
        tool.slug.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Toolkit filter
    if (filters.toolkit && tool.toolkitSlug !== filters.toolkit) {
      return false;
    }

    // Auth requirement filter
    if (filters.requiresAuth !== undefined && tool.requiresAuth !== filters.requiresAuth) {
      return false;
    }

    // Scopes filter
    if (filters.scopes && filters.scopes.length > 0) {
      if (!tool.requiredScopes || !filters.scopes.some(scope => 
        tool.requiredScopes!.includes(scope)
      )) {
        return false;
      }
    }

    return true;
  });
}

// Group tools by toolkit
export function groupToolsByToolkit(tools: ComposioTool[]): Record<string, ComposioTool[]> {
  return tools.reduce((acc, tool) => {
    if (!acc[tool.toolkitSlug]) {
      acc[tool.toolkitSlug] = [];
    }
    acc[tool.toolkitSlug].push(tool);
    return acc;
  }, {} as Record<string, ComposioTool[]>);
}

// Sort tools by relevance
export function sortToolsByRelevance(tools: ComposioTool[], searchQuery?: string): ComposioTool[] {
  if (!searchQuery) {
    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }

  const query = searchQuery.toLowerCase();
  
  return tools.sort((a, b) => {
    // Exact name matches first
    const aNameMatch = a.name.toLowerCase() === query;
    const bNameMatch = b.name.toLowerCase() === query;
    if (aNameMatch && !bNameMatch) return -1;
    if (!aNameMatch && bNameMatch) return 1;

    // Name starts with query
    const aNameStarts = a.name.toLowerCase().startsWith(query);
    const bNameStarts = b.name.toLowerCase().startsWith(query);
    if (aNameStarts && !bNameStarts) return -1;
    if (!aNameStarts && bNameStarts) return 1;

    // Name contains query
    const aNameContains = a.name.toLowerCase().includes(query);
    const bNameContains = b.name.toLowerCase().includes(query);
    if (aNameContains && !bNameContains) return -1;
    if (!aNameContains && bNameContains) return 1;

    // Description contains query
    const aDescContains = a.description.toLowerCase().includes(query);
    const bDescContains = b.description.toLowerCase().includes(query);
    if (aDescContains && !bDescContains) return -1;
    if (!aDescContains && bDescContains) return 1;

    // Alphabetical fallback
    return a.name.localeCompare(b.name);
  });
}

// Get popular search queries for suggestions
export function getPopularSearchQueries(): string[] {
  return [
    'bookmark',
    'send message',
    'upload file',
    'create issue',
    'send email',
    'post tweet',
    'schedule meeting',
    'get repository',
    'list files',
    'search users',
    'create document',
    'send notification'
  ];
}

// Get toolkit-specific search suggestions
export function getToolkitSearchSuggestions(toolkitSlug: string): string[] {
  const suggestions: Record<string, string[]> = {
    twitter: ['tweet', 'bookmark', 'follow', 'retweet', 'dm', 'thread'],
    github: ['repository', 'issue', 'pull request', 'commit', 'branch', 'release'],
    gmail: ['email', 'send', 'draft', 'label', 'search', 'attachment'],
    slack: ['message', 'channel', 'user', 'file', 'emoji', 'reminder'],
    google_drive: ['file', 'folder', 'upload', 'download', 'share', 'permission'],
    notion: ['page', 'database', 'block', 'property', 'query', 'create'],
    linkedin: ['post', 'connection', 'message', 'profile', 'company', 'job']
  };

  return suggestions[toolkitSlug] || [];
}

// Check if a tool requires specific setup
export function getToolSetupRequirements(tool: ComposioTool): {
  requiresAuth: boolean;
  requiredScopes: string[];
  setupInstructions?: string;
} {
  const requirements = {
    requiresAuth: tool.requiresAuth,
    requiredScopes: tool.requiredScopes || [],
  };

  // Add toolkit-specific setup instructions
  const setupInstructions: Record<string, string> = {
    twitter: 'Connect your Twitter account to enable tweeting and bookmarking functionality.',
    github: 'Connect your GitHub account to access repositories and manage issues.',
    gmail: 'Connect your Gmail account to send and manage emails.',
    slack: 'Connect your Slack workspace to send messages and manage channels.',
  };

  return {
    ...requirements,
    setupInstructions: setupInstructions[tool.toolkitSlug]
  };
}

// Format tool parameters for display
export function formatToolParameters(parameters: Record<string, any>): Array<{
  name: string;
  type: string;
  required: boolean;
  description?: string;
}> {
  if (!parameters || !parameters.properties) {
    return [];
  }

  const required = parameters.required || [];
  
  return Object.entries(parameters.properties).map(([name, prop]: [string, any]) => ({
    name,
    type: prop.type || 'unknown',
    required: required.includes(name),
    description: prop.description
  }));
}

// Generate example usage for a tool
export function generateToolExample(tool: ComposioTool): string {
  const examples: Record<string, string> = {
    'TWITTER_CREATE_BOOKMARK': 'composio.execute("TWITTER_CREATE_BOOKMARK", { tweet_id: "1234567890" })',
    'GITHUB_CREATE_ISSUE': 'composio.execute("GITHUB_CREATE_ISSUE", { repo: "owner/repo", title: "Bug report", body: "Description..." })',
    'GMAIL_SEND_EMAIL': 'composio.execute("GMAIL_SEND_EMAIL", { to: "user@example.com", subject: "Hello", body: "Message content" })',
    'SLACK_SEND_MESSAGE': 'composio.execute("SLACK_SEND_MESSAGE", { channel: "#general", text: "Hello team!" })'
  };

  return examples[tool.slug] || `composio.execute("${tool.slug}", { /* parameters */ })`;
}

// Validate tool configuration
export function validateToolConfiguration(enabledTools: string[], availableTools: ComposioTool[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const availableToolSlugs = new Set(availableTools.map(t => t.slug));

  // Check for enabled tools that don't exist
  const invalidTools = enabledTools.filter(slug => !availableToolSlugs.has(slug));
  if (invalidTools.length > 0) {
    issues.push(`Invalid tools enabled: ${invalidTools.join(', ')}`);
  }

  // Check for auth requirements
  const enabledToolsData = availableTools.filter(t => enabledTools.includes(t.slug));
  const authRequiredTools = enabledToolsData.filter(t => t.requiresAuth);
  if (authRequiredTools.length > 0) {
    issues.push(`Tools requiring authentication: ${authRequiredTools.map(t => t.name).join(', ')}`);
  }

  return {
    valid: issues.length === 0,
    issues
  };
}