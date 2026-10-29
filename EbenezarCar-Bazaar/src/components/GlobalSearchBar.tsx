import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronRight, Car, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { getVehicles } from '../services/vehicleApi';

interface GlobalSearchBarProps {
  onSearch?: (searchTerm: string, brand: string) => void;
  defaultBrand?: string;
  defaultSearch?: string;
  brands?: string[];
}

const FORMAT_KSH = (val: any) => {
  if (val === null || val === undefined || isNaN(Number(val))) return 'Price on Request';
  return `KSh ${Number(val).toLocaleString()}`;
};

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  onSearch,
  defaultBrand = 'All brands',
  defaultSearch = '',
  brands = ['All brands', 'Toyota', 'Nissan', 'Subaru', 'Mazda', 'Mitsubishi', 'Lexus', 'Ford', 'Honda', 'Isuzu', 'Suzuki', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Land Rover', 'BMW', 'Hyundai', 'Kia'],
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [term, setTerm] = useState(defaultSearch);
  const [selectedBrand, setSelectedBrand] = useState(defaultBrand);
  const [isFocused, setIsFocused] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load real database vehicles for instant live search
  useEffect(() => {
    let isMounted = true;
    const fetchVehicles = async () => {
      try {
        setIsLoading(true);
        const res = await getVehicles({ limit: 150 });
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (isMounted) {
          setVehicles(list);
        }
      } catch (err) {
        console.error('Failed to load vehicles for search:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchVehicles();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFocused(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dynamic brand list combining defaults with any real brands in DB
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => {
      const b = v.brand || (v.name || v.make_model || '').split(' ')[0];
      if (b && b.trim()) set.add(b.trim());
    });
    if (set.size > 0) {
      const list = Array.from(set).sort();
      return ['All brands', ...list];
    }
    return brands;
  }, [vehicles, brands]);

  // Real-time filtering across titles, brands, models, years, categories
  const matchingVehicles = useMemo(() => {
    const q = term.trim().toLowerCase();
    const isAllBrand = selectedBrand === 'All brands' || selectedBrand === 'All';

    if (!q && isAllBrand) return [];

    return vehicles
      .map((v) => {
        const id = v.slug || v._id || v.id;
        const rawTitle = v.name || v.make_model || 'Vehicle';
        const brandName = v.brand || rawTitle.split(' ')[0] || '';
        const modelName = v.model || rawTitle.replace(brandName, '').trim();
        const year = v.modelYear || v.year || '';
        const price = Number(v.price || v.sale_price) || 0;
        const condition = v.condition || 'Foreign Used';
        const fuel = v.fuelType || v.fuel_type || v.fuel || 'Petrol';
        const transmission = v.transmission || 'Automatic';
        const image = v.images?.[0] || v.primaryImage || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&auto=format&fit=crop&q=60';
        const bodyType = v.category || v.bodyType || v.body_type || '';

        return {
          id,
          title: rawTitle,
          brand: brandName,
          model: modelName,
          year,
          price,
          condition,
          fuel,
          transmission,
          image,
          bodyType,
        };
      })
      .filter((v) => {
        const fullStr = `${v.title} ${v.brand} ${v.model} ${v.year} ${v.bodyType} ${v.fuel}`.toLowerCase();
        const matchesQuery = !q || fullStr.includes(q);
        const matchesBrand = isAllBrand || v.brand.toLowerCase() === selectedBrand.toLowerCase() || v.title.toLowerCase().includes(selectedBrand.toLowerCase());

        return matchesQuery && matchesBrand;
      });
  }, [vehicles, term, selectedBrand]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsFocused(false);

    if (onSearch) {
      onSearch(term, selectedBrand);
    } else {
      const params = new URLSearchParams();
      if (term.trim()) {
        params.set('q', term.trim());
        params.set('search', term.trim());
      }
      if (selectedBrand && selectedBrand !== 'All brands' && selectedBrand !== 'All') {
        params.set('brand', selectedBrand);
      }
      navigate(`/inventory?${params.toString()}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectVehicle = (vId: string) => {
    setIsFocused(false);
    navigate(`/vehicle/${vId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showDropdown = isFocused && (term.trim().length > 0 || (selectedBrand !== 'All brands' && selectedBrand !== 'All'));

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={handleSubmit}
        className="w-full bg-white rounded-xl border border-slate-200 shadow-xs p-1.5 flex flex-col sm:flex-row items-center gap-2"
      >
        {/* Search text input */}
        <div className="relative flex-1 w-full flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setIsFocused(true);
            }}
            onFocus={() => setIsFocused(true)}
            placeholder="Search e.g. Prado, Mercedes, Defender, Forester..."
            className="w-full pl-11 pr-8 py-2.5 text-sm text-slate-900 placeholder-slate-400 bg-transparent rounded-lg focus:outline-none"
          />

          {term.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTerm('');
              }}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Brand selector dropdown */}
        <div className="w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-2">
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setIsFocused(true);
            }}
            className="w-full sm:w-44 py-2.5 px-3 text-sm font-medium text-slate-700 bg-transparent rounded-lg focus:outline-none cursor-pointer"
          >
            {availableBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Search CTA button */}
        <button
          type="submit"
          className="w-full sm:w-auto px-7 py-2.5 rounded-lg bg-[#0B4DB7] hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-sm shadow-blue-900/10 cursor-pointer flex items-center justify-center gap-2 shrink-0"
        >
          <Search className="w-4 h-4 sm:hidden" />
          <span>Search</span>
        </button>
      </form>

      {/* Floating Live Search Results Dropdown/Modal */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[460px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
            <div className="flex items-center gap-1.5">
              <span>Search Results</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0B4DB7] text-[11px] font-extrabold">
                {matchingVehicles.length} found
              </span>
              {selectedBrand !== 'All brands' && selectedBrand !== 'All' && (
                <span className="text-slate-400 font-normal">
                  in <span className="font-bold text-slate-700">{selectedBrand}</span>
                </span>
              )}
            </div>

            <button
              onClick={() => setIsFocused(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Close search results"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Result List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-1">
            {isLoading && vehicles.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                Loading available vehicles...
              </div>
            ) : matchingVehicles.length > 0 ? (
              matchingVehicles.slice(0, 7).map((car) => (
                <div
                  key={car.id}
                  onClick={() => handleSelectVehicle(car.id)}
                  className="p-3 rounded-xl hover:bg-blue-50/60 transition-all cursor-pointer flex items-center gap-3.5 group/item"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80">
                    <img
                      src={car.image}
                      alt={car.title}
                      className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-200"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-extrabold text-slate-900 truncate group-hover/item:text-[#0B4DB7] transition-colors">
                      {car.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                      {car.year && <span>{car.year}</span>}
                      {car.fuel && (
                        <>
                          <span>•</span>
                          <span>{car.fuel}</span>
                        </>
                      )}
                      {car.condition && (
                        <>
                          <span>•</span>
                          <span className="text-blue-700 font-semibold">{car.condition}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Price & Action Arrow */}
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div className="text-sm font-black text-[#0B4DB7]">
                      {FORMAT_KSH(car.price)}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover/item:text-[#0B4DB7] group-hover/item:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Car className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  No vehicles found matching "{term}"
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Try searching by popular models like Prado, Harrier, Mercedes, Forester, or select another brand.
                </p>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="mt-2 text-xs font-bold text-[#0B4DB7] hover:underline cursor-pointer"
                >
                  Browse all inventory instead
                </button>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          {matchingVehicles.length > 0 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium pl-2">
                Showing top {Math.min(matchingVehicles.length, 7)} of {matchingVehicles.length} matches
              </span>
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0B4DB7] hover:bg-blue-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <span>View all in Inventory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
