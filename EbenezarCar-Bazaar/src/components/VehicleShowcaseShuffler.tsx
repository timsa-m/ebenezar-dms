import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import {
  Shuffle,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ArrowUpRight,
  MessageSquare,
  Heart,
  Scale,
  MapPin,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { VehicleImageWithFallback } from './VehicleImageWithFallback';

interface VehicleShowcaseShufflerProps {
  vehicles: Vehicle[];
  currency: 'USD' | 'KES';
  favoriteIds: string[];
  compareIds: string[];
  onToggleFavorite: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onOpenDetails: (vehicle: Vehicle) => void;
  onInquire: (vehicle: Vehicle) => void;
}

export const VehicleShowcaseShuffler: React.FC<VehicleShowcaseShufflerProps> = ({
  vehicles,
  currency,
  favoriteIds,
  compareIds,
  onToggleFavorite,
  onToggleCompare,
  onOpenDetails,
  onInquire,
}) => {
  if (!vehicles || vehicles.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isShufflingAnim, setIsShufflingAnim] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'suv' | 'tractor' | 'commercial'>('all');

  // Filter pool based on selected category
  const pool = React.useMemo(() => {
    if (selectedCategory === 'suv') {
      const suvs = vehicles.filter((v) => v.bodyType === 'SUV');
      return suvs.length > 0 ? suvs : vehicles;
    }
    if (selectedCategory === 'tractor') {
      const tractors = vehicles.filter((v) => v.bodyType === 'Tractor');
      return tractors.length > 0 ? tractors : vehicles;
    }
    if (selectedCategory === 'commercial') {
      const comm = vehicles.filter((v) => v.bodyType === 'Pickup' || v.bodyType === 'Van / MPV');
      return comm.length > 0 ? comm : vehicles;
    }
    return vehicles;
  }, [vehicles, selectedCategory]);

  const safeIndex = currentIndex % (pool.length || 1);
  const currentVehicle = pool[safeIndex] || vehicles[0];

  // Auto-shuffle interval
  useEffect(() => {
    if (!isAutoPlaying || pool.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % pool.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isAutoPlaying, pool.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % pool.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? pool.length - 1 : prev - 1));
  };

  const handleManualShuffle = () => {
    setIsShufflingAnim(true);
    setTimeout(() => {
      let nextIdx;
      if (pool.length > 1) {
        do {
          nextIdx = Math.floor(Math.random() * pool.length);
        } while (nextIdx === safeIndex);
      } else {
        nextIdx = 0;
      }
      setCurrentIndex(nextIdx);
      setIsShufflingAnim(false);
    }, 180);
  };

  const formatPrice = (v: Vehicle) => {
    if (v.price === 0) return 'Ask us';
    if (currency === 'KES') {
      return v.priceFormatted || `KES ${(v.price * 130).toLocaleString()}`;
    }
    return `$${v.price.toLocaleString()}`;
  };

  const isFav = favoriteIds.includes(currentVehicle.id);
  const isComp = compareIds.includes(currentVehicle.id);

  return (
    <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 transition-all duration-300">
      {/* Clean Top Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        {/* Left: Section Label & Stock Badges */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Featured Spotlight</span>
          </div>

          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            STOCK #{currentVehicle.stockId}
          </span>

          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentVehicle.location} Yard</span>
          </span>
        </div>

        {/* Right: Minimal Category Filter & Shuffler Controls */}
        <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
          {/* Category Tabs */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setCurrentIndex(0);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setSelectedCategory('suv');
                setCurrentIndex(0);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedCategory === 'suv'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              SUVs
            </button>
            <button
              onClick={() => {
                setSelectedCategory('tractor');
                setCurrentIndex(0);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedCategory === 'tractor'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tractors
            </button>
            <button
              onClick={() => {
                setSelectedCategory('commercial');
                setCurrentIndex(0);
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                selectedCategory === 'commercial'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Commercial
            </button>
          </div>

          {/* Shuffle Button */}
          <button
            onClick={handleManualShuffle}
            title="Randomize vehicle"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors active:scale-95"
          >
            <Shuffle className={`w-3.5 h-3.5 ${isShufflingAnim ? 'animate-spin' : ''}`} />
            <span>Shuffle</span>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={() => setIsAutoPlaying((prev) => !prev)}
            title={isAutoPlaying ? 'Pause rotation' : 'Resume auto-shuffle'}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 transition-colors"
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Prev/Next arrows & counter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5 border border-slate-200/80">
            <button
              onClick={handlePrev}
              title="Previous vehicle"
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-600 px-1">
              {safeIndex + 1}/{pool.length}
            </span>
            <button
              onClick={handleNext}
              title="Next vehicle"
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Single Spotlight Body: Left Image, Right Specs */}
      <div
        className={`pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center transition-all duration-200 ${
          isShufflingAnim ? 'opacity-30 scale-[0.99]' : 'opacity-100 scale-100'
        }`}
      >
        {/* Left Column: Clean Image Box (7 cols) */}
        <div className="lg:col-span-7">
          <div
            onClick={() => onOpenDetails(currentVehicle)}
            className="group relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 cursor-pointer shadow-xs"
          >
            <VehicleImageWithFallback
              src={currentVehicle.primaryImage}
              alt={`${currentVehicle.make} ${currentVehicle.model}`}
              make={currentVehicle.make}
              model={currentVehicle.model}
              bodyType={currentVehicle.bodyType}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
            />

            {/* Badges on Image */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-emerald-800 font-bold text-xs shadow-xs border border-white/40">
                🟢 {currentVehicle.status}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-white font-medium text-xs shadow-xs">
                {currentVehicle.bodyType}
              </span>
            </div>

            {/* Wishlist & Compare Icons on Image */}
            <div
              className="absolute top-3 right-3 flex items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => onToggleCompare(currentVehicle.id)}
                className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-colors shadow-xs ${
                  isComp
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/90 text-slate-700 hover:bg-white hover:text-slate-900'
                }`}
                title={isComp ? 'Remove from comparison' : 'Compare side by side'}
              >
                <Scale className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggleFavorite(currentVehicle.id)}
                className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-colors shadow-xs ${
                  isFav
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/90 text-slate-700 hover:bg-white hover:text-rose-500'
                }`}
                title={isFav ? 'Remove from saved' : 'Save to favorites'}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
              </button>
            </div>

            {/* Bottom Gradient Overlay for Inspection prompt */}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-900/60 to-transparent flex items-center justify-between text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Verified Inspection Report Available
              </span>
              <span className="text-xs font-bold flex items-center gap-1">
                Click to inspect <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Minimal Specs & Actions (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {/* Header & Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {currentVehicle.make}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Year {currentVehicle.year}
              </span>
            </div>

            <h3
              onClick={() => onOpenDetails(currentVehicle)}
              className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight cursor-pointer hover:text-emerald-700 transition-colors"
            >
              {currentVehicle.model} {currentVehicle.variant ? `• ${currentVehicle.variant}` : ''}
            </h3>

            {/* Price Presentation */}
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                {formatPrice(currentVehicle)}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {currency === 'USD' ? 'USD (Duties & Port Cleared)' : 'KES Inclusive'}
              </span>
            </div>
          </div>

          {/* Clean 4-Item Spec Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3 border-y border-slate-100">
            <div className="bg-slate-50/80 rounded-xl p-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Mileage</span>
              <span className="text-xs font-bold text-slate-800">
                {currentVehicle.mileage === 0 ? '0 km (Brand New)' : `${currentVehicle.mileage.toLocaleString()} km`}
              </span>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Engine</span>
              <span className="text-xs font-bold text-slate-800 truncate block">
                {currentVehicle.engineCapacity}
              </span>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Transmission</span>
              <span className="text-xs font-bold text-slate-800 truncate block">
                {currentVehicle.transmission}
              </span>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Fuel / Drive</span>
              <span className="text-xs font-bold text-slate-800 truncate block">
                {currentVehicle.fuel} • {currentVehicle.drive}
              </span>
            </div>
          </div>

          {/* Quick Key Highlights */}
          {currentVehicle.features && currentVehicle.features.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentVehicle.features.slice(0, 3).map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{f}</span>
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => onInquire(currentVehicle)}
              className="py-2.5 px-3 bg-[#1fa357] hover:bg-[#188c49] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-white" />
              <span>Inquire on WhatsApp</span>
            </button>

            <button
              onClick={() => onOpenDetails(currentVehicle)}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Inspect Details</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Minimal Rotation Strip */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs text-slate-400">
        {/* Dot Strip */}
        <div className="flex items-center gap-1.5">
          {pool.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === safeIndex
                  ? 'w-6 bg-emerald-600'
                  : 'w-2 bg-slate-200 hover:bg-slate-300'
              }`}
              title={`Switch to vehicle ${i + 1}`}
            />
          ))}
        </div>

        <div className="text-[11px] font-medium text-slate-400 flex items-center gap-2">
          <span>Auto-shuffles every 5s</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>
    </section>
  );
};
