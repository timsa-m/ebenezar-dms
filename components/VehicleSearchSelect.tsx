'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Car, X } from 'lucide-react';

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
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
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
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '0.625rem 1rem',
          background: '#fff',
          border: '1.5px solid #E5E7EB',
          borderRadius: '0.625rem',
          cursor: 'pointer',
          gap: '0.75rem',
          minHeight: '2.75rem',
          transition: 'border-color 0.15s',
          outline: 'none',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#6366F1')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
      >
        {selected ? (
          <>
            {/* Icon */}
            <div style={{
              flexShrink: 0,
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Car size={14} strokeWidth={2.5} />
            </div>
            {/* Details */}
            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#111113', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selected.registration_no}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'ui-monospace, monospace' }}>
                {selected.make_model}
              </p>
            </div>
            {/* Clear */}
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              style={{ flexShrink: 0, padding: '0.25rem', borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <Car size={16} style={{ flexShrink: 0, color: '#9CA3AF' }} />
            <span style={{ flex: 1, textAlign: 'left', fontSize: '0.875rem', color: '#9CA3AF' }}>
              {placeholder}
            </span>
            <ChevronDown size={16} style={{ flexShrink: 0, color: '#9CA3AF' }} />
          </>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 100,
          background: '#fff',
          border: '1.5px solid #E5E7EB',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 40px -4px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          {/* Search input */}
          <div style={{ padding: '0.625rem 0.75rem', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#FAFAFA' }}>
            <Search size={15} style={{ flexShrink: 0, color: '#9CA3AF' }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type registration, make or model…"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.875rem',
                color: '#111113',
              }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Results */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.8125rem' }}>
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      gap: '0.75rem',
                      border: 'none',
                      background: isSelected ? '#FEF3C7' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                      borderLeft: isSelected ? '3px solid #F59E0B' : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#F9FAFB'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Icon */}
                    <div style={{
                      flexShrink: 0,
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      background: isSelected
                        ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                        : 'linear-gradient(135deg, #F3F4F6, #E5E7EB)',
                      color: isSelected ? '#fff' : '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Car size={14} strokeWidth={isSelected ? 2.5 : 2} />
                    </div>
                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#111113', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {vehicle.registration_no}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'ui-monospace, monospace' }}>
                        {vehicle.make_model}
                      </p>
                    </div>
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count */}
          <div style={{ padding: '0.5rem 0.875rem', borderTop: '1px solid #F3F4F6', background: '#FAFAFA', fontSize: '0.6875rem', color: '#9CA3AF', textAlign: 'right' }}>
            {filtered.length} of {safeVehicles.length} vehicles
          </div>
        </div>
      )}
    </div>
  );
}
