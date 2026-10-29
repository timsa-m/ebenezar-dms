import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Table2,
  RotateCcw,
  SlidersHorizontal,
  Search,
  PackageOpen,
  Loader2,
} from 'lucide-react';
import { getVehicles } from '../services/vehicleApi';

const FORMAT_KSH = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Price on Request';
  return `KSh ${Number(amount).toLocaleString('en-KE')}`;
};

export const Inventory = ({
  onSelectVehicle,
  initialSearch = '',
  initialBrand = 'All brands',
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read URL query params if present (support both q and search)
  const queryParam = searchParams.get('q') || searchParams.get('search') || initialSearch || '';
  const brandParam = searchParams.get('brand') || (initialBrand === 'All brands' ? 'All' : initialBrand);

  // View mode state ('wide' | 'grid' | 'compact' | 'sheet')
  const [viewMode, setViewMode] = useState('wide');

  // Real database vehicles state
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Filters state
  const [brand, setBrand] = useState(brandParam === 'All brands' ? 'All' : brandParam);
  const [model, setModel] = useState('All');
  const [condition, setCondition] = useState('All');
  const [status, setStatus] = useState('All');
  const [bodyType, setBodyType] = useState('All');
  const [priceRange, setPriceRange] = useState('All');
  const [mileageRange, setMileageRange] = useState('All');
  const [fuelType, setFuelType] = useState('All');
  const [transmission, setTransmission] = useState('All');
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [sortBy, setSortBy] = useState('default');

  // Synchronize URL search params with state whenever URL parameters change
  useEffect(() => {
    const q = searchParams.get('q') || searchParams.get('search') || initialSearch || '';
    const rawBrand = searchParams.get('brand') || (initialBrand === 'All brands' ? 'All' : initialBrand) || 'All';
    const b = rawBrand === 'All brands' ? 'All' : rawBrand;
    setSearchQuery(q);
    setBrand(b);
  }, [searchParams, initialSearch, initialBrand]);

  // Fetch real data directly from database API
  useEffect(() => {
    let isMounted = true;
    const fetchRealVehicles = async () => {
      try {
        setLoading(true);
        const res = await getVehicles({ limit: 200 });
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (isMounted) {
          setVehicles(list);
          setLoadError('');
        }
      } catch (err) {
        console.error('Failed to load vehicles from database:', err);
        if (isMounted) {
          setLoadError(err.message || 'Failed to load vehicles from database');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRealVehicles();
    return () => {
      isMounted = false;
    };
  }, []);

  // Normalize database vehicles to guarantee standard fields across views
  const normalizedVehicles = useMemo(() => {
    return vehicles.map((v) => {
      const id = v._id || v.id || v.slug || String(Math.random());
      const brandName = v.brand || v.make || v.name?.split(' ')[0] || v.make_model?.split(' ')[0] || 'Unknown';
      const modelName = v.model || v.name?.split(' ').slice(1).join(' ') || v.make_model?.split(' ').slice(1).join(' ') || '';
      const title = v.name || v.make_model || `${brandName} ${modelName}`.trim();
      const year = v.modelYear || v.year || '';
      const price = Number(v.price || v.sale_price) || 0;
      const mileageNum = Number(v.mileage) || 0;
      const mileageStr = mileageNum ? `${mileageNum.toLocaleString('en-KE')} km` : '0 km';
      const bodyTypeVal = v.category || v.bodyType || v.body_type || v.type || 'SUV';
      const fuelVal = v.fuelType || v.fuel || v.fuel_type || 'Petrol';
      const transVal = v.transmission || 'Automatic';
      const condVal = v.condition || 'Foreign Used';
      const isSold = v.isSold || v.status === 'sold' || v.status === 'cash_sale';
      const statusVal = isSold ? 'Sold' : (v.status === 'reserved' ? 'Reserved' : 'Available');
      const featuredImage = v.images?.[0] || v.primaryImage || v.imageUrl || v.featuredImage || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80';
      const engine = v.engineCapacity || v.ccRating || v.engine_capacity || '';

      return {
        ...v,
        id,
        slug: v.slug || id,
        brand: brandName,
        model: modelName,
        title,
        year,
        price,
        mileage: mileageNum,
        specs: {
          mileage: mileageStr,
        },
        bodyType: bodyTypeVal,
        fuel: fuelVal,
        transmission: transVal,
        condition: condVal,
        status: statusVal,
        featuredImage,
        engine,
      };
    });
  }, [vehicles]);

  // Distinct lists extracted dynamically from real database records
  const availableBrands = useMemo(() => {
    const set = new Set(normalizedVehicles.map((v) => v.brand).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [normalizedVehicles]);

  const availableModels = useMemo(() => {
    const list = brand === 'All' ? normalizedVehicles : normalizedVehicles.filter((v) => v.brand.toLowerCase() === brand.toLowerCase());
    const set = new Set(list.map((v) => v.model).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [normalizedVehicles, brand]);

  const availableBodyTypes = ['All', 'SUV', 'Truck', 'Sedan', 'Hatchback', 'Coupe', 'Saloon', 'Station Wagon'];
  const availableConditions = ['All', 'Foreign Used', 'Locally Used', 'Brand New'];
  const availableStatuses = ['All', 'Available', 'Reserved', 'Sold'];
  const availableFuels = ['All', 'Petrol', 'Diesel', 'Hybrid', 'Electric'];
  const availableTransmissions = ['All', 'Automatic', 'Manual'];

  // Reset all filters
  const handleClearAll = () => {
    setBrand('All');
    setModel('All');
    setCondition('All');
    setStatus('All');
    setBodyType('All');
    setPriceRange('All');
    setMileageRange('All');
    setFuelType('All');
    setTransmission('All');
    setSearchQuery('');
    setSortBy('default');
  };

  // Filter & sort logic applied to real database vehicles
  const filteredVehicles = useMemo(() => {
    return normalizedVehicles
      .filter((v) => {
        // Keyword Search
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matches =
            v.title.toLowerCase().includes(query) ||
            v.brand.toLowerCase().includes(query) ||
            v.model.toLowerCase().includes(query) ||
            v.year.toString().includes(query) ||
            v.bodyType.toLowerCase().includes(query);
          if (!matches) return false;
        }

        // Brand
        if (brand !== 'All' && v.brand.toLowerCase() !== brand.toLowerCase()) return false;

        // Model
        if (model !== 'All' && v.model.toLowerCase() !== model.toLowerCase()) return false;

        // Condition
        if (condition !== 'All' && v.condition.toLowerCase() !== condition.toLowerCase()) return false;

        // Status
        if (status !== 'All') {
          if (status === 'Available' && v.status.toLowerCase() !== 'available') return false;
          if (status === 'Reserved' && v.status.toLowerCase() !== 'reserved') return false;
          if (status === 'Sold' && v.status.toLowerCase() !== 'sold') return false;
        }

        // Body Type
        if (bodyType !== 'All' && !v.bodyType.toLowerCase().includes(bodyType.toLowerCase())) return false;

        // Fuel Type
        if (fuelType !== 'All' && !v.fuel.toLowerCase().includes(fuelType.toLowerCase())) return false;

        // Transmission
        if (transmission !== 'All' && !v.transmission.toLowerCase().includes(transmission.toLowerCase())) return false;

        // Price Range
        if (priceRange !== 'All') {
          if (priceRange === 'under-4m' && v.price >= 4000000) return false;
          if (priceRange === '4m-8m' && (v.price < 4000000 || v.price > 8000000)) return false;
          if (priceRange === '8m-15m' && (v.price < 8000000 || v.price > 15000000)) return false;
          if (priceRange === 'above-15m' && v.price <= 15000000) return false;
        }

        // Mileage
        if (mileageRange !== 'All') {
          if (mileageRange === 'under-20k' && v.mileage >= 20000) return false;
          if (mileageRange === 'under-50k' && v.mileage >= 50000) return false;
          if (mileageRange === 'under-100k' && v.mileage >= 100000) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'year-newest') return Number(b.year) - Number(a.year);
        if (sortBy === 'mileage-low') return a.mileage - b.mileage;
        return 0;
      });
  }, [
    normalizedVehicles,
    searchQuery,
    brand,
    model,
    condition,
    status,
    bodyType,
    fuelType,
    transmission,
    priceRange,
    mileageRange,
    sortBy,
  ]);

  const handleVehicleClick = (car) => {
    if (onSelectVehicle) {
      onSelectVehicle(car);
    } else {
      navigate(`/vehicle/${car.slug || car._id || car.id}`);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-24 font-body">
      {/* 1. Top Announcement Marquee */}
      <div className="bg-slate-950 text-white overflow-hidden py-3 border-b border-slate-800">
        <div className="animate-marquee whitespace-nowrap text-xs font-bold tracking-wider uppercase text-slate-200 flex items-center">
          <span className="mx-6">CURATED PREMIUM VEHICLES IN STOCK</span>
          <span className="text-blue-400">•</span>
          <span className="mx-6">DIRECT IMPORTS FROM JAPAN, UK & UAE</span>
          <span className="text-blue-400">•</span>
          <span className="mx-6">LUXURY, SUV & PERFORMANCE CARS AVAILABLE</span>
          <span className="text-blue-400">•</span>
          <span className="mx-6">VERIFIED QUALITY WITH FULL INSPECTION</span>
          <span className="text-blue-400">•</span>
          <span className="mx-6">FINANCING & TRADE-IN OPTIONS AVAILABLE</span>
          <span className="text-blue-400">•</span>
          {/* Loop repeat */}
          <span className="mx-6">CURATED PREMIUM VEHICLES IN STOCK</span>
          <span className="text-blue-400">•</span>
          <span className="mx-6">DIRECT IMPORTS FROM JAPAN, UK & UAE</span>
          <span className="text-blue-400">•</span>
          <span className="mx-6">LUXURY, SUV & PERFORMANCE CARS AVAILABLE</span>
          <span className="text-blue-400">•</span>
          <span className="mx-6">VERIFIED QUALITY WITH FULL INSPECTION</span>
          <span className="text-blue-400">•</span>
          <span className="mx-6">FINANCING & TRADE-IN OPTIONS AVAILABLE</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Page Title & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Our Inventory</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Browse our verified inventory in Nairobi
          </p>
        </div>

        {loadError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            ⚠️ {loadError}
          </div>
        )}

        {/* Main Content Layout with Left Sidebar + Right Results */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar (Filter Panel) - 3 cols */}
          <aside className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                <h3 className="font-extrabold text-slate-900 text-sm">Filters</h3>
              </div>
              <button
                onClick={handleClearAll}
                className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
              >
                Clear all
              </button>
            </div>

            {/* Quick Keyword Search inside filters */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                SEARCH
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Model or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* 1. BRAND */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                BRAND
              </label>
              <select
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setModel('All');
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {availableBrands.map((b) => (
                  <option key={b} value={b}>
                    {b === 'All' ? 'All Brands' : b}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. MODEL */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                MODEL
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m === 'All' ? 'All Models' : m}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. CONDITION */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                CONDITION
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {availableConditions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. STOCK STATUS */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                STOCK STATUS
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {availableStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s === 'All' ? 'All Statuses' : s}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. BODY TYPE */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                BODY TYPE
              </label>
              <select
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {availableBodyTypes.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt === 'All' ? 'All Types' : bt}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. PRICE RANGE */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                PRICE RANGE
              </label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="All">Any Price</option>
                <option value="under-4m">Under KSh 4M</option>
                <option value="4m-8m">KSh 4M - KSh 8M</option>
                <option value="8m-15m">KSh 8M - KSh 15M</option>
                <option value="above-15m">Above KSh 15M</option>
              </select>
            </div>

            {/* 7. MILEAGE */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                MILEAGE
              </label>
              <select
                value={mileageRange}
                onChange={(e) => setMileageRange(e.target.value)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="All">Any Mileage</option>
                <option value="under-20k">Under 20,000 km</option>
                <option value="under-50k">Under 50,000 km</option>
                <option value="under-100k">Under 100,000 km</option>
              </select>
            </div>

            {/* 8. FUEL TYPE */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                FUEL TYPE
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {availableFuels.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* 9. TRANSMISSION */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                TRANSMISSION
              </label>
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {availableTransmissions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </aside>

          {/* Main Inventory Content (9 cols) */}
          <main className="lg:col-span-9 space-y-6">
            {/* Header Controls: Count, Sort, and Card View Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              {/* Left: Count */}
              <div className="text-sm text-slate-600 font-medium">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Loading real inventory...
                  </span>
                ) : (
                  <>
                    Showing{' '}
                    <strong className="text-slate-900 font-extrabold">
                      {filteredVehicles.length > 0 ? `1–${filteredVehicles.length}` : '0'}
                    </strong>{' '}
                    of <strong className="text-slate-900 font-extrabold">{normalizedVehicles.length}</strong>{' '}
                    vehicles
                  </>
                )}
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
                >
                  <option value="default">Sort by: Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="year-newest">Year: Newest</option>
                  <option value="mileage-low">Mileage: Lowest</option>
                </select>

                {/* Card View Switcher: 3 layout buttons */}
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
                  {/* Button 1: Wide Horizontal Stack (2 Columns) */}
                  <button
                    onClick={() => setViewMode('wide')}
                    title="Wide Horizontal Stack (2 Columns)"
                    aria-label="Wide Horizontal Stack"
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'wide'
                        ? 'bg-[#0B4DB7] text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                      <rect x="2" y="3" width="12" height="4" rx="1" />
                      <rect x="2" y="9" width="12" height="4" rx="1" />
                    </svg>
                  </button>

                  {/* Button 2: Standard Grid Stack (3 Columns) */}
                  <button
                    onClick={() => setViewMode('grid')}
                    title="Standard Grid Stack (3 Columns)"
                    aria-label="Standard Grid Stack"
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-[#0B4DB7] text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                      <rect x="2" y="2" width="3.5" height="3.5" rx="0.5" />
                      <rect x="6.25" y="2" width="3.5" height="3.5" rx="0.5" />
                      <rect x="10.5" y="2" width="3.5" height="3.5" rx="0.5" />
                      <rect x="2" y="6.25" width="3.5" height="3.5" rx="0.5" />
                      <rect x="6.25" y="6.25" width="3.5" height="3.5" rx="0.5" />
                      <rect x="10.5" y="6.25" width="3.5" height="3.5" rx="0.5" />
                      <rect x="2" y="10.5" width="3.5" height="3.5" rx="0.5" />
                      <rect x="6.25" y="10.5" width="3.5" height="3.5" rx="0.5" />
                      <rect x="10.5" y="10.5" width="3.5" height="3.5" rx="0.5" />
                    </svg>
                  </button>

                  {/* Button 3: Compact Dense Stack (5 Columns) */}
                  <button
                    onClick={() => setViewMode('compact')}
                    title="Compact Dense Stack (5 Columns)"
                    aria-label="Compact Dense Stack"
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      viewMode === 'compact'
                        ? 'bg-[#0B4DB7] text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                      <rect x="1.5" y="2" width="2" height="12" rx="0.5" />
                      <rect x="4.5" y="2" width="2" height="12" rx="0.5" />
                      <rect x="7.5" y="2" width="2" height="12" rx="0.5" />
                      <rect x="10.5" y="2" width="2" height="12" rx="0.5" />
                      <rect x="13.5" y="2" width="2" height="12" rx="0.5" />
                    </svg>
                  </button>
                </div>

                {/* Sheet View Toggle */}
                <button
                  onClick={() => setViewMode('sheet')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'sheet'
                      ? 'bg-[#0B4DB7] text-white border-[#0B4DB7]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5" />
                  Sheet View
                </button>
              </div>
            </div>

            {/* Loading Skeletons */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-slate-100 rounded-2xl h-72 border border-slate-200" />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredVehicles.length === 0 && (
              <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <RotateCcw className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-800">No vehicles match these filters</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Try clearing some filter criteria or searching for different models.
                </p>
                <button
                  onClick={handleClearAll}
                  className="mt-4 px-4 py-2 bg-[#0B4DB7] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-blue-700 transition"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* 1. WIDE HORIZONTAL STACK (2 COLUMNS PER ROW) */}
            {!loading && viewMode === 'wide' && filteredVehicles.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredVehicles.map((car) => (
                  <div
                    key={car.id}
                    onClick={() => handleVehicleClick(car)}
                    className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-stretch"
                  >
                    {/* Left ~42% width Image with overlaid badges */}
                    <div className="relative sm:w-[42%] aspect-[16/11] sm:aspect-auto bg-slate-100 shrink-0 overflow-hidden">
                      <img
                        src={car.featuredImage}
                        alt={car.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="bg-white/95 backdrop-blur-xs text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs border border-slate-200/50">
                          {car.condition}
                        </span>
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                          {car.status}
                        </span>
                      </div>
                    </div>

                    {/* Right Details */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-extrabold uppercase text-[#0B4DB7] tracking-wider mb-0.5">
                          {(car.brand || '').toUpperCase()} · {car.year}
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-[#0B4DB7] transition-colors line-clamp-1">
                          {car.title}
                        </h3>

                        <div className="mt-3 text-xs text-slate-500 space-y-1">
                          <div>
                            {car.bodyType} · {car.transmission}
                          </div>
                          <div>
                            Fuel: <span className="font-semibold text-slate-700">{car.fuel}</span> ·{' '}
                            {car.specs.mileage}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-base sm:text-lg font-black text-[#0B4DB7]">
                          {FORMAT_KSH(car.price)}
                        </div>
                        <span className="text-xs font-bold text-[#0B4DB7] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          View →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. STANDARD GRID STACK (3 COLUMNS PER ROW) */}
            {!loading && viewMode === 'grid' && filteredVehicles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredVehicles.map((car) => (
                  <div
                    key={car.id}
                    onClick={() => handleVehicleClick(car)}
                    className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                  >
                    {/* Photo with badges pinned to top corners */}
                    <div className="relative aspect-[16/11] bg-slate-100 overflow-hidden">
                      <img
                        src={car.featuredImage}
                        alt={car.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="bg-white/95 backdrop-blur-xs text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded shadow-xs border border-slate-200/50">
                          {car.condition}
                        </span>
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <span className="bg-emerald-500/90 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-xs">
                          {car.status}
                        </span>
                      </div>
                    </div>

                    {/* Details below */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-[#0B4DB7] transition-colors line-clamp-1">
                          {car.title}
                        </h3>

                        {/* Metadata row with soft grey badges */}
                        <div className="flex flex-wrap gap-1.5 text-xs text-slate-600 mt-2.5 font-medium">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                            {car.year}
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                            {car.fuel}
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                            {car.transmission}
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                            {car.specs.mileage}
                          </span>
                        </div>
                      </div>

                      {/* Price at bottom left */}
                      <div className="pt-3 border-t border-slate-100">
                        <div className="text-base font-black text-[#0B4DB7]">
                          {FORMAT_KSH(car.price)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. COMPACT DENSE STACK (5 COLUMNS PER ROW) */}
            {!loading && viewMode === 'compact' && filteredVehicles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredVehicles.map((car) => (
                  <div
                    key={car.id}
                    onClick={() => handleVehicleClick(car)}
                    className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                  >
                    {/* Shorter image aspect ratio with badges */}
                    <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                      <img
                        src={car.featuredImage}
                        alt={car.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-1.5 left-1.5">
                        <span className="bg-white/95 text-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          {car.condition}
                        </span>
                      </div>
                      <div className="absolute top-1.5 right-1.5">
                        <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          {car.status}
                        </span>
                      </div>
                    </div>

                    {/* Compact body */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        {/* Truncated title */}
                        <h3 className="font-extrabold text-slate-900 text-xs truncate group-hover:text-[#0B4DB7] transition-colors">
                          {car.title}
                        </h3>

                        {/* Compact pills */}
                        <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                            {car.year}
                          </span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                            {car.fuel}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                            {car.transmission}
                          </span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold truncate max-w-[80px]">
                            {car.specs.mileage}
                          </span>
                        </div>
                      </div>

                      {/* Price in smaller bold font */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-xs sm:text-sm font-black text-[#0B4DB7] truncate">
                          {FORMAT_KSH(car.price)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. SHEET VIEW (Clean spreadsheet layout) */}
            {!loading && viewMode === 'sheet' && filteredVehicles.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Vehicle</th>
                      <th className="py-3.5 px-3">Condition</th>
                      <th className="py-3.5 px-3">Year</th>
                      <th className="py-3.5 px-3">Body Type</th>
                      <th className="py-3.5 px-3">Fuel / Trans</th>
                      <th className="py-3.5 px-3">Mileage</th>
                      <th className="py-3.5 px-4">Asking Price</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredVehicles.map((car) => (
                      <tr
                        key={car.id}
                        onClick={() => handleVehicleClick(car)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 flex items-center gap-3">
                          <img
                            src={car.featuredImage}
                            alt={car.title}
                            className="w-12 h-9 object-cover rounded-md border border-slate-200 shrink-0"
                            loading="lazy"
                          />
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-[#0B4DB7]">
                              {car.title}
                            </div>
                            <div className="text-[10px] text-slate-400">{car.engine}</div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px]">
                            {car.condition}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold">{car.year}</td>
                        <td className="py-3 px-3">{car.bodyType}</td>
                        <td className="py-3 px-3">
                          {car.fuel} · {car.transmission}
                        </td>
                        <td className="py-3 px-3">{car.specs.mileage}</td>
                        <td className="py-3 px-4 font-black text-slate-900 text-sm">
                          {FORMAT_KSH(car.price)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                            {car.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVehicleClick(car);
                            }}
                            className="px-3 py-1 bg-[#0B4DB7] text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
