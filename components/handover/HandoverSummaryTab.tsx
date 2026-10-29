'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ClipboardList,
  KeyRound,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Disc,
  Wrench,
  Loader2,
  ShieldAlert,
  Car,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/src/types/database.types';
import type { VehicleHandoverData } from '@/src/types/handover.types';
import {
  INCOMING_STATUS_LABELS,
  OUTGOING_STATUS_LABELS,
  ACCESSORY_STATUS_LABELS,
  LOGBOOK_STATUS_LABELS,
} from '@/src/types/handover.types';
import { getVehicleHandoverData } from '@/lib/actions/handover.actions';
import { formatKES } from '@/src/lib/financial-engine';

interface HandoverSummaryTabProps {
  vehicle: Vehicle;
  onOpenModal: () => void;
  currentUser?: any;
}

export default function HandoverSummaryTab({
  vehicle,
  onOpenModal,
}: HandoverSummaryTabProps) {
  const [data, setData] = useState<VehicleHandoverData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getVehicleHandoverData(vehicle.id)
      .then(res => {
        if (mounted) setData(res);
      })
      .catch(err => {
        console.error('HandoverSummaryTab fetch error:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [vehicle.id]);

  if (loading) {
    return (
      <div className="card-premium p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="size-6 animate-spin text-blue-600" />
        <span className="text-xs font-medium text-slate-500">
          Loading handover and clearance records...
        </span>
      </div>
    );
  }

  const incoming = data?.incoming;
  const outgoing = data?.outgoing;
  const accessories = incoming ? data?.incomingAccessories || [] : [];
  const discrepancies = data?.discrepancies || [];
  const openDiscrepancies = discrepancies.filter(d => d.status === 'open');
  const logbookTransfer = data?.logbookTransfer;
  const financial = data?.financialSummary;

  // Alerts logic:
  const missingAccessories = accessories.filter(
    a => a.status === 'missing' || a.status === 'received_but_defective'
  );
  const logbookAcc = accessories.find(a => a.accessory_name === 'logbook');
  const isLogbookUnverified = logbookAcc && !logbookAcc.document_verified;
  const isVehicleReleased = outgoing?.outgoing_status === 'vehicle_released';
  const isOwnershipPending =
    isVehicleReleased &&
    logbookTransfer?.status !== 'ownership_confirmed' &&
    logbookTransfer?.status !== 'document_released_to_client';

  return (
    <div className="space-y-6">
      {/* Overview Banner & Action */}
      <div className="card-premium p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Vehicle Handover, Inspection & Clearance
              </h3>
              <p className="text-xs text-slate-500">
                Audited custody transfer, accessory verification, financial clearance, and legal logbook transfer history.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenModal}
          className="btn-primary h-10 px-5 text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
        >
          <ClipboardList className="size-4" />
          <span>Manage Handover & Clearance</span>
          <ArrowUpRight className="size-3.5 opacity-70" />
        </button>
      </div>

      {/* Critical Management Alert Banners */}
      {openDiscrepancies.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs text-red-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="size-4.5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold block text-sm">
              {openDiscrepancies.length} Unresolved Handover Discrepanc{openDiscrepancies.length > 1 ? 'ies' : 'y'}
            </strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-red-800">
              {openDiscrepancies.map(d => (
                <li key={d.id}>
                  <span className="font-semibold">{d.discrepancy_type.replace(/_/g, ' ')}:</span> {d.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {missingAccessories.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900 flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Missing Equipment Alert: </strong>
            {missingAccessories.map(a => a.accessory_label).join(', ')} recorded as missing or defective. Reason: {missingAccessories.map(a => a.reason_if_missing || 'Unspecified').join('; ')}.
          </div>
        </div>
      )}

      {isOwnershipPending && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-3.5 text-xs text-blue-900 flex items-start gap-2.5 shadow-xs">
          <Clock className="size-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Ownership Transfer Pending: </strong>
            Vehicle has been physically released to the buyer, but formal legal ownership transfer has not yet been confirmed by management.
          </div>
        </div>
      )}

      {/* 4 Pillars Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* 1. Incoming Handover Card */}
        <div className="card-premium p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              1. Incoming Handover
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <ClipboardList className="size-3.5" />
            </div>
          </div>

          <div>
            <span className="text-base font-bold text-slate-900 block">
              {incoming?.incoming_status
                ? INCOMING_STATUS_LABELS[incoming.incoming_status]
                : 'Not Recorded'}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              {incoming?.received_by_name ? `Received by ${incoming.received_by_name}` : 'Awaiting initial receiving inspection'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11.5px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Odometer:</span>
              <span className="font-mono font-medium">{incoming?.odometer_km ? `${incoming.odometer_km.toLocaleString()} km` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Fuel Level:</span>
              <span>{incoming?.fuel_level || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* 2. Accessories & Logbook Card */}
        <div className="card-premium p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              2. Equipment Custody
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="size-3.5" />
            </div>
          </div>

          <div>
            <span className="text-base font-bold text-slate-900 block">
              {accessories.length > 0
                ? `${accessories.filter(a => a.status === 'received_and_verified').length} / ${accessories.length} Verified`
                : 'Pending Check'}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              {logbookAcc?.document_verified
                ? 'Logbook verified'
                : 'Logbook unverified'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
            {accessories.map(a => (
              <span
                key={a.accessory_name}
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                  a.status === 'received_and_verified'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                )}
              >
                {a.accessory_name === 'spare_tire' ? 'Tyre' : a.accessory_name === 'wheel_spanner' ? 'Spanner' : a.accessory_name}: {a.status === 'received_and_verified' ? '✓' : '✗'}
              </span>
            ))}
          </div>
        </div>

        {/* 3. Financial Clearance Card */}
        <div className="card-premium p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              3. Financial Clearance
            </span>
            <div
              className={cn(
                'p-1.5 rounded-lg',
                financial?.isFinanciallyCleared
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600'
              )}
            >
              <KeyRound className="size-3.5" />
            </div>
          </div>

          <div>
            <span className="text-base font-bold text-slate-900 block">
              {financial
                ? financial.isFinanciallyCleared
                  ? 'Cleared'
                  : formatKES(financial.totalOutstanding) + ' Due'
                : 'No Sale Contract'}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5 capitalize">
              {financial ? `${financial.saleType.replace(/_/g, ' ')} (${financial.agreementStatus})` : 'Inventory in yard'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11.5px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Release Status:</span>
              <span className="font-semibold text-blue-700">
                {outgoing?.outgoing_status ? OUTGOING_STATUS_LABELS[outgoing.outgoing_status] : 'Pending Sale'}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Logbook & Ownership Card */}
        <div className="card-premium p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              4. Legal Transfer
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="size-3.5" />
            </div>
          </div>

          <div>
            <span className="text-base font-bold text-slate-900 block">
              {logbookTransfer?.status
                ? LOGBOOK_STATUS_LABELS[logbookTransfer.status]
                : 'Not Initiated'}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              {logbookTransfer?.transfer_reference_no
                ? `Ref: ${logbookTransfer.transfer_reference_no}`
                : 'Awaiting NTSA processing'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11.5px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">New Owner:</span>
              <span className="font-medium truncate max-w-[120px]">{logbookTransfer?.intended_new_owner || 'Unassigned'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
