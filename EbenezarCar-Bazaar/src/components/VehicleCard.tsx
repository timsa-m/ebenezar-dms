import React from 'react';
import { Vehicle } from '../types';
import { VehicleImageWithFallback } from './VehicleImageWithFallback';
import {
  Calendar,
  Gauge,
  Compass,
  Fuel,
  Heart,
  MessageSquare,
  ArrowUpRight,
  MapPin,
  CheckCircle2,
  Scale,
} from 'lucide-react';

interface VehicleCardProps {
  vehicle: Vehicle;
  currency: 'USD' | 'KES';
  isFavorite: boolean;
  isCompared: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onOpenDetails: (vehicle: Vehicle) => void;
  onInquire: (vehicle: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  currency,
  isFavorite,
  isCompared,
  onToggleFavorite,
  onToggleCompare,
  onOpenDetails,
  onInquire,
}) => {
  // Format price
  const displayPrice = () => {
    if (vehicle.price === 0) {
      return 'Ask us';
    }
    if (currency === 'KES') {
      return vehicle.priceFormatted || `KES ${(vehicle.price * 130).toLocaleString()}`;
    }
    return `$${vehicle.price.toLocaleString()}`;
  };

  const formattedMileage =
    vehicle.mileage === 0 ? '0 km' : `${vehicle.mileage.toLocaleString()} km`;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      {/* Top Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 cursor-pointer" onClick={() => onOpenDetails(vehicle)}>
        <VehicleImageWithFallback
          src={vehicle.primaryImage}
          alt={`${vehicle.make} ${vehicle.model}`}
          make={vehicle.make}
          model={vehicle.model}
          bodyType={vehicle.bodyType}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Floating Stock Badge (Top-Left) */}
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-md shadow-sm uppercase">
          STOCK {vehicle.stockId}
        </div>

        {/* Top-Right Action Controls (Wishlist & Compare) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare(vehicle.id);
            }}
            title={isCompared ? 'Remove from comparison' : 'Add to comparison'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isCompared
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white hover:text-emerald-700 shadow-sm'
            }`}
            aria-label="Compare vehicle"
          >
            <Scale className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(vehicle.id);
            }}
            title={isFavorite ? 'Remove from saved' : 'Save vehicle'}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isFavorite
                ? 'bg-rose-500 text-white shadow'
                : 'bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white hover:text-rose-500 shadow-sm'
            }`}
            aria-label="Save vehicle"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Floating Bottom Badges over Image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Location Badge */}
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>{vehicle.location}</span>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{vehicle.status}</span>
          </div>
        </div>
      </div>

      {/* Card Content Section */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Brand & Price Row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase truncate">
            {vehicle.make}
          </span>
          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              PRICE
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {displayPrice()}
            </span>
          </div>
        </div>

        {/* Vehicle Title */}
        <h3
          onClick={() => onOpenDetails(vehicle)}
          className="text-lg font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer truncate mb-3"
          title={`${vehicle.make} ${vehicle.model} ${vehicle.variant || ''}`}
        >
          {vehicle.model}
          {vehicle.variant && (
            <span className="text-sm font-normal text-slate-500 ml-1.5 truncate">
              {vehicle.variant}
            </span>
          )}
        </h3>

        {/* 4-Item Spec Row */}
        <div className="grid grid-cols-4 gap-1.5 py-2.5 px-2 bg-slate-50 rounded-xl mb-3 text-center border border-slate-100">
          <div>
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
              <Calendar className="w-3 h-3" />
              <span>YEAR</span>
            </div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              {vehicle.year}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
              <Gauge className="w-3 h-3" />
              <span>MILEAGE</span>
            </div>
            <div className="text-xs font-bold text-slate-800 mt-0.5 truncate">
              {formattedMileage}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
              <Compass className="w-3 h-3" />
              <span>DRIVE</span>
            </div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              {vehicle.drive}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
              <Fuel className="w-3 h-3" />
              <span>FUEL</span>
            </div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              {vehicle.fuel}
            </div>
          </div>
        </div>

        {/* Pill Tags Row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[11px] font-semibold text-slate-600">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 uppercase">
            {vehicle.transmission}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 uppercase">
            {vehicle.engineCapacity}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 uppercase">
            {vehicle.bodyType}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 uppercase">
            {vehicle.color}
          </span>
        </div>

        {/* Bottom Actions Row */}
        <div className="mt-auto pt-2 flex items-center gap-2">
          {/* Green Send Inquiry Button (WhatsApp Direct) */}
          <button
            type="button"
            onClick={() => onInquire(vehicle)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1fa357] hover:bg-[#188c49] shadow-sm hover:shadow transition-colors"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span>Send Inquiry</span>
          </button>

          {/* OPEN / Details Button */}
          <button
            type="button"
            onClick={() => onOpenDetails(vehicle)}
            className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors uppercase whitespace-nowrap"
          >
            <span>OPEN</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
