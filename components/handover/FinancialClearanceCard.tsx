'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  User,
  Phone,
  FileText,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKES } from '@/src/lib/financial-engine';
import type { HandoverFinancialSummary } from '@/src/types/handover.types';

interface FinancialClearanceCardProps {
  financialSummary: HandoverFinancialSummary | null;
  clearanceStatus: string;
  exceptionReason?: string | null;
  exceptionApprovedBy?: string | null;
  exceptionApprovedAt?: string | null;
  isManager: boolean;
  onApproveException: (reason: string) => Promise<boolean>;
}

export default function FinancialClearanceCard({
  financialSummary,
  clearanceStatus,
  exceptionReason,
  exceptionApprovedBy,
  exceptionApprovedAt,
  isManager,
  onApproveException,
}: FinancialClearanceCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [reasonInput, setReasonInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!financialSummary) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-900">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
          <span>No Linked Financing or Sales Contract Found</span>
        </div>
        <p className="mt-1 text-slate-600">
          This vehicle does not have an active financing agreement record. If this was a direct cash
          sale, please ensure the sale is recorded in the sales register.
        </p>
      </div>
    );
  }

  const isCleared = clearanceStatus === 'cleared' || financialSummary.isFinanciallyCleared;
  const isException = clearanceStatus === 'exception_approved';
  const isBlocked = !isCleared && !isException;

  const handleConfirmException = async () => {
    if (!reasonInput.trim()) {
      setErrorMsg('A detailed justification is required for manager exception approval.');
      return;
    }
    setErrorMsg('');
    setIsApproving(true);
    try {
      const ok = await onApproveException(reasonInput.trim());
      if (ok) {
        setShowExceptionForm(false);
        setReasonInput('');
      }
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Financial Status Banner */}
      <div
        className={cn(
          'rounded-xl border p-4.5 transition-all shadow-xs',
          isCleared
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : isException
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : 'bg-red-50/80 border-red-200 text-red-950'
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'p-2 rounded-xl shrink-0 mt-0.5',
                isCleared
                  ? 'bg-emerald-100 text-emerald-700'
                  : isException
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              )}
            >
              {isCleared ? (
                <ShieldCheck className="size-5" />
              ) : isException ? (
                <AlertTriangle className="size-5" />
              ) : (
                <ShieldAlert className="size-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm sm:text-base">
                  {isCleared
                    ? 'Financially Cleared for Handover'
                    : isException
                    ? 'Handover Permitted via Manager Exception'
                    : 'Financial Clearance Outstanding — Handover Blocked'}
                </h4>
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                    isCleared
                      ? 'bg-emerald-200 text-emerald-800 border-emerald-300'
                      : isException
                      ? 'bg-amber-200 text-amber-800 border-amber-300'
                      : 'bg-red-200 text-red-800 border-red-300'
                  )}
                >
                  {isCleared ? 'Cleared' : isException ? 'Exception Approved' : 'Uncleared'}
                </span>
              </div>

              <p className="text-xs mt-1 text-slate-600">
                {isCleared
                  ? 'All purchase amounts and required payments have been settled in full according to dealership policy.'
                  : isException
                  ? `Authorized release granted by ${exceptionApprovedBy || 'Manager'}. The vehicle may be released physically, but customer account remains active and liable for remaining payments.`
                  : 'Customer has an outstanding balance or overdue arrears. Vehicle release cannot proceed without full settlement or an approved management exception.'}
              </p>
            </div>
          </div>

          {/* Exception Details / Action */}
          {isBlocked && isManager && !showExceptionForm && (
            <button
              type="button"
              onClick={() => setShowExceptionForm(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3.5 py-2 transition shadow-xs cursor-pointer shrink-0"
            >
              <AlertTriangle className="size-3.5" />
              <span>Approve Manager Exception</span>
            </button>
          )}
        </div>

        {/* Existing Exception Metadata */}
        {isException && (
          <div className="mt-3.5 pt-3 border-t border-amber-200/70 text-xs text-amber-900 bg-white/60 p-3 rounded-lg">
            <div className="font-semibold flex items-center gap-1.5">
              <span>Exception Reason:</span>
              <span className="font-normal italic">"{exceptionReason || 'Documented exception'}"</span>
            </div>
            <div className="text-[11px] text-amber-700 mt-1">
              Approved by: <strong>{exceptionApprovedBy || 'Authorized Manager'}</strong>
              {exceptionApprovedAt && (
                <span>
                  {' '}on{' '}
                  {new Date(exceptionApprovedAt).toLocaleDateString('en-KE', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Exception Approval Form Modal/Drawer */}
      {showExceptionForm && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 space-y-3 animate-fade-in shadow-xs">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-amber-600" />
              Manager Exception Approval Form
            </h5>
            <button
              type="button"
              onClick={() => {
                setShowExceptionForm(false);
                setErrorMsg('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          <div className="rounded-lg bg-white p-3 border border-amber-200 text-xs text-slate-700 space-y-1">
            <p className="font-semibold text-amber-900">Important Policy Compliance Notice:</p>
            <p>
              Approving this exception authorizes the physical delivery of the vehicle to the customer
              under an approved credit/financing arrangement. It does <strong>NOT</strong> write off or
              falsify the outstanding balance of{' '}
              <strong className="text-red-700">{formatKES(financialSummary.totalOutstanding)}</strong>.
              All amounts remain fully owed and auditable in the general ledger.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">
              Documented Justification & Authority <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={reasonInput}
              onChange={e => setReasonInput(e.target.value)}
              placeholder="State the formal business reason, board approval ref, or credit agreement permitting this release..."
              className="input-class text-xs w-full p-2.5 bg-white border-amber-200"
            />
            {errorMsg && <p className="text-xs text-red-600 mt-1">{errorMsg}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isApproving}
              onClick={() => setShowExceptionForm(false)}
              className="btn-secondary h-8 px-3 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isApproving}
              onClick={handleConfirmException}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 h-8 transition disabled:opacity-50 cursor-pointer"
            >
              {isApproving && <Loader2 className="size-3.5 animate-spin" />}
              <span>Sign & Authorize Exception</span>
            </button>
          </div>
        </div>
      )}

      {/* Transaction & Financial Figures Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Authoritative Financial Breakdown
        </h5>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Contract Sale Price
            </span>
            <span className="text-sm font-bold text-slate-900 block mt-1">
              {formatKES(financialSummary.salePrice)}
            </span>
            <span className="text-[10px] text-slate-500 capitalize">
              {financialSummary.saleType.replace('_', ' ')}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Total Payments Received
            </span>
            <span className="text-sm font-bold text-emerald-700 block mt-1">
              {formatKES(financialSummary.totalPaid)}
            </span>
            <span className="text-[10px] text-slate-500">
              Deposit: {formatKES(financialSummary.depositPaid)}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Outstanding Principal
            </span>
            <span
              className={cn(
                'text-sm font-bold block mt-1',
                financialSummary.outstandingBalance > 0 ? 'text-amber-700' : 'text-slate-900'
              )}
            >
              {formatKES(financialSummary.outstandingBalance)}
            </span>
            <span className="text-[10px] text-slate-500">
              Penalties: {formatKES(financialSummary.outstandingPenalties)}
            </span>
          </div>

          <div
            className={cn(
              'p-3 rounded-lg border',
              financialSummary.totalOutstanding > 0
                ? 'bg-red-50/50 border-red-200'
                : 'bg-emerald-50/50 border-emerald-200'
            )}
          >
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
              Total Outstanding Due
            </span>
            <span
              className={cn(
                'text-sm font-bold block mt-1',
                financialSummary.totalOutstanding > 0 ? 'text-red-700' : 'text-emerald-700'
              )}
            >
              {formatKES(financialSummary.totalOutstanding)}
            </span>
            <span className="text-[10px] text-slate-500">
              {financialSummary.daysOverdue > 0
                ? `${financialSummary.daysOverdue} days overdue`
                : 'Account Current'}
            </span>
          </div>
        </div>

        {/* Customer & Contract Info */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <User className="size-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">
              Client: {financialSummary.clientName || 'Cash Sale Buyer'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <Phone className="size-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              Phone: {financialSummary.clientPhone || 'N/A'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <FileText className="size-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-mono">
              Contract: {financialSummary.contractNo || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
