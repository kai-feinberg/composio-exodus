'use client';

import { OrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OrganizationRequiredPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Organization Required</CardTitle>
          <CardDescription>
            You need to be part of an organization to use this application.
            Please join an existing organization or create a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationList
            afterCreateOrganizationUrl="/"
            afterSelectOrganizationUrl="/"
            hidePersonal={false}
            skipInvitationScreen={false}
            appearance={{
              elements: {
                organizationListContainer: 'w-full',
                organizationPreview: 'border rounded-lg p-4 hover:shadow-md transition-shadow',
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}