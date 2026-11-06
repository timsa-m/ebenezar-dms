'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Car, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Vehicle {
  id: string;
  registration_no: string;
  make_model: string;
  sale_price?: number;
}

export interface VehicleSearchSelectProps {
  vehicles?: Vehicle[];
  defaultVehicleId?: string;
  initialVehicle?: Vehicle | null;
  selectedVehicle?: Vehicle | null;
  onSelect?: (vehicle: Vehicle | null) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
}

export default function VehicleSearchSelect({
  vehicles = [],
  defaultVehicleId,
  initialVehicle,
  selectedVehicle: controlledSelected,
  onSelect,
  name = 'vehicleId',
  placeholder = 'Search and select a vehicle…',
  required = false,
}: VehicleSearchSelectProps) {
  const safeVehicles = vehicles || [];

  const initialResolved = initialVehicle ?? (defaultVehicleId
    ? safeVehicles.find((v) => v.id === defaultVehicleId) ?? null
    : null);

  const [query, setQuery] = useState('');
  const [internalSelected, setInternalSelected] = useState<Vehicle | null>(initialResolved);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [prevDefaultVehicleId, setPrevDefaultVehicleId] = useState(defaultVehicleId);
  const [prevInitialVehicle, setPrevInitialVehicle] = useState(initialVehicle);

  // Sync state if props change without cascading effect renders
  if (defaultVehicleId !== prevDefaultVehicleId || initialVehicle !== prevInitialVehicle) {
    setPrevDefaultVehicleId(defaultVehicleId);
    setPrevInitialVehicle(initialVehicle);
    setInternalSelected(initialResolved);
  }

  const selected = controlledSelected !== undefined ? controlledSelected : internalSelected;

  const allVehicles = useMemo(() => {
    const current = selected ?? initialVehicle;
    if (current && !safeVehicles.some((v) => v.id === current.id)) {
      return [current, ...safeVehicles];
    }
    return safeVehicles;
  }, [safeVehicles, selected, initialVehicle]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allVehicles;
    return allVehicles.filter(
      (v) =>
        (v.make_model && v.make_model.toLowerCase().includes(q)) ||
        (v.registration_no && v.registration_no.toLowerCase().includes(q))
    );
  }, [allVehicles, query]);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function openDropdown() {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSelect(vehicle: Vehicle) {
    if (controlledSelected === undefined) {
      setInternalSelected(vehicle);
    }
    onSelect?.(vehicle);
    setIsOpen(false);
    setQuery('');

    // Extrapolate sale price to the form's salePrice input if it exists
    if (vehicle.sale_price) {
      const salePriceInput = document.querySelector('input[name="salePrice"]') as HTMLInputElement;
      if (salePriceInput) {
        salePriceInput.value = vehicle.sale_price.toString();
        // Dispatch an input event in case there are other listeners (e.g. React onChange)
        salePriceInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    if (controlledSelected === undefined) {
      setInternalSelected(null);
    }
    onSelect?.(null);
    setQuery('');
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selected?.id ?? ''} required={required} />

      {/* Trigger button */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDropdown();
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        onClick={openDropdown}
        className={cn(
          "flex items-center w-full px-4 py-2.5 rounded-[10px] cursor-pointer gap-3 min-h-[44px] transition-colors outline-none",
          "bg-white dark:bg-[#101612] border border-gray-200 dark:border-[#29352D]",
          "hover:border-gray-300 dark:hover:border-[#3a4b3f] focus-visible:border-amber-500 dark:focus-visible:border-[#B7FF3C]"
        )}
      >
        {selected ? (
          <>
            {/* Icon */}
            <div className="shrink-0 size-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 dark:from-[#B7FF3C] dark:to-[#84cc16] text-white dark:text-[#090C0A] flex items-center justify-center">
              <Car size={14} strokeWidth={2.5} />
            </div>
            {/* Details */}
            <div className="flex-1 text-left min-w-0">
              <p className="m-0 text-sm font-semibold text-gray-900 dark:text-[#F4F7F4] truncate">
                {selected.registration_no}
              </p>
              <p className="m-0 text-xs text-gray-400 dark:text-[#A1ADA4] font-mono">
                {selected.make_model}
              </p>
            </div>
            {/* Clear */}
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              className="shrink-0 p-1 rounded-full border-none bg-gray-100 dark:bg-[#1D2920] text-gray-500 dark:text-[#C1CBC3] hover:text-gray-900 dark:hover:text-[#F4F7F4] flex items-center justify-center cursor-pointer"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <Car size={16} className="shrink-0 text-gray-400 dark:text-[#A1ADA4]" />
            <span className="flex-1 text-left text-sm text-gray-400 dark:text-[#A1ADA4]">
              {placeholder}
            </span>
            <ChevronDown size={16} className="shrink-0 text-gray-400 dark:text-[#A1ADA4]" />
          </>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] inset-x-0 z-50 bg-white dark:bg-[#151D17] border border-gray-200 dark:border-[#29352D] rounded-xl shadow-[0_10px_40px_-4px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_40px_-4px_rgba(0,0,0,0.7)] overflow-hidden">
          {/* Search input */}
          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-[#29352D] flex items-center gap-2 bg-gray-50/60 dark:bg-[#18221A]">
            <Search size={15} className="shrink-0 text-gray-400 dark:text-[#A1ADA4]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type registration, make or model…"
              className="flex-1 border-none outline-none bg-transparent text-sm text-gray-900 dark:text-[#F4F7F4] placeholder:text-gray-400 dark:placeholder:text-[#5d6f62]"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="border-none bg-none cursor-pointer text-gray-400 dark:text-[#A1ADA4] p-0">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[280px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-gray-400 dark:text-[#A1ADA4] text-[13px]">
                No vehicles match &ldquo;{query}&rdquo;
              </div>
            ) : (
              filtered.map((vehicle) => {
                const isSelected = selected?.id === vehicle.id;
                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => handleSelect(vehicle)}
                    className={cn(
                      "flex items-center w-full px-3.5 py-2.5 gap-3 border-none cursor-pointer text-left transition-colors",
                      isSelected
                        ? "bg-amber-50 dark:bg-emerald-950/40 border-l-[3px] border-l-amber-500 dark:border-l-[#B7FF3C]"
                        : "bg-transparent hover:bg-gray-50 dark:hover:bg-[#18221A] border-l-[3px] border-l-transparent"
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        "shrink-0 size-8 rounded-full flex items-center justify-center text-[11px] font-bold",
                        isSelected
                          ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white dark:bg-[#B7FF3C] dark:text-[#090C0A]"
                          : "bg-gray-100 dark:bg-[#1D2920] text-gray-600 dark:text-[#C1CBC3]"
                      )}
                    >
                      <Car size={14} strokeWidth={isSelected ? 2.5 : 2} />
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="m-0 text-sm font-semibold text-gray-900 dark:text-[#F4F7F4] truncate">
                        {vehicle.registration_no}
                      </p>
                      <p className="m-0 text-xs text-gray-400 dark:text-[#A1ADA4] font-mono">
                        {vehicle.make_model}
                      </p>
                    </div>
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-amber-500 dark:text-[#B7FF3C]">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count */}
          <div className="px-3.5 py-2 border-t border-gray-100 dark:border-[#29352D] bg-gray-50/60 dark:bg-[#18221A] text-[11px] text-gray-400 dark:text-[#A1ADA4] text-right">
            {filtered.length} of {safeVehicles.length} vehicles
          </div>
        </div>
      )}
    </div>
  );
}
