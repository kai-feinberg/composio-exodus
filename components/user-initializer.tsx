'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';

export function UserInitializer() {
  const { userId, orgId } = useAuth();

  useEffect(() => {
    if (userId) {
      // Call API to ensure user exists in database
      fetch('/api/user/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          organizationId: orgId,
        }),
      }).catch(error => {
        console.error('Failed to initialize user:', error);
      });
    }
  }, [userId, orgId]);

  return null; // This component doesn't render anything
}