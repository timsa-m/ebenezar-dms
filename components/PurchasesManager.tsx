'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Car, Filter, ChevronUp, ChevronDown, FileText } from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableResponsiveGrid,
  TableResponsiveCard,
  TableResponsiveCardHeader,
  TableResponsiveCardContent,
} from '@/components/ui/table';

const STATUS_FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'Active', label: 'Active' },
  { value: 'Fully Paid', label: 'Fully Paid' },
] as const;

export default function PurchasesManager({ purchases = [] }: { purchases: any[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc'>('date_desc');

  const filtered = useMemo(() => {
    const result = purchases.map((p) => {
      const status = Number(p.balance) <= 0 ? 'Fully Paid' : 'Active';
      return { ...p, status };
    }).filter((purchase) => {
      const matchesStatus = statusFilter === 'All' || purchase.status === statusFilter;
      if (!query.trim()) return matchesStatus;
      const q = query.toLowerCase();
      const matchesQuery =
        purchase.seller_name?.toLowerCase().includes(q) ||
        purchase.vehicle?.registration_no?.toLowerCase().includes(q) ||
        purchase.vehicle?.make_model?.toLowerCase().includes(q) ||
        purchase.purchase_no?.toLowerCase().includes(q) ||
        purchase.id?.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });

    if (sortBy === 'date_desc') {
      result.sort((a, b) => {
        const dateA = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
        const dateB = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'date_asc') {
      result.sort((a, b) => {
        const dateA = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
        const dateB = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
        return dateA - dateB;
      });
    }

    return result;
  }, [purchases, query, statusFilter, sortBy]);

  return (
    <div className="flex flex-col gap-5 mt-6">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        <h2 className="text-18 font-semibold text-gray-900 tracking-tight">
          All Purchases
          <span className="ml-2 text-14 font-normal text-gray-400"> ({filtered.length})</span>
        </h2>
        <div className="status-filter-group">
          {/* Sorting */}
          <Button
            variant="outline"
            className={cn('status-filter-pill')}
            onClick={() => setSortBy(prev => prev === 'date_desc' ? 'date_asc' : 'date_desc')}
          >
            <Filter className="size-4" />
            {sortBy === 'date_desc' ? ' ' : ' '}
          </Button>
          {/* Status filter pills */}
          <div className="status-filter-group">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn('status-filter-pill', f.value === statusFilter && 'status-filter-pill-active')}
              >
                {f.label}
              </Button>
            ))}
          </div>
          {/* Search */}
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search purchases..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
            {query && (
              <Button
                onClick={() => setQuery('')}
                className="search-clear"
                aria-label="Clear search"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="data-table-wrap lg:block hidden">
        <div className="data-table-scroll">
          <Table className="data-table">
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="data-table-head-row">
                <TableHead className="data-th text-left">Purchase No</TableHead>
                <TableHead className="data-th text-left">Vendor</TableHead>
                <TableHead className="data-th text-left">Vehicle Details</TableHead>
                <TableHead className="data-th text-right">Purchase Price</TableHead>
                <TableHead className="data-th text-right">Balance</TableHead>
                <TableHead className="data-th text-left">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((purchase) => (
                <TableRow
                  key={purchase.id}
                  onClick={() => router.push(`/vehicles/${purchase.vehicle_id}/purchase-contract`)}
                  className="data-table-row cursor-pointer hover:bg-gray-50/80 transition-colors"
                >
                  <TableCell className="data-td">
                    <span className="mono-pill">{purchase.purchase_no || `PUR-${purchase.id.slice(0, 6).toUpperCase()}`}</span>
                  </TableCell>
                  <TableCell className="data-td">
                    <div className="flex flex-col">
                      <span className="client-name">{purchase.seller_name}</span>
                      <span className="text-12 text-slate-500">{purchase.seller_phone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="data-td">
                    <div className="flex flex-col">
                      <span className="text-14 text-slate-700 font-semibold">{purchase.vehicle?.registration_no || 'N/A'}</span>
                      <span className="text-12 text-gray-500">{purchase.vehicle?.make_model || 'Vehicle'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="data-td text-right">
                    <span className="amount-text">{formatAmount(purchase.purchase_price || 0)}</span>
                  </TableCell>
                  <TableCell className="data-td text-right">
                    <span className="amount-text">{formatAmount(purchase.balance || 0)}</span>
                  </TableCell>
                  <TableCell className="data-td">
                    <span className={cn('badge', {
                      'badge-success': purchase.status === 'Active',
                      'badge-completed': purchase.status === 'Fully Paid',
                    })}>
                      {purchase.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="data-empty-cell">
                    <div className="data-empty">
                      <Car className="size-8 text-gray-300" />
                      <p className="text-14 text-gray-600 font-medium mt-2">
                        {query || statusFilter !== 'All' ? 'No purchases match your filters' : 'No purchases found'}
                      </p>
                      <p className="text-12 text-gray-400">
                        {query || statusFilter !== 'All' ? 'Try adjusting your search or status filter.' : 'Created vehicle purchases will appear here.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>


      {/* Mobile + Tablet Responsive Cards (Visible on md/sm, hidden on lg) */}
      <TableResponsiveGrid
        className="
          lg:hidden
          mt-8
          mb-10
          gap-5
          p-6
        "
      >
        {filtered.map((purchase: any) => {
          const isOpen = expandedId === purchase.id;

          return (
            <TableResponsiveCard
              key={purchase.id}
              className="
                overflow-hidden
                rounded-3xl
                border border-slate-200/70
                bg-white
                shadow-sm
                transition-all duration-300
                hover:shadow-lg
                hover:shadow-slate-200/50
                p-5
                cursor-pointer
              "
            >
              {/* Header */}
              <TableResponsiveCardHeader
                onClick={() => setExpandedId(isOpen ? null : purchase.id)}
                className="
                  p-5
                  cursor-pointer
                  flex
                  items-start
                  justify-between
                "
              >
                <div className="flex gap-4 min-w-0">

                  {/* Avatar */}
                  <div
                    className="
                      flex
                      items-center
                      justify-center
                      shrink-0
                      h-12
                      w-12
                      rounded-full
                      bg-gradient-to-br
                      from-slate-100
                      to-slate-200
                      text-slate-700
                      font-bold
                      shadow-sm
                    "
                  >
                    {purchase.seller_name?.[0] || "?"}
                  </div>

                  {/* Client Info */}
                  <div className="min-w-0 flex flex-col justify-center">
                    <h3 className="font-semibold text-[15px] text-slate-900 truncate">
                      {purchase.seller_name || "Unknown Vendor"}
                    </h3>

                    <p className="text-sm font-medium text-slate-600 truncate mt-0.5">
                      {purchase.vehicle?.registration_no || "No vehicle linked"}
                    </p>

                    <div className="mt-2">
                      <span
                        className={cn(
                          "badge inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide",
                          {
                            "bg-green-50 text-green-700": purchase.status === "Active",
                            "bg-blue-50 text-blue-700": purchase.status === "Fully Paid",
                          }
                        )}
                      >
                        {purchase.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expand Icon */}
                <div
                  className="
                    flex
                    items-center
                    shrink-0
                    text-slate-400
                    transition-transform
                    duration-200
                    ease-out
                    data-[state=open]:rotate-180
                  "
                >
                  {isOpen ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </div>
              </TableResponsiveCardHeader>

              {/* Expandable Content */}
              <TableResponsiveCardContent isOpen={isOpen}>
                <div className="px-5 pb-5">

                  {/* Summary Box */}
                  <div
                    className="
                      rounded-2xl
                      bg-slate-50
                      p-4
                      grid
                      gap-4
                    "
                  >
                    <div className="flex justify-between items-center px-1">
                      <span className="text-sm text-slate-500">
                        Purchase No
                      </span>

                      <span
                        className="
                          badge
                          rounded-lg
                          bg-slate-100
                          px-2.5
                          py-1
                          text-xs
                          font-mono
                          border
                          text-slate-700
                        "
                      >
                        {purchase.purchase_no || `PUR-${purchase.id.slice(0, 6).toUpperCase()}`}
                      </span>
                    </div>

                    <div className="flex justify-between items-center px-1">
                      <span className="text-sm text-slate-500">
                        Purchase Price
                      </span>

                      <span className="font-bold text-slate-900">
                        KES {formatAmount(purchase.purchase_price || 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center px-1">
                      <span className="text-sm text-slate-500">
                        Amount Paid
                      </span>

                      <span className="font-bold text-emerald-600">
                        KES {formatAmount(purchase.amount_paid || 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center px-1 border-t border-slate-200/60 pt-3">
                      <span className="text-sm text-slate-500 font-semibold">
                        Payable Balance
                      </span>

                      <span className="font-bold text-slate-900">
                        KES {formatAmount(purchase.balance || 0)}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-5">
                    <Button
                      asChild
                      className="btn-primary w-full h-11 rounded-2xl justify-center"
                    >
                      <Link href={`/vehicles/${purchase.vehicle_id}/purchase-contract`}>
                        <FileText className="size-4 mr-2" />
                        Purchase Contract
                      </Link>
                    </Button>
                  </div>

                </div>
              </TableResponsiveCardContent>
            </TableResponsiveCard>
          );
        })}

        {filtered.length === 0 && (
          <div
            className="
              rounded-3xl
              border
              border-slate-200
              bg-white
              p-10
              text-center
              shadow-sm
              mx-auto
              mt-10
            "
          >
            <Car className="size-10 mx-auto mb-3 text-slate-300" />

            <h3 className="font-semibold text-slate-700">
              No Purchases Found
            </h3>

            <p className="text-sm text-slate-400 mt-1">
              Created vehicle purchases will appear here
            </p>

          </div>
        )}
      </TableResponsiveGrid>
    </div>
  );
}
