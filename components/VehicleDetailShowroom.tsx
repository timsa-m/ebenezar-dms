'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { Vehicle } from '@/src/types/database.types';
import { formatKES } from '@/src/lib/financial-engine';
import FinanceCalculator from '@/components/FinanceCalculator';
import {
  Car,
  Fuel,
  Gauge,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Camera,
  Layers,
  Sparkles,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface VehicleDetailShowroomProps {
  vehicle: Vehicle;
}

export default function VehicleDetailShowroom({ vehicle }: VehicleDetailShowroomProps) {
  const salePrice = Number(vehicle.sale_price) || 0;
  const imageList = (vehicle.images && vehicle.images.length > 0)
    ? vehicle.images
    : ((vehicle as any).pictures && (vehicle as any).pictures.length > 0)
    ? (vehicle as any).pictures
    : [];

  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  const nextPhoto = () => {
    if (imageList.length > 1) {
      setActivePhotoIdx((prev) => (prev + 1) % imageList.length);
    }
  };

  const prevPhoto = () => {
    if (imageList.length > 1) {
      setActivePhotoIdx((prev) => (prev - 1 + imageList.length) % imageList.length);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 hover:text-blue-900 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Showroom
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-bold">{vehicle.make_model}</span>
      </div>

      {/* Top Title & Registration Hero Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="px-3 py-1 bg-slate-950 text-white font-mono font-black rounded-xl text-xs tracking-wider uppercase shadow-xs">
              {vehicle.registration_no}
            </span>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-700" />
              Physically In Stock at Kisumu Yard
            </span>
            {vehicle.year && (
              <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">
                {vehicle.year} Model
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            {vehicle.make_model}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1">
            <MapPin size={14} className="text-blue-600" />
            Inspected &amp; Guaranteed by Ebenezar Enterprises Car Bazaar (Kisumu, Kenya)
          </p>
        </div>

        <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-md border border-slate-800 text-left md:text-right">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
            Outright Cash Price
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white">
            {formatKES(salePrice)}
          </span>
        </div>
      </div>

      {/* Main Content Layout: Gallery & Specs (7 cols) + Finance Calculator (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Photo Gallery & Vehicle Specifications */}
        <div className="lg:col-span-7 space-y-8">
          {/* Photo Gallery Visualizer */}
          <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-md border border-slate-800 relative flex flex-col">
            {imageList.length > 0 ? (
              <div className="relative h-80 sm:h-96 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                <Image
                  src={imageList[activePhotoIdx]}
                  alt={`${vehicle.make_model} - Photo ${activePhotoIdx + 1}`}
                  fill
                  className="object-cover transition-all duration-300"
                  priority
                />
                {imageList.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevPhoto}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-transform hover:scale-105"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={nextPhoto}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-transform hover:scale-105"
                      aria-label="Next photo"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <div className="absolute bottom-3 right-4 px-2.5 py-1 bg-black/70 text-white text-[11px] font-bold rounded-lg backdrop-blur">
                      {activePhotoIdx + 1} / {imageList.length}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="h-80 sm:h-96 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center text-white p-6 relative">
                <Car size={90} className="text-slate-600 mb-3" />
                <span className="text-slate-300 font-bold text-base">
                  Ebenezar Certified Yard Showcase
                </span>
                <span className="text-slate-500 text-xs mt-1">
                  High-resolution photo session being uploaded for {vehicle.registration_no}
                </span>
                <div className="absolute bottom-4 left-6 right-6 flex justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <span>Registration: {vehicle.registration_no}</span>
                  <span className="text-emerald-400 font-bold">100% Inspected &amp; Yard Verified</span>
                </div>
              </div>
            )}

            {/* Thumbnail Strip */}
            {imageList.length > 1 && (
              <div className="p-3 bg-slate-950 flex gap-2 overflow-x-auto border-t border-slate-800">
                {imageList.map((url: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActivePhotoIdx(i)}
                    className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      activePhotoIdx === i
                        ? 'border-blue-500 scale-105 opacity-100'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image src={url} alt="thumbnail" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Specifications Grid */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Car size={20} className="text-blue-900" />
              Vehicle Specifications &amp; Overview
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1 font-medium">Year of Mfr</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {vehicle.year || '—'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1 font-medium">Mileage</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : 'Certified'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1 font-medium">Transmission</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {vehicle.transmission || 'Automatic'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1 font-medium">Fuel Type</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {vehicle.fuel_type || 'Petrol'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1 font-medium">Body Style</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {vehicle.type || 'SUV / Saloon'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1 font-medium">Color</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {vehicle.color || 'Standard'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1 font-medium">Engine Size</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {vehicle.engine_capacity || 'Certified CC'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1 font-medium">Chassis No</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono break-all">
                  {vehicle.chassis_no || '—'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block mb-1 font-medium">Engine No</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono break-all">
                  {vehicle.engine_no || '—'}
                </span>
              </div>
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                <span className="text-emerald-700 block mb-1 font-medium">Hire-Purchase</span>
                <span className="text-sm font-extrabold text-emerald-900">
                  Pre-Approved
                </span>
              </div>
            </div>

            {/* Features list if available */}
            {vehicle.features && vehicle.features.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2">Key Features</span>
                <div className="flex flex-wrap gap-2">
                  {vehicle.features.map((feat, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ebenezar Yard & Asset Guarantee Card */}
          <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-md relative overflow-hidden">
            <div className="relative z-10 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                <ShieldCheck size={18} />
                Ebenezar Enterprises Car Bazaar Dealership Guarantee
              </div>
              <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
                This vehicle is physically inspected and cleared for hire-purchase financing. All logbooks and transfer documentation are managed transparently at our Kisumu Car Bazaar yard. GPS tracking hardware and routine mechanical prep are installed prior to release.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-[11px] font-bold text-slate-300">
                <span>✓ Same-Day ID Approval</span>
                <span>✓ Minimum 20% Deposit</span>
                <span>✓ Direct M-Pesa Repayments</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Embedded Interactive Finance Calculator */}
        <div className="lg:col-span-5 sticky top-24">
          <FinanceCalculator
            initialSalePrice={salePrice}
            vehicleId={vehicle.id}
            vehicleTitle={vehicle.make_model}
            vehicleRegistration={vehicle.registration_no}
            showLeadForm={true}
          />
        </div>
      </div>
    </div>
  );
}
