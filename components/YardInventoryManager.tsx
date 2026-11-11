'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Vehicle, VehicleCostType, VehicleStatus } from '@/src/types/database.types';
import { formatKES } from '@/src/lib/financial-engine';
import {
  addVehicle,
  addVehicleCost,
  updateVehicleStatusAction,
  softDeleteVehicle,
  restoreVehicle,
  toggleVehiclePublishAction,
} from '@/lib/actions/vehicle.actions';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import SecureActionModal from '@/components/security/SecureActionModal';
import CustomModal from '@/components/ui/CustomModal';
import {
  Car,
  Plus,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  Tag,
  DollarSign,
  TrendingUp,
  Search,
  AlertTriangle,
  Banknote,
  MoreHorizontal,
  Eye,
  ChevronDown,
  Trash2,
  RotateCcw,
  Globe,
  EyeOff,
  LayoutGrid,
  Table as TableIcon,
  Clock,
  ArrowUpDown,
  Image as ImageIcon,
  Building2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface YardInventoryManagerProps {
  vehicles: Vehicle[];
  currentUser?: any;
}

type TabType =
  | 'all'
  | 'in_stock'
  | 'reserved'
  | 'financed'
  | 'repossessed'
  | 'cash_sale'
  | 'on_website'
  | 'off_website'
  | 'deleted';

type AttentionType = 'all' | 'missing_photos' | 'unpublished' | 'aging';

type SortOption =
  | 'newest'
  | 'oldest'
  | 'price_desc'
  | 'price_asc'
  | 'year_desc'
  | 'reg_asc';

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDaysInStock(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const created = new Date(dateStr).getTime();
  const now = Date.now();
  const diffTime = Math.max(0, now - created);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function StatusBadge({ status }: { status: VehicleStatus }) {
  if (status === 'in_stock') {
    return (
      <span className="badge badge-success inline-flex items-center gap-1.5 shadow-2xs">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        <span>In Stock</span>
      </span>
    );
  }
  if (status === 'reserved') {
    return (
      <span className="badge badge-warning inline-flex items-center gap-1.5 shadow-2xs">
        <span className="size-1.5 rounded-full bg-amber-500" />
        <span>Reserved</span>
      </span>
    );
  }
  if (status === 'financed') {
    return (
      <span className="badge badge-pending inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/40 shadow-2xs">
        <span className="size-1.5 rounded-full bg-blue-500" />
        <span>On Credit</span>
      </span>
    );
  }
  if (status === 'repossessed') {
    return (
      <span className="badge badge-error inline-flex items-center gap-1.5 shadow-2xs">
        <span className="size-1.5 rounded-full bg-rose-500" />
        <span>Repossessed</span>
      </span>
    );
  }
  if (status === 'cash_sale') {
    return (
      <span className="badge badge-completed inline-flex items-center gap-1.5 shadow-2xs">
        <span className="size-1.5 rounded-full bg-slate-500" />
        <span>Cash Sale</span>
      </span>
    );
  }
  if (status === 'deleted') {
    return (
      <span className="badge badge-error inline-flex items-center gap-1.5 bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/40 shadow-2xs">
        <span className="size-1.5 rounded-full bg-red-500" />
        <span>Archived</span>
      </span>
    );
  }
  return <span className="badge badge-new">{status}</span>;
}

function WebsiteBadge({
  isPublished,
  isManagerOrAdmin = false,
  isToggling = false,
  onToggle,
}: {
  isPublished: boolean | null | undefined;
  isManagerOrAdmin?: boolean;
  isToggling?: boolean;
  onToggle?: (e: React.MouseEvent) => void;
}) {
  const published = Boolean(isPublished);

  const badgeContent = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all select-none',
        published
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 shadow-2xs'
          : 'bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-[#18221A] dark:text-[#A1ADA4] dark:border-[#29352D] shadow-2xs',
        isManagerOrAdmin && onToggle && (
          published
            ? 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-300'
            : 'hover:bg-slate-200 dark:hover:bg-[#222E25] hover:border-slate-300'
        )
      )}
      title={
        isManagerOrAdmin
          ? published
            ? 'Live on website (Click to hide from website)'
            : 'Hidden from website (Click to publish to website)'
          : published
            ? 'Live on website'
            : 'Hidden from website'
      }
    >
      {isToggling ? (
        <Loader2 className="size-3 animate-spin shrink-0" />
      ) : published ? (
        <Globe className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
      ) : (
        <EyeOff className="size-3 text-slate-400 dark:text-[#A1ADA4] shrink-0" />
      )}
      <span>{published ? 'On Website' : 'Off Website'}</span>
    </span>
  );

  if (isManagerOrAdmin && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={isToggling}
        className="focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 rounded-full transition-transform active:scale-95 disabled:opacity-60 cursor-pointer"
        aria-label={published ? 'Remove vehicle from website' : 'Publish vehicle to website'}
      >
        {badgeContent}
      </button>
    );
  }

  return badgeContent;
}

function AgingBadge({ days }: { days: number }) {
  if (days >= 60) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/40 tabular-nums"
        title={`Vehicle has been in inventory for ${days} days`}
      >
        <Clock className="size-2.5" />
        <span>{days}d in yard</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#A1ADA4] tabular-nums"
      title={`Vehicle has been in inventory for ${days} days`}
    >
      <Clock className="size-3 opacity-60" />
      <span>{days}d</span>
    </span>
  );
}

