'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { writeOffAgreement } from '@/lib/actions/dms.actions';
import { formatAmount } from '@/lib/utils';
import { Loader2, X, Ban, AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/toast';

export default function WriteOffModal({ loanId, currentUser, loan, onClose }: WriteOffModalProps & { loan: { balance: number; principalAmount?: number } }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const CONFIRM_PHRASE = 'WRITE OFF';
  const isConfirmed = confirm === CONFIRM_PHRASE;
  const isValid = reason.trim().length >= 10 && isConfirmed;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValid) {
      setError('Please provide a reason (min. 10 characters) and confirm by typing the phrase.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await writeOffAgreement({ id: loanId, reason: reason.trim() });
        if (!res.success) {
          throw new Error(res.error || 'Failed to write off contract.');
        }

        toast.success(`Contract balance of ${formatAmount(loan.balance)} written off successfully as bad debt.`, { duration: 5000 });
        router.refresh();
        onClose();
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to write off loan. You must be an Admin.';
        setError(errMsg);
        toast.error(errMsg);
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="writeoff-modal-title">

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '0.5rem',
              background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ban size={14} style={{ color: '#DC2626' }} />
            </div>
            <div>
              <h2 className="modal-title" id="writeoff-modal-title">Write Off Contract</h2>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>
                Accounting bad-debt recognition
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" disabled={isPending}>
            <X size={14} />
          </button>
        </div>

        {/* Warning banner */}
        <div style={{
          margin: '0.75rem 1.5rem 0',
          padding: '0.875rem 1rem',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '0.625rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}>
          <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: '0.125rem' }} />
          <div>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#991B1B', marginBottom: '0.25rem' }}>
              Irreversible Accounting Action
            </p>
            <p style={{ fontSize: '0.75rem', color: '#B91C1C', lineHeight: 1.5 }}>
              Writing off a contract stops interest accrual and removes the remaining balance from active book receivables. 
              (Note: If the account is simply &gt;90 days overdue, use status <strong>Loss</strong> instead of writing off).
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Contract Balance Pill */}
            <div style={{
              padding: '0.875rem 1rem',
              borderRadius: '0.5rem',
              background: '#FFF1F2',
              border: '1px solid #FECDD3',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#9F1239', fontWeight: 600, margin: 0 }}>Outstanding Balance to be Written Off:</p>
                <p style={{ fontSize: '1.25rem', color: '#881337', fontWeight: 800, margin: '0.125rem 0 0' }}>{formatAmount(loan.balance)}</p>
              </div>
              <span className="badge badge-error">Credit Loss</span>
            </div>

            {/* Reason */}
            <div className="form-field">
              <label className="form-label" htmlFor="writeoff-reason">
                Reason for Write-Off <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                id="writeoff-reason"
                placeholder="Provide a detailed audit justification for writing off this balance (e.g. legal debt discharge, borrower deceased with no estate, exhausted all legal recovery)..."
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError(''); }}
                className="form-textarea"
                rows={3}
                disabled={isPending}
                required
                autoFocus
              />
              <span className="form-hint">
                Minimum 10 characters required for regulatory compliance. Operator: {currentUser.firstName} {currentUser.lastName} ({currentUser.role}).
              </span>
            </div>

            {/* Confirmation phrase */}
            <div className="form-field">
              <label className="form-label" htmlFor="writeoff-confirm">
                Type <strong style={{ color: '#DC2626' }}>{CONFIRM_PHRASE}</strong> to confirm
              </label>
              <input
                id="writeoff-confirm"
                type="text"
                placeholder={CONFIRM_PHRASE}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                className={`form-input${confirm && !isConfirmed ? ' form-input-error' : ''}`}
                disabled={isPending}
                required
              />
              {confirm && !isConfirmed && (
                <span className="form-hint" style={{ color: '#DC2626' }}>
                  Type exactly: {CONFIRM_PHRASE}
                </span>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="modal-error">
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
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
                background: isValid ? '#DC2626' : '#FCA5A5',
                color: '#FFF',
                opacity: isPending ? 0.7 : 1,
                cursor: isPending || !isValid ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? (
                <><Loader2 size={15} className="auth-spinner" /><span>Writing Off Contract…</span></>
              ) : (
                <><Ban size={15} /><span>Confirm Write Off ({formatAmount(loan.balance)})</span></>
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
