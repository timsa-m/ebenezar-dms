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

  // Protect settings page: Require authentication
  if (!user) {
    redirect('/sign-in');
  }

  const initialSettings = await getCompanySettings();
  const params = searchParams ? await searchParams : undefined;
  const initialTab = params?.tab || (user.role === 'STAFF' ? 'Appearance' : 'Profile');

  return <SettingsLayout user={user} initialSettings={initialSettings} initialTab={initialTab} />;
}
