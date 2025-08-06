#!/usr/bin/env tsx

//run with: npx tsx scripts/populate-tools-direct.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { availableTools } from '../lib/db/schema';

// Use the same connection pattern as the main app
const client = postgres(
  'postgres://postgres.cowjdaffoszylfeqwvnn:xv5opqP9Hd4CATIS@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supabase=base-pooler.x',
);
const db = drizzle(client);

// Toolkits to fetch tools from
const TOOLKITS = [
  'YOUTUBE',
  'TWITTER',
  'REDDIT',
  'NOTION',
  'SLACK',
  'SLACKBOT',
  'ACTIVE_CAMPAIGN',
  'EXA',
  'GOOGLEDOCS',
  'GMAIL',
  'GOOGLEDRIVE',
];

interface ComposioTool {
  slug: string;
  name: string;
  description: string;
  toolkit: {
    slug: string;
    name: string;
  };
}

async function fetchToolsFromComposio(): Promise<any[]> {
  console.log('🔄 Fetching tools from Composio API...');

  const allTools: any[] = [];

  for (const toolkitSlug of TOOLKITS) {
    try {
      console.log(`📦 Fetching tools for toolkit: ${toolkitSlug}`);

      const response = await fetch(
        `https://backend.composio.dev/api/v3/tools?toolkit_slug=${toolkitSlug}`,
        {
          method: 'GET',
          headers: {
            'x-api-key':
              process.env.COMPOSIO_API_KEY || 'ak_QcrzVvTEw8XLXoyxyMWj',
          },
        },
      );

      if (!response.ok) {
        console.error(
          `❌ Failed to fetch tools for ${toolkitSlug}: ${response.status} ${response.statusText}`,
        );
        continue;
      }

      const body = await response.json();
      const tools = body.items || [];

      // Transform tools to our schema format
      const transformedTools = tools.map((tool: ComposioTool) => ({
        slug: tool.slug,
        toolkitSlug: tool.toolkit.slug.toLowerCase(),
        toolkitName: tool.toolkit.name,
        displayName: tool.name,
        description: tool.description,
      }));

      allTools.push(...transformedTools);
      console.log(
        `✅ Fetched ${transformedTools.length} tools from ${toolkitSlug}`,
      );

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error fetching tools for ${toolkitSlug}:`, error);
    }
  }

  console.log(`📊 Total tools fetched: ${allTools.length}`);
  return allTools;
}

async function populateToolsFromAPI() {
  console.log('🔄 Populating tools from Composio API...');

  const tools = await fetchToolsFromComposio();

  if (tools.length === 0) {
    console.log('⚠️ No tools fetched from API');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const tool of tools) {
    try {
      await db.insert(availableTools).values(tool);
      console.log(`✅ Added tool: ${tool.slug}`);
      successCount++;
    } catch (error: any) {
      // Tool might already exist, which is fine
      if (error?.message?.includes('duplicate') || error?.code === '23505') {
        console.log(`⚠️  Tool already exists: ${tool.slug}`);
      } else {
        console.error(`❌ Failed to add tool ${tool.slug}:`, error);
        errorCount++;
      }
    }
  }

  console.log(`\n📊 Tools population completed:`);
  console.log(`✅ Successfully added: ${successCount} tools`);
  console.log(`❌ Errors: ${errorCount} tools`);
  console.log(`📦 Total processed: ${tools.length} tools`);
}

async function main() {
  try {
    await populateToolsFromAPI();
    console.log('✅ Tool population completed successfully!');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Tool population failed:', error);
    await client.end();
    process.exit(1);
  }
}

main();
