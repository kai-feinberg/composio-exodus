import { Composio, AuthScheme } from '@composio/core';
import { VercelProvider } from '@composio/vercel';

/**
 * Composio client instance for server-side operations
 * This should only be used in server-side code (API routes, server components)
 * For client-side operations, use the API endpoints in /app/api/
 */
const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
  provider: new VercelProvider(),
});

/**
 * Enhanced tool fetching with connection verification
 * Ensures user has active connections before attempting to fetch tools
 */
export async function getConnectedToolkits(userId: string) {
  try {
    console.log(`🔍 [DEBUG] Fetching connected accounts for userId: ${userId}`);
    const connections = await composio.connectedAccounts.list({
      userIds: [userId],
    });
    
    console.log(`🔍 [DEBUG] Raw connections response:`, {
      totalItems: connections.items?.length || 0,
      items: connections.items?.map((conn: any) => ({
        id: conn.id,
        userId: conn.userId,
        status: conn.status,
        toolkitSlug: conn.toolkit?.slug,
        toolkitName: conn.toolkit?.name,
        authScheme: conn.authConfig?.authScheme,
      })) || []
    });

    const activeConnections = connections.items.filter(
      (conn: any) => conn.status === 'ACTIVE',
    );

    console.log(`🔍 [DEBUG] Active connections found: ${activeConnections.length}`);

    const result = activeConnections.map((conn: any) => ({
      toolkit: conn.toolkit.slug.toUpperCase(),
      connectionId: conn.id,
      userId: conn.userId,
      status: conn.status,
    }));

    console.log(`🔍 [DEBUG] Mapped connected toolkits:`, result);

    return result;
  } catch (error) {
    console.error(`❌ [DEBUG] Error in getConnectedToolkits:`, error);
    return [];
  }
}

export default composio;
