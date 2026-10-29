'use client';

import React, { useState, useRef, useTransition } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import {
  LayoutDashboard,
  Folder,
  Upload,
  File,
  Loader2,
  Wrench,
  Car,
  Plus,
  Gauge,
  Fuel,
  Settings2,
  Palette,
  User,
  FileText,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import HandoverSummaryTab from '@/components/handover/HandoverSummaryTab';
import VehicleHandoverModal from '@/components/handover/VehicleHandoverModal';
import { formatKES } from "@/src/lib/financial-engine";
import type { Vehicle, VehicleCost, VehicleCostType } from "@/src/types/database.types";
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import CustomModal from "@/components/ui/CustomModal";
import { addVehicleCost, uploadVehicleDocument } from "@/lib/actions/vehicle.actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface VehicleTabsProps {
  vehicle: Vehicle;
  costs: VehicleCost[];
  documents?: any[];
}

function fmt(d: string) {
  return d
    ? new Date(d).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    : "—";
}

export default function VehicleTabs({
  vehicle,
  costs,
  documents = [],
}: VehicleTabsProps) {
  const router = useRouter();

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
  }

  const [isUploading, startTransition] = useTransition();
  const [selectedDocType, setSelectedDocType] = useState("LOGBOOK");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handover Modal State
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // Expense Modal State
  const [isAddCostOpen, setIsAddCostOpen] = useState(false);
  const [costType, setCostType] =
    useState<VehicleCostType>('mechanical');
  const [costAmount, setCostAmount] = useState<number>(0);
  const [costDescription, setCostDescription] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [isCostSaving, setIsCostSaving] = useState(false);

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!costAmount || !costDescription.trim()) {
      toast.error('Cost amount and description are required.');
      return;
    }

    setIsCostSaving(true);

    try {
      const res = await addVehicleCost({
        vehicleId: vehicle.id,
        costType,
        amount: costAmount,
        description: costDescription,
        vendorName,
      });

      if (res.success) {
        toast.success(
          `Cost of ${formatKES(costAmount)} added to ${vehicle.registration_no}`
        );

        setIsAddCostOpen(false);
        setCostDescription('');
        setVendorName('');
        setCostAmount(0);

        router.refresh();
      } else {
        toast.error(res.error || 'Failed to add cost.');
      }
    } catch {
      toast.error('An error occurred.');
    } finally {
      setIsCostSaving(false);
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    startTransition(async () => {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("documentType", selectedDocType);
      formData.append("documentName", file.name);

      const res = await uploadVehicleDocument(
        vehicle.id,
        formData
      );

      if (res.success) {
        toast.success("Document uploaded successfully");
      } else {
        toast.error(
          res.error || "Failed to upload document"
        );
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  const tabClass = [
    "h-11 rounded-none px-0",
    "text-sm font-medium",
    "text-slate-500",
    "transition-colors",
    "hover:text-slate-900",
    "data-[state=active]:border-b-2",
    "data-[state=active]:border-blue-600",
    "data-[state=active]:bg-transparent",
    "data-[state=active]:text-blue-600",
    "data-[state=active]:shadow-none",
  ].join(" ");

  return (
    <Tabs defaultValue="overview" className="w-full">
      {/* -------------------------------------------------- */}
      {/* TABS                                                */}
      {/* -------------------------------------------------- */}

      <div className="mb-6 overflow-x-auto border-b border-slate-200 no-scrollbar">
        <TabsList className="h-11 w-full min-w-max justify-start gap-7 bg-transparent p-0">
          <TabsTrigger
            value="overview"
            className={tabClass}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="size-4" />
              <span>Overview</span>
            </div>
          </TabsTrigger>

          <TabsTrigger
            value="documents"
            className={tabClass}
          >
            <div className="flex items-center gap-2">
              <Folder className="size-4" />
              <span>Documents</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                {documents.length}
              </span>
            </div>
          </TabsTrigger>

          <TabsTrigger
            value="handover"
            className={tabClass}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              <span>Handover & Clearance</span>
            </div>
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ================================================== */}
      {/* OVERVIEW                                            */}
      {/* ================================================== */}

      <TabsContent
        value="overview"
        className="mt-0 focus-visible:outline-none"
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.8fr)]">

          {/* ================================================== */}
          {/* MAIN COLUMN                                         */}
          {/* ================================================== */}

          <div className="min-w-0 space-y-5">

            {/* ------------------------------------------------ */}
            {/* VEHICLE MEDIA + DESCRIPTION                       */}
            {/* ------------------------------------------------ */}

            <section className="card-premium overflow-hidden p-0">

              {/* Card Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Car className="size-4" />
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900">
                      Vehicle Overview
                    </h3>
                  </div>

                  <p className="truncate pl-10 text-xs text-slate-500">
                    {vehicle.make_model}
                  </p>
                </div>

                <div className="shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${vehicle.is_published
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                      }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${vehicle.is_published
                        ? "bg-emerald-500"
                        : "bg-slate-400"
                        }`}
                    />

                    {vehicle.is_published
                      ? "Published"
                      : "Hidden"}
                  </span>
                </div>
              </div>

              <div className="p-5">

                {/* Gallery */}
                <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar snap-x">
                  {vehicle.images &&
                    vehicle.images.length > 0 ? (
                    vehicle.images.map((img, i) => (
                      <div
                        key={i}
                        className="relative h-[190px] min-w-[285px] shrink-0 snap-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={img}
                          alt={`Vehicle view ${i + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                        />

                        <div className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                          Photo {i + 1}
                        </div>
                      </div>
                    ))
                  ) : (
                    [1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="relative flex h-[190px] min-w-[285px] shrink-0 snap-center items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                      >
                        <Car className="size-10 text-slate-300" />

                        <span className="absolute bottom-3 right-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Photo {i}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <br />
                {/* Description */}
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Description
                    </h4>

                    {vehicle.is_new_arrival && (
                      <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold text-orange-600">
                        New Arrival
                      </span>
                    )}
                  </div>

                  <p className="text-[13px] leading-6 text-slate-600 whitespace-pre-line">
                    {vehicle.description && vehicle.description.trim() !== "" ? (
                      vehicle.description
                    ) : (
                      `Excellent condition ${vehicle.make_model} finished in ${vehicle.color || 'factory color'}. This ${vehicle.type || 'vehicle'} features ${vehicle.transmission?.toLowerCase() || 'automatic'} transmission paired with a ${vehicle.engine_capacity || 'reliable'} engine. Perfect for both city driving and longer journeys.`
                    )}
                  </p>
                  <br />

                  {/* Features */}
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-semibold text-slate-500">
                      Features
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(vehicle.features && vehicle.features.length > 0) ? (
                        vehicle.features.map((feature, i) => (
                          <span
                            key={i}
                            className="rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                          >
                            {feature}
                          </span>
                        ))
                      ) : (
                        ['Air Conditioning', 'Power Steering', 'Alloy Wheels'].map((feature, i) => (
                          <span
                            key={i}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                          >
                            {feature}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <br />
                {/* Website / Hire Status */}
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Availability & Website Status
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Website
                      </span>

                      <span
                        className={`mt-1 block text-xs font-semibold ${vehicle.is_published
                          ? "text-emerald-600"
                          : "text-slate-500"
                          }`}
                      >
                        {vehicle.is_published
                          ? "Published"
                          : "Hidden"}
                      </span>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        New Arrival
                      </span>

                      <span
                        className={`mt-1 block text-xs font-semibold ${vehicle.is_new_arrival
                          ? "text-orange-600"
                          : "text-slate-400"
                          }`}
                      >
                        {vehicle.is_new_arrival
                          ? "Yes"
                          : "No"}
                      </span>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Condition
                      </span>

                      <span className="mt-1 block truncate text-xs font-semibold text-slate-800">
                        {vehicle.condition || "N/A"}
                      </span>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                      <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Hire
                      </span>

                      <span
                        className={`mt-1 block text-xs font-semibold ${vehicle.for_hire
                          ? "text-blue-600"
                          : "text-slate-400"
                          }`}
                      >
                        {vehicle.for_hire
                          ? "Available"
                          : "Not for hire"}
                      </span>
                    </div>
                  </div>

                  {vehicle.for_hire && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2.5 text-xs">
                      <span className="text-slate-500">
                        Daily
                        <strong className="ml-1.5 font-semibold text-slate-900">
                          {vehicle.hire_price
                            ? formatKES(
                              Number(vehicle.hire_price)
                            )
                            : "N/A"}
                        </strong>
                      </span>

                      <span className="text-slate-500">
                        Weekly
                        <strong className="ml-1.5 font-semibold text-slate-900">
                          {vehicle.hire_price_weekly
                            ? formatKES(
                              Number(
                                vehicle.hire_price_weekly
                              )
                            )
                            : "N/A"}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ------------------------------------------------ */}
            {/* EXPENSES                                           */}
            {/* ------------------------------------------------ */}

            <section className="card-premium p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Wrench className="size-4" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Pre-Sale Expenses
                    </h3>

                    <p className="text-xs text-slate-500">
                      Costs recorded before sale or hire
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddCostOpen(true)}
                  className="btn-primary h-9 shrink-0 gap-1.5 px-3 text-xs font-semibold"
                >
                  <Plus className="size-3.5" />
                  Add Expense
                </button>
              </div>

              <div className="space-y-2.5">
                {costs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                    <Wrench className="mx-auto mb-2 size-6 text-slate-300" />

                    <p className="text-xs font-medium text-slate-500">
                      No additional costs recorded yet.
                    </p>
                  </div>
                ) : (
                  costs.map((cost) => (
                    <div
                      key={cost.id}
                      className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/60 px-3.5 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-900">
                          {cost.description}
                        </p>

                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {cost.cost_type
                            .replace('_', ' ')
                            .toUpperCase()}{" "}
                          · {cost.vendor_name || 'Internal'} ·{" "}
                          {fmt(cost.incurred_date)}
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-semibold text-slate-900">
                        {formatKES(Number(cost.amount))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* ================================================== */}
          {/* SIDEBAR                                              */}
          {/* ================================================== */}

          <aside className="min-w-0">

            {/* Specifications */}
            <section className="card-premium p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Settings2 className="size-4" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Specifications
                  </h3>


                </div>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Palette className="size-3.5" />
                    Color
                  </div>

                  <span className="text-right text-xs font-semibold text-slate-900">
                    {vehicle.color || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Gauge className="size-3.5" />
                    Engine
                  </div>

                  <span className="text-right text-xs font-semibold text-slate-900">
                    {vehicle.engine_capacity || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Settings2 className="size-3.5" />
                    Transmission
                  </div>

                  <span className="text-right text-xs font-semibold text-slate-900">
                    {vehicle.transmission || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Fuel className="size-3.5" />
                    Fuel Type
                  </div>

                  <span className="text-right text-xs font-semibold text-slate-900">
                    {vehicle.fuel_type || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 pt-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Gauge className="size-3.5" />
                    Mileage
                  </div>

                  <span className="text-right text-xs font-semibold text-slate-900">
                    {vehicle.mileage
                      ? `${vehicle.mileage.toLocaleString()} km`
                      : "—"}
                  </span>
                </div>
              </div>
            </section>

            {/* Vendor & Acquisition Contract */}
            <section className="card-premium p-5 mt-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Purchase &amp; Seller
                    </h3>

                  </div>
                </div>
                <Badge
                  className={cn(
                    "badge capitalize",
                    statusBadgeClass
                  )}
                >
                  Agreement
                </Badge>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
                  <span className="text-slate-500">Seller</span>
                  <span className="font-semibold text-slate-900 text-right truncate max-w-[140px]">
                    {(vehicle as any).seller_name || "Record on Contract"}
                  </span>
                </div>

                {Boolean((vehicle as any).seller_phone || (vehicle as any).seller_id_number) && (
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-slate-500">Contact / ID</span>
                    <span className="font-mono text-slate-700 text-right text-[11px]">
                      {(vehicle as any).seller_phone || (vehicle as any).seller_id_number}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-slate-500">Purchase Price</span>
                  <span className="font-bold text-slate-900 text-right">
                    {formatKES(vehicle.purchase_price)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-slate-500">Date Acquired</span>
                  <span className="text-slate-700 text-right">
                    {fmt(vehicle.date_purchased || vehicle.created_at)}
                  </span>
                </div>
              </div>

              <Link
                href={`/vehicles/${vehicle.id}/purchase-contract`}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                <span>View Purchase Agreement</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            </section>
          </aside>
        </div>
      </TabsContent>

      {/* ================================================== */}
      {/* DOCUMENTS                                           */}
      {/* ================================================== */}

      <TabsContent
        value="documents"
        className="mt-0 focus-visible:outline-none"
      >
        <div className="card-premium p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Vehicle Documents
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                Store and access vehicle-related documentation
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger className="input-class h-9 w-[145px] text-xs">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOGBOOK">Logbook</SelectItem>
                  <SelectItem value="INSPECTION">Inspection Report</SelectItem>
                  <SelectItem value="IMPORT">Import Docs</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  disabled={isUploading}
                />

                <button
                  className="btn-primary h-9 gap-1.5 px-3.5 text-xs"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}

                  <span>
                    {isUploading
                      ? "Uploading..."
                      : "Upload"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {documents.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-5 py-12 text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-slate-100">
                  <Folder className="size-5 text-slate-400" />
                </div>

                <p className="text-sm font-medium text-slate-600">
                  No documents uploaded yet
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Upload logbooks, inspection reports,
                  and import documents
                </p>
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300 hover:bg-slate-50/50"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <File className="size-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-xs font-semibold text-slate-800 hover:text-blue-600"
                    >
                      {doc.documentName || doc.type}
                    </a>

                    <p className="mt-1 text-[11px] text-slate-500">
                      {doc.type} · {fmt(doc.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </TabsContent>

      {/* ================================================== */}
      {/* HANDOVER & CLEARANCE                                */}
      {/* ================================================== */}

      <TabsContent
        value="handover"
        className="mt-0 focus-visible:outline-none"
      >
        <HandoverSummaryTab
          vehicle={vehicle}
          onOpenModal={() => setIsHandoverModalOpen(true)}
        />
      </TabsContent>

      {/* ================================================== */}
      {/* ADD EXPENSE MODAL                                  */}
      {/* ================================================== */}

      <CustomModal
        isOpen={isAddCostOpen}
        onClose={() => setIsAddCostOpen(false)}
        title="Add Pre-Sale Expense"
        width={480}
      >
        <form
          onSubmit={handleAddCost}
          className="space-y-5"
        >
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-500">
            You are adding an expense for:

            <strong className="ml-1 font-mono font-semibold text-slate-900">
              {vehicle.registration_no}
            </strong>

            <span className="ml-1">
              ({vehicle.make_model})
            </span>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Cost Category
            </label>

            <Select
              value={costType}
              onValueChange={(val) => setCostType(val as VehicleCostType)}
            >
              <SelectTrigger className="input-class h-10 w-full">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mechanical">Mechanical Repair / Servicing</SelectItem>
                <SelectItem value="bodywork">Bodywork / Panel Beating / Paint</SelectItem>
                <SelectItem value="tracking">GPS Tracking Hardware & Installation</SelectItem>
                <SelectItem value="detailing">Interior / Detailing / Buffing</SelectItem>
                <SelectItem value="legal">Logbook Transfer / Legal Inspection</SelectItem>
                <SelectItem value="import_duty">Import Duty / Port Charges</SelectItem>
                <SelectItem value="other">Other Incidentals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Expense Amount (KES) *
            </label>

            <input
              type="number"
              required
              value={costAmount || ''}
              onChange={(e) =>
                setCostAmount(
                  Number(e.target.value)
                )
              }
              placeholder="e.g. 15000"
              className="input-class h-10 w-full font-semibold"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Description / Item Detail *
            </label>

            <input
              type="text"
              required
              placeholder="e.g. Front suspension bushing & new battery"
              value={costDescription}
              onChange={(e) =>
                setCostDescription(e.target.value)
              }
              className="input-class h-10 w-full"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Garage / Vendor Name
            </label>

            <input
              type="text"
              placeholder="e.g. QuickFit Auto Kisumu"
              value={vendorName}
              onChange={(e) =>
                setVendorName(e.target.value)
              }
              className="input-class h-10 w-full"
            />
          </div>

          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() =>
                setIsAddCostOpen(false)
              }
              className="btn-secondary h-10 px-5 text-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isCostSaving}
              className="btn-primary h-10 bg-blue-600 px-5 text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {isCostSaving && (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              )}

              Save Expense
            </button>
          </div>
        </form>
      </CustomModal>

      {/* Vehicle Handover & Clearance Modal */}
      <VehicleHandoverModal
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
        vehicle={vehicle}
      />
    </Tabs>
  );
}
