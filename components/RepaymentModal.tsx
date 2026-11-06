'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { recordRepaymentReceipt } from '@/lib/actions/dms.actions';
import { formatAmount } from '@/lib/utils';
import { Loader2, X, CreditCard, DollarSign, Calendar } from 'lucide-react';
import DatePickerInput from '@/components/ui/DatePickerInput';
import { toast } from '@/lib/toast';

const PAYMENT_METHODS = [
  { label: 'Mobile Money (M-Pesa)', value: 'mpesa' },
  { label: 'Cash', value: 'cash' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cheque', value: 'cheque' },
] as const;

type PaymentMethodValue = typeof PAYMENT_METHODS[number]['value'];

/** Returns today's date as YYYY-MM-DD in the LOCAL timezone (not UTC) */
const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function RepaymentModal({ loanId, maxAmount, onClose }: RepaymentModalProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethodValue>('mpesa');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayLocal());
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const parsedAmount = parseFloat(amount) || 0;
  const isAmountValid = parsedAmount > 0;
  const today = todayLocal();
  const isBackdated = paymentDate < today;
  const isConnectionError = error.includes('timed out') || error.includes('Appwrite');

  const submit = (overridePayload?: { a: number; m: string; r: string; d: string }) => {
    setError('');
    const a = overridePayload?.a ?? parsedAmount;
    const m = overridePayload?.m ?? method;
    const r = overridePayload?.r ?? reference.trim();
    const d = overridePayload?.d ?? paymentDate;

    startTransition(async () => {
      try {
        const payload = {
          agreementId: loanId,
          amountPaid: a,
          paymentMethod: m as PaymentMethodValue,
          referenceNo: r,
          receiptNo: `REC-${Date.now().toString().slice(-6)}`,
          paymentDate: new Date(d + 'T12:00:00').toISOString(),
        };

        const { executeOrQueue } = await import('@/lib/offline/actionQueue');
        const res = await executeOrQueue(recordRepaymentReceipt, 'RECORD_REPAYMENT_RECEIPT', payload);

        if (res.status === 'queued' || (res.status === 'executed' && res.result?.success)) {
          if (res.status === 'queued') {
            toast('Repayment queued — will sync when online.', { icon: '📶' });
          } else {
            toast.success(`Repayment of ${formatAmount(a)} logged successfully.`);
          }
          router.refresh();
          onClose();
        } else if (res.status === 'executed') {
          const errMsg = res.result?.error || 'Repayment failed. Please try again.';
          setError(errMsg);
          toast.error(errMsg);
        }
      } catch (err: any) {
        const errMsg = err?.message || 'Repayment failed. Please try again.';
        setError(errMsg);
        toast.error(errMsg);
      }
    });
  };


  // Store last payload so the retry button can re-submit without re-entering data
  const lastPayloadRef = {
    a: parsedAmount, m: method, r: reference.trim(), d: paymentDate,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAmountValid) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!paymentDate) {
      setError('Please select a payment date.');
      return;
    }
    submit();
  };

  return (
    /* Overlay: animation disabled to prevent flicker caused by CSS @keyframes
       re-triggering on every React state update (each keystroke). Only the
       modal-box itself animates on mount, which is stable. */
    <div
      className="modal-overlay"
      style={{ animation: 'none' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="repayment-modal-title" style={{ overflow: 'visible' }}>

        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <CreditCard size={15} className="text-emerald-700 dark:text-emerald-400" />
            </div>
            <h2 className="modal-title" id="repayment-modal-title">Log Repayment</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {/* Outstanding balance chip */}
        <div className="mx-6 mt-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-[#18221A] border border-gray-100 dark:border-[#29352D] rounded-lg flex justify-between items-center">
          <span className="form-label mb-0 text-gray-500 dark:text-[#A1ADA4]">Outstanding Balance</span>
          <span className="text-sm font-extrabold text-red-600 dark:text-red-400 tabular-nums">
            {formatAmount(maxAmount)}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Amount */}
            <div className="form-field">
              <label className="form-label" htmlFor="repay-amount">Amount (KES)</label>
              <input
                id="repay-amount"
                type="number"
                step="5.00"
                min="0.00"
                max={maxAmount}
                placeholder="0.00"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(''); }}
                className={`form-input${amount && !isAmountValid ? ' form-input-error' : ''}`}
                required
                autoFocus
              />
              {parsedAmount > 0 && (
                <span className="form-hint">
                  Remaining after: {formatAmount(Math.max(0, maxAmount - parsedAmount))}
                </span>
              )}
            </div>

            {/* ── Payment Date (backdating support) ── */}
            <div className="form-field">
              <label
                className="form-label flex items-center gap-1.5"
                htmlFor="repay-date"
              >
                <Calendar size={11} />
                Payment Date
                {isBackdated && (
                  <span className="ml-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/40 rounded px-1.5 py-0.5 uppercase tracking-wider">
                    Backdated
                  </span>
                )}
              </label>
              <DatePickerInput
                value={paymentDate}
                max={today}
                onChange={setPaymentDate}
              />
              {isBackdated && (
                <span className="form-hint text-amber-700 dark:text-amber-400">
                  Recording a payment dated{' '}
                  {new Date(paymentDate + 'T12:00:00').toLocaleDateString('en-KE', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              )}
            </div>

            {/* Payment Method */}
            <div className="form-field">
              <label className="form-label" htmlFor="repay-method">Payment Method</label>
              <select
                id="repay-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethodValue)}
                className="form-select"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Reference */}
            <div className="form-field">
              <label className="form-label" htmlFor="repay-ref">
                Reference ID{' '}
                <span className="form-hint" style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                id="repay-ref"
                type="text"
                placeholder="e.g. MPESA-ABC123"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Error + Retry */}
            {error && (
              <div>
                <div className="modal-error">
                  <X size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
                {isConnectionError && (
                  <button
                    type="button"
                    onClick={() => submit({ ...lastPayloadRef })}
                    disabled={isPending}
                    className="mt-2 w-full p-2 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/40 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    {isPending
                      ? <><Loader2 size={12} className="auth-spinner" /> Retrying…</>
                      : '↺ Retry Connection'}
                  </button>
                )}
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
                <><DollarSign size={15} /><span>{isBackdated ? 'Submit Backdated Repayment' : 'Submit Repayment'}</span></>
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
