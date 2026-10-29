'use client'

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, CreditCard, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface Agreement {
  $id: string;
  clientName: string;
  clientId: string;
  loanType: string;
  principalAmount: number;
  status: string;
  startDate?: string;
  $createdAt?: string;
  vehicleRegNo?: string;
}

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

// DB enum values: Pending | Active | Overdue | Substandard | Defaulting | Loss | Fully Paid | Written Off | Denied
const STATUS_FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'Active', label: 'Active' },
  { value: 'Cash Sale', label: 'Cash Sale' },
  { value: 'Overdue', label: 'Overdue (7–30d)' },
  { value: 'Substandard', label: 'Substandard (31–60d)' },
  { value: 'Defaulting', label: 'Defaulting (60–90d)' },
  { value: 'Loss', label: 'Loss (>90d)' },
  { value: 'Fully Paid', label: 'Fully Paid' },
  { value: 'Written Off', label: 'Written Off' },
] as const;

export default function LoansTable({ loans }: { loans: Agreement[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'disbursement' | 'created'>('disbursement');


  const filtered = useMemo(() => {
    const result = loans.filter((loan) => {
      const matchesStatus = statusFilter === 'All' || loan.status === statusFilter;
      if (!query.trim()) return matchesStatus;
      const q = query.toLowerCase();
      const matchesQuery =
        loan.clientName?.toLowerCase().includes(q) ||
        loan.loanType?.toLowerCase().includes(q) ||
        loan.$id?.toLowerCase().includes(q) ||
        loan.vehicleRegNo?.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });

    if (sortBy === 'disbursement') {
      result.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        const createdA = a.$createdAt ? new Date(a.$createdAt).getTime() : 0;
        const createdB = b.$createdAt ? new Date(b.$createdAt).getTime() : 0;
        return createdB - createdA;
      });
    } else if (sortBy === 'created') {
      result.sort((a, b) => {
        const dateA = a.$createdAt ? new Date(a.$createdAt).getTime() : 0;
        const dateB = b.$createdAt ? new Date(b.$createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return result;
  }, [loans, query, statusFilter, sortBy]);

  return (
    <div className="flex flex-col gap-5 mt-6">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        <h2 className="text-18 font-semibold text-gray-900 tracking-tight">
          All Agreements
          <span className="ml-2 text-14 font-normal text-gray-400"> ({filtered.length})</span>
        </h2>
        <div className="status-filter-group">
          {/* Sorting */}
          <Button
            variant="outline"
            className={cn('status-filter-pill')}
            onClick={() => setSortBy(prev => prev === 'disbursement' ? 'created' : 'disbursement')}
          >
            <Filter className="size-4" />
            {sortBy === 'disbursement' ? ' ' : ' '}
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
              placeholder="Search contracts..."
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
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="data-table-head-row">
                <TableHead className="data-th text-left">Contract ID</TableHead>
                <TableHead className="data-th text-left">Client</TableHead>
                <TableHead className="data-th text-left">Vehicle Reg</TableHead>
                <TableHead className="data-th text-left">Type</TableHead>
                <TableHead className="data-th text-right">Amount</TableHead>
                <TableHead className="data-th text-left">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((loan) => (
                <TableRow
                  key={loan.$id}
                  onClick={() => router.push(`/loans/${loan.$id}`)}
                  className="data-table-row cursor-pointer hover:bg-gray-50/80 transition-colors"
                >
                  <TableCell className="data-td">
                    <span className="mono-pill">{loan.$id.slice(-8).toUpperCase()}</span>
                  </TableCell>
                  <TableCell className="data-td">
                    <span className="client-name">{loan.clientName || loan.clientId}</span>
                  </TableCell>
                  <TableCell className="data-td">
                    <span className="text-14 text-slate-700 font-semibold">{loan.vehicleRegNo || 'N/A'}</span>
                  </TableCell>
                  <TableCell className="data-td">
                    <span className="text-14 text-gray-600 font-medium">{loan.loanType}</span>
                  </TableCell>
                  <TableCell className="data-td text-right">
                    <span className="amount-text">{formatAmount(loan.principalAmount || 0)}</span>
                  </TableCell>
                  <TableCell className="data-td">
                    <span className={cn('badge', {
                      'badge-success': loan.status === 'Active',
                      'badge-pending': loan.status === 'Pending',
                      'badge-warning': ['Overdue', 'Substandard'].includes(loan.status),
                      'badge-error': ['Defaulting', 'Loss', 'Denied'].includes(loan.status),
                      'badge-neutral': loan.status === 'Written Off',
                      'badge-completed': ['Completed', 'Fully Paid', 'Cash Sale'].includes(loan.status),
                    })}>
                      {loan.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="data-empty-cell">
                    <div className="data-empty">
                      <CreditCard className="size-8 text-gray-300" />
                      <p className="text-14 text-gray-600 font-medium mt-2">
                        {query || statusFilter !== 'All' ? 'No agreements match your filters' : 'No agreements found'}
                      </p>
                      <p className="text-12 text-gray-400">
                        {query || statusFilter !== 'All' ? 'Try adjusting your search or status filter.' : 'Created agreements will appear here.'}
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
        {filtered.map((loan: any) => {
          const isOpen = expandedId === loan.$id;

          return (
            <TableResponsiveCard
              key={loan.$id}
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
                onClick={() => setExpandedId(isOpen ? null : loan.$id)}
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
                    {loan.clientName?.[0] || "?"}
                  </div>

                  {/* Client Info */}
                  <div className="min-w-0 flex flex-col justify-center">
                    <h3 className="font-semibold text-[15px] text-slate-900 truncate">
                      {loan.clientName || "Unknown Client"}
                    </h3>

                    <p className="text-sm font-medium text-slate-600 truncate mt-0.5">
                      {loan.vehicleRegNo || "No vehicle linked"}
                    </p>

                    <div className="mt-2">
                      <span
                        className={cn(
                          "badge inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide",
                          {
                            "bg-green-50 text-green-700": loan.status === "Active",
                            "bg-amber-50 text-amber-700": loan.status === "Pending" || loan.status === "Overdue" || loan.status === "Substandard",
                            "bg-red-50 text-red-700": ['Defaulting', 'Loss', 'Denied'].includes(loan.status),
                            "bg-gray-100 text-gray-700": loan.status === "Written Off",
                            "bg-blue-50 text-blue-700": loan.status === "Completed" || loan.status === "Fully Paid" || loan.status === "Cash Sale",
                          }
                        )}
                      >
                        {loan.status}
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
                        Contract ID
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
                        {loan.$id.slice(-8).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center px-1">
                      <span className="text-sm text-slate-500">
                        Amount
                      </span>

                      <span className="font-bold text-slate-900">
                        {formatAmount(
                          loan.principalAmount || 0
                        )}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-5">
                    <Button
                      asChild
                      className="btn-primary w-full h-11 rounded-2xl justify-center"
                    >
                      <Link href={`/loans/${loan.$id}`}>
                        View Details
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
            <CreditCard className="size-10 mx-auto mb-3 text-slate-300" />

            <h3 className="font-semibold text-slate-700">
              No Agreements Found
            </h3>

            <p className="text-sm text-slate-400 mt-1">
              Created agreements will appear here
            </p>

          </div>
        )}
      </TableResponsiveGrid>
    </div>


  );
}
