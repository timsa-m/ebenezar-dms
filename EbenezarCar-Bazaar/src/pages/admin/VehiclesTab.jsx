import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, Tag, LayoutGrid, RefreshCw } from "lucide-react";
import { getVehicles, deleteVehicle, updateVehicle } from "../../services/vehicleApi";
import { invalidateVehicleCache } from "../../services/vehicleCache";
import VehicleForm from "./VehicleForm";
import Pagination from "./Pagination";

const VehiclesTab = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const fetchVehicles = async (currentPage = page) => {
    try {
      setLoading(true);
      const params = { page: currentPage, limit: 15, showSold: "true" };
      if (search) params.search = search;
      if (filterCategory) params.category = filterCategory;
      if (filterStatus === "forHire") params.forHire = "true";
      if (filterStatus === "newArrival") params.isNewArrival = "true";

      const res = await getVehicles(params);
      setVehicles(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || 0);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles(page);
  }, [page, search, filterCategory, filterStatus]);

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this vehicle? This cannot be undone.")) return;
    try {
      await deleteVehicle(id);
      invalidateVehicleCache();
      fetchVehicles(page);
    } catch (err) {
      alert(err.message || "Unable to delete vehicle.");
    }
  };

  const handleToggleSold = async (vehicle) => {
    setTogglingId(vehicle._id);
    try {
      await updateVehicle(vehicle._id, { isSold: !vehicle.isSold });
      invalidateVehicleCache();
      fetchVehicles(page);
    } catch (err) {
      alert(err.message || "Unable to update vehicle status.");
    } finally {
      setTogglingId(null);
    }
  };

  const openForm = (vehicle = null) => {
    setEditingVehicle(vehicle);
    setIsFormOpen(true);
  };

  const closeForm = (shouldRefresh = false) => {
    setEditingVehicle(null);
    setIsFormOpen(false);
    if (shouldRefresh) fetchVehicles(page);
  };

  if (isFormOpen) {
    return <VehicleForm vehicle={editingVehicle} onClose={closeForm} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-brand-muted/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
            <LayoutGrid size={20} className="text-brand-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-brand-primary">Vehicle Inventory</h2>
            <p className="text-xs text-slate-500">{totalCount} total vehicles</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchVehicles(page)}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={() => openForm()}
            className="flex items-center gap-2 bg-brand-primary hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-muted/60 overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-brand-muted/60 flex flex-col sm:flex-row gap-3 bg-slate-50/70">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              id="vehicleSearch"
              name="vehicleSearch"
              type="text"
              placeholder="Search by name, brand, or chassis no..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-none"
            />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white focus:outline-none focus:border-brand-accent"
            >
              <option value="">All Categories</option>
              <option value="SUV">SUV</option>
              <option value="Compact SUV">Compact SUV</option>
              <option value="Saloon">Saloon</option>
              <option value="Hatchback">Hatchback</option>
              <option value="Station Wagon">Station Wagon</option>
              <option value="Minivan">Minivan</option>
              <option value="Truck">Truck</option>
              <option value="Van">Van</option>
              <option value="Pikipiki">Pikipiki</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white focus:outline-none focus:border-brand-accent"
            >
              <option value="">All Statuses</option>
              <option value="forHire">For Hire</option>
              <option value="newArrival">New Arrivals</option>
            </select>
          </div>
        </div>

        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span>Vehicle</span>
          <span>Price</span>
          <span>Status</span>
          <span>Badges</span>
          <span>Actions</span>
        </div>

        {/* Vehicle List */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="h-8 w-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-500 text-sm">{error}</div>
          ) : vehicles.length === 0 ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <Search size={22} className="text-slate-400" />
              </div>
              <p className="font-medium">No vehicles found</p>
              <p className="text-xs">Try adjusting your search or filters</p>
            </div>
          ) : (
            vehicles.map((vehicle) => (
              <div
                key={vehicle._id}
                className={`grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-slate-50 transition-colors ${vehicle.isSold ? "opacity-70" : ""}`}
              >
                {/* Vehicle Identity */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                    {vehicle.images?.[0] ? (
                      <img src={vehicle.images[0]} alt={vehicle.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <LayoutGrid size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{vehicle.brand} {vehicle.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{vehicle.modelYear} · {vehicle.category || "—"}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="text-sm font-semibold text-slate-700">
                  Ksh {vehicle.price?.toLocaleString()}
                </div>

                {/* Sold Status */}
                <div>
                  {vehicle.isSold ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold border border-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Sold
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Available
                    </span>
                  )}
                </div>

                {/* Extra Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {vehicle.forHire && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Hire</span>
                  )}
                  {vehicle.isNewArrival && (
                    <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium border border-violet-200">New</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleSold(vehicle)}
                    disabled={togglingId === vehicle._id}
                    title={vehicle.isSold ? "Mark as Available" : "Mark as Sold"}
                    className={`p-2 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5 border ${
                      vehicle.isSold
                        ? "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        : "text-red-600 border-red-200 hover:bg-red-50"
                    }`}
                  >
                    {togglingId === vehicle._id ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Tag size={14} />
                    )}
                    <span className="hidden lg:inline">{vehicle.isSold ? "Restore" : "Mark Sold"}</span>
                  </button>
                  <button
                    onClick={() => openForm(vehicle)}
                    className="p-2 text-slate-500 hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle._id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default VehiclesTab;
