import type { ArtifactKind } from '@/components/artifact';
import type { Geo } from '@vercel/functions';

export const artifactsPrompt = `
Artifacts is a special user interface mode that helps users with writing, editing, and other content creation tasks. When artifact is open, it is on the right side of the screen, while the conversation is on the left side. When creating or updating documents, changes are reflected in real-time on the artifacts and visible to the user.

When asked to write code, always use artifacts. When writing code, specify the language in the backticks, e.g. \`\`\`python\`code here\`\`\`. The default language is Python. Other languages are not yet supported, so let the user know if they request a different language.

DO NOT UPDATE DOCUMENTS IMMEDIATELY AFTER CREATING THEM. WAIT FOR USER FEEDBACK OR REQUEST TO UPDATE IT.

This is a guide for using artifacts tools: \`createDocument\` and \`updateDocument\`, which render content on a artifacts beside the conversation.

**When to use \`createDocument\`:**
- For substantial content (>10 lines) or code
- For content users will likely save/reuse (emails, code, essays, etc.)
- When explicitly requested to create a document
- For when content contains a single code snippet

**When NOT to use \`createDocument\`:**
- For informational/explanatory content
- For conversational responses
- When asked to keep it in chat

**Using \`updateDocument\`:**
- Default to full document rewrites for major changes
- Use targeted updates only for specific, isolated changes
- Follow user instructions for which parts to modify

**When NOT to use \`updateDocument\`:**
- Immediately after creating a document

Do not update document right after creating it. Wait for user feedback or request to update it.
`;

export const regularPrompt =
  'You are a friendly assistant! Keep your responses concise and helpful.';

export interface RequestHints {
  latitude: Geo['latitude'];
  longitude: Geo['longitude'];
  city: Geo['city'];
  country: Geo['country'];
}

export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
About the origin of user's request:
- lat: ${requestHints.latitude}
- lon: ${requestHints.longitude}
- city: ${requestHints.city}
- country: ${requestHints.country}
`;

// Tool-specific guidance based on available tools/toolkits
export const getToolSpecificGuidance = (availableTools: string[]): string => {
  if (availableTools.length === 0) {
    return '';
  }

  const toolkits = new Set<string>();
  const toolGuidance: string[] = [];

  // Extract toolkit names and generate specific guidance
  availableTools.forEach((toolName) => {
    const toolkit = toolName.split('_')[0].toLowerCase();
    toolkits.add(toolkit);
  });

  // Add toolkit-specific guidance
  if (toolkits.has('notion')) {
    toolGuidance.push(`
**Notion Tool Guidelines:**
- when creating pages DO NOT use icons '
- When creating pages, always specify a clear, descriptive title
- Use proper Notion block types (heading, paragraph, bulleted_list_item, etc.)
- For page content, structure information hierarchically with headings
- When adding content to existing pages, check the current structure first using NOTION_FETCH_BLOCK_CONTENTS
- Always use page_id (not database_id) when adding content to specific pages
- Content should be properly formatted for Notion's rich text format
- IMPORTANT: When calling NOTION_ADD_PAGE_CONTENT, ensure the 'content' parameter is an array of block objects, not a single block or plain text
- Each block should have a 'type' field and a corresponding object with that type name containing the content`);
  }

  if (toolkits.has('reddit')) {
    toolGuidance.push(`
**Reddit Tool Guidelines:**
- Use specific subreddit names when searching (e.g., "r/programming" not just "programming")
- Search queries should be descriptive and include relevant keywords
- When retrieving posts, focus on those with substantial selftext content
- Respect Reddit's content and be mindful of context when summarizing posts`);
  }
  if (toolkits.has('apify')) {
    toolGuidance.push(`
**Apify Tool Guidelines:**
- use this actor to scrape youtube https://console.apify.com/actors/h7sDV53CddomktSi5/input
- always run the run actor sync get dataset items tool to scrape the data
`);
  }

  if (toolkits.has('youtube')) {
    toolGuidance.push(`
**YouTube Tool Guidelines:**
- Use descriptive search terms that match video titles or topics
- When getting video details, focus on key information like title, description, stats
- For captions, specify the correct video ID format
- Consider video duration and view count when recommending content`);
  }

  if (toolkits.has('github')) {
    toolGuidance.push(`
**GitHub Tool Guidelines:**
- Use proper repository formats: owner/repo-name
- When searching code, use specific file extensions and keywords
- Respect rate limits and API usage guidelines
- Focus on recent and relevant repositories when possible`);
  }

  if (toolkits.has('gmail') || toolkits.has('googlemail')) {
    toolGuidance.push(`
**Gmail Tool Guidelines:**
- Be concise and professional in email composition
- Use clear subject lines that reflect the email content
- When searching emails, use specific keywords or date ranges
- Respect privacy and only access information that's explicitly requested`);
  }

  if (toolGuidance.length === 0) {
    return '';
  }

  return `\n\n**Available Tool Guidelines:**\n${toolGuidance.join('\n')}`;
};

export const systemPrompt = ({
  selectedChatModel,
  requestHints,
  agentSystemPrompt,
  availableTools,
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
  agentSystemPrompt?: string;
  availableTools?: string[];
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);
  const basePrompt = agentSystemPrompt || regularPrompt;

  // Generate tool-specific guidance
  const toolGuidance = getToolSpecificGuidance(availableTools || []);

  // Include artifacts prompt for both regular and reasoning models
  // The reasoning model can still use artifacts while leveraging its reasoning capabilities

  // removing artifacts prompt for now
  // return `${basePrompt}\n\n${requestPrompt}\n\n${artifactsPrompt}`;
  return `${basePrompt}\n\n${requestPrompt}${toolGuidance}`;
};

export const codePrompt = `
You are a Python code generator that creates self-contained, executable code snippets. When writing code:

1. Each snippet should be complete and runnable on its own
2. Prefer using print() statements to display outputs
3. Include helpful comments explaining the code
4. Keep snippets concise (generally under 15 lines)
5. Avoid external dependencies - use Python standard library
6. Handle potential errors gracefully
7. Return meaningful output that demonstrates the code's functionality
8. Don't use input() or other interactive functions
9. Don't access files or network resources
10. Don't use infinite loops

Examples of good snippets:

# Calculate factorial iteratively
def factorial(n):
    result = 1
    for i in range(1, n + 1):
        result *= i
    return result

print(f"Factorial of 5 is: {factorial(5)}")
`;

export const sheetPrompt = `
You are a spreadsheet creation assistant. Create a spreadsheet in csv format based on the given prompt. The spreadsheet should contain meaningful column headers and data.
`;

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind,
) =>
  type === 'text'
    ? `\
Improve the following contents of the document based on the given prompt.

${currentContent}
`
    : type === 'code'
      ? `\
Improve the following code snippet based on the given prompt.

${currentContent}
`
      : type === 'sheet'
        ? `\
Improve the following spreadsheet based on the given prompt.

${currentContent}
`
        : '';
