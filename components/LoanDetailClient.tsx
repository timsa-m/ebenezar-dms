'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reversePenalty } from '@/lib/actions/penalty.actions';
import { disburseLoan, deleteTransaction, editTransaction, deletePenalty, editPenalty } from '@/lib/actions/loan.actions';
import { deleteFinancingAgreement } from '@/lib/actions/dms.actions';
import { formatAmount, cn } from '@/lib/utils';
import RepaymentModal from './RepaymentModal';
import PenaltyModal from './PenaltyModal';
import RestructureModal from './RestructureModal';
import RolloverModal from './RolloverModal';
import WriteOffModal from './WriteOffModal';
import WaiveModal from './WaiveModal';
import DisbursementModal from './DisbursementModal';
import ChangeStatusModal from './ChangeStatusModal';
import InstallmentsTable from './InstallmentsTable';
// LoanAgreementModal removed
import { toast } from '@/lib/toast';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import {
  DollarSign, AlertTriangle, FileText, ChevronDown,
  CheckCircle, RotateCcw, ArrowUpRight, ShieldCheck,
  RefreshCw, FastForward, Ban, Calendar, LayoutList,
  ArrowDownUp, ChevronRight, Layers, BadgeAlert, Percent,
  PenLine, ExternalLink, SendHorizonal, Info,
  Pencil, Trash2,
} from 'lucide-react';
import Link from 'next/link';

// ─── Audit dot config ─────────────────────────────────────────────────────────
interface AuditDot { action: AuditAction; className: string; symbol: string; }
const AUDIT_DOT_MAP: Record<string, AuditDot> = {
  REPAYMENT_CREATED: { action: 'REPAYMENT_CREATED', className: 'timeline-dot-repayment', symbol: '↓' },
  REPAYMENT_REVERSED: { action: 'REPAYMENT_REVERSED', className: 'timeline-dot-penalty', symbol: '↺' },
  PENALTY_ADDED: { action: 'PENALTY_ADDED', className: 'timeline-dot-penalty', symbol: '!' },
  PENALTY_REVERSED: { action: 'PENALTY_REVERSED', className: 'timeline-dot-system', symbol: '↺' },
  LOAN_APPROVED: { action: 'LOAN_APPROVED', className: 'timeline-dot-loan', symbol: '✓' },
  LOAN_DENIED: { action: 'LOAN_DENIED', className: 'timeline-dot-penalty', symbol: '✗' },
  LOAN_UPDATED: { action: 'LOAN_UPDATED', className: 'timeline-dot-system', symbol: '✎' },
  STATUS_CHANGED: { action: 'STATUS_CHANGED', className: 'timeline-dot-loan', symbol: '⇄' },
  STATEMENT_GENERATED: { action: 'STATEMENT_GENERATED', className: 'timeline-dot-system', symbol: '⬇' },
};
function humanizeAction(a: string) {
  return a.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Transaction type styling ─────────────────────────────────────────────────
const TX_TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  'Repayment': { bg: '#ECFDF5', color: '#047857', label: 'Repayment' },
  'Disbursement': { bg: '#EFF6FF', color: '#1D4ED8', label: 'Disbursement' },
  'Manual Penalty': { bg: '#FEF2F2', color: '#B91C1C', label: 'Penalty' },
  'Restructure Adjustment': { bg: '#F5F3FF', color: '#7C3AED', label: 'Restructure' },
  'Waiver': { bg: '#FEF3C7', color: '#D97706', label: 'Waiver' },
};

