'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { Vehicle, VehicleCostType, VehicleStatus } from '@/src/types/database.types';
import { formatKES } from '@/src/lib/financial-engine';
import { addVehicle, addVehicleCost, updateVehicleStatusAction, softDeleteVehicle, restoreVehicle } from '@/lib/actions/vehicle.actions';
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
  ListChecks,
  AlertTriangle,
  Sparkles,
  MoreHorizontal,
  Eye,
  ChevronDown,
  ChevronUp,
  Settings,
  Trash2,
  RotateCcw,
  History
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
  TableResponsiveGrid,
  TableResponsiveCard,
  TableResponsiveCardHeader,
  TableResponsiveCardContent,
} from '@/components/ui/table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface YardInventoryManagerProps {
  vehicles: Vehicle[];
  currentUser?: any;
}

function StatusBadge({ status }: { status: VehicleStatus }) {
  if (status === 'in_stock') return <span className="badge badge-success">In Stock</span>;
  if (status === 'reserved') return <span className="badge badge-warning">Reserved</span>;
  if (status === 'financed') return <span className="badge badge-pending" style={{ background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' }}>Credit</span>;
  if (status === 'repossessed') return <span className="badge badge-error">Repossessed</span>;
  if (status === 'cash_sale') return <span className="badge badge-completed">Cash Sale</span>;
  if (status === 'deleted') return <span className="badge badge-error" style={{ background: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' }}>Deleted</span>;
  return <span className="badge badge-new">{status}</span>;
}

export default function YardInventoryManager({ vehicles, currentUser }: YardInventoryManagerProps) {
  const router = useRouter();
  const [vehicleList, setVehicleList] = useState<Vehicle[]>(vehicles);
  const isManagerOrAdmin = currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN';

  // Modal States
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddCostOpen, setIsAddCostOpen] = useState(false);
  const [selectedVehicleForCost, setSelectedVehicleForCost] = useState<Vehicle | null>(null);

  // Add Vehicle Form State
  const [regNo, setRegNo] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [type, setType] = useState('SUV');
  const [year, setYear] = useState<number>(new Date().getFullYear() - 5);
  const [purchasePrice, setPurchasePrice] = useState<number>(1000000);
  const [salePrice, setSalePrice] = useState<number>(1400000);
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isVehicleSaving, setIsVehicleSaving] = useState(false);

  // Add Cost Form State
  const [costType, setCostType] = useState<VehicleCostType>('mechanical');
  const [costAmount, setCostAmount] = useState<number>(15000);
  const [costDescription, setCostDescription] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [isCostSaving, setIsCostSaving] = useState(false);

  // Table States
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'in_stock' | 'reserved' | 'financed' | 'repossessed' | 'cash_sale' | 'deleted'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const res = {
      all: 0,
      in_stock: 0,
      financed: 0,
      reserved: 0,
      repossessed: 0,
      cash_sale: 0,
      deleted: 0,
    };

    for (const v of vehicleList) {
      if (v.status === 'deleted') {
        res.deleted++;
      } else {
        res.all++;
        if (v.status === 'in_stock') res.in_stock++;
        else if (v.status === 'financed') res.financed++;
        else if (v.status === 'reserved') res.reserved++;
        else if (v.status === 'repossessed') res.repossessed++;
        else if (v.status === 'cash_sale') res.cash_sale++;
      }
    }

    return res;
  }, [vehicleList]);

  const deletedCount = counts.deleted;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const filtered = useMemo(() => {
    let result = vehicleList;

    if (activeTab === 'all') {
      result = vehicleList.filter(v => v.status !== 'deleted');
    } else {
      result = vehicleList.filter(v => v.status === activeTab);
    }

    if (!query.trim()) return result;
    const q = query.toLowerCase();
    return result.filter((v) =>
      v.registration_no.toLowerCase().includes(q) ||
      v.make_model.toLowerCase().includes(q)
    );
  }, [vehicleList, query, activeTab]);

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    setIsDeleting(true);
    try {
      const res = await softDeleteVehicle(vehicleToDelete.id);
      if (!res.success) {
        toast.error(res.error || 'Failed to delete vehicle.');
        return;
      }
      toast.success(`Vehicle ${vehicleToDelete.registration_no} moved to Deleted archive.`);
      setVehicleList(prev => prev.map(v => v.id === vehicleToDelete.id ? { ...v, status: 'deleted', is_published: false } : v));
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
      toast.success(`Vehicle ${vehicle.registration_no} restored to active inventory.`);
      setVehicleList(prev => prev.map(v => v.id === vehicle.id ? { ...v, status: res.vehicle?.status || 'in_stock', is_published: true } : v));
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Error restoring vehicle.');
    } finally {
      setRestoringId(null);
    }
  };

  // Handlers
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo.trim() || !makeModel.trim()) {
      toast.error('Registration number and Make/Model are required.');
      return;
    }

    setIsVehicleSaving(true);
    try {
      const res = await addVehicle({
        registrationNo: regNo.toUpperCase(),
        makeModel,
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
      } else {
        toast.error(res.error || 'Failed to add vehicle.');
      }
    } catch {
      toast.error('An error occurred.');
    } finally {
      setIsVehicleSaving(false);
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForCost || !costAmount || !costDescription.trim()) {
      toast.error('Cost amount and description are required.');
      return;
    }

    setIsCostSaving(true);
    try {
      const res = await addVehicleCost({
        vehicleId: selectedVehicleForCost.id,
        costType,
        amount: costAmount,
        description: costDescription,
        vendorName,
      });

      if (res.success) {
        toast.success(`Cost of ${formatKES(costAmount)} added to ${selectedVehicleForCost.registration_no}`);
        setIsAddCostOpen(false);
        setCostDescription('');
        setVendorName('');
      } else {
        toast.error(res.error || 'Failed to add cost.');
      }
    } catch {
      toast.error('An error occurred.');
    } finally {
      setIsCostSaving(false);
    }
  };

  const handleStatusChange = async (vehicleId: string, newStatus: VehicleStatus) => {
    try {
      const res = await updateVehicleStatusAction(vehicleId, newStatus);
      if (res.success) {
        toast.success(`Vehicle status updated to ${newStatus.replace('_', ' ')}`);
        setVehicleList((prev) =>
          prev.map((v) => (v.id === vehicleId ? { ...v, status: newStatus, is_published: newStatus === 'in_stock' } : v))
        );
        setOpenMenuId(null);
      } else {
        toast.error(res.error || 'Failed to update status.');
      }
    } catch {
      toast.error('An error occurred.');
    }
  };

  return (
    <div className="flex flex-col gap-5 mt-6">
      {/* Top Action Bar 
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Yard Stock Manager</h1>
          <p className="text-xs text-slate-500">
            Track physical vehicles, mechanical expenses, pre-sale preparation, and showroom status.
          </p>
        </div>

        <button
          onClick={() => setIsAddVehicleOpen(true)}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all"
        >
          <Plus size={16} />
          Add Vehicle to Stock
        </button>
      </div>
      */}

      {/* Table Toolbar Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
        <div className="status-filter-group w-fit max-w-full overflow-x-auto">
          <Button onClick={() => setActiveTab('all')} className={cn('status-filter-pill', activeTab === 'all' && 'status-filter-pill-active')}>
            <div className="flex items-center gap-2">
              <Car className="size-3.5" />
              <span>All Vehicles ({counts.all})</span>
            </div>
          </Button>
          <Button onClick={() => setActiveTab('in_stock')} className={cn('status-filter-pill', activeTab === 'in_stock' && 'status-filter-pill-active')}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5" />
              <span>In Stock ({counts.in_stock})</span>
            </div>
          </Button>
          <Button onClick={() => setActiveTab('financed')} className={cn('status-filter-pill', activeTab === 'financed' && 'status-filter-pill-active')}>
            <div className="flex items-center gap-2">
              <TrendingUp className="size-3.5" />
              <span>On Credit ({counts.financed})</span>
            </div>
          </Button>
          <Button onClick={() => setActiveTab('reserved')} className={cn('status-filter-pill', activeTab === 'reserved' && 'status-filter-pill-active')}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-3.5" />
              <span>Reserved ({counts.reserved})</span>
            </div>
          </Button>
          <Button onClick={() => setActiveTab('repossessed')} className={cn('status-filter-pill', activeTab === 'repossessed' && 'status-filter-pill-active')}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              <span>Repossessed ({counts.repossessed})</span>
            </div>
          </Button>
          <Button onClick={() => setActiveTab('cash_sale')} className={cn('status-filter-pill', activeTab === 'cash_sale' && 'status-filter-pill-active')}>
            <div className="flex items-center gap-2">
              <DollarSign className="size-3.5" />
              <span>Cash Sale ({counts.cash_sale})</span>
            </div>
          </Button>
          {(counts.deleted > 0 || isManagerOrAdmin) && (
            <Button
              onClick={() => setActiveTab('deleted')}
              className={cn(
                'status-filter-pill',
                activeTab === 'deleted' && 'status-filter-pill-active',
                counts.deleted > 0 && activeTab !== 'deleted' && 'text-rose-600 hover:text-rose-700'
              )}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="size-3.5" />
                <span>Deleted ({counts.deleted})</span>
              </div>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search registration or model..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      <div className="data-table-wrap lg:block hidden">
        <div className="data-table-scroll">
          <Table className="data-table">
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="data-table-head-row">
                <TableHead className="data-th text-left">Vehicle</TableHead>
                <TableHead className="data-th text-left">Type & Year</TableHead>
                <TableHead className="data-th text-left">Status</TableHead>
                <TableHead className="data-th text-right">Purchase Price</TableHead>
                <TableHead className="data-th text-right">Sale Price</TableHead>
                <TableHead className="data-th text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((vehicle) => {
                return (
                  <TableRow
                    key={vehicle.id}
                    className="data-table-row group/row cursor-pointer"
                    onClick={(e) => {
                      // Prevent navigation if clicking on the actions dropdown or its contents
                      if ((e.target as HTMLElement).closest('.action-menu-container')) return;
                      router.push(`/vehicles/${vehicle.id}`);
                    }}
                  >
                    <TableCell className="data-td">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border border-blue-200">
                          <Car size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-900 font-mono tracking-wide">
                            {vehicle.registration_no}
                          </span>
                          <span className="text-13 text-slate-500 font-medium">
                            {vehicle.make_model}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="data-td">
                      <div className="flex flex-col gap-1">
                        <span className="text-13 text-slate-700">{vehicle.type || 'Saloon'}</span>
                        <span className="text-12 text-gray-500">{vehicle.year || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="data-td">
                      <StatusBadge status={vehicle.status} />
                    </TableCell>
                    <TableCell className="data-td text-right">
                      <span className="amount-text">{formatKES(vehicle.purchase_price)}</span>
                    </TableCell>
                    <TableCell className="data-td text-right">
                      <span className="amount-text text-slate-900 font-bold">{formatKES(vehicle.sale_price)}</span>
                    </TableCell>
                    <TableCell className="data-td text-right">
                      {vehicle.status === 'deleted' ? (
                        <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {isManagerOrAdmin && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreVehicle(vehicle);
                              }}
                              disabled={restoringId === vehicle.id}
                              className="h-8 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                              title="Revert / restore mistakenly deleted vehicle"
                            >
                              {restoringId === vehicle.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="size-3.5" />
                              )}
                              <span>Revert Vehicle</span>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div
                          className="relative flex justify-end action-menu-container"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Select
                            open={openMenuId === vehicle.id}
                            onOpenChange={(open) =>
                              setOpenMenuId(open ? vehicle.id : null)
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "inline-flex h-8 w-8 items-center justify-center",
                                "rounded-lg border border-slate-200",
                                "bg-white p-0 text-slate-500",
                                "shadow-sm",
                                "transition-all duration-200",
                                "hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800",
                                "focus:outline-none focus:ring-2 focus:ring-blue-100",
                                "data-[state=open]:border-blue-200",
                                "data-[state=open]:bg-slate-50",
                                "[&>span]:hidden",
                                "[&>svg:last-child]:hidden"
                              )}
                            >
                              <MoreHorizontal className="!block size-4" />
                            </SelectTrigger>

                            <SelectContent
                              align="end"
                              sideOffset={8}
                              className={cn(
                                "w-56",
                                "rounded-xl",
                                "border border-slate-200",
                                "bg-white/95",
                                "p-2",
                                "text-slate-900",
                                "shadow-xl shadow-slate-200/60",
                                "backdrop-blur-xl backdrop-saturate-150",
                                "ring-1 ring-slate-900/[0.03]"
                              )}
                            >
                              {/* PRIMARY ACTIONS */}
                              <div className="space-y-1">

                                <Link
                                  href={`/vehicles/${vehicle.id}`}
                                  onClick={() => setOpenMenuId(null)}
                                  className={cn(
                                    "flex w-full items-center justify-center gap-2.5",
                                    "rounded-lg px-3 py-3",
                                    "text-sm font-medium text-slate-700",
                                    "transition-colors duration-150",
                                    "hover:bg-slate-50 hover:text-slate-950"
                                  )}
                                >
                                  <Eye className="size-4 shrink-0 text-slate-500" />
                                  <span>View Details</span>
                                </Link>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setSelectedVehicleForCost(vehicle);
                                    setIsAddCostOpen(true);
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-center gap-2.5",
                                    "rounded-lg px-3 py-3",
                                    "text-sm font-medium text-blue-600",
                                    "transition-colors duration-150",
                                    "hover:bg-blue-50 hover:text-blue-700"
                                  )}
                                >
                                  <Wrench className="size-4 shrink-0" />
                                  <span>Add Expense</span>
                                </button>

                                <Link
                                  href={`/loans/create?vehicleId=${vehicle.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-center gap-2.5",
                                    "rounded-lg px-3 py-3",
                                    "text-sm font-medium text-emerald-600",
                                    "transition-colors duration-150",
                                    "hover:bg-emerald-50 hover:text-emerald-700"
                                  )}
                                >
                                  <Sparkles className="size-4 shrink-0" />
                                  <span>Create Contract</span>
                                </Link>
                              </div>

                              {/* STATUS DIVIDER */}
                              <div className="my-3 border-t border-slate-100" />

                              {/* STATUS LABEL */}
                              <div className="px-2 pb-2 pt-1 text-center">
                                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                                  Change Status
                                </span>
                              </div>

                              {/* STATUS ACTIONS */}
                              <div className="space-y-1">

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleStatusChange(vehicle.id, "in_stock");
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-center gap-2.5",
                                    "rounded-lg px-3 py-3",
                                    "text-sm font-medium text-slate-700",
                                    "transition-colors duration-150",
                                    "hover:bg-emerald-50 hover:text-emerald-700"
                                  )}
                                >
                                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                                  <span>In Stock</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleStatusChange(vehicle.id, "reserved");
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-center gap-2.5",
                                    "rounded-lg px-3 py-3",
                                    "text-sm font-medium text-slate-700",
                                    "transition-colors duration-150",
                                    "hover:bg-amber-50 hover:text-amber-700"
                                  )}
                                >
                                  <ShieldCheck className="size-4 shrink-0 text-amber-500" />
                                  <span>Reserved</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleStatusChange(vehicle.id, "financed");
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-center gap-2.5",
                                    "rounded-lg px-3 py-3",
                                    "text-sm font-medium text-slate-700",
                                    "transition-colors duration-150",
                                    "hover:bg-blue-50 hover:text-blue-700"
                                  )}
                                >
                                  <TrendingUp className="size-4 shrink-0 text-blue-500" />
                                  <span>On Credit</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleStatusChange(vehicle.id, "cash_sale");
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-center gap-2.5",
                                    "rounded-lg px-3 py-3",
                                    "text-sm font-medium text-slate-700",
                                    "transition-colors duration-150",
                                    "hover:bg-emerald-50 hover:text-emerald-700"
                                  )}
                                >
                                  <DollarSign className="size-4 shrink-0 text-emerald-500" />
                                  <span>Cash Sale</span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleStatusChange(vehicle.id, "repossessed");
                                  }}
                                  className={cn(
                                    "flex w-full items-center justify-center gap-2.5",
                                    "rounded-lg px-3 py-3",
                                    "text-sm font-medium text-slate-700",
                                    "transition-colors duration-150",
                                    "hover:bg-rose-50 hover:text-rose-700"
                                  )}
                                >
                                  <AlertTriangle className="size-4 shrink-0 text-rose-500" />
                                  <span>Repossessed</span>
                                </button>

                                {isManagerOrAdmin && (
                                  <>
                                    <div className="my-2 border-t border-slate-100" />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(null);
                                        setVehicleToDelete(vehicle);
                                      }}
                                      className={cn(
                                        "flex w-full items-center justify-center gap-2.5",
                                        "rounded-lg px-3 py-2.5",
                                        "text-sm font-medium text-rose-600",
                                        "transition-colors duration-150",
                                        "hover:bg-rose-50 hover:text-rose-700"
                                      )}
                                    >
                                      <Trash2 className="size-4 shrink-0 text-rose-500" />
                                      <span>Delete Vehicle</span>
                                    </button>
                                  </>
                                )}

                              </div>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="data-empty-cell">
                    <div className="data-empty">
                      <Car className="size-8 text-gray-300" />
                      <p className="text-14 text-gray-600 font-medium mt-2">
                        {query ? `No vehicles match "${query}"` : 'No vehicles found in stock'}
                      </p>
                      <p className="text-12 text-gray-400">
                        {query ? 'Try a different search term or check filters.' : 'Add vehicles to see them in the inventory.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <TableResponsiveGrid className="lg:hidden mt-8 mb-10 gap-5 p-6">
        {filtered.map((vehicle) => {
          const isOpen = expandedId === vehicle.id;

          return (
            <TableResponsiveCard
              key={vehicle.id}
              className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 p-5 cursor-pointer"
            >
              <TableResponsiveCardHeader
                onClick={() => setExpandedId(isOpen ? null : vehicle.id)}
                className="p-5 cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 border border-blue-200">
                    <Car size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[16px] text-slate-900 truncate font-mono tracking-wide">
                      {vehicle.registration_no}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 truncate mt-0.5">
                      {vehicle.make_model}
                    </p>
                    <div className="mt-2.5">
                      <StatusBadge status={vehicle.status} />
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-slate-400">
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </TableResponsiveCardHeader>

              <TableResponsiveCardContent isOpen={isOpen}>
                <div className="w-full space-y-4 px-4">
                  <div className="rounded-2xl bg-slate-50 p-4 grid gap-4 translate-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Type</span>
                      <span className="text-sm font-medium text-slate-700">{vehicle.type || 'Saloon'} ({vehicle.year || '—'})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Purchase Price</span>
                      <span className="font-semibold text-slate-900">{formatKES(vehicle.purchase_price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Selling Price</span>
                      <span className="font-bold text-slate-900">{formatKES(vehicle.sale_price)}</span>
                    </div>
                  </div>

                  {vehicle.status === 'deleted' ? (
                    <div className="mt-4">
                      {isManagerOrAdmin && (
                        <Button
                          onClick={() => handleRestoreVehicle(vehicle)}
                          disabled={restoringId === vehicle.id}
                          className="w-full rounded-xl h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm"
                        >
                          {restoringId === vehicle.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <RotateCcw className="size-4" />
                          )}
                          <span>Revert / Restore to Inventory</span>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <Button
                          asChild
                          variant="outline"
                          className="rounded-xl h-10 text-xs font-medium border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                        >
                          <Link href={`/vehicles/${vehicle.id}`}>
                            <Eye className="size-3.5 text-gray-500" />
                            <span>Details</span>
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedVehicleForCost(vehicle);
                            setIsAddCostOpen(true);
                          }}
                          className="rounded-xl h-10 text-xs font-medium border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                        >
                          <Wrench className="size-3.5 text-gray-500" />
                          <span>Add Expense</span>
                        </Button>
                        <Button
                          asChild
                          className="rounded-xl h-10 text-xs font-semibold bg-blue-900 hover:bg-blue-800 text-white flex items-center justify-center gap-1.5"
                        >
                          <Link href={`/loans/create?vehicleId=${vehicle.id}`}>
                            <Sparkles className="size-3.5" />
                            <span>Contract</span>
                          </Link>
                        </Button>
                      </div>
                      {isManagerOrAdmin && (
                        <Button
                          variant="outline"
                          onClick={() => setVehicleToDelete(vehicle)}
                          className="w-full mt-2 rounded-xl h-9 text-xs font-medium text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="size-3.5 text-rose-500" />
                          <span>Delete Vehicle (Manager)</span>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </TableResponsiveCardContent>
            </TableResponsiveCard>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm mx-auto mt-10 w-full">
            <Car className="size-6 mx-auto mb-3 text-slate-300" />
            <h3 className="font-semibold text-slate-700">
              {query ? "No vehicles match your search" : "No Vehicles Found"}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {query ? "Try adjusting your search or filter." : "Add vehicles to see them in the inventory."}
            </p>
          </div>
        )}
      </TableResponsiveGrid>

      {/* Modals from original YardInventoryManager */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Car size={18} className="text-blue-900" />
                Add Vehicle to Yard
              </h2>
              <button onClick={() => setIsAddVehicleOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Registration Plate *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="KBN 253K"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Make &amp; Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="Toyota Prado TX"
                    value={makeModel}
                    onChange={(e) => setMakeModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Vehicle Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
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
                  <label className="font-semibold text-slate-700 block mb-1">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Purchase Cost (KES) *</label>
                  <input
                    type="number"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Selling Price (KES) *</label>
                  <input
                    type="number"
                    required
                    value={salePrice}
                    onChange={(e) => setSalePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-blue-950"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="font-semibold text-slate-700 block mb-1">Purchase Date (Leave default for today)</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVehicleSaving}
                  className="px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isVehicleSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddCostOpen && selectedVehicleForCost && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wrench size={16} className="text-blue-900" />
                  Add Pre-Sale Expense
                </h2>
                <span className="text-xs text-slate-500">
                  Target: {selectedVehicleForCost.registration_no} ({selectedVehicleForCost.make_model})
                </span>
              </div>
              <button onClick={() => setIsAddCostOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCost} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Cost Category</label>
                <select
                  value={costType}
                  onChange={(e) => setCostType(e.target.value as VehicleCostType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
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
                <label className="font-semibold text-slate-700 block mb-1">Expense Amount (KES) *</label>
                <input
                  type="number"
                  required
                  value={costAmount}
                  onChange={(e) => setCostAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Item Detail *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Front suspension bushing & new battery"
                  value={costDescription}
                  onChange={(e) => setCostDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Garage / Vendor Name</label>
                <input
                  type="text"
                  placeholder="e.g. QuickFit Auto Kisumu"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCostOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCostSaving}
                  className="px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCostSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Vehicle Confirmation Modal */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Delete {vehicleToDelete.registration_no}?
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {vehicleToDelete.make_model}
                </p>
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold text-amber-950 flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="size-3.5 text-amber-600" />
                    Manager Revert Archive
                  </p>
                  This vehicle will be hidden from the active yard inventory and marketplace website. If deleted mistakenly, you can <strong>revert and restore it at any time</strong> from the <strong>Deleted</strong> tab.
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVehicleToDelete(null)}
                disabled={isDeleting}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteVehicle}
                disabled={isDeleting}
                className="rounded-xl px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
