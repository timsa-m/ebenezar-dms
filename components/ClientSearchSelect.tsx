'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, UserCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
            openDropdown();
          }
        }}
        onClick={openDropdown}
        className="flex items-center w-full px-4 py-2.5 bg-white dark:bg-[#101612] border border-gray-200 dark:border-[#29352D] rounded-[0.625rem] cursor-pointer gap-3 min-h-[2.75rem] transition-colors focus:border-indigo-500 dark:focus:border-[#B7FF3C] outline-none"
      >
        {selected ? (
          <>
            {/* Avatar */}
            <div className="shrink-0 size-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[11px] font-bold tracking-wide">
              {initials}
            </div>
            {/* Name */}
            <div className="flex-1 text-left min-w-0">
              <p className="m-0 text-sm font-semibold text-gray-900 dark:text-[#F4F7F4] truncate">
                {selected.firstName} {selected.lastName}
              </p>
              <p className="m-0 text-xs text-gray-400 dark:text-[#A1ADA4] font-mono">
                ID: {selected.nationalId}
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
            <UserCheck size={16} className="shrink-0 text-gray-400 dark:text-[#A1ADA4]" />
            <span className="flex-1 text-left text-sm text-gray-400 dark:text-[#A1ADA4]">
              Search and select a borrower…
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
              placeholder="Type name, ID or phone…"
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
                    className={cn(
                      "flex items-center w-full px-3.5 py-2.5 gap-3 border-none cursor-pointer text-left transition-colors",
                      isSelected
                        ? "bg-indigo-50 dark:bg-emerald-950/40 border-l-[3px] border-l-indigo-600 dark:border-l-[#B7FF3C]"
                        : "bg-transparent hover:bg-gray-50 dark:hover:bg-[#18221A] border-l-[3px] border-l-transparent"
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "shrink-0 size-8 rounded-full flex items-center justify-center text-[11px] font-bold",
                        isSelected
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white dark:bg-[#B7FF3C] dark:text-[#090C0A]"
                          : "bg-gray-100 dark:bg-[#1D2920] text-gray-600 dark:text-[#C1CBC3]"
                      )}
                    >
                      {`${client.firstName[0] ?? ''}${client.lastName[0] ?? ''}`.toUpperCase()}
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="m-0 text-sm font-semibold text-gray-900 dark:text-[#F4F7F4] truncate">
                        {client.firstName} {client.lastName}
                      </p>
                      <p className="m-0 text-xs text-gray-400 dark:text-[#A1ADA4] font-mono">
                        {client.nationalId}{client.phone ? ` · ${client.phone}` : ''}
                      </p>
                    </div>
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-indigo-600 dark:text-[#B7FF3C]">
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
            {filtered.length} of {clients.length} clients
          </div>
        </div>
      )}
    </div>
  );
}
