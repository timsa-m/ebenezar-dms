'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Edit,
  Car,
  Calendar,
  Hash,
  Tag,
  DollarSign,
  FileText,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Loader2,
  X,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { cn, parseVehicleDeletionMeta } from "@/lib/utils";
import { formatKES } from "@/src/lib/financial-engine";
import type { Vehicle } from "@/src/types/database.types";
import {
  softDeleteVehicle,
  restoreVehicle,
} from "@/lib/actions/vehicle.actions";
import VehicleHandoverModal from "@/components/handover/VehicleHandoverModal";
import SecureActionModal from "@/components/security/SecureActionModal";

interface VehicleDetailsHeaderProps {
  vehicle: Vehicle;
  totalCostBasis: number;
  currentUser?: any;
}

export default function VehicleDetailsHeader({
  vehicle,
  totalCostBasis,
  currentUser,
}: VehicleDetailsHeaderProps) {
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const isDeleted = vehicle.status === 'deleted';
  const deletionMeta = parseVehicleDeletionMeta(vehicle.description);

  let statusBadgeClass = "badge-new";

  if (vehicle.status === "in_stock") {
    statusBadgeClass = "badge-success";
  } else if (vehicle.status === "reserved") {
    statusBadgeClass = "badge-warning";
  } else if (vehicle.status === "financed") {
    statusBadgeClass = "badge-pending";
  } else if (vehicle.status === "repossessed") {
    statusBadgeClass = "badge-error";
  } else if (vehicle.status === "cash_sale") {
    statusBadgeClass = "badge-completed";
  } else if (vehicle.status === "deleted") {
    statusBadgeClass = "bg-red-100 text-red-800 border-red-200";
  }

  const dateAdded = vehicle.created_at
    ? new Date(vehicle.created_at).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    : "N/A";

  const statusLabel = vehicle.status.replace("_", " ");

  const handleDelete = async (verificationToken?: string) => {
    setIsDeleting(true);
    setActionMessage(null);
    try {
      const res = await softDeleteVehicle(vehicle.id, verificationToken);
      if (res.success) {
        setIsDeleteModalOpen(false);
        setActionMessage({
          type: 'success',
          text: `Vehicle ${vehicle.registration_no} has been deleted and archived. Managers can revert it anytime.`,
        });
        router.refresh();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || 'Failed to delete vehicle. Manager or Admin permission required.',
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'An unexpected error occurred while deleting vehicle.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setActionMessage(null);
    try {
      const res = await restoreVehicle(vehicle.id);
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: `Vehicle ${vehicle.registration_no} has been successfully restored to active inventory.`,
        });
        router.refresh();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || 'Failed to restore vehicle. Manager or Admin permission required.',
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'An unexpected error occurred while restoring vehicle.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <header className="w-full">
      {/* Action Feedback Message */}
      {actionMessage && (
        <div
          className={cn(
            "mb-4 flex items-center justify-between rounded-xl p-3.5 text-sm font-medium animate-fade-in shadow-xs",
            actionMessage.type === 'success'
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          )}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="size-4.5 text-red-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="rounded-md p-1 hover:bg-black/5 transition"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Prominent Deletion Warning Banner */}
      {isDeleted && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/90 dark:border-red-900/40 dark:bg-red-950/30 p-4 sm:p-5 text-red-900 dark:text-red-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-red-100 dark:bg-red-900/40 rounded-xl text-red-700 dark:text-red-300 shrink-0 relative top-2 left-2 shadow-xs">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-red-900 dark:text-red-200 text-sm sm:text-base">
                    This Vehicle is Archived / Deleted
                  </h3>
                  <span className="text-[11px] badge badge-primary font-semibold uppercase tracking-wider bg-red-200/80 dark:bg-red-900/60 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-full">
                    Hidden from Inventory
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 mt-1">
                  {deletionMeta.deletedBy ? `Deleted by ${deletionMeta.deletedBy}` : 'Deleted'}
                  {deletionMeta.deletedAt
                    ? ` on ${new Date(deletionMeta.deletedAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date(deletionMeta.deletedAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}.
                  {' '}This vehicle is hidden from active yard inventory and customer listings.
                  {deletionMeta.previousStatus && (
                    <span className="block sm:inline sm:ml-1 text-red-600 dark:text-red-400 font-medium">
                      (Previous status: <span className="capitalize">{deletionMeta.previousStatus.replace('_', ' ')}</span>)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {isManager && (
              <button
                type="button"
                onClick={handleRestore}
                disabled={isRestoring}
                className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition active:scale-98 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Reverting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="size-4" />
                    <span>Revert / Restore Vehicle</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

        {/* ================================================== */}
        {/* VEHICLE IDENTITY                                   */}
        {/* ================================================== */}

        <div className="flex min-w-0 items-start gap-4">

          {/* Vehicle Icon */}
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-2xl border sm:size-16 shadow-xs",
              isDeleted
                ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                : "border-blue-100 bg-blue-50 text-blue-600 dark:border-[#29352D] dark:bg-[#18221A] dark:text-[#B7FF3C]"
            )}
          >
            <Car className="size-7 sm:size-8" strokeWidth={1.8} />
          </div>

          {/* Main Information */}
          <div className="min-w-0 flex-1">

            {/* Registration + Status + Stock ID */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-950 dark:text-[#F4F7F4] sm:text-2xl lg:text-3xl">
                {vehicle.registration_no}
              </h1>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn(
                    "badge capitalize font-semibold shadow-xs",
                    statusBadgeClass
                  )}
                >
                  <span className="size-1.5 rounded-full mr-1.5 bg-current opacity-80" />
                  {statusLabel}
                </Badge>

                {vehicle.purchase_id && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1D2920] text-slate-600 dark:text-[#C1CBC3] border border-slate-200 dark:border-[#29352D]">
                    <Hash className="size-3 opacity-60" />
                    <span>ID: {vehicle.purchase_id}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Make / Model & Year */}
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-[#C1CBC3] sm:text-base">
              {vehicle.year ? `${vehicle.year} ` : ""}{vehicle.make_model}
            </p>

            {/* Secondary Metadata */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-[#A1ADA4]">
              <div className="flex items-center gap-1.5">
                <Hash className="size-3.5 text-slate-400 dark:text-[#A1ADA4]" />
                <span>
                  {vehicle.type || "Saloon"}
                </span>
              </div>

              <span>•</span>

              <div className="flex items-center gap-1.5">
                <Tag className="size-3.5 text-slate-400 dark:text-[#A1ADA4]" />
                <span>
                  {vehicle.condition || "Standard"}
                </span>
              </div>

              <span>•</span>

              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-slate-400 dark:text-[#A1ADA4]" />
                <span>
                  Added {dateAdded}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================== */}
        {/* ACTION / FINANCIAL SUMMARY                         */}
        {/* ================================================== */}

        <div className="flex shrink-0 flex-col gap-3 lg:items-end">

          {/* Cost Basis Card */}
          <div className="flex h-10 w-full items-center justify-between lg:justify-center gap-3 rounded-xl bg-slate-50 dark:bg-[#18221A] border border-slate-200 dark:border-[#29352D] px-4 shadow-xs sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#A1ADA4] uppercase tracking-wider">
              Total Cost Basis:
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-[#B7FF3C] tabular-nums">
              {formatKES(totalCostBasis)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {!isDeleted && (
              <button
                type="button"
                onClick={() => setIsHandoverModalOpen(true)}
                className="btn-secondary h-10 px-3.5 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs w-full sm:w-auto"
                title="Manage incoming custody, outgoing release inspection, and clearance"
              >
                <ClipboardCheck className="size-4" />
                <span>Handover &amp; Clearance</span>
              </button>
            )}

            <Link
              href={`/vehicles/${vehicle.id}/purchase-contract`}
              className="btn-secondary h-10 px-3.5 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs w-full sm:w-auto"
              title="View and print official Motor Vehicle Purchase Agreement"
            >
              <FileText className="size-4" />
              <span>Purchase Agreement</span>
            </Link>

            {!isDeleted && (
              <Link
                href={`/vehicles/${vehicle.id}/edit`}
                className="btn-primary h-10 px-4 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs w-full sm:w-auto"
              >
                <Edit className="size-4" />
                <span>Edit Vehicle</span>
              </Link>
            )}

            {/* Revert / Restore Action if Deleted */}
            {isDeleted && isManager && (
              <button
                type="button"
                onClick={handleRestore}
                disabled={isRestoring}
                className="btn-primary h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-xs w-full sm:w-auto"
              >
                {isRestoring ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                <span>Revert Vehicle</span>
              </button>
            )}

            {/* Delete Action if Active & User is Manager/Admin */}
            {!isDeleted && isManager && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 h-10 px-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white dark:border-red-900/40 dark:bg-red-950/30 dark:text-[#FF626D] dark:hover:bg-red-900/50 text-xs sm:text-sm font-semibold transition active:scale-98 cursor-pointer shadow-xs w-full sm:w-auto"
                title="Delete vehicle"
              >
                <Trash2 className="size-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* MOBILE / DESKTOP DIVIDER                           */}
      {/* ================================================== */}

      <div className="mt-5 border-b border-slate-200 dark:border-[#29352D]" />

      {/* ================================================== */}
      {/* DELETE CONFIRMATION MODAL                          */}
      {/* ================================================== */}
      <SecureActionModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onAuthorized={(token) => handleDelete(token)}
        action="VEHICLE_DELETE"
        resourceId={vehicle.id}
        title="Delete Vehicle Record"
        description="This vehicle will be hidden from the active yard inventory and customer listings. Enter your password to authorize moving this record to the deleted archive."
        confirmLabel="Confirm Delete Vehicle"
        severity="danger"
        summaryItems={[
          { label: 'Registration No', value: vehicle.registration_no },
          { label: 'Make & Model', value: vehicle.make_model },
          { label: 'Cost Basis', value: totalCostBasis ? formatKES(totalCostBasis) : 'N/A' },
        ]}
      />

      {/* Vehicle Handover & Clearance Modal */}
      <VehicleHandoverModal
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
        vehicle={vehicle}
        currentUser={currentUser}
      />
    </header>
  );
}
