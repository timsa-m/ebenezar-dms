import React from 'react';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getCompanySettings } from '@/lib/actions/settings.actions';
import { redirect } from 'next/navigation';
import SettingsLayout from './SettingsLayout';

interface SettingsPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await getLoggedInUser();

  // Protect settings page: Staff cannot access it.
  if (!user || user.role === 'STAFF') {
    redirect('/');
  }

  const initialSettings = await getCompanySettings();
  const params = searchParams ? await searchParams : undefined;
  const initialTab = params?.tab || 'Profile';

  return <SettingsLayout user={user} initialSettings={initialSettings} initialTab={initialTab} />;
}
