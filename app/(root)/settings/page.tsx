export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getCompanySettings } from '@/lib/actions/settings.actions';
import { redirect } from 'next/navigation';
import SettingsLayout from './SettingsLayout';

interface SettingsPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await getLoggedInUser();

  // Protect settings page: Require authentication
  if (!user) {
    redirect('/sign-in');
  }

  const initialSettings = await getCompanySettings();
  const params = searchParams ? await searchParams : undefined;
  const initialTab = params?.tab || (user.role === 'STAFF' ? 'Appearance' : 'Profile');

  return (
    <Suspense fallback={<div className="p-8 flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 rounded-full border-2 border-primary/40 border-t-transparent animate-spin" /></div>}>
      <SettingsLayout user={user} initialSettings={initialSettings} initialTab={initialTab} />
    </Suspense>
  );
}
