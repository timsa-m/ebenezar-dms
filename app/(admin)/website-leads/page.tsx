import React from 'react';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import WebsiteLeadsManager from '@/components/WebsiteLeadsManager';
import { getWebsiteMessages, getHireRequests, getTradeInRequests } from '@/lib/actions/website.actions';

export default async function WebsiteLeadsPage() {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) redirect('/sign-in');

  const [messages, tradeInRequests] = await Promise.all([
    getWebsiteMessages(),
    getTradeInRequests()
  ]);

  return (
    <section className="home-content animate-fade-in">


      <WebsiteLeadsManager
        messages={messages}
        hireRequests={[]}
        tradeInRequests={tradeInRequests}
      />
    </section>
  );
}
