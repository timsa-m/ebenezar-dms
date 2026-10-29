import React from 'react';
import { Vehicle } from '../types';
import { X, Heart, Trash2, ArrowUpRight, MessageSquare } from 'lucide-react';
import { VehicleImageWithFallback } from './VehicleImageWithFallback';

interface FavoritesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: Vehicle[];
  currency: 'USD' | 'KES';
  onRemoveFavorite: (id: string) => void;
  onOpenDetails: (vehicle: Vehicle) => void;
  onInquire: (vehicle: Vehicle) => void;
}

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({
  isOpen,
  onClose,
  favorites,
  currency,
  onRemoveFavorite,
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
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white h-full overflow-y-auto flex flex-col justify-between shadow-2xl"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-rose-500" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">
              Saved Vehicles ({favorites.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {favorites.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Heart className="w-12 h-12 mx-auto stroke-1" />
              <p className="text-sm font-semibold text-slate-600">
                You haven't saved any vehicles yet
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Tap the heart icon on any card in the inventory to easily return to your shortlisted options.
              </p>
            </div>
          ) : (
            favorites.map((v) => (
              <div
                key={v.id}
                className="flex gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 relative group"
              >
                <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                  <VehicleImageWithFallback
                    src={v.primaryImage}
                    alt={v.model}
                    make={v.make}
                    model={v.model}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {v.make}
                    </span>
                    <button
                      onClick={() => onRemoveFavorite(v.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {v.model} {v.year}
                  </h4>
                  <p className="text-xs font-black text-emerald-700 mt-0.5">
                    {formatPrice(v)}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => {
                        onClose();
                        onInquire(v);
                      }}
                      className="px-2.5 py-1 bg-[#1fa357] hover:bg-[#188c49] text-white text-[11px] font-bold rounded-lg flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3 fill-white" />
                      Inquire
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenDetails(v);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold rounded-lg flex items-center gap-1"
                    >
                      View
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
          >
            Continue Browsing Inventory
          </button>
        </div>
      </div>
    </div>
  );
};
