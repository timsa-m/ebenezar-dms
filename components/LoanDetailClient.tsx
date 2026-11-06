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
import SecureActionModal from '@/components/security/SecureActionModal';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
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
const TX_TYPE_STYLE: Record<string, { className: string; label: string }> = {
  'Repayment': { className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40', label: 'Repayment' },
  'Disbursement': { className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/40', label: 'Disbursement' },
  'Manual Penalty': { className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/40', label: 'Penalty' },
  'Restructure Adjustment': { className: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/40', label: 'Restructure' },
  'Waiver': { className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/40', label: 'Waiver' },
};

// ─── Lifecycle badge ──────────────────────────────────────────────────────────
function LifecycleBadge({ state }: { state?: string }) {
  if (!state || state === 'Standard') return null;
  const cfg: Record<string, string> = {
    Restructured: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/40',
    Rollover: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/40',
  };
  const cls = cfg[state] ?? cfg.Restructured;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border tracking-wide uppercase ${cls}`}>
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
      className={cn(
        "flex items-center gap-1.5 px-4 py-2.5 text-xs transition-all border-b-2 cursor-pointer whitespace-nowrap",
        active
          ? "font-bold text-gray-900 dark:text-[#B7FF3C] border-gray-900 dark:border-[#B7FF3C]"
          : "font-medium text-gray-500 dark:text-[#A1ADA4] border-transparent hover:text-gray-900 dark:hover:text-[#F4F7F4]"
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all",
            active
              ? "bg-gray-900 dark:bg-[#B7FF3C] text-white dark:text-[#090C0A]"
              : "bg-gray-200 dark:bg-[#1D2920] text-gray-600 dark:text-[#A1ADA4]"
          )}
        >
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
  const [activeTab, setActiveTab] = usePersistedState<'installments' | 'transactions' | 'penalties' | 'audit'>(
    `dms_loan_tab_${loan?.$id || 'current'}`,
    'installments'
  );
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

  const [reversePenaltyTarget, setReversePenaltyTarget] = useState<{ id: string; amount?: number } | null>(null);

  const handleReversePenalty = async (penaltyId: string, verificationToken?: string) => {
    setReversingId(penaltyId);
    try {
      await reversePenalty(penaltyId, loan.$id, verificationToken);
      toast.success('Penalty reversed successfully.');
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reverse penalty.');
    } finally {
      setReversingId(null);
      setReversePenaltyTarget(null);
    }
  };

  // ── DATA CORRECTION HANDLERS (admin-only, temporary) ─────────────────────
  const handleDeleteTransaction = async (txId: string, verificationToken?: string) => {
    setDeletingId(txId);
    const res = await deleteTransaction(txId, loan.$id, verificationToken);
    setDeletingId(null);
    if (!res.success) { toast.error(`Failed: ${res.error}`); return; }
    setDeleteTarget(null);
    toast.success('Transaction permanently deleted.');
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
          <div className="flex items-center justify-between mb-1">
            <span className="kpi-label text-gray-500 dark:text-[#A1ADA4]">Total Expected</span>
            <DollarSign size={14} className="text-gray-400 dark:text-[#A1ADA4]" />
          </div>
          <span className="kpi-value text-gray-900 dark:text-[#F4F7F4]">{formatAmount(totalExpected)}</span>
          <span className="kpi-sub text-gray-500 dark:text-[#A1ADA4]">Incl. fees & penalties</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-1">
            <span className="kpi-label text-gray-500 dark:text-[#A1ADA4]">Total Collected</span>
            <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className={cn('kpi-value', totalPaid > 0 ? 'kpi-value-success text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-[#F4F7F4]')}>
            {formatAmount(totalPaid)}
          </span>
          <span className="kpi-sub text-gray-500 dark:text-[#A1ADA4]">{progressPercent.toFixed(1)}% recovered</span>
        </div>
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-1">
            <span className="kpi-label text-gray-500 dark:text-[#A1ADA4]">Outstanding Balance</span>
            <DollarSign size={14} className={displayBalance > 0 ? "text-red-500 dark:text-[#FF626D]" : "text-emerald-500 dark:text-emerald-400"} />
          </div>
          <span className={cn('kpi-value', displayBalance > 0 ? 'kpi-value-danger text-red-600 dark:text-[#FF626D]' : 'kpi-value-success text-emerald-600 dark:text-emerald-400')}>
            {formatAmount(displayBalance)}
          </span>
          <span className="kpi-sub text-gray-500 dark:text-[#A1ADA4]">
            {totalWaived > 0 ? `After ${formatAmount(totalWaived)} waived` : 'Current liability'}
          </span>
        </div>
        {totalWaived > 0 && (
          <div className="kpi-card border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20">
            <div className="flex items-center justify-between mb-1">
              <span className="kpi-label text-amber-800 dark:text-amber-400">Total Waived</span>
              <Percent size={14} className="text-amber-600 dark:text-amber-400" />
            </div>
            <span className="kpi-value text-amber-600 dark:text-amber-300">
              {formatAmount(totalWaived)}
            </span>
            <span className="kpi-sub text-amber-700 dark:text-amber-400/80">Approved debt relief</span>
          </div>
        )}
        <div className="kpi-card">
          <div className="flex items-center justify-between mb-1">
            <span className="kpi-label text-gray-500 dark:text-[#A1ADA4]">Penalties</span>
            <AlertTriangle size={14} className={totalPenaltiesAmt > 0 ? "text-amber-500 dark:text-[#F5BD4F]" : "text-gray-400 dark:text-[#A1ADA4]"} />
          </div>
          <span className={cn('kpi-value', totalPenaltiesAmt > 0 ? 'kpi-value-warning text-amber-600 dark:text-[#F5BD4F]' : 'text-gray-900 dark:text-[#F4F7F4]')}>
            {formatAmount(totalPenaltiesAmt)}
          </span>
          <span className="kpi-sub text-gray-500 dark:text-[#A1ADA4]">{activePenalties.length} active</span>
        </div>
        {dpd > 0 && loan.status !== 'Fully Paid' && (
          <div className="kpi-card border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20">
            <div className="flex items-center justify-between mb-1">
              <span className="kpi-label text-red-700 dark:text-red-400">Days Past Due</span>
              <Calendar size={14} className="text-red-500 dark:text-[#FF626D]" />
            </div>
            <span className="kpi-value text-red-700 dark:text-[#FF626D]">{dpd}</span>
            <span className="kpi-sub text-red-600 dark:text-red-400/80">{dpd >= 90 ? 'Loss classification' : dpd >= 30 ? 'Defaulting' : 'Overdue'}</span>
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
            <div key={row.label} className="p-2.5 sm:p-3 rounded-xl border border-gray-200 dark:border-[#29352D] bg-gray-50 dark:bg-[#18221A]" style={{ borderLeft: `3px solid ${row.color}` }}>
              <span className="block text-[10px] text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider mb-1">
                {row.label}
              </span>
              <span className="text-sm font-extrabold tabular-nums" style={{ color: row.color }}>
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
          <div className="card-premium relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gray-900 dark:bg-[#B7FF3C] rounded-t-2xl" />
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
                <div className="detail-field col-span-full bg-slate-50 dark:bg-[#18221A] p-3.5 rounded-xl border border-slate-200 dark:border-[#29352D]">
                  <span className="detail-label text-slate-700 dark:text-[#C1CBC3] mb-2 block">Vehicle Details</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#A1ADA4] uppercase tracking-wider block">Make & Model</span>
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-[#F4F7F4]">{(loan as any).vehicleDetails.make_model || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#A1ADA4] uppercase tracking-wider block">Registration No.</span>
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-[#F4F7F4]">{(loan as any).vehicleDetails.registration_no || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#A1ADA4] uppercase tracking-wider block">Year</span>
                      <div className="text-[13px] font-medium text-slate-700 dark:text-[#C1CBC3]">{(loan as any).vehicleDetails.year || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#A1ADA4] uppercase tracking-wider block">Color</span>
                      <div className="text-[13px] font-medium text-slate-700 dark:text-[#C1CBC3]">{(loan as any).vehicleDetails.color || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#A1ADA4] uppercase tracking-wider block">Mileage</span>
                      <div className="text-[13px] font-medium text-slate-700 dark:text-[#C1CBC3]">{(loan as any).vehicleDetails.mileage ? `${(loan as any).vehicleDetails.mileage.toLocaleString()} km` : '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-[#A1ADA4] uppercase tracking-wider block">Engine / Trans</span>
                      <div className="text-[13px] font-medium text-slate-700 dark:text-[#C1CBC3]">
                        {[(loan as any).vehicleDetails.engine_capacity, (loan as any).vehicleDetails.transmission].filter(Boolean).join(' / ') || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="detail-field">
                <span className="detail-label text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Contract Type</span>
                <span className="detail-value text-sm font-bold text-gray-900 dark:text-[#F4F7F4]">{loan.loanType || '—'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Sale Price</span>
                <span className="detail-value detail-value-lg text-lg font-extrabold text-gray-900 dark:text-[#F4F7F4] tabular-nums">{formatAmount((loan as any).salePrice || loan.principalAmount || 0)}</span>
              </div>
              {(loan as any).depositPaid != null && (
                <div className="detail-field">
                  <span className="detail-label text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Deposit Paid</span>
                  <span className="detail-value detail-value-lg text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatAmount((loan as any).depositPaid)}
                  </span>
                </div>
              )}
              {(loan as any).depositPaid != null &&
                (loan as any).salePrice > (loan as any).depositPaid && (
                  <div className="detail-field">
                    <span className="detail-label text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Balance</span>
                    <span className="detail-value text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatAmount((loan as any).salePrice - (loan as any).depositPaid)}
                    </span>
                  </div>
                )}
              <div className="detail-field">
                <span className="detail-label text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Tenure</span>
                <span className="detail-value detail-value-lg text-lg font-extrabold text-gray-900 dark:text-[#F4F7F4]">{loan.durationInMonths}<span className="text-gray-400 dark:text-[#A1ADA4] text-xs font-medium"> mo</span></span>
              </div>
              {loan.installmentAmount && (
                <div className="detail-field">
                  <span className="detail-label text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Expected Installment</span>
                  <span className="detail-value text-sm font-bold text-gray-900 dark:text-[#F4F7F4] tabular-nums">{formatAmount(loan.installmentAmount)} /mo</span>
                </div>
              )}
              {loan.startDate && (
                <div className="detail-field">
                  <span className="detail-label text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Start Date</span>
                  <span className="detail-value text-sm font-semibold text-gray-900 dark:text-[#F4F7F4]">
                    {(loan as any).disbursedAt
                      ? new Date((loan as any).disbursedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                      : new Date(loan.startDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              {loan.dueDate && (
                <div className="detail-field">
                  <span className="detail-label text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Due Date</span>
                  <span className="detail-value text-sm font-semibold text-gray-900 dark:text-[#F4F7F4]">{new Date(loan.dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
            </div>

            {/* Risk & Security */}
            {(loan.comment || loan.guarantorName || loan.documentUrl) && (
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-[#29352D]">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-[#F4F7F4] mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-gray-400 dark:text-[#B7FF3C]" /> More Information
                </h3>
                {loan.comment && (
                  <div style={{ marginBottom: '1rem' }}>
                    <span className="detail-label text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Witness & Other Information</span>
                    <p className="text-[13px] text-gray-700 dark:text-[#C1CBC3] mt-1 bg-gray-50 dark:bg-[#18221A] p-3 rounded-xl border border-gray-200 dark:border-[#29352D] leading-relaxed">
                      {loan.comment}
                    </p>
                  </div>
                )}
                {loan.guarantorName && (
                  <div>
                    <span className="detail-label text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Witness Details</span>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4 mt-1 bg-gray-50 dark:bg-[#18221A] p-3.5 rounded-xl border border-gray-200 dark:border-[#29352D]">
                      <div>
                        <span className="block text-[11px] text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Name</span>
                        <span className="text-[13px] font-semibold text-gray-900 dark:text-[#F4F7F4]">{loan.guarantorName}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Phone</span>
                        <span className="text-[13px] font-semibold text-gray-900 dark:text-[#F4F7F4]">{loan.guarantorPhone || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">ID</span>
                        <span className="text-[13px] font-semibold text-gray-900 dark:text-[#F4F7F4]">{loan.guarantorId || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}
                {loan.documentUrl && (
                  <div style={{ marginTop: '1rem' }}>
                    <span className="detail-label text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Attached Physical Document</span>
                    <button
                      onClick={() => openSecureFile('loan-documents', loan.documentUrl!)}
                      className="mt-1.5 flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#1D2920] border border-gray-200 dark:border-[#29352D] rounded-xl shadow-xs cursor-pointer text-xs font-semibold text-gray-900 dark:text-[#F4F7F4] hover:bg-gray-50 dark:hover:bg-[#222E25] transition-all"
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
                <span className="detail-label text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">Payment Progress</span>
                <span className={cn("text-[13px] font-bold tabular-nums", progressPercent >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-[#F4F7F4]")}>
                  {progressPercent.toFixed(1)}%
                </span>
              </div>
              <div className="progress-bar-track bg-gray-200 dark:bg-[#1D2920] border border-transparent dark:border-[#29352D] h-2 rounded-full overflow-hidden my-2.5">
                <div
                  className={cn('progress-bar-fill h-full rounded-full transition-all duration-700', progressPercent >= 100 ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-gray-900 dark:bg-[#B7FF3C] dark:shadow-[0_0_10px_rgba(183,255,60,0.4)]')}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  Collected: {formatAmount(totalPaid)}
                </span>
                <span className="text-xs font-medium text-gray-500 dark:text-[#A1ADA4] tabular-nums">
                  Target: {formatAmount(loan.totalPayable)}
                </span>
              </div>
              {((loan.status as string) === 'Written Off') && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/40 rounded-md border border-red-200 dark:border-red-900/50">
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold text-center m-0">This loan has been permanently written off by an Administrator.</p>
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
                            <div className="mb-3 p-2.5 sm:p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center gap-2">
                              <AlertTriangle size={14} className="text-amber-700 dark:text-amber-400 shrink-0" />
                              <span className="text-xs font-semibold text-amber-900 dark:text-amber-300">DATA CORRECTION MODE — Admin only. Edit/Delete buttons are visible.</span>
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
                                  <React.Fragment key={tx.$id}>
                                    <tr
                                      className="data-table-row"
                                      style={{ cursor: hasAllocation ? 'pointer' : 'default', opacity: tx.status === 'Reversed' ? 0.5 : 1 }}
                                      onClick={() => hasAllocation && setExpandedTx(isExpanded ? null : tx.$id)}
                                    >
                                      <td className="data-td text-[13px] font-medium text-gray-500 dark:text-[#A1ADA4]">
                                        {new Date(tx.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </td>
                                      <td className="data-td">
                                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border ${typeStyle.className}`}>
                                          {typeStyle.label}
                                        </span>
                                      </td>
                                      <td className="data-td text-right font-bold tabular-nums text-sm" style={{ color: tx.type === 'Manual Penalty' ? '#EF4444' : '#10B981' }}>
                                        {tx.type === 'Manual Penalty' ? '+' : ''}{formatAmount(tx.amount)}
                                      </td>
                                      <td className="data-td text-[13px] text-gray-800 dark:text-[#F4F7F4]">
                                        {tx.paymentMethod || tx.comment || '—'}
                                      </td>
                                      <td className="data-td font-mono text-xs text-gray-500 dark:text-[#A1ADA4]">
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
                                            className="inline-flex items-center justify-center p-1 px-2 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer mr-1"
                                          >
                                            <Pencil size={11} />
                                          </button>
                                          <button
                                            title="Delete transaction"
                                            disabled={deletingId === tx.$id}
                                            onClick={() => setDeleteTarget({ type: 'transaction', id: tx.$id, label: `Transaction of ${formatAmount(tx.amount)}` })}
                                            className="inline-flex items-center justify-center p-1 px-2 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer"
                                          >
                                            {deletingId === tx.$id ? '...' : <Trash2 size={11} />}
                                          </button>
                                        </td>
                                      )}
                                    </tr>

                                    {/* Inline edit form row */}
                                    {isAdmin && editingTx?.$id === tx.$id && (
                                      <tr key={`${tx.$id}-edit`}>
                                        <td colSpan={8} className="p-4 bg-amber-50/80 dark:bg-[#18221A] border-b-2 border-amber-300 dark:border-amber-700">
                                          <p className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase mb-2.5">✎ Edit Transaction</p>
                                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.625rem', marginBottom: '0.75rem' }}>
                                            {[
                                              { label: 'Amount (KES)', key: 'amount', type: 'number' },
                                              { label: 'Date', key: 'date', type: 'date' },
                                              { label: 'Payment Method', key: 'paymentMethod', type: 'text' },
                                              { label: 'Reference No.', key: 'referenceId', type: 'text' },
                                              { label: 'Comment / Notes', key: 'comment', type: 'text' },
                                            ].map(f => (
                                              <div key={f.key}>
                                                <label className="block text-[11px] text-amber-900 dark:text-amber-300 font-semibold mb-1">{f.label}</label>
                                                <input
                                                  type={f.type}
                                                  value={(editForm as any)[f.key]}
                                                  onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-amber-300 dark:border-[#29352D] bg-white dark:bg-[#101612] text-gray-900 dark:text-[#F4F7F4] outline-none"
                                                />
                                              </div>
                                            ))}
                                          </div>
                                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={handleSaveEditTx} disabled={editSaving} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 700, background: '#1D4ED8', color: '#FFF', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                                              {editSaving ? 'Saving…' : 'Save Changes'}
                                            </button>
                                            <button onClick={() => setEditingTx(null)} className="px-3.5 py-1.5 text-[13px] font-semibold bg-gray-100 dark:bg-[#1D2920] text-gray-700 dark:text-[#F4F7F4] border border-gray-200 dark:border-[#29352D] rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-[#222E25]">
                                              Cancel
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )}

                                    {/* Allocation Detail Row */}
                                    {isExpanded && hasAllocation && (
                                      <tr key={`${tx.$id}-alloc`}>
                                        <td colSpan={isAdmin ? 8 : 7} className="p-0 bg-slate-50 dark:bg-[#18221A] border-b border-gray-200 dark:border-[#29352D]">
                                          <div style={{ padding: '0.875rem 1.5rem' }}>
                                            <p className="text-[11px] font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider mb-2.5">
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
                                                <div key={alloc.label} className="px-3 py-1.5 bg-white dark:bg-[#1D2920] rounded-lg shadow-xs" style={{ border: `1px solid ${alloc.color}30`, borderLeft: `3px solid ${alloc.color}` }}>
                                                  <span className="block text-[10px] text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider">{alloc.label}</span>
                                                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: alloc.color, fontVariantNumeric: 'tabular-nums' }}>{formatAmount(alloc.value)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
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
                    <div className="mb-4 p-3 bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl flex justify-between items-center text-red-900 dark:text-red-300">
                      <span className="text-[13px] font-semibold text-red-800 dark:text-red-300">Active Penalties</span>
                      <span className="text-sm font-extrabold text-red-600 dark:text-red-400 tabular-nums">
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
                                <td className="data-td text-[13px] font-medium text-gray-500 dark:text-[#A1ADA4]">
                                  {new Date(pen.dateApplied).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="data-td text-[13px] font-semibold text-gray-800 dark:text-[#F4F7F4]">
                                  {pen.penaltyType}
                                </td>
                                <td className="data-td" style={{ textAlign: 'right', fontWeight: 700, color: '#B91C1C', fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem' }}>
                                  +{formatAmount(pen.amount)}
                                </td>
                                <td className="data-td text-[13px] text-gray-500 dark:text-[#A1ADA4] truncate">
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
                                      className="inline-flex items-center justify-center p-1 px-2 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer mr-1"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                  )}
                                  {pen.status === 'Active' && isActionable && (
                                    <button
                                      className="btn-secondary row-action-btn"
                                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', marginRight: isAdmin ? '0.25rem' : 0 }}
                                      onClick={() => setReversePenaltyTarget({ id: pen.$id, amount: pen.amount })}
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
                                      className="inline-flex items-center justify-center p-1 px-2 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer"
                                    >
                                      {deletingId === pen.$id ? '...' : <Trash2 size={11} />}
                                    </button>
                                  )}
                                </td>
                              </tr>

                              {/* Inline edit form row */}
                              {isAdmin && editingPenalty?.$id === pen.$id && (
                                <tr key={`${pen.$id}-edit`}>
                                  <td colSpan={6} className="p-4 bg-amber-50/80 dark:bg-[#18221A] border-b-2 border-amber-300 dark:border-amber-700">
                                    <p className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase mb-2.5">✎ Edit Penalty (Backdate / Adjust)</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.625rem', marginBottom: '0.75rem' }}>
                                      <div>
                                        <label className="block text-[11px] text-amber-900 dark:text-amber-300 font-semibold mb-1">Date Applied</label>
                                        <input
                                          type="date"
                                          value={editPenaltyForm.date}
                                          onChange={e => setEditPenaltyForm(prev => ({ ...prev, date: e.target.value }))}
                                          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-amber-300 dark:border-[#29352D] bg-white dark:bg-[#101612] text-gray-900 dark:text-[#F4F7F4] outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] text-amber-900 dark:text-amber-300 font-semibold mb-1">Penalty Type</label>
                                        <input
                                          type="text"
                                          value={editPenaltyForm.penaltyType}
                                          onChange={e => setEditPenaltyForm(prev => ({ ...prev, penaltyType: e.target.value }))}
                                          list="penalty-types-list"
                                          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-amber-300 dark:border-[#29352D] bg-white dark:bg-[#101612] text-gray-900 dark:text-[#F4F7F4] outline-none"
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
                                        <label className="block text-[11px] text-amber-900 dark:text-amber-300 font-semibold mb-1">Amount (KES)</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={editPenaltyForm.amount}
                                          onChange={e => setEditPenaltyForm(prev => ({ ...prev, amount: e.target.value }))}
                                          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-amber-300 dark:border-[#29352D] bg-white dark:bg-[#101612] text-gray-900 dark:text-[#F4F7F4] outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] text-amber-900 dark:text-amber-300 font-semibold mb-1">Reason / Comment</label>
                                        <input
                                          type="text"
                                          value={editPenaltyForm.comment}
                                          onChange={e => setEditPenaltyForm(prev => ({ ...prev, comment: e.target.value }))}
                                          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-amber-300 dark:border-[#29352D] bg-white dark:bg-[#101612] text-gray-900 dark:text-[#F4F7F4] outline-none"
                                        />
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <button onClick={handleSaveEditPenalty} disabled={editPenaltySaving} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 700, background: '#1D4ED8', color: '#FFF', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                                        {editPenaltySaving ? 'Saving…' : 'Save Changes'}
                                      </button>
                                      <button onClick={() => setEditingPenalty(null)} className="px-3.5 py-1.5 text-[13px] font-semibold bg-gray-100 dark:bg-[#1D2920] text-gray-700 dark:text-[#F4F7F4] border border-gray-200 dark:border-[#29352D] rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-[#222E25]">
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


      {/* Secure Re-Authentication Modal for Tx Deletion */}
      <SecureActionModal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onAuthorized={async (token) => {
          if (!deleteTarget) return;
          setIsDeleting(true);
          if (deleteTarget.type === 'transaction') {
            await handleDeleteTransaction(deleteTarget.id, token);
          } else if (deleteTarget.type === 'penalty') {
            await handleDeletePenalty(deleteTarget.id);
          }
          setIsDeleting(false);
        }}
        action="PAYMENT_DELETE"
        resourceId={deleteTarget?.id || ''}
        title={deleteTarget?.type === 'transaction' ? 'Delete Financial Transaction' : 'Delete Penalty'}
        description="Permanently remove this transaction from the loan ledger. Enter your password to authorize."
        confirmLabel="Confirm Delete Record"
        severity="danger"
        summaryItems={[
          { label: 'Item Description', value: deleteTarget?.label || '' },
          { label: 'Record ID', value: deleteTarget?.id?.slice(-8).toUpperCase() || '' },
        ]}
      />

      {/* Secure Re-Authentication Modal for Penalty Reversal */}
      <SecureActionModal
        isOpen={!!reversePenaltyTarget}
        onClose={() => setReversePenaltyTarget(null)}
        onAuthorized={(token) => reversePenaltyTarget && handleReversePenalty(reversePenaltyTarget.id, token)}
        action="PENALTY_REVERSE"
        resourceId={reversePenaltyTarget?.id || ''}
        title="Authorize Penalty Reversal"
        description="Reverse this penalty charge and credit the balance back to the contract. Enter your password to authorize."
        confirmLabel="Authorize Penalty Reversal"
        severity="warning"
        summaryItems={[
          { label: 'Penalty ID', value: reversePenaltyTarget?.id?.slice(-8).toUpperCase() || '' },
          { label: 'Penalty Amount', value: reversePenaltyTarget?.amount ? formatAmount(reversePenaltyTarget.amount) : 'N/A' },
        ]}
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
  const handleDeleteLoan = async (verificationToken?: string) => {
    setIsDeleting(true);
    const res = await deleteFinancingAgreement(loan.$id, verificationToken);
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
        <div className="info-card bg-amber-50/40 dark:bg-[#151D17] border-l-[3px] border-l-amber-600 dark:border-l-amber-500 border-amber-200 dark:border-[#29352D]">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider m-0">
              Credit Administration
            </p>
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
              Bal: {formatAmount(effectiveOutstandingBalance)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {canWaive && (
              <button
                id="btn-waive-balance"
                className="action-btn w-full justify-center bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                onClick={() => setShowWaive(true)}
                title="Waive loan balance (Principal, Interest, or Penalty) to reduce customer debt"
              >
                <Percent size={15} />
                Waive Balance / Penalties
              </button>
            )}
            {canWriteOff && (
              <button
                id="btn-write-off-loan"
                className="action-btn w-full justify-center bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                onClick={() => setShowWriteOff(true)}
                title="Write off this contract — marks the balance as an uncollectible credit loss (Admin only)"
              >
                <Ban size={15} />
                Write Off Contract ({formatAmount(effectiveOutstandingBalance)})
              </button>
            )}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-[#A1ADA4] mt-2.5 leading-normal mb-0">
            {canWaive && "• Waiver adjusts outstanding balance immediately & records formal credit adjustment."}
            {canWaive && canWriteOff && <br />}
            {canWriteOff && "• Write Off is an irreversible accounting bad debt recognition (Admin only)."}
          </p>
        </div>
      )}

      {/* ── DATA CORRECTION: Delete Loan (ADMIN ONLY, TEMPORARY) ── */}
      {currentUser?.role === 'ADMIN' && (
        <div className="info-card bg-red-50/40 dark:bg-[#151D17] border-l-[3px] border-l-red-800 dark:border-l-red-600 border-red-200 dark:border-[#29352D]">
          <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-3">
            ⚠ Data Correction (Admin)
          </p>
          <button
            id="btn-delete-loan"
            className="action-btn w-full justify-center bg-red-700 hover:bg-red-800 text-white font-bold border-none transition-colors"
            onClick={() => setDeleteContract(loan.$id)}
            title="Permanently delete this loan and all its data"
          >
            <Trash2 size={15} />
            Delete Contract
          </button>

          <div className="mt-3 pt-3 border-t border-red-200 dark:border-[#29352D]">
            <button
              id="btn-change-status"
              className="action-btn w-full justify-center bg-white dark:bg-[#1D2920] text-red-700 dark:text-red-300 border border-red-200 dark:border-[#29352D] font-semibold hover:bg-red-50 dark:hover:bg-[#222E25] transition-colors"
              onClick={() => setShowChangeStatus(true)}
              title="Force change the status of this loan"
            >
              <ArrowDownUp size={15} />
              Change Status
            </button>
          </div>
        </div>
      )}

      {/* ── Client Info ── */}
      <div className="info-card">
        <p className="text-xs font-bold text-gray-400 dark:text-[#A1ADA4] uppercase tracking-wider mb-3.5">
          Buyer / Client
        </p>
        <div className="flex items-center gap-3 mb-4 pb-3.5 border-b border-gray-100 dark:border-[#29352D]">
          <div className="client-avatar" style={{ width: '2.5rem', height: '2.5rem', fontSize: '0.875rem' }}>
            {client?.firstName?.[0] || '?'}
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight">
              <Link href={`/clients/${client?.$id}`} className="hover:underline text-gray-900 dark:text-[#F4F7F4]">
                {client?.firstName} {client?.lastName}
              </Link>
            </p>
            <p className="text-xs text-gray-400 dark:text-[#A1ADA4] font-medium">Buyer</p>
          </div>
        </div>
        {[
          { label: 'Email', value: client?.email || '—' },
          { label: 'Phone', value: client?.phone || '—' },
          { label: 'National ID', value: client?.nationalId || '—' },
          { label: 'Total Purchases', value: client?.totalBorrowed ? `KES ${client.totalBorrowed.toLocaleString()}` : '—' },
        ].map(row => (
          <div key={row.label} className="info-card-row">
            <span className="info-key text-gray-500 dark:text-[#A1ADA4]">{row.label}</span>
            <span className="info-value text-gray-900 dark:text-[#F4F7F4] font-semibold">{row.value}</span>
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

      {/* Global Secure Action Modal for Contract Deletion */}
      <SecureActionModal
        isOpen={!!deleteContract}
        onClose={() => !isDeleting && setDeleteContract(null)}
        onAuthorized={(token) => handleDeleteLoan(token)}
        action="CONTRACT_DELETE"
        resourceId={loan.$id}
        title="Delete Financing Contract"
        description="Permanently delete this contract, all recorded transactions, installments and history. Enter your administrator password to authorize this irreversible deletion."
        confirmLabel="Confirm Delete Contract"
        severity="danger"
        summaryItems={[
          { label: 'Contract ID', value: loan.$id.slice(-8).toUpperCase() },
          { label: 'Status', value: loan.status },
        ]}
      />
    </>
  );
}
