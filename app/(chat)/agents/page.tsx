import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { AgentsPage } from '@/components/agents-page';

export const metadata: Metadata = {
  title: 'Agents',
};

export default async function Page() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/login');
  }

  return <AgentsPage />;
}