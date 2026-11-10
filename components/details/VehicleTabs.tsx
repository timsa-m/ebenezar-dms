'use client';

import React, { useState, useRef, useTransition, useMemo, useEffect } from 'react';
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
  DollarSign,
  TrendingUp,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  Calendar,
  Hash,
  ShieldAlert,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  ExternalLink,
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

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const COST_CATEGORY_LABELS: Record<string, string> = {
  mechanical: 'Mechanical / Service',
  bodywork: 'Bodywork / Paint',
  tracking: 'GPS Tracking',
  detailing: 'Detailing / Buffing',
  legal: 'Logbook / Inspection',
  import_duty: 'Import Duty / Port',
  other: 'Other Incidentals',
};

export default function VehicleTabs({
  vehicle,
  costs,
  documents = [],
}: VehicleTabsProps) {
  const router = useRouter();

  // Status badge styling
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

  // Upload and Documents State
  const [isUploading, startTransition] = useTransition();
  const [selectedDocType, setSelectedDocType] = useState("LOGBOOK");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handover Modal State
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // Expense Modal State
  const [isAddCostOpen, setIsAddCostOpen] = useState(false);
  const [costType, setCostType] = useState<VehicleCostType>('mechanical');
  const [costAmount, setCostAmount] = useState<number>(0);
  const [costDescription, setCostDescription] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [isCostSaving, setIsCostSaving] = useState(false);

  // Image Gallery & Lightbox Preview State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Keyboard navigation for image lightbox
  const images = vehicle.images && vehicle.images.length > 0 ? vehicle.images : [];
  useEffect(() => {
    if (!isLightboxOpen || images.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev + 1) % images.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, images.length]);

  // Financial Metrics Calculations
  const totalExpenses = useMemo(() => {
    return costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [costs]);

  const purchasePrice = Number(vehicle.purchase_price) || 0;
  const targetSalePrice = Number(vehicle.sale_price) || 0;
  const totalCostBasis = purchasePrice + totalExpenses;
  const projectedMargin = targetSalePrice > 0 ? targetSalePrice - totalCostBasis : 0;
  const marginPercentage =
    totalCostBasis > 0 && targetSalePrice > 0
      ? Math.round((projectedMargin / totalCostBasis) * 100)
      : 0;

  // Add Expense Handler
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
      toast.error('An error occurred while recording cost.');
    } finally {
      setIsCostSaving(false);
    }
  };

  // Upload Document Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", selectedDocType);
      formData.append("documentName", file.name);

      const res = await uploadVehicleDocument(vehicle.id, formData);

      if (res.success) {
        toast.success("Document uploaded successfully");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to upload document");
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  const tabClass = [
    "h-11 rounded-none px-1 pb-3 pt-2",
    "text-xs sm:text-sm font-semibold",
    "text-slate-500 dark:text-[#A1ADA4]",
    "transition-all duration-200",
    "hover:text-slate-900 dark:hover:text-[#F4F7F4]",
    "data-[state=active]:border-b-2",
    "data-[state=active]:border-blue-600 dark:data-[state=active]:border-[#B7FF3C]",
    "data-[state=active]:bg-transparent",
    "data-[state=active]:text-blue-600 dark:data-[state=active]:text-[#B7FF3C]",
    "data-[state=active]:shadow-none",
  ].join(" ");

  return (
    <Tabs defaultValue="overview" className="w-full">
      {/* ── Tabs Navigation Bar ───────────────────────────────── */}
      <div className="mb-6 overflow-x-auto border-b border-slate-200 dark:border-[#29352D] no-scrollbar">
        <TabsList className="h-11 w-full min-w-max justify-start gap-6 bg-transparent p-0">
          <TabsTrigger value="overview" className={tabClass}>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="size-4" />
              <span>Vehicle Overview</span>
            </div>
          </TabsTrigger>

          <TabsTrigger value="documents" className={tabClass}>
            <div className="flex items-center gap-2">
              <Folder className="size-4" />
              <span>Documents</span>
              <span className="rounded-full bg-slate-100 dark:bg-[#1D2920] px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-[#C1CBC3] border border-slate-200 dark:border-[#29352D]">
                {documents.length}
              </span>
            </div>
          </TabsTrigger>

          <TabsTrigger value="handover" className={tabClass}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              <span>Handover & Clearance</span>
            </div>
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ── 1. Overview Tab ───────────────────────────────────── */}
      <TabsContent value="overview" className="mt-0 space-y-6 focus-visible:outline-none">
        {/* ── Financial & Commercial KPI Strip ───────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Purchase Price */}
          <div className="card-premium p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4]">
              Acquisition Cost
            </span>
            <div className="mt-2">
              <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums">
                {formatKES(purchasePrice)}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-[#A1ADA4] mt-0.5">
                Acquired {fmt(vehicle.date_purchased || vehicle.created_at)}
              </p>
            </div>
          </div>

          {/* Reconditioning Invested */}
          <div className="card-premium p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4]">
                Pre-Sale Expenses
              </span>
              <span className="badge text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                {costs.length} items
              </span>
            </div>
            <div className="mt-2">
              <h4 className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {formatKES(totalExpenses)}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-[#A1ADA4] mt-0.5">
                Total repairs & reconditioning
              </p>
            </div>
          </div>

          {/* Total Cost Basis */}
          <div className="card-premium p-4 flex flex-col justify-between border-slate-300 dark:border-[#38483d]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4]">
              Total Cost Basis
            </span>
            <div className="mt-2">
              <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#B7FF3C] tabular-nums">
                {formatKES(totalCostBasis)}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-[#A1ADA4] mt-0.5">
                Net capital deployed in vehicle
              </p>
            </div>
          </div>

          {/* Target Selling Price & Margin */}
          <div className="card-premium p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4]">
                Target Price / Margin
              </span>
              {projectedMargin > 0 && (
                <span className="badge text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  +{marginPercentage}%
                </span>
              )}
            </div>
            <div className="mt-2">
              <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums">
                {targetSalePrice > 0 ? formatKES(targetSalePrice) : 'Unassigned'}
              </h4>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 tabular-nums">
                {targetSalePrice > 0 ? `Spread: ${formatKES(projectedMargin)}` : 'Set in inventory edit'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Layout: Media + Details & Sidebar ────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.85fr)]">
          {/* Main Left Column */}
          <div className="min-w-0 space-y-6">
            {/* 1. Vehicle Media Showcase */}
            <section className="card-premium overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#29352D] px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-[#18221A] text-blue-600 dark:text-[#B7FF3C]">
                    <Car className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4]">
                      Vehicle Showcase
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-[#A1ADA4]">
                      {images.length > 0 ? `${images.length} showroom photos available` : 'No photos uploaded'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      vehicle.is_published
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                        : "bg-slate-100 dark:bg-[#1D2920] text-slate-500 dark:text-[#A1ADA4]"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        vehicle.is_published ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {vehicle.is_published ? "Website Published" : "Website Hidden"}
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {images.length > 0 ? (
                  <div className="space-y-3">
                    {/* Primary Hero Image View */}
                    <div className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-[#29352D] bg-slate-950 aspect-[16/10] sm:aspect-[16/9] max-h-[420px] flex items-center justify-center">
                      <img
                        src={images[activeImageIndex]}
                        alt={`${vehicle.make_model} view ${activeImageIndex + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                      />

                      {/* Photo indicator badge */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/65 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                        <span>Photo {activeImageIndex + 1} of {images.length}</span>
                      </div>

                      {/* Expand / Lightbox Trigger */}
                      <button
                        type="button"
                        onClick={() => setIsLightboxOpen(true)}
                        className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/65 hover:bg-black/85 text-white px-2.5 py-1 text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer"
                        title="Click to view full-resolution photo"
                      >
                        <Maximize2 className="size-3.5" />
                        <span className="hidden sm:inline">Fullscreen</span>
                      </button>

                      {/* Prev / Next controls on Hero Image */}
                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
                            }
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/55 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            aria-label="Previous photo"
                          >
                            <ChevronLeft className="size-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveImageIndex((prev) => (prev + 1) % images.length)
                            }
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/55 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            aria-label="Next photo"
                          >
                            <ChevronRight className="size-5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Thumbnail Strip */}
                    {images.length > 1 && (
                      <div className="flex gap-2.5 overflow-x-auto pb-1.5 no-scrollbar">
                        {images.map((img, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setActiveImageIndex(i)}
                            className={cn(
                              "relative h-16 w-24 sm:h-20 sm:w-28 shrink-0 overflow-hidden rounded-xl border transition-all cursor-pointer",
                              activeImageIndex === i
                                ? "ring-2 ring-blue-600 dark:ring-[#B7FF3C] border-transparent scale-[1.02]"
                                : "border-slate-200 dark:border-[#29352D] opacity-70 hover:opacity-100"
                            )}
                          >
                            <img
                              src={img}
                              alt={`Thumbnail ${i + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[9px] font-bold text-white">
                              {i + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-[#29352D] bg-slate-50/50 dark:bg-[#18221A] text-center">
                    <div className="size-12 rounded-2xl bg-slate-100 dark:bg-[#151D17] flex items-center justify-center text-slate-400 dark:text-slate-600 mb-3">
                      <Car className="size-6" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-[#F4F7F4]">
                      No vehicle photos uploaded
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-[#A1ADA4] max-w-sm mt-1">
                      Upload high-resolution vehicle photos in the vehicle edit page to showcase on inventory listings and client sales documents.
                    </p>
                    <Link
                      href={`/vehicles/${vehicle.id}/edit`}
                      className="btn-secondary h-8 px-3 text-xs mt-4 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Upload Photos</span>
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* 2. Specifications & Technical Details */}
            <section className="card-premium p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#29352D] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                    <Settings2 className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4]">
                      Technical Specifications & Identification
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-[#A1ADA4]">
                      Registration, chassis, mechanical, and factory build attributes
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {/* Registration No */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] block">
                    Registration No
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-[#F4F7F4] mt-0.5 block truncate">
                    {vehicle.registration_no}
                  </span>
                </div>

                {/* Make / Model */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] block">
                    Make & Model
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-[#F4F7F4] mt-0.5 block truncate">
                    {vehicle.make_model}
                  </span>
                </div>

                {/* Year of Manufacture */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] block">
                    Year of Manufacture
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4] mt-0.5 block">
                    {vehicle.year || "N/A"}
                  </span>
                </div>

                {/* Body Type */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] block">
                    Body Type
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4] mt-0.5 block truncate">
                    {vehicle.type || "Saloon"}
                  </span>
                </div>

                {/* Engine Capacity */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] block">
                    Engine Displacement
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4] mt-0.5 block truncate">
                    {vehicle.engine_capacity || "—"}
                  </span>
                </div>

                {/* Transmission */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] block">
                    Transmission
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4] mt-0.5 block truncate">
                    {vehicle.transmission || "Automatic"}
                  </span>
                </div>

                {/* Fuel Type */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] block">
                    Fuel Type
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4] mt-0.5 block truncate">
                    {vehicle.fuel_type || "Petrol"}
                  </span>
                </div>

                {/* Mileage */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] block">
                    Odometer Mileage
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4] mt-0.5 block truncate">
                    {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : "—"}
                  </span>
                </div>

                {/* Exterior Color */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] block">
                    Color
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4] mt-0.5 block truncate">
                    {vehicle.color || "Factory"}
                  </span>
                </div>

                {/* Vehicle Condition */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] block">
                    Condition
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4] mt-0.5 block truncate">
                    {vehicle.condition || "Clean / Excellent"}
                  </span>
                </div>

                {/* Chassis / VIN */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D] sm:col-span-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] block">
                    Chassis / VIN Number
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-800 dark:text-[#C1CBC3] mt-0.5 block truncate select-all">
                    {vehicle.chassis_no || "Unrecorded on logbook"}
                  </span>
                </div>

                {/* Engine No */}
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D] sm:col-span-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4] block">
                    Engine Number
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-800 dark:text-[#C1CBC3] mt-0.5 block truncate select-all">
                    {vehicle.engine_no || "Unrecorded on logbook"}
                  </span>
                </div>
              </div>
            </section>

            {/* 3. Description & Features */}
            <section className="card-premium p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#29352D] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4]">
                      Vehicle Description & Installed Features
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-[#A1ADA4]">
                      Condition notes, marketing copy, and accessory checklist
                    </p>
                  </div>
                </div>

                {vehicle.is_new_arrival && (
                  <span className="rounded-full bg-orange-50 dark:bg-orange-950/40 px-2.5 py-0.5 text-[11px] font-bold text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/40">
                    New Arrival
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs sm:text-[13px] leading-relaxed text-slate-600 dark:text-[#C1CBC3] whitespace-pre-line">
                  {vehicle.description && vehicle.description.trim() !== ""
                    ? vehicle.description
                    : `Excellent condition ${vehicle.make_model} finished in ${
                        vehicle.color || 'factory color'
                      }. This ${vehicle.type || 'vehicle'} features ${
                        vehicle.transmission?.toLowerCase() || 'automatic'
                      } transmission paired with a ${
                        vehicle.engine_capacity || 'reliable'
                      } engine. Perfect for both city driving and long-distance travel.`}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-[#29352D]">
                <span className="text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] block mb-2">
                  Installed Accessories & Features:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {vehicle.features && vehicle.features.length > 0 ? (
                    vehicle.features.map((feature, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/30 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
                      >
                        {feature}
                      </span>
                    ))
                  ) : (
                    ['Air Conditioning', 'Power Steering', 'Alloy Wheels', 'Power Windows'].map((feature, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-slate-200 dark:border-[#29352D] bg-slate-50 dark:bg-[#18221A] px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-[#C1CBC3]"
                      >
                        {feature}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* 4. Pre-Sale Expenses & Reconditioning Ledger */}
            <section className="card-premium p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-[#29352D] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-[#18221A] text-blue-600 dark:text-[#B7FF3C]">
                    <Wrench className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4]">
                      Pre-Sale Reconditioning Expenses
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-[#A1ADA4]">
                      Mechanical, detailing, tracking, and logbook costs incurred prior to sale
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Total Expenses</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-[#B7FF3C] tabular-nums">
                      {formatKES(totalExpenses)}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsAddCostOpen(true)}
                    className="btn-primary h-9 px-3 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Expense</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {costs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-[#29352D] bg-slate-50/50 dark:bg-[#18221A] px-4 py-8 text-center">
                    <Wrench className="mx-auto mb-2 size-6 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium text-slate-600 dark:text-[#C1CBC3]">
                      No pre-sale reconditioning costs logged yet.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click &quot;Add Expense&quot; to log mechanical repairs, buffing, GPS tracking, or inspection fees.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-[#29352D] border border-slate-200 dark:border-[#29352D] rounded-xl overflow-hidden bg-white dark:bg-[#151D17]">
                    {costs.map((cost) => (
                      <div
                        key={cost.id}
                        className="p-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-slate-50 dark:hover:bg-[#1D2920]/60"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="badge text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-[#1D2920] dark:text-[#C1CBC3] border border-slate-200 dark:border-[#29352D]">
                              {COST_CATEGORY_LABELS[cost.cost_type] || cost.cost_type.replace('_', ' ').toUpperCase()}
                            </span>
                            <p className="truncate text-xs font-semibold text-slate-900 dark:text-[#F4F7F4]">
                              {cost.description}
                            </p>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-[#A1ADA4] flex items-center gap-1.5">
                            {cost.vendor_name && (
                              <>
                                <Building2 className="size-3 opacity-60" />
                                <span className="font-medium text-slate-700 dark:text-[#C1CBC3]">{cost.vendor_name}</span>
                                <span>•</span>
                              </>
                            )}
                            <Clock className="size-3 opacity-60" />
                            <span>{fmt(cost.incurred_date)}</span>
                          </p>
                        </div>

                        <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums">
                          {formatKES(Number(cost.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Right Column */}
          <aside className="min-w-0 space-y-6">
            {/* 1. Acquisition & Seller Contract Card */}
            <section className="card-premium p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#29352D] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4]">
                      Acquisition &amp; Seller
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-[#A1ADA4]">
                      Vehicle purchase agreement origin
                    </p>
                  </div>
                </div>
                <Badge className={cn("badge capitalize text-[10px]", statusBadgeClass)}>
                  Agreement
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-[#A1ADA4]">Seller Name:</span>
                  <span className="font-semibold text-slate-900 dark:text-[#F4F7F4] text-right truncate max-w-[160px]">
                    {(vehicle as any).seller_name || "Record on Contract"}
                  </span>
                </div>

                {Boolean((vehicle as any).seller_phone || (vehicle as any).seller_id_number) && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-[#A1ADA4]">Seller Phone / ID:</span>
                    <span className="font-mono text-slate-700 dark:text-[#C1CBC3] text-right text-[11px]">
                      {(vehicle as any).seller_phone || (vehicle as any).seller_id_number}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-[#A1ADA4]">Purchase Price:</span>
                  <span className="font-bold text-slate-900 dark:text-[#B7FF3C] text-right tabular-nums">
                    {formatKES(vehicle.purchase_price)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-[#A1ADA4]">Date Purchased:</span>
                  <span className="text-slate-700 dark:text-[#C1CBC3] text-right">
                    {fmt(vehicle.date_purchased || vehicle.created_at)}
                  </span>
                </div>
              </div>

              <Link
                href={`/vehicles/${vehicle.id}/purchase-contract`}
                className="btn-secondary w-full h-10 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
              >
                <FileText className="size-3.5" />
                <span>View Purchase Agreement</span>
                <ArrowUpRight className="size-3.5 opacity-60" />
              </Link>
            </section>

            {/* 2. Commercial Yard & Website Status */}
            <section className="card-premium p-5 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-[#29352D] pb-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-[#18221A] text-blue-600 dark:text-[#B7FF3C]">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4]">
                    Yard & Listing Status
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#A1ADA4]">
                    Dealership inventory and public visibility
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-slate-600 dark:text-[#A1ADA4]">Inventory Status</span>
                  <Badge className={cn("badge capitalize text-[10px]", statusBadgeClass)}>
                    {vehicle.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-slate-600 dark:text-[#A1ADA4]">Customer Website</span>
                  <span
                    className={`font-semibold ${
                      vehicle.is_published ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-[#A1ADA4]"
                    }`}
                  >
                    {vehicle.is_published ? "Published & Live" : "Hidden from Public"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-slate-600 dark:text-[#A1ADA4]">New Arrival Tag</span>
                  <span className="font-semibold text-slate-800 dark:text-[#F4F7F4]">
                    {vehicle.is_new_arrival ? "Active on Website" : "No"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-[#18221A] border border-slate-100 dark:border-[#29352D]">
                  <span className="text-slate-600 dark:text-[#A1ADA4]">Vehicle Condition</span>
                  <span className="font-semibold text-slate-800 dark:text-[#F4F7F4]">
                    {vehicle.condition || "Clean"}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <Link
                  href={`/vehicles/${vehicle.id}/edit`}
                  className="btn-primary w-full h-10 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Settings2 className="size-3.5" />
                  <span>Update Vehicle Details</span>
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </TabsContent>

      {/* ── 2. Documents Tab ──────────────────────────────────── */}
      <TabsContent value="documents" className="mt-0 focus-visible:outline-none">
        <div className="card-premium p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-[#29352D] pb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F4F7F4]">
                Vehicle Document Archive
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-[#A1ADA4]">
                Secure cloud storage for logbooks, NTSA transfer forms, inspection reports, and customs documentation
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-[160px]">
                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                  <SelectTrigger className="input-class h-10 w-full text-xs !px-3.5">
                    <SelectValue placeholder="Document Type..." />
                  </SelectTrigger>
                  <SelectContent className="z-50 min-w-[180px]">
                    <SelectItem value="LOGBOOK">Logbook (Original/Copy)</SelectItem>
                    <SelectItem value="INSPECTION">Inspection Certificate</SelectItem>
                    <SelectItem value="IMPORT">Import / Port Papers</SelectItem>
                    <SelectItem value="OTHER">Other Documentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  disabled={isUploading}
                />
                <button
                  type="button"
                  className="btn-primary h-10 px-4 text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="size-3.5" />
                      <span>Upload File</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {documents.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 dark:border-[#29352D] bg-slate-50/50 dark:bg-[#18221A] px-5 py-12 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#151D17] text-slate-400 dark:text-[#A1ADA4]">
                  <Folder className="size-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-[#C1CBC3]">
                  No documents attached to this vehicle yet
                </h4>
                <p className="mt-1 text-xs text-slate-400 dark:text-[#A1ADA4] max-w-sm mx-auto">
                  Select a document category above and upload PDF scans or images of logbooks, police clearance, or inspection documents.
                </p>
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3.5 rounded-xl border border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#151D17] p-4 transition-all hover:border-slate-300 dark:hover:border-[#38483d] hover:shadow-xs group"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-[#1D2920] text-blue-600 dark:text-[#B7FF3C] border border-blue-100 dark:border-[#29352D]">
                    <File className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-xs font-bold text-slate-900 dark:text-[#F4F7F4] hover:text-blue-600 dark:hover:text-[#B7FF3C] transition-colors"
                      title={doc.documentName || doc.type}
                    >
                      {doc.documentName || doc.type}
                    </a>

                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-[#A1ADA4]">
                      <span className="badge text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#18221A] text-slate-600 dark:text-[#C1CBC3]">
                        {doc.type}
                      </span>
                      <span>•</span>
                      <span>{fmt(doc.createdAt)}</span>
                    </div>

                    <div className="mt-3">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary h-7 px-2.5 text-[11px] inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="size-3" />
                        <span>Open Document</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </TabsContent>

      {/* ── 3. Handover & Clearance Tab ───────────────────────── */}
      <TabsContent value="handover" className="mt-0 focus-visible:outline-none">
        <HandoverSummaryTab
          vehicle={vehicle}
          onOpenModal={() => setIsHandoverModalOpen(true)}
        />
      </TabsContent>

      {/* ── Fullscreen Lightbox Modal ─────────────────────────── */}
      {isLightboxOpen && images.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
            {/* Header / Close button */}
            <div className="w-full flex items-center justify-between text-white pb-3">
              <span className="text-sm font-semibold">
                {vehicle.registration_no} • {vehicle.make_model} (Photo {activeImageIndex + 1} of {images.length})
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close fullscreen preview"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* High-res Image */}
            <div className="relative w-full max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black">
              <img
                src={images[activeImageIndex]}
                alt={`${vehicle.make_model} fullscreen view`}
                className="max-h-[78vh] w-auto max-w-full object-contain rounded-xl"
              />

              {/* Prev / Next controls */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev + 1) % images.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Expense Modal (Preserved 100%) ─────────────────── */}
      <CustomModal
        isOpen={isAddCostOpen}
        onClose={() => setIsAddCostOpen(false)}
        title="Add Pre-Sale Expense"
        width={480}
      >
        <form onSubmit={handleAddCost} className="space-y-5">
          <div className="rounded-lg border border-slate-200 dark:border-[#29352D] bg-slate-50 dark:bg-[#18221A] px-3.5 py-3 text-xs text-slate-500 dark:text-[#A1ADA4]">
            You are adding an expense for:
            <strong className="ml-1 font-mono font-semibold text-slate-900 dark:text-[#F4F7F4]">
              {vehicle.registration_no}
            </strong>
            <span className="ml-1 text-slate-600 dark:text-[#C1CBC3]">
              ({vehicle.make_model})
            </span>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-[#C1CBC3]">
              Cost Category
            </label>
            <Select
              value={costType}
              onValueChange={(val) => setCostType(val as VehicleCostType)}
            >
              <SelectTrigger className="input-class h-10 w-full">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent className="z-50 min-w-[240px]">
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
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-[#C1CBC3]">
              Expense Amount (KES) *
            </label>
            <input
              type="number"
              required
              value={costAmount || ''}
              onChange={(e) => setCostAmount(Number(e.target.value))}
              placeholder="e.g. 15000"
              className="input-class h-10 w-full font-semibold"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-[#C1CBC3]">
              Description / Item Detail *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Front suspension bushing & new battery"
              value={costDescription}
              onChange={(e) => setCostDescription(e.target.value)}
              className="input-class h-10 w-full"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-[#C1CBC3]">
              Garage / Vendor Name
            </label>
            <input
              type="text"
              placeholder="e.g. QuickFit Auto Kisumu"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value.toUpperCase())}
              className="input-class h-10 w-full uppercase"
            />
          </div>

          <div className="flex justify-end gap-2.5 border-t border-slate-100 dark:border-[#29352D] pt-5">
            <button
              type="button"
              onClick={() => setIsAddCostOpen(false)}
              className="btn-secondary h-10 px-5 text-xs cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isCostSaving}
              className="btn-primary h-10 px-5 text-xs disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isCostSaving && (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              )}
              Save Expense
            </button>
          </div>
        </form>
      </CustomModal>

      {/* Vehicle Handover & Clearance Modal (Preserved 100%) */}
      <VehicleHandoverModal
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
        vehicle={vehicle}
      />
    </Tabs>
  );
}
