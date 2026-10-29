export interface Vehicle {
  id: string;
  stockId: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  price: number; // 0 for "Ask us"
  priceFormatted?: string;
  currency: 'USD' | 'KES';
  mileage: number; // in km
  drive: '2WD' | '4WD' | 'AWD' | 'RWD';
  fuel: 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC';
  transmission: 'AUTOMATIC' | 'MANUAL' | 'CVT';
  engineCapacity: string; // e.g. "2.5L", "0.0L", "2.8L"
  bodyType: 'SUV' | 'Compact SUV' | 'Saloon' | 'Tractor' | 'Van / MPV' | 'Pickup' | 'Commercial' | 'Hatchback' | 'Station Wagon' | 'Minivan' | 'Pikipiki';
  color: string;
  interiorColor?: string;
  location: 'Mombasa' | 'Nairobi' | 'Nakuru';
  status: 'IN STOCK' | 'RESERVED' | 'ON TRANSIT';
  chassisNo?: string;
  doors?: number;
  seats?: number;
  primaryImage: string;
  gallery: string[];
  features: string[];
  description: string;
  dealerPhone: string;
}

export interface FilterState {
  searchQuery: string;
  make: string;
  model: string;
  bodyType: string;
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
  location: string;
  fuel: string;
  transmission: string;
  drive: string;
  inStockOnly: boolean;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'year-desc' | 'mileage-asc';
}

export interface VehicleAlert {
  id: string;
  email: string;
  phone?: string;
  notifyWhatsapp: boolean;
  frequency: 'instant' | 'daily';
  criteria: {
    query?: string;
    make?: string;
    model?: string;
    bodyType?: string;
    maxPrice?: number;
    location?: string;
  };
  summary: string;
  createdAt: string;
}

