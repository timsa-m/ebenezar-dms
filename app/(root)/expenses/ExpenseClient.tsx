'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import HeaderBox from '@/components/HeaderBox';
import { createExpense, deleteExpenses } from '@/lib/actions/expense.actions';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { toast } from '@/lib/toast';
import {
  PlusCircle,
  Loader2,
  CreditCard,
  Search,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Building2,
  Tag,
  FileText,
  User,
  Wallet,
  PieChart,
  X,
  ArrowUpDown,
  Trash2,
} from 'lucide-react';
import CustomModal from '@/components/ui/CustomModal';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
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
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from '@/lib/utils';

export const CATEGORY_MAP: Record<string, string> = {
  mechanical: 'Mechanical Repair / Servicing',
  bodywork: 'Bodywork / Panel Beating / Paint',
  tracking: 'GPS Tracking Hardware & Installation',
  detailing: 'Interior / Detailing / Buffing',
  legal: 'Logbook Transfer / Legal Inspection',
  import_duty: 'Import Duty / Port Charges',
  marketing: 'Marketing & Ads',
  salaries: 'Salaries & Wages',
  rent: 'Rent & Lease',
  utilities: 'Utilities & Internet',
  office_supplies: 'Office Supplies',
  transport: 'Transport / Fuel',
  taxes: 'Taxes & Licenses',
  other: 'Other Incidentals',
};

/**
 * Safely parses any date string (ISO timestamp, YYYY-MM-DD, or Date) without timezone-shift bugs.
 */
export function parseSafeDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats an expense date string for display.
 * Uses East Africa Time (Africa/Nairobi) and anchors date-only values to noon so dates
 * never roll back to the previous day (e.g. 15th Sep showing as 14th Sep).
 */
export function formatExpenseDisplayDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';

  // If date-only string like "YYYY-MM-DD"
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

