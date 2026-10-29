export const dynamic = 'force-dynamic';

import HeaderBox from '@/components/HeaderBox'
import RecentLoansTable from '@/components/RecentLoansTable'
import DashboardCharts from '@/components/DashboardCharts'
import AnimatedCounter from '@/components/AnimatedCounter'
import { getLoggedInUser } from '@/lib/actions/user.actions'
import { getDmsExecutiveSummary, getFinancingAgreements } from '@/lib/actions/dms.actions'
import { getClients } from '@/lib/actions/client.actions'
import { formatAmount } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowUpRight, TrendingUp, AlertCircle, Activity, ChevronRight,
  Users, CreditCard, ShieldAlert, CheckCircle2, XCircle,
  Clock, DollarSign, TrendingDown, Percent, BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const Home = async () => {
  const [loggedIn, dmsMetrics, agreements, clients] = await Promise.all([
    getLoggedInUser(),
    getDmsExecutiveSummary(),
    getFinancingAgreements(),
    getClients()
  ])

  // Derive metrics that match the UI expectations from our current F&I data
  const metrics = {
    activeLoans: dmsMetrics.activeAgreementsCount,
    overdueLoans: agreements.filter((a) => {
      const s = (a.status || '').toLowerCase();
      const dpd = a.days_overdue || 0;
      return s === 'overdue' || (dpd >= 7 && dpd <= 30);
    }).length,
    defaultingLoans: agreements.filter((a) => {
      const s = (a.status || '').toLowerCase();
      const dpd = a.days_overdue || 0;
      return s === 'defaulting' || (dpd >= 60 && dpd <= 90);
    }).length,
    lossLoans: agreements.filter((a) => {
      const s = (a.status || '').toLowerCase();
      const dpd = a.days_overdue || 0;
      return s === 'loss' || dpd > 90;
    }).length,
    pendingLoans: 0, // No pending state in the F&I schema
    fullyPaidLoans: agreements.filter((a) => {
      const s = (a.status || '').toLowerCase();
      return s === 'completed' || s === 'fully paid';
    }).length,
    writtenOffLoans: agreements.filter((a) => {
      const s = (a.status || '').toLowerCase();
      return s === 'written off' || s === 'written_off';
    }).length,
    totalClients: clients?.length || 0,
  }

  // Format recent loans for the table
  const recentLoans = agreements.map((a) => {
    let mappedStatus = 'Active';
    const rawStatus = (a.status || '').toLowerCase();
    const dpd = a.days_overdue || 0;

    if (a.duration_months === 0 || a.sale_price === a.deposit_paid) mappedStatus = 'Cash Sale';
    else if (rawStatus === 'completed' || rawStatus === 'fully paid') mappedStatus = 'Fully Paid';
    else if (rawStatus === 'written off' || rawStatus === 'written_off') mappedStatus = 'Written Off';
    else if (rawStatus === 'loss' || dpd > 90) mappedStatus = 'Loss';
    else if (rawStatus === 'defaulting' || (dpd >= 60 && dpd <= 90)) mappedStatus = 'Defaulting';
    else if (rawStatus === 'substandard' || (dpd > 30 && dpd < 60)) mappedStatus = 'Substandard';
    else if (rawStatus === 'overdue' || (dpd >= 7 && dpd <= 30)) mappedStatus = 'Overdue';

    return {
      $id: a.id,
      clientName: a.client?.full_name || 'Unknown',
      clientEmail: a.client?.phone || 'No phone', // Reusing email field in UI for phone since no email in F&I schema
      principalAmount: a.principal_amount || 0,
      status: mappedStatus,
    };
  }).slice(0, 5);

  const isManager = loggedIn?.role === 'ADMIN' || loggedIn?.role === 'MANAGER'

  const nairobiTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }))
  const currentHour = nairobiTime.getHours()

  return (
    <section className="home-content animate-fade-in">

      {/* ── Dashboard Banner ─────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '220px',
        borderRadius: '1.25rem',
        overflow: 'hidden',
        marginBottom: '1.75rem',
        boxShadow: '0 4px 24px 0 rgba(37,99,235,0.10)',
      }}>
        <Image
          src="/ebenezarDealershipunsplash.jpg"
          alt="Ebenezar Enterprises Car Bazaar — Dashboard Banner"
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
          sizes="100vw"
        />
        {/* Left-to-right gradient overlay so text is readable */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(15,23,42,0.62) 0%, rgba(15,23,42,0.18) 55%, transparent 100%)',
        }} />
        {/* Banner copy */}
        <div style={{
          position: 'absolute',
          left: '2rem',
          bottom: '1.75rem',
          right: '40%',
        }}>
          <p style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.65)',
            marginBottom: '0.3rem',
          }}>
            Ebenezar Enterprises Carbazaar          </p>
          <h1 style={{
            fontSize: '1.375rem',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.2,
            margin: 0,
            textShadow: '0 1px 6px rgba(0,0,0,0.25)',
          }}>
            {isManager
              ? `Good ${currentHour < 12 ? 'Morning' : currentHour < 17 ? 'Afternoon' : 'Evening'}, ${loggedIn?.firstName ?? 'Admin'}`
              : `Welcome, ${loggedIn?.firstName ?? 'User'}`}
          </h1>
          <p style={{
            fontSize: '0.8125rem',
            color: 'rgba(255,255,255,0.75)',
            margin: '0.375rem 0 0',
            fontWeight: 500,
          }}>
            {nairobiTime.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <header className="page-header">
        <div className="flex gap-3">
          <Link href="/loans/create" className="btn-primary">
            <span>New Contract</span>
            <ArrowUpRight className="size-4 opacity-70" />
          </Link>
        </div>
      </header>

      {/* ── Row 2: Secondary KPI strips ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
        {[
          {
            label: 'Active',
            value: metrics.activeLoans,
            icon: <Activity className="size-3.5" />,
            color: 'text-green-600', bg: 'bg-green-50', ring: 'ring-green-100',
            badge: null,
          },
          {
            label: 'Overdue (7–30d)',
            value: metrics.overdueLoans,
            icon: <AlertCircle className="size-3.5" />,
            color: metrics.overdueLoans > 0 ? 'text-amber-600' : 'text-gray-400',
            bg: metrics.overdueLoans > 0 ? 'bg-amber-50' : 'bg-gray-50',
            ring: metrics.overdueLoans > 0 ? 'ring-amber-100' : 'ring-gray-100',
            badge: null,
          },
          {
            label: 'Defaulting (60–90d)',
            value: metrics.defaultingLoans,
            icon: <AlertCircle className="size-3.5" />,
            color: metrics.defaultingLoans > 0 ? 'text-orange-600' : 'text-gray-400',
            bg: metrics.defaultingLoans > 0 ? 'bg-orange-50' : 'bg-gray-50',
            ring: metrics.defaultingLoans > 0 ? 'ring-orange-100' : 'ring-gray-100',
            badge: null,
          },
          {
            label: 'Loss (>90d)',
            value: metrics.lossLoans,
            icon: <ShieldAlert className="size-3.5" />,
            color: metrics.lossLoans > 0 ? 'text-red-600' : 'text-gray-400',
            bg: metrics.lossLoans > 0 ? 'bg-red-50' : 'bg-gray-50',
            ring: metrics.lossLoans > 0 ? 'ring-red-100' : 'ring-gray-100',
            badge: null,
          },
          {
            label: 'Written Off',
            value: metrics.writtenOffLoans,
            icon: <XCircle className="size-3.5" />,
            color: 'text-gray-500', bg: 'bg-gray-50', ring: 'ring-gray-100',
            badge: null,
          },
          {
            label: 'Clients',
            value: metrics.totalClients,
            icon: <Users className="size-3.5" />,
            color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100',
            badge: null,
          },
        ].map(({ label, value, icon, color, bg, ring, badge }) => (
          <div key={label} className="card-premium p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-11 font-bold text-gray-400 uppercase tracking-widest">{label}</p>
              <div className={cn('p-1.5 rounded-lg ring-1', bg, ring, color)}>
                {icon}
              </div>
            </div>
            <p className={cn('text-26 font-bold tabular-nums', color)}>{value}</p>
            {badge && <span className="badge badge-pending text-10 self-start">{badge}</span>}
          </div>
        ))}
      </div>

      <DashboardCharts metrics={dmsMetrics} />

      {/* ── Row 5: Quick Actions ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {[
          { label: 'New Contract', href: '/loans/create', icon: <CreditCard className="size-4" />, variant: 'btn-primary' },
          { label: 'Yard Stock', href: '/vehicles', icon: <BarChart2 className="size-4" />, variant: 'btn-secondary' },
          { label: 'All Clients', href: '/clients', icon: <Users className="size-4" />, variant: 'btn-secondary' },
          { label: 'Collections', href: '/reports/collections', icon: <DollarSign className="size-4" />, variant: 'btn-secondary' },
        ].map(({ label, href, icon, variant }) => (
          <Link key={href} href={href} className={cn(variant, 'flex items-center gap-2 justify-center')}>
            {icon}
            <span>{label}</span>
          </Link>
        ))}
      </div>

      {/* ── Row 6: Recent Loans ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <h2 className="text-18 font-semibold text-gray-900 tracking-tight">Recent Agreements</h2>
          <Link href="/loans" className="btn-ghost">
            View All Contracts
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <RecentLoansTable recentLoans={recentLoans} />
      </div>
    </section>
  )
}

export default Home