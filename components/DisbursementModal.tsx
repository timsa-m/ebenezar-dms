'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { disburseLoan } from '@/lib/actions/loan.actions';
import { formatAmount } from '@/lib/utils';
import { Loader2, X, SendHorizonal, Calendar, Info } from 'lucide-react';
import DatePickerInput from '@/components/ui/DatePickerInput';
import { toast } from '@/lib/toast';

interface DisbursementModalProps {
  loanId: string;
  amountApplied: number;
  principalDisbursed: number;
  remainingToDisburse: number;
  isFirstTranche: boolean;
  onClose: () => void;
}

/** Returns today's date as YYYY-MM-DD in the LOCAL timezone (not UTC) */
const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function DisbursementModal({
  loanId,
  amountApplied,
  principalDisbursed,
  remainingToDisburse,
  isFirstTranche,
  onClose
}: DisbursementModalProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [disbursementDate, setDisbursementDate] = useState(todayLocal());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsedAmount = parseFloat(amount) || 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= remainingToDisburse;
  const today = todayLocal();
  const isBackdated = disbursementDate < today;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await disburseLoan(loanId, parsedAmount, disbursementDate);
        toast.success(`${formatAmount(parsedAmount)} disbursed successfully.`);
        router.refresh();
        onClose();
      } catch (err: any) {
        const errMsg = err?.message || 'Disbursement failed. Please try again.';
        setError(errMsg);
        toast.error(errMsg);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAmountValid) {
      setError(`Amount must be between KES 1 and ${formatAmount(remainingToDisburse)}.`);
      return;
    }
    if (!disbursementDate) {
      setError('Please select a disbursement date.');
      return;
    }
    submit();
  };

  const disbursedPct = amountApplied > 0 ? Math.min(100, (principalDisbursed / amountApplied) * 100) : 0;

  return (
    <div
      className="modal-overlay"
      style={{ animation: 'none' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="disbursement-modal-title" style={{ overflow: 'visible' }}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '0.5rem',
              background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SendHorizonal size={15} style={{ color: '#2563EB' }} />
            </div>
            <h2 className="modal-title" id="disbursement-modal-title">
              {isFirstTranche ? 'Pending Disbursement' : 'Partial Disbursement'}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {/* Progress bar (only shown after first tranche) */}
        {!isFirstTranche && (
          <div style={{ padding: '1rem 1.5rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#1E40AF' }}>Disbursement Progress</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#1D4ED8' }}>{disbursedPct.toFixed(1)}%</span>
            </div>
            <div style={{ height: '6px', background: '#BFDBFE', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${disbursedPct}%`, background: disbursedPct >= 100 ? '#047857' : '#2563EB', borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {/* Summary boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: isFirstTranche ? '1fr' : '1fr 1fr', gap: '0.5rem', padding: '1rem 1.5rem 0' }}>
          <div style={{ background: '#DBEAFE', borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#1E40AF', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
              {isFirstTranche ? 'Client Applied For' : 'Total Applied'}
            </span>
            <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#1D4ED8', fontVariantNumeric: 'tabular-nums' }}>
              {formatAmount(amountApplied)}
            </span>
          </div>
          {!isFirstTranche && (
            <div style={{ background: '#D1FAE5', borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>
              <span style={{ fontSize: '0.6875rem', color: '#065F46', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>Already Disbursed</span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(principalDisbursed)}
              </span>
            </div>
          )}
        </div>

        {/* Remaining balance callout */}
        {!isFirstTranche && (
          <div style={{ margin: '1rem 1.5rem 0', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Info size={11} /> Remaining to Disburse
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#D97706', fontVariantNumeric: 'tabular-nums' }}>
              {formatAmount(remainingToDisburse)}
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ paddingTop: '1rem' }}>

            {/* Amount */}
            <div className="form-field">
              <label className="form-label" htmlFor="disburse-amount">Amount (KES)</label>
              <input
                id="disburse-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remainingToDisburse}
                placeholder={`up to ${remainingToDisburse.toLocaleString()}`}
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(null); }}
                className={`form-input${amount && !isAmountValid ? ' form-input-error' : ''}`}
                required
                autoFocus
              />
            </div>

            {/* Disbursement Date */}
            <div className="form-field">
              <label
                className="form-label"
                htmlFor="disburse-date"
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Calendar size={11} />
                Disbursement Date
                {isBackdated && (
                  <span style={{
                    marginLeft: '0.25rem',
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    color: '#B45309',
                    background: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    borderRadius: '0.25rem',
                    padding: '0.0625rem 0.375rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Backdated
                  </span>
                )}
              </label>
              <DatePickerInput
                value={disbursementDate}
                max={today}
                onChange={setDisbursementDate}
              />
              {isBackdated && (
                <span className="form-hint" style={{ color: '#B45309' }}>
                  Recording a disbursement dated{' '}
                  {new Date(disbursementDate + 'T12:00:00').toLocaleDateString('en-KE', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              )}
            </div>

            {/* Error */}
            {error && (
              <div>
                <div className="modal-error">
                  <X size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="submit"
              disabled={isPending || !isAmountValid}
              className="action-btn action-btn-primary"
              style={{
                opacity: isPending || !isAmountValid ? 0.6 : 1,
                cursor: isPending || !isAmountValid ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? (
                <><Loader2 size={15} className="auth-spinner" /><span>Processing…</span></>
              ) : (
                <><SendHorizonal size={15} /><span>Disburse Funds</span></>
              )}
            </button>
            <button
              type="button"
              className="action-btn action-btn-outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
