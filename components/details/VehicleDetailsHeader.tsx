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
                className="badge badge-primary relative right-3 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50 shrink-0 cursor-pointer"
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
              "flex size-14 shrink-0 items-center justify-center rounded-xl border sm:size-16",
              isDeleted
                ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
                : "border-blue-100 bg-blue-50 text-blue-600 dark:border-[#29352D] dark:bg-[#18221A] dark:text-[#B7FF3C]"
            )}
          >
            <Car className="size-7 sm:size-8" strokeWidth={1.8} />
          </div>

          {/* Main Information */}
          <div className="min-w-0 flex-1">

            {/* Registration + Status */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-950 dark:text-[#F4F7F4] sm:text-2xl lg:text-[28px]">
                {vehicle.registration_no}
              </h1>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  className={cn(
                    "badge capitalize",
                    statusBadgeClass
                  )}
                >
                  {statusLabel}
                </Badge>
              </div>
            </div>

            {/* Make / Model */}
            <p className="mt-1.5 text-sm font-medium text-slate-700 dark:text-[#C1CBC3] sm:text-[15px]">
              {vehicle.make_model}
            </p>

            {/* Metadata */}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#A1ADA4] sm:text-sm">
                <Hash className="size-3.5 text-slate-400 dark:text-[#A1ADA4]" />
                <span>
                  {vehicle.type || "Saloon"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#A1ADA4] sm:text-sm">
                <Calendar className="size-3.5 text-slate-400 dark:text-[#A1ADA4]" />
                <span>
                  {vehicle.year || "N/A"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#A1ADA4] sm:text-sm">
                <Tag className="size-3.5 text-slate-400 dark:text-[#A1ADA4]" />
                <span>
                  {vehicle.condition || "Condition not specified"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#A1ADA4] sm:text-sm">
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

          {/* Cost Basis */}
          <div className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-50 dark:bg-[#18221A] border border-slate-200/60 dark:border-[#29352D] px-4 shadow-xs sm:w-auto">
            <span className="text-sm font-medium text-slate-600 dark:text-[#A1ADA4]">Total Cost:</span>
            <span className="text-sm font-bold text-slate-900 dark:text-[#B7FF3C]">{formatKES(totalCostBasis)}</span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {!isDeleted && (
              <button
                type="button"
                onClick={() => setIsHandoverModalOpen(true)}
                className={cn(
                  "badge badge-primary h-10 px-4",
                  "w-full sm:w-auto",
                  "justify-center gap-2 bg-gray-600 hover:bg-gray-700 dark:bg-[#1D2920] dark:hover:bg-[#29352D] text-white dark:text-[#F4F7F4] border dark:border-[#29352D] shadow-xs cursor-pointer"
                )}
                title="Manage incoming custody, outgoing release inspection, and clearance"
              >
                <ClipboardCheck className="size-4" />
                <span>Vehicle Handover & Clearance</span>
              </button>
            )}

            <Link
              href={`/vehicles/${vehicle.id}/purchase-contract`}
              className={cn(
                "badge badge-primary h-10 px-4",
                "w-full sm:w-auto",
                "justify-center gap-2 bg-blue-700 hover:bg-blue-800 dark:bg-[#1D2920] dark:hover:bg-[#29352D] text-white dark:text-[#F4F7F4] border dark:border-[#29352D]"
              )}
              title="View and print official Motor Vehicle Purchase Agreement"
            >
              <FileText className="size-3.5" />
              <span>Purchase Agreement</span>
            </Link>

            {!isDeleted && (
              <Link
                href={`/vehicles/${vehicle.id}/edit`}
                className={cn(
                  "badge badge-primary h-10 px-4",
                  "w-full sm:w-auto",
                  "justify-center gap-2 bg-amber-700 hover:bg-amber-800 dark:bg-[#1D2920] dark:hover:bg-[#29352D] text-white dark:text-[#F4F7F4] border dark:border-[#29352D]"
                )}
              >
                <Edit className="size-3.5" />
                <span>Edit Vehicle</span>
              </Link>
            )}

            {/* Revert / Restore Action if Deleted */}
            {isDeleted && isManager && (
              <button
                type="button"
                onClick={handleRestore}
                disabled={isRestoring}
                className="inline-flex badge badge-primary items-center justify-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                <span>Revert Vehicle</span>
              </button>
            )}

            {/* Delete Action if Active & User is Manager/Admin */}
            {!isDeleted && isManager && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="badge badge-primary inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:text-white hover:bg-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-[#FF626D] dark:hover:bg-red-900/50 text-sm font-medium transition cursor-pointer"
                title="Delete vehicle"
              >
                <Trash2 className="size-3.5" />
                <span>Delete Vehicle</span>
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
