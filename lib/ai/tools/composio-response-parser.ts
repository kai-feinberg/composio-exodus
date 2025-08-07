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

      case 'REDDIT_RETRIEVE_REDDIT_POST': {
        // Handle failed operations
        if (!result.successful) {
          return {
            data: {
              error: result.error,
            },
          };
        }

        // Extract posts from successful response
        const {
          data: { posts_list = [] } = {},
        } = result;

        // Parse each post to extract only essential information
        // Filter out posts without self-text content
        const parsedPosts = posts_list
          .slice(0, 15)
          .filter((post: any) => {
            const postData = post.data;
            return postData.selftext && postData.selftext.trim().length > 0;
          })
          .map((post: any) => {
            const postData = post.data;

            return {
              id: postData.id,
              title: postData.title,
              author: postData.author,
              subreddit: postData.subreddit,
              created: postData.created_utc,
              score: postData.score,
              num_comments: postData.num_comments,
              domain: postData.domain,
              url: postData.url,
              selftext: postData.selftext,
              link_flair_text: postData.link_flair_text,
            };
          });

        return {
          ...result,
          data: { posts: parsedPosts },
        };
      }

      case 'REDDIT_RETRIEVE_SPECIFIC_COMMENT': {
        // Handle failed operations
        if (!result.successful) {
          return {
            data: {
              error: result.error,
            },
          };
        }

        // Extract comment/post data from successful response
        const {
          data: { things = [] } = {},
        } = result;

        // Parse the first item (should be the specific comment/post)
        const item = things[0];
        if (!item) {
          return {
            ...result,
            data: { error: 'No comment/post found' },
          };
        }

        const itemData = item.data;

        // Extract only essential information
        const parsedItem = {
          id: itemData.id,
          kind: item.kind,
          name: item.name,
          title: itemData.title,
          author: itemData.author,
          subreddit: itemData.subreddit,
          created: itemData.created_utc,
          score: itemData.score,
          num_comments: itemData.num_comments,
          domain: itemData.domain,
          url: itemData.url,
          selftext: itemData.selftext,
          body: itemData.body,
        };

        return {
          ...result,
          data: { item: parsedItem },
        };
      }

      case 'REDDIT_SEARCH_ACROSS_SUBREDDITS': {
        // Handle failed operations
        if (!result.successful) {
          return {
            data: {
              error: result.error,
            },
          };
        }

        // Extract search results from successful response
        const {
          data: {
            search_results: {
              data: { children = [] } = {},
            } = {},
          } = {},
        } = result;

        // Parse each search result to extract only essential information
        // Filter out posts without self-text content
        const parsedResults = children
          .slice(0, 15)
          .filter((child: any) => {
            const childData = child.data;
            return childData.selftext && childData.selftext.trim().length > 0;
          })
          .map((child: any) => {
            const childData = child.data;

            return {
              id: childData.id,
              kind: child.kind,
              title: childData.title,
              author: childData.author,
              subreddit: childData.subreddit,
              created: childData.created_utc,
              score: childData.score,
              num_comments: childData.num_comments,
              domain: childData.domain,
              url: childData.url,
              selftext: childData.selftext,
            };
          });

        return {
          ...result,
          data: { search_results: parsedResults },
        };
      }

      case 'NOTION_ADD_PAGE_CONTENT': {
        // For add page content, just return success/failure status
        if (!result.successful) {
          return {
            data: {
              error: result.error,
            },
          };
        }

        // Return minimal success response
        return {
          data: {
            success: true,
            message: 'Page content added successfully',
          },
        };
      }

      case 'NOTION_FETCH_BLOCK_CONTENTS': {
        // Handle failed operations
        if (!result.successful) {
          return {
            data: {
              error: result.error,
            },
          };
        }

        // Extract block contents from successful response
        const {
          data: {
            block_child_data: { results = [] } = {},
          } = {},
        } = result;

        // Parse each block to extract essential information
        const parsedBlocks = results.map((block: any) => {
          // Extract the block type
          const blockType = block.type;

          // Extract text content based on block type
          let textContent = '';
          let blockData: any = {};

          switch (blockType) {
            case 'heading_1':
            case 'heading_2':
            case 'heading_3': {
              const headingData = block[blockType];
              textContent = headingData?.rich_text?.[0]?.plain_text || '';
              blockData = {
                type: blockType,
                text: textContent,
              };
              break;
            }
            case 'paragraph': {
              const paragraphData = block.paragraph;
              textContent = paragraphData?.rich_text?.[0]?.plain_text || '';
              blockData = {
                type: blockType,
                text: textContent,
              };
              break;
            }
            case 'numbered_list_item':
            case 'bulleted_list_item': {
              const listData = block[blockType];
              textContent = listData?.rich_text?.[0]?.plain_text || '';
              blockData = {
                type: blockType,
                text: textContent,
              };
              break;
            }
            default: {
              // For other block types, try to extract any rich_text content
              const blockContent = block[blockType];
              if (blockContent?.rich_text?.[0]?.plain_text) {
                textContent = blockContent.rich_text[0].plain_text;
              }
              blockData = {
                type: blockType,
                text: textContent,
                has_children: block.has_children || false,
              };
            }
          }

          return {
            id: block.id,
            type: blockType,
            text: textContent,
            has_children: block.has_children || false,
            ...blockData,
          };
        });

        return {
          ...result,
          data: { blocks: parsedBlocks },
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
