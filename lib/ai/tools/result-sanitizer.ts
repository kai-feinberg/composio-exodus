/**
 * Tool Result Sanitization System
 *
 * Filters out large, unnecessary content from tool call results while preserving
 * essential information for AI reasoning. Designed to prevent token limit issues
 * while maintaining tool functionality.
 */

const MAX_STRING_LENGTH = 2000; // Maximum characters for any string field
const MAX_ARRAY_ITEMS = 10; // Maximum items in arrays
const MAX_OBJECT_DEPTH = 5; // Maximum nesting depth

/**
 * Patterns to identify and handle large content fields
 */
const LARGE_CONTENT_PATTERNS = {
  // Base64 encoded content
  BASE64: /^[A-Za-z0-9+/=]{100,}$/,
  // HTML content
  HTML: /<[^>]+>/,
  // URLs and long strings
  LONG_URL: /^https?:\/\/.{50,}$/,
  // Binary-like content indicators
  BINARY_INDICATORS: [
    'encoded',
    'binary',
    'blob',
    'data:',
    'base64',
    'attachment',
  ],
};

/**
 * Field names that commonly contain large unnecessary content
 */
const LARGE_CONTENT_FIELDS = new Set([
  'html',
  'htmlContent',
  'rawHtml',
  'content',
  'body',
  'data',
  'encoded',
  'base64',
  'binary',
  'blob',
  'attachment',
  'file',
  'screenshot',
  'image',
  'pdf',
  'document',
  'raw',
  'full',
]);

/**
 * Essential fields that should always be preserved (even if large)
 */
const ESSENTIAL_FIELDS = new Set([
  'id',
  'title',
  'name',
  'type',
  'status',
  'error',
  'message',
  'url',
  'link',
  'href',
  'email',
  'subject',
  'from',
  'to',
  'timestamp',
  'date',
  'time',
  'count',
  'total',
  'success',
]);

/**
 * Estimates token count for content (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

/**
 * Checks if content appears to be encoded/binary data
 */
function isLargeEncodedContent(value: string): boolean {
  if (value.length < 100) return false;

  return (
    LARGE_CONTENT_PATTERNS.BASE64.test(value) ||
    LARGE_CONTENT_PATTERNS.LONG_URL.test(value) ||
    value.includes('data:') ||
    value.includes('base64,')
  );
}

/**
 * Extracts meaningful summary from HTML content
 */
function summarizeHtmlContent(html: string): any {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  // Extract text content (simplified)
  const textContent = html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract links
  const linkMatches =
    html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi) || [];
  const links = linkMatches.slice(0, 5).map((link) => {
    const hrefMatch = link.match(/href=["']([^"']+)["']/);
    const textMatch = link.match(/>([^<]*)</);
    return {
      href: hrefMatch ? hrefMatch[1] : '',
      text: textMatch ? textMatch[1].trim() : '',
    };
  });

  return {
    type: 'html_summary',
    title,
    textPreview:
      textContent.slice(0, 300) + (textContent.length > 300 ? '...' : ''),
    wordCount: textContent.split(/\s+/).length,
    links,
    originalSize: html.length,
    tokensEstimate: estimateTokens(html),
  };
}

/**
 * Creates a summary for large string content
 */
function summarizeLargeString(value: string, key: string): any {
  // Check if it's HTML content
  if (LARGE_CONTENT_PATTERNS.HTML.test(value)) {
    return summarizeHtmlContent(value);
  }

  // Check if it's encoded content
  if (isLargeEncodedContent(value)) {
    return {
      type: 'encoded_content',
      format: value.startsWith('data:') ? 'data_url' : 'base64',
      size: value.length,
      preview: `${value.slice(0, 50)}...`,
      tokensEstimate: estimateTokens(value),
    };
  }

  // Regular large text content
  const words = value.split(/\s+/);
  return {
    type: 'text_summary',
    preview: value.slice(0, 500) + (value.length > 500 ? '...' : ''),
    wordCount: words.length,
    characterCount: value.length,
    tokensEstimate: estimateTokens(value),
  };
}

