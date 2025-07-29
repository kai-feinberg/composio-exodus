import { auth as clerkAuth } from '@clerk/nextjs/server';

export type UserType = 'regular';

export interface User {
  id: string;
  email?: string | null;
  type: UserType;
}

export interface Session {
  user: User;
}

export async function auth(): Promise<Session | null> {
  const { userId } = await clerkAuth();

  if (!userId) {
    return null;
  }

  return {
    user: {
      id: userId,
      email: null, // We'll get this from Clerk user object when needed
      type: 'regular' as UserType,
    },
  };
}
