'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatAmount } from '@/lib/utils';
import { sendOverdueAlerts } from '@/lib/actions/daily-report.actions';
import {
  AlertTriangle, Calendar, Clock, Phone, Mail,
  Send, CheckCircle, XCircle, Loader2, ArrowLeft,
  TrendingDown, Users, BadgeAlert,
} from 'lucide-react';

// ─── Status badge helper ───────────────────────────────────────────────────────
function StatusBadge({ status, dpd }: { status: string; dpd: number }) {
  const map: Record<string, { bg: string; color: string }> = {
    Overdue: { bg: '#FEF2F2', color: '#DC2626' },
    Substandard: { bg: '#FFFBEB', color: '#D97706' },
    Loss: { bg: '#F3F4F6', color: '#374151' },
    Active: { bg: '#ECFDF5', color: '#047857' },
  };
  const s = map[status] ?? map.Active;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.6875rem', fontWeight: 700,
      padding: '0.125rem 0.5rem', borderRadius: '0.375rem',
      background: s.bg, color: s.color,
    }}>
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
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.875rem 1.25rem',
      background: allOk ? '#ECFDF5' : '#FFFBEB',
      border: `1px solid ${allOk ? '#A7F3D0' : '#FDE68A'}`,
      borderRadius: '0.75rem', marginBottom: '1.5rem',
      gap: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        {allOk
          ? <CheckCircle size={18} color="#047857" />
          : <AlertTriangle size={18} color="#D97706" />}
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: allOk ? '#065F46' : '#92400E', margin: 0 }}>
            {allOk ? 'Alerts dispatched successfully' : 'Alerts sent with some failures'}
          </p>
          <p style={{ fontSize: '0.75rem', color: allOk ? '#047857' : '#D97706', margin: 0 }}>
            {result.sent} sent · {result.failed} failed · {result.attempted} total clients targeted
          </p>
        </div>
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '0.25rem' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <Link
                href="/reports"
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#9CA3AF', textDecoration: 'none' }}
              >
                <ArrowLeft size={13} /> Reports
              </Link>
            </div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#111113', letterSpacing: '-0.02em', margin: 0 }}>
              Daily Report
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
              Generated: {reportDate}
            </p>
          </div>

          {canSendAlerts && overdueLoans.length > 0 && (
            <button
              id="btn-send-overdue-alerts"
              onClick={handleSendAlerts}
              disabled={isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                background: isPending ? '#9CA3AF' : '#DC2626',
                color: '#FFF', border: 'none', borderRadius: '0.625rem',
                fontSize: '0.875rem', fontWeight: 700, cursor: isPending ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s', boxShadow: '0 1px 4px rgba(220,38,38,0.3)',
              }}
            >
              {isPending
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending Alerts…</>
                : <><Send size={14} /> Send Overdue Alerts ({overdueLoans.length})</>}
            </button>
          )}
        </div>
      </header>

      {/* ── Alert Result Banner ── */}
      <AlertResultBanner result={alertResult} onClose={() => setAlertResult(null)} />

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.875rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Due This Week', value: dueThisWeek.length, icon: <Calendar size={16} />, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Overdue Accounts', value: overdueLoans.length, icon: <AlertTriangle size={16} />, color: '#DC2626', bg: '#FEF2F2' },
          {
            label: 'Total Overdue Exposure',
            value: `KES ${overdueLoans.reduce((s, l) => s + l.balance, 0).toLocaleString()}`,
            icon: <TrendingDown size={16} />, color: '#D97706', bg: '#FFFBEB',
          },
          {
            label: 'Clients at Risk',
            value: new Set(overdueLoans.map(l => l.clientId)).size,
            icon: <Users size={16} />, color: '#7C3AED', bg: '#F5F3FF',
          },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: kpi.bg, border: `1px solid ${kpi.color}20`,
            borderLeft: `3px solid ${kpi.color}`,
            borderRadius: '0.75rem', padding: '0.875rem 1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: kpi.color, marginBottom: '0.375rem' }}>
              {kpi.icon}
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</span>
            </div>
            <span style={{ fontSize: '1.375rem', fontWeight: 800, color: '#111113', fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>

        {/* ── Due This Week ── */}
        <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1.125rem 1.5rem',
            borderBottom: '1px solid #F3F4F6',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ padding: '0.375rem', background: '#EFF6FF', borderRadius: '0.5rem' }}>
                <Calendar size={16} color="#2563EB" />
              </div>
              <div>
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#111113', margin: 0 }}>Due This Week</h2>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>Installments due Mon–Sun</p>
              </div>
            </div>
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem',
              background: '#EFF6FF', color: '#2563EB', borderRadius: '1rem',
            }}>
              {dueThisWeek.length} agreement(s)
            </span>
          </div>

          {dueThisWeek.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <CheckCircle size={32} style={{ color: '#D1D5DB', margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#6B7280' }}>No installments due this week</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    {['Client', 'Agreement ID', 'Vehicle Price', 'Bal After Deposit', 'Total Balance', 'Due Date', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '0.625rem 1rem', fontSize: '0.6875rem', fontWeight: 700, color: '#6B7280', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dueThisWeek.map((loan, i) => (
                    <tr key={loan.$id} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#FFF' : '#FAFAFA' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111113', margin: 0 }}>{loan.clientName}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                          {loan.clientPhone && (
                            <span style={{ fontSize: '0.6875rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Phone size={9} /> {loan.clientPhone}
                            </span>
                          )}
                          {loan.clientEmail && (
                            <span style={{ fontSize: '0.6875rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Mail size={9} /> {loan.clientEmail}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#6B7280' }}>{loan.loanType || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                        {formatAmount(loan.amountApplied)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                        {formatAmount(loan.principalDisbursed)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#111113', fontVariantNumeric: 'tabular-nums' }}>
                        {loan.nextInstallmentAmount != null ? formatAmount(loan.nextInstallmentAmount) : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#374151', whiteSpace: 'nowrap' }}>
                        {loan.nextInstallmentDate
                          ? new Date(loan.nextInstallmentDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })
                          : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
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
        <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1.125rem 1.5rem',
            borderBottom: '1px solid #FECACA',
            background: overdueLoans.length > 0 ? '#FFF5F5' : '#FFF',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ padding: '0.375rem', background: '#FEE2E2', borderRadius: '0.5rem' }}>
                <BadgeAlert size={16} color="#DC2626" />
              </div>
              <div>
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: overdueLoans.length > 0 ? '#B91C1C' : '#111113', margin: 0 }}>
                  Overdue Agreements
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>
                  Loans past their payment deadline
                </p>
              </div>
            </div>
            {overdueLoans.length > 0 && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem',
                background: '#FEE2E2', color: '#DC2626', borderRadius: '1rem',
              }}>
                {overdueLoans.length} agreement(s)
              </span>
            )}
          </div>

          {overdueLoans.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <CheckCircle size={32} style={{ color: '#D1D5DB', margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#6B7280' }}>No overdue loans today</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
                <thead>
                  <tr style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
                    {['Client & Contact', 'Agreement ID', 'Vehicle Price', 'Balance after Deposit', 'Total Balance', 'DPD', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '0.625rem 1rem', fontSize: '0.6875rem', fontWeight: 700, color: '#B91C1C', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overdueLoans.map((loan, i) => {
                    const isLoss = loan.status === 'Loss';
                    const isSub = loan.status === 'Substandard';
                    return (
                      <tr
                        key={loan.$id}
                        style={{
                          borderBottom: '1px solid #FEE2E2',
                          background: isLoss ? '#FFF5F5' : isSub ? '#FFFBEB' : i % 2 === 0 ? '#FFF' : '#FAFAFA',
                        }}
                      >
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111113', margin: 0 }}>{loan.clientName}</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.3rem' }}>
                            {loan.clientPhone && (
                              <a href={`tel:${loan.clientPhone}`} style={{ fontSize: '0.75rem', color: '#2563EB', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
                                <Phone size={10} /> {loan.clientPhone}
                              </a>
                            )}
                            {loan.clientEmail && (
                              <a href={`mailto:${loan.clientEmail}`} style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
                                <Mail size={10} /> {loan.clientEmail}
                              </a>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: '#6B7280' }}>{loan.loanType || '—'}</td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#374151', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {formatAmount(loan.amountApplied)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                          {formatAmount(loan.principalDisbursed)}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#B91C1C', fontVariantNumeric: 'tabular-nums', display: 'block' }}>
                            {formatAmount(loan.balance)}
                          </span>
                          {(loan.remainingPenalties > 0) && (
                            <span style={{ fontSize: '0.6875rem', color: '#D97706' }}>
                              incl. {formatAmount(loan.remainingPenalties)} penalties
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{
                            fontSize: '1rem', fontWeight: 800,
                            color: loan.daysPastDue >= 90 ? '#7F1D1D' : loan.daysPastDue >= 30 ? '#B91C1C' : '#D97706',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {loan.daysPastDue}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginLeft: '0.2rem' }}>d</span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <StatusBadge status={loan.status} dpd={0} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
