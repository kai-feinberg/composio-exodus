import { addAvailableTool } from '@/lib/db/queries';

// Sample tools based on common Composio toolkit tools
const sampleTools = [
  // Gmail Tools
  {
    slug: 'GMAIL_SEND_EMAIL',
    toolkitSlug: 'gmail',
    toolkitName: 'Gmail',
    displayName: 'Send Email',
    description: 'Send emails through Gmail',
  },
  {
    slug: 'GMAIL_READ_EMAILS',
    toolkitSlug: 'gmail',
    toolkitName: 'Gmail',
    displayName: 'Read Emails',
    description: 'Read and search emails from Gmail inbox',
  },
  {
    slug: 'GMAIL_CREATE_DRAFT',
    toolkitSlug: 'gmail',
    toolkitName: 'Gmail',
    displayName: 'Create Draft',
    description: 'Create email drafts in Gmail',
  },

  // Twitter/X Tools
  {
    slug: 'TWITTER_POST_TWEET',
    toolkitSlug: 'twitter',
    toolkitName: 'Twitter',
    displayName: 'Post Tweet',
    description: 'Post tweets to Twitter/X',
  },
  {
    slug: 'TWITTER_BOOKMARK_TWEET',
    toolkitSlug: 'twitter',
    toolkitName: 'Twitter',
    displayName: 'Bookmark Tweet',
    description: 'Bookmark tweets for later reading',
  },
  {
    slug: 'TWITTER_SEARCH_TWEETS',
    toolkitSlug: 'twitter',
    toolkitName: 'Twitter',
    displayName: 'Search Tweets',
    description: 'Search for tweets and Twitter content',
  },

  // Slack Tools
  {
    slug: 'SLACK_SEND_MESSAGE',
    toolkitSlug: 'slack',
    toolkitName: 'Slack',
    displayName: 'Send Message',
    description: 'Send messages to Slack channels or users',
  },
  {
    slug: 'SLACK_CREATE_CHANNEL',
    toolkitSlug: 'slack',
    toolkitName: 'Slack',
    displayName: 'Create Channel',
    description: 'Create new Slack channels',
  },
  {
    slug: 'SLACK_SCHEDULE_MESSAGE',
    toolkitSlug: 'slack',
    toolkitName: 'Slack',
    displayName: 'Schedule Message',
    description: 'Schedule messages to be sent later in Slack',
  },

  // YouTube Tools
  {
    slug: 'YOUTUBE_SEARCH_VIDEOS',
    toolkitSlug: 'youtube',
    toolkitName: 'YouTube',
    displayName: 'Search Videos',
    description: 'Search for videos on YouTube',
  },
  {
    slug: 'YOUTUBE_GET_VIDEO_INFO',
    toolkitSlug: 'youtube',
    toolkitName: 'YouTube',
    displayName: 'Get Video Info',
    description: 'Get detailed information about YouTube videos',
  },

  // Mailchimp Tools
  {
    slug: 'MAILCHIMP_CREATE_CAMPAIGN',
    toolkitSlug: 'mailchimp',
    toolkitName: 'Mailchimp',
    displayName: 'Create Campaign',
    description: 'Create email marketing campaigns',
  },
  {
    slug: 'MAILCHIMP_MANAGE_SUBSCRIBERS',
    toolkitSlug: 'mailchimp',
    toolkitName: 'Mailchimp',
    displayName: 'Manage Subscribers',
    description: 'Add, remove, or update email subscribers',
  },

  // GitHub Tools
  {
    slug: 'GITHUB_CREATE_ISSUE',
    toolkitSlug: 'github',
    toolkitName: 'GitHub',
    displayName: 'Create Issue',
    description: 'Create issues in GitHub repositories',
  },
  {
    slug: 'GITHUB_CREATE_PR',
    toolkitSlug: 'github',
    toolkitName: 'GitHub',
    displayName: 'Create Pull Request',
    description: 'Create pull requests in GitHub repositories',
  },
  {
    slug: 'GITHUB_SEARCH_REPOS',
    toolkitSlug: 'github',
    toolkitName: 'GitHub',
    displayName: 'Search Repositories',
    description: 'Search for GitHub repositories',
  },
];

export async function populateSampleTools() {
  console.log('🔄 Populating sample tools...');
  
  let successCount = 0;
  let errorCount = 0;

  for (const tool of sampleTools) {
    try {
      await addAvailableTool(tool);
      console.log(`✅ Added tool: ${tool.slug}`);
      successCount++;
    } catch (error) {
      // Tool might already exist, which is fine
      if (error instanceof Error && error.message.includes('duplicate')) {
        console.log(`⚠️  Tool already exists: ${tool.slug}`);
      } else {
        console.error(`❌ Failed to add tool ${tool.slug}:`, error);
        errorCount++;
      }
    }
  }

  console.log(`\n📊 Sample tools population completed:`);
  console.log(`✅ Successfully added: ${successCount} tools`);
  console.log(`❌ Errors: ${errorCount} tools`);
  console.log(`📦 Total processed: ${sampleTools.length} tools`);
}

// Export the sample tools for use in other scripts
export { sampleTools };