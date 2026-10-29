import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, CheckCircle, Shield, MapPin, Truck, FileCheck, HelpCircle, Car, CreditCard, Search } from 'lucide-react';
import { getVehicles } from '../services/vehicleApi';

export const FORMAT_KSH = (val) => {
  if (val === null || val === undefined || isNaN(val) || Number(val) === 0) return 'Price on Request';
  return `KSh ${Number(val).toLocaleString('en-KE')}`;
};

// Helper: parse engine displacement in CC
export const parseEngineCc = (rawVal, nameStr = '') => {
  if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
    if (typeof rawVal === 'number') {
      if (rawVal > 0 && rawVal <= 10) return rawVal * 1000;
      return rawVal;
    }
    const str = String(rawVal).trim().toLowerCase();
    const lMatch = str.match(/([0-9.]+)\s*l/);
    if (lMatch) {
      const parsedL = parseFloat(lMatch[1]);
      if (!isNaN(parsedL)) return parsedL * 1000;
    }
    const num = parseInt(str.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) return num;
  }

  const nameL = String(nameStr).toLowerCase();
  const nameLMatch = nameL.match(/([0-9.]+)\s*l\b/);
  if (nameLMatch) {
    const parsedL = parseFloat(nameLMatch[1]);
    if (!isNaN(parsedL) && parsedL <= 10) return parsedL * 1000;
  }
  const nameCcMatch = nameL.match(/(\d{3,4})\s*cc\b/);
  if (nameCcMatch) {
    const parsedCc = parseInt(nameCcMatch[1], 10);
    if (!isNaN(parsedCc)) return parsedCc;
  }

  // Common sub-1300cc models if CC isn't explicitly noted
  if (
    nameL.includes('vitz 1.0') ||
    nameL.includes('passo') ||
    nameL.includes('march') ||
    nameL.includes('alto') ||
    nameL.includes('mira') ||
    nameL.includes('move') ||
    nameL.includes('pixis') ||
    nameL.includes('dayz')
  ) {
    return 1000;
  }

  return null;
};

// Helper: strictly check if vehicle is an SUV
export const isVehicleSuv = (v) => {
  const body = (v.bodyType || '').toLowerCase();
  const cat = (v.category || '').toLowerCase();
  const name = (v.name || '').toLowerCase();

  // Exclude saloons, sedans, hatchbacks, wagons, vans, pickups
  if (
    body.includes('saloon') ||
    body.includes('sedan') ||
    body.includes('hatchback') ||
    body.includes('wagon') ||
    body.includes('van') ||
    body.includes('pickup')
  ) {
    return false;
  }

  if (body.includes('suv') || cat.includes('suv')) {
    return true;
  }

  const suvKeywords = [
    'suv',
    'prado',
    'land cruiser',
    'harrier',
    'rav4',
    'forester',
    'outback',
    'x-trail',
    'xtrail',
    'pajero',
    'cx-5',
    'cx5',
    'cx-3',
    'cx3',
    'cr-v',
    'crv',
    'rush',
    'vezel',
    'juke',
    'c-hr',
    'chr',
    'patrol',
    'kluger',
    'highlander',
    'fortuner',
    'vanguard',
    'defender',
    'discovery',
    'range rover',
    'touareg',
    'tiguan',
    'q5',
    'q7',
    'x3',
    'x5',
    'gle',
    'glc'
  ];

  return suvKeywords.some((k) => name.includes(k) || cat.includes(k));
};

