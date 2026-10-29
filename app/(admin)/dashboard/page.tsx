import { getDmsExecutiveSummary } from '@/lib/actions/dms.actions';
import { formatKES } from '@/src/lib/financial-engine';
import Link from 'next/link';
import DashboardCharts from '@/components/DashboardCharts';
import { Button } from '@/components/ui/button';
import {
  Car,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Warehouse,
  FileText,
  Users,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DmsDashboardPage() {
  const metrics = await getDmsExecutiveSummary();

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase bg-blue-100 text-blue-800">
              Kisumu Yard DMS
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Executive Summary
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-xl">
            Real-time portfolio overview, arrears aging metrics, and yard stock availability.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="sm" className="h-10 px-4 rounded-lg font-semibold">

            <Link href="/admin/contracts" className="btn-primary">
              <span>F&amp;I Contracts</span>
              <UserPlus className="size-4 opacity-70" />
            </Link>


          </Button>
          <Button asChild variant="default" size="sm" className="h-10 px-4 rounded-lg font-semibold">
            <Link href="/admin/inventory" className="btn-primary">
              <Warehouse className="mr-2" size={16} />
              Manage Yard Stock
            </Link>
          </Button>
        </div>
      </div>

      {/* Top 5 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Portfolio */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold text-slate-500">
              Total Portfolio
            </span>
            <CreditCard size={14} className="text-slate-400" />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block">
              {formatKES(metrics.totalPortfolioValue)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">
              Cumulative hire-purchase
            </span>
          </div>
        </div>

        {/* Total Outstanding Balance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold text-slate-500">
              Outstanding
            </span>
            <TrendingUp size={14} className="text-amber-500" />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block">
              {formatKES(metrics.totalOutstandingBalance)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">
              {metrics.activeAgreementsCount} active agreements
            </span>
          </div>
        </div>

        {/* MRR - Contractual Monthly Run-Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold text-blue-900">
              Monthly Run-Rate
            </span>
            <CreditCard size={14} className="text-blue-500" />
          </div>
          <div>
            <span className="text-2xl font-bold text-blue-950 block">
              {formatKES(metrics.mrr)}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">
              Contractual billings
            </span>
          </div>
        </div>

        {/* Total Collections */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold text-slate-500">
              Collections
            </span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block">
              {formatKES(metrics.totalCollected)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">
              Total received to date
            </span>
          </div>
        </div>

        {/* Yard Stock Available */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-semibold text-slate-500">
              Yard In-Stock
            </span>
            <Car size={14} className="text-indigo-500" />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block">
              {metrics.inStockCount} Units
            </span>
            <span className="text-xs text-slate-400 mt-1 block">
              Ready for sale
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      <DashboardCharts metrics={metrics} />

      {/* Arrears Aging Buckets Grid */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Arrears Aging &amp; Delinquency Buckets
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Automated portfolio risk monitoring and repossession watch
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 p-6 gap-6">
          {/* Performing: 0-30 Days */}
          <div className="relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                0–30 Days
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {metrics.agingBuckets.performing.count}
              </span>
            </div>
            <span className="text-xl font-bold text-slate-900 block">
              {formatKES(metrics.agingBuckets.performing.balance)}
            </span>
          </div>

          {/* Early Stage: 31-60 Days */}
          <div className="relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                31–60 Days
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {metrics.agingBuckets.earlyStage.count}
              </span>
            </div>
            <span className="text-xl font-bold text-slate-900 block">
              {formatKES(metrics.agingBuckets.earlyStage.balance)}
            </span>
          </div>

          {/* High Risk: 61-90 Days */}
          <div className="relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                61–90 Days
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {metrics.agingBuckets.highRisk.count}
              </span>
            </div>
            <span className="text-xl font-bold text-slate-900 block">
              {formatKES(metrics.agingBuckets.highRisk.balance)}
            </span>
          </div>

          {/* Critical Default: 90+ Days */}
          <div className="relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-rose-600" />
                90+ Days (At Risk)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                {metrics.agingBuckets.criticalDefault.count}
              </span>
            </div>
            <span className="text-xl font-bold text-slate-900 block">
              {formatKES(metrics.agingBuckets.criticalDefault.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Debtors Portfolio Watchlist */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Top Debtors Watchlist
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Agreements sorted by highest outstanding exposure
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
            <Link href="/admin/contracts">
              View All <ArrowRight size={14} className="ml-1" />
            </Link>
          </Button>
        </div>

        {metrics.topDebtors.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No debtor balances recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Contract No.</th>
                  <th className="py-3 px-6">Client Name</th>
                  <th className="py-3 px-6">Car Reg.</th>
                  <th className="py-3 px-6">Days Overdue</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.topDebtors.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-medium text-slate-900 text-xs">
                      {d.contractNo}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-900">
                      {d.clientName}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-mono text-xs">
                        {d.vehicleReg}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {d.daysOverdue > 0 ? (
                        <span className="text-rose-600 font-medium">{d.daysOverdue} Days</span>
                      ) : (
                        <span className="text-emerald-600">Current (0d)</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${d.bucket === '0-30 Days'
                          ? 'bg-emerald-100 text-emerald-800'
                          : d.bucket === '31-60 Days'
                            ? 'bg-amber-100 text-amber-800'
                            : d.bucket === '61-90 Days'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                      >
                        {d.bucket}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-slate-900">
                      {formatKES(d.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

