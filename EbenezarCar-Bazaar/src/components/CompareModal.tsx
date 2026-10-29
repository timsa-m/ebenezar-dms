import React from 'react';
import { Vehicle } from '../types';
import { X, Trash2, MessageSquare, ArrowUpRight, Check, Scale } from 'lucide-react';
import { VehicleImageWithFallback } from './VehicleImageWithFallback';

interface CompareModalProps {
  isOpen: boolean;
  vehicles: Vehicle[];
  currency: 'USD' | 'KES';
  onClose: () => void;
  onRemoveVehicle: (id: string) => void;
  onOpenDetails: (vehicle: Vehicle) => void;
  onInquire: (vehicle: Vehicle) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  vehicles,
  currency,
  onClose,
  onRemoveVehicle,
  onOpenDetails,
  onInquire,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatPrice = (v: Vehicle) => {
    if (v.price === 0) return 'Ask us';
    if (currency === 'KES') {
      return v.priceFormatted || `KES ${(v.price * 130).toLocaleString()}`;
    }
    return `$${v.price.toLocaleString()}`;
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Vehicle Side-by-Side Comparison
              </h2>
              <p className="text-xs text-slate-500">
                Comparing {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} (up to 3)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Matrix Body */}
        <div className="overflow-x-auto p-4 sm:p-6 flex-1">
          {vehicles.length === 0 ? (
            <div className="text-center py-12">
              <Scale className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                No vehicles selected for comparison
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                Click the comparison icon on any inventory card to evaluate specs side-by-side.
              </p>
            </div>
          ) : (
            <div className="min-w-[600px] grid grid-cols-4 gap-4">
              {/* Feature Labels Column */}
              <div className="col-span-1 space-y-4 pt-44 font-semibold text-xs text-slate-500">
                <div className="h-8 flex items-center border-b border-slate-100">Price</div>
                <div className="h-8 flex items-center border-b border-slate-100">Stock ID</div>
                <div className="h-8 flex items-center border-b border-slate-100">Year</div>
                <div className="h-8 flex items-center border-b border-slate-100">Mileage</div>
                <div className="h-8 flex items-center border-b border-slate-100">Engine</div>
                <div className="h-8 flex items-center border-b border-slate-100">Fuel</div>
                <div className="h-8 flex items-center border-b border-slate-100">Transmission</div>
                <div className="h-8 flex items-center border-b border-slate-100">Drive Type</div>
                <div className="h-8 flex items-center border-b border-slate-100">Body Category</div>
                <div className="h-8 flex items-center border-b border-slate-100">Showroom Location</div>
                <div className="h-10 flex items-center">Actions</div>
              </div>

              {/* Vehicle Columns */}
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  className="col-span-1 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-between"
                >
                  {/* Top Image & Title */}
                  <div className="space-y-2">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-200">
                      <VehicleImageWithFallback
                        src={v.primaryImage}
                        alt={v.model}
                        make={v.make}
                        model={v.model}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => onRemoveVehicle(v.id)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-rose-600 hover:bg-rose-50 flex items-center justify-center shadow-sm"
                        title="Remove from comparison"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {v.make}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {v.model}
                      </h4>
                    </div>
                  </div>

                  {/* Spec Row Values */}
                  <div className="space-y-4 my-4 font-bold text-xs text-slate-900">
                    <div className="h-8 flex items-center border-b border-slate-200/60 text-emerald-700">
                      {formatPrice(v)}
                    </div>
                    <div className="h-8 flex items-center border-b border-slate-200/60 font-mono text-[11px]">
                      #{v.stockId}
                    </div>
                    <div className="h-8 flex items-center border-b border-slate-200/60">
                      {v.year}
                    </div>
                    <div className="h-8 flex items-center border-b border-slate-200/60 truncate">
                      {v.mileage === 0 ? '0 km' : `${v.mileage.toLocaleString()} km`}
                    </div>
                    <div className="h-8 flex items-center border-b border-slate-200/60">
                      {v.engineCapacity}
                    </div>
                    <div className="h-8 flex items-center border-b border-slate-200/60">
                      {v.fuel}
                    </div>
                    <div className="h-8 flex items-center border-b border-slate-200/60 truncate">
                      {v.transmission}
                    </div>
                    <div className="h-8 flex items-center border-b border-slate-200/60">
                      {v.drive}
                    </div>
                    <div className="h-8 flex items-center border-b border-slate-200/60 truncate">
                      {v.bodyType}
                    </div>
                    <div className="h-8 flex items-center border-b border-slate-200/60">
                      {v.location}
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="space-y-1.5 pt-2">
                    <button
                      onClick={() => onInquire(v)}
                      className="w-full py-2 px-2 bg-[#1fa357] hover:bg-[#188c49] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-white" />
                      <span>Inquire</span>
                    </button>
                    <button
                      onClick={() => onOpenDetails(v)}
                      className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                    >
                      <span>Details</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
