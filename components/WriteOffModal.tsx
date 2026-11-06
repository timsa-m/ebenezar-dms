'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { writeOffAgreement } from '@/lib/actions/dms.actions';
import { formatAmount } from '@/lib/utils';
import { Loader2, X, Ban, AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/toast';
import SecureActionModal from '@/components/security/SecureActionModal';

export default function WriteOffModal({ loanId, currentUser, loan, onClose }: WriteOffModalProps & { loan: { balance: number; principalAmount?: number } }) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
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

    // Open security re-authentication modal
    setShowAuthModal(true);
  };

  const handleAuthorized = async (verificationToken: string) => {
    setShowAuthModal(false);
    startTransition(async () => {
      try {
        const res = await writeOffAgreement({
          id: loanId,
          reason: reason.trim(),
          verificationToken,
        });
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
              <Ban size={14} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="modal-title" id="writeoff-modal-title">Write Off Contract</h2>
              <p className="text-xs text-gray-500 dark:text-[#A1ADA4] m-0">
                Accounting bad-debt recognition
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" disabled={isPending}>
            <X size={14} />
          </button>
        </div>

        {/* Warning banner */}
        <div className="mx-6 mt-3 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl flex gap-3 items-start">
          <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-900 dark:text-red-300 mb-1">
              Irreversible Accounting Action
            </p>
            <p className="text-xs text-red-800 dark:text-red-400 leading-normal">
              Writing off a contract stops interest accrual and removes the remaining balance from active book receivables. 
              (Note: If the account is simply &gt;90 days overdue, use status <strong>Loss</strong> instead of writing off).
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Contract Balance Pill */}
            <div className="p-3.5 rounded-lg bg-red-50/60 dark:bg-[#18221A] border border-red-200 dark:border-[#29352D] flex justify-between items-center">
              <div>
                <p className="text-xs text-red-900 dark:text-red-300 font-semibold m-0">Outstanding Balance to be Written Off:</p>
                <p className="text-xl text-red-700 dark:text-red-400 font-extrabold mt-0.5">{formatAmount(loan.balance)}</p>
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

      {/* Security Re-Authentication Modal */}
      <SecureActionModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthorized={handleAuthorized}
        action="CONTRACT_WRITE_OFF"
        resourceId={loanId}
        title="Authorize Contract Write-Off"
        description="Irreversible accounting action: Enter your administrator password to authorize writing off this loan contract. Outstanding balance will be recognized as credit loss."
        confirmLabel="Authorize Write Off"
        severity="danger"
        summaryItems={[
          { label: 'Contract ID', value: loanId.slice(-8).toUpperCase() },
          { label: 'Outstanding Balance', value: formatAmount(loan.balance) },
          { label: 'Action Reason', value: reason },
        ]}
      />
    </div>
  );
}
