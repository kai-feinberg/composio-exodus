/**
 * Composio Tool Response Parser
 *
 * Parses and filters responses from Composio tools to extract only relevant data
 * and reduce token usage by removing unnecessary information.
 */

import { sanitizeToolResult } from './result-sanitizer';

/**
 * Parses Composio tool responses based on tool slug and toolkit slug
 * Returns filtered data specific to each tool's needs
 * Falls back to generic sanitization if no specific parsing is available
 */
export function parseComposioResponse(
  toolSlug: string,
  toolkitSlug: string,
  result: any,
): any {
  // Handle null/undefined results
  if (!result) {
    return result;
  }

  console.log('🔍 Parsing Composio response for tool:', toolSlug);

  try {
    // Parse based on specific tool slug
    switch (toolSlug) {
      case 'YOUTUBE_SEARCH_YOU_TUBE': {
        if (!result.successful) {
          return {
            ...result,
            data: {
              error: result.error,
            },
          };
        }

        const {
          data: {
            response_data: { items = [] } = {},
          } = {},
        } = result;

        const parsedItems = items.slice(0, 10).map((item: any) => ({
          videoId: item?.id?.videoId,
          title: item?.snippet?.title,
          description: item?.snippet?.description?.slice(0, 200),
          channelTitle: item?.snippet?.channelTitle,
          publishedAt: item?.snippet?.publishedAt,
          thumbnailUrl: item?.snippet?.thumbnails?.high?.url,
        }));

        return {
          ...result,
          data: { items: parsedItems },
        };
      }

      case 'YOUTUBE_LOAD_CAPTIONS': {
        // If operation failed, return the error string
        if (!result.successful) {
          return {
            data: {
              error: result.error,
            },
          };
        }

        // Handle successful response
        const {
          data: { response_data: captionData = {} } = {},
        } = result;

        return {
          ...result,
          data: captionData,
        };
      }

      case 'YOUTUBE_VIDEO_DETAILS': {
        // Handle failed operations
        if (!result.successful) {
          return {
            data: {
              error: result.error,
            },
          };
        }

        // Extract video details from successful response
        const {
          data: {
            response_data: { items = [] } = {},
          } = {},
        } = result;

        // Parse the first video item (should be the only one for video details)
        const video = items[0];
        if (!video) {
          return {
            ...result,
            data: { error: 'No video details found' },
          };
        }

        // Extract only the most relevant video information
        const parsedVideo = {
          id: video.id,
          title: video.snippet?.title,
          description: video.snippet?.description, // Limit description length
          channelTitle: video.snippet?.channelTitle,
          publishedAt: video.snippet?.publishedAt,
          duration: video.contentDetails?.duration,
          viewCount: video.statistics?.viewCount,
          likeCount: video.statistics?.likeCount,
          commentCount: video.statistics?.commentCount,
          tags: video.snippet?.tags?.slice(0, 10), // Limit tags to first 10
          thumbnailUrl: video.snippet?.thumbnails?.high?.url,
        };

        return {
          ...result,
          data: { video: parsedVideo },
        };
      }

      default:
        // No specific parsing available - fall back to generic sanitization
        console.log(
          `📋 No specific parsing for ${toolSlug}, using generic sanitization`,
        );
        return sanitizeToolResult(result, toolSlug);
    }
  } catch (error) {
    console.warn(
      `❌ Failed to parse ${toolSlug} response, falling back to sanitization:`,
      error,
    );
    // Fallback to generic sanitization if parsing fails
    return sanitizeToolResult(result, toolSlug);
  }
}
