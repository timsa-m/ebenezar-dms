import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  ShieldCheck,
  Gauge,
  Car,
  Fuel,
  GitBranch,
  Cpu,
  Compass,
  Palette,
  Check,
  Phone,
  MessageCircle,
  Share2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  AlertCircle,
  Maximize2,
  X
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { getVehicleById, getVehicles } from '../services/vehicleApi';
import { GlobalSearchBar } from '../components/GlobalSearchBar';
import { FinanceModal } from './FinanceModal';
import { NegotiateModal } from './NegotiateModal';

export const SALES_AGENTS = [
  {
    initial: 'E',
    name: 'Ebenezar Director',
    phone: '+254 722 263 192',
    whatsapp: '254722263192',
  },
  {
    initial: 'K',
    name: 'Kisumu Showroom',
    phone: '+254 704 287 382',
    whatsapp: '254704287382',
  },
];

export const computeVehicleDrive = (raw) => {
  if (!raw) return '2WD (Front Wheel Drive)';

  // 1. Check if stated otherwise in the backend
  const backendDrive = raw.drive || raw.driveType || raw.drive_type || raw.drivetrain;
  if (backendDrive && typeof backendDrive === 'string' && backendDrive.trim()) {
    const dLower = backendDrive.trim().toLowerCase();
    if (dLower.includes('4wd') || dLower.includes('4x4') || dLower.includes('awd') || dLower.includes('four')) {
      return '4WD';
    }
    if (dLower.includes('fwd') || dLower.includes('front')) {
      return '2WD (Front Wheel Drive)';
    }
    if (dLower.includes('rwd') || dLower.includes('rear')) {
      return '2WD (Rear Wheel Drive)';
    }
    if (dLower.includes('2wd')) {
      return '2WD';
    }
    return backendDrive.trim();
  }

  // 2. Derive based on body type / category and vehicle name
  const typeStr = (raw.category || raw.bodyType || raw.body_type || raw.type || '').toLowerCase();
  const nameStr = `${raw.make_model || ''} ${raw.name || ''} ${raw.model || ''}`.toLowerCase();

  // Vans are rear wheel drive
  const isVan = (typeStr.includes('van') && !typeStr.includes('minivan')) ||
    nameStr.includes('hiace') ||
    nameStr.includes('caravan') ||
    nameStr.includes('urvan') ||
    nameStr.includes('nv350');
  if (isVan) {
    return '2WD (Rear Wheel Drive)';
  }

  // Common Saloon, hatchback, minivan and mini suv are front wheel drive
  const isMiniSuv = typeStr.includes('compact suv') ||
    typeStr.includes('mini suv') ||
    nameStr.includes('juke') ||
    nameStr.includes('cx-3') ||
    nameStr.includes('cx3') ||
    nameStr.includes('vezel') ||
    nameStr.includes('rush') ||
    nameStr.includes('c-hr') ||
    nameStr.includes('chr') ||
    nameStr.includes('yaris cross') ||
    nameStr.includes('corolla cross') ||
    nameStr.includes('raize');

  if (
    typeStr.includes('saloon') ||
    typeStr.includes('sedan') ||
    typeStr.includes('hatchback') ||
    typeStr.includes('minivan') ||
    typeStr.includes('station wagon') ||
    typeStr.includes('wagon') ||
    typeStr.includes('coupe') ||
    isMiniSuv
  ) {
    return '2WD (Front Wheel Drive)';
  }

  // SUVs and Pickups are 4WD
  const isSuvOrPickup = typeStr.includes('suv') ||
    typeStr.includes('pickup') ||
    typeStr.includes('truck') ||
    typeStr.includes('commercial') ||
    nameStr.includes('prado') ||
    nameStr.includes('land cruiser') ||
    nameStr.includes('patrol') ||
    nameStr.includes('pajero') ||
    nameStr.includes('hilux') ||
    nameStr.includes('d-max') ||
    nameStr.includes('dmax') ||
    nameStr.includes('ranger') ||
    nameStr.includes('navara') ||
    nameStr.includes('defender') ||
    nameStr.includes('discovery') ||
    nameStr.includes('forester') ||
    nameStr.includes('outback');

  if (isSuvOrPickup) {
    return '4WD';
  }

  return '2WD (Front Wheel Drive)';
};

export const FORMAT_KSH = (val) => {
  if (val === null || val === undefined || isNaN(val)) return 'Ksh 0';
  return `Ksh ${Number(val).toLocaleString()}`;
};

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicleRaw, setVehicleRaw] = useState(null);
  const [similarRaw, setSimilarRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [financeModalOpen, setFinanceModalOpen] = useState(false);
  const [negotiateModalOpen, setNegotiateModalOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Sticky search bar revealed when scrolling past asking price
  const askingPriceRef = useRef(null);
  const [isPastAskingPrice, setIsPastAskingPrice] = useState(false);

  // Load real vehicle data from DB
  useEffect(() => {
    let isMounted = true;
    const fetchVehicleData = async () => {
      try {
        setLoading(true);
        setError('');
        const [targetVehicle, allVehicles] = await Promise.all([
          getVehicleById(id),
          getVehicles({ limit: 20 })
        ]);

        if (isMounted) {
          const raw = (targetVehicle && !targetVehicle.error)
            ? (targetVehicle._id || targetVehicle.id ? targetVehicle : (targetVehicle.data || targetVehicle.vehicle || targetVehicle))
            : null;
          setVehicleRaw(raw);
          if (raw?.slug && id !== raw.slug) {
            navigate(`/vehicle/${raw.slug}`, { replace: true });
          }
          const list = Array.isArray(allVehicles)
            ? allVehicles
            : (allVehicles?.data || allVehicles?.vehicles || []);
          setSimilarRaw(list);
          setActiveImageIndex(0);
          setCarouselIndex(0);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load vehicle details');
          setVehicleRaw(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchVehicleData();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    const checkScroll = () => {
      if (askingPriceRef.current) {
        const rect = askingPriceRef.current.getBoundingClientRect();
        // Once the bottom of the asking price card scrolls past the navbar bottom (80px), reveal the sticky search bar
        setIsPastAskingPrice(rect.bottom <= 80);
      }
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
    return () => window.removeEventListener('scroll', checkScroll);
  }, [vehicleRaw]);

  // Gallery resolution for hooks
  const rawImages = vehicleRaw?.images;
  const gallery = Array.isArray(rawImages) && rawImages.length > 0
    ? rawImages
    : (vehicleRaw?.primaryImage ? [vehicleRaw.primaryImage] : ['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60']);
  const galleryLength = gallery.length;

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? Math.max(0, galleryLength - 1) : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev >= galleryLength - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation: ArrowLeft/ArrowRight to scroll images, Escape to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFullscreen) {
        if (e.key === 'Escape') {
          setIsFullscreen(false);
        } else if (e.key === 'ArrowRight') {
          handleNextImage();
        } else if (e.key === 'ArrowLeft') {
          handlePrevImage();
        }
      } else {
        const isInputFocused = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        if (!isInputFocused) {
          if (e.key === 'ArrowRight') {
            handleNextImage();
          } else if (e.key === 'ArrowLeft') {
            handlePrevImage();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, galleryLength]);

  // Lock body scroll when fullscreen modal is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Touch swipe support for mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNextImage();
    } else if (diff < -50) {
      handlePrevImage();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const title = vehicleRaw?.make_model || vehicleRaw?.name || 'Vehicle';
    const price = vehicleRaw?.price || vehicleRaw?.sale_price || 0;
    const text = encodeURIComponent(
      `Check out this ${title} at ${FORMAT_KSH(price)} on Ebenezar Car Bazaar: ${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleFacebookShare = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  // ── Early returns for Loading and Not Found states ──
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center py-20 px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-[#0B4DB7] border-t-transparent animate-spin"></div>
          <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">
            Loading Vehicle Details...
          </p>
        </div>
      </div>
    );
  }

  if (!vehicleRaw) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-white px-4 text-center">
        <div className="p-4 bg-slate-100 rounded-full mb-2 shadow-xs border border-slate-200">
          <Info className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Vehicle Not Found</h1>
        <p className="text-slate-500 max-w-md text-sm">
          {error || "The vehicle you are looking for has been sold or is not available in our database."}
        </p>
        <button
          onClick={() => navigate('/inventory')}
          className="mt-3 px-7 py-3 bg-[#0B4DB7] text-white font-bold text-sm rounded-xl hover:bg-blue-800 transition shadow-sm cursor-pointer"
        >
          Browse All Inventory
        </button>
      </div>
    );
  }

  // Map database vehicle data to the format expected by the UI
  const rawTitle = vehicleRaw.make_model || vehicleRaw.name || 'Vehicle Details';
  const rawBrand = vehicleRaw.brand || rawTitle.split(' ')[0] || 'Unknown';
  const rawModel = vehicleRaw.model || rawTitle.replace(rawBrand, '').trim() || rawTitle;
  const vehicleId = vehicleRaw.slug || vehicleRaw._id || vehicleRaw.id;

  const mileageNum = Number(vehicleRaw.mileage) || 0;
  const driveValue = computeVehicleDrive(vehicleRaw);

  const vehicle = {
    id: vehicleId,
    title: rawTitle,
    brand: rawBrand,
    model: rawModel,
    year: vehicleRaw.modelYear || vehicleRaw.year || 'N/A',
    price: vehicleRaw.price || vehicleRaw.sale_price || 0,
    condition: vehicleRaw.condition || 'Foreign Used',
    status: vehicleRaw.isSold ? 'Sold' : (vehicleRaw.status || 'Available'),
    mileageNum: mileageNum,
    featuredImage: vehicleRaw.images?.[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60',
    gallery: gallery,
    specs: {
      year: vehicleRaw.modelYear || vehicleRaw.year || 'N/A',
      bodyType: vehicleRaw.category || vehicleRaw.bodyType || vehicleRaw.body_type || 'SUV',
      engine: vehicleRaw.engineCapacity || vehicleRaw.engine_size || vehicleRaw.ccRating || 'N/A',
      condition: vehicleRaw.condition || 'Foreign Used',
      fuel: vehicleRaw.fuelType || vehicleRaw.fuel_type || vehicleRaw.fuel || 'Petrol',
      drive: driveValue,
      mileage: mileageNum > 0 ? `${mileageNum.toLocaleString()} km` : null,
      transmission: vehicleRaw.transmission || 'Automatic',
      colour: vehicleRaw.color || vehicleRaw.exteriorColor || 'N/A',
    },
    features: Array.isArray(vehicleRaw.features) && vehicleRaw.features.length > 0
      ? vehicleRaw.features
      : ['Power Steering', 'Air Conditioning', 'Power Windows', 'Anti-lock Braking', 'Dual Airbags', 'Central Locking'],
    description: vehicleRaw.description || '',
    stockId: vehicleRaw.stockId || vehicleId?.slice?.(-6)?.toUpperCase() || 'N/A'
  };

  const activeImage = gallery[activeImageIndex] || vehicle.featuredImage;

  // Filter similar vehicles from real database response
  const similarVehicles = similarRaw
    .filter((v) => (v.slug || v._id || v.id) !== vehicleId)
    .map((v) => {
      const sTitle = v.make_model || v.name || 'Vehicle';
      return {
        id: v.slug || v._id || v.id,
        title: sTitle,
        year: v.modelYear || v.year || 'N/A',
        price: v.price || v.sale_price || 0,
        condition: v.condition || 'Foreign Used',
        status: v.isSold ? 'Sold' : (v.status || 'Available'),
        fuel: v.fuelType || v.fuel_type || v.fuel || 'Petrol',
        transmission: v.transmission || 'Automatic',
        featuredImage: v.images?.[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60',
        specs: {
          mileage: v.mileage && Number(v.mileage) > 0 ? `${Number(v.mileage).toLocaleString()} km` : null,
        }
      };
    });

  const visibleCardsCount = 4;
  const maxCarouselIndex = Math.max(0, similarVehicles.length - visibleCardsCount);

  const handlePrevCarousel = () => {
    setCarouselIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextCarousel = () => {
    setCarouselIndex((prev) => Math.min(maxCarouselIndex, prev + 1));
  };

  const handleSelectVehicle = (item) => {
    navigate(`/vehicle/${item.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateInventory = () => {
    navigate('/inventory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (searchTerm, brand) => {
    const params = new URLSearchParams();
    if (searchTerm && searchTerm.trim()) {
      params.set('q', searchTerm.trim());
      params.set('search', searchTerm.trim());
    }
    if (brand && brand !== 'All brands' && brand !== 'All') {
      params.set('brand', brand);
    }
    navigate(`/inventory?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Vehicle link copied to clipboard!
        </div>
      )}

      {/* Sticky Search Bar revealed when scrolling past Asking Price */}
      <div
        className={`fixed top-16 sm:top-20 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-md transition-all duration-300 ease-in-out ${isPastAskingPrice
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : '-translate-y-full opacity-0 pointer-events-none'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
          <div className="flex-1">
            <GlobalSearchBar onSearch={handleSearch} />
          </div>
          {/* Subtle vehicle quick tag in sticky bar */}
          <div className="hidden xl:flex items-center gap-2.5 shrink-0 pl-4 border-l border-slate-200 text-xs">
            <img
              src={vehicle.featuredImage}
              alt={vehicle.title}
              className="w-9 h-7 object-cover rounded-md border border-slate-200"
            />
            <div>
              <div className="font-extrabold text-slate-900 leading-tight truncate max-w-[140px]">
                {vehicle.title}
              </div>
              <div className="font-black text-[#0B4DB7] text-[11px]">
                {FORMAT_KSH(vehicle.price)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* A. Top Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-medium">
          <button
            onClick={() => navigate('/')}
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <button
            onClick={handleNavigateInventory}
            className="hover:text-blue-600 transition-colors cursor-pointer"
          >
            Inventory
          </button>
          <span>/</span>
          <span className="text-slate-800 font-semibold truncate max-w-[200px] sm:max-w-none">
            {vehicle.title}
          </span>
        </nav>

        {/* B. Main Hero & Pricing Section (2-Column Desktop Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-14">
          {/* Left Column (Media Gallery) - 7 cols */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main Featured Image Container */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-xs aspect-[16/11] group">
              <img
                src={activeImage}
                alt={vehicle.title}
                onClick={() => setIsFullscreen(true)}
                className="w-full h-full object-cover transition-opacity duration-200 cursor-zoom-in"
              />

              {/* Counter Pill Badge in top right */}
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-xs text-slate-800 text-xs font-bold px-3 py-1 rounded-full shadow-md border border-slate-200/60 z-10 pointer-events-none">
                {activeImageIndex + 1}/{gallery.length}
              </div>

              {/* View Fullscreen Action Button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="absolute bottom-4 right-4 z-10 bg-black/60 hover:bg-black/85 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-md shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                title="View Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>

              {/* Left / Right Chevron buttons to browse pictures even without entering fullscreen */}
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/55 hover:bg-black/85 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg hover:scale-105"
                    aria-label="Previous photo"
                    title="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImage();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/55 hover:bg-black/85 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg hover:scale-105"
                    aria-label="Next photo"
                    title="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Badges on image for mobile context */}
              <div className="absolute top-4 left-4 flex gap-2 lg:hidden z-10 pointer-events-none">
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                  {vehicle.condition}
                </span>
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                  {vehicle.status}
                </span>
              </div>
            </div>

            {/* Thumbnail Reel below main preview (6+ clickable thumbnails) */}
            {gallery.length > 1 && (
              <div className="grid grid-cols-6 sm:grid-cols-6 gap-2.5">
                {gallery.slice(0, 6).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 transition-all cursor-pointer ${activeImageIndex === idx
                      ? 'border-2 border-[#0B4DB7] ring-2 ring-blue-500/20 scale-[1.02]'
                      : 'border border-slate-200 opacity-80 hover:opacity-100'
                      }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column (Vehicle Overview & CTAs) - 5 cols */}
          <div className="lg:col-span-5 space-y-5">
            {/* Eyebrow & Title */}
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-[#0B4DB7] mb-1">
                {vehicle.brand.toUpperCase()} · {vehicle.year}
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                {vehicle.model.toUpperCase()}
              </h1>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                {vehicle.condition}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                {vehicle.status}
              </span>
            </div>

            {/* Pricing Card */}
            <div
              ref={askingPriceRef}
              className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2"
            >
              <span className="text-xs font-semibold text-slate-500 block">Asking price</span>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                {FORMAT_KSH(vehicle.price)}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                <button
                  type="button"
                  onClick={() => setNegotiateModalOpen(true)}
                  className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                >
                  Negotiate
                </button>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">Financing from 70% </span>
                <span className="text-slate-400">·</span>
                <button
                  type="button"
                  onClick={() => setFinanceModalOpen(true)}
                  className="text-slate-800 underline hover:text-blue-600 font-semibold cursor-pointer"
                >
                  request a quote
                </button>
              </div>
            </div>

            {/* Social Share Row */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-extrabold tracking-wider text-slate-500 uppercase">
                SHARE
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleWhatsAppShare}
                  aria-label="Share on WhatsApp"
                  title="Share on WhatsApp"
                  className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFacebookShare}
                  aria-label="Share on Facebook"
                  title="Share on Facebook"
                  className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopyLink}
                  aria-label="Copy Link"
                  title="Copy Vehicle Link"
                  className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* YOUR SALES TEAM Section */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
              <h2 className="text-xs font-extrabold tracking-wider uppercase text-slate-500">
                OUR TEAM
              </h2>

              <div className="space-y-3.5">
                {SALES_AGENTS.map((agent) => (
                  <div
                    key={agent.name}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Agent Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-extrabold text-sm flex items-center justify-center shrink-0">
                        {agent.initial}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{agent.name}</div>
                        <div className="text-xs text-slate-500 font-medium">{agent.phone}</div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${agent.phone.replace(/\s+/g, '')}`}
                        className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${agent.whatsapp}?text=Hello%20${encodeURIComponent(
                          agent.name
                        )},%20I%20am%20interested%20in%20the%20${encodeURIComponent(
                          vehicle.title
                        )}%20listed%20at%20${encodeURIComponent(
                          FORMAT_KSH(vehicle.price)
                        )}%20on%20Ebenezar%20Car%20Bazaar.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Subtle section divider before Technical Specifications */}
        <div className="my-8 border-t border-slate-100"></div>

        {/* C. Technical Specifications Grid */}
        <section className="my-14 space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B4DB7] block mb-1">
              SPECIFICATIONS
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Technical Specifications
            </h2>
          </div>

          {/* Rounded bordered card grid */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 gap-px bg-slate-200">
              {/* 1. Year */}
              <div className="bg-white p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    YEAR
                  </span>
                </div>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 text-right">
                  {vehicle.specs.year}
                </span>
              </div>

              {/* 2. Condition */}
              <div className="bg-white p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    CONDITION
                  </span>
                </div>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 text-right">
                  {vehicle.specs.condition}
                </span>
              </div>

              {/* 3. Mileage (Hidden if = 0) */}
              {vehicle.mileageNum > 0 && (
                <div className="bg-white p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center">
                      <Gauge className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      MILEAGE
                    </span>
                  </div>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 text-right">
                    {vehicle.specs.mileage}
                  </span>
                </div>
              )}

              {/* 4. Body Type */}
              <div className="bg-white p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center">
                    <Car className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    BODY TYPE
                  </span>
                </div>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 text-right">
                  {vehicle.specs.bodyType}
                </span>
              </div>

              {/* 5. Fuel */}
              <div className="bg-white p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center">
                    <Fuel className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    FUEL
                  </span>
                </div>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 text-right">
                  {vehicle.specs.fuel}
                </span>
              </div>

              {/* 6. Transmission */}
              <div className="bg-white p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    TRANSMISSION
                  </span>
                </div>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 text-right">
                  {vehicle.specs.transmission}
                </span>
              </div>

              {/* 7. Engine */}
              <div className="bg-white p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    ENGINE
                  </span>
                </div>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 text-right">
                  {vehicle.specs.engine}
                </span>
              </div>

              {/* 8. Drive */}
              <div className="bg-white p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center">
                    <Compass className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    DRIVE
                  </span>
                </div>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 text-right">
                  {vehicle.specs.drive}
                </span>
              </div>

              {/* 9. Colour */}
              <div className="bg-white p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center">
                    <Palette className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    COLOUR
                  </span>
                </div>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 text-right">
                  {vehicle.specs.colour}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* D. Premium Features Checklist */}
        <section className="my-14 space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B4DB7] block mb-1">
              CRAFTED FOR COMFORT
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Premium Features
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-8">
            {vehicle.features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 py-1">
                <Check className="w-4 h-4 text-[#0B4DB7] stroke-[3] shrink-0" />
                <span className="text-sm font-semibold text-slate-700">{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Description Section (If available in DB) */}
        {vehicle.description && (
          <section className="my-14 space-y-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B4DB7] block mb-1">
                OVERVIEW
              </span>
              <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                Vehicle Description
              </h2>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6">
              <div
                className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(vehicle.description)
                }}
              />
            </div>
          </section>
        )}

        {/* E. "Explore Similar Models" Carousel */}
        {similarVehicles.length > 0 && (
          <section className="my-16 space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B4DB7] block mb-1">
                  CURATED SELECTION
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                  Explore Similar Models
                </h2>
              </div>
              <button
                onClick={handleNavigateInventory}
                className="text-[#0B4DB7] hover:text-blue-800 text-sm font-bold flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                All inventory
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Carousel container */}
            <div className="relative group">
              {/* Left circular navigation button */}
              {carouselIndex > 0 && (
                <button
                  onClick={handlePrevCarousel}
                  aria-label="Previous models"
                  className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-slate-200 text-slate-700 hover:text-blue-600 flex items-center justify-center hover:scale-105 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Right circular navigation button */}
              {carouselIndex < maxCarouselIndex && (
                <button
                  onClick={handleNextCarousel}
                  aria-label="Next models"
                  className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-slate-200 text-slate-700 hover:text-blue-600 flex items-center justify-center hover:scale-105 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* Carousel items grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {similarVehicles.slice(carouselIndex, carouselIndex + visibleCardsCount).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectVehicle(item)}
                    className="group/card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                  >
                    {/* Photo with badges */}
                    <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                      <img
                        src={item.featuredImage}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="bg-white/95 backdrop-blur-xs text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs border border-slate-200/50">
                          {item.condition}
                        </span>
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <span className="bg-emerald-500/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm group-hover/card:text-[#0B4DB7] transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                        <div className="flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-500 mt-2">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                            {item.year}
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                            {item.fuel}
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                            {item.transmission}
                          </span>
                          {item.specs.mileage && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                              {item.specs.mileage}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-base font-black text-[#0B4DB7]">
                          {FORMAT_KSH(item.price)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Financing Modal */}
      <FinanceModal
        vehicle={vehicle}
        isOpen={financeModalOpen}
        onClose={() => setFinanceModalOpen(false)}
      />

      {/* Negotiate Modal */}
      <NegotiateModal
        vehicle={vehicle}
        isOpen={negotiateModalOpen}
        onClose={() => setNegotiateModalOpen(false)}
      />

      {/* Fullscreen Photo Lightbox Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Bar: Title & Counter left, Close (X) button on the TOP RIGHT */}
          <div className="flex items-center justify-between p-4 sm:p-6 text-white z-20">
            <div className="flex items-center gap-3">
              <span className="text-sm sm:text-base font-extrabold tracking-tight truncate max-w-[200px] sm:max-w-md">
                {vehicle.title}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold text-white/90">
                {activeImageIndex + 1} / {gallery.length}
              </span>
            </div>

            {/* Prominent (X) Close button on top right */}
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 active:bg-white/50 text-white flex items-center justify-center transition-colors cursor-pointer shadow-lg"
              aria-label="Close fullscreen"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Area: Left chevron, Main image, Right chevron */}
          <div className="relative flex-1 flex items-center justify-center px-4 sm:px-16 overflow-hidden">
            {/* Left Chevron Button */}
            {gallery.length > 1 && (
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-3 sm:left-6 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-lg"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* The Fullscreen Image */}
            <img
              src={activeImage}
              alt={`${vehicle.title} full image ${activeImageIndex + 1}`}
              className="max-h-[72vh] sm:max-h-[78vh] max-w-full object-contain rounded-xl shadow-2xl transition-all duration-200"
            />

            {/* Right Chevron Button */}
            {gallery.length > 1 && (
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-3 sm:right-6 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-lg"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {gallery.length > 1 && (
            <div className="p-4 z-20 overflow-x-auto flex items-center justify-center gap-2">
              <div className="flex gap-2 max-w-full overflow-x-auto py-1 px-2 scrollbar-none">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${activeImageIndex === idx
                      ? 'border-blue-500 scale-105 opacity-100 shadow-md ring-2 ring-blue-400/40'
                      : 'border-white/20 opacity-50 hover:opacity-80'
                      }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { VehicleDetails as VDP };
