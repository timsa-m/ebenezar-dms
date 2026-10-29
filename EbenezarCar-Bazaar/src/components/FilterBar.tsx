import React, { useState } from 'react';
import { FilterState } from '../types';
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  ChevronDown,
  ArrowUpDown,
  Car,
  MapPin,
  Check,
  Bell,
} from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  onOpenNotifyModal: () => void;
  activeAlertsCount?: number;
  availableMakes: string[];
  availableModels: string[];
  totalResults: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  onOpenNotifyModal,
  activeAlertsCount = 0,
  availableMakes,
  availableModels,
  totalResults,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const pricePresets = [
    { label: 'All Prices', min: 0, max: 100000 },
    { label: 'Under $15k', min: 0, max: 15000 },
    { label: '$15k - $35k', min: 15000, max: 35000 },
    { label: '$35k - $60k', min: 35000, max: 60000 },
    { label: '$60k+', min: 60000, max: 100000 },
  ];

  const countActiveFilters = () => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.make) count++;
    if (filters.model) count++;
    if (filters.bodyType) count++;
    if (filters.minPrice > 0 || filters.maxPrice < 100000) count++;
    if (filters.location) count++;
    if (filters.fuel) count++;
    if (filters.transmission) count++;
    if (filters.drive) count++;
    return count;
  };

  const activeCount = countActiveFilters();

  return (
    <div className="space-y-4">
      {/* Top Primary Search & Quick Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search make, model, stock ID..."
              value={filters.searchQuery}
              onChange={(e) =>
                onFilterChange({ ...filters, searchQuery: e.target.value })
              }
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
            {filters.searchQuery && (
              <button
                onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Make Filter Dropdown */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                value={filters.make}
                onChange={(e) =>
                  onFilterChange({ ...filters, make: e.target.value, model: '' })
                }
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer"
              >
                <option value="">All Makes</option>
                {availableMakes.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Model Filter Dropdown */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                value={filters.model}
                disabled={availableModels.length === 0}
                onChange={(e) =>
                  onFilterChange({ ...filters, model: e.target.value })
                }
                className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {filters.make ? 'All Models' : 'Select Make First'}
                </option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Controls: Filter Button + Sort */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters {activeCount > 0 && `(${activeCount})`}</span>
            </button>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="hidden md:inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors whitespace-nowrap w-full"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
              <span>{showAdvanced ? 'Fewer Filters' : 'More Filters'}</span>
              {activeCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center ml-1">
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Quick Price Preset Chips (Desktop & Tablet) */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className="text-slate-400 mr-1 text-[11px] uppercase tracking-wider">
              Price Range:
            </span>
            {pricePresets.map((preset, idx) => {
              const isActive =
                filters.minPrice === preset.min && filters.maxPrice === preset.max;
              return (
                <button
                  key={idx}
                  onClick={() =>
                    onFilterChange({
                      ...filters,
                      minPrice: preset.min,
                      maxPrice: preset.max,
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg transition-colors text-xs ${
                    isActive
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Results count, Notify Me & Clear */}
          <div className="flex items-center gap-2.5 sm:gap-3 text-xs">
            <span className="font-semibold text-slate-500 hidden sm:inline">
              Showing <strong className="text-slate-900">{totalResults}</strong> units
            </span>

            {/* Notify Me Trigger Button */}
            <button
              onClick={onOpenNotifyModal}
              title="Get email/WhatsApp alerts for this search filter"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 rounded-lg font-bold text-xs transition-colors shadow-xs"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-700" />
              <span>Notify Me</span>
              {activeAlertsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-700 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeAlertsCount}
                </span>
              )}
            </button>

            {activeCount > 0 && (
              <button
                onClick={onResetFilters}
                className="text-slate-500 hover:text-slate-800 font-bold inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Desktop Advanced Filter Drawer (Expandable) */}
        {showAdvanced && (
          <div className="hidden md:grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-4 rounded-xl">
            {/* Body Type */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Body Type
              </label>
              <select
                value={filters.bodyType}
                onChange={(e) =>
                  onFilterChange({ ...filters, bodyType: e.target.value })
                }
                className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              >
                <option value="">All Types</option>
                <option value="SUV">SUV & 4x4</option>
                <option value="Compact SUV">Compact SUV</option>
                <option value="Tractor">Tractor & Farm</option>
                <option value="Van / MPV">Van / Luxury MPV</option>
                <option value="Pickup">Pickup & Double Cab</option>
                <option value="Saloon">Executive Saloon</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Station Wagon">Station Wagon</option>
                <option value="Minivan">Minivan</option>
                <option value="Pikipiki">Pikipiki</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Location
              </label>
              <select
                value={filters.location}
                onChange={(e) =>
                  onFilterChange({ ...filters, location: e.target.value })
                }
                className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              >
                <option value="">All Showrooms</option>
                <option value="Nairobi">Nairobi Depot</option>
                <option value="Mombasa">Mombasa Port & Showroom</option>
              </select>
            </div>

            {/* Fuel Type */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Fuel
              </label>
              <select
                value={filters.fuel}
                onChange={(e) =>
                  onFilterChange({ ...filters, fuel: e.target.value })
                }
                className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              >
                <option value="">All Fuels</option>
                <option value="PETROL">Petrol</option>
                <option value="DIESEL">Diesel</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>

            {/* Transmission */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Transmission
              </label>
              <select
                value={filters.transmission}
                onChange={(e) =>
                  onFilterChange({ ...filters, transmission: e.target.value })
                }
                className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
              >
                <option value="">All Transmissions</option>
                <option value="AUTOMATIC">Automatic</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>

            {/* Sort & Quick Sliders */}
            <div className="col-span-4 flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Custom Max Price:
                </span>
                <input
                  type="number"
                  placeholder="Max $"
                  value={filters.maxPrice === 100000 ? '' : filters.maxPrice}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      maxPrice: e.target.value ? Number(e.target.value) : 100000,
                    })
                  }
                  className="w-28 py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Sort by:</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      sortBy: e.target.value as FilterState['sortBy'],
                    })
                  }
                  className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                >
                  <option value="featured">Featured Inventory</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="year-desc">Year: Newest First</option>
                  <option value="mileage-asc">Mileage: Lowest First</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE FILTER SLIDE-OVER DRAWER */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm md:hidden animate-fadeIn">
          <div className="w-full max-w-sm bg-white h-full overflow-y-auto p-5 flex flex-col justify-between">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-lg">Filter Inventory</h3>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Drawer Fields */}
              <div className="space-y-4 py-4">
                {/* Make */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Make
                  </label>
                  <select
                    value={filters.make}
                    onChange={(e) =>
                      onFilterChange({
                        ...filters,
                        make: e.target.value,
                        model: '',
                      })
                    }
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">All Makes</option>
                    {availableMakes.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Model
                  </label>
                  <select
                    value={filters.model}
                    disabled={availableModels.length === 0}
                    onChange={(e) =>
                      onFilterChange({ ...filters, model: e.target.value })
                    }
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm disabled:opacity-50"
                  >
                    <option value="">
                      {filters.make ? 'All Models' : 'Select Make First'}
                    </option>
                    {availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Presets */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Price Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {pricePresets.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          onFilterChange({
                            ...filters,
                            minPrice: preset.min,
                            maxPrice: preset.max,
                          })
                        }
                        className={`p-2 rounded-lg text-xs font-semibold text-center border ${
                          filters.minPrice === preset.min &&
                          filters.maxPrice === preset.max
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body Type */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Category
                  </label>
                  <select
                    value={filters.bodyType}
                    onChange={(e) =>
                      onFilterChange({ ...filters, bodyType: e.target.value })
                    }
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">All Categories</option>
                    <option value="SUV">SUV & 4x4</option>
                    <option value="Compact SUV">Compact SUV</option>
                    <option value="Tractor">Tractor & Farm</option>
                    <option value="Van / MPV">Van / Luxury MPV</option>
                    <option value="Pickup">Pickup & Double Cab</option>
                    <option value="Saloon">Executive Saloon</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="Station Wagon">Station Wagon</option>
                    <option value="Minivan">Minivan</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Location
                  </label>
                  <select
                    value={filters.location}
                    onChange={(e) =>
                      onFilterChange({ ...filters, location: e.target.value })
                    }
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">All Showrooms</option>
                    <option value="Nairobi">Nairobi Depot</option>
                    <option value="Mombasa">Mombasa Port & Showroom</option>
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-1">
                    Sort by
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) =>
                      onFilterChange({
                        ...filters,
                        sortBy: e.target.value as FilterState['sortBy'],
                      })
                    }
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="featured">Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="year-desc">Year: Newest</option>
                    <option value="mileage-asc">Mileage: Lowest</option>
                  </select>
                </div>
                {/* Mobile Notify Me Callout */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      onOpenNotifyModal();
                    }}
                    className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Bell className="w-4 h-4 text-emerald-700" />
                    <span>Notify Me When Matching Vehicles Arrive</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Drawer Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={onResetFilters}
                className="py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md"
              >
                Apply ({totalResults} Vehicles)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
