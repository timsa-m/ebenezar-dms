import React, { useState } from 'react';
import { Heart, Scale, Phone, Menu, X, MessageSquare, Bell } from 'lucide-react';

interface HeaderProps {
  favoriteCount: number;
  compareCount: number;
  alertCount: number;
  currency: 'USD' | 'KES';
  onToggleCurrency: () => void;
  onOpenFavorites: () => void;
  onOpenCompare: () => void;
  onOpenAlerts: () => void;
  onSelectCategory: (category: string) => void;
  activeCategory: string;
}

export const Header: React.FC<HeaderProps> = ({
  favoriteCount,
  compareCount,
  alertCount,
  currency,
  onToggleCurrency,
  onOpenFavorites,
  onOpenCompare,
  onOpenAlerts,
  onSelectCategory,
  activeCategory,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (category: string) => {
    onSelectCategory(category);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleNavClick('all')}
              className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 hover:text-emerald-700 transition-colors uppercase"
            >
              Apex Auto
            </button>
            <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              Nairobi & Mombasa
            </span>
          </div>

          {/* Zone 2: Clean 4–6 text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <button
              onClick={() => handleNavClick('all')}
              className={`transition-colors pb-0.5 ${
                activeCategory === 'all'
                  ? 'text-slate-900 border-b-2 border-emerald-600 font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              All Inventory
            </button>
            <button
              onClick={() => handleNavClick('Tractor')}
              className={`transition-colors pb-0.5 ${
                activeCategory === 'Tractor'
                  ? 'text-slate-900 border-b-2 border-emerald-600 font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Tractors & Farm
            </button>
            <button
              onClick={() => handleNavClick('SUV')}
              className={`transition-colors pb-0.5 ${
                activeCategory === 'SUV'
                  ? 'text-slate-900 border-b-2 border-emerald-600 font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              SUVs & 4x4
            </button>
            <button
              onClick={() => handleNavClick('Van / MPV')}
              className={`transition-colors pb-0.5 ${
                activeCategory === 'Van / MPV'
                  ? 'text-slate-900 border-b-2 border-emerald-600 font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Vans & Luxury MPV
            </button>
            <button
              onClick={() => handleNavClick('Pickup')}
              className={`transition-colors pb-0.5 ${
                activeCategory === 'Pickup'
                  ? 'text-slate-900 border-b-2 border-emerald-600 font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Pickups
            </button>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Currency toggle */}
            <button
              onClick={onToggleCurrency}
              title={`Switch currency to ${currency === 'USD' ? 'KES' : 'USD'}`}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
            >
              {currency}
            </button>

            {/* Compare vehicles button */}
            <button
              onClick={onOpenCompare}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Compare selected vehicles"
              aria-label="Compare vehicles"
            >
              <Scale className="w-5 h-5" />
              {compareCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {compareCount}
                </span>
              )}
            </button>

            {/* Stock Alerts button */}
            <button
              onClick={onOpenAlerts}
              className="relative p-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Inventory Stock Alerts"
              aria-label="Stock Alerts"
            >
              <Bell className="w-5 h-5" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>

            {/* Saved Wishlist */}
            <button
              onClick={onOpenFavorites}
              className="relative p-2 text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Saved vehicles"
              aria-label="Favorites"
            >
              <Heart className={`w-5 h-5 ${favoriteCount > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
              {favoriteCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {favoriteCount}
                </span>
              )}
            </button>

            {/* WhatsApp Contact Action */}
            <a
              href="https://wa.me/254748222222?text=Hello%20Apex%20Motors,%20I%20would%20like%20to%20inquire%20about%20vehicles%20in%20your%20inventory."
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#1fa357] hover:bg-[#188c49] rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4" />
              <span>+254 748 222222</span>
            </a>

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-100 space-y-2 bg-white">
            <button
              onClick={() => handleNavClick('all')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-slate-800 hover:bg-slate-50"
            >
              All Inventory
            </button>
            <button
              onClick={() => handleNavClick('Tractor')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-slate-800 hover:bg-slate-50"
            >
              Tractors & Farm Machinery
            </button>
            <button
              onClick={() => handleNavClick('SUV')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-slate-800 hover:bg-slate-50"
            >
              SUVs & 4x4
            </button>
            <button
              onClick={() => handleNavClick('Van / MPV')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-slate-800 hover:bg-slate-50"
            >
              Vans & Luxury MPV
            </button>
            <button
              onClick={() => handleNavClick('Pickup')}
              className="block w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-slate-800 hover:bg-slate-50"
            >
              Commercial Pickups
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAlerts();
              }}
              className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-600" />
                <span>Inventory Stock Alerts</span>
              </span>
              {alertCount > 0 && (
                <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {alertCount}
                </span>
              )}
            </button>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-3">
              <span className="text-xs text-slate-500 font-medium">Direct Hotline:</span>
              <a
                href="tel:+254748222222"
                className="text-xs font-bold text-emerald-700 flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" /> +254 748 222222
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
