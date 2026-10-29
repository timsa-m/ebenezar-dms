import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import { VehicleImageWithFallback } from './VehicleImageWithFallback';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Settings,
  Star,
  Fuel,
  Compass,
  CheckCircle,
  MessageSquare,
  Phone,
  Share2,
  Heart,
  Calculator,
  ShieldCheck,
  MapPin,
  Layers,
} from 'lucide-react';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  currency: 'USD' | 'KES';
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onOpenInquiry: (vehicle: Vehicle) => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  currency,
  isFavorite,
  onClose,
  onToggleFavorite,
  onOpenInquiry,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showLoanCalc, setShowLoanCalc] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downPaymentPct, setDownPaymentPct] = useState(25);
  const [loanPeriodMonths, setLoanPeriodMonths] = useState(36);

  useEffect(() => {
    if (!vehicle) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [vehicle, onClose]);

  useEffect(() => {
    setActiveImageIndex(0);
    setShowLoanCalc(false);
  }, [vehicle?.id]);

  if (!vehicle) return null;

  // Financial calculator state
  const basePrice = vehicle.price || 20000;
  const interestRateAnnual = 0.12; // 12% APR

  const downPayment = Math.round((basePrice * downPaymentPct) / 100);
  const loanPrincipal = basePrice - downPayment;
  const monthlyInterestRate = interestRateAnnual / 12;
  const estimatedMonthlyPayment = Math.round(
    (loanPrincipal *
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanPeriodMonths))) /
      (Math.pow(1 + monthlyInterestRate, loanPeriodMonths) - 1)
  );

  const images = vehicle.gallery && vehicle.gallery.length > 0 ? vehicle.gallery : [vehicle.primaryImage];

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const displayPrice = () => {
    if (vehicle.price === 0) return 'Ask us';
    if (currency === 'KES') {
      return vehicle.priceFormatted || `KES ${(vehicle.price * 130).toLocaleString()}`;
    }
    return `$${vehicle.price.toLocaleString()}`;
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          {/* HEADER SECTION (Matching Screenshot 16 Exactly) */}
          <div className="bg-white pb-4 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {/* Badges */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full uppercase tracking-wider">
                    {vehicle.status}
                  </span>
                  <span className="inline-flex items-center text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                    {vehicle.location}
                  </span>
                </div>

                {/* Big Title */}
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 uppercase tracking-tight">
                  {vehicle.make} {vehicle.model} {vehicle.year} {vehicle.engineCapacity}{' '}
                  {vehicle.fuel}
                </h1>

                {/* Subtitle */}
                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wide">
                  Stock ID: {vehicle.stockId} &nbsp;•&nbsp; {vehicle.bodyType} &nbsp;•&nbsp;{' '}
                  {vehicle.color}
                </p>
              </div>

              {/* Top Right Inquiry CTA */}
              <div className="flex flex-col items-start md:items-end">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleFavorite(vehicle.id)}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-500 hover:bg-slate-50 transition-colors"
                    title={isFavorite ? 'Saved to favorites' : 'Save to favorites'}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  <button
                    onClick={handleShare}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    title="Share vehicle link"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => onOpenInquiry(vehicle)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#1fa357] hover:bg-[#188c49] rounded-xl shadow-sm transition-all"
                  >
                    <MessageSquare className="w-4 h-4 fill-white" />
                    <span>Send Inquiry</span>
                  </button>
                </div>

                {/* Contact subtext */}
                <div className="text-[12px] font-semibold text-slate-500 mt-1.5 flex items-center gap-1">
                  <span>{vehicle.location}</span>
                  <span>•</span>
                  <a
                    href={`tel:${vehicle.dealerPhone}`}
                    className="text-emerald-700 hover:underline"
                  >
                    {vehicle.dealerPhone}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID: Gallery Left, Overview Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: Image Gallery (Screenshot 16 style) */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="relative aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-sm">
                <VehicleImageWithFallback
                  src={images[activeImageIndex]}
                  alt={`${vehicle.make} ${vehicle.model} image ${activeImageIndex + 1}`}
                  make={vehicle.make}
                  model={vehicle.model}
                  bodyType={vehicle.bodyType}
                  className="w-full h-full object-cover"
                />

                {/* Top Right "Images" overlay badge */}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-slate-800 text-xs font-bold px-3 py-1 rounded-md shadow-sm">
                  Images {activeImageIndex + 1}/{images.length}
                </div>

                {/* Left/Right Round Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                        activeImageIndex === idx
                          ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <VehicleImageWithFallback
                        src={img}
                        alt="thumbnail"
                        className="w-full h-full object-cover"
                        make={vehicle.make}
                        model={vehicle.model}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Price Callout Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Listed Showroom Price
                  </span>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    {displayPrice()}
                  </div>
                </div>

                <button
                  onClick={() => setShowLoanCalc(!showLoanCalc)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors shadow-sm"
                >
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>{showLoanCalc ? 'Hide Financing' : 'Loan Calculator'}</span>
                </button>
              </div>

              {/* Interactive Financing Loan Calculator Drawer */}
              {showLoanCalc && (
                <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-emerald-600" />
                      Estimated Monthly Installment
                    </h3>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      12% APR
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        Down Payment: {downPaymentPct}% (${downPayment.toLocaleString()})
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        step="5"
                        value={downPaymentPct}
                        onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        Loan Tenure: {loanPeriodMonths} Months ({loanPeriodMonths / 12} Years)
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="60"
                        step="12"
                        value={loanPeriodMonths}
                        onChange={(e) => setLoanPeriodMonths(Number(e.target.value))}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-900 block">
                        Approximate Monthly Repayment
                      </span>
                      <span className="text-lg font-black text-emerald-800">
                        ${estimatedMonthlyPayment.toLocaleString()} / mo
                      </span>
                    </div>
                    <button
                      onClick={() => onOpenInquiry(vehicle)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors"
                    >
                      Apply Finance
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Vehicle Overview (Screenshot 16 exact 2-column cards) */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 mb-4 tracking-tight">
                  Vehicle overview
                </h2>

                {/* 2-Column Grid of Clean Overview Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* YEAR */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        YEAR
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {vehicle.year}
                      </span>
                    </div>
                  </div>

                  {/* MILEAGE */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        MILEAGE
                      </span>
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {vehicle.mileage === 0
                          ? '0 km'
                          : `${vehicle.mileage.toLocaleString()} km`}
                      </span>
                    </div>
                  </div>

                  {/* TRANSMISSION */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        TRANSMISSION
                      </span>
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {vehicle.transmission}
                      </span>
                    </div>
                  </div>

                  {/* FUEL */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                      <Fuel className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        FUEL
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {vehicle.fuel}
                      </span>
                    </div>
                  </div>

                  {/* DRIVE */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        DRIVE
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {vehicle.drive}
                      </span>
                    </div>
                  </div>

                  {/* ENGINE */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        ENGINE
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {vehicle.engineCapacity}
                      </span>
                    </div>
                  </div>

                  {/* LOCATION */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        LOCATION
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {vehicle.location}
                      </span>
                    </div>
                  </div>

                  {/* BODY TYPE */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        BODY TYPE
                      </span>
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {vehicle.bodyType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Spec Meta */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Exterior Color:</span>{' '}
                    <span className="font-semibold text-slate-800">{vehicle.color}</span>
                  </div>
                  {vehicle.interiorColor && (
                    <div>
                      <span className="text-slate-400">Interior:</span>{' '}
                      <span className="font-semibold text-slate-800">{vehicle.interiorColor}</span>
                    </div>
                  )}
                  {vehicle.chassisNo && (
                    <div className="col-span-2">
                      <span className="text-slate-400">Chassis/VIN:</span>{' '}
                      <span className="font-mono font-medium text-slate-800">{vehicle.chassisNo}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct WhatsApp Callout Action Box */}
              <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> Direct Dealer Communication
                  </div>
                  <h4 className="text-base font-bold">Have questions or want to view this unit?</h4>
                  <p className="text-xs text-emerald-50 mt-1">
                    Contact our {vehicle.location} branch directly via WhatsApp for video walk-arounds, logbook verification, and delivery terms.
                  </p>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => onOpenInquiry(vehicle)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-emerald-800 font-bold text-xs rounded-xl shadow-sm transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 fill-emerald-800" />
                    <span>WhatsApp Inquiry</span>
                  </button>
                  <a
                    href={`tel:${vehicle.dealerPhone}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700/60 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Showroom</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Description & Features Accordion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                Vehicle Description
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {vehicle.description}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">
                Key Features & Options
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {vehicle.features.map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