// Helper: strictly check if vehicle is a Saloon / Sedan
export const isVehicleSaloon = (v) => {
  const body = (v.bodyType || '').toLowerCase();
  const cat = (v.category || '').toLowerCase();
  const name = (v.name || '').toLowerCase();

  // Exclude SUVs, pickups, vans, commercial vehicles
  if (
    body.includes('suv') ||
    cat.includes('suv') ||
    body.includes('pickup') ||
    body.includes('van') ||
    body.includes('commercial')
  ) {
    return false;
  }

  if (
    body.includes('saloon') ||
    body.includes('sedan') ||
    cat.includes('saloon') ||
    cat.includes('sedan')
  ) {
    return true;
  }

  const saloonKeywords = [
    'premio',
    'allion',
    'crown',
    'mark x',
    'camry',
    'axio',
    'mercedes',
    'c-class',
    'e-class',
    's-class',
    'bmw',
    '320i',
    '520i',
    'audi a4',
    'audi a6',
    'lexus is',
    'lexus gs',
    'lexus ls',
    'lexus es',
    'teana',
    'fuga',
    'sylphy',
    'bluebird',
    'accord',
    'civic sedan',
    'passat'
  ];

  return saloonKeywords.some((k) => name.includes(k) || cat.includes(k));
};

export const HomePage = ({ onSelectVehicle, onNavigateInventory }) => {
  const navigate = useNavigate();

  // Navigation handlers with fallback to router
  const handleSelectVehicle = (vehicle) => {
    if (onSelectVehicle) {
      onSelectVehicle(vehicle);
    } else {
      const id = vehicle.slug || vehicle._id || vehicle.id;
      navigate(`/vehicle/${id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigateInventory = () => {
    if (onNavigateInventory) {
      onNavigateInventory();
    } else {
      navigate('/inventory');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Real database vehicles state (zero mock data)
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Budget Tabs state (Shop by Budget comes first)
  const [selectedBudget, setSelectedBudget] = useState('Above 1M');
  const [budgetIndex, setBudgetIndex] = useState(0);

  // Lifestyle Tabs state (Family SUVs, Executive Saloon Cars, Fuel Efficient)
  const [selectedLifestyle, setSelectedLifestyle] = useState('Family SUVs');
  const [lifestyleIndex, setLifestyleIndex] = useState(0);

  // Hero carousel index
  const [heroSlide, setHeroSlide] = useState(0);

  // High-resolution hero banners featuring showroom scenes
  const heroBanners = [
    {
      image: 'https://pub-b5971c79e1e94217b4847709c2e51781.r2.dev/ebenezer-vehicles/used-car-1024x604-1.jpg',
      title: 'Locally Used & Sourced Vehicles',
      subtitle: 'Wide Selection of Vehicles · Kisumu Showroom',
    },
    {
      image: 'https://pub-b5971c79e1e94217b4847709c2e51781.r2.dev/ebenezer-vehicles/38ffefa2-ad36-445a-8dd3-647241f4c3c9.avif',
      title: 'Fuel Efficient Hatchbacks',
      subtitle: 'Toyota Vitz, Passo, Nissan March & Many More',
    },
    {
      image: 'https://pub-b5971c79e1e94217b4847709c2e51781.r2.dev/ebenezer-vehicles/unnamed.jpg',
      title: 'Trade Ins Accepted',
      subtitle: 'Competitive Valuations & Swift Process',
    },
  ];

  // Auto-advance hero carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroBanners.length]);

  // Load real vehicles directly from database API
  useEffect(() => {
    let isMounted = true;
    const loadRealVehicles = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getVehicles({ limit: 100 });
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (isMounted) {
          setVehicles(list);
        }
      } catch (err) {
        console.error('Failed to load real vehicles from database:', err);
        if (isMounted) {
          setError(err.message || 'Unable to load real inventory');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRealVehicles();
    return () => {
      isMounted = false;
    };
  }, []);

  // Standardize real vehicles from database records, strictly hiding sold vehicles
  const normalizedVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        // Sold vehicles are hidden
        const isSold = Boolean(
          v.isSold ||
          v.status === 'sold' ||
          v.status === 'Sold' ||
          v.status === 'out_of_stock'
        );
        return !isSold;
      })
      .map((v) => {
        const id = v.slug || v._id || v.id;
        const brand = v.brand || v.make || v.name?.split(' ')[0] || v.make_model?.split(' ')[0] || 'Unknown';
        const model = v.model || v.name?.split(' ').slice(1).join(' ') || v.make_model?.split(' ').slice(1).join(' ') || '';
        const name = v.name || v.make_model || `${brand} ${model}`.trim();
        const year = v.year || v.modelYear || '';
        const price = Number(v.price || v.sale_price) || 0;

        const images = Array.isArray(v.images) && v.images.length > 0
          ? v.images
          : (v.imageUrl ? [v.imageUrl] : (v.featuredImage ? [v.featuredImage] : (v.primaryImage ? [v.primaryImage] : [])));
        const imageUrl = images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60';

        const condition = v.condition || 'Foreign Used';
        const status = 'In Stock';
        const bodyType = v.category || v.bodyType || v.body_type || v.type || '';
        const fuel = v.fuelType || v.fuel_type || v.fuel || 'Petrol';
        const transmission = v.transmission || 'Automatic';
        const engineCc = parseEngineCc(v.engineCapacity || v.engine_capacity || v.ccRating || v.engine_size, name);

        return {
          ...v,
          id,
          name,
          make: brand,
          brand,
          year,
          price,
          imageUrl,
          condition,
          status,
          bodyType,
          fuel,
          transmission,
          engineCc,
        };
      });
  }, [vehicles]);

  // Filtered vehicles for Budget section (Above 1M means > 1,000,000 or Price on Request)
  const budgetVehicles = useMemo(() => {
    if (normalizedVehicles.length === 0) return [];

    const filtered = normalizedVehicles.filter((v) => {
      if (selectedBudget === 'KSh 300,000 - 500,000') {
        return v.price >= 300000 && v.price <= 500000;
      }
      if (selectedBudget === '500,000 - 1M') {
        return v.price > 500000 && v.price <= 1000000;
      }
      if (selectedBudget === 'Above 1M') {
        return v.price > 1000000 || v.price === 0;
      }
      return true;
    });

    // If no vehicles strictly match the current tab (e.g. prices are 0 / Price on Request), fall back to all vehicles
    return filtered.length > 0 ? filtered : normalizedVehicles;
  }, [normalizedVehicles, selectedBudget]);

  // Filtered vehicles for Lifestyle section
  const lifestyleVehicles = useMemo(() => {
    if (normalizedVehicles.length === 0) return [];

    const filtered = normalizedVehicles.filter((v) => {
      if (selectedLifestyle === 'Family SUVs') {
        return isVehicleSuv(v);
      }
      if (selectedLifestyle === 'Executive Saloon Cars') {
        return isVehicleSaloon(v);
      }
      if (selectedLifestyle === 'Fuel Efficient') {
        const fuelStr = (v.fuel || '').toLowerCase();
        const nameStr = (v.name || '').toLowerCase();
        const isHybrid = fuelStr.includes('hybrid') || nameStr.includes('hybrid');
        const isSmallEngine = v.engineCc !== null && v.engineCc <= 1300;
        return isHybrid || isSmallEngine;
      }
      return true;
    });

    return filtered.length > 0 ? filtered : normalizedVehicles;
  }, [normalizedVehicles, selectedLifestyle]);

  // Budget carousel pagination
  const visibleBudgetCount = 2;
  const maxBudgetIndex = Math.max(0, budgetVehicles.length - visibleBudgetCount);

  const handlePrevBudget = () => {
    setBudgetIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextBudget = () => {
    setBudgetIndex((prev) => Math.min(maxBudgetIndex, prev + 1));
  };

  // Lifestyle carousel pagination
  const visibleLifestyleCount = 2;
  const maxLifestyleIndex = Math.max(0, lifestyleVehicles.length - visibleLifestyleCount);

  const handlePrevLifestyle = () => {
    setLifestyleIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextLifestyle = () => {
    setLifestyleIndex((prev) => Math.min(maxLifestyleIndex, prev + 1));
  };

  return (
    <div className="bg-white min-h-screen pb-24 font-body">
      {/* 1. HERO SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="relative rounded-3xl overflow-hidden shadow-lg bg-slate-900 border border-slate-200/80 aspect-[21/9] sm:aspect-[2.4/1] max-h-[520px] group">
          {/* Main Hero Image */}
          <div className="relative w-full h-full overflow-hidden">
            <img
              src={heroBanners[heroSlide].image}
              alt={heroBanners[heroSlide].title}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            {/* Fallback overlay gradient for subtle depth and high readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 flex flex-col justify-end p-6 sm:p-10 md:p-12">

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-2xl drop-shadow-md">
                {heroBanners[heroSlide].title}
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-slate-200 mt-2 max-w-xl font-medium drop-shadow-sm">
                {heroBanners[heroSlide].subtitle}
              </p>
            </div>
          </div>

          {/* Center Bottom Orange/Amber Indicator Pill Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {heroBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setHeroSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${heroSlide === idx ? 'w-10 h-1.5 bg-amber-500 shadow-sm' : 'w-2 h-1.5 bg-white/60 hover:bg-white'
                  }`}
              />
            ))}
          </div>

          {/* Quick arrow controls on hover */}
          <button
            onClick={() => setHeroSlide((prev) => (prev > 0 ? prev - 1 : heroBanners.length - 1))}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setHeroSlide((prev) => (prev < heroBanners.length - 1 ? prev + 1 : 0))}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. TWO-COLUMN SIDE-BY-SIDE SECTIONS: "SHOP BY BUDGET" COMES FIRST, THEN "SHOP BY LIFESTYLE" */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* COLUMN 1: SHOP BY BUDGET (COMES FIRST) */}
          <section className="space-y-4">
            {/* Header Titles */}
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-[#0B4DB7] mb-1">
                SHOP BY BUDGET
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                A car for every budget
              </h2>
            </div>

            {/* Filter Tabs + Navigation Arrows Row */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {['KSh 300,000 - 500,000', '500,000 - 1M', 'Above 1M'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setSelectedBudget(tab);
                      setBudgetIndex(0);
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${selectedBudget === tab
                      ? 'bg-[#0B4DB7] text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Circular navigation arrows (< and >) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handlePrevBudget}
                  disabled={budgetIndex === 0 || budgetVehicles.length <= visibleBudgetCount}
                  aria-label="Previous budget vehicles"
                  className={`w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center transition-all cursor-pointer ${budgetIndex === 0 || budgetVehicles.length <= visibleBudgetCount
                    ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextBudget}
                  disabled={budgetIndex >= maxBudgetIndex || budgetVehicles.length <= visibleBudgetCount}
                  aria-label="Next budget vehicles"
                  className={`w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center transition-all cursor-pointer ${budgetIndex >= maxBudgetIndex || budgetVehicles.length <= visibleBudgetCount
                    ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Vehicle Cards Grid / Skeleton Loading */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs animate-pulse">
                    <div className="aspect-[16/11] bg-slate-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 w-20 bg-slate-200 rounded" />
                      <div className="h-4 w-3/4 bg-slate-200 rounded" />
                      <div className="h-3 w-1/2 bg-slate-200 rounded" />
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                        <div className="h-4 w-24 bg-slate-200 rounded" />
                        <div className="h-3 w-12 bg-slate-200 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : budgetVehicles.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-slate-700">No vehicles available in this price bracket.</p>
                <button
                  onClick={handleNavigateInventory}
                  className="mt-3 text-xs font-bold text-[#0B4DB7] hover:underline"
                >
                  Browse all inventory →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {budgetVehicles
                  .slice(budgetIndex, budgetIndex + visibleBudgetCount)
                  .map((car) => (
                    <div
                      key={car.id}
                      onClick={() => handleSelectVehicle(car)}
                      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                    >
                      {/* Image with pinned pill badges */}
                      <div className="relative aspect-[16/11] bg-slate-100 overflow-hidden">
                        <img
                          src={car.imageUrl}
                          alt={car.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-2.5 left-2.5">
                          <span className="bg-white/95 backdrop-blur-xs text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs border border-slate-200/50">
                            {car.condition}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                            In Stock
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
                        <div>
                          <div className="text-[10px] font-extrabold uppercase text-[#0B4DB7] tracking-wider mb-0.5">
                            {car.make?.toUpperCase()} {car.year ? `· ${car.year}` : ''}
                          </div>
                          <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-[#0B4DB7] transition-colors line-clamp-1">
                            {car.name}
                          </h3>
                          <div className="flex flex-wrap gap-1 text-[11px] text-slate-500 mt-1.5 font-medium">
                            <span>{car.bodyType || 'Vehicle'}</span>
                            <span>·</span>
                            <span>{car.fuel}</span>
                            <span>·</span>
                            <span>{car.transmission}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-base font-black text-[#0B4DB7]">
                            {FORMAT_KSH(car.price)}
                          </span>
                          <span className="text-xs font-bold text-slate-500 group-hover:text-[#0B4DB7] transition-colors flex items-center gap-0.5">
                            Details →
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>

          {/* COLUMN 2: SHOP BY LIFESTYLE */}
          <section className="space-y-4">
            {/* Header Titles */}
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-red-600 mb-1">
                SHOP BY LIFESTYLE
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                Find a car that fits your life
              </h2>
            </div>

            {/* Filter Tabs + Navigation Arrows Row */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {['Family SUVs', 'Executive Saloon Cars', 'Fuel Efficient'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setSelectedLifestyle(tab);
                      setLifestyleIndex(0);
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${selectedLifestyle === tab
                      ? 'bg-[#0B4DB7] text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Circular navigation arrows (< and >) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handlePrevLifestyle}
                  disabled={lifestyleIndex === 0 || lifestyleVehicles.length <= visibleLifestyleCount}
                  aria-label="Previous lifestyle vehicles"
                  className={`w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center transition-all cursor-pointer ${lifestyleIndex === 0 || lifestyleVehicles.length <= visibleLifestyleCount
                    ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextLifestyle}
                  disabled={lifestyleIndex >= maxLifestyleIndex || lifestyleVehicles.length <= visibleLifestyleCount}
                  aria-label="Next lifestyle vehicles"
                  className={`w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center transition-all cursor-pointer ${lifestyleIndex >= maxLifestyleIndex || lifestyleVehicles.length <= visibleLifestyleCount
                    ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Vehicle Cards Grid / Skeleton Loading */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs animate-pulse">
                    <div className="aspect-[16/11] bg-slate-200" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 w-20 bg-slate-200 rounded" />
                      <div className="h-4 w-3/4 bg-slate-200 rounded" />
                      <div className="h-3 w-1/2 bg-slate-200 rounded" />
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                        <div className="h-4 w-24 bg-slate-200 rounded" />
                        <div className="h-3 w-12 bg-slate-200 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : lifestyleVehicles.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <p className="text-sm font-bold text-slate-700">No vehicles available in this category.</p>
                <button
                  onClick={handleNavigateInventory}
                  className="mt-3 text-xs font-bold text-[#0B4DB7] hover:underline"
                >
                  Browse all inventory →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {lifestyleVehicles
                  .slice(lifestyleIndex, lifestyleIndex + visibleLifestyleCount)
                  .map((car) => (
                    <div
                      key={car.id}
                      onClick={() => handleSelectVehicle(car)}
                      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                    >
                      {/* Image with pinned pill badges */}
                      <div className="relative aspect-[16/11] bg-slate-100 overflow-hidden">
                        <img
                          src={car.imageUrl}
                          alt={car.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-2.5 left-2.5">
                          <span className="bg-white/95 backdrop-blur-xs text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs border border-slate-200/50">
                            {car.condition}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                            In Stock
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
                        <div>
                          <div className="text-[10px] font-extrabold uppercase text-[#0B4DB7] tracking-wider mb-0.5">
                            {car.make?.toUpperCase()} {car.year ? `· ${car.year}` : ''}
                          </div>
                          <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-[#0B4DB7] transition-colors line-clamp-1">
                            {car.name}
                          </h3>
                          <div className="flex flex-wrap gap-1 text-[11px] text-slate-500 mt-1.5 font-medium">
                            <span>{car.bodyType || 'Vehicle'}</span>
                            <span>·</span>
                            <span>{car.fuel}</span>
                            <span>·</span>
                            <span>{car.transmission}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-base font-black text-[#0B4DB7]">
                            {FORMAT_KSH(car.price)}
                          </span>
                          <span className="text-xs font-bold text-slate-500 group-hover:text-[#0B4DB7] transition-colors flex items-center gap-0.5">
                            Details →
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>

        {/* 3. View All Inventory banner CTA with live in-stock counter */}
        <div className="mt-14 p-6 sm:p-8 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              {normalizedVehicles.length > 0
                ? `Explore ${normalizedVehicles.length}+ Verified Second-Hand Cars in Kenya`
                : 'Explore Verified Second-Hand Cars in Kenya'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Browse top deals on certified used cars with nationwide delivery to Nairobi, Mombasa, Nakuru, Eldoret & beyond.
            </p>
          </div>
          <button
            onClick={handleNavigateInventory}
            className="px-6 py-3 rounded-xl bg-[#0B4DB7] hover:bg-blue-600 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            Open Full Inventory
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4. Popular Vehicle Searches in Kenya (SEO Quick Tags) */}
        <section className="mt-16 pt-12 border-t border-slate-200">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-[#0B4DB7] font-bold tracking-[0.2em] uppercase text-xs">Trending In Kenya</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-950">Popular Vehicle Searches</h2>
            <p className="mt-2 text-slate-500 text-sm">
              Quickly find second-hand cars by Kenya's most in-demand makes, budget brackets, and body styles.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto">
            {[
              { label: 'Toyota Prado & Land Cruiser', q: 'Prado' },
              { label: 'Toyota Premio & Allion', q: 'Premio' },
              { label: 'Toyota Fielder & Axio', q: 'Fielder' },
              { label: 'Toyota Harrier & RAV4', q: 'Harrier' },
              { label: 'Subaru Forester & Outback', q: 'Forester' },
              { label: 'Mazda CX-5 & Demio', q: 'Mazda' },
              { label: 'Nissan X-Trail & Note', q: 'Nissan' },
              { label: 'Commercial Pickups (Isuzu / Hilux)', q: 'Pickup' },
              { label: 'Fuel Efficient Cars Under 1.2M', q: 'Vitz' },
              { label: 'Family 7-Seater SUVs', q: 'SUV' },
              { label: 'Cars for Hire & Rental', q: 'Hire' },
              { label: 'Commercial Vans & Probox', q: 'Probox' }
            ].map((tag, idx) => (
              <button
                key={idx}
                onClick={() => {
                  navigate(`/inventory?search=${encodeURIComponent(tag.q)}`);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-[#0B4DB7] hover:text-[#0B4DB7] text-xs font-bold shadow-2xs hover:shadow-sm transition-all cursor-pointer"
              >
                <Search className="w-3 h-3 text-[#0B4DB7]" />
                {tag.label}
              </button>
            ))}
          </div>
        </section>

        {/* 5. Kenya Regional Vehicle Sales & Nationwide Delivery Hubs */}
        <section className="mt-16 pt-12 border-t border-slate-200">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-emerald-700 font-bold tracking-[0.2em] uppercase text-xs flex items-center justify-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              Nationwide Delivery Across All 47 Counties
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-950">
              Vehicle Sales in All Regions of Kenya
            </h2>
            <p className="mt-2 text-slate-500 text-sm leading-relaxed">
              Whether you are buying a personal family vehicle, an executive sedan, or a commercial fleet, we coordinate safe vehicle transit, verified NTSA TIMS logbook transfer, and asset financing directly to your town.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                <h3 className="font-extrabold text-slate-900 text-sm">Nairobi & Central</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium mb-3">
                Serving Nairobi CBD, Westlands, Karen, Kilimani, Thika, Kiambu, Nyeri, and Meru with insured doorstep delivery.
              </p>
              <span className="inline-block text-[10px] font-bold text-[#0B4DB7] bg-blue-50 px-2 py-0.5 rounded">
                24-48h Delivery Available
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                <h3 className="font-extrabold text-slate-900 text-sm">Western & Nyanza</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium mb-3">
                Main showroom in Kisumu (Ondiek Hwy). Immediate test drives for Kisii, Kakamega, Bungoma, Busia, and Homabay.
              </p>
              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Same-Day Viewing & Drive
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                <h3 className="font-extrabold text-slate-900 text-sm">Rift Valley</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium mb-3">
                Delivering reliable SUVs and 4x4s across Nakuru, Eldoret, Kitale, Kericho, Naivasha, and Narok with asset finance.
              </p>
              <span className="inline-block text-[10px] font-bold text-[#0B4DB7] bg-blue-50 px-2 py-0.5 rounded">
                Asset Financing Supported
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                <h3 className="font-extrabold text-slate-900 text-sm">Coast & Eastern</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium mb-3">
                Direct vehicle freight to Mombasa, Nyali, Malindi, Machakos, and Kitui with comprehensive mechanical warranties.
              </p>
              <span className="inline-block text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                Insured Transit Guaranteed
              </span>
            </div>
          </div>
        </section>

        {/* 6. Why Choose Us (The Ebenezar Advantage) */}
        <section className="mt-16 pt-12 border-t border-slate-200">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[#0B4DB7] font-bold tracking-[0.2em] uppercase text-xs">The Ebenezar Advantage</span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-950">Why Buy From Us</h2>
            <p className="mt-2 text-slate-500 font-medium leading-relaxed text-sm">
              We deliver trusted direct locally sourced and certified second-hand vehicles with transparent pricing.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col items-start gap-4 hover:shadow-md transition-all">
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Trusted Kenyan Dealer</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  9+ years serving car buyers in Kenya with absolute integrity and prompt after-sales support.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col items-start gap-4 hover:shadow-md transition-all">
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">150-Point Technical Inspection</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Every vehicle passes a thorough mechanical inspection covering engine health, gearbox, brakes, suspension, and electronics.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col items-start gap-4 hover:shadow-md transition-all">
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center shrink-0">
                <FileCheck className="h-5 w-5 text-[#0B4DB7]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">NTSA Verified & Clean Title</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Guaranteed genuine logbooks with clean records verified on NTSA TIMS. No encumbrances or hidden caveats.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Frequently Asked Questions (FAQ) Section for Google Search Snippets */}
        <section className="mt-16 pt-12 border-t border-slate-200">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[#0B4DB7] font-bold tracking-[0.2em] uppercase text-xs flex items-center justify-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              Got Questions?
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-950">
              Frequently Asked Questions About Buying Cars in Kenya
            </h2>
            <p className="mt-2 text-slate-500 text-sm">
              Clear answers to the most common questions from Kenyan car buyers and importers.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="text-sm font-extrabold text-slate-900 mb-2">
                Can I buy a vehicle with asset financing or hire purchase?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Yes! We partner with leading Kenyan commercial banks and microfinanciers to offer asset financing with deposits starting from as low as 20% to 30% and flexible repayment periods up to 36 months.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="text-sm font-extrabold text-slate-900 mb-2">
                How do I get my car delivered to Nairobi, Mombasa, or other towns?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We coordinate insured, professional vehicle transport to any location in Kenya. You can inspect comprehensive high-res photos and video walkthroughs, and we deliver right to your doorstep.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="text-sm font-extrabold text-slate-900 mb-2">
                How does a car trade-in work?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Simply submit your current car's details on our Trade-In page. Our valuers assess your vehicle, offer a fair market valuation, and you pay or finance only the price difference for your upgrade.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="text-sm font-extrabold text-slate-900 mb-2">
                How long does the NTSA logbook transfer take?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Once payment is finalized, the logbook transfer is initiated immediately on the official NTSA TIMS portal. You receive SMS verification and transfer confirmation within 24 to 72 hours.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
export { HomePage as Home };
