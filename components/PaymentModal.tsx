'use client';

import React, { useState, useEffect } from 'react';
import type { PaymentMethod } from '@/src/types/database.types';
import { formatKES, allocateRepayment } from '@/src/lib/financial-engine';
import { recordRepaymentReceipt } from '@/lib/actions/dms.actions';
import {
  Receipt,
  X,
  Loader2,
  CheckCircle2,
  CreditCard,
  Building2,
  Banknote,
  DollarSign,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { toast } from '@/lib/toast';

export interface PaymentAgreementOption {
  id: string;
  contract_no: string;
  client_name?: string;
  vehicle_reg?: string;
  balance: number;
  total_penalties?: number;
  monthly_due?: number;
}

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement?: PaymentAgreementOption | null;
  agreementsList?: PaymentAgreementOption[];
  onPaymentRecorded?: (receipt: any) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  agreement,
  agreementsList = [],
  onPaymentRecorded,
}: PaymentModalProps) {
  const [selectedId, setSelectedId] = useState<string>(agreement?.id || '');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Determine active agreement
  const activeAgreement =
    agreement || agreementsList.find((a) => a.id === selectedId) || null;

  useEffect(() => {
    if (isOpen) {
      if (agreement) {
        setSelectedId(agreement.id);
        setAmountPaid(agreement.monthly_due || 30000);
      } else if (agreementsList.length > 0 && !selectedId) {
        setSelectedId(agreementsList[0].id);
        setAmountPaid(agreementsList[0].monthly_due || 30000);
      }
      setReceiptNo(`REC-${Date.now().toString().slice(-6)}`);
      setReferenceNo('');
      setNotes('');
    }
  }, [isOpen, agreement, agreementsList]);

  if (!isOpen) return null;

  // Real-time calculation of repayment waterfall
  const waterfallPreview = activeAgreement
    ? allocateRepayment({
        paymentAmount: Number(amountPaid) || 0,
        outstandingPenalties: Number(activeAgreement.total_penalties) || 0,
        overdueInterest: 0,
        currentPrincipalBalance: Number(activeAgreement.balance) || 0,
      })
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeAgreement) {
      toast.error('Please select a valid financing agreement.');
      return;
    }

    if (!amountPaid || amountPaid <= 0) {
      toast.error('Repayment amount must be greater than zero.');
      return;
    }

    if (paymentMethod === 'mpesa' && !referenceNo.trim()) {
      toast.warning('Tip: Providing an M-Pesa transaction code helps reconciliation.');
    }

    setIsSubmitting(true);
    try {
      const res = await recordRepaymentReceipt({
        agreementId: activeAgreement.id,
        receiptNo: receiptNo || undefined,
        amountPaid: Number(amountPaid),
        paymentMethod,
        paymentDate,
        referenceNo: referenceNo ? referenceNo.trim() : undefined,
        notes: notes ? notes.trim() : undefined,
      });

      if (res.success) {
        toast.success(
          `Payment of ${formatKES(amountPaid)} recorded! New Balance: ${formatKES(res.newBalance)}`
        );
        if (onPaymentRecorded) {
          onPaymentRecorded(res.receipt);
        }
        onClose();
      } else {
        toast.error(res.error || 'Failed to record payment receipt.');
      }
    } catch {
      toast.error('An unexpected error occurred while processing receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Receipt size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Log Repayment Receipt
              </h2>
              <p className="text-xs text-slate-500">
                Quick-entry M-Pesa, Bank, or Cash receipt with auto-waterfall
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Agreement Selection if not pre-bound */}
          {!agreement && agreementsList.length > 0 && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Select Financing Agreement *
              </label>
              <select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  const found = agreementsList.find((a) => a.id === e.target.value);
                  if (found?.monthly_due) setAmountPaid(found.monthly_due);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium bg-white focus:ring-2 focus:ring-blue-900"
              >
                {agreementsList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.contract_no} — {a.client_name || 'Client'} ({a.vehicle_reg || 'Car'}) — Bal: {formatKES(a.balance)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Active Contract Info Banner */}
          {activeAgreement && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-center text-xs">
              <div>
                <span className="font-mono font-bold text-slate-900 block">
                  {activeAgreement.contract_no}
                </span>
                <span className="text-slate-500 text-[11px]">
                  {activeAgreement.client_name} • {activeAgreement.vehicle_reg}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                  Current Balance
                </span>
                <span className="font-black text-slate-950 text-sm">
                  {formatKES(activeAgreement.balance)}
                </span>
              </div>
            </div>
          )}

          {/* Row: Receipt No & Payment Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Receipt Number *
              </label>
              <input
                type="text"
                required
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono uppercase font-bold text-slate-900 focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800 focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          {/* Row: Amount Paid & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Amount Paid (KES) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="100"
                value={amountPaid}
                onChange={(e) => setAmountPaid(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-extrabold text-emerald-800 text-sm focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-900"
              >
                <option value="mpesa">M-Pesa Paybill</option>
                <option value="bank_transfer">Bank Transfer / EFT</option>
                <option value="cash">Cash at Yard Office</option>
                <option value="cheque">Bank Cheque</option>
              </select>
            </div>
          </div>

          {/* Reference / M-Pesa Code */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Transaction Reference / M-Pesa Code
            </label>
            <input
              type="text"
              placeholder="e.g. QKH891234M or FT23000..."
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 uppercase font-mono text-slate-800 focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* Real-time Payment Allocation Waterfall Preview */}
          {waterfallPreview && (
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-2">
              <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block">
                Live Repayment Waterfall Allocation:
              </span>
              <div className="space-y-1 text-slate-700 text-[11px]">
                <div className="flex justify-between">
                  <span>1. Outstanding Penalties Settled:</span>
                  <span className="font-bold text-slate-900">
                    {formatKES(waterfallPreview.allocatedPenalties)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>2. Overdue Interest Paid:</span>
                  <span className="font-bold text-slate-900">
                    {formatKES(waterfallPreview.allocatedOverdueInterest)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-emerald-200/80 pt-1">
                  <span>3. Principal Balance Deduction:</span>
                  <span className="font-bold text-emerald-800">
                    {formatKES(waterfallPreview.allocatedPrincipal)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-950 font-black pt-1 border-t border-emerald-200/80">
                  <span>Projected New Balance:</span>
                  <span>{formatKES(waterfallPreview.newPrincipalBalance)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes / Narration */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Notes / Ledger Narration
            </label>
            <input
              type="text"
              placeholder="e.g. Cleared installment 3 of 12"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Committing...
                </>
              ) : (
                <>
                  <Receipt size={14} /> Commit &amp; Post Receipt
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
