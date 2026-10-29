'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  Calendar,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VehicleHandoverDiscrepancy } from '@/src/types/handover.types';

interface DiscrepancyManagerProps {
  discrepancies: VehicleHandoverDiscrepancy[];
  onResolveDiscrepancy: (discrepancyId: string, resolutionNotes: string) => Promise<boolean>;
  isManager: boolean;
  readOnly?: boolean;
}

const SEVERITY_BADGES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high:     'bg-orange-100 text-orange-800 border-orange-200',
  medium:   'bg-amber-100 text-amber-800 border-amber-200',
  low:      'bg-blue-100 text-blue-800 border-blue-200',
};

export default function DiscrepancyManager({
  discrepancies,
  onResolveDiscrepancy,
  isManager,
  readOnly = false,
}: DiscrepancyManagerProps) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const openCount = discrepancies.filter(d => d.status === 'open').length;

  const handleResolve = async (id: string) => {
    if (!resolutionText.trim()) {
      setErrorMsg('Documented resolution notes are required by company audit policy.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const ok = await onResolveDiscrepancy(id, resolutionText.trim());
      if (ok) {
        setResolvingId(null);
        setResolutionText('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" />
            <span>Handover Discrepancy Log & Accountability Register</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-raised discrepancies between incoming baseline and outgoing release equipment.
            Resolution preserves the original record.
          </p>
        </div>

        <span
          className={cn(
            'text-xs font-bold px-3 py-1 rounded-full border',
            openCount > 0
              ? 'bg-red-100 text-red-800 border-red-300'
              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          )}
        >
          {openCount > 0 ? `${openCount} Open Issue${openCount > 1 ? 's' : ''}` : 'All Issues Resolved'}
        </span>
      </div>

      {discrepancies.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-xs">
          <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2 opacity-80" />
          <p className="font-semibold text-slate-700">No Discrepancies Recorded</p>
          <p className="text-slate-400 mt-1">
            All equipment, documents, and condition items match acquisition baseline records without conflict.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {discrepancies.map(disc => {
            const isOpen = disc.status === 'open';
            const isBeingResolved = resolvingId === disc.id;

            return (
              <div
                key={disc.id}
                className={cn(
                  'rounded-xl border p-4 transition-all bg-white shadow-xs',
                  isOpen ? 'border-red-200 bg-red-50/10' : 'border-slate-200'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                          SEVERITY_BADGES[disc.severity] || SEVERITY_BADGES.medium
                        )}
                      >
                        {disc.severity}
                      </span>

                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                          isOpen
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        )}
                      >
                        {disc.status.replace('_', ' ')}
                      </span>

                      <span className="text-xs font-semibold text-slate-700 capitalize">
                        Type: {disc.discrepancy_type.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Original Immutable Description */}
                    <p className="text-xs font-medium text-slate-900 leading-relaxed pt-1">
                      {disc.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        Raised by: {disc.raised_by_name || 'Staff'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {new Date(disc.raised_at).toLocaleDateString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Resolve Button (for Managers) */}
                  {isOpen && isManager && !readOnly && !isBeingResolved && (
                    <button
                      type="button"
                      onClick={() => {
                        setResolvingId(disc.id);
                        setResolutionText('');
                        setErrorMsg('');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 transition shadow-xs cursor-pointer shrink-0"
                    >
                      <Check className="size-3.5" />
                      <span>Document Resolution</span>
                    </button>
                  )}
                </div>

                {/* Resolution Form */}
                {isBeingResolved && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-200 space-y-2.5 bg-slate-50 p-3 rounded-lg animate-fade-in">
                    <label className="block text-xs font-semibold text-slate-800">
                      Documented Resolution Notes <span className="text-red-500">* (Immutable)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={resolutionText}
                      onChange={e => setResolutionText(e.target.value)}
                      placeholder="Explain how this issue was resolved (e.g. Spare tyre replaced with new OEM unit, client compensated, supplier invoiced)..."
                      className="input-class text-xs w-full p-2 bg-white"
                    />
                    {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setResolvingId(null)}
                        className="btn-secondary h-8 px-3 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleResolve(disc.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 h-8 transition disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                        <span>Save Resolution</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Resolved Info Display */}
                {!isOpen && disc.resolution_notes && (
                  <div className="mt-3 pt-3 border-t border-slate-100 bg-emerald-50/50 p-2.5 rounded-lg text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-semibold">
                      <ShieldCheck className="size-3.5 text-emerald-600" />
                      <span>Resolved by {disc.resolved_by_name || 'Manager'}:</span>
                    </div>
                    <p className="text-slate-700 italic pl-5">"{disc.resolution_notes}"</p>
                    {disc.resolved_at && (
                      <p className="text-[10.5px] text-slate-400 pl-5">
                        Resolved on{' '}
                        {new Date(disc.resolved_at).toLocaleDateString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