/**
 * Sanitizes a single value based on its content and context
 */
function sanitizeValue(value: any, key: string, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > MAX_OBJECT_DEPTH) {
    return '[max_depth_reached]';
  }

  // Handle null/undefined
  if (value == null) return value;

  // Handle strings
  if (typeof value === 'string') {
    // Always preserve essential fields
    if (ESSENTIAL_FIELDS.has(key.toLowerCase())) {
      return value.length > MAX_STRING_LENGTH
        ? value.slice(0, MAX_STRING_LENGTH) + '...[truncated]'
        : value;
    }

    // Check if field name indicates large content
    if (
      LARGE_CONTENT_FIELDS.has(key.toLowerCase()) ||
      LARGE_CONTENT_PATTERNS.BINARY_INDICATORS.some((indicator) =>
        key.toLowerCase().includes(indicator),
      )
    ) {
      return value.length > 100 ? summarizeLargeString(value, key) : value;
    }

    // General string length check
    if (value.length > MAX_STRING_LENGTH) {
      return summarizeLargeString(value, key);
    }

    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const sanitizedArray = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item, index) => sanitizeValue(item, `${key}[${index}]`, depth + 1));

    if (value.length > MAX_ARRAY_ITEMS) {
      sanitizedArray.push(
        `[${value.length - MAX_ARRAY_ITEMS} more items truncated...]`,
      );
    }

    return sanitizedArray;
  }

  // Handle objects
  if (typeof value === 'object' && value !== null) {
    const sanitizedObject: any = {};
    let fieldCount = 0;
    const maxFields = 50; // Limit number of fields

    for (const [objKey, objValue] of Object.entries(value)) {
      if (fieldCount >= maxFields) {
        sanitizedObject['[additional_fields]'] =
          `${Object.keys(value).length - fieldCount} more fields truncated`;
        break;
      }

      sanitizedObject[objKey] = sanitizeValue(objValue, objKey, depth + 1);
      fieldCount++;
    }

    return sanitizedObject;
  }

  // Return primitives as-is
  return value;
}

/**
 * Main sanitization function for tool results
 */
export function sanitizeToolResult(result: any, toolName?: string): any {
  if (result == null) return result;

  const startTime = Date.now();
  const originalSize = JSON.stringify(result).length;

  try {
    const sanitized = sanitizeValue(result, 'root');
    const endTime = Date.now();
    const newSize = JSON.stringify(sanitized).length;
    const reduction = (((originalSize - newSize) / originalSize) * 100).toFixed(
      1,
    );

    // Log significant reductions
    if (originalSize > 10000) {
      console.log(`🧹 [${toolName || 'Unknown'}] Tool result sanitized:`, {
        originalSize,
        newSize,
        reduction: `${reduction}%`,
        processingTime: `${endTime - startTime}ms`,
        originalTokens: estimateTokens(JSON.stringify(result)),
        newTokens: estimateTokens(JSON.stringify(sanitized)),
      });
    }

    return sanitized;
  } catch (error) {
    console.error(`❌ [${toolName || 'Unknown'}] Sanitization failed:`, error);
    // Fallback to simple truncation
    const fallback = JSON.stringify(result).slice(0, MAX_STRING_LENGTH * 2);
    return {
      type: 'sanitization_error',
      error: 'Failed to sanitize result',
      fallback:
        fallback +
        (JSON.stringify(result).length > fallback.length
          ? '...[truncated]'
          : ''),
    };
  }
}

/**
 * Utility function to get sanitization statistics
 */
export function getSanitizationStats(original: any, sanitized: any): any {
  const originalStr = JSON.stringify(original);
  const sanitizedStr = JSON.stringify(sanitized);

  return {
    originalSize: originalStr.length,
    sanitizedSize: sanitizedStr.length,
    reduction: `${(((originalStr.length - sanitizedStr.length) / originalStr.length) * 100).toFixed(1)}%`,
    originalTokens: estimateTokens(originalStr),
    sanitizedTokens: estimateTokens(sanitizedStr),
    tokenReduction: estimateTokens(originalStr) - estimateTokens(sanitizedStr),
  };
}