// ─── Lifecycle badge ──────────────────────────────────────────────────────────
function LifecycleBadge({ state }: { state?: string }) {
  if (!state || state === 'Standard') return null;
  const cfg: Record<string, { bg: string; color: string; border: string }> = {
    Restructured: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    Rollover: { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  };
  const style = cfg[state] ?? cfg.Restructured;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem',
      borderRadius: '0.375rem', border: `1px solid ${style.border}`,
      background: style.bg, color: style.color, letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      <Layers size={9} />
      {state}
    </span>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function Tab({ id, label, active, count, icon, onClick }: {
  id: string; label: string; active: boolean;
  count?: number; icon: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.375rem',
        padding: '0.625rem 1rem',
        fontSize: '0.8125rem', fontWeight: active ? 700 : 500,
        color: active ? '#111113' : '#6B7280',
        borderBottom: active ? '2px solid #111113' : '2px solid transparent',
        background: 'transparent', border: 'none',
        borderBottomWidth: '2px',
        borderBottomStyle: 'solid',
        borderBottomColor: active ? '#111113' : 'transparent',
        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.15s',
      }}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span style={{
          marginLeft: '0.125rem',
          fontSize: '0.625rem', fontWeight: 700,
          padding: '0.0625rem 0.375rem',
          background: active ? '#111113' : '#E5E7EB',
          color: active ? '#FFF' : '#6B7280',
          borderRadius: '1rem', transition: 'all 0.15s',
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main component props ─────────────────────────────────────────────────────
interface Props {
  loan: Loan & { $id: string; lifecycleState?: string; daysPastDue?: number; remainingPrincipal?: number; remainingInterest?: number; remainingPenalties?: number; remainingFees?: number; salePrice?: number; depositPaid?: number; vehicleDetails?: string };
  client: LMSClient;
  repayments: Repayment[];
  penalties: Penalty[];
  auditLogs: AuditLog[];
  currentUser: User;
  totalPaid: number;
  progressPercent: number;
  installments: LoanInstallment[];
  transactions: LoanTransaction[];
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function LoanDetailClient({
  loan, client, repayments, penalties, auditLogs,
  currentUser, totalPaid, progressPercent,
  installments, transactions,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'installments' | 'transactions' | 'penalties' | 'audit'>('installments');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [reversingId, setReversingId] = useState<string | null>(null);
  // Agreement modal state removed
  // ── DATA CORRECTION STATE (admin-only, temporary) ─────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<LoanTransaction | null>(null);
  const [editForm, setEditForm] = useState<{ amount: string; date: string; comment: string; paymentMethod: string; referenceId: string }>({ amount: '', date: '', comment: '', paymentMethod: '', referenceId: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editingPenalty, setEditingPenalty] = useState<Penalty | null>(null);
  const [editPenaltyForm, setEditPenaltyForm] = useState<{ amount: string; date: string; penaltyType: string; comment: string }>({ amount: '', date: '', penaltyType: '', comment: '' });
  const [editPenaltySaving, setEditPenaltySaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'transaction' | 'penalty' | 'contract'; id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isAdmin = currentUser?.role === 'ADMIN';

  // Open a private storage file via a fresh signed URL
  const openSecureFile = async (bucket: string, path: string) => {
    try {
      const res = await fetch(
        `/api/storage/signed-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
      );
      if (!res.ok) throw new Error("Failed to get signed URL");
      const { signedUrl } = await res.json();
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      alert("Could not open the document. Please try again.");
    }
  };

  const isActionable = ['Active', 'Overdue', 'Substandard', 'Loss'].includes(loan.status);
  const dpd = (loan as any).daysPastDue ?? 0;
  const lifecycleState = (loan as any).lifecycleState;

  // ── Waivers Detection & Reconciliation ────────────────────────────────────
  const waiverRepayments = (repayments || []).filter(
    (r: any) =>
      (r.paymentMethod || r.payment_method || '').toLowerCase() === 'waiver' ||
      (r.type || '').toLowerCase() === 'waiver' ||
      (r.comment || r.notes || '').toUpperCase().includes('[WAIVER')
  );

  const totalWaived = waiverRepayments.reduce(
    (sum: number, r: any) => sum + (Number(r.amount || r.amount_paid) || 0),
    0
  );

  const totalWaivedPenalties = waiverRepayments.reduce(
    (sum: number, r: any) =>
      sum + (Number(r.allocatedPenalties || r.allocated_penalties) || (r.comment?.includes('Penalty') || r.notes?.includes('Penalty') ? Number(r.amount || r.amount_paid) : 0)),
    0
  );

  const totalWaivedInterest = waiverRepayments.reduce(
    (sum: number, r: any) =>
      sum + (Number(r.allocatedOverdueInterest || r.allocated_overdue_interest) || (r.comment?.includes('Interest') || r.notes?.includes('Interest') ? Number(r.amount || r.amount_paid) : 0)),
    0
  );

  const totalWaivedPrincipal = Math.max(0, totalWaived - totalWaivedPenalties - totalWaivedInterest);

  // ── Single source of truth: installment columns ───────────────────────────
  const rawRemPrincipal = loan.status === 'Pending'
    ? (loan.principalAmount || 0)
    : installments.reduce((sum, inst) => sum + Math.max(0, inst.principalDue - inst.principalPaid), 0);

  const rawRemInterest = loan.status === 'Pending'
    ? (loan.totalInterest || 0)
    : installments.reduce((sum, inst) => sum + Math.max(0, inst.interestDue - inst.interestPaid), 0);

  const rawRemPenalties = loan.status === 'Pending'
    ? 0
    : installments.reduce((sum, inst) => sum + Math.max(0, inst.penaltiesDue - inst.penaltiesPaid), 0);

  const remFees = loan.status === 'Pending'
    ? 0
    : installments.reduce((sum, inst) => sum + Math.max(0, inst.feesDue - inst.feesPaid), 0);

  // Net remaining amounts incorporating all balance adjustments / waivers
  const remPrincipal = Math.max(0, rawRemPrincipal - totalWaivedPrincipal);
  const remInterest = Math.max(0, rawRemInterest - totalWaivedInterest);
  const remPenalties = Math.max(0, rawRemPenalties - totalWaivedPenalties);

  // For the KPI strip Penalties card: sum active non-rollover penalty transactions minus any penalty waivers
  const activePenalties = penalties.filter(p => p.status === 'Active' && p.penaltyType !== 'Rollover Fee');
  const totalPenaltiesAmt = Math.max(0, activePenalties.reduce((s, p) => s + p.amount, 0) - totalWaivedPenalties);

  // ── Total Expected: sum every component across installments ──────────────────
  const totalExpected = loan.status === 'Pending'
    ? (loan.totalPayable || 0)
    : installments.reduce((sum, inst) =>
      sum + (inst.principalDue || 0)
      + (inst.interestDue || 0)
      + (inst.penaltiesDue || 0)
      + (inst.feesDue || 0)
      , 0);

  // Outstanding Balance:
  // Must check for any waived amounts across both installment computations and DB agreement balance.
  const rawInstallmentBalance = rawRemPrincipal + rawRemInterest + rawRemPenalties + remFees;
  const installmentBalanceAfterWaivers = Math.max(0, rawInstallmentBalance - totalWaived);
  const dbContractBalance = loan.balance != null ? Number(loan.balance) : null;
  const isSettledStatus = ['Fully Paid', 'Completed', 'Written Off'].includes(loan.status);

  // displayBalance: Authoritative balance checking both DB record and net installments after waivers
  const displayBalance = isSettledStatus
    ? 0
    : dbContractBalance != null
      ? (installments.length > 0 ? Math.min(dbContractBalance, installmentBalanceAfterWaivers) : dbContractBalance)
      : (installments.length > 0 ? installmentBalanceAfterWaivers : 0);

  const handleReversePenalty = async (penaltyId: string) => {
    if (!confirm('Reverse this penalty? This will restore the loan balance.')) return;
    setReversingId(penaltyId);
    try {
      await reversePenalty(penaltyId, loan.$id);
      router.refresh();
    } catch {
      alert('Failed to reverse penalty.');
    } finally {
      setReversingId(null);
    }
  };

  // ── DATA CORRECTION HANDLERS (admin-only, temporary) ─────────────────────
  const handleDeleteTransaction = async (txId: string) => {
    setDeletingId(txId);
    const res = await deleteTransaction(txId, loan.$id);
    setDeletingId(null);
    if (!res.success) { toast.error(`Failed: ${res.error}`); return; }
    setDeleteTarget(null);
    router.refresh();
  };

  const handleDeletePenalty = async (penaltyId: string) => {
    setDeletingId(penaltyId);
    const res = await deletePenalty(penaltyId, loan.$id);
    setDeletingId(null);
    if (!res.success) { toast.error(`Failed: ${res.error}`); return; }
    setDeleteTarget(null);
    router.refresh();
  };

  const startEditTx = (tx: LoanTransaction) => {
    setEditingTx(tx);
    setEditForm({
      amount: String(tx.amount),
      date: tx.date ? new Date(tx.date).toISOString().slice(0, 10) : '',
      comment: tx.comment || '',
      paymentMethod: tx.paymentMethod || '',
      referenceId: tx.referenceId || '',
    });
  };

  const handleSaveEditTx = async () => {
    if (!editingTx) return;
    setEditSaving(true);
    const res = await editTransaction(editingTx.$id, loan.$id, {
      amount: editForm.amount ? Number(editForm.amount) : undefined,
      date: editForm.date ? `${editForm.date}T12:00:00Z` : undefined,
      comment: editForm.comment || undefined,
      paymentMethod: editForm.paymentMethod || undefined,
      referenceId: editForm.referenceId || undefined,
    });
    setEditSaving(false);
    if (!res.success) { alert(`Failed: ${res.error}`); return; }
    setEditingTx(null);
    router.refresh();
  };

  const startEditPenalty = (pen: Penalty) => {
    setEditingPenalty(pen);
    setEditPenaltyForm({
      amount: String(pen.amount),
      date: pen.dateApplied ? new Date(pen.dateApplied).toISOString().slice(0, 10) : '',
      penaltyType: pen.penaltyType || 'Late Payment',
      comment: pen.comment || '',
    });
  };

  const handleSaveEditPenalty = async () => {
    if (!editingPenalty) return;
    setEditPenaltySaving(true);
    const res = await editPenalty(editingPenalty.$id, loan.$id, {
      amount: editPenaltyForm.amount ? Number(editPenaltyForm.amount) : undefined,
      date: editPenaltyForm.date || undefined,
      penaltyType: editPenaltyForm.penaltyType || undefined,
      comment: editPenaltyForm.comment || undefined,
    });
    setEditPenaltySaving(false);
    if (!res.success) { toast.error(`Failed: ${res.error}`); return; }
    toast.success('Penalty updated successfully');
    setEditingPenalty(null);
    router.refresh();
  };

  return (
    <>
      {/* ── KPI Strip ── */}
      <div className="kpi-strip" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="kpi-card">
          <span className="kpi-label">Total Expected</span>
          <span className="kpi-value">{formatAmount(totalExpected)}</span>
          <span className="kpi-sub">Incl. fees & penalties</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Total Collected</span>
          <span className={cn('kpi-value', totalPaid > 0 ? 'kpi-value-success' : '')}>
            {formatAmount(totalPaid)}
          </span>
          <span className="kpi-sub">{progressPercent.toFixed(1)}% recovered</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Outstanding Balance</span>
          <span className={cn('kpi-value', displayBalance > 0 ? 'kpi-value-danger' : 'kpi-value-success')}>
            {formatAmount(displayBalance)}
          </span>
          <span className="kpi-sub">
            {totalWaived > 0 ? `After ${formatAmount(totalWaived)} waived` : 'Current liability'}
          </span>
        </div>
        {totalWaived > 0 && (
          <div className="kpi-card" style={{ borderColor: '#FDE68A', background: '#FFFDF5' }}>
            <span className="kpi-label" style={{ color: '#B45309' }}>Total Waived</span>
            <span className="kpi-value" style={{ color: '#D97706' }}>
              {formatAmount(totalWaived)}
            </span>
            <span className="kpi-sub" style={{ color: '#92400E' }}>Approved debt relief</span>
          </div>
        )}
        <div className="kpi-card">
          <span className="kpi-label">Penalties</span>
          <span className={cn('kpi-value', totalPenaltiesAmt > 0 ? 'kpi-value-warning' : '')}>
            {formatAmount(totalPenaltiesAmt)}
          </span>
          <span className="kpi-sub">{activePenalties.length} active</span>
        </div>
        {dpd > 0 && loan.status !== 'Fully Paid' && (
          <div className="kpi-card" style={{ borderColor: '#FECACA' }}>
            <span className="kpi-label" style={{ color: '#B91C1C' }}>Days Past Due</span>
            <span className="kpi-value" style={{ color: dpd >= 90 ? '#7F1D1D' : '#B91C1C' }}>{dpd}</span>
            <span className="kpi-sub" style={{ color: '#EF4444' }}>{dpd >= 90 ? 'Loss classification' : dpd >= 30 ? 'Defaulting' : 'Overdue'}</span>
          </div>
        )}
      </div>

      {/* ── Balance Breakdown ── */}
      {loan.status !== 'Fully Paid' && (remPenalties > 0 || remFees > 0 || totalWaived > 0) && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.625rem', marginBottom: '1.25rem',
        }}>
          {[
            // Use calculated remPenalties instead of raw totalPenaltiesAmt since some could be paid
            { label: 'Remaining Penalties', value: remPenalties, color: '#DC2626' },
            { label: 'Remaining Fees', value: remFees, color: '#7C3AED' },
            { label: 'Waived Relief', value: totalWaived, color: '#D97706', prefix: '-' },
          ].filter(r => r.value > 0).map(row => (
            <div key={row.label} style={{
              padding: '0.625rem 0.875rem',
              background: '#FAFAFA', border: '1px solid #F3F4F6', borderRadius: '0.625rem',
              borderLeft: `3px solid ${row.color}`,
            }}>
              <span style={{ display: 'block', fontSize: '0.625rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                {row.label}
              </span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: row.color, fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(row.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Main 2-col layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }} className="loan-detail-grid">

          {/* LEFT: Sale Terms */}
          <div className="card-premium" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#111113', borderRadius: '0.875rem 0.875rem 0 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <h2 className="section-heading" style={{ marginBottom: 0 }}>Sale Details</h2>
                <LifecycleBadge state={lifecycleState} />
              </div>
              {loan.status === 'Pending' && (
                <Link href={`/loans/${loan.$id}/edit`} className="btn-accent" style={{ fontSize: '0.75rem' }}>
                  Revise Terms
                </Link>
              )}
            </div>

            <div className="detail-grid">
              {(loan as any).vehicleDetails && typeof (loan as any).vehicleDetails === 'object' && (
                <div className="detail-field" style={{ gridColumn: '1 / -1', background: '#F8FAFC', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0' }}>
                  <span className="detail-label" style={{ color: '#475569', marginBottom: '0.5rem', display: 'block' }}>Vehicle Details</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase' }}>Make & Model</span>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A' }}>{(loan as any).vehicleDetails.make_model || '—'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase' }}>Registration No.</span>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0F172A' }}>{(loan as any).vehicleDetails.registration_no || '—'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase' }}>Year</span>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#334155' }}>{(loan as any).vehicleDetails.year || '—'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase' }}>Color</span>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#334155' }}>{(loan as any).vehicleDetails.color || '—'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase' }}>Mileage</span>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#334155' }}>{(loan as any).vehicleDetails.mileage ? `${(loan as any).vehicleDetails.mileage.toLocaleString()} km` : '—'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.625rem', color: '#64748B', textTransform: 'uppercase' }}>Engine / Trans</span>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#334155' }}>
                        {[(loan as any).vehicleDetails.engine_capacity, (loan as any).vehicleDetails.transmission].filter(Boolean).join(' / ') || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="detail-field">
                <span className="detail-label">Contract Type</span>
                <span className="detail-value">{loan.loanType || '—'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Sale Price</span>
                <span className="detail-value detail-value-lg">{formatAmount((loan as any).salePrice || loan.principalAmount || 0)}</span>
              </div>
              {(loan as any).depositPaid != null && (
                <div className="detail-field">
                  <span className="detail-label">Deposit Paid</span>
                  <span className="detail-value detail-value-lg" style={{ color: '#047857' }}>
                    {formatAmount((loan as any).depositPaid)}
                  </span>
                </div>
              )}
              {(loan as any).depositPaid != null &&
                (loan as any).salePrice > (loan as any).depositPaid && (
                  <div className="detail-field">
                    <span className="detail-label">Balance</span>
                    <span className="detail-value" style={{ color: '#D97706', fontWeight: 700 }}>
                      {formatAmount((loan as any).salePrice - (loan as any).depositPaid)}
                    </span>
                  </div>
                )}
              <div className="detail-field">
                <span className="detail-label">Tenure</span>
                <span className="detail-value detail-value-lg">{loan.durationInMonths}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9CA3AF' }}> mo</span></span>
              </div>
              {loan.installmentAmount && (
                <div className="detail-field">
                  <span className="detail-label">Expected Installment</span>
                  <span className="detail-value">{formatAmount(loan.installmentAmount)} /mo</span>
                </div>
              )}
              {loan.startDate && (
                <div className="detail-field">
                  <span className="detail-label">Start Date</span>
                  <span className="detail-value">
                    {(loan as any).disbursedAt
                      ? new Date((loan as any).disbursedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                      : new Date(loan.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              {loan.dueDate && (
                <div className="detail-field">
                  <span className="detail-label">Due Date</span>
                  <span className="detail-value">{new Date(loan.dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
            </div>

            {/* Risk & Security */}
            {(loan.comment || loan.guarantorName || loan.documentUrl) && (
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #F3F4F6' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={16} className="text-gray-500" /> More Information
                </h3>
                {loan.comment && (
                  <div style={{ marginBottom: '1rem' }}>
                    <span className="detail-label">Witness & Other Information</span>
                    <p style={{ fontSize: '0.8125rem', color: '#374151', marginTop: '0.25rem', backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                      {loan.comment}
                    </p>
                  </div>
                )}
                {loan.guarantorName && (
                  <div>
                    <span className="detail-label">Witness Details</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginTop: '0.25rem', backgroundColor: '#F9FAFB', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.6875rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#111827' }}>{loan.guarantorName}</span>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.6875rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#111827' }}>{loan.guarantorPhone || '—'}</span>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.6875rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#111827' }}>{loan.guarantorId || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}
                {loan.documentUrl && (
                  <div style={{ marginTop: '1rem' }}>
                    <span className="detail-label">Attached Physical Document</span>
                    <button
                      onClick={() => openSecureFile('loan-documents', loan.documentUrl!)}
                      style={{
                        marginTop: '0.375rem', display: 'flex', alignItems: 'center',
                        gap: '0.5rem', padding: '0.5rem 0.875rem',
                        background: '#FFFFFF', border: '1px solid #E5E7EB',
                        borderRadius: '0.625rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: '#111113',
                        transition: 'background 0.15s',
                      }}
                    >
                      <FileText size={14} />
                      View Uploaded Document
                      <ArrowUpRight size={12} style={{ opacity: 0.6 }} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Progress */}
            <div className="progress-wrap">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="detail-label">Payment Progress</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: progressPercent >= 100 ? '#047857' : '#111113', fontVariantNumeric: 'tabular-nums' }}>
                  {progressPercent.toFixed(1)}%
                </span>
              </div>
              <div className="progress-bar-track">
                <div
                  className={cn('progress-bar-fill', progressPercent >= 100 ? 'progress-bar-fill-success' : '')}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                  Collected: {formatAmount(totalPaid)}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#9CA3AF', fontVariantNumeric: 'tabular-nums' }}>
                  Target: {formatAmount(loan.totalPayable)}
                </span>
              </div>
              {((loan.status as string) === 'Written Off') && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#FEF2F2', borderRadius: '0.375rem', border: '1px solid #FECACA' }}>
                  <p style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, textAlign: 'center' }}>This loan has been permanently written off by an Administrator.</p>
                </div>
              )}
            </div>

            {/* Signature banner removed */}

          </div>

          {/* ── Tabbed Data Section ── */}
          <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Tab nav */}
            <div style={{
              display: 'flex', borderBottom: '1px solid #F3F4F6',
              overflowX: 'auto', padding: '0 1.25rem',
              scrollbarWidth: 'none',
            }}>
              <Tab
                id="tab-installments"
                label="Installments"
                active={activeTab === 'installments'}
                count={installments.length}
                icon={<Calendar size={13} />}
                onClick={() => setActiveTab('installments')}
              />
              <Tab
                id="tab-transactions"
                label="Transactions"
                active={activeTab === 'transactions'}
                count={transactions.length}
                icon={<ArrowDownUp size={13} />}
                onClick={() => setActiveTab('transactions')}
              />
              <Tab
                id="tab-penalties"
                label="Penalties"
                active={activeTab === 'penalties'}
                count={penalties.length}
                icon={<BadgeAlert size={13} />}
                onClick={() => setActiveTab('penalties')}
              />
              <Tab
                id="tab-audit"
                label="Audit Trail"
                active={activeTab === 'audit'}
                count={auditLogs.length}
                icon={<LayoutList size={13} />}
                onClick={() => setActiveTab('audit')}
              />
            </div>

            <div style={{ padding: '1.25rem' }}>

              {/* ── Installments Tab ── */}
              {activeTab === 'installments' && (
                <InstallmentsTable
                  installments={installments}
                  loan={loan}
                  repayments={repayments}
                  totalWaived={totalWaived}
                />
              )}

              {/* ── Transactions Tab ── */}
              {activeTab === 'transactions' && (
                <div>
                  {transactions.length === 0 ? (
                    <div className="data-empty" style={{ padding: '3rem' }}>
                      <DollarSign size={32} style={{ color: '#D1D5DB', marginBottom: '0.75rem' }} />
                      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#6B7280' }}>No transactions recorded</p>
                      <p style={{ fontSize: '0.8125rem', color: '#D1D5DB', marginTop: '0.25rem' }}>Repayments and penalties will appear here.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="data-table-wrap">
                        <div className="data-table-scroll">
                          {/* ── DATA CORRECTION banner ── */}
                          {isAdmin && (
                            <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.875rem', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <AlertTriangle size={14} style={{ color: '#C2410C', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9A3412' }}>DATA CORRECTION MODE — Admin only. Edit/Delete buttons are visible. Disable via handshake.md when done.</span>
                            </div>
                          )}
                          <table className="data-table" style={{ minWidth: '680px' }}>
                            <colgroup>
                              <col style={{ width: '14%' }} />
                              <col style={{ width: '12%' }} />
                              <col style={{ width: '16%' }} />
                              <col style={{ width: '18%' }} />
                              <col style={{ width: '16%' }} />
                              <col style={{ width: '10%' }} />
                              <col style={{ width: '4%' }} />
                              {isAdmin && <col style={{ width: '10%' }} />}
                            </colgroup>
                            <thead>
                              <tr className="data-table-head-row">
                                <th className="data-th text-left">Date</th>
                                <th className="data-th text-left">Type</th>
                                <th className="data-th text-right">Amount</th>
                                <th className="data-th text-left">Method / Note</th>
                                <th className="data-th text-left">Reference</th>
                                <th className="data-th text-left">Status</th>
                                <th className="data-th" />
                                {isAdmin && <th className="data-th text-center" style={{ color: '#C2410C' }}>⚠ Admin</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {transactions.map((tx) => {
                                const typeStyle = TX_TYPE_STYLE[tx.type] ?? TX_TYPE_STYLE['Repayment'];
                                const isExpanded = expandedTx === tx.$id;
                                const hasAllocation = (tx.type === 'Repayment' || tx.type === 'Waiver') && (
                                  tx.allocatedFees + tx.allocatedPenalties + tx.allocatedOverdueInterest +
                                  tx.allocatedCurrentInterest + tx.allocatedOverduePrincipal +
                                  tx.allocatedCurrentPrincipal + tx.allocatedToWallet
                                ) > 0;

                                return (
                                  <>
                                    <tr
                                      key={tx.$id}
                                      className="data-table-row"
                                      style={{ cursor: hasAllocation ? 'pointer' : 'default', opacity: tx.status === 'Reversed' ? 0.5 : 1 }}
                                      onClick={() => hasAllocation && setExpandedTx(isExpanded ? null : tx.$id)}
                                    >
                                      <td className="data-td" style={{ fontSize: '0.8125rem', color: '#6B7280', fontWeight: 500 }}>
                                        {new Date(tx.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </td>
                                      <td className="data-td">
                                        <span style={{
                                          display: 'inline-block', fontSize: '0.6875rem', fontWeight: 700,
                                          padding: '0.125rem 0.5rem', borderRadius: '0.375rem',
                                          background: typeStyle.bg, color: typeStyle.color,
                                        }}>
                                          {typeStyle.label}
                                        </span>
                                      </td>
                                      <td className="data-td" style={{ textAlign: 'right', fontWeight: 700, color: tx.type === 'Manual Penalty' ? '#B91C1C' : '#047857', fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem' }}>
                                        {tx.type === 'Manual Penalty' ? '+' : ''}{formatAmount(tx.amount)}
                                      </td>
                                      <td className="data-td" style={{ fontSize: '0.8125rem', color: '#374151' }}>
                                        {tx.paymentMethod || tx.comment || '—'}
                                      </td>
                                      <td className="data-td" style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', color: '#9CA3AF' }}>
                                        {tx.referenceId || '—'}
                                      </td>
                                      <td className="data-td">
                                        <span className={cn('badge', tx.status === 'Active' ? 'badge-success' : 'badge-pending')} style={{ fontSize: '0.6875rem' }}>
                                          {tx.status}
                                        </span>
                                      </td>
                                      <td className="data-td" style={{ textAlign: 'center' }}>
                                        {hasAllocation && (
                                          <ChevronRight size={14} style={{
                                            color: '#9CA3AF',
                                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s',
                                          }} />
                                        )}
                                      </td>
                                      {isAdmin && (
                                        <td className="data-td" style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                          <button
                                            title="Edit transaction"
                                            onClick={() => startEditTx(tx)}
                                            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.375rem', padding: '0.2rem 0.5rem', cursor: 'pointer', color: '#1D4ED8', marginRight: '0.25rem' }}
                                          >
                                            <Pencil size={11} />
                                          </button>
                                          <button
                                            title="Delete transaction"
                                            disabled={deletingId === tx.$id}
                                            onClick={() => setDeleteTarget({ type: 'transaction', id: tx.$id, label: `Transaction of ${formatAmount(tx.amount)}` })}
                                            style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.375rem', padding: '0.2rem 0.5rem', cursor: 'pointer', color: '#B91C1C' }}
                                          >
                                            {deletingId === tx.$id ? '...' : <Trash2 size={11} />}
                                          </button>
                                        </td>
                                      )}
                                    </tr>

                                    {/* Inline edit form row */}
                                    {isAdmin && editingTx?.$id === tx.$id && (
                                      <tr key={`${tx.$id}-edit`}>
                                        <td colSpan={8} style={{ padding: '0.875rem 1.25rem', background: '#FFFBEB', borderBottom: '2px solid #FCD34D' }}>
                                          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', marginBottom: '0.625rem' }}>✎ Edit Transaction</p>
                                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.625rem', marginBottom: '0.75rem' }}>
                                            {[
                                              { label: 'Amount (KES)', key: 'amount', type: 'number' },
                                              { label: 'Date', key: 'date', type: 'date' },
                                              { label: 'Payment Method', key: 'paymentMethod', type: 'text' },
                                              { label: 'Reference No.', key: 'referenceId', type: 'text' },
                                              { label: 'Comment / Notes', key: 'comment', type: 'text' },
                                            ].map(f => (
                                              <div key={f.key}>
                                                <label style={{ display: 'block', fontSize: '0.6875rem', color: '#92400E', fontWeight: 600, marginBottom: '0.25rem' }}>{f.label}</label>
                                                <input
                                                  type={f.type}
                                                  value={(editForm as any)[f.key]}
                                                  onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                  style={{ width: '100%', padding: '0.375rem 0.625rem', fontSize: '0.8125rem', border: '1px solid #FCD34D', borderRadius: '0.375rem', background: '#FFFDE7', boxSizing: 'border-box' }}
                                                />
                                              </div>
                                            ))}
                                          </div>
                                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={handleSaveEditTx} disabled={editSaving} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 700, background: '#1D4ED8', color: '#FFF', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                                              {editSaving ? 'Saving…' : 'Save Changes'}
                                            </button>
                                            <button onClick={() => setEditingTx(null)} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: '0.375rem', cursor: 'pointer' }}>
                                              Cancel
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )}

                                    {/* Allocation Detail Row */}
                                    {isExpanded && hasAllocation && (
                                      <tr key={`${tx.$id}-alloc`}>
                                        <td colSpan={isAdmin ? 8 : 7} style={{ padding: 0, background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                                          <div style={{ padding: '0.875rem 1.5rem' }}>
                                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>
                                              {tx.type === 'Waiver' ? 'Waiver Allocation Breakdown' : 'Payment Allocation Breakdown'}
                                            </p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                              {[
                                                { label: 'Fees', value: tx.allocatedFees, color: '#7C3AED' },
                                                { label: 'Penalties', value: tx.allocatedPenalties, color: '#B91C1C' },
                                                { label: 'Overdue Interest', value: tx.allocatedOverdueInterest, color: '#D97706' },
                                                { label: 'Current Interest', value: tx.allocatedCurrentInterest, color: '#D97706' },
                                                { label: 'Overdue Principal', value: tx.allocatedOverduePrincipal, color: '#1D4ED8' },
                                                { label: 'Current Principal', value: tx.allocatedCurrentPrincipal, color: '#1D4ED8' },
                                                { label: 'Wallet Buffer', value: tx.allocatedToWallet, color: '#6B7280' },
                                              ].filter(a => a.value > 0).map(alloc => (
                                                <div key={alloc.label} style={{
                                                  padding: '0.375rem 0.75rem',
                                                  background: '#FFF', border: `1px solid ${alloc.color}30`,
                                                  borderLeft: `3px solid ${alloc.color}`,
                                                  borderRadius: '0.375rem',
                                                }}>
                                                  <span style={{ display: 'block', fontSize: '0.625rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{alloc.label}</span>
                                                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: alloc.color, fontVariantNumeric: 'tabular-nums' }}>{formatAmount(alloc.value)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Penalties Tab ── */}
              {activeTab === 'penalties' && (
                <div>
                  {totalPenaltiesAmt > 0 && (
                    <div style={{
                      marginBottom: '1rem', padding: '0.625rem 0.875rem',
                      background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.625rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#991B1B' }}>Active Penalties</span>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#B91C1C', fontVariantNumeric: 'tabular-nums' }}>
                        {formatAmount(totalPenaltiesAmt)}
                      </span>
                    </div>
                  )}
                  <div className="data-table-wrap">
                    <div className="data-table-scroll">
                      <table className="data-table" style={{ minWidth: '760px' }}>
                        <colgroup>
                          <col style={{ width: '14%' }} />
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '18%' }} />
                          <col style={{ width: '26%' }} />
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '10%' }} />
                        </colgroup>
                        <thead>
                          <tr className="data-table-head-row">
                            <th className="data-th text-left">Date</th>
                            <th className="data-th text-left">Type</th>
                            <th className="data-th text-right">Amount</th>
                            <th className="data-th text-left">Reason</th>
                            <th className="data-th text-left">Status</th>
                            <th className="data-th text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {penalties.map((pen) => (
                            <React.Fragment key={pen.$id}>
                              <tr className="data-table-row" style={{ opacity: pen.status === 'Reversed' ? 0.5 : 1 }}>
                                <td className="data-td" style={{ fontSize: '0.8125rem', color: '#6B7280', fontWeight: 500 }}>
                                  {new Date(pen.dateApplied).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="data-td" style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
                                  {pen.penaltyType}
                                </td>
                                <td className="data-td" style={{ textAlign: 'right', fontWeight: 700, color: '#B91C1C', fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem' }}>
                                  +{formatAmount(pen.amount)}
                                </td>
                                <td className="data-td" style={{ fontSize: '0.8125rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {pen.comment || '—'}
                                </td>
                                <td className="data-td">
                                  <span className={cn('badge', pen.status === 'Active' ? 'badge-error' : 'badge-pending')}>
                                    {pen.status}
                                  </span>
                                </td>
                                <td className="data-td" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  {isAdmin && (
                                    <button
                                      title="Edit penalty"
                                      onClick={() => startEditPenalty(pen)}
                                      style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.375rem', padding: '0.2rem 0.5rem', cursor: 'pointer', color: '#1D4ED8', marginRight: '0.25rem' }}
                                    >
                                      <Pencil size={11} />
                                    </button>
                                  )}
                                  {pen.status === 'Active' && isActionable && (
                                    <button
                                      className="btn-secondary row-action-btn"
                                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', marginRight: isAdmin ? '0.25rem' : 0 }}
                                      onClick={() => handleReversePenalty(pen.$id)}
                                      disabled={reversingId === pen.$id}
                                      title="Reverse penalty"
                                    >
                                      {reversingId === pen.$id ? '...' : <RotateCcw size={11} />}
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button
                                      title="Delete penalty"
                                      disabled={deletingId === pen.$id}
                                      onClick={() => setDeleteTarget({ type: 'penalty', id: pen.$id, label: `${pen.penaltyType} of ${formatAmount(pen.amount)}` })}
                                      style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.375rem', padding: '0.2rem 0.5rem', cursor: 'pointer', color: '#B91C1C' }}
                                    >
                                      {deletingId === pen.$id ? '...' : <Trash2 size={11} />}
                                    </button>
                                  )}
                                </td>
                              </tr>

                              {/* Inline edit form row */}
                              {isAdmin && editingPenalty?.$id === pen.$id && (
                                <tr key={`${pen.$id}-edit`}>
                                  <td colSpan={6} style={{ padding: '0.875rem 1.25rem', background: '#FFFBEB', borderBottom: '2px solid #FCD34D' }}>
                                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', marginBottom: '0.625rem' }}>✎ Edit Penalty (Backdate / Adjust)</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.625rem', marginBottom: '0.75rem' }}>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.6875rem', color: '#92400E', fontWeight: 600, marginBottom: '0.25rem' }}>Date Applied</label>
                                        <input
                                          type="date"
                                          value={editPenaltyForm.date}
                                          onChange={e => setEditPenaltyForm(prev => ({ ...prev, date: e.target.value }))}
                                          style={{ width: '100%', padding: '0.375rem 0.625rem', fontSize: '0.8125rem', border: '1px solid #FCD34D', borderRadius: '0.375rem', background: '#FFFDE7', boxSizing: 'border-box' }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.6875rem', color: '#92400E', fontWeight: 600, marginBottom: '0.25rem' }}>Penalty Type</label>
                                        <input
                                          type="text"
                                          value={editPenaltyForm.penaltyType}
                                          onChange={e => setEditPenaltyForm(prev => ({ ...prev, penaltyType: e.target.value }))}
                                          list="penalty-types-list"
                                          style={{ width: '100%', padding: '0.375rem 0.625rem', fontSize: '0.8125rem', border: '1px solid #FCD34D', borderRadius: '0.375rem', background: '#FFFDE7', boxSizing: 'border-box' }}
                                        />
                                        <datalist id="penalty-types-list">
                                          <option value="Late Payment" />
                                          <option value="Missed Payment" />
                                          <option value="Overdue Interest" />
                                          <option value="Interest on Default" />
                                          <option value="Auctioneer Fees" />
                                          <option value="Manual Administrative Charge" />
                                          <option value="Restructuring Fee" />
                                          <option value="Recovery Fee" />
                                          <option value="Legal Fee" />
                                        </datalist>
                                      </div>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.6875rem', color: '#92400E', fontWeight: 600, marginBottom: '0.25rem' }}>Amount (KES)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={editPenaltyForm.amount}
                                          onChange={e => setEditPenaltyForm(prev => ({ ...prev, amount: e.target.value }))}
                                          style={{ width: '100%', padding: '0.375rem 0.625rem', fontSize: '0.8125rem', border: '1px solid #FCD34D', borderRadius: '0.375rem', background: '#FFFDE7', boxSizing: 'border-box' }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.6875rem', color: '#92400E', fontWeight: 600, marginBottom: '0.25rem' }}>Reason / Comment</label>
                                        <input
                                          type="text"
                                          value={editPenaltyForm.comment}
                                          onChange={e => setEditPenaltyForm(prev => ({ ...prev, comment: e.target.value }))}
                                          style={{ width: '100%', padding: '0.375rem 0.625rem', fontSize: '0.8125rem', border: '1px solid #FCD34D', borderRadius: '0.375rem', background: '#FFFDE7', boxSizing: 'border-box' }}
                                        />
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <button onClick={handleSaveEditPenalty} disabled={editPenaltySaving} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 700, background: '#1D4ED8', color: '#FFF', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                                        {editPenaltySaving ? 'Saving…' : 'Save Changes'}
                                      </button>
                                      <button onClick={() => setEditingPenalty(null)} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: '0.375rem', cursor: 'pointer' }}>
                                        Cancel
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                          {penalties.length === 0 && (
                            <tr>
                              <td colSpan={6} className="data-empty-cell">
                                <div className="data-empty">
                                  <CheckCircle size={28} style={{ color: '#D1D5DB', marginBottom: '0.5rem' }} />
                                  <p style={{ fontSize: '0.875rem', color: '#9CA3AF', fontWeight: 500 }}>No penalties applied</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Audit Tab ── */}
              {activeTab === 'audit' && (
                <div>
                  {auditLogs.length === 0 ? (
                    <div className="data-empty" style={{ padding: '3rem' }}>
                      <LayoutList size={28} style={{ color: '#D1D5DB', marginBottom: '0.5rem' }} />
                      <p style={{ fontSize: '0.875rem', color: '#9CA3AF', fontWeight: 500 }}>No audit events recorded</p>
                    </div>
                  ) : (
                    <div className="timeline">
                      {auditLogs.map((log) => {
                        const dot = AUDIT_DOT_MAP[log.action] || AUDIT_DOT_MAP.LOAN_UPDATED;
                        return (
                          <div key={log.$id} className="timeline-item">
                            <div className={cn('timeline-dot', dot.className)}>{dot.symbol}</div>
                            <div className="timeline-content">
                              <p className="timeline-action">{humanizeAction(log.action)}</p>
                              <p className="timeline-desc">{log.description}</p>
                              <p className="timeline-meta">
                                By {log.performedBy} · {new Date(log.timestamp).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>


      {/* Global Delete Confirmation Modal for Tx/Penalty */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        isPending={isDeleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setIsDeleting(true);
          if (deleteTarget.type === 'transaction') {
            await handleDeleteTransaction(deleteTarget.id);
          } else if (deleteTarget.type === 'penalty') {
            await handleDeletePenalty(deleteTarget.id);
          }
          setIsDeleting(false);
        }}
        title={
          deleteTarget?.type === 'transaction' ? 'Delete Transaction' :
            'Delete Penalty'
        }
        description="This record will be permanently removed and cannot be recovered."
        confirmLabel="Delete Permanently"
        itemName={deleteTarget?.label}
      />
    </>
  );
}

// ─── Standalone Action Panel ──────────────────────────────────────────────────
interface ActionPanelProps {
  loan: Loan & { $id: string; lifecycleState?: string; daysPastDue?: number };
  client: LMSClient;
  currentUser: User;
  repayments?: Repayment[];
  penalties?: Penalty[];
  installments?: LoanInstallment[];
  transactions?: LoanTransaction[];
}

export function ActionPanel({
  loan,
  client,
  currentUser,
  repayments = [],
  penalties = [],
  installments = [],
  transactions = [],
}: ActionPanelProps) {
  const router = useRouter();
  const [showRepayment, setShowRepayment] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);
  const [showRestructure, setShowRestructure] = useState(false);
  const [showRollover, setShowRollover] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [showWaive, setShowWaive] = useState(false);
  const [showDisbursement, setShowDisbursement] = useState(false);
  const [showChangeStatus, setShowChangeStatus] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteContract, setDeleteContract] = useState<string | null>(null);

  // ── DATA CORRECTION (admin-only, temporary) ───────────────────────────────
  const handleDeleteLoan = async () => {
    setIsDeleting(true);
    const res = await deleteFinancingAgreement(loan.$id);
    setIsDeleting(false);
    if (!res.success) {
      toast.error(`Failed: ${res.error}`);
      return;
    }
    setDeleteContract(null);
    toast.success('Contract permanently deleted.');
    router.push('/loans');
  };


  const lifecycleState = (loan as any).lifecycleState;
  // null means never disbursed; 0 means explicitly set to zero (treat same as never)
  const rawPrincipalDisbursed = (loan as any).principalDisbursed;
  const hasNeverBeenDisbursed = rawPrincipalDisbursed == null;
  const principalDisbursed = Number(rawPrincipalDisbursed ?? 0);
  const amountApplied = Number((loan as any).amountApplied ?? loan.principalAmount ?? 0);
  const remainingToDisburse = hasNeverBeenDisbursed
    ? amountApplied                                          // null = full amount still to disburse
    : Math.max(0, amountApplied - principalDisbursed);      // partial: remainder
  const isFirstTranche = principalDisbursed === 0;
  // Show the disbursement card for any actionable loan that still has funds to disburse
  const DISBURSABLE_STATUSES = ['Active', 'Overdue', 'Loss'];
  const isAwaitingDisbursement = DISBURSABLE_STATUSES.includes(loan.status) && remainingToDisburse > 0;
  const disbursedPct = amountApplied > 0 ? Math.min(100, (principalDisbursed / amountApplied) * 100) : 0;

  // ── Waivers Detection in ActionPanel ──
  const waiverRepayments = (repayments || []).filter(
    (r: any) =>
      (r.paymentMethod || r.payment_method || '').toLowerCase() === 'waiver' ||
      (r.type || '').toLowerCase() === 'waiver' ||
      (r.comment || r.notes || '').toUpperCase().includes('[WAIVER')
  );

  const totalWaived = waiverRepayments.reduce(
    (sum: number, r: any) => sum + (Number(r.amount || r.amount_paid) || 0),
    0
  );

  const rawRemPrincipal = (installments || []).reduce(
    (sum, inst) => sum + Math.max(0, (inst.principalDue || 0) - (inst.principalPaid || 0)),
    0
  );
  const rawRemInterest = (installments || []).reduce(
    (sum, inst) => sum + Math.max(0, (inst.interestDue || 0) - (inst.interestPaid || 0)),
    0
  );
  const rawRemPenalties = (installments || []).reduce(
    (sum, inst) => sum + Math.max(0, (inst.penaltiesDue || 0) - (inst.penaltiesPaid || 0)),
    0
  );
  const remFees = (installments || []).reduce(
    (sum, inst) => sum + Math.max(0, (inst.feesDue || 0) - (inst.feesPaid || 0)),
    0
  );

  const installmentBalance = Math.max(0, (rawRemPrincipal + rawRemInterest + rawRemPenalties + remFees) - totalWaived);
  const dbContractBalance = loan.balance != null ? Number(loan.balance) : null;
  const isSettledStatus = ['Fully Paid', 'Completed', 'Written Off'].includes(loan.status);

  const effectiveOutstandingBalance = isSettledStatus
    ? 0
    : dbContractBalance != null
      ? ((installments && installments.length > 0) ? Math.min(dbContractBalance, installmentBalance) : dbContractBalance)
      : ((installments && installments.length > 0) ? installmentBalance : 0);

  const hasOutstandingBalance = effectiveOutstandingBalance > 0;
  const canRepay = ['Active', 'Overdue', 'Substandard', 'Defaulting', 'Loss'].includes(loan.status) && hasOutstandingBalance;
  const canPenalise = ['Active', 'Overdue', 'Substandard', 'Defaulting', 'Loss'].includes(loan.status);
  const canLifecycle = ['Active', 'Overdue', 'Substandard', 'Defaulting', 'Loss'].includes(loan.status);
  const canRenew = loan.status === 'Fully Paid';
  const canWriteOff = ['Active', 'Overdue', 'Substandard', 'Defaulting', 'Loss'].includes(loan.status) && hasOutstandingBalance && currentUser?.role === 'ADMIN';
  const canWaive = ['Active', 'Overdue', 'Substandard', 'Defaulting', 'Loss'].includes(loan.status) && hasOutstandingBalance && ['ADMIN', 'MANAGER'].includes(currentUser?.role || '');

  return (
    <>

      {/* ── Payment Actions ── */}
      <div className="info-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span className="section-heading" style={{ marginBottom: 0, fontSize: '0.875rem' }}>Actions</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span className={cn('badge', {
              'badge-success': loan.status === 'Active',
              'badge-pending': loan.status === 'Pending',
              'badge-error': ['Overdue', 'Denied', 'Written Off', 'Loss'].includes(loan.status),
              'badge-completed': loan.status === 'Fully Paid',
            })}>
              {loan.status === 'Substandard' ? 'Defaulting' : loan.status}
            </span>
            <LifecycleBadge state={lifecycleState} />
          </div>
        </div>
        <div className="action-btn-row">

          {canRepay && (
            <button
              id="btn-log-repayment"
              className="action-btn action-btn-primary"
              onClick={() => setShowRepayment(true)}
              title="Log a payment against this contract"
            >
              <DollarSign size={15} />
              Log Payment
            </button>
          )}
          {canPenalise && (
            <button
              id="btn-apply-penalty"
              className="action-btn action-btn-danger-soft"
              onClick={() => currentUser && setShowPenalty(true)}
              disabled={!currentUser}
              title={!currentUser ? 'Session unavailable — please refresh' : 'Apply a manual penalty to this loan'}
              style={{ opacity: currentUser ? 1 : 0.5, cursor: currentUser ? 'pointer' : 'not-allowed' }}
            >
              <AlertTriangle size={15} />
              Apply Penalty
            </button>
          )}
          <Link
            href={`/loans/${loan.$id}/contract`}
            className="action-btn action-btn-primary"
            style={{ display: 'flex' }}
            title="Generate and print official vehicle Sale Agreement"
          >
            <FileText size={15} />
            Sale Agreement
          </Link>
          <Link
            href={`/loans/${loan.$id}/statement`}
            className="action-btn action-btn-outline"
            style={{ display: 'flex' }}
          >
            <FileText size={15} />
            View Statement
          </Link>

        </div>
      </div>

      {/* ── Lifecycle Operations ── */}
      {loan.status !== 'Fully Paid' && (canLifecycle || canRenew) && (
        <div className="info-card" style={{ borderLeft: '3px solid #7C3AED' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
            Lifecycle Operations
          </p>
          <div className="action-btn-row">

            {canLifecycle && (
              <button
                id="btn-rollover-loan"
                className="action-btn action-btn-outline"
                onClick={() => setShowRollover(true)}
                title="Extend this Contract — extend the period and apply a restructure fee"
                style={{ borderColor: '#7C3AED', color: '#7C3AED' }}
              >
                <FastForward size={15} />
                Restructure
              </button>
            )}

          </div>
          <p style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: '0.75rem', lineHeight: 1.5 }}>
            {canLifecycle && 'Restructure changes the terms, extends the period with a fee. '}
            {canRenew && 'Renewal creates a brand-new loan pre-filled with these terms.'}
          </p>
        </div>
      )}

      {/* ── Credit Administration (ADMIN and MANAGER only) ── */}
      {(canWriteOff || canWaive) && (
        <div className="info-card" style={{ borderLeft: '3px solid #D97706', background: '#FFFCF5' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Credit Administration
            </p>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400E', background: '#FEF3C7', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>
              Bal: {formatAmount(effectiveOutstandingBalance)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {canWaive && (
              <button
                id="btn-waive-balance"
                className="action-btn"
                onClick={() => setShowWaive(true)}
                title="Waive loan balance (Principal, Interest, or Penalty) to reduce customer debt"
                style={{ width: '100%', justifyContent: 'center', background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', fontWeight: 600 }}
              >
                <Percent size={15} />
                Waive Balance / Penalties
              </button>
            )}
            {canWriteOff && (
              <button
                id="btn-write-off-loan"
                className="action-btn"
                onClick={() => setShowWriteOff(true)}
                title="Write off this contract — marks the balance as an uncollectible credit loss (Admin only)"
                style={{ width: '100%', justifyContent: 'center', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: 600 }}
              >
                <Ban size={15} />
                Write Off Contract ({formatAmount(effectiveOutstandingBalance)})
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.6875rem', color: '#78716C', marginTop: '0.625rem', lineHeight: 1.5, marginBottom: 0 }}>
            {canWaive && "• Waiver adjusts outstanding balance immediately & records formal credit adjustment."}
            {canWaive && canWriteOff && <br />}
            {canWriteOff && "• Write Off is an irreversible accounting bad debt recognition (Admin only)."}
          </p>
        </div>
      )}

      {/* ── DATA CORRECTION: Delete Loan (ADMIN ONLY, TEMPORARY) ── */}
      {currentUser?.role === 'ADMIN' && (
        <div className="info-card" style={{ borderLeft: '3px solid #7F1D1D', background: '#FFF1F2' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9A3412', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            ⚠ Data Correction (Admin)
          </p>
          <button
            id="btn-delete-loan"
            className="action-btn"
            onClick={() => setDeleteContract(loan.$id)}
            title="Permanently delete this loan and all its data"
            style={{ width: '100%', justifyContent: 'center', background: '#7F1D1D', color: '#FFF', border: 'none', fontWeight: 700 }}
          >
            <Trash2 size={15} />
            Delete Contract
          </button>

          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #FECDD3' }}>
            <button
              id="btn-change-status"
              className="action-btn"
              onClick={() => setShowChangeStatus(true)}
              title="Force change the status of this loan"
              style={{ width: '100%', justifyContent: 'center', background: '#FFF', color: '#9A3412', border: '1px solid #FECDD3', fontWeight: 600 }}
            >
              <ArrowDownUp size={15} />
              Change Status
            </button>
          </div>
        </div>
      )}

      {/* ── Client Info ── */}
      <div className="info-card">
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
          Buyer / Client
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.875rem', borderBottom: '1px solid #F3F4F6' }}>
          <div className="client-avatar" style={{ width: '2.5rem', height: '2.5rem', fontSize: '0.875rem' }}>
            {client?.firstName?.[0] || '?'}
          </div>
          <div>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
              <Link href={`/clients/${client?.$id}`} className="hover:underline" style={{ color: '#111113' }}>
                {client?.firstName} {client?.lastName}
              </Link>
            </p>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 500 }}>Buyer</p>
          </div>
        </div>
        {[
          { label: 'Email', value: client?.email || '—' },
          { label: 'Phone', value: client?.phone || '—' },
          { label: 'National ID', value: client?.nationalId || '—' },
          { label: 'Total Purchases', value: client?.totalBorrowed ? `KES ${client.totalBorrowed.toLocaleString()}` : '—' },
        ].map(row => (
          <div key={row.label} className="info-card-row">
            <span className="info-key">{row.label}</span>
            <span className="info-value">{row.value}</span>
          </div>
        ))}
      </div>

      {/* ── Modals ── */}
      {showRepayment && (
        <RepaymentModal
          loanId={loan.$id}
          maxAmount={loan.balance}
          onClose={() => setShowRepayment(false)}
        />
      )}
      {showPenalty && currentUser && (
        <PenaltyModal
          loanId={loan.$id}
          clientId={loan.clientId}
          loanBalance={loan.balance}
          currentUser={currentUser}
          onClose={() => setShowPenalty(false)}
        />
      )}
      {showRestructure && (
        <RestructureModal
          loan={loan}
          onClose={() => setShowRestructure(false)}
        />
      )}
      {showRollover && (
        <RolloverModal
          loan={loan}
          onClose={() => setShowRollover(false)}
        />
      )}
      {showWriteOff && currentUser && (
        <WriteOffModal
          loanId={loan.$id}
          currentUser={currentUser}
          loan={{ balance: effectiveOutstandingBalance, principalAmount: loan.principalAmount }}
          onClose={() => setShowWriteOff(false)}
        />
      )}
      {showWaive && currentUser && (
        <WaiveModal
          loanId={loan.$id}
          currentUser={currentUser}
          loan={{
            balance: effectiveOutstandingBalance,
            total_penalties: Math.max(0, rawRemPenalties - totalWaived),
            remainingPrincipal: Math.max(0, rawRemPrincipal - totalWaived),
            remainingInterest: rawRemInterest,
            remainingPenalties: Math.max(0, rawRemPenalties - totalWaived),
          }}
          onClose={() => setShowWaive(false)}
        />
      )}
      {showDisbursement && (
        <DisbursementModal
          loanId={loan.$id}
          amountApplied={amountApplied}
          principalDisbursed={principalDisbursed}
          remainingToDisburse={remainingToDisburse}
          isFirstTranche={isFirstTranche}
          onClose={() => setShowDisbursement(false)}
        />
      )}
      {showChangeStatus && currentUser && (
        <ChangeStatusModal
          loanId={loan.$id}
          currentStatus={loan.status}
          currentUser={currentUser}
          onClose={() => setShowChangeStatus(false)}
        />
      )}

      {/* Global Delete Confirmation Modal for Contract */}
      <ConfirmDeleteModal
        isOpen={!!deleteContract}
        onClose={() => !isDeleting && setDeleteContract(null)}
        isPending={isDeleting}
        onConfirm={async () => {
          if (!deleteContract) return;
          await handleDeleteLoan();
        }}
        title="Delete Contract"
        description="This will permanently remove the contract, all transactions, installments and penalties. This CANNOT be undone."
        confirmLabel="Delete Permanently"
        itemName={`Contract ${loan.$id.slice(-8).toUpperCase()}`}
      />
    </>
  );
}
