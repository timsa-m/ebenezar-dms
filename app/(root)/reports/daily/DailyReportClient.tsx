'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatAmount, cn } from '@/lib/utils';
import { sendOverdueAlerts } from '@/lib/actions/daily-report.actions';
import {
  AlertTriangle, Calendar, Clock, Phone, Mail,
  Send, CheckCircle, XCircle, Loader2, ArrowLeft,
  TrendingDown, Users, BadgeAlert,
} from 'lucide-react';

// ─── Status badge helper ───────────────────────────────────────────────────────
function StatusBadge({ status, dpd }: { status: string; dpd: number }) {
  const map: Record<string, string> = {
    Overdue: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-[#FF626D] border border-red-200 dark:border-red-900/40",
    Substandard: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-[#F5BD4F] border border-amber-200 dark:border-amber-900/40",
    Loss: "bg-gray-100 dark:bg-[#18221A] text-gray-700 dark:text-[#C1CBC3] border border-gray-200 dark:border-[#29352D]",
    Active: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-[#B7FF3C] border border-emerald-200 dark:border-emerald-900/40",
  };
  const cls = map[status] ?? map.Active;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md", cls)}>
      {status === 'Substandard' ? 'Defaulting' : status}{dpd > 0 && ` · ${dpd}d`}
    </span>
  );
}

// ─── Alert result banner ───────────────────────────────────────────────────────
function AlertResultBanner({
  result,
  onClose,
}: {
  result: { attempted: number; sent: number; failed: number } | null;
  onClose: () => void;
}) {
  if (!result) return null;
  const allOk = result.failed === 0;
  return (
    <div className={cn(
      "flex items-center justify-between p-3.5 sm:px-5 rounded-xl mb-6 gap-4 border",
      allOk
        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40"
        : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/40"
    )}>
      <div className="flex items-center gap-2.5">
        {allOk
          ? <CheckCircle size={18} className="text-emerald-700 dark:text-[#B7FF3C]" />
          : <AlertTriangle size={18} className="text-amber-700 dark:text-[#F5BD4F]" />}
        <div>
          <p className={cn(
            "text-sm font-bold m-0",
            allOk ? "text-emerald-900 dark:text-[#F4F7F4]" : "text-amber-900 dark:text-[#F4F7F4]"
          )}>
            {allOk ? 'Alerts dispatched successfully' : 'Alerts sent with some failures'}
          </p>
          <p className={cn(
            "text-xs m-0",
            allOk ? "text-emerald-700 dark:text-[#A1ADA4]" : "text-amber-700 dark:text-[#A1ADA4]"
          )}>
            {result.sent} sent · {result.failed} failed · {result.attempted} total clients targeted
          </p>
        </div>
      </div>
      <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-gray-400 dark:text-[#A1ADA4] hover:text-gray-600 dark:hover:text-[#F4F7F4] p-1">
        <XCircle size={16} />
      </button>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  dueThisWeek: DailyReportLoan[];
  overdueLoans: DailyReportLoan[];
  reportDate: string;
  canSendAlerts: boolean;
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function DailyReportClient({ dueThisWeek, overdueLoans, reportDate, canSendAlerts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [alertResult, setAlertResult] = useState<{ attempted: number; sent: number; failed: number } | null>(null);

  const handleSendAlerts = () => {
    startTransition(async () => {
      try {
        const result = await sendOverdueAlerts();
        setAlertResult({ attempted: result.attempted, sent: result.sent, failed: result.failed });
      } catch (err: any) {
        setAlertResult({ attempted: 0, sent: 0, failed: overdueLoans.length });
      }
    });
  };

  return (
    <section className="home-content animate-fade-in">
      {/* ── Page Header ── */}
      <header className="page-header">
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/reports"
                className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-[#A1ADA4] hover:text-gray-900 dark:hover:text-[#F4F7F4] no-underline transition-colors"
              >
                <ArrowLeft size={13} /> Reports
              </Link>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-[#F4F7F4] tracking-tight m-0">
              Daily Report
            </h1>
            <p className="text-xs sm:text-[13px] text-gray-400 dark:text-[#A1ADA4] mt-1">
              Generated: {reportDate}
            </p>
          </div>

          {canSendAlerts && overdueLoans.length > 0 && (
            <button
              id="btn-send-overdue-alerts"
              onClick={handleSendAlerts}
              disabled={isPending}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-bold border-none transition-all shadow-sm",
                isPending
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-red-600/30"
              )}
            >
              {isPending
                ? <><Loader2 size={14} className="animate-spin" /> Sending Alerts…</>
                : <><Send size={14} /> Send Overdue Alerts ({overdueLoans.length})</>}
            </button>
          )}
        </div>
      </header>

      {/* ── Alert Result Banner ── */}
      <AlertResultBanner result={alertResult} onClose={() => setAlertResult(null)} />

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-7">
        {[
          { label: 'Due This Week', value: dueThisWeek.length, icon: <Calendar size={16} />, color: 'text-blue-600 dark:text-[#65C8F2]', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-900/40 border-l-blue-600 dark:border-l-[#65C8F2]' },
          { label: 'Overdue Accounts', value: overdueLoans.length, icon: <AlertTriangle size={16} />, color: 'text-red-600 dark:text-[#FF626D]', bg: 'bg-red-50 dark:bg-red-950/40 border-red-200/50 dark:border-red-900/40 border-l-red-600 dark:border-l-[#FF626D]' },
          {
            label: 'Total Overdue Exposure',
            value: `KES ${overdueLoans.reduce((s, l) => s + l.balance, 0).toLocaleString()}`,
            icon: <TrendingDown size={16} />, color: 'text-amber-600 dark:text-[#F5BD4F]', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-900/40 border-l-amber-600 dark:border-l-[#F5BD4F]',
          },
          {
            label: 'Clients at Risk',
            value: new Set(overdueLoans.map(l => l.clientId)).size,
            icon: <Users size={16} />, color: 'text-purple-600 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200/50 dark:border-purple-900/40 border-l-purple-600 dark:border-l-purple-400',
          },
        ].map((kpi) => (
          <div key={kpi.label} className={cn("rounded-xl p-3.5 border border-l-[3px]", kpi.bg)}>
            <div className={cn("flex items-center gap-1.5 mb-1.5", kpi.color)}>
              {kpi.icon}
              <span className="text-[11px] font-bold uppercase tracking-wider">{kpi.label}</span>
            </div>
            <span className="text-xl font-extrabold text-gray-900 dark:text-[#F4F7F4] tabular-nums">{kpi.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">

        {/* ── Due This Week ── */}
        <div className="card-premium dark:bg-[#151D17] dark:border-[#29352D] !p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:px-6 border-b border-gray-100 dark:border-[#29352D]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/40 dark:border-blue-900/40 rounded-lg text-blue-600 dark:text-[#65C8F2]">
                <Calendar size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-[#F4F7F4] m-0">Due This Week</h2>
                <p className="text-xs text-gray-400 dark:text-[#A1ADA4] m-0">Installments due Mon–Sun</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#65C8F2] border border-blue-200/50 dark:border-blue-900/40 rounded-full">
              {dueThisWeek.length} agreement(s)
            </span>
          </div>

          {dueThisWeek.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500 dark:text-[#A1ADA4]">No installments due this week</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[780px]">
                <thead>
                  <tr className="bg-gray-50/70 dark:bg-[#18221A] border-b border-gray-200 dark:border-[#29352D]">
                    {['Client', 'Agreement ID', 'Vehicle Price', 'Bal After Deposit', 'Total Balance', 'Due Date', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] text-left uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dueThisWeek.map((loan, i) => (
                    <tr
                      key={loan.$id}
                      onClick={() => router.push(`/loans/${loan.$id}`)}
                      className="border-b border-gray-100 dark:border-[#29352D] bg-white dark:bg-[#151D17] hover:bg-blue-50/20 dark:hover:bg-[#18221A] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-gray-900 dark:text-[#F4F7F4] m-0">{loan.clientName}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {loan.clientPhone && (
                            <span className="text-[11px] text-gray-500 dark:text-[#A1ADA4] flex items-center gap-1 font-mono">
                              <Phone size={9} /> {loan.clientPhone}
                            </span>
                          )}
                          {loan.clientEmail && (
                            <span className="text-[11px] text-gray-500 dark:text-[#A1ADA4] flex items-center gap-1 font-mono">
                              <Mail size={9} /> {loan.clientEmail}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-[#A1ADA4]">{loan.loanType || '—'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-[#C1CBC3] tabular-nums">
                        {formatAmount(loan.amountApplied)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-[#B7FF3C] tabular-nums">
                        {formatAmount(loan.principalDisbursed)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-[#F4F7F4] tabular-nums">
                        {loan.nextInstallmentAmount != null ? formatAmount(loan.nextInstallmentAmount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-[#C1CBC3] whitespace-nowrap tabular-nums">
                        {loan.nextInstallmentDate
                          ? new Date(loan.nextInstallmentDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={loan.status} dpd={loan.daysPastDue} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Overdue Loans ── */}
        <div className="card-premium dark:bg-[#151D17] dark:border-[#29352D] !p-0 overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:px-6 border-b border-red-100 dark:border-red-950/50 bg-red-50/30 dark:bg-red-950/20">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-red-100 dark:bg-red-950/40 border border-red-200/40 dark:border-red-900/40 rounded-lg text-red-600 dark:text-[#FF626D]">
                <BadgeAlert size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-red-700 dark:text-[#FF626D] m-0">
                  Overdue Agreements
                </h2>
                <p className="text-xs text-gray-400 dark:text-[#A1ADA4] m-0">
                  Loans past their payment deadline
                </p>
              </div>
            </div>
            {overdueLoans.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-900/40 rounded-full">
                {overdueLoans.length} agreement(s)
              </span>
            )}
          </div>

          {overdueLoans.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500 dark:text-[#A1ADA4]">No overdue loans today</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[860px]">
                <thead>
                  <tr className="bg-red-50/40 dark:bg-[#18221A] border-b border-red-100 dark:border-[#29352D]">
                    {['Client & Contact', 'Agreement ID', 'Vehicle Price', 'Balance after Deposit', 'Total Balance', 'DPD', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-[11px] font-bold text-red-700 dark:text-red-400 text-left uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overdueLoans.map((loan, i) => (
                    <tr
                      key={loan.$id}
                      onClick={() => router.push(`/loans/${loan.$id}`)}
                      className="border-b border-gray-100 dark:border-[#29352D] bg-white dark:bg-[#151D17] hover:bg-red-50/20 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-gray-900 dark:text-[#F4F7F4] m-0">{loan.clientName}</p>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {loan.clientPhone && (
                            <a href={`tel:${loan.clientPhone}`} className="text-xs text-blue-600 dark:text-[#65C8F2] hover:underline flex items-center gap-1 font-mono">
                              <Phone size={10} /> {loan.clientPhone}
                            </a>
                          )}
                          {loan.clientEmail && (
                            <a href={`mailto:${loan.clientEmail}`} className="text-xs text-gray-400 dark:text-[#A1ADA4] hover:underline flex items-center gap-1 font-mono">
                              <Mail size={10} /> {loan.clientEmail}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-[#A1ADA4]">{loan.loanType || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-[#C1CBC3] tabular-nums font-semibold">
                        {formatAmount(loan.amountApplied)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-[#B7FF3C] tabular-nums">
                        {formatAmount(loan.principalDisbursed)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-extrabold text-red-600 dark:text-[#FF626D] tabular-nums block">
                          {formatAmount(loan.balance)}
                        </span>
                        {(loan.remainingPenalties > 0) && (
                          <span className="text-[11px] text-amber-600 dark:text-[#F5BD4F]">
                            incl. {formatAmount(loan.remainingPenalties)} penalties
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-base font-extrabold text-red-600 dark:text-[#FF626D] tabular-nums">
                          {loan.daysPastDue}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-[#A1ADA4] ml-0.5">d</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={loan.status} dpd={0} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
