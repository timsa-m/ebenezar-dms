'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, UserCheck, X } from 'lucide-react';

interface Client {
  $id: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  phone?: string;
}

interface ClientSearchSelectProps {
  clients: Client[];
  defaultClientId?: string;
  initialClient?: Client | null;
  name?: string;
}

export default function ClientSearchSelect({
  clients,
  defaultClientId,
  initialClient,
  name = 'clientId',
}: ClientSearchSelectProps) {
  const initialResolved = initialClient ?? (defaultClientId
    ? clients.find((c) => c.$id === defaultClientId) ?? null
    : null);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Client | null>(initialResolved);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [prevDefaultClientId, setPrevDefaultClientId] = useState(defaultClientId);
  const [prevInitialClient, setPrevInitialClient] = useState(initialClient);

  // Sync state if props change without cascading effect renders
  if (defaultClientId !== prevDefaultClientId || initialClient !== prevInitialClient) {
    setPrevDefaultClientId(defaultClientId);
    setPrevInitialClient(initialClient);
    setSelected(initialResolved);
  }

  const allClients = useMemo(() => {
    if (initialClient && !clients.some((c) => c.$id === initialClient.$id)) {
      return [initialClient, ...clients];
    }
    return clients;
  }, [clients, initialClient]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allClients;
    return allClients.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        (c.nationalId && c.nationalId.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [allClients, query]);

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

  function handleSelect(client: Client) {
    setSelected(client);
    setIsOpen(false);
    setQuery('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setSelected(null);
    setQuery('');
    setIsOpen(false);
  }

  const initials = selected
    ? `${selected.firstName[0] ?? ''}${selected.lastName[0] ?? ''}`.toUpperCase()
    : null;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selected?.$id ?? ''} required />

      {/* Trigger button */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDropdown(e as any);
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
            {/* Avatar */}
            <div style={{
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
            }}>
              {initials}
            </div>
            {/* Name */}
            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#111113', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selected.firstName} {selected.lastName}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'ui-monospace, monospace' }}>
                ID: {selected.nationalId}
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
            <UserCheck size={16} style={{ flexShrink: 0, color: '#9CA3AF' }} />
            <span style={{ flex: 1, textAlign: 'left', fontSize: '0.875rem', color: '#9CA3AF' }}>
              Search and select a borrower…
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
          zIndex: 50,
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
              placeholder="Type name, ID or phone…"
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
                No clients match &ldquo;{query}&rdquo;
              </div>
            ) : (
              filtered.map((client) => {
                const isSelected = selected?.$id === client.$id;
                return (
                  <button
                    key={client.$id}
                    type="button"
                    onClick={() => handleSelect(client)}
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
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#F9FAFB'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Avatar */}
                    <div style={{
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
                    }}>
                      {`${client.firstName[0] ?? ''}${client.lastName[0] ?? ''}`.toUpperCase()}
                    </div>
                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#111113', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {client.firstName} {client.lastName}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'ui-monospace, monospace' }}>
                        {client.nationalId}{client.phone ? ` · ${client.phone}` : ''}
                      </p>
                    </div>
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5" style={{ flexShrink: 0 }}>
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
            {filtered.length} of {clients.length} clients
          </div>
        </div>
      )}
    </div>
  );
}
