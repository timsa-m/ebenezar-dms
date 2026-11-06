'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { waiveAgreementBalance } from '@/lib/actions/dms.actions';
import { formatAmount, cn } from '@/lib/utils';
import { Loader2, X, Percent, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight, Calendar } from 'lucide-react';
import { toast } from '@/lib/toast';
import SecureActionModal from '@/components/security/SecureActionModal';

interface WaiveModalProps {
  loanId: string;
  currentUser: User;
  loan: {
    remainingPrincipal?: number;
    remainingInterest?: number;
    remainingPenalties?: number;
    balance: number;
    total_penalties?: number;
  };
  onClose: () => void;
}

export default function WaiveModal({ loanId, currentUser, loan, onClose }: WaiveModalProps) {
  const router = useRouter();
  const [waiverType, setWaiverType] = useState<'Principal' | 'Penalty' | 'Interest'>('Principal');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [waiverDate, setWaiverDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const totalBalance = Math.max(0, Number(loan.balance || 0));
  const penaltyBalance = Math.max(0, Number(loan.total_penalties ?? loan.remainingPenalties ?? 0));
  const interestBalance = Math.max(0, Number(loan.remainingInterest ?? 0));

  // Determine current available ceiling for the selected category
  const availableBalance =
    waiverType === 'Penalty' && penaltyBalance > 0
      ? penaltyBalance
      : waiverType === 'Interest' && interestBalance > 0
      ? interestBalance
      : totalBalance;

  // Reset error when inputs change
  useEffect(() => {
    setError('');
  }, [waiverType, amount, waiverDate]);

  const numAmount = Number(amount) || 0;
  const newProjectedBalance = Math.max(0, totalBalance - numAmount);
  const isSettlement = numAmount >= totalBalance && totalBalance > 0;

  const isValid =
    reason.trim().length >= 10 &&
    numAmount > 0 &&
    numAmount <= availableBalance &&
    !!waiverDate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (numAmount <= 0) {
      setError('Waiver amount must be greater than zero.');
      return;
    }

    if (numAmount > availableBalance) {
      setError(
        `Waiver amount cannot exceed the available balance of ${formatAmount(availableBalance)}.`
      );
      return;
    }

    if (reason.trim().length < 10) {
      setError('Please provide a detailed reason for audit compliance (min. 10 characters).');
      return;
    }

    if (!waiverDate) {
      setError('Please select an effective waiver date.');
      return;
    }

    // Require password re-authentication before execution
    setShowAuthModal(true);
  };

  const handleAuthorized = async (verificationToken: string) => {
    setShowAuthModal(false);
    startTransition(async () => {
      try {
        const res = await waiveAgreementBalance({
          id: loanId,
          waiverType,
          amount: numAmount,
          reason: reason.trim(),
          waiverDate,
          verificationToken,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to apply waiver.');
        }

        toast.success(
          `Waiver of ${formatAmount(numAmount)} applied successfully. Effective Date: ${waiverDate}. New balance: ${formatAmount(res.newBalance ?? newProjectedBalance)}.`,
          { duration: 5000 }
        );
        router.refresh();
        onClose();
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to apply waiver. Only Admins or Managers can execute this.';
        setError(errMsg);
        toast.error(errMsg);
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="waive-modal-title">
        
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
              <Percent size={14} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="modal-title" id="waive-modal-title">Waive Contract Balance</h2>
              <p className="text-xs text-gray-500 dark:text-[#A1ADA4] m-0">
                Adjust and relieve outstanding balance
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" disabled={isPending}>
            <X size={14} />
          </button>
        </div>

        {/* Informative pill */}
        <div className="mx-6 mt-3 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex gap-3 items-start">
          <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-1">
              Authorized Credit Adjustment
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-400 leading-normal">
              This waiver immediately reduces the contract outstanding balance in the ledger. 
              All waivers are registered as formal repayment adjustments with audit trail compliance.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            {/* Waiver Category Selection */}
            <div className="form-field">
              <label className="form-label" htmlFor="waive-type">
                Waiver Type <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                id="waive-type"
                value={waiverType}
                onChange={(e) => setWaiverType(e.target.value as any)}
                className="form-input"
                style={{ width: '100%' }}
                disabled={isPending}
                required
              >
                <option value="Principal">
                  Outstanding Principal / Balance (Total: {formatAmount(totalBalance)})
                </option>
                {penaltyBalance > 0 && (
                  <option value="Penalty">
                    Accumulated Penalties (Total: {formatAmount(penaltyBalance)})
                  </option>
                )}
                {interestBalance > 0 && (
                  <option value="Interest">
                    Financing Interest (Total: {formatAmount(interestBalance)})
                  </option>
                )}
              </select>
            </div>

            {/* Waiver Amount */}
            <div className="form-field">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label mb-0" htmlFor="waive-amount">
                  Waiver Amount (KES) <span className="text-red-500">*</span>
                </label>
                <span className="text-xs font-semibold text-gray-500 dark:text-[#A1ADA4]">
                  Max Available: <strong className="text-gray-900 dark:text-[#F4F7F4]">{formatAmount(availableBalance)}</strong>
                </span>
              </div>
              <input
                id="waive-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={availableBalance}
                placeholder={`e.g. 50000 (Max: ${availableBalance.toFixed(2)})`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="form-input w-full text-base font-semibold"
                disabled={isPending}
                required
              />

              {/* Quick Presets */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setAmount(availableBalance.toString())}
                  disabled={isPending || availableBalance <= 0}
                  className="bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/50 rounded-md text-amber-900 dark:text-amber-300 text-xs font-bold px-2.5 py-1 cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                >
                  Waive Full Balance ({formatAmount(availableBalance)})
                </button>
                {availableBalance >= 2 && (
                  <button
                    type="button"
                    onClick={() => setAmount((Math.round(availableBalance * 0.5)).toString())}
                    disabled={isPending}
                    className="bg-gray-100 dark:bg-[#18221A] border border-gray-200 dark:border-[#29352D] rounded-md text-gray-700 dark:text-[#C1CBC3] text-xs font-semibold px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-[#222E25] transition-colors"
                  >
                    50% ({formatAmount(Math.round(availableBalance * 0.5))})
                  </button>
                )}
                {availableBalance >= 4 && (
                  <button
                    type="button"
                    onClick={() => setAmount((Math.round(availableBalance * 0.25)).toString())}
                    disabled={isPending}
                    className="bg-gray-100 dark:bg-[#18221A] border border-gray-200 dark:border-[#29352D] rounded-md text-gray-700 dark:text-[#C1CBC3] text-xs font-semibold px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-[#222E25] transition-colors"
                  >
                    25% ({formatAmount(Math.round(availableBalance * 0.25))})
                  </button>
                )}
              </div>
            </div>

            {/* Live Calculation Preview Card */}
            {numAmount > 0 && (
              <div className={cn(
                "p-3 sm:p-4 rounded-lg border flex flex-col gap-1.5",
                isSettlement
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40"
                  : "bg-gray-50 dark:bg-[#18221A] border-gray-200 dark:border-[#29352D]"
              )}>
                <div className="flex justify-between text-xs text-gray-500 dark:text-[#A1ADA4]">
                  <span>Current Outstanding Balance:</span>
                  <span className="font-semibold text-gray-900 dark:text-[#F4F7F4]">{formatAmount(totalBalance)}</span>
                </div>
                <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  <span>Deduction (Waiver):</span>
                  <span>- {formatAmount(numAmount)}</span>
                </div>
                <div className="border-t border-dashed border-gray-300 dark:border-[#29352D] pt-1.5 flex justify-between text-xs sm:text-[13px] font-bold">
                  <span className={isSettlement ? "text-emerald-700 dark:text-emerald-400" : "text-gray-900 dark:text-[#F4F7F4]"}>
                    Projected Remaining Balance:
                  </span>
                  <span className={isSettlement ? "text-emerald-700 dark:text-emerald-400" : "text-gray-900 dark:text-[#F4F7F4]"}>
                    {formatAmount(newProjectedBalance)}
                  </span>
                </div>
                {isSettlement && (
                  <div className="flex items-center gap-1.5 mt-1 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 size={14} />
                    <span>This full waiver will mark the contract as completely settled & fully paid.</span>
                  </div>
                )}
              </div>
            )}

            {/* Backdate Option (Effective Date) */}
            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label className="form-label" htmlFor="waive-date" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Calendar size={13} style={{ color: '#D97706' }} />
                  <span>Effective Date (Backdate Option)</span> <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280' }}>
                  {waiverDate === new Date().toISOString().split('T')[0] ? 'Today' : 'Backdated'}
                </span>
              </div>
              <input
                id="waive-date"
                type="date"
                value={waiverDate}
                onChange={(e) => setWaiverDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="form-input"
                style={{ width: '100%', fontSize: '0.875rem' }}
                disabled={isPending}
                required
              />
              <span className="form-hint">
                Defaults to today. Choose an earlier date if recording a retroactive waiver.
              </span>
            </div>

            {/* Reason */}
            <div className="form-field">
              <label className="form-label" htmlFor="waive-reason">
                Justification / Reason for Waiver <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                id="waive-reason"
                placeholder="State the commercial justification for waiving this balance (e.g. negotiated full settlement discount, customer goodwill agreement, waiver of late fees upon prompt payoff)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="form-textarea"
                rows={3}
                disabled={isPending}
                required
              />
              <span className="form-hint">
                Minimum 10 characters required for audit verification. Performed by: {currentUser.firstName} {currentUser.lastName} ({currentUser.role}).
              </span>
            </div>

            {/* Error display */}
            {error && (
              <div className="modal-error" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="submit"
              disabled={isPending || !isValid}
              className="action-btn"
              style={{
                background: isValid ? '#D97706' : '#FCD34D',
                color: '#FFF',
                opacity: isPending ? 0.7 : 1,
                cursor: isPending || !isValid ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? (
                <><Loader2 size={15} className="auth-spinner" /><span>Applying Waiver…</span></>
              ) : (
                <><Percent size={15} /><span>Apply Waiver of {formatAmount(numAmount)}</span></>
              )}
            </button>
            <button type="button" className="action-btn action-btn-outline" onClick={onClose} disabled={isPending}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Security Re-Authentication Modal */}
      <SecureActionModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthorized={handleAuthorized}
        action="BALANCE_WAIVER"
        resourceId={loanId}
        title="Authorize Balance Waiver"
        description="Enter your account password to authorize this debt relief adjustment. This operation directly alters the contractual balance and financial reports."
        confirmLabel="Confirm & Authorize Waiver"
        severity="warning"
        summaryItems={[
          { label: 'Contract ID', value: loanId.slice(-8).toUpperCase() },
          { label: 'Category', value: waiverType },
          { label: 'Amount to Waive', value: formatAmount(numAmount) },
          { label: 'Effective Date', value: waiverDate },
          { label: 'New Projected Balance', value: formatAmount(newProjectedBalance) },
        ]}
      />
    </div>
  );
}
