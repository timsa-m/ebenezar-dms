'use client';

import React from 'react';
import {
  Disc,
  Wrench,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AccessoryFormItem,
  AccessoryName,
  AccessoryStatus,
  VehicleAccessoryRecord,
  HandoverType,
} from '@/src/types/handover.types';
import { ACCESSORY_LABELS, ACCESSORY_STATUS_LABELS } from '@/src/types/handover.types';

interface AccessoryChecklistProps {
  handoverType: HandoverType;
  accessories: AccessoryFormItem[];
  onChange: (accessories: AccessoryFormItem[]) => void;
  incomingBaseline?: VehicleAccessoryRecord[];
  readOnly?: boolean;
}

const ACCESSORY_ICONS: Record<AccessoryName, React.ElementType> = {
  spare_tire: Disc,
  jack: Wrench,
  wheel_spanner: Wrench,
  logbook: FileText,
};

const STATUS_CONFIG: Record<
  AccessoryStatus,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  received_and_verified: {
    label: 'Received & Verified',
    badgeClass: 'badge badge-primary bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  missing: {
    label: 'Missing',
    badgeClass: 'badge badge-primary bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
  received_but_defective: {
    label: 'Received but Defective',
    badgeClass: 'badge badge-primary bg-amber-50 text-amber-700 border-amber-200',
    icon: AlertTriangle,
  },
  pending_verification: {
    label: 'Pending Verification',
    badgeClass: 'badge badge-primary bg-blue-50 text-blue-700 border-blue-200',
    icon: Clock,
  },
  not_applicable: {
    label: 'N/A',
    badgeClass: 'badge badge-primary bg-slate-100 text-slate-600 border-slate-200',
    icon: HelpCircle,
  },
};

