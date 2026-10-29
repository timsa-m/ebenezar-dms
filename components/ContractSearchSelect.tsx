'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, FileText, X } from 'lucide-react';

export interface Agreement {
  id: string;
  contractNo?: string;
  clientName: string;
  vehicleReg: string;
  vehicleMakeModel?: string;
  salePrice?: number;
  nationalId?: string;
  phone?: string;
  clientPhone?: string;
  $id?: string;
}

export interface ContractSearchSelectProps {
  agreements?: Agreement[];
  defaultAgreementId?: string;
  initialAgreement?: Agreement | null;
  selectedAgreement?: Agreement | null;
  onSelect?: (agreement: Agreement | null) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
}

export default function ContractSearchSelect({
  agreements = [],
  defaultAgreementId,
  initialAgreement,
  selectedAgreement: controlledSelected,
  onSelect,
  name = 'agreementId',
  placeholder = 'Search and select a contract…',
  required = false,
}: ContractSearchSelectProps) {
  const safeAgreements = agreements || [];

  const initialResolved =
    initialAgreement ??
    (defaultAgreementId
      ? safeAgreements.find((a) => (a.id ?? a.$id) === defaultAgreementId) ?? null
      : null);

  const [query, setQuery] = useState('');
  const [internalSelected, setInternalSelected] = useState<Agreement | null>(initialResolved);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [prevDefaultId, setPrevDefaultId] = useState(defaultAgreementId);
  const [prevInitial, setPrevInitial] = useState(initialAgreement);

  // Sync state if initial props change without cascading render loops
  if (defaultAgreementId !== prevDefaultId || initialAgreement !== prevInitial) {
    setPrevDefaultId(defaultAgreementId);
    setPrevInitial(initialAgreement);
    setInternalSelected(initialResolved);
  }

  // Support controlled mode if controlledSelected is provided
  const selected = controlledSelected !== undefined ? controlledSelected : internalSelected;

  const allAgreements = useMemo(() => {
    const current = selected ?? initialAgreement;
    const currentId = current?.id ?? current?.$id;
    if (current && currentId && !safeAgreements.some((a) => (a.id ?? a.$id) === currentId)) {
      return [current, ...safeAgreements];
    }
    return safeAgreements;
  }, [safeAgreements, selected, initialAgreement]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allAgreements;
    return allAgreements.filter((a) => {
      const client = (a.clientName || '').toLowerCase();
      const contract = (a.contractNo || '').toLowerCase();
      const reg = (a.vehicleReg || '').toLowerCase();
      const model = (a.vehicleMakeModel || '').toLowerCase();
      const natId = (a.nationalId || '').toLowerCase();
      const phone = (a.phone || a.clientPhone || '').toLowerCase();

      return (
        client.includes(q) ||
        contract.includes(q) ||
        reg.includes(q) ||
        model.includes(q) ||
        natId.includes(q) ||
        phone.includes(q)
      );
    });
  }, [allAgreements, query]);

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

  function handleSelect(agreement: Agreement) {
    if (controlledSelected === undefined) {
      setInternalSelected(agreement);
    }
    onSelect?.(agreement);
    setIsOpen(false);
    setQuery('');
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

  const getInitials = (name?: string) => {
    if (!name) return 'AG';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }
    return (name.slice(0, 2) || 'AG').toUpperCase();
  };

  const initials = selected ? getInitials(selected.clientName) : null;
  const selectedId = selected?.id ?? selected?.$id ?? '';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selectedId} required={required} />

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
            {/* Avatar with Initials */}
            <div
              style={{
                flexShrink: 0,
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              {initials}
            </div>

            {/* Contract / Client Details */}
            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#111113',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selected.clientName}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  color: '#9CA3AF',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selected.contractNo ? `${selected.contractNo} · ` : ''}
                {selected.vehicleReg}
                {selected.salePrice ? ` · KES ${selected.salePrice.toLocaleString()}` : ''}
                {selected.vehicleMakeModel ? ` · ${selected.vehicleMakeModel}` : ''}
              </p>
            </div>

            {/* Clear Selection Button */}
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              style={{
                flexShrink: 0,
                padding: '0.25rem',
                borderRadius: '50%',
                border: 'none',
                background: '#F3F4F6',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6B7280',
                transition: 'background-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E5E7EB';
                e.currentTarget.style.color = '#111827';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F3F4F6';
                e.currentTarget.style.color = '#6B7280';
              }}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <FileText size={16} style={{ flexShrink: 0, color: '#9CA3AF' }} />
            <span style={{ flex: 1, textAlign: 'left', fontSize: '0.875rem', color: '#9CA3AF' }}>
              {placeholder}
            </span>
            <ChevronDown size={16} style={{ flexShrink: 0, color: '#9CA3AF' }} />
          </>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
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
          }}
        >
          {/* Search input header */}
          <div
            style={{
              padding: '0.625rem 0.75rem',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#FAFAFA',
            }}
          >
            <Search size={15} style={{ flexShrink: 0, color: '#9CA3AF' }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type contract #, client, plate or phone…"
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
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Results List */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  color: '#9CA3AF',
                  fontSize: '0.8125rem',
                }}
              >
                No contracts match &ldquo;{query}&rdquo;
              </div>
            ) : (
              filtered.map((agreement) => {
                const currentAgreementId = agreement.id ?? agreement.$id ?? '';
                const isSelected = selectedId === currentAgreementId;
                const itemInitials = getInitials(agreement.clientName);

                return (
                  <button
                    key={currentAgreementId || agreement.contractNo || agreement.vehicleReg}
                    type="button"
                    onClick={() => handleSelect(agreement)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      gap: '0.75rem',
                      border: 'none',
                      background: isSelected ? '#EEF2FF' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.1s',
                      borderLeft: isSelected ? '3px solid #6366F1' : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = '#F9FAFB';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        flexShrink: 0,
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        background: isSelected
                          ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                          : 'linear-gradient(135deg, #F3F4F6, #E5E7EB)',
                        color: isSelected ? '#fff' : '#6B7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                      }}
                    >
                      {itemInitials}
                    </div>

                    {/* Contract Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#111113',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {agreement.clientName}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          marginTop: '0.125rem',
                          flexWrap: 'nowrap',
                          overflow: 'hidden',
                        }}
                      >
                        {agreement.contractNo && (
                          <span
                            style={{
                              fontFamily: 'ui-monospace, monospace',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              color: '#6366F1',
                              background: '#EEF2FF',
                              padding: '0.0625rem 0.3125rem',
                              borderRadius: '0.25rem',
                              letterSpacing: '0.03em',
                              flexShrink: 0,
                            }}
                          >
                            {agreement.contractNo}
                          </span>
                        )}
                        <span
                          style={{
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            color: '#4B5563',
                            background: '#F3F4F6',
                            padding: '0.0625rem 0.3125rem',
                            borderRadius: '0.25rem',
                            letterSpacing: '0.03em',
                            flexShrink: 0,
                          }}
                        >
                          {agreement.vehicleReg}
                        </span>
                        {agreement.salePrice !== undefined && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: isSelected ? '#4F46E5' : '#2563EB',
                              flexShrink: 0,
                            }}
                          >
                            KES {agreement.salePrice.toLocaleString()}
                          </span>
                        )}
                        {agreement.vehicleMakeModel && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              color: '#9CA3AF',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            · {agreement.vehicleMakeModel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selected checkmark indicator */}
                    {isSelected && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#6366F1"
                        strokeWidth="2.5"
                        style={{ flexShrink: 0 }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer count indicator */}
          <div
            style={{
              padding: '0.5rem 0.875rem',
              borderTop: '1px solid #F3F4F6',
              background: '#FAFAFA',
              fontSize: '0.6875rem',
              color: '#9CA3AF',
              textAlign: 'right',
            }}
          >
            {filtered.length} of {safeAgreements.length} contracts
          </div>
        </div>
      )}
    </div>
  );
}
