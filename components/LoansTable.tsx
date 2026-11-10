'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  CreditCard,
  Download,
  Wallet,
  Activity,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  Calendar,
  Car,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  TrendingDown,
  X,
  Phone,
  FileText,
  Clock,
  Layers,
  ArrowUpDown,
  Building2,
  User,
} from 'lucide-react';
import { formatAmount, cn } from '@/lib/utils';
import { Button } from './ui/button';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableFooter,
} from '@/components/ui/table';

export interface Agreement {
  $id: string;
  clientName: string;
  clientId?: string;
  loanType: string;
  principalAmount: number;
  status: string;
  startDate?: string;
  $createdAt?: string;
  vehicleRegNo?: string;

  // Rich Business Details
  contractNo?: string;
  balance?: number;
  salePrice?: number;
  depositPaid?: number;
  monthlyDue?: number;
  durationMonths?: number;
  daysOverdue?: number;
  totalPenalties?: number;
  vehicleMakeModel?: string;
  clientPhone?: string;
  clientIdNumber?: string;
  lastPaymentDate?: string | null;
  endDate?: string;
}

interface LoansTableProps {
  loans: Agreement[];
  showMetrics?: boolean;
}

/**
 * Format dates safely without timezone shifts
 */
function formatDisplayDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return dateObj.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Africa/Nairobi',
  });
}

