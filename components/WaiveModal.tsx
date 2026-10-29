'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { waiveAgreementBalance } from '@/lib/actions/dms.actions';
import { formatAmount } from '@/lib/utils';
import { Loader2, X, Percent, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from '@/lib/toast';

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
  }, [waiverType, amount]);

  const numAmount = Number(amount) || 0;
  const newProjectedBalance = Math.max(0, totalBalance - numAmount);
  const isSettlement = numAmount >= totalBalance && totalBalance > 0;

  const isValid =
    reason.trim().length >= 10 &&
    numAmount > 0 &&
    numAmount <= availableBalance;

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

    startTransition(async () => {
      try {
        const res = await waiveAgreementBalance({
          id: loanId,
          waiverType,
          amount: numAmount,
          reason: reason.trim(),
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to apply waiver.');
        }

        toast.success(
          `Waiver of ${formatAmount(numAmount)} applied successfully. New balance: ${formatAmount(res.newBalance ?? newProjectedBalance)}.`,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '0.5rem',
              background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Percent size={14} style={{ color: '#D97706' }} />
            </div>
            <div>
              <h2 className="modal-title" id="waive-modal-title">Waive Contract Balance</h2>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>
                Adjust and relieve outstanding balance
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" disabled={isPending}>
            <X size={14} />
          </button>
        </div>

        {/* Informative pill */}
        <div style={{
          margin: '0.75rem 1.5rem 0',
          padding: '0.875rem 1rem',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '0.625rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}>
          <ShieldCheck size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: '0.125rem' }} />
          <div>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#92400E', marginBottom: '0.25rem' }}>
              Authorized Credit Adjustment
            </p>
            <p style={{ fontSize: '0.75rem', color: '#B45309', lineHeight: 1.4 }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label className="form-label" htmlFor="waive-amount" style={{ marginBottom: 0 }}>
                  Waiver Amount (KES) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280' }}>
                  Max Available: <strong style={{ color: '#111827' }}>{formatAmount(availableBalance)}</strong>
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
                className="form-input"
                style={{ width: '100%', fontSize: '1rem', fontWeight: 600 }}
                disabled={isPending}
                required
              />

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setAmount(availableBalance.toString())}
                  disabled={isPending || availableBalance <= 0}
                  style={{
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '0.375rem',
                    color: '#92400E',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.625rem',
                    cursor: 'pointer',
                  }}
                >
                  Waive Full Balance ({formatAmount(availableBalance)})
                </button>
                {availableBalance >= 2 && (
                  <button
                    type="button"
                    onClick={() => setAmount((Math.round(availableBalance * 0.5)).toString())}
                    disabled={isPending}
                    style={{
                      background: '#F3F4F6',
                      border: '1px solid #E5E7EB',
                      borderRadius: '0.375rem',
                      color: '#374151',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.25rem 0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    50% ({formatAmount(Math.round(availableBalance * 0.5))})
                  </button>
                )}
                {availableBalance >= 4 && (
                  <button
                    type="button"
                    onClick={() => setAmount((Math.round(availableBalance * 0.25)).toString())}
                    disabled={isPending}
                    style={{
                      background: '#F3F4F6',
                      border: '1px solid #E5E7EB',
                      borderRadius: '0.375rem',
                      color: '#374151',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.25rem 0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    25% ({formatAmount(Math.round(availableBalance * 0.25))})
                  </button>
                )}
              </div>
            </div>

            {/* Live Calculation Preview Card */}
            {numAmount > 0 && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                background: isSettlement ? '#F0FDF4' : '#F9FAFB',
                border: `1px solid ${isSettlement ? '#BBF7D0' : '#E5E7EB'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.375rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6B7280' }}>
                  <span>Current Outstanding Balance:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{formatAmount(totalBalance)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#D97706', fontWeight: 600 }}>
                  <span>Deduction (Waiver):</span>
                  <span>- {formatAmount(numAmount)}</span>
                </div>
                <div style={{ borderTop: '1px dashed #D1D5DB', paddingTop: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 700 }}>
                  <span style={{ color: isSettlement ? '#166534' : '#111827' }}>Projected Remaining Balance:</span>
                  <span style={{ color: isSettlement ? '#166534' : '#111827' }}>{formatAmount(newProjectedBalance)}</span>
                </div>
                {isSettlement && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem', color: '#15803D', fontSize: '0.75rem', fontWeight: 600 }}>
                    <CheckCircle2 size={14} />
                    <span>This full waiver will mark the contract as completely settled & fully paid.</span>
                  </div>
                )}
              </div>
            )}

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
    </div>
  );
}
