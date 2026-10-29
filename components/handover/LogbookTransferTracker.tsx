'use client';

import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Calendar,
  Send,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  LogbookTransferStatus,
  VehicleLogbookTransfer,
} from '@/src/types/handover.types';
import { LOGBOOK_STATUS_LABELS } from '@/src/types/handover.types';

interface LogbookTransferTrackerProps {
  logbookTransfer: VehicleLogbookTransfer | null;
  onSaveTransfer: (params: any) => Promise<boolean>;
  onConfirmOwnership: (evidenceNotes: string) => Promise<boolean>;
  isManager: boolean;
  defaultNewOwner?: string;
  readOnly?: boolean;
}

const TRANSFER_STEPS: { status: LogbookTransferStatus; label: string; stepNo: number }[] = [
  { status: 'not_received', label: 'Not Received', stepNo: 1 },
  { status: 'received', label: 'Received in Yard', stepNo: 2 },
  { status: 'verified', label: 'Document Verified', stepNo: 3 },
  { status: 'transfer_initiated', label: 'Transfer Initiated', stepNo: 4 },
  { status: 'documents_submitted', label: 'NTSA/Docs Submitted', stepNo: 5 },
  { status: 'transfer_pending', label: 'Transfer In Progress', stepNo: 6 },
  { status: 'ownership_confirmed', label: 'Ownership Confirmed', stepNo: 7 },
  { status: 'document_released_to_client', label: 'Released to Client', stepNo: 8 },
];

