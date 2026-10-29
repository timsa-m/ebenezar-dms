'use client';

import React from 'react';
import {
  History,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  KeyRound,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VehicleHandoverAuditLog } from '@/src/types/handover.types';

interface HandoverAuditTrailProps {
  auditLogs: VehicleHandoverAuditLog[];
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  handover_created:             History,
  inspection_completed:         FileCheck,
  accessories_saved:            CheckCircle2,
  status_changed:               Clock,
  financial_exception_approved: AlertTriangle,
  client_details_saved:         User,
  vehicle_released:             KeyRound,
  logbook_transfer_updated:     FileText,
  ownership_transfer_confirmed: ShieldCheck,
  discrepancy_resolved:         CheckCircle2,
  handover_cancelled:           XCircle,
  handover_completed:           ShieldCheck,
};

export default function HandoverAuditTrail({ auditLogs }: HandoverAuditTrailProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="size-4 text-blue-600" />
            <span>Immutable Handover Audit Trail</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only record of all inspection events, status transitions, approvals, and releases.
          </p>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700">
          {auditLogs.length} Event{auditLogs.length !== 1 ? 's' : ''} Logged
        </span>
      </div>

      {auditLogs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-xs">
          <History className="size-8 text-slate-300 mx-auto mb-2" />
          <p className="font-medium text-slate-600">No Handover Audit Logs Yet</p>
          <p className="text-slate-400 mt-1">Audit logs will appear here as actions are performed.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-xs">
          {auditLogs.map((log) => {
            const Icon = EVENT_ICONS[log.event_type] || History;

            return (
              <div key={log.id} className="p-4 flex items-start gap-3.5 hover:bg-slate-50/60 transition">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0 mt-0.5 shadow-xs">
                  <Icon className="size-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      {log.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(log.performed_at).toLocaleDateString('en-KE', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {log.description}
                  </p>

                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                    <User className="size-3" />
                    <span>
                      Performed by: <strong className="text-slate-600">{log.performed_by_name || 'System / Staff'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