export default function LoansTable({ loans, showMetrics = true }: LoansTableProps) {
  const router = useRouter();

  // Persisted search, filters, and sorting
  const [query, setQuery] = usePersistedState('dms_loans_query', '');
  const [statusFilter, setStatusFilter] = usePersistedState<string>('dms_loans_status', 'All');
  const [typeFilter, setTypeFilter] = usePersistedState<string>('dms_loans_type', 'all');
  const [sortBy, setSortBy] = usePersistedState<string>('dms_loans_sort', 'newest');
  const [pageSize, setPageSize] = usePersistedState<string>('dms_loans_pagesize', '15');

  // Pagination & expandable detail states
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── 1. Executive Business Metrics Calculation ────────────────
  const metrics = useMemo(() => {
    let totalPrincipal = 0;
    let totalOutstanding = 0;
    let activeReceivables = 0;
    let activeCount = 0;
    let atRiskBalance = 0;
    let atRiskCount = 0;
    let overdueCount = 0;
    let defaultingCount = 0;
    let lossCount = 0;
    let settledAmount = 0;
    let settledCount = 0;

    loans.forEach((loan) => {
      const principal = Number(loan.principalAmount) || 0;
      const balance = Number(loan.balance) || 0;
      const status = loan.status;

      totalPrincipal += principal;
      totalOutstanding += balance;

      if (status === 'Active') {
        activeReceivables += balance;
        activeCount++;
      } else if (['Overdue', 'Substandard', 'Defaulting', 'Loss'].includes(status)) {
        atRiskBalance += balance;
        atRiskCount++;
        if (status === 'Overdue' || status === 'Substandard') overdueCount++;
        else if (status === 'Defaulting') defaultingCount++;
        else if (status === 'Loss') lossCount++;
      } else if (['Completed', 'Fully Paid', 'Cash Sale'].includes(status)) {
        settledAmount += principal;
        settledCount++;
      }
    });

    const totalAccounts = loans.length || 1;
    const activePct = Math.round((activeCount / totalAccounts) * 100);
    const atRiskPct = Math.round((atRiskCount / totalAccounts) * 100);
    const settledPct = Math.round((settledCount / totalAccounts) * 100);

    return {
      totalPrincipal,
      totalOutstanding,
      activeReceivables,
      activeCount,
      atRiskBalance,
      atRiskCount,
      overdueCount,
      defaultingCount,
      lossCount,
      settledAmount,
      settledCount,
      activePct,
      atRiskPct,
      settledPct,
    };
  }, [loans]);

  // ── 2. Filtering Logic ──────────────────────────────────────
  const filtered = useMemo(() => {
    return loans.filter((loan) => {
      // Status Filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'At-Risk') {
          if (!['Overdue', 'Substandard', 'Defaulting', 'Loss'].includes(loan.status)) return false;
        } else if (loan.status !== statusFilter) {
          return false;
        }
      }

      // Contract Type Filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'hire_purchase' && loan.loanType !== 'Hire Purchase') return false;
        if (typeFilter === 'cash_sale' && loan.loanType !== 'Cash Sale') return false;
      }

      // Search Query
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchesClient = loan.clientName?.toLowerCase().includes(q);
        const matchesPhone = loan.clientPhone?.toLowerCase().includes(q);
        const matchesIdNum = loan.clientIdNumber?.toLowerCase().includes(q);
        const matchesReg = loan.vehicleRegNo?.toLowerCase().includes(q);
        const matchesMake = loan.vehicleMakeModel?.toLowerCase().includes(q);
        const matchesContract = loan.contractNo?.toLowerCase().includes(q);
        const matchesId = loan.$id?.toLowerCase().includes(q);

        if (
          !matchesClient &&
          !matchesPhone &&
          !matchesIdNum &&
          !matchesReg &&
          !matchesMake &&
          !matchesContract &&
          !matchesId
        ) {
          return false;
        }
      }

      return true;
    });
  }, [loans, query, statusFilter, typeFilter]);

  // ── 3. Sorting Logic ────────────────────────────────────────
  const sorted = useMemo(() => {
    const list = [...filtered];

    switch (sortBy) {
      case 'newest':
        return list.sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          if (dateA !== dateB) return dateB - dateA;
          const crA = a.$createdAt ? new Date(a.$createdAt).getTime() : 0;
          const crB = b.$createdAt ? new Date(b.$createdAt).getTime() : 0;
          return crB - crA;
        });
      case 'oldest':
        return list.sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          if (dateA !== dateB) return dateA - dateB;
          const crA = a.$createdAt ? new Date(a.$createdAt).getTime() : 0;
          const crB = b.$createdAt ? new Date(b.$createdAt).getTime() : 0;
          return crA - crB;
        });
      case 'balance_desc':
        return list.sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));
      case 'balance_asc':
        return list.sort((a, b) => (Number(a.balance) || 0) - (Number(b.balance) || 0));
      case 'principal_desc':
        return list.sort((a, b) => (Number(b.principalAmount) || 0) - (Number(a.principalAmount) || 0));
      case 'dpd_desc':
        return list.sort((a, b) => (Number(b.daysOverdue) || 0) - (Number(a.daysOverdue) || 0));
      default:
        return list;
    }
  }, [filtered, sortBy]);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, typeFilter, pageSize]);

  // ── 4. Pagination & Subtotals ────────────────────────────────
  const size = parseInt(pageSize, 10) || 15;
  const totalPages = Math.ceil(sorted.length / size) || 1;

  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * size;
    return sorted.slice(start, start + size);
  }, [sorted, currentPage, size]);

  const filteredSubtotals = useMemo(() => {
    return sorted.reduce(
      (acc, curr) => {
        acc.principal += Number(curr.principalAmount) || 0;
        acc.balance += Number(curr.balance) || 0;
        return acc;
      },
      { principal: 0, balance: 0 }
    );
  }, [sorted]);

  const pageSubtotals = useMemo(() => {
    return paginatedLoans.reduce(
      (acc, curr) => {
        acc.principal += Number(curr.principalAmount) || 0;
        acc.balance += Number(curr.balance) || 0;
        return acc;
      },
      { principal: 0, balance: 0 }
    );
  }, [paginatedLoans]);

  // ── 5. CSV Export ───────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      'Contract No',
      'Client Name',
      'Phone',
      'National ID',
      'Vehicle Reg',
      'Make & Model',
      'Contract Type',
      'Financed Principal (KES)',
      'Deposit Paid (KES)',
      'Outstanding Balance (KES)',
      'Monthly Due (KES)',
      'Days Overdue (DPD)',
      'Status',
      'Start Date',
      'End Date',
    ];

    const rows = sorted.map((l) => [
      `"${l.contractNo || l.$id.slice(-8).toUpperCase()}"`,
      `"${(l.clientName || '').replace(/"/g, '""')}"`,
      `"${l.clientPhone || ''}"`,
      `"${l.clientIdNumber || ''}"`,
      `"${l.vehicleRegNo || ''}"`,
      `"${(l.vehicleMakeModel || '').replace(/"/g, '""')}"`,
      `"${l.loanType}"`,
      l.principalAmount || 0,
      l.depositPaid || 0,
      l.balance || 0,
      l.monthlyDue || 0,
      l.daysOverdue || 0,
      `"${l.status}"`,
      `"${l.startDate || ''}"`,
      `"${l.endDate || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ebenezar_Agreements_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col gap-6 mt-4">
      {/* ── A. Executive Financial & Risk KPI Overview ─────────── */}
      {showMetrics && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Receivables */}
            <div
              onClick={() => setStatusFilter((prev) => (prev === 'Active' ? 'All' : 'Active'))}
              className={cn(
                'card-premium p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-200 border',
                statusFilter === 'Active'
                  ? 'ring-2 ring-emerald-500/50 border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                  : 'hover:border-slate-300 dark:hover:border-[#29352D]'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4]">
                  Active Receivables
                </span>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <Wallet className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums">
                  Ksh {metrics.activeReceivables.toLocaleString()}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-slate-500 dark:text-[#A1ADA4]">
                    {metrics.activeCount} performing accounts
                  </span>
                  <span className="badge text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40">
                    Servicing
                  </span>
                </div>
              </div>
            </div>

            {/* Total Financed Portfolio */}
            <div
              onClick={() => setStatusFilter('All')}
              className={cn(
                'card-premium p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-200 border',
                statusFilter === 'All'
                  ? 'ring-2 ring-blue-500/50 border-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20'
                  : 'hover:border-slate-300 dark:hover:border-[#29352D]'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4]">
                  Total Financed Portfolio
                </span>
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <Layers className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums">
                  Ksh {metrics.totalPrincipal.toLocaleString()}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-slate-500 dark:text-[#A1ADA4]">
                    {loans.length} total lifetime contracts
                  </span>
                  <span className="badge text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                    Gross Capital
                  </span>
                </div>
              </div>
            </div>

            {/* At-Risk & Delinquent Capital */}
            <div
              onClick={() => setStatusFilter((prev) => (prev === 'At-Risk' ? 'All' : 'At-Risk'))}
              className={cn(
                'card-premium p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-200 border',
                statusFilter === 'At-Risk'
                  ? 'ring-2 ring-rose-500/50 border-rose-500/50 bg-rose-50/20 dark:bg-rose-950/20'
                  : 'hover:border-slate-300 dark:hover:border-[#29352D]'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4]">
                  At-Risk Delinquency
                </span>
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums">
                  Ksh {metrics.atRiskBalance.toLocaleString()}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-slate-500 dark:text-[#A1ADA4]">
                    {metrics.atRiskCount} past due ({metrics.overdueCount} ovd • {metrics.defaultingCount} def)
                  </span>
                  <span className="badge text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40">
                    Action Required
                  </span>
                </div>
              </div>
            </div>

            {/* Settled / Realized Capital */}
            <div
              onClick={() => setStatusFilter((prev) => (prev === 'Fully Paid' ? 'All' : 'Fully Paid'))}
              className={cn(
                'card-premium p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all duration-200 border',
                statusFilter === 'Fully Paid'
                  ? 'ring-2 ring-sky-500/50 border-sky-500/50 bg-sky-50/20 dark:bg-sky-950/20'
                  : 'hover:border-slate-300 dark:hover:border-[#29352D]'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4]">
                  Fully Settled Accounts
                </span>
                <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums">
                  Ksh {metrics.settledAmount.toLocaleString()}
                </h3>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-slate-500 dark:text-[#A1ADA4]">
                    {metrics.settledCount} fully collected & settled
                  </span>
                  <span className="badge text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-900/40">
                    Settled
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── B. Smart Search & Filter Toolbar ──────────────────── */}
      <div className="card-premium p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box - Fills 100% on mobile, flex-1 on desktop */}
          <div className="search-box w-full lg:flex-1 min-w-0">
            <Search className="search-icon size-4 text-slate-400 dark:text-[#A1ADA4] pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by client, phone, ID, reg, vehicle make, or contract #..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input input-class h-10 w-full !pl-10 !pr-9 text-xs bg-white dark:bg-[#101612] border-slate-200 dark:border-[#29352D]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-[#F4F7F4] cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filtering Dropdowns & Actions */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            {/* Status Filter */}
            <div className="w-full sm:w-auto sm:min-w-[210px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="input-class h-10 w-full sm:w-auto min-w-full text-xs !px-3.5 [&>svg]:!pr-0 [&>span]:!line-clamp-none whitespace-nowrap bg-white dark:bg-[#101612] border-slate-200 dark:border-[#29352D] gap-2.5 justify-between">
                  <SelectValue placeholder="Status..." />
                </SelectTrigger>
                <SelectContent className="z-50 min-w-[230px] max-h-[320px]">
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Active">Active (Performing)</SelectItem>
                  <SelectItem value="At-Risk">All At-Risk / Delinquent</SelectItem>
                  <SelectGroup>
                    <SelectLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4]">
                      Aging Buckets
                    </SelectLabel>
                    <SelectItem value="Overdue">Overdue (7–30d)</SelectItem>
                    <SelectItem value="Substandard">Substandard (31–60d)</SelectItem>
                    <SelectItem value="Defaulting">Defaulting (61–90d)</SelectItem>
                    <SelectItem value="Loss">Loss (&gt;90d)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4]">
                      Settled & Other
                    </SelectLabel>
                    <SelectItem value="Fully Paid">Fully Paid</SelectItem>
                    <SelectItem value="Cash Sale">Cash Sale</SelectItem>
                    <SelectItem value="Written Off">Written Off</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Contract Type Filter */}
            <div className="w-full sm:w-auto sm:min-w-[170px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="input-class h-10 w-full sm:w-auto min-w-full text-xs !px-3.5 [&>svg]:!pr-0 [&>span]:!line-clamp-none whitespace-nowrap bg-white dark:bg-[#101612] border-slate-200 dark:border-[#29352D] gap-2.5 justify-between">
                  <SelectValue placeholder="Contract Type..." />
                </SelectTrigger>
                <SelectContent className="z-50 min-w-[190px]">
                  <SelectItem value="all">All Contract Types</SelectItem>
                  <SelectItem value="hire_purchase">Hire Purchase</SelectItem>
                  <SelectItem value="cash_sale">Cash Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="w-full sm:w-auto sm:min-w-[200px]">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="input-class h-10 w-full sm:w-auto min-w-full text-xs !px-3.5 [&>svg]:!pr-0 [&>span]:!line-clamp-none whitespace-nowrap bg-white dark:bg-[#101612] border-slate-200 dark:border-[#29352D] gap-2.5 justify-between">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent className="z-50 min-w-[220px]">
                  <SelectItem value="newest">Date: Newest First</SelectItem>
                  <SelectItem value="oldest">Date: Oldest First</SelectItem>
                  <SelectItem value="balance_desc">Balance: Highest First</SelectItem>
                  <SelectItem value="balance_asc">Balance: Lowest First</SelectItem>
                  <SelectItem value="principal_desc">Financed: Highest First</SelectItem>
                  <SelectItem value="dpd_desc">Days Overdue (DPD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-secondary h-10 px-4 text-xs flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-xs w-full sm:w-auto shrink-0"
              title="Download filtered agreements as CSV spreadsheet"
            >
              <Download className="size-3.5 text-slate-500 dark:text-[#A1ADA4]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Status & Subtotal Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-[#29352D] text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-[#A1ADA4]">
            <span>
              Showing <strong className="text-slate-900 dark:text-[#F4F7F4]">{filtered.length}</strong> of{' '}
              <strong className="text-slate-900 dark:text-[#F4F7F4]">{loans.length}</strong> agreements
            </span>
            {(query || statusFilter !== 'All' || typeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setStatusFilter('All');
                  setTypeFilter('all');
                  setSortBy('newest');
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-2 cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-[#A1ADA4]">Financed Total:</span>
              <span className="font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums">
                Ksh {filteredSubtotals.principal.toLocaleString()}
              </span>
            </div>
            <div className="h-3 w-px bg-slate-200 dark:bg-[#29352D]" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-[#A1ADA4]">Outstanding Total:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                Ksh {filteredSubtotals.balance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── C. Desktop Data Table (Optimised for 1280px, 1366px, 1440px+) ─ */}
      <div className="data-table-wrap hidden xl:block">
        <div className="data-table-scroll">
          <Table className="data-table">
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '4%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="data-table-head-row sticky top-0 z-10 bg-slate-50/95 dark:bg-[#101612]/95 backdrop-blur-xs">
                <TableHead className="data-th text-left">Contract ID</TableHead>
                <TableHead className="data-th text-left">Client Details</TableHead>
                <TableHead className="data-th text-left">Vehicle Details</TableHead>
                <TableHead className="data-th text-left">Plan / Type</TableHead>
                <TableHead className="data-th text-right">Financed (Principal)</TableHead>
                <TableHead className="data-th text-right">Balance Due</TableHead>
                <TableHead className="data-th text-left">Status & Aging</TableHead>
                <TableHead className="data-th text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="data-empty-cell py-12">
                    <div className="data-empty text-center">
                      <CreditCard className="size-10 text-gray-300 mx-auto" />
                      <p className="text-14 text-gray-600 dark:text-[#C1CBC3] font-semibold mt-2">
                        {loans.length === 0 ? 'No agreements found.' : 'No agreements match your search/filters.'}
                      </p>
                      <p className="text-12 text-gray-400 mt-0.5">
                        {loans.length === 0
                          ? 'Created financing contracts will appear here.'
                          : 'Try clearing your search query or setting the status filter to "All Statuses".'}
                      </p>
                      {loans.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuery('');
                            setStatusFilter('All');
                            setTypeFilter('all');
                          }}
                          className="btn-secondary h-8 px-3 text-xs mt-3 inline-flex items-center gap-1 cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLoans.map((loan) => {
                  const dpd = Number(loan.daysOverdue) || 0;
                  const isDelinquent = dpd > 0 || ['Overdue', 'Substandard', 'Defaulting', 'Loss'].includes(loan.status);

                  return (
                    <TableRow
                      key={loan.$id}
                      onClick={() => router.push(`/loans/${loan.$id}`)}
                      className="data-table-row cursor-pointer hover:bg-gray-50/80 dark:hover:bg-[#1D2920]/60 transition-colors"
                      title="Click to view full contract details and repayment history"
                    >
                      {/* Contract ID */}
                      <TableCell className="data-td">
                        <span className="mono-pill font-roboto text-xs">
                          {loan.contractNo || loan.$id.slice(-8).toUpperCase()}
                        </span>
                        <div className="text-[11px] text-slate-400 dark:text-[#A1ADA4] mt-0.5">
                          {formatDisplayDate(loan.startDate || loan.$createdAt)}
                        </div>
                      </TableCell>

                      {/* Client Details */}
                      <TableCell className="data-td">
                        <span className="client-name text-gray-900 dark:text-[#F4F7F4] font-semibold block truncate">
                          {loan.clientName || 'Unknown Client'}
                        </span>
                        {loan.clientPhone ? (
                          <span className="text-[11px] text-slate-500 dark:text-[#A1ADA4] flex items-center gap-1 mt-0.5">
                            <Phone className="size-3 opacity-60 shrink-0" />
                            <span className="truncate">{loan.clientPhone}</span>
                          </span>
                        ) : loan.clientIdNumber ? (
                          <span className="text-[11px] text-slate-400 dark:text-[#A1ADA4] truncate block mt-0.5">
                            ID: {loan.clientIdNumber}
                          </span>
                        ) : null}
                      </TableCell>

                      {/* Vehicle Details */}
                      <TableCell className="data-td">
                        <span className="text-14 font-mono font-bold text-slate-900 dark:text-[#F4F7F4] block truncate">
                          {loan.vehicleRegNo || 'N/A'}
                        </span>
                        {loan.vehicleMakeModel && (
                          <span className="text-[11px] text-slate-500 dark:text-[#A1ADA4] truncate block mt-0.5">
                            {loan.vehicleMakeModel}
                          </span>
                        )}
                      </TableCell>

                      {/* Plan / Type */}
                      <TableCell className="data-td">
                        <span className="text-xs font-medium text-slate-700 dark:text-[#C1CBC3] block">
                          {loan.loanType}
                        </span>
                        {loan.durationMonths && loan.durationMonths > 0 ? (
                          <span className="text-[11px] text-slate-400 dark:text-[#A1ADA4]">
                            {loan.durationMonths} months
                          </span>
                        ) : null}
                      </TableCell>

                      {/* Financed Principal */}
                      <TableCell className="data-td text-right">
                        <span className="amount-text font-medium text-sm text-slate-700 dark:text-[#C1CBC3] tabular-nums block">
                          Ksh {Number(loan.principalAmount || 0).toLocaleString()}
                        </span>
                        {loan.depositPaid && loan.depositPaid > 0 ? (
                          <span className="text-[11px] text-slate-400 dark:text-[#A1ADA4] block">
                            Dep: Ksh {Number(loan.depositPaid).toLocaleString()}
                          </span>
                        ) : null}
                      </TableCell>

                      {/* Balance Due */}
                      <TableCell className="data-td text-right">
                        <span
                          className={cn(
                            'amount-text font-bold text-sm tabular-nums block',
                            Number(loan.balance || 0) === 0
                              ? 'text-slate-400 dark:text-[#A1ADA4]'
                              : isDelinquent
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-900 dark:text-[#F4F7F4]'
                          )}
                        >
                          Ksh {Number(loan.balance || 0).toLocaleString()}
                        </span>
                        {loan.monthlyDue && loan.monthlyDue > 0 ? (
                          <span className="text-[11px] text-slate-500 dark:text-[#A1ADA4] block">
                            Due: Ksh {Number(loan.monthlyDue).toLocaleString()}/mo
                          </span>
                        ) : null}
                      </TableCell>

                      {/* Status & Aging */}
                      <TableCell className="data-td">
                        <span
                          className={cn('badge text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-block', {
                            'badge-success': loan.status === 'Active',
                            'badge-pending': ['Pending', 'Overdue', 'Substandard'].includes(loan.status),
                            'badge-error': ['Defaulting', 'Loss', 'Denied'].includes(loan.status),
                            'badge-completed': ['Completed', 'Fully Paid', 'Cash Sale'].includes(loan.status),
                            'bg-gray-100 text-gray-700 dark:bg-[#1D2920] dark:text-[#C1CBC3] border border-gray-200 dark:border-[#29352D]':
                              loan.status === 'Written Off',
                          })}
                        >
                          {loan.status}
                        </span>
                        {dpd > 0 && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block mt-1">
                            {dpd} Days Past Due
                          </span>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="data-td text-center">
                        <span className="inline-flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-[#F4F7F4] hover:bg-slate-100 dark:hover:bg-[#1D2920] transition-colors">
                          <ArrowUpRight className="size-4" />
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {paginatedLoans.length > 0 && (
              <TableFooter className="bg-slate-50/80 dark:bg-[#18221A] border-t border-slate-200 dark:border-[#29352D] font-semibold text-xs">
                <TableRow>
                  <TableCell colSpan={4} className="py-3 px-4 text-slate-600 dark:text-[#C1CBC3]">
                    Page Subtotal ({paginatedLoans.length} of {filtered.length} entries):
                  </TableCell>
                  <TableCell className="py-3 px-4 text-right text-slate-700 dark:text-[#C1CBC3] font-bold tabular-nums">
                    Ksh {pageSubtotals.principal.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-3 px-4 text-right text-slate-900 dark:text-[#F4F7F4] font-bold tabular-nums">
                    Ksh {pageSubtotals.balance.toLocaleString()}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>

      {/* ── D. Tablet Optimized Responsive Table (768px – 1279px) ── */}
      <div className="hidden md:block xl:hidden data-table-wrap">
        <div className="data-table-scroll">
          <Table className="data-table">
            <TableHeader>
              <TableRow className="data-table-head-row bg-slate-50/95 dark:bg-[#101612]/95">
                <TableHead className="data-th text-left">Contract / Client</TableHead>
                <TableHead className="data-th text-left">Vehicle</TableHead>
                <TableHead className="data-th text-right">Balance Due</TableHead>
                <TableHead className="data-th text-left">Status</TableHead>
                <TableHead className="data-th text-center w-12">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="data-empty-cell py-10 text-center">
                    <p className="text-14 text-gray-600 dark:text-[#C1CBC3]">No agreements found matching criteria.</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLoans.map((loan) => {
                  const isOpen = expandedId === loan.$id;
                  const dpd = Number(loan.daysOverdue) || 0;

                  return (
                    <React.Fragment key={loan.$id}>
                      <TableRow
                        onClick={() => setExpandedId(isOpen ? null : loan.$id)}
                        className="data-table-row cursor-pointer hover:bg-gray-50/80 dark:hover:bg-[#1D2920]/60 transition-colors"
                      >
                        {/* Contract / Client */}
                        <TableCell className="data-td">
                          <span className="mono-pill font-mono text-[11px] mb-1 inline-block">
                            {loan.contractNo || loan.$id.slice(-8).toUpperCase()}
                          </span>
                          <span className="client-name text-gray-900 dark:text-[#F4F7F4] font-semibold block truncate">
                            {loan.clientName || 'Unknown Client'}
                          </span>
                          {loan.clientPhone && (
                            <span className="text-[11px] text-slate-400 block truncate">{loan.clientPhone}</span>
                          )}
                        </TableCell>

                        {/* Vehicle */}
                        <TableCell className="data-td">
                          <span className="font-mono font-bold text-slate-900 dark:text-[#F4F7F4] block">
                            {loan.vehicleRegNo || 'N/A'}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-[#A1ADA4] truncate block">
                            {loan.vehicleMakeModel || loan.loanType}
                          </span>
                        </TableCell>

                        {/* Balance Due */}
                        <TableCell className="data-td text-right">
                          <span className="font-bold text-sm text-slate-900 dark:text-[#F4F7F4] tabular-nums block">
                            Ksh {Number(loan.balance || 0).toLocaleString()}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-[#A1ADA4] block">
                            Fin: Ksh {Number(loan.principalAmount || 0).toLocaleString()}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="data-td">
                          <span
                            className={cn('badge text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-block', {
                              'badge-success': loan.status === 'Active',
                              'badge-pending': ['Pending', 'Overdue', 'Substandard'].includes(loan.status),
                              'badge-error': ['Defaulting', 'Loss', 'Denied'].includes(loan.status),
                              'badge-completed': ['Completed', 'Fully Paid', 'Cash Sale'].includes(loan.status),
                              'bg-gray-100 text-gray-700 dark:bg-[#1D2920] dark:text-[#C1CBC3]':
                                loan.status === 'Written Off',
                            })}
                          >
                            {loan.status}
                          </span>
                          {dpd > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block mt-0.5">
                              {dpd} DPD
                            </span>
                          )}
                        </TableCell>

                        {/* Details Toggle */}
                        <TableCell className="data-td text-center">
                          <button
                            type="button"
                            className="size-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          >
                            {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </button>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Accordion Drawer for Tablet */}
                      {isOpen && (
                        <TableRow className="bg-slate-50/70 dark:bg-[#101612]/70 border-b border-slate-200 dark:border-[#29352D]">
                          <TableCell colSpan={5} className="p-4">
                            <div className="grid grid-cols-3 gap-4 text-xs bg-white dark:bg-[#151D17] p-3.5 rounded-xl border border-slate-200 dark:border-[#29352D]">
                              <div>
                                <span className="text-slate-400 block">Original Financed Amount</span>
                                <span className="font-semibold text-slate-800 dark:text-[#F4F7F4] tabular-nums">
                                  Ksh {Number(loan.principalAmount || 0).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Monthly Installment</span>
                                <span className="font-semibold text-slate-800 dark:text-[#F4F7F4] tabular-nums">
                                  {loan.monthlyDue ? `Ksh ${Number(loan.monthlyDue).toLocaleString()} / mo` : '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Deposit Paid</span>
                                <span className="font-semibold text-slate-800 dark:text-[#F4F7F4] tabular-nums">
                                  {loan.depositPaid ? `Ksh ${Number(loan.depositPaid).toLocaleString()}` : '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Start / Commencement Date</span>
                                <span className="font-semibold text-slate-800 dark:text-[#F4F7F4]">
                                  {formatDisplayDate(loan.startDate)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Client National ID</span>
                                <span className="font-semibold text-slate-800 dark:text-[#F4F7F4]">
                                  {loan.clientIdNumber || '—'}
                                </span>
                              </div>
                              <div className="flex items-end justify-end">
                                <Link
                                  href={`/loans/${loan.$id}`}
                                  className="btn-primary text-xs px-3 py-1.5 h-8 flex items-center gap-1.5"
                                >
                                  <span>Open Contract File</span>
                                  <ArrowUpRight className="size-3.5" />
                                </Link>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── E. Mobile Responsive Cards (<768px) ───────────────── */}
      <div className="md:hidden space-y-3">
        {paginatedLoans.length === 0 ? (
          <div className="card-premium p-8 text-center">
            <CreditCard className="size-8 text-gray-300 mx-auto" />
            <p className="text-14 text-gray-600 dark:text-[#C1CBC3] font-medium mt-2">
              {loans.length === 0 ? 'No agreements found.' : 'No agreements match your filters.'}
            </p>
            {loans.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setStatusFilter('All');
                  setTypeFilter('all');
                }}
                className="btn-secondary h-8 px-3 text-xs mt-3 inline-flex items-center gap-1 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          paginatedLoans.map((loan) => {
            const isOpen = expandedId === loan.$id;
            const dpd = Number(loan.daysOverdue) || 0;

            return (
              <div
                key={loan.$id}
                className="card-premium p-4 space-y-3 border border-slate-200 dark:border-[#29352D] rounded-2xl"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="mono-pill text-[11px] font-mono">
                      {loan.contractNo || loan.$id.slice(-8).toUpperCase()}
                    </span>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-[#F4F7F4] truncate mt-1">
                      {loan.clientName || 'Unknown Client'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#A1ADA4] truncate">
                      {loan.vehicleRegNo} {loan.vehicleMakeModel ? `• ${loan.vehicleMakeModel}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={cn('badge text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block', {
                        'badge-success': loan.status === 'Active',
                        'badge-pending': ['Pending', 'Overdue', 'Substandard'].includes(loan.status),
                        'badge-error': ['Defaulting', 'Loss', 'Denied'].includes(loan.status),
                        'badge-completed': ['Completed', 'Fully Paid', 'Cash Sale'].includes(loan.status),
                        'bg-gray-100 text-gray-700 dark:bg-[#1D2920] dark:text-[#C1CBC3]':
                          loan.status === 'Written Off',
                      })}
                    >
                      {loan.status}
                    </span>
                    {dpd > 0 && (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block mt-0.5">
                        {dpd} DPD
                      </span>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#101612] text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Outstanding Balance</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-[#F4F7F4] tabular-nums">
                      Ksh {Number(loan.balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">Monthly Installment</span>
                    <span className="font-semibold text-slate-700 dark:text-[#C1CBC3] tabular-nums">
                      {loan.monthlyDue ? `Ksh ${Number(loan.monthlyDue).toLocaleString()}` : '—'}
                    </span>
                  </div>
                </div>

                {/* Expand Toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : loan.$id)}
                  className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-[#A1ADA4] pt-1 cursor-pointer"
                >
                  <span>{isOpen ? 'Hide contract details' : 'View more details'}</span>
                  {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>

                {/* Expanded Details Drawer */}
                {isOpen && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#29352D] text-xs animate-in fade-in">
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Financed Principal:</span>
                      <span className="font-semibold text-slate-800 dark:text-[#F4F7F4]">
                        Ksh {Number(loan.principalAmount || 0).toLocaleString()}
                      </span>
                    </div>
                    {loan.clientPhone && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Client Phone:</span>
                        <span className="font-semibold text-slate-800 dark:text-[#F4F7F4]">{loan.clientPhone}</span>
                      </div>
                    )}
                    {loan.startDate && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Commencement Date:</span>
                        <span className="font-semibold text-slate-800 dark:text-[#F4F7F4]">
                          {formatDisplayDate(loan.startDate)}
                        </span>
                      </div>
                    )}
                    <Link
                      href={`/loans/${loan.$id}`}
                      className="btn-primary w-full h-9 rounded-xl text-xs flex items-center justify-center gap-1.5 mt-2"
                    >
                      <span>View Full Agreement</span>
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── F. Pagination Controls ─────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-[#151D17] rounded-xl border border-slate-200 dark:border-[#29352D] text-xs">
          {/* Per Page Selector */}
          <div className="flex items-center gap-2 text-slate-500 dark:text-[#A1ADA4]">
            <span>Show:</span>
            <div className="w-[80px]">
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="input-class h-8 text-xs bg-white dark:bg-[#101612] border-slate-200 dark:border-[#29352D]">
                  <SelectValue placeholder="15" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span>
              per page • Total: <strong className="text-slate-900 dark:text-[#F4F7F4]">{filtered.length}</strong>
            </span>
          </div>

          {/* Page navigation buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <div className="text-slate-500 dark:text-[#A1ADA4]">
                Page <strong className="text-slate-900 dark:text-[#F4F7F4]">{currentPage}</strong> of{' '}
                <strong className="text-slate-900 dark:text-[#F4F7F4]">{totalPages}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5 text-xs rounded-lg dark:bg-[#101612] dark:border-[#29352D] dark:text-[#C1CBC3] disabled:opacity-40"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2.5 text-xs rounded-lg dark:bg-[#101612] dark:border-[#29352D] dark:text-[#C1CBC3] disabled:opacity-40"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