export default function AccessoryChecklist({
  handoverType,
  accessories,
  onChange,
  incomingBaseline = [],
  readOnly = false,
}: AccessoryChecklistProps) {
  const updateItem = (name: AccessoryName, updates: Partial<AccessoryFormItem>) => {
    if (readOnly) return;
    const next = accessories.map(item =>
      item.accessory_name === name ? { ...item, ...updates } : item
    );
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Informative Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            Mandatory Accessory & Document Verification
          </h4>
          <p className="text-xs text-slate-500">
            {handoverType === 'incoming'
              ? 'Verify custody transfer of all critical vehicle equipment into Ebenezar Enterprises LTD.'
              : 'Verify equipment availability for handover to the client against the acquisition baseline.'}
          </p>
        </div>
      </div>
      <br />
      <div className="grid grid-cols-1 gap-4">
        {accessories.map(item => {
          const Icon = ACCESSORY_ICONS[item.accessory_name] || Wrench;
          const baseline = incomingBaseline.find(
            b => b.accessory_name === item.accessory_name
          );
          const needsReason =
            item.status === 'missing' ||
            item.status === 'received_but_defective' ||
            item.status === 'pending_verification';

          // Critical discrepancy check for outgoing workflow:
          const isDiscrepancy =
            handoverType === 'outgoing' &&
            baseline?.status === 'received_and_verified' &&
            (item.status === 'missing' || item.status === 'received_but_defective');

          return (
            <div
              key={item.accessory_name}
              className={cn(
                'rounded-xl  transition-all p-4 bg-white',
                isDiscrepancy
                  ? 'border-red-300 ring-1 ring-red-200 bg-red-50/20'
                  : item.status === 'received_and_verified'
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-slate-200'
              )}
            >
              {/* Item Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2.5 rounded-xl shrink-0',
                      item.status === 'received_and_verified'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.status === 'missing'
                          ? 'bg-red-100 text-red-700'
                          : item.status === 'received_but_defective'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <span className="font-semibold badge badge-primary text-slate-900 text-sm sm:text-base">
                      {item.accessory_label}
                    </span>
                    {handoverType === 'outgoing' && (
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span className="text-slate-400">Incoming baseline:</span>
                        {baseline ? (
                          <span
                            className={cn(
                              'font-medium',
                              baseline.status === 'received_and_verified'
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            )}
                          >
                            {ACCESSORY_STATUS_LABELS[baseline.status] || baseline.status}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No baseline record</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Selection Buttons */}
                {!readOnly ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        'received_and_verified',
                        'missing',
                        'received_but_defective',
                        'pending_verification',
                      ] as AccessoryStatus[]
                    ).map(statusKey => {
                      const cfg = STATUS_CONFIG[statusKey];
                      const isSelected = item.status === statusKey;
                      return (
                        <button
                          key={statusKey}
                          type="button"
                          onClick={() => updateItem(item.accessory_name, { status: statusKey })}
                          className={cn(
                            'text-xs px-2.5 badge badge-primary py-1.5 rounded-lg border font-medium transition cursor-pointer',
                            isSelected
                              ? `${cfg.badgeClass} ring-2 ring-offset-1 ring-blue-500/30 font-semibold shadow-xs`
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border font-medium inline-flex items-center gap-1',
                      STATUS_CONFIG[item.status]?.badgeClass
                    )}
                  >
                    {STATUS_CONFIG[item.status]?.label}
                  </span>
                )}
              </div>

              {/* Critical Discrepancy Warning Callout */}
              {isDiscrepancy && (
                <div className="mt-3.5 flex items-start gap-2.5 rounded-lg bg-red-100/70 border border-red-200 p-3 text-red-900 text-xs">
                  <AlertTriangle className="size-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Discrepancy Detected: </strong>
                    {item.accessory_label} was recorded as{' '}
                    <span className="font-semibold underline">received and verified</span> during
                    vehicle acquisition, but is now marked as{' '}
                    <span className="font-semibold underline">
                      {ACCESSORY_STATUS_LABELS[item.status]}
                    </span>{' '}
                    for release. An automatic discrepancy alert will be logged for management audit.
                  </div>
                </div>
              )}

              {/* Mandatory Reason Input if Missing or Defective */}
              {needsReason && !readOnly && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-red-700 mb-1">
                    Reason / Explanatory Note <span className="text-red-500">* (Required)</span>
                  </label>
                  <input
                    type="text"
                    value={item.reason_if_missing || ''}
                    onChange={e =>
                      updateItem(item.accessory_name, { reason_if_missing: e.target.value })
                    }
                    placeholder={`Explain why ${item.accessory_label.toLowerCase()} is ${item.status === 'missing'
                      ? 'missing'
                      : item.status === 'received_but_defective'
                        ? 'defective'
                        : 'pending verification'
                      }...`}
                    className="input-class h-9 text-xs w-full border-red-200 focus:border-red-400 bg-red-50/30"
                  />
                </div>
              )}

              {/* Condition / Inspection Notes */}
              {!readOnly && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={item.condition_notes || ''}
                    onChange={e =>
                      updateItem(item.accessory_name, { condition_notes: e.target.value })
                    }
                    placeholder="Physical condition remarks (e.g. tread depth, brand, scratches)..."
                    className="input-class h-8 text-xs w-full bg-slate-50/60"
                  />
                </div>
              )}

              {/* Read-only notes display */}
              {readOnly && (item.reason_if_missing || item.condition_notes) && (
                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  {item.reason_if_missing && (
                    <p className="text-red-700 font-medium">
                      Note: {item.reason_if_missing}
                    </p>
                  )}
                  {item.condition_notes && (
                    <p className="text-slate-500">Condition: {item.condition_notes}</p>
                  )}
                </div>
              )}
              <br />
              {/* Special Section: Logbook Details */}
              {item.accessory_name === 'logbook' && (
                <div className="mt-4 pt-3.5  space-y-3 bg-slate-50/50 p-3.5 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <FileCheck className="size-4 text-blue-600" />
                    <span>Logbook Legal Verification Checklist</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Document Type: Original vs Copy */}
                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-medium">Document Format</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => updateItem('logbook', { is_original_document: true })}
                          className={cn(
                            'flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition cursor-pointer',
                            item.is_original_document === true
                              ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          )}
                        >
                          Original Document
                        </button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => updateItem('logbook', { is_original_document: false })}
                          className={cn(
                            'flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition cursor-pointer',
                            item.is_original_document === false
                              ? 'bg-amber-600 text-white border-amber-600 font-semibold'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          )}
                        >
                          Copy / Interim
                        </button>
                      </div>
                    </div>

                    {/* Received From Name */}
                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-medium">Physically Received From</label>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.received_from_name || ''}
                        onChange={e =>
                          updateItem('logbook', { received_from_name: e.target.value })
                        }
                        placeholder="Name of previous owner/agent..."
                        className="input-class h-8.5 text-xs w-full bg-white"
                      />
                    </div>
                  </div>

                  {/* Document Verified Checkbox */}
                  <div className="pt-2 border-t border-slate-200/70 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="logbook-verified"
                      disabled={readOnly}
                      checked={item.document_verified || false}
                      onChange={e =>
                        updateItem('logbook', { document_verified: e.target.checked })
                      }
                      className="size-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <label htmlFor="logbook-verified" className="text-xs text-slate-700 cursor-pointer">
                      <span className="font-semibold text-slate-900 block">
                        Official Document Verified
                      </span>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        Logbook has been verified against the physical vehicle chassis number and KRA/NTSA records. (Checking received does NOT automatically verify document validity).
                      </span>
                    </label>
                  </div>

                  {/* Ownership Discrepancy Note */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Ownership / Name Discrepancies (if registered name differs from seller)
                    </label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={item.ownership_discrepancy || ''}
                      onChange={e =>
                        updateItem('logbook', { ownership_discrepancy: e.target.value })
                      }
                      placeholder="e.g. Registered owner is 3rd party with power of attorney..."
                      className="input-class h-8 text-xs w-full bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
