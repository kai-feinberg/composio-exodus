'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export const SignOutForm = () => {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = () => {
    signOut(() => router.push('/'));
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="w-full text-left px-1 py-0.5 text-red-500"
    >
      Sign out
    </button>
  );
};
