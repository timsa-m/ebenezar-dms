import React from 'react';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getCompanySettings } from '@/lib/actions/settings.actions';
import { redirect } from 'next/navigation';
import SettingsLayout from './SettingsLayout';

export default async function SettingsPage() {
  const user = await getLoggedInUser();

  // Protect settings page: Staff cannot access it.
  if (!user || user.role === 'STAFF') {
    redirect('/');
  }

  const initialSettings = await getCompanySettings();

  return <SettingsLayout user={user} initialSettings={initialSettings} />;
}
