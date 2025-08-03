import { Composio } from '@composio/core';
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
    const connections = await composio.connectedAccounts.list({
      userIds: [userId],
    });
    const activeConnections = connections.items.filter(
      (conn: any) => conn.status === 'ACTIVE',
    );

    return activeConnections.map((conn: any) => ({
      toolkit: conn.toolkit.slug.toUpperCase(),
      connectionId: conn.id,
      status: conn.status,
    }));
  } catch (error) {
    return [];
  }
}

export default composio;
