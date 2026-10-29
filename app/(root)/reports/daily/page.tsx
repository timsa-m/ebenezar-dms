import { getLoggedInUser } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import { getDueThisWeekLoans, getOverdueLoans } from '@/lib/actions/daily-report.actions';
import DailyReportClient from './DailyReportClient';

export const metadata = {
  title: 'Daily Loan Report — Elelyon LMS',
  description: 'Today\'s loans due this week and overdue loan alerts for admin review.',
};

// Revalidate at most once every 10 minutes to reduce DB load
export const revalidate = 600;

export default async function DailyReportPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
    redirect('/');
  }

  // Fetch both datasets in parallel
  const [dueThisWeek, overdueLoans] = await Promise.all([
    getDueThisWeekLoans(),
    getOverdueLoans(),
  ]);

  const reportDate = new Date().toLocaleString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <DailyReportClient
      dueThisWeek={dueThisWeek}
      overdueLoans={overdueLoans}
      reportDate={reportDate}
      canSendAlerts={user.role === 'ADMIN' || user.role === 'MANAGER'}
    />
  );
}