export default function LogbookTransferTracker({
  logbookTransfer,
  onSaveTransfer,
  onConfirmOwnership,
  isManager,
  defaultNewOwner,
  readOnly = false,
}: LogbookTransferTrackerProps) {
  const currentStatus: LogbookTransferStatus = logbookTransfer?.status || 'not_received';
  const currentStepIndex = TRANSFER_STEPS.findIndex(s => s.status === currentStatus);

  const [status, setStatus] = useState<LogbookTransferStatus>(currentStatus);
  const [currentOwner, setCurrentOwner] = useState(logbookTransfer?.current_registered_owner || '');
  const [newOwner, setNewOwner] = useState(
    logbookTransfer?.intended_new_owner || defaultNewOwner || ''
  );
  const [transferRefNo, setTransferRefNo] = useState(
    logbookTransfer?.transfer_reference_no || ''
  );
  const [notes, setNotes] = useState(logbookTransfer?.notes || '');
  const [delayReason, setDelayReason] = useState(logbookTransfer?.delay_reason || '');
  const [initiatedDate, setInitiatedDate] = useState(
    logbookTransfer?.transfer_initiated_date
      ? logbookTransfer.transfer_initiated_date.split('T')[0]
      : new Date().toISOString().split('T')[0]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmEvidence, setConfirmEvidence] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveTransfer({
        status,
        currentRegisteredOwner: currentOwner,
        intendedNewOwner: newOwner,
        transferReferenceNo: transferRefNo,
        notes,
        delayReason,
        transferInitiatedDate: initiatedDate ? new Date(initiatedDate).toISOString() : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOwnershipConfirmation = async () => {
    setIsConfirming(true);
    try {
      const ok = await onConfirmOwnership(confirmEvidence);
      if (ok) {
        setShowConfirmModal(false);
        setConfirmEvidence('');
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const isConfirmed =
    currentStatus === 'ownership_confirmed' ||
    currentStatus === 'document_released_to_client';

  return (
    <div className="space-y-6">
      {/* Tracker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="size-4.5 text-blue-600" />
            <span>Dedicated Logbook & Legal Ownership Transfer Pipeline</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical release and legal ownership transfer are separate milestones. Legal transfer
            requires manager verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-bold px-3 py-1 rounded-full border',
              isConfirmed
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-blue-100 text-blue-800 border-blue-200'
            )}
          >
            {LOGBOOK_STATUS_LABELS[currentStatus]}
          </span>
        </div>
      </div>

      {/* Visual Step Progress Bar */}
      <div className="overflow-x-auto pb-2 no-scrollbar">
        <div className="flex items-center min-w-[720px] justify-between px-2">
          {TRANSFER_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <React.Fragment key={step.status}>
                <div className="flex flex-col items-center text-center max-w-[90px]">
                  <div
                    className={cn(
                      'size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs',
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="size-4.5" />
                    ) : (
                      <span>{step.stepNo}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10.5px] mt-2 font-medium leading-tight',
                      isCurrent
                        ? 'text-blue-700 font-bold'
                        : isCompleted
                        ? 'text-emerald-800'
                        : 'text-slate-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {idx < TRANSFER_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-1 transition-all',
                      idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200'
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Manager Ownership Confirmation Callout */}
      {!isConfirmed && isManager && !readOnly && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Manager Authority: Confirm Ownership Transfer
              </h5>
              <p className="text-xs text-emerald-800 mt-0.5">
                Have official NTSA / TIMS registration documents been received confirming legal ownership transfer to the new buyer?
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 transition shadow-xs cursor-pointer shrink-0"
          >
            <CheckCircle2 className="size-3.5" />
            <span>Confirm Legal Transfer</span>
          </button>
        </div>
      )}

      {/* Ownership Confirmation Modal */}
      {showConfirmModal && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/95 p-4 space-y-3 animate-fade-in shadow-xs">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-700" />
              Sign Legal Ownership Confirmation
            </h5>
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-slate-700">
            By confirming legal ownership transfer, you verify that official governmental registration
            records (NTSA/KRA) reflect the client as the registered owner. This action is permanently
            logged under your authenticated user record.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">
              Verification Notes / Document Reference (e.g. NTSA Tracking # or Copy Ref)
            </label>
            <input
              type="text"
              value={confirmEvidence}
              onChange={e => setConfirmEvidence(e.target.value)}
              placeholder="e.g. Verified via NTSA TIMS portal on 28/10/2026..."
              className="input-class h-8.5 text-xs w-full bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isConfirming}
              onClick={() => setShowConfirmModal(false)}
              className="btn-secondary h-8 px-3 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isConfirming}
              onClick={handleOwnershipConfirmation}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 h-8 transition disabled:opacity-50 cursor-pointer"
            >
              {isConfirming && <Loader2 className="size-3.5 animate-spin" />}
              <span>Confirm & Log Legally</span>
            </button>
          </div>
        </div>
      )}

      {/* Logbook Transfer Details Form */}
      <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-4.5 space-y-4 shadow-xs">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Transfer Case Management Details
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Current Registered Owner (as per Logbook)
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={currentOwner}
              onChange={e => setCurrentOwner(e.target.value)}
              placeholder="Full name as printed on logbook..."
              className="input-class h-9 text-xs w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Intended New Owner (Buyer)
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={newOwner}
              onChange={e => setNewOwner(e.target.value)}
              placeholder="Buyer full legal name..."
              className="input-class h-9 text-xs w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Transfer Pipeline Status
            </label>
            <select
              disabled={readOnly}
              value={status}
              onChange={e => setStatus(e.target.value as LogbookTransferStatus)}
              className="input-class h-9 text-xs w-full bg-white"
            >
              {TRANSFER_STEPS.map(s => (
                <option key={s.status} value={s.status}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              NTSA / Tracking Reference Number
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={transferRefNo}
              onChange={e => setTransferRefNo(e.target.value)}
              placeholder="e.g. TIMS-2026-9812..."
              className="input-class h-9 text-xs w-full font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Transfer Initiated Date
            </label>
            <input
              type="date"
              disabled={readOnly}
              value={initiatedDate}
              onChange={e => setInitiatedDate(e.target.value)}
              className="input-class h-9 text-xs w-full bg-white"
            />
          </div>
        </div>

        {/* Delay Reason (if transfer delayed) */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Reason for Delay (if processing is on hold)
          </label>
          <input
            type="text"
            disabled={readOnly}
            value={delayReason}
            onChange={e => setDelayReason(e.target.value)}
            placeholder="e.g. Awaiting previous owner OTP, NTSA system downtime, clearance letter..."
            className="input-class h-9 text-xs w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            General Transfer Notes & Remarks
          </label>
          <textarea
            rows={2}
            disabled={readOnly}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Document handling notes, submission receipts, follow-up dates..."
            className="input-class text-xs w-full p-2.5"
          />
        </div>

        {/* Audit Meta */}
        {logbookTransfer && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
            <span>
              Handling Officer:{' '}
              <strong className="text-slate-600">
                {logbookTransfer.handling_user_name || 'Staff'}
              </strong>
            </span>
            {logbookTransfer.ownership_confirmed_date && (
              <span className="text-emerald-700 font-medium">
                Ownership Confirmed by {logbookTransfer.confirmed_by_name} on{' '}
                {new Date(logbookTransfer.ownership_confirmed_date).toLocaleDateString('en-KE')}
              </span>
            )}
          </div>
        )}

        {!readOnly && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 h-9 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isSaving && <Loader2 className="size-3.5 animate-spin" />}
              <span>Save Transfer Progress</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
