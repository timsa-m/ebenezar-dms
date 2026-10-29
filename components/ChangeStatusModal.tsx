'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { forceUpdateLoanStatus } from '@/lib/actions/loan.actions';
import { Loader2, X, AlertTriangle, ArrowDownUp } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active', hint: 'Performing account within grace period (0–7 days)' },
  { value: 'Overdue', label: 'Overdue', hint: '7 to 30 days past due (7–30 DPD)' },
  { value: 'Substandard', label: 'Substandard', hint: 'Early arrears (31 to 60 days past due)' },
  { value: 'Defaulting', label: 'Defaulting', hint: '60 to 90 days past due (60–90 DPD)' },
  { value: 'Loss', label: 'Loss', hint: 'Over 90 days past due (>90 DPD). NOT written off — active debt under recovery/repossession' },
  { value: 'Fully Paid', label: 'Fully Paid', hint: 'Contract/loan settled in full' },
  { value: 'Written Off', label: 'Written Off', hint: 'Accounting bad-debt write-off' },
  { value: 'Pending', label: 'Pending', hint: 'Pending review / approval' },
  { value: 'Denied', label: 'Denied', hint: 'Application denied' },
];

interface ChangeStatusModalProps {
  loanId: string;
  currentStatus: string;
  currentUser: User;
  onClose: () => void;
}

export default function ChangeStatusModal({ loanId, currentStatus, currentUser, onClose }: ChangeStatusModalProps) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const isChanged = newStatus !== currentStatus;

  const selectedOption = STATUS_OPTIONS.find((opt) => opt.value === newStatus);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isChanged) {
      setError('Please select a different status.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await forceUpdateLoanStatus(loanId, newStatus);
        if (!res.success) throw new Error(res.error);
        
        router.refresh();
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to update loan status. You must be an Admin.');
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="status-modal-title">

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '0.5rem',
              background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ArrowDownUp size={14} style={{ color: '#D97706' }} />
            </div>
            <h2 className="modal-title" id="status-modal-title">Force Status Change</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" disabled={isPending}>
            <X size={14} />
          </button>
        </div>

        {/* Warning banner */}
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
          <AlertTriangle size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: '0.125rem' }} />
          <div>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#92400E', marginBottom: '0.25rem' }}>
              Admin Override
            </p>
            <p style={{ fontSize: '0.75rem', color: '#B45309', lineHeight: 1.5 }}>
              You are manually adjusting the loan/agreement classification status. The system will align aging days and delinquency buckets accordingly.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Current Status */}
            <div className="form-field">
              <label className="form-label">Current Status</label>
              <div style={{
                padding: '0.625rem 0.875rem',
                background: '#F3F4F6',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#6B7280',
              }}>
                {currentStatus}
              </div>
            </div>

            {/* New Status */}
            <div className="form-field">
              <label className="form-label" htmlFor="new-status">
                New Status <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                id="new-status"
                value={newStatus}
                onChange={(e) => { setNewStatus(e.target.value); setError(''); }}
                className="form-input"
                required
                disabled={isPending}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label} — {status.hint}
                  </option>
                ))}
              </select>

              {/* Status Meaning Explanatory Callout */}
              {selectedOption && (
                <div style={{
                  marginTop: '0.625rem',
                  padding: '0.75rem 0.875rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  lineHeight: 1.45,
                  background: selectedOption.value === 'Loss' ? '#FEF2F2' : selectedOption.value === 'Defaulting' ? '#FFFBEB' : '#F0FDF4',
                  border: `1px solid ${selectedOption.value === 'Loss' ? '#FCA5A5' : selectedOption.value === 'Defaulting' ? '#FCD34D' : '#BBF7D0'}`,
                  color: selectedOption.value === 'Loss' ? '#991B1B' : selectedOption.value === 'Defaulting' ? '#92400E' : '#166534',
                }}>
                  {selectedOption.value === 'Loss' && (
                    <p>
                      <strong>Loss (&gt;90 Days Past Due):</strong> Indicates severe default (&gt;90 DPD). <strong>This does NOT mean written off.</strong> The account remains an active debt subject to asset repossession, field recovery, or legal auction.
                    </p>
                  )}
                  {selectedOption.value === 'Defaulting' && (
                    <p>
                      <strong>Defaulting (60–90 Days Past Due):</strong> Indicates 60 to 90 DPD. Pre-repossession tracking and urgent demand alerts active.
                    </p>
                  )}
                  {selectedOption.value === 'Overdue' && (
                    <p>
                      <strong>Overdue (7–30 Days Past Due):</strong> Indicates 7 to 30 DPD. Automated payment reminders active.
                    </p>
                  )}
                  {selectedOption.value === 'Written Off' && (
                    <p>
                      <strong>Written Off:</strong> Formal accounting bad-debt write-off.
                    </p>
                  )}
                  {selectedOption.value === 'Active' && (
                    <p>
                      <strong>Active:</strong> Performing account within the standard 7-day grace period.
                    </p>
                  )}
                  {selectedOption.value === 'Substandard' && (
                    <p>
                      <strong>Substandard (31–60 Days Past Due):</strong> Early delinquency stage (first missed cycle).
                    </p>
                  )}
                  {selectedOption.value === 'Fully Paid' && (
                    <p>
                      <strong>Fully Paid:</strong> Contract is cleared with zero outstanding balance.
                    </p>
                  )}
                </div>
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
              disabled={isPending || !isChanged}
              className="action-btn action-btn-primary"
              style={{
                opacity: isPending ? 0.7 : 1,
                cursor: isPending || !isChanged ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending ? (
                <><Loader2 size={15} className="auth-spinner" /><span>Updating…</span></>
              ) : (
                <><ArrowDownUp size={15} /><span>Apply Override</span></>
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