export default function ExpenseClient({
  initialExpenses,
  currentUser,
}: {
  initialExpenses: any[];
  currentUser: any;
}) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  // Strict Admin Privilege Enforcement (Admin only, not manager nor staff)
  const isAdmin = currentUser?.role === 'ADMIN';

  // Multi-select & Deletion States (Admin only)
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states matching VehicleTabs (UNTOUCHED)
  const [costType, setCostType] = useState<string>('mechanical');
  const [costAmount, setCostAmount] = useState<string>('');
  const [costDescription, setCostDescription] = useState<string>('');
  const [vendorName, setVendorName] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<Date | null>(new Date());

  // Search & Filter States for High-Usability Tracker
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState('15');

  // Reset page when any filter criteria changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, timeFilter, sortBy, pageSize]);

  // Executive KPI Calculations
  const totalAmount = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [expenses]);

  const thisMonthStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthItems = expenses.filter((e) => {
      const d = parseSafeDate(e.expense_date);
      if (!d) return false;
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const sum = monthItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    return { sum, count: monthItems.length };
  }, [expenses]);

  const topCategoryStats = useMemo(() => {
    const catMap: Record<string, number> = {};
    for (const e of expenses) {
      const cat = CATEGORY_MAP[e.category] || e.category || 'Other Incidentals';
      catMap[cat] = (catMap[cat] || 0) + (Number(e.amount) || 0);
    }
    let maxCat = 'None';
    let maxAmount = 0;
    for (const [cat, amt] of Object.entries(catMap)) {
      if (amt > maxAmount) {
        maxAmount = amt;
        maxCat = cat;
      }
    }
    return { name: maxCat, amount: maxAmount };
  }, [expenses]);

  const avgExpense = useMemo(() => {
    if (expenses.length === 0) return 0;
    return Math.round(totalAmount / expenses.length);
  }, [expenses, totalAmount]);

  // Filtered & Sorted Expenses
  const filteredExpenses = useMemo(() => {
    let list = [...expenses];

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((e) => {
        const desc = (e.description || '').toLowerCase();
        const vendor = (e.vendor_name || '').toLowerCase();
        const cat = (CATEGORY_MAP[e.category] || e.category || '').toLowerCase();
        const creator = (e.created_by || '').toLowerCase();
        return desc.includes(q) || vendor.includes(q) || cat.includes(q) || creator.includes(q);
      });
    }

    // Category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'vehicle_all') {
        const vehicleKeywords = ['mechanical', 'bodywork', 'tracking', 'detailing', 'legal', 'import_duty', 'reconditioning'];
        list = list.filter((e) => {
          const cat = (e.category || '').toLowerCase();
          return vehicleKeywords.some((k) => cat.includes(k));
        });
      } else if (categoryFilter === 'operating_all') {
        const operatingKeywords = ['marketing', 'salaries', 'rent', 'utilities', 'office', 'transport', 'taxes', 'other'];
        list = list.filter((e) => {
          const cat = (e.category || '').toLowerCase();
          return operatingKeywords.some((k) => cat.includes(k));
        });
      } else {
        list = list.filter((e) => {
          const cat = CATEGORY_MAP[e.category] || e.category;
          return cat === categoryFilter || e.category === categoryFilter;
        });
      }
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      if (timeFilter === 'this_month') {
        list = list.filter((e) => {
          const d = parseSafeDate(e.expense_date);
          if (!d) return false;
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        });
      } else if (timeFilter === 'last_month') {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        list = list.filter((e) => {
          const d = parseSafeDate(e.expense_date);
          if (!d) return false;
          return d.getFullYear() === prevMonthDate.getFullYear() && d.getMonth() === prevMonthDate.getMonth();
        });
      } else if (timeFilter === 'last_30_days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        list = list.filter((e) => {
          const d = parseSafeDate(e.expense_date);
          if (!d) return false;
          return d >= thirtyDaysAgo;
        });
      } else if (timeFilter === 'this_year') {
        list = list.filter((e) => {
          const d = parseSafeDate(e.expense_date);
          if (!d) return false;
          return d.getFullYear() === now.getFullYear();
        });
      }
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        const timeB = parseSafeDate(b.expense_date)?.getTime() || 0;
        const timeA = parseSafeDate(a.expense_date)?.getTime() || 0;
        return timeB - timeA;
      }
      if (sortBy === 'date_asc') {
        const timeA = parseSafeDate(a.expense_date)?.getTime() || 0;
        const timeB = parseSafeDate(b.expense_date)?.getTime() || 0;
        return timeA - timeB;
      }
      if (sortBy === 'amount_desc') {
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      }
      if (sortBy === 'amount_asc') {
        return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      }
      return 0;
    });

    return list;
  }, [expenses, searchTerm, categoryFilter, timeFilter, sortBy]);

  // Subtotal for filtered set
  const filteredSubtotal = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [filteredExpenses]);

  // Paginated set
  const numericPageSize = Number(pageSize) || 15;
  const totalPages = Math.ceil(filteredExpenses.length / numericPageSize) || 1;
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * numericPageSize;
    return filteredExpenses.slice(start, start + numericPageSize);
  }, [filteredExpenses, currentPage, numericPageSize]);

  // Page subtotal
  const pageSubtotal = useMemo(() => {
    return paginatedExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [paginatedExpenses]);

  // Visible IDs on current page (for multi-select toggling)
  const visibleIds = useMemo(() => paginatedExpenses.map((e) => e.id), [paginatedExpenses]);
  const isAllVisibleSelected = useMemo(() => {
    return visibleIds.length > 0 && visibleIds.every((id) => selectedExpenseIds.has(id));
  }, [visibleIds, selectedExpenseIds]);

  const isSomeVisibleSelected = useMemo(() => {
    return visibleIds.some((id) => selectedExpenseIds.has(id)) && !isAllVisibleSelected;
  }, [visibleIds, selectedExpenseIds, isAllVisibleSelected]);

  const toggleSelectAllVisible = () => {
    if (!isAdmin) return;
    setSelectedExpenseIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    if (!isAdmin) return;
    setSelectedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedExpenseIds(new Set());
  };

  // Active selection flag (Admin only and has 1+ selected items)
  const isSelectionActive = isAdmin && selectedExpenseIds.size > 0;

  // Right-click to trigger / toggle selection (Admin only)
  const handleRowContextMenu = (e: React.MouseEvent, id: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    toggleSelectOne(id);
  };

  // Left-click on row: if in selection mode, toggle row selection
  const handleRowClick = (id: string) => {
    if (!isAdmin) return;
    if (selectedExpenseIds.size > 0) {
      toggleSelectOne(id);
    }
  };

  // Escape key to dismiss selection
  useEffect(() => {
    if (!isSelectionActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleteModalOpen) {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionActive, isDeleteModalOpen]);

  const selectedTotalAmount = useMemo(() => {
    return expenses
      .filter((e) => selectedExpenseIds.has(e.id))
      .reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
  }, [expenses, selectedExpenseIds]);

  // Items targeted for deletion in the confirm modal
  const itemsToDelete = useMemo(() => {
    return expenses.filter((e) => deleteTargetIds.includes(e.id));
  }, [expenses, deleteTargetIds]);

  const totalAmountToDelete = useMemo(() => {
    return itemsToDelete.reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
  }, [itemsToDelete]);

  const handleOpenSingleDelete = (id: string) => {
    if (!isAdmin) return;
    setDeleteTargetIds([id]);
    setIsDeleteModalOpen(true);
  };

  const handleOpenBulkDelete = () => {
    if (!isAdmin || selectedExpenseIds.size === 0) return;
    setDeleteTargetIds(Array.from(selectedExpenseIds));
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!isAdmin || deleteTargetIds.length === 0) return;
    setIsDeleting(true);

    try {
      const result = await deleteExpenses(deleteTargetIds);
      if (result.success) {
        toast.success(
          deleteTargetIds.length === 1
            ? 'Expense deleted successfully.'
            : `${deleteTargetIds.length} expenses deleted successfully.`
        );

        // Optimistic update
        const targetSet = new Set(deleteTargetIds);
        setExpenses((prev) => prev.filter((e) => !targetSet.has(e.id)));
        setSelectedExpenseIds((prev) => {
          const next = new Set(prev);
          deleteTargetIds.forEach((id) => next.delete(id));
          return next;
        });

        setIsDeleteModalOpen(false);
        setDeleteTargetIds([]);
      } else {
        toast.error(result.error || 'Failed to delete expenses.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred while deleting.');
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No expenses to export.');
      return;
    }
    const headers = ['Date', 'Category', 'Description', 'Vendor', 'Logged By', 'Amount (KES)'];
    const rows = filteredExpenses.map((e) => [
      `"${formatExpenseDisplayDate(e.expense_date)}"`,
      `"${(CATEGORY_MAP[e.category] || e.category || '').replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      `"${(e.vendor_name || '').replace(/"/g, '""')}"`,
      `"${(e.created_by || '').replace(/"/g, '""')}"`,
      Number(e.amount) || 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const nowStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `ebenezar_expenses_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredExpenses.length} expenses to CSV`);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = Number(costAmount);
    if (!costAmount || isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Cost amount must be greater than 0.');
      return;
    }

    if (!costDescription.trim()) {
      toast.error('Description / item detail is required.');
      return;
    }

    if (!expenseDate) {
      toast.error('Expense date is required.');
      return;
    }

    const selectedCategoryLabel = CATEGORY_MAP[costType] || costType;

    // Anchor the date to local noon so that .toISOString() stays firmly on the chosen calendar date across all timezone boundaries
    const safeDate = new Date(expenseDate);
    safeDate.setHours(12, 0, 0, 0);
    const finalDate = safeDate.toISOString();

    startTransition(async () => {
      const result = await createExpense({
        amount: numericAmount,
        category: selectedCategoryLabel,
        description: costDescription.trim(),
        vendor_name: vendorName.trim().toUpperCase() || undefined,
        expense_date: finalDate,
      });

      if (result.success) {
        toast.success(`Expense of Ksh ${numericAmount.toLocaleString()} recorded successfully`);
        setShowForm(false);

        // Optimistic update
        setExpenses([
          {
            id: Math.random().toString(),
            amount: numericAmount,
            category: selectedCategoryLabel,
            description: costDescription.trim(),
            vendor_name: vendorName.trim().toUpperCase() || null,
            expense_date: finalDate,
            created_by: currentUser.name || currentUser.email,
            created_at: new Date().toISOString(),
          },
          ...expenses,
        ]);

        setCostAmount('');
        setCostDescription('');
        setVendorName('');
        setCostType('mechanical');
        setExpenseDate(new Date());
      } else {
        toast.error(result.error || 'Failed to record expense');
      }
    });
  };

  return (
    <div className="w-full animate-fade-in pb-12">
      {/* ── Page Header ────────────────────────────────────────── */}
      <header className="page-header flex flex-col md:flex-row md:items-center md:justify-between">
        <HeaderBox
          title="Expenses Tracking"
          subtext="Executive oversight of dealership operating expenditures, reconditioning ledgers, and overheads."
        />
        <div className="flex items-center gap-2.5 mt-4 md:mt-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-secondary flex items-center justify-center gap-1.5 text-xs px-3.5 py-2.5 cursor-pointer"
            title="Download expenses as CSV"
          >
            <Download className="size-4 text-slate-500 dark:text-[#A1ADA4]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center justify-center gap-2 text-xs px-4 py-2.5 cursor-pointer shadow-sm"
          >
            <PlusCircle className="size-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </header>

      {/* ── 1. Executive Financial Summary Cards ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Total Expenses */}
        <div className="card-premium p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4]">
              Total Cumulative Expenses
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Wallet className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums">
              Ksh {totalAmount.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#A1ADA4] mt-1">
              {expenses.length} total logged entries
            </p>
          </div>
        </div>

        {/* Current Month Overhead */}
        <div className="card-premium p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4]">
              This Month ({new Date().toLocaleString('en-US', { month: 'short' })})
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Calendar className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums">
              Ksh {thisMonthStats.sum.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#A1ADA4] mt-1">
              {thisMonthStats.count} entries in current cycle
            </p>
          </div>
        </div>

        {/* Top Spending Category */}
        <div className="card-premium p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4]">
              Top Spending Category
            </span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <PieChart className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F7F4] truncate" title={topCategoryStats.name}>
              {topCategoryStats.name}
            </h3>
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
              Ksh {topCategoryStats.amount.toLocaleString()} total spent
            </p>
          </div>
        </div>

        {/* Average per Transaction */}
        <div className="card-premium p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4]">
              Average per Expense
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums">
              Ksh {avgExpense.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#A1ADA4] mt-1">
              Mean transaction size
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Smart Search & Filter Toolbar ──────────────────── */}
      <div className="card-premium p-4 mt-6 space-y-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box - Non-overlapping layout with generous padding */}
          <div className="search-box relative flex-1 min-w-[240px]">
            <Search className="search-icon size-4 text-slate-400 dark:text-[#A1ADA4] pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by description, vendor, category, or staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input input-class h-10 w-full !pl-10 !pr-9 text-xs bg-white dark:bg-[#101612] border-slate-200 dark:border-[#29352D]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-[#F4F7F4] cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filtering Dropdowns with Custom Select Modals */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <div className="w-[170px] sm:w-[190px]">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="input-class h-10 w-full text-xs bg-white dark:bg-[#101612] border-slate-200 dark:border-[#29352D]">
                  <SelectValue placeholder="Category..." />
                </SelectTrigger>
                <SelectContent className="z-50 max-h-[320px]">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="vehicle_all">All Vehicle Costs</SelectItem>
                  <SelectItem value="operating_all">All Operating Overheads</SelectItem>
                  <SelectGroup>
                    <SelectLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4]">
                      Vehicle Costs
                    </SelectLabel>
                    <SelectItem value="Mechanical Repair / Servicing">Mechanical Repair</SelectItem>
                    <SelectItem value="Bodywork / Panel Beating / Paint">Bodywork / Paint</SelectItem>
                    <SelectItem value="GPS Tracking Hardware & Installation">GPS Tracking</SelectItem>
                    <SelectItem value="Interior / Detailing / Buffing">Detailing</SelectItem>
                    <SelectItem value="Logbook Transfer / Legal Inspection">Logbook / Inspection</SelectItem>
                    <SelectItem value="Import Duty / Port Charges">Import Duty</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4]">
                      Operating Overheads
                    </SelectLabel>
                    <SelectItem value="Marketing & Ads">Marketing & Ads</SelectItem>
                    <SelectItem value="Salaries & Wages">Salaries & Wages</SelectItem>
                    <SelectItem value="Rent & Lease">Rent & Lease</SelectItem>
                    <SelectItem value="Utilities & Internet">Utilities & Internet</SelectItem>
                    <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                    <SelectItem value="Transport / Fuel">Transport / Fuel</SelectItem>
                    <SelectItem value="Taxes & Licenses">Taxes & Licenses</SelectItem>
                    <SelectItem value="Other Incidentals">Other Incidentals</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Time Horizon Filter */}
            <div className="w-[130px] sm:w-[145px]">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="input-class h-10 w-full text-xs bg-white dark:bg-[#101612] border-slate-200 dark:border-[#29352D]">
                  <SelectValue placeholder="Period..." />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="w-[145px] sm:w-[160px]">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="input-class h-10 w-full text-xs bg-white dark:bg-[#101612] border-slate-200 dark:border-[#29352D]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="date_desc">Date: Newest First</SelectItem>
                  <SelectItem value="date_asc">Date: Oldest First</SelectItem>
                  <SelectItem value="amount_desc">Amount: Highest</SelectItem>
                  <SelectItem value="amount_asc">Amount: Lowest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-secondary h-10 px-3.5 text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-xs"
              title="Download filtered expenses as CSV spreadsheet"
            >
              <Download className="size-3.5 text-slate-500 dark:text-[#A1ADA4]" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Status & Subtotal Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-[#29352D] text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-[#A1ADA4]">
            {isSelectionActive && paginatedExpenses.length > 0 && (
              <label className="flex items-center gap-1.5 mr-2 font-medium text-slate-700 dark:text-[#C1CBC3] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeVisibleSelected;
                  }}
                  onChange={toggleSelectAllVisible}
                  className="size-3.5 rounded border-slate-300 dark:border-[#29352D] text-red-600 accent-red-600 cursor-pointer"
                />
                <span className="hidden sm:inline">Select Page</span>
              </label>
            )}
            <span>
              Showing <strong className="text-slate-900 dark:text-[#F4F7F4]">{filteredExpenses.length}</strong> of{' '}
              <strong className="text-slate-900 dark:text-[#F4F7F4]">{expenses.length}</strong> entries
            </span>
            {isAdmin && !isSelectionActive && expenses.length > 0 && (
              <span className="text-[11px] text-slate-400 dark:text-[#A1ADA4]/70 hidden md:inline ml-1.5">
                • Right-click any row to select
              </span>
            )}
            {isSelectionActive && (
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                • {selectedExpenseIds.size} selected
                <button
                  type="button"
                  onClick={clearSelection}
                  className="ml-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-[#F4F7F4] underline cursor-pointer"
                >
                  Clear
                </button>
              </span>
            )}
            {(searchTerm || categoryFilter !== 'all' || timeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setTimeFilter('all');
                  setSortBy('date_desc');
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-2 cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isSelectionActive && (
              <button
                type="button"
                onClick={handleOpenBulkDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Delete ({selectedExpenseIds.size})</span>
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-[#A1ADA4]">Filtered Total:</span>
              <span className="font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums text-sm">
                Ksh {filteredSubtotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Custom Modal (100% UNTOUCHED) ─────────────────────── */}
      <CustomModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Record Expense"
        width={480}
        overflow="visible"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-[#C1CBC3]">
              Cost Category
            </label>

            <Select value={costType} onValueChange={setCostType}>
              <SelectTrigger className="input-class h-10 w-full">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4]">
                    Vehicle & Reconditioning Costs
                  </SelectLabel>
                  <SelectItem value="mechanical">Mechanical Repair / Servicing</SelectItem>
                  <SelectItem value="bodywork">Bodywork / Panel Beating / Paint</SelectItem>
                  <SelectItem value="tracking">GPS Tracking Hardware & Installation</SelectItem>
                  <SelectItem value="detailing">Interior / Detailing / Buffing</SelectItem>
                  <SelectItem value="legal">Logbook Transfer / Legal Inspection</SelectItem>
                  <SelectItem value="import_duty">Import Duty / Port Charges</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4]">
                    Dealership & Operating Overheads
                  </SelectLabel>
                  <SelectItem value="marketing">Marketing & Ads</SelectItem>
                  <SelectItem value="salaries">Salaries & Wages</SelectItem>
                  <SelectItem value="rent">Rent & Lease</SelectItem>
                  <SelectItem value="utilities">Utilities & Internet</SelectItem>
                  <SelectItem value="office_supplies">Office Supplies</SelectItem>
                  <SelectItem value="transport">Transport / Fuel</SelectItem>
                  <SelectItem value="taxes">Taxes & Licenses</SelectItem>
                  <SelectItem value="other">Other Incidentals</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-[#C1CBC3]">
              Expense Amount (Ksh) *
            </label>

            <input
              type="number"
              required
              value={costAmount}
              onChange={(e) => setCostAmount(e.target.value)}
              placeholder="e.g. 15000"
              className="input-class h-10 w-full font-semibold"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-[#C1CBC3]">
              Description / Item Detail *
            </label>

            <input
              type="text"
              required
              placeholder="e.g. Front suspension bushing & new battery"
              value={costDescription}
              onChange={(e) => setCostDescription(e.target.value)}
              className="input-class h-10 w-full"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-[#C1CBC3]">
              Garage / Vendor Name
            </label>

            <input
              type="text"
              placeholder="e.g. QuickFit Auto Kisumu"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value.toUpperCase())}
              className="input-class h-10 w-full uppercase"
            />
          </div>

          <div className="relative z-30">
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-[#C1CBC3]">
              Expense Date
            </label>

            <CustomDatePicker
              selectedDate={expenseDate}
              onChange={(d: Date) => setExpenseDate(d)}
              placeholder="Select expense date…"
              placement="top"
              aria-label="Expense date picker"
            />
          </div>

          <div className="flex justify-end gap-2.5 border-t border-slate-100 dark:border-[#29352D] pt-5">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="badge badge-primary h-10 w-20 justify-center px-5 text-xs bg-red-500"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary h-10 px-5 text-xs disabled:opacity-50"
            >
              {isPending && (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              )}
              Save Expense
            </button>
          </div>
        </form>
      </CustomModal>

      {/* ── 3. Desktop Optimized Table ────────────────────────── */}
      <div className="data-table-wrap hidden lg:block mt-6">
        <div className="data-table-scroll">
          <Table className="data-table">
            <colgroup>
              {isSelectionActive && <col style={{ width: '4%' }} />}
              <col style={{ width: isSelectionActive ? '14%' : '14%' }} />
              <col style={{ width: isSelectionActive ? '20%' : '20%' }} />
              <col style={{ width: isSelectionActive ? '32%' : '34%' }} />
              <col style={{ width: isSelectionActive ? '15%' : '16%' }} />
              <col style={{ width: isSelectionActive ? '15%' : '16%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="data-table-head-row">
                {isSelectionActive && (
                  <TableHead className="data-th w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeVisibleSelected;
                      }}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all visible expenses"
                      className="size-4 rounded border-slate-300 dark:border-[#29352D] text-red-600 accent-red-600 cursor-pointer"
                    />
                  </TableHead>
                )}
                <TableHead className="data-th text-left">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 opacity-60" />
                    <span>Date</span>
                  </div>
                </TableHead>
                <TableHead className="data-th text-left">
                  <div className="flex items-center gap-1.5">
                    <Tag className="size-3.5 opacity-60" />
                    <span>Category</span>
                  </div>
                </TableHead>
                <TableHead className="data-th text-left">
                  <div className="flex items-center gap-1.5">
                    <FileText className="size-3.5 opacity-60" />
                    <span>Description & Vendor</span>
                  </div>
                </TableHead>
                <TableHead className="data-th text-left">
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5 opacity-60" />
                    <span>Logged By</span>
                  </div>
                </TableHead>
                <TableHead className="data-th text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <DollarSign className="size-3.5 opacity-60" />
                    <span>Amount</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSelectionActive ? 6 : 5} className="data-empty-cell py-12">
                    <div className="data-empty text-center">
                      <CreditCard className="size-10 text-gray-300 mx-auto" />
                      <p className="text-14 text-gray-600 dark:text-[#C1CBC3] font-semibold mt-2">
                        {expenses.length === 0 ? 'No expenses recorded yet.' : 'No expenses match your search/filters.'}
                      </p>
                      <p className="text-12 text-gray-400 mt-0.5">
                        {expenses.length === 0
                          ? 'Click "Record Expense" to log your first business expense.'
                          : 'Try clearing your search query or setting the category filter to "All Categories".'}
                      </p>
                      {expenses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setCategoryFilter('all');
                            setTimeFilter('all');
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
                paginatedExpenses.map((expense) => {
                  const displayCat = CATEGORY_MAP[expense.category] || expense.category;
                  const isVehicleCost = [
                    'Mechanical Repair / Servicing',
                    'Bodywork / Panel Beating / Paint',
                    'GPS Tracking Hardware & Installation',
                    'Interior / Detailing / Buffing',
                    'Logbook Transfer / Legal Inspection',
                    'Import Duty / Port Charges',
                  ].includes(displayCat);

                  const isSelected = selectedExpenseIds.has(expense.id);

                  return (
                    <TableRow
                      key={expense.id}
                      onContextMenu={(e) => handleRowContextMenu(e, expense.id)}
                      onClick={() => handleRowClick(expense.id)}
                      title={isAdmin ? (isSelectionActive ? 'Click to toggle selection' : 'Right-click to select for deletion') : undefined}
                      className={cn(
                        'data-table-row transition-colors cursor-default select-none',
                        isSelected
                          ? 'bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100/60 dark:hover:bg-red-950/40 border-l-4 border-l-red-500'
                          : 'hover:bg-gray-50/80 dark:hover:bg-[#1D2920]/40'
                      )}
                    >
                      {/* Checkbox (Visible ONLY when selection active) */}
                      {isSelectionActive && (
                        <TableCell className="data-td text-center" onClick={(e) => { e.stopPropagation(); toggleSelectOne(expense.id); }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(expense.id)}
                            className="size-4 rounded border-slate-300 dark:border-[#29352D] text-red-600 accent-red-600 cursor-pointer"
                            aria-label={`Select expense ${expense.description || ''}`}
                          />
                        </TableCell>
                      )}

                      {/* Date */}
                      <TableCell className="data-td">
                        <span className="mono-pill font-mono text-xs">
                          {formatExpenseDisplayDate(expense.expense_date)}
                        </span>
                      </TableCell>

                      {/* Category Badge */}
                      <TableCell className="data-td">
                        <span className={cn(
                          'badge text-[11px] font-medium px-2 py-0.5 rounded-full inline-block',
                          isVehicleCost
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40'
                        )}>
                          {displayCat}
                        </span>
                      </TableCell>

                      {/* Description & Vendor */}
                      <TableCell className="data-td">
                        <span className="text-14 text-gray-800 dark:text-[#F4F7F4] font-medium block truncate max-w-sm">
                          {expense.description || '—'}
                        </span>
                        {expense.vendor_name && (
                          <span className="text-[11px] text-slate-500 dark:text-[#A1ADA4] flex items-center gap-1 mt-0.5">
                            <Building2 className="size-3 shrink-0 opacity-70" />
                            <span className="truncate">{expense.vendor_name}</span>
                          </span>
                        )}
                      </TableCell>

                      {/* Logged By */}
                      <TableCell className="data-td">
                        <span className="client-name text-xs font-medium text-slate-600 dark:text-[#C1CBC3]">
                          {expense.created_by || 'Staff'}
                        </span>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="data-td text-right">
                        <span className="amount-text font-bold text-sm text-slate-900 dark:text-[#F4F7F4] tabular-nums">
                          Ksh {Number(expense.amount).toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {paginatedExpenses.length > 0 && (
              <TableFooter className="bg-slate-50/80 dark:bg-[#18221A] border-t border-slate-200 dark:border-[#29352D] font-semibold text-xs">
                <TableRow>
                  <TableCell colSpan={isSelectionActive ? 5 : 4} className="py-3 px-4 text-slate-600 dark:text-[#C1CBC3]">
                    Subtotal for visible entries ({paginatedExpenses.length} of {filteredExpenses.length}):
                  </TableCell>
                  <TableCell className="py-3 px-4 text-right text-slate-900 dark:text-[#F4F7F4] font-bold tabular-nums">
                    Ksh {pageSubtotal.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>

      {/* ── 4. Mobile Responsive Card List ────────────────────── */}
      <div className="lg:hidden space-y-3 mt-4">
        {paginatedExpenses.length === 0 ? (
          <div className="card-premium p-8 text-center">
            <CreditCard className="size-8 text-gray-300 mx-auto" />
            <p className="text-14 text-gray-600 dark:text-[#C1CBC3] font-medium mt-2">
              {expenses.length === 0 ? 'No expenses recorded yet.' : 'No expenses match your filters.'}
            </p>
            {expenses.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setTimeFilter('all');
                }}
                className="btn-secondary h-8 px-3 text-xs mt-3 inline-flex items-center gap-1 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          paginatedExpenses.map((expense) => {
            const displayCat = CATEGORY_MAP[expense.category] || expense.category;
            const isVehicleCost = [
              'Mechanical Repair / Servicing',
              'Bodywork / Panel Beating / Paint',
              'GPS Tracking Hardware & Installation',
              'Interior / Detailing / Buffing',
              'Logbook Transfer / Legal Inspection',
              'Import Duty / Port Charges',
            ].includes(displayCat);

            const isSelected = selectedExpenseIds.has(expense.id);

            return (
              <div
                key={expense.id}
                onContextMenu={(e) => handleRowContextMenu(e, expense.id)}
                onClick={() => handleRowClick(expense.id)}
                className={cn(
                  'card-premium p-4 space-y-2.5 border transition-all cursor-default select-none',
                  isSelected
                    ? 'border-red-400 dark:border-red-800 bg-red-50/50 dark:bg-red-950/25 shadow-xs ring-1 ring-red-500/30'
                    : 'border-slate-200 dark:border-[#29352D]'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isSelectionActive && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(expense.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="size-4 rounded border-slate-300 dark:border-[#29352D] text-red-600 accent-red-600 cursor-pointer"
                        aria-label={`Select expense ${expense.description || ''}`}
                      />
                    )}
                    <span className="mono-pill text-xs font-mono">
                      {formatExpenseDisplayDate(expense.expense_date)}
                    </span>
                  </div>
                  <span className="amount-text font-bold text-base text-slate-900 dark:text-[#F4F7F4] tabular-nums">
                    Ksh {Number(expense.amount).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className={cn(
                    'badge text-xs px-2 py-0.5 rounded-full',
                    isVehicleCost
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40'
                  )}>
                    {displayCat}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-[#A1ADA4]">
                    {expense.created_by || 'Staff'}
                  </span>
                </div>

                {expense.description && (
                  <p className="text-xs text-slate-700 dark:text-[#C1CBC3] pt-0.5 font-medium">
                    {expense.description}
                  </p>
                )}

                {expense.vendor_name && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#A1ADA4]">
                    <Building2 className="size-3 opacity-70 shrink-0" />
                    <span>{expense.vendor_name}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── 5. Pagination & Page Size Controls ────────────────── */}
      {filteredExpenses.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 px-3.5 py-3 bg-white dark:bg-[#151D17] rounded-xl border border-slate-200 dark:border-[#29352D] text-xs">
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
            <span>per page • Total: <strong className="text-slate-900 dark:text-[#F4F7F4]">{filteredExpenses.length}</strong></span>
          </div>

          {/* Page navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <div className="text-slate-500 dark:text-[#A1ADA4]">
                Page <strong className="text-slate-900 dark:text-[#F4F7F4]">{currentPage}</strong> of{' '}
                <strong className="text-slate-900 dark:text-[#F4F7F4]">{totalPages}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary h-8 px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary h-8 px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 6. Admin Floating Multi-Select Action Bar ──────────── */}
      {isAdmin && selectedExpenseIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-slate-900/95 dark:bg-[#151D17]/95 backdrop-blur-md text-white border border-slate-700/80 dark:border-[#29352D] rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex size-5 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white shadow-xs">
              {selectedExpenseIds.size}
            </span>
            <span className="font-medium text-slate-200">
              Selected • <strong className="font-bold text-white tabular-nums">Ksh {selectedTotalAmount.toLocaleString()}</strong>
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 dark:bg-[#29352D]" />

          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-slate-300 hover:text-white transition-colors cursor-pointer px-1 py-0.5"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={handleOpenBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer hover:shadow-red-600/20 active:scale-98"
          >
            <Trash2 className="size-3.5" />
            <span>Delete Selected ({selectedExpenseIds.size})</span>
          </button>
        </div>
      )}

      {/* ── 7. Admin-Only Confirm Delete Modal ─────────────────── */}
      {isAdmin && (
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            if (!isDeleting) {
              setIsDeleteModalOpen(false);
              setDeleteTargetIds([]);
            }
          }}
          onConfirm={handleConfirmDelete}
          isPending={isDeleting}
          maxWidth={480}
          title={
            deleteTargetIds.length === 1
              ? 'Delete Expense'
              : `Delete ${deleteTargetIds.length} Expenses`
          }
          description="This action is permanent and cannot be undone. These records will be permanently removed from the dealership accounting ledgers."
          confirmLabel={
            deleteTargetIds.length === 1
              ? 'Delete Expense'
              : `Delete ${deleteTargetIds.length} Expenses`
          }
          itemName={
            deleteTargetIds.length === 1
              ? `${itemsToDelete[0]?.description || 'Selected expense'} (Ksh ${Number(itemsToDelete[0]?.amount || 0).toLocaleString()})`
              : `${deleteTargetIds.length} expenses totaling Ksh ${totalAmountToDelete.toLocaleString()}`
          }
        >
          {deleteTargetIds.length > 1 && (
            <div className="mt-3 text-left">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] mb-1.5 px-1">
                <span>Selected Records ({itemsToDelete.length}):</span>
                <span className="text-red-600 dark:text-red-400 tabular-nums">
                  Total: Ksh {totalAmountToDelete.toLocaleString()}
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-[#29352D] rounded-xl border border-slate-200 dark:border-[#29352D] bg-slate-50/70 dark:bg-[#101612] p-1.5">
                {itemsToDelete.map((item) => (
                  <div key={item.id} className="p-2 flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-[#F4F7F4] truncate">
                        {item.description || '—'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-[#A1ADA4] truncate mt-0.5">
                        {formatExpenseDisplayDate(item.expense_date)} • {CATEGORY_MAP[item.category] || item.category}
                        {item.vendor_name ? ` • ${item.vendor_name}` : ''}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums shrink-0">
                      Ksh {Number(item.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ConfirmDeleteModal>
      )}
    </div>
  );
}