export default function YardInventoryManager({
  vehicles,
  currentUser,
}: YardInventoryManagerProps) {
  const router = useRouter();
  const [vehicleList, setVehicleList] = useState<Vehicle[]>(vehicles);
  const isManagerOrAdmin =
    currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';
  const isAdmin = currentUser?.role === 'ADMIN';

  // Synchronize state if parent vehicles prop updates
  useEffect(() => {
    setVehicleList(vehicles);
  }, [vehicles]);

  // View Mode: 'table' or 'grid' (Showroom cards)
  const [viewMode, setViewMode] = usePersistedState<'table' | 'grid'>(
    'dms_yard_view_mode',
    'table'
  );

  // Sorting
  const [sortBy, setSortBy] = usePersistedState<SortOption>(
    'dms_yard_sort_by',
    'newest'
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Filter States
  const [query, setQuery] = usePersistedState('dms_yard_query', '');
  const [activeTab, setActiveTab] = usePersistedState<TabType>(
    'dms_yard_tab',
    'all'
  );
  const [attentionFilter, setAttentionFilter] = useState<AttentionType>('all');

  // Modal States
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddCostOpen, setIsAddCostOpen] = useState(false);
  const [selectedVehicleForCost, setSelectedVehicleForCost] =
    useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  // Form States: Add Vehicle
  const [regNo, setRegNo] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [type, setType] = useState('SUV');
  const [year, setYear] = useState<number>(new Date().getFullYear() - 5);
  const [purchasePrice, setPurchasePrice] = useState<number>(1200000);
  const [salePrice, setSalePrice] = useState<number>(1650000);
  const [purchaseDate, setPurchaseDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isVehicleSaving, setIsVehicleSaving] = useState(false);

  // Form States: Add Cost
  const [costType, setCostType] = useState<VehicleCostType>('mechanical');
  const [costAmount, setCostAmount] = useState<number>(15000);
  const [costDescription, setCostDescription] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [isCostSaving, setIsCostSaving] = useState(false);

  // Row Action States
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [togglingPublishId, setTogglingPublishId] = useState<string | null>(null);

  // Click outside to close row menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-menu-container')) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, activeTab, attentionFilter, sortBy]);

  // Inventory Metrics & KPI Computations
  const counts = useMemo(() => {
    const res = {
      all: 0,
      in_stock: 0,
      financed: 0,
      reserved: 0,
      repossessed: 0,
      cash_sale: 0,
      deleted: 0,
      on_website: 0,
      off_website: 0,
      missing_photos: 0,
      aging_60: 0,
      in_stock_unpublished: 0,
    };

    for (const v of vehicleList) {
      if (v.status === 'deleted') {
        res.deleted++;
      } else {
        res.all++;
        if (v.status === 'in_stock') {
          res.in_stock++;
          if (!v.images || v.images.length === 0) res.missing_photos++;
          if (!v.is_published) res.in_stock_unpublished++;
          if (getDaysInStock(v.date_purchased || v.created_at) >= 60) res.aging_60++;
        } else if (v.status === 'financed') {
          res.financed++;
        } else if (v.status === 'reserved') {
          res.reserved++;
        } else if (v.status === 'repossessed') {
          res.repossessed++;
        } else if (v.status === 'cash_sale') {
          res.cash_sale++;
        }

        if (v.is_published) {
          res.on_website++;
        } else {
          res.off_website++;
        }
      }
    }

    return res;
  }, [vehicleList]);

  // Financial intelligence for vehicles currently in stock
  const inStockFinancials = useMemo(() => {
    let totalCost = 0;
    let totalTargetSale = 0;

    for (const v of vehicleList) {
      if (v.status === 'in_stock') {
        totalCost += Number(v.purchase_price) || 0;
        totalTargetSale += Number(v.sale_price) || 0;
      }
    }

    const projectedMargin = totalTargetSale - totalCost;
    const marginPct =
      totalCost > 0 ? Math.round((projectedMargin / totalCost) * 100) : 0;

    return {
      totalCost,
      totalTargetSale,
      projectedMargin,
      marginPct,
    };
  }, [vehicleList]);

  // Filter & Sort Pipeline
  const filtered = useMemo(() => {
    let result = vehicleList;

    // 1. Tab Status Filter
    if (activeTab === 'all') {
      result = result.filter((v) => v.status !== 'deleted');
    } else if (activeTab === 'on_website') {
      result = result.filter(
        (v) => v.status !== 'deleted' && Boolean(v.is_published)
      );
    } else if (activeTab === 'off_website') {
      result = result.filter((v) => v.status !== 'deleted' && !v.is_published);
    } else {
      result = result.filter((v) => v.status === activeTab);
    }

    // 2. Attention Filter
    if (attentionFilter === 'missing_photos') {
      result = result.filter(
        (v) => v.status === 'in_stock' && (!v.images || v.images.length === 0)
      );
    } else if (attentionFilter === 'unpublished') {
      result = result.filter((v) => v.status === 'in_stock' && !v.is_published);
    } else if (attentionFilter === 'aging') {
      result = result.filter(
        (v) =>
          v.status === 'in_stock' &&
          getDaysInStock(v.date_purchased || v.created_at) >= 60
      );
    }

    // 3. Search Query
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.registration_no.toLowerCase().includes(q) ||
          v.make_model.toLowerCase().includes(q) ||
          (v.type && v.type.toLowerCase().includes(q)) ||
          (v.year && v.year.toString().includes(q)) ||
          (v.chassis_no && v.chassis_no.toLowerCase().includes(q))
      );
    }

    // 4. Sorting
    return [...result].sort((a, b) => {
      if (sortBy === 'newest') {
        return (
          new Date(b.created_at || '').getTime() -
          new Date(a.created_at || '').getTime()
        );
      }
      if (sortBy === 'oldest') {
        return (
          new Date(a.created_at || '').getTime() -
          new Date(b.created_at || '').getTime()
        );
      }
      if (sortBy === 'price_desc') {
        return (Number(b.sale_price) || 0) - (Number(a.sale_price) || 0);
      }
      if (sortBy === 'price_asc') {
        return (Number(a.sale_price) || 0) - (Number(b.sale_price) || 0);
      }
      if (sortBy === 'year_desc') {
        return (Number(b.year) || 0) - (Number(a.year) || 0);
      }
      if (sortBy === 'reg_asc') {
        return a.registration_no.localeCompare(b.registration_no);
      }
      return 0;
    });
  }, [vehicleList, activeTab, attentionFilter, query, sortBy]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Handlers
  const handleDeleteVehicle = async (verificationToken?: string) => {
    if (!vehicleToDelete) return;
    setIsDeleting(true);
    try {
      const res = await softDeleteVehicle(vehicleToDelete.id, verificationToken);
      if (!res.success) {
        toast.error(res.error || 'Failed to delete vehicle.');
        return;
      }
      toast.success(
        `Vehicle ${vehicleToDelete.registration_no} moved to Deleted archive.`
      );
      setVehicleList((prev) =>
        prev.map((v) =>
          v.id === vehicleToDelete.id
            ? { ...v, status: 'deleted', is_published: false }
            : v
        )
      );
      setVehicleToDelete(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Error deleting vehicle.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreVehicle = async (vehicle: Vehicle) => {
    setRestoringId(vehicle.id);
    try {
      const res = await restoreVehicle(vehicle.id);
      if (!res.success) {
        toast.error(res.error || 'Failed to restore vehicle.');
        return;
      }
      toast.success(
        `Vehicle ${vehicle.registration_no} restored to active inventory.`
      );
      setVehicleList((prev) =>
        prev.map((v) =>
          v.id === vehicle.id
            ? {
              ...v,
              status: res.vehicle?.status || 'in_stock',
              is_published: true,
            }
            : v
        )
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Error restoring vehicle.');
    } finally {
      setRestoringId(null);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo.trim() || !makeModel.trim()) {
      toast.error('Registration plate and Make/Model are required.');
      return;
    }

    setIsVehicleSaving(true);
    try {
      const res = await addVehicle({
        registrationNo: regNo.toUpperCase().trim(),
        makeModel: makeModel.trim(),
        type,
        year,
        purchasePrice,
        salePrice,
        purchaseDate,
      });

      if (res.success && res.vehicle) {
        toast.success(`Vehicle ${regNo} added to yard inventory!`);
        setVehicleList([res.vehicle as Vehicle, ...vehicleList]);
        setIsAddVehicleOpen(false);
        setRegNo('');
        setMakeModel('');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to add vehicle.');
      }
    } catch {
      toast.error('An error occurred while creating vehicle.');
    } finally {
      setIsVehicleSaving(false);
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForCost || !costAmount || !costDescription.trim()) {
      toast.error('Expense amount and description are required.');
      return;
    }

    setIsCostSaving(true);
    try {
      const res = await addVehicleCost({
        vehicleId: selectedVehicleForCost.id,
        costType,
        amount: costAmount,
        description: costDescription.trim(),
        vendorName: vendorName.trim(),
      });

      if (res.success) {
        toast.success(
          `Cost of ${formatKES(costAmount)} added to ${selectedVehicleForCost.registration_no
          }`
        );
        setIsAddCostOpen(false);
        setCostDescription('');
        setVendorName('');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to add cost.');
      }
    } catch {
      toast.error('An error occurred while saving cost.');
    } finally {
      setIsCostSaving(false);
    }
  };

  const handleStatusChange = async (
    vehicleId: string,
    newStatus: VehicleStatus
  ) => {
    try {
      const res = await updateVehicleStatusAction(vehicleId, newStatus);
      if (res.success) {
        toast.success(
          `Vehicle status updated to ${newStatus.replace('_', ' ')}`
        );
        setVehicleList((prev) =>
          prev.map((v) =>
            v.id === vehicleId
              ? {
                ...v,
                status: newStatus,
                is_published: newStatus === 'in_stock' ? v.is_published : false,
              }
              : v
          )
        );
        setOpenMenuId(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update status.');
      }
    } catch {
      toast.error('An error occurred.');
    }
  };

  const handleTogglePublish = async (
    vehicleId: string,
    newPublishState: boolean
  ) => {
    if (!isManagerOrAdmin) {
      toast.error(
        'Only managers or administrators can change website visibility.'
      );
      return;
    }
    setTogglingPublishId(vehicleId);
    try {
      const res = await toggleVehiclePublishAction(vehicleId, newPublishState);
      if (res.success) {
        toast.success(
          newPublishState
            ? 'Vehicle is now visible on the public website!'
            : 'Vehicle hidden from the public website.'
        );
        setVehicleList((prev) =>
          prev.map((v) =>
            v.id === vehicleId ? { ...v, is_published: newPublishState } : v
          )
        );
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update website status.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error updating website status.');
    } finally {
      setTogglingPublishId(null);
    }
  };

  // Reusable Action Menu Dropdown for both Desktop Table and Mobile Cards
  const renderActionMenu = (vehicle: Vehicle) => {
    if (openMenuId !== vehicle.id) return null;

    return (
      <div
        className="absolute right-0 top-9 z-50 w-56 rounded-2xl border border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#151D17] p-2 text-slate-900 dark:text-[#F4F7F4] shadow-xl dark:shadow-[0_12px_32px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <Link
            href={`/vehicles/${vehicle.id}`}
            onClick={() => setOpenMenuId(null)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-[#C1CBC3] dark:hover:bg-[#18221A] dark:hover:text-[#F4F7F4] transition-colors"
          >
            <Eye className="size-3.5 text-slate-400" />
            <span>View Vehicle Details</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setOpenMenuId(null);
              setSelectedVehicleForCost(vehicle);
              setIsAddCostOpen(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-[#18221A] transition-colors cursor-pointer"
          >
            <Wrench className="size-3.5" />
            <span>Add Pre-Sale Expense</span>
          </button>

          <Link
            href={`/loans/create?vehicleId=${vehicle.id}`}
            onClick={() => setOpenMenuId(null)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-[#18221A] transition-colors"
          >
            <Banknote className="size-3.5" />
            <span>Create Loan / Contract</span>
          </Link>
        </div>

        <div className="my-2 border-t border-slate-100 dark:border-[#29352D]" />
        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#A1ADA4]">
          Change Status
        </div>

        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => handleStatusChange(vehicle.id, 'in_stock')}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-[#C1CBC3] dark:hover:bg-[#18221A] transition-colors cursor-pointer"
          >
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>In Stock</span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange(vehicle.id, 'reserved')}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 dark:text-[#C1CBC3] dark:hover:bg-[#18221A] transition-colors cursor-pointer"
          >
            <ShieldCheck className="size-3.5 text-amber-500" />
            <span>Reserved</span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange(vehicle.id, 'financed')}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-[#C1CBC3] dark:hover:bg-[#18221A] transition-colors cursor-pointer"
          >
            <TrendingUp className="size-3.5 text-blue-500" />
            <span>On Credit / Financed</span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange(vehicle.id, 'cash_sale')}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-[#C1CBC3] dark:hover:bg-[#18221A] transition-colors cursor-pointer"
          >
            <DollarSign className="size-3.5 text-slate-500" />
            <span>Cash Sale</span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange(vehicle.id, 'repossessed')}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-[#18221A] transition-colors cursor-pointer"
          >
            <AlertTriangle className="size-3.5 text-rose-500" />
            <span>Repossessed</span>
          </button>
        </div>

        {isManagerOrAdmin && (
          <>
            <div className="my-2 border-t border-slate-100 dark:border-[#29352D]" />
            <button
              type="button"
              onClick={() => {
                setOpenMenuId(null);
                handleTogglePublish(vehicle.id, !vehicle.is_published);
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
                vehicle.is_published
                  ? 'text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-[#18221A]'
                  : 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-[#18221A]'
              )}
            >
              {vehicle.is_published ? (
                <EyeOff className="size-3.5 text-amber-500" />
              ) : (
                <Globe className="size-3.5 text-emerald-500" />
              )}
              <span>
                {vehicle.is_published ? 'Hide from Website' : 'Publish to Website'}
              </span>
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-[#29352D]" />
            <button
              type="button"
              onClick={() => {
                setOpenMenuId(null);
                setVehicleToDelete(vehicle);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-[#18221A] transition-colors cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              <span>Delete Vehicle</span>
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 w-full max-w-full overflow-hidden">
      {/* ================================================== */}
      {/* 1. COMMERCIAL INVENTORY KPI OVERVIEW               */}
      {/* ================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* KPI 1: In-Stock Available Units */}
        <div
          onClick={() => {
            setActiveTab('in_stock');
            setAttentionFilter('all');
          }}
          className={cn(
            'card-premium p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5',
            activeTab === 'in_stock' &&
            attentionFilter === 'all' &&
            'ring-2 ring-emerald-500/50 dark:ring-emerald-400/50 bg-emerald-50/20 dark:bg-emerald-950/20'
          )}
          title="Click to view In-Stock vehicles ready for sale"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4] truncate">
              In Yard Stock
            </span>
            <span className="badge badge-success text-[9px] sm:text-[10px] px-1.5 py-0.5 shrink-0">
              Ready
            </span>
          </div>
          <div className="mt-2 sm:mt-2.5">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-[#F4F7F4] tabular-nums truncate">
              {counts.in_stock}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#A1ADA4] mt-1 truncate">
              {counts.all} active in fleet
            </p>
          </div>
        </div>

        {/* KPI 2: On Credit / Financed Units */}
        <div
          onClick={() => {
            setActiveTab('financed');
            setAttentionFilter('all');
          }}
          className={cn(
            'card-premium p-3 sm:p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5',
            activeTab === 'financed' &&
            attentionFilter === 'all' &&
            'ring-2 ring-blue-500/50 dark:ring-blue-400/50 bg-blue-50/20 dark:bg-blue-950/20'
          )}
          title="Click to view vehicles financed under client agreements"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4] truncate">
              On Credit / Financed
            </span>
            <span className="badge text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 shrink-0">
              Active
            </span>
          </div>
          <div className="mt-2 sm:mt-2.5">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums truncate">
              {counts.financed}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#A1ADA4] mt-1 truncate">
              {counts.reserved > 0 ? `${counts.reserved} reserved` : 'Under financing terms'}
            </p>
          </div>
        </div>

        {/* KPI 3: Total Capital Deployed in Yard */}
        <div className="card-premium p-3 sm:p-4 flex flex-col justify-between border-slate-300 dark:border-[#38483d]">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4] truncate">
              Yard Stock Value
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 dark:text-[#A1ADA4] shrink-0">
              Purchase
            </span>
          </div>
          <div className="mt-2 sm:mt-2.5">
            <h3 className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-[#B7FF3C] tabular-nums truncate" title={formatKES(inStockFinancials.totalCost)}>
              {formatKES(inStockFinancials.totalCost)}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#A1ADA4] mt-1 truncate">
              Tied in {counts.in_stock} stock units
            </p>
          </div>
        </div>

        {/* KPI 4: Target Showroom Value & Spread */}
        <div className="card-premium p-3 sm:p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#A1ADA4] truncate">
              Target Value
            </span>
            {inStockFinancials.projectedMargin > 0 && (
              <span className="badge text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0">
                +{inStockFinancials.marginPct}%
              </span>
            )}
          </div>
          <div className="mt-2 sm:mt-2.5">
            <h3 className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F4F7F4] tabular-nums truncate" title={formatKES(inStockFinancials.totalTargetSale)}>
              {formatKES(inStockFinancials.totalTargetSale)}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 tabular-nums truncate">
              Spread: {formatKES(inStockFinancials.projectedMargin)}
            </p>
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 2. OPERATIONAL SIGNALS & EXCEPTIONS STRIP (ADMIN)  */}
      {/* ================================================== */}
      {isAdmin &&
        (counts.missing_photos > 0 ||
          counts.in_stock_unpublished > 0 ||
          counts.aging_60 > 0) && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-[#29352D] bg-white/70 dark:bg-[#151D17] p-3 sm:p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-[#F4F7F4]">
                  Yard Operational Signals:
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {counts.missing_photos > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('in_stock');
                      setAttentionFilter(
                        attentionFilter === 'missing_photos' ? 'all' : 'missing_photos'
                      );
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:py-1 text-xs font-medium transition cursor-pointer min-h-[32px]',
                      attentionFilter === 'missing_photos'
                        ? 'bg-amber-600 text-white font-semibold'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/40 hover:bg-amber-100'
                    )}
                    title="Vehicles in stock that need showroom photos"
                  >
                    <ImageIcon className="size-3" />
                    <span>{counts.missing_photos} Need Photos</span>
                  </button>
                )}

                {counts.in_stock_unpublished > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('in_stock');
                      setAttentionFilter(
                        attentionFilter === 'unpublished' ? 'all' : 'unpublished'
                      );
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:py-1 text-xs font-medium transition cursor-pointer min-h-[32px]',
                      attentionFilter === 'unpublished'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/40 hover:bg-blue-100'
                    )}
                    title="Vehicles in stock not published on public website"
                  >
                    <EyeOff className="size-3" />
                    <span>{counts.in_stock_unpublished} Hidden from Website</span>
                  </button>
                )}

                {counts.aging_60 > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('in_stock');
                      setAttentionFilter(
                        attentionFilter === 'aging' ? 'all' : 'aging'
                      );
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:py-1 text-xs font-medium transition cursor-pointer min-h-[32px]',
                      attentionFilter === 'aging'
                        ? 'bg-rose-600 text-white font-semibold'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/40 hover:bg-rose-100'
                    )}
                    title="Vehicles in yard stock for over 60 days"
                  >
                    <Clock className="size-3" />
                    <span>{counts.aging_60} Aging &gt;60d</span>
                  </button>
                )}

                {attentionFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setAttentionFilter('all')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-[#F4F7F4] px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#1D2920] cursor-pointer min-h-[32px]"
                  >
                    <X className="size-3" />
                    <span>Reset Signal</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      {/* ================================================== */}
      {/* 3. TOOLBAR: FILTERS, SEARCH, SORT & VIEW SWITCHER   */}
      {/* ================================================== */}
      <div className="flex flex-col gap-3.5 sm:gap-4">
        {/* Status Filter Tabs */}
        <div className="w-full overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 sm:mx-0 sm:px-0 touch-pan-x">
          <div className="status-filter-group w-fit max-w-full inline-flex items-center gap-1 p-1 rounded-2xl dark:bg-[#101612] dark:border dark:border-[#29352D]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setActiveTab('all');
                setAttentionFilter('all');
              }}
              className={cn(
                'status-filter-pill text-xs font-semibold px-2.5 sm:px-3 py-2 h-9 cursor-pointer shrink-0 whitespace-nowrap',
                activeTab === 'all' && 'status-filter-pill-active'
              )}
            >
              <Car className="size-3.5 mr-1.5" />
              <span>All Vehicles</span>
              <span className="ml-1.5 text-[10px] opacity-75">({counts.all})</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setActiveTab('in_stock');
                setAttentionFilter('all');
              }}
              className={cn(
                'status-filter-pill text-xs font-semibold px-2.5 sm:px-3 py-2 h-9 cursor-pointer shrink-0 whitespace-nowrap',
                activeTab === 'in_stock' && 'status-filter-pill-active'
              )}
            >
              <CheckCircle2 className="size-3.5 mr-1.5 text-emerald-500" />
              <span>In Stock</span>
              <span className="ml-1.5 text-[10px] opacity-75">({counts.in_stock})</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setActiveTab('financed');
                setAttentionFilter('all');
              }}
              className={cn(
                'status-filter-pill text-xs font-semibold px-2.5 sm:px-3 py-2 h-9 cursor-pointer shrink-0 whitespace-nowrap',
                activeTab === 'financed' && 'status-filter-pill-active'
              )}
            >
              <TrendingUp className="size-3.5 mr-1.5 text-blue-500" />
              <span>On Credit</span>
              <span className="ml-1.5 text-[10px] opacity-75">({counts.financed})</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setActiveTab('reserved');
                setAttentionFilter('all');
              }}
              className={cn(
                'status-filter-pill text-xs font-semibold px-2.5 sm:px-3 py-2 h-9 cursor-pointer shrink-0 whitespace-nowrap',
                activeTab === 'reserved' && 'status-filter-pill-active'
              )}
            >
              <ShieldCheck className="size-3.5 mr-1.5 text-amber-500" />
              <span>Reserved</span>
              <span className="ml-1.5 text-[10px] opacity-75">({counts.reserved})</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setActiveTab('cash_sale');
                setAttentionFilter('all');
              }}
              className={cn(
                'status-filter-pill text-xs font-semibold px-2.5 sm:px-3 py-2 h-9 cursor-pointer shrink-0 whitespace-nowrap',
                activeTab === 'cash_sale' && 'status-filter-pill-active'
              )}
            >
              <DollarSign className="size-3.5 mr-1.5 text-slate-500" />
              <span>Cash Sale</span>
              <span className="ml-1.5 text-[10px] opacity-75">({counts.cash_sale})</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setActiveTab('repossessed');
                setAttentionFilter('all');
              }}
              className={cn(
                'status-filter-pill text-xs font-semibold px-2.5 sm:px-3 py-2 h-9 cursor-pointer shrink-0 whitespace-nowrap',
                activeTab === 'repossessed' && 'status-filter-pill-active'
              )}
            >
              <AlertTriangle className="size-3.5 mr-1.5 text-rose-500" />
              <span>Repossessed</span>
              <span className="ml-1.5 text-[10px] opacity-75">({counts.repossessed})</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setActiveTab('on_website');
                setAttentionFilter('all');
              }}
              className={cn(
                'status-filter-pill text-xs font-semibold px-2.5 sm:px-3 py-2 h-9 cursor-pointer shrink-0 whitespace-nowrap',
                activeTab === 'on_website' && 'status-filter-pill-active'
              )}
            >
              <Globe className="size-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              <span>On Website</span>
              <span className="ml-1.5 text-[10px] opacity-75">({counts.on_website})</span>
            </Button>

            {(counts.deleted > 0 || isManagerOrAdmin) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setActiveTab('deleted');
                  setAttentionFilter('all');
                }}
                className={cn(
                  'status-filter-pill text-xs font-semibold px-2.5 sm:px-3 py-2 h-9 cursor-pointer shrink-0 whitespace-nowrap',
                  activeTab === 'deleted' && 'status-filter-pill-active',
                  counts.deleted > 0 &&
                  activeTab !== 'deleted' &&
                  'text-rose-600 hover:text-rose-700 dark:text-rose-400'
                )}
              >
                <Trash2 className="size-3.5 mr-1.5" />
                <span>Archived</span>
                <span className="ml-1.5 text-[10px] opacity-75">({counts.deleted})</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search, Sort, View Mode, and Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0 w-full lg:max-w-md">
            <div className="search-box w-full">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search registration, make, model, type, or year..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input w-full text-xs sm:text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-[#F4F7F4] p-1 cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Controls: Sort + View Mode + Add Button */}
          <div className="flex items-center gap-2 sm:gap-2.5 w-full lg:w-auto justify-between sm:justify-end shrink-0">
            {/* Sort Selector */}
            <div className="flex-1 sm:flex-initial w-auto sm:w-[170px]">
              <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                <SelectTrigger className="input-class h-10 w-full text-xs !px-2.5 sm:!px-3 font-medium">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent className="z-50 min-w-[190px]">
                  <SelectItem value="newest">Newest Added</SelectItem>
                  <SelectItem value="oldest">Oldest Added (Aging)</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="year_desc">Year: Newest First</SelectItem>
                  <SelectItem value="reg_asc">Registration: A - Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle: Table vs Showroom Grid */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-[#29352D] bg-slate-50 dark:bg-[#18221A] p-0.5 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer',
                  viewMode === 'table'
                    ? 'bg-white dark:bg-[#151D17] text-slate-900 dark:text-[#F4F7F4] shadow-xs'
                    : 'text-slate-500 dark:text-[#A1ADA4] hover:text-slate-800 dark:hover:text-[#F4F7F4]'
                )}
                title="Switch to detailed table view"
              >
                <TableIcon className="size-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer',
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#151D17] text-slate-900 dark:text-[#F4F7F4] shadow-xs'
                    : 'text-slate-500 dark:text-[#A1ADA4] hover:text-slate-800 dark:hover:text-[#F4F7F4]'
                )}
                title="Switch to showroom visual card view"
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Showroom</span>
              </button>
            </div>

            {/* Add Vehicle Button */}
            <button
              type="button"
              onClick={() => setIsAddVehicleOpen(true)}
              className="btn-primary h-10 px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <Plus className="size-4" />
              <span className="hidden xs:inline sm:inline">Add Vehicle</span>
              <span className="xs:hidden sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Active Filter Info & Count */}
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-[#A1ADA4] px-1">
          <div>
            Showing <strong className="text-slate-900 dark:text-[#F4F7F4]">{filtered.length}</strong> of{' '}
            <strong className="text-slate-900 dark:text-[#F4F7F4]">{counts.all}</strong> active vehicles
            {query && <span> matching &quot;{query}&quot;</span>}
            {attentionFilter !== 'all' && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">
                (Filtered by {attentionFilter.replace('_', ' ')})
              </span>
            )}
          </div>

          {(query || activeTab !== 'all' || attentionFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setActiveTab('all');
                setAttentionFilter('all');
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer shrink-0"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* ================================================== */}
      {/* 4. MAIN INVENTORY DISPLAY: TABLE OR GRID VIEW      */}
      {/* ================================================== */}
      {viewMode === 'table' ? (
        /* ── TABLE VIEW ────────────────────────────────── */
        <div className="space-y-4">
          {/* Desktop & Tablet Data Table (md and up / >=768px) */}
          <div className="hidden md:block data-table-wrap bg-white dark:bg-[#151D17] border border-gray-200/70 dark:border-[#29352D] rounded-2xl overflow-hidden shadow-xs">
            <div className="data-table-scroll overflow-x-auto">
              <Table className="data-table w-full min-w-[720px]">
                <TableHeader>
                  <TableRow className="data-table-head-row border-b border-slate-200 dark:border-[#29352D] bg-slate-50/70 dark:bg-[#101612]">
                    <TableHead className="data-th text-left py-3.5 px-3 sm:px-4 font-semibold text-xs text-slate-600 dark:text-[#C1CBC3]">
                      Vehicle Profile
                    </TableHead>
                    <TableHead className="data-th text-left py-3.5 px-3 sm:px-4 font-semibold text-xs text-slate-600 dark:text-[#C1CBC3]">
                      Type &amp; Year
                    </TableHead>
                    <TableHead className="data-th text-left py-3.5 px-3 sm:px-4 font-semibold text-xs text-slate-600 dark:text-[#C1CBC3]">
                      Status &amp; Website
                    </TableHead>
                    <TableHead className="data-th text-right py-3.5 px-3 sm:px-4 font-semibold text-xs text-slate-600 dark:text-[#C1CBC3]">
                      Purchase Cost
                    </TableHead>
                    <TableHead className="data-th text-right py-3.5 px-3 sm:px-4 font-semibold text-xs text-slate-600 dark:text-[#C1CBC3]">
                      Target Sale Price
                    </TableHead>
                    <TableHead className="data-th text-center py-3.5 px-3 sm:px-4 font-semibold text-xs text-slate-600 dark:text-[#C1CBC3]">
                      Yard Age
                    </TableHead>
                    <TableHead className="data-th text-right py-3.5 px-3 sm:px-4 font-semibold text-xs text-slate-600 dark:text-[#C1CBC3]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVehicles.map((vehicle) => {
                    const daysInStock = getDaysInStock(
                      vehicle.date_purchased || vehicle.created_at
                    );
                    const purchase = Number(vehicle.purchase_price) || 0;
                    const sale = Number(vehicle.sale_price) || 0;
                    const spread = sale > 0 ? sale - purchase : 0;
                    const hasImage = vehicle.images && vehicle.images.length > 0;
                    const primaryImage = hasImage ? vehicle.images![0] : null;

                    return (
                      <TableRow
                        key={vehicle.id}
                        className="data-table-row group/row cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-[#1D2920]/60 border-b border-slate-100 dark:border-[#29352D]"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('.action-menu-container'))
                            return;
                          router.push(`/vehicles/${vehicle.id}`);
                        }}
                      >
                        {/* Vehicle Identity */}
                        <TableCell className="data-td py-3.5 px-3 sm:px-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Vehicle Thumbnail or Icon */}
                            <div className="shrink-0 size-11 rounded-xl overflow-hidden border border-slate-200 dark:border-[#29352D] bg-slate-100 dark:bg-[#18221A] flex items-center justify-center">
                              {primaryImage ? (
                                <img
                                  src={primaryImage}
                                  alt={vehicle.make_model}
                                  className="size-full object-cover group-hover/row:scale-105 transition-transform duration-200"
                                />
                              ) : (
                                <Car className="size-5 text-slate-400 dark:text-[#A1ADA4]" />
                              )}
                            </div>

                            {/* Plate & Name */}
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-950 dark:text-[#F4F7F4] tracking-wide text-sm truncate group-hover/row:text-blue-600 dark:group-hover/row:text-[#B7FF3C] transition-colors">
                                {vehicle.registration_no}
                              </span>
                              <span className="text-xs text-slate-600 dark:text-[#C1CBC3] font-medium truncate mt-0.5">
                                {vehicle.make_model}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Type & Year */}
                        <TableCell className="data-td py-3.5 px-3 sm:px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-slate-800 dark:text-[#F4F7F4]">
                              {vehicle.type || 'Saloon'}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-[#A1ADA4]">
                              Year: {vehicle.year || '—'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Status & Website */}
                        <TableCell className="data-td py-3.5 px-3 sm:px-4">
                          <div
                            className="flex flex-col items-start gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <StatusBadge status={vehicle.status} />
                            {vehicle.status !== 'deleted' && (
                              <WebsiteBadge
                                isPublished={vehicle.is_published}
                                isManagerOrAdmin={isManagerOrAdmin}
                                isToggling={togglingPublishId === vehicle.id}
                                onToggle={(e) => {
                                  e.stopPropagation();
                                  handleTogglePublish(
                                    vehicle.id,
                                    !vehicle.is_published
                                  );
                                }}
                              />
                            )}
                          </div>
                        </TableCell>

                        {/* Acquisition Cost */}
                        <TableCell className="data-td text-right py-3.5 px-3 sm:px-4">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-semibold text-slate-800 dark:text-[#C1CBC3] tabular-nums">
                              {formatKES(purchase)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-[#A1ADA4] mt-0.5">
                              {fmt(vehicle.date_purchased || vehicle.created_at)}
                            </span>
                          </div>
                        </TableCell>

                        {/* Target Sale Price & Margin */}
                        <TableCell className="data-td text-right py-3.5 px-3 sm:px-4">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-900 dark:text-[#F4F7F4] tabular-nums">
                              {sale > 0 ? formatKES(sale) : '—'}
                            </span>
                            {spread > 0 && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums mt-0.5">
                                +{formatKES(spread)}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Yard Age */}
                        <TableCell className="data-td text-center py-3.5 px-3 sm:px-4">
                          <AgingBadge days={daysInStock} />
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="data-td text-right py-3.5 px-3 sm:px-4">
                          <div
                            className="relative flex items-center justify-end gap-1 action-menu-container"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Quick details link */}
                            <Link
                              href={`/vehicles/${vehicle.id}`}
                              className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#A1ADA4] dark:hover:text-[#F4F7F4] dark:hover:bg-[#1D2920] transition-colors"
                              title="View vehicle profile"
                            >
                              <Eye className="size-4" />
                            </Link>

                            {vehicle.status === 'deleted' ? (
                              isManagerOrAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreVehicle(vehicle)}
                                  disabled={restoringId === vehicle.id}
                                  className="btn-secondary h-8 px-2.5 text-xs inline-flex items-center gap-1.5 cursor-pointer text-emerald-700 dark:text-emerald-400"
                                  title="Revert / restore vehicle to inventory"
                                >
                                  {restoringId === vehicle.id ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <RotateCcw className="size-3.5" />
                                  )}
                                  <span className="hidden sm:inline">Restore</span>
                                </button>
                              )
                            ) : (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenMenuId(
                                      openMenuId === vehicle.id ? null : vehicle.id
                                    )
                                  }
                                  className={cn(
                                    'size-8 rounded-lg border border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#18221A] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-[#C1CBC3] dark:hover:bg-[#1D2920] shadow-2xs transition-all cursor-pointer',
                                    openMenuId === vehicle.id &&
                                    'ring-2 ring-blue-500/30 border-blue-400'
                                  )}
                                  title="More vehicle operations"
                                >
                                  <MoreHorizontal className="size-4" />
                                </button>

                                {renderActionMenu(vehicle)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <div className="size-12 rounded-2xl bg-slate-100 dark:bg-[#18221A] flex items-center justify-center text-slate-400 mb-3">
                            <Car className="size-6" />
                          </div>
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-[#F4F7F4]">
                            {query
                              ? `No vehicles match "${query}"`
                              : activeTab === 'on_website'
                                ? 'No vehicles currently published on the website'
                                : activeTab === 'off_website'
                                  ? 'All active vehicles are currently published'
                                  : 'No vehicles found in this category'}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
                            {query
                              ? 'Try searching by registration plate, make, model, or year.'
                              : 'Adjust your status filter or click "Add Vehicle" to register new stock.'}
                          </p>
                          {(query || activeTab !== 'all' || attentionFilter !== 'all') && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuery('');
                                setActiveTab('all');
                                setAttentionFilter('all');
                              }}
                              className="btn-secondary h-8 px-3 text-xs mt-4 inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="size-3" />
                              <span>Reset Filters</span>
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Vehicle Cards (<md / <768px): Touch-Optimized Layout */}
          <div className="md:hidden space-y-3">
            {paginatedVehicles.map((vehicle) => {
              const daysInStock = getDaysInStock(
                vehicle.date_purchased || vehicle.created_at
              );
              const purchase = Number(vehicle.purchase_price) || 0;
              const sale = Number(vehicle.sale_price) || 0;
              const spread = sale > 0 ? sale - purchase : 0;
              const hasImage = vehicle.images && vehicle.images.length > 0;
              const primaryImage = hasImage ? vehicle.images![0] : null;

              return (
                <div
                  key={vehicle.id}
                  className="card-premium p-3.5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-[#29352D] bg-white dark:bg-[#151D17] shadow-xs hover:border-slate-300 dark:hover:border-[#38483d] transition-colors relative"
                >
                  {/* Top Row: Thumbnail + Plate + Make/Model + Actions */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                      onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                    >
                      <div className="shrink-0 size-12 rounded-xl overflow-hidden border border-slate-200 dark:border-[#29352D] bg-slate-100 dark:bg-[#18221A] flex items-center justify-center">
                        {primaryImage ? (
                          <img
                            src={primaryImage}
                            alt={vehicle.make_model}
                            className="size-full object-cover"
                          />
                        ) : (
                          <Car className="size-6 text-slate-400 dark:text-[#A1ADA4]" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-950 dark:text-[#F4F7F4] tracking-wide text-sm truncate">
                          {vehicle.registration_no}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-[#C1CBC3] font-medium truncate mt-0.5">
                          {vehicle.year ? `${vehicle.year} ` : ''}{vehicle.make_model}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-[#A1ADA4]">
                          {vehicle.type || 'Saloon'}
                        </span>
                      </div>
                    </div>

                    {/* Actions Menu Trigger */}
                    <div className="relative shrink-0 flex items-center gap-1 action-menu-container">
                      <Link
                        href={`/vehicles/${vehicle.id}`}
                        className="size-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#A1ADA4] dark:hover:text-[#F4F7F4] dark:hover:bg-[#1D2920] transition-colors"
                        title="View vehicle profile"
                      >
                        <Eye className="size-4" />
                      </Link>

                      {vehicle.status === 'deleted' ? (
                        isManagerOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRestoreVehicle(vehicle)}
                            disabled={restoringId === vehicle.id}
                            className="btn-secondary h-8 px-2 text-xs inline-flex items-center gap-1 cursor-pointer text-emerald-700 dark:text-emerald-400"
                            title="Restore vehicle"
                          >
                            {restoringId === vehicle.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <RotateCcw className="size-3" />
                            )}
                            <span>Restore</span>
                          </button>
                        )
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId === vehicle.id ? null : vehicle.id
                              )
                            }
                            className={cn(
                              'size-8 rounded-lg border border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#18221A] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-[#C1CBC3] dark:hover:bg-[#1D2920] shadow-2xs transition-all cursor-pointer',
                              openMenuId === vehicle.id &&
                                'ring-2 ring-blue-500/30 border-blue-400'
                            )}
                            title="More operations"
                          >
                            <MoreHorizontal className="size-4" />
                          </button>

                          {renderActionMenu(vehicle)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Status Badge + Website Badge + Yard Age */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-[#29352D]/80">
                    <StatusBadge status={vehicle.status} />
                    {vehicle.status !== 'deleted' && (
                      <WebsiteBadge
                        isPublished={vehicle.is_published}
                        isManagerOrAdmin={isManagerOrAdmin}
                        isToggling={togglingPublishId === vehicle.id}
                        onToggle={(e) => {
                          e.stopPropagation();
                          handleTogglePublish(vehicle.id, !vehicle.is_published);
                        }}
                      />
                    )}
                    <div className="ml-auto">
                      <AgingBadge days={daysInStock} />
                    </div>
                  </div>

                  {/* Financial Metrics Strip */}
                  <div className="rounded-xl bg-slate-50 dark:bg-[#18221A] p-2.5 border border-slate-100 dark:border-[#29352D] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-[#A1ADA4] block">
                        Acquisition Cost
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-[#C1CBC3] tabular-nums text-xs">
                        {formatKES(purchase)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-[#A1ADA4] block">
                        Target Price
                      </span>
                      <span className="font-bold text-slate-950 dark:text-[#F4F7F4] tabular-nums text-xs">
                        {sale > 0 ? formatKES(sale) : '—'}
                      </span>
                    </div>
                    {spread > 0 && (
                      <div className="col-span-2 pt-1.5 border-t border-slate-200/60 dark:border-[#29352D] flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-[#A1ADA4] font-medium">
                          Expected Margin:
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                          +{formatKES(spread)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Footer */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <Link
                      href={`/vehicles/${vehicle.id}`}
                      className="btn-secondary h-9 px-3 text-xs flex-1 inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs font-semibold"
                    >
                      <Eye className="size-3.5" />
                      <span>Details</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVehicleForCost(vehicle);
                        setIsAddCostOpen(true);
                      }}
                      className="size-9 rounded-xl border border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#18221A] flex items-center justify-center text-slate-600 dark:text-[#C1CBC3] hover:bg-slate-50 dark:hover:bg-[#1D2920] shadow-2xs transition cursor-pointer shrink-0"
                      title="Add pre-sale expense"
                    >
                      <Wrench className="size-3.5" />
                    </button>
                    <Link
                      href={`/loans/create?vehicleId=${vehicle.id}`}
                      className="btn-primary h-9 px-3.5 text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs font-semibold shrink-0"
                      title="Sell / Create Agreement"
                    >
                      <Banknote className="size-3.5" />
                      <span>Sell</span>
                    </Link>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-[#29352D] bg-slate-50/50 dark:bg-[#18221A] p-8 text-center">
                <Car className="size-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-[#C1CBC3]">
                  No vehicles found
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust filters or register new inventory stock.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── SHOWROOM GRID VIEW ────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {paginatedVehicles.map((vehicle) => {
            const daysInStock = getDaysInStock(
              vehicle.date_purchased || vehicle.created_at
            );
            const purchase = Number(vehicle.purchase_price) || 0;
            const sale = Number(vehicle.sale_price) || 0;
            const spread = sale > 0 ? sale - purchase : 0;
            const hasImage = vehicle.images && vehicle.images.length > 0;
            const primaryImage = hasImage ? vehicle.images![0] : null;

            return (
              <div
                key={vehicle.id}
                className="card-premium overflow-hidden p-0 flex flex-col justify-between group transition-all duration-300 hover:shadow-md dark:hover:shadow-none"
              >
                {/* Photo & Badges */}
                <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden border-b border-slate-100 dark:border-[#29352D]">
                  {primaryImage ? (
                    <img
                      src={primaryImage}
                      alt={vehicle.make_model}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="size-full flex flex-col items-center justify-center bg-slate-100 dark:bg-[#18221A] text-slate-400">
                      <Car className="size-10 opacity-40 mb-1" />
                      <span className="text-[10px] font-medium text-slate-400">
                        No showroom photo
                      </span>
                    </div>
                  )}

                  {/* Top Overlay Badges (Max-width protected on mobile) */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 max-w-[48%] truncate">
                    <StatusBadge status={vehicle.status} />
                  </div>

                  <div className="absolute top-2.5 right-2.5 z-10 max-w-[48%] truncate flex justify-end">
                    {vehicle.status !== 'deleted' && (
                      <WebsiteBadge
                        isPublished={vehicle.is_published}
                        isManagerOrAdmin={isManagerOrAdmin}
                        isToggling={togglingPublishId === vehicle.id}
                        onToggle={(e) => {
                          e.stopPropagation();
                          handleTogglePublish(vehicle.id, !vehicle.is_published);
                        }}
                      />
                    )}
                  </div>

                  {/* Bottom Plate Badge */}
                  <div className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-white font-bold text-xs tracking-wider">
                    {vehicle.registration_no}
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-[#F4F7F4] truncate">
                      {vehicle.year ? `${vehicle.year} ` : ''}
                      {vehicle.make_model}
                    </h3>

                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-[#A1ADA4]">
                      <span>{vehicle.type || 'Saloon'}</span>
                      <AgingBadge days={daysInStock} />
                    </div>
                  </div>

                  {/* Financial Bar */}
                  <div className="rounded-xl bg-slate-50 dark:bg-[#18221A] p-2.5 border border-slate-100 dark:border-[#29352D] space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-[#A1ADA4]">
                        Acquisition:
                      </span>
                      <span className="font-medium text-slate-700 dark:text-[#C1CBC3] tabular-nums">
                        {formatKES(purchase)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-[#A1ADA4]">
                        Target Price:
                      </span>
                      <span className="font-bold text-slate-950 dark:text-[#F4F7F4] tabular-nums">
                        {sale > 0 ? formatKES(sale) : 'Unassigned'}
                      </span>
                    </div>
                    {spread > 0 && (
                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-[#29352D] text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Gross Margin:
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                          +{formatKES(spread)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/vehicles/${vehicle.id}`}
                      className="btn-secondary h-9 px-3 text-xs flex-1 inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs font-semibold"
                    >
                      <Eye className="size-3.5" />
                      <span>Details</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVehicleForCost(vehicle);
                        setIsAddCostOpen(true);
                      }}
                      className="size-9 rounded-xl border border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#18221A] flex items-center justify-center text-slate-600 dark:text-[#C1CBC3] hover:bg-slate-50 dark:hover:bg-[#1D2920] shadow-2xs transition cursor-pointer shrink-0"
                      title="Add pre-sale expense"
                    >
                      <Wrench className="size-3.5" />
                    </button>

                    <Link
                      href={`/loans/create?vehicleId=${vehicle.id}`}
                      className="btn-primary h-9 px-3 text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs font-semibold shrink-0"
                      title="Create Financing Agreement"
                    >
                      <Banknote className="size-3.5" />
                      <span>Sell</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 dark:border-[#29352D] bg-slate-50/50 dark:bg-[#18221A] p-8 sm:p-12 text-center">
              <Car className="size-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <h4 className="text-sm font-semibold text-slate-700 dark:text-[#C1CBC3]">
                No vehicles match current criteria
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Try adjusting your search query, status tabs, or operational signals.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================================================== */}
      {/* 5. PAGINATION CONTROLS                             */}
      {/* ================================================== */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-[#A1ADA4]">
          <div className="text-center sm:text-left">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}{' '}
            records
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-secondary h-9 sm:h-8 px-3 sm:px-2.5 text-xs inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 font-semibold text-slate-800 dark:text-[#F4F7F4] min-w-[90px] text-center">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-secondary h-9 sm:h-8 px-3 sm:px-2.5 text-xs inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 6. MODALS: ADD VEHICLE & ADD EXPENSE               */}
      {/* ================================================== */}

      {/* Add Vehicle to Yard Modal */}
      <CustomModal
        isOpen={isAddVehicleOpen}
        onClose={() => setIsAddVehicleOpen(false)}
        title="Add Vehicle to Yard Inventory"
        width={560}
      >
        <form onSubmit={handleAddVehicle} className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-[#29352D] bg-slate-50 dark:bg-[#18221A] p-3 text-xs text-slate-500 dark:text-[#A1ADA4]">
            Register a newly acquired motor vehicle into Ebenezar DMS inventory.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] mb-1">
                Registration Plate *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. KDA 450Y"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                className="input-class h-10 w-full uppercase font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] mb-1">
                Make &amp; Model *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Toyota Prado TX"
                value={makeModel}
                onChange={(e) => setMakeModel(e.target.value)}
                className="input-class h-10 w-full font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] mb-1">
                Vehicle Body Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input-class h-10 w-full text-xs"
              >
                <option value="SUV">SUV</option>
                <option value="Compact SUV">Compact SUV</option>
                <option value="Saloon">Saloon</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Station Wagon">Station Wagon</option>
                <option value="Minivan">Minivan</option>
                <option value="Pickup / Commercial">Pickup / Commercial</option>
                <option value="Van">Van</option>
                <option value="Pikipiki">Pikipiki</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] mb-1">
                Year of Manufacture
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="input-class h-10 w-full font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] mb-1">
                Acquisition Cost (KES) *
              </label>
              <input
                type="number"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="input-class h-10 w-full font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] mb-1">
                Target Selling Price (KES) *
              </label>
              <input
                type="number"
                required
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                className="input-class h-10 w-full font-bold text-emerald-600 dark:text-[#B7FF3C] tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="input-class h-10 w-full text-xs"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2.5 pt-4 border-t border-slate-100 dark:border-[#29352D]">
            <button
              type="button"
              onClick={() => setIsAddVehicleOpen(false)}
              className="btn-secondary h-10 px-4 text-xs font-semibold cursor-pointer w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVehicleSaving}
              className="btn-primary h-10 px-5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 w-full sm:w-auto"
            >
              {isVehicleSaving && <Loader2 className="size-3.5 animate-spin" />}
              <span>Save Vehicle to Yard</span>
            </button>
          </div>
        </form>
      </CustomModal>

      {/* Add Pre-Sale Expense Modal */}
      {isAddCostOpen && selectedVehicleForCost && (
        <CustomModal
          isOpen={isAddCostOpen}
          onClose={() => setIsAddCostOpen(false)}
          title="Add Pre-Sale Expense"
          width={480}
        >
          <form onSubmit={handleAddCost} className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-[#29352D] bg-slate-50 dark:bg-[#18221A] p-3 text-xs text-slate-500 dark:text-[#A1ADA4]">
              Logging repair / reconditioning expense for{' '}
              <strong className="text-slate-900 dark:text-[#F4F7F4]">
                {selectedVehicleForCost.registration_no}
              </strong>{' '}
              ({selectedVehicleForCost.make_model}).
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] mb-1">
                Cost Category
              </label>
              <select
                value={costType}
                onChange={(e) => setCostType(e.target.value as VehicleCostType)}
                className="input-class h-10 w-full text-xs"
              >
                <option value="mechanical">Mechanical Repair / Servicing</option>
                <option value="bodywork">Bodywork / Panel Beating / Paint</option>
                <option value="tracking">GPS Tracking Hardware &amp; Installation</option>
                <option value="detailing">Interior / Detailing / Buffing</option>
                <option value="legal">Logbook Transfer / Legal Inspection</option>
                <option value="import_duty">Import Duty / Port Charges</option>
                <option value="other">Other Incidentals</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] mb-1">
                Expense Amount (KES) *
              </label>
              <input
                type="number"
                required
                value={costAmount}
                onChange={(e) => setCostAmount(Number(e.target.value))}
                className="input-class h-10 w-full font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] mb-1">
                Description / Detail *
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#C1CBC3] mb-1">
                Garage / Vendor Name
              </label>
              <input
                type="text"
                placeholder="e.g. QUICKFIT AUTO KISUMU"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value.toUpperCase())}
                className="input-class h-10 w-full uppercase"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2.5 pt-4 border-t border-slate-100 dark:border-[#29352D]">
              <button
                type="button"
                onClick={() => setIsAddCostOpen(false)}
                className="btn-secondary h-10 px-4 text-xs font-semibold cursor-pointer w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCostSaving}
                className="btn-primary h-10 px-5 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 w-full sm:w-auto"
              >
                {isCostSaving && <Loader2 className="size-3.5 animate-spin" />}
                <span>Record Expense</span>
              </button>
            </div>
          </form>
        </CustomModal>
      )}

      {/* Delete Vehicle Security Re-Authentication Modal (100% Preserved) */}
      <SecureActionModal
        isOpen={Boolean(vehicleToDelete)}
        onClose={() => setVehicleToDelete(null)}
        onAuthorized={(token) => handleDeleteVehicle(token)}
        action="VEHICLE_DELETE"
        resourceId={vehicleToDelete?.id || ''}
        title="Delete Vehicle Record"
        description="This vehicle will be hidden from the active yard inventory and public marketplace. Enter your password to authorize moving this record to the deleted archive."
        confirmLabel="Confirm Delete Vehicle"
        severity="danger"
        summaryItems={[
          { label: 'Registration No', value: vehicleToDelete?.registration_no || '' },
          { label: 'Make & Model', value: vehicleToDelete?.make_model || '' },
          {
            label: 'Sale Price',
            value: vehicleToDelete?.sale_price
              ? formatKES(vehicleToDelete.sale_price)
              : 'N/A',
          },
        ]}
      />
    </div>
  );
}
