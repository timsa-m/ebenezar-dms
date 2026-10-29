'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  Tag,
  DollarSign,
  Globe,
  Calendar,
  Sparkles,
  Camera,
  ArrowRight,
  Loader2,
  Check,
  Fuel,
  Gauge,
  ShieldCheck,
  FileText,
  Clock,
} from "lucide-react";
import { updateVehicleFormData } from "@/lib/actions/vehicle.actions";
import type { Vehicle } from "@/src/types/database.types";
import { toast } from '@/lib/toast';
import MultiFileUpload from "@/components/MultiFileUpload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DatePickerInput from "@/components/ui/DatePickerInput";

interface VehicleEditFormProps {
  vehicle: Vehicle;
}

export default function VehicleEditForm({ vehicle }: VehicleEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Core & Identification
  const [registrationNo, setRegistrationNo] = useState(vehicle.registration_no || "");
  const [makeModel, setMakeModel] = useState(vehicle.make_model || "");
  const [type, setType] = useState(vehicle.type || "");
  const [year, setYear] = useState<number | "">(vehicle.year ?? "");

  // Technical Specs
  const [color, setColor] = useState(vehicle.color || "");
  const [mileage, setMileage] = useState<number | "">(vehicle.mileage ?? "");
  const [engineCapacity, setEngineCapacity] = useState(vehicle.engine_capacity || "");
  const [transmission, setTransmission] = useState(vehicle.transmission || "Automatic");
  const [fuelType, setFuelType] = useState(vehicle.fuel_type || "Petrol");
  const [condition, setCondition] = useState(vehicle.condition || "Locally Used");
  const [chassisNo, setChassisNo] = useState(vehicle.chassis_no || "");
  const [engineNo, setEngineNo] = useState(vehicle.engine_no || "");

  // Pricing & Acquisition
  const [purchasePrice, setPurchasePrice] = useState<number | "">(vehicle.purchase_price ?? "");
  const [salePrice, setSalePrice] = useState<number | "">(vehicle.sale_price ?? "");
  const [purchaseDate, setPurchaseDate] = useState(vehicle.date_purchased ? vehicle.date_purchased.split('T')[0] : "");

  // Website & Online Display
  const [isPublished, setIsPublished] = useState(vehicle.is_published ?? true);
  const [isNewArrival, setIsNewArrival] = useState(vehicle.is_new_arrival ?? false);
  const [forHire, setForHire] = useState(vehicle.for_hire ?? false);
  const [hirePrice, setHirePrice] = useState<number | "">(vehicle.hire_price ?? "");
  const [hirePriceWeekly, setHirePriceWeekly] = useState<number | "">(vehicle.hire_price_weekly ?? "");
  const [description, setDescription] = useState(vehicle.description || "");
  const [featuresText, setFeaturesText] = useState((vehicle.features || []).join(", "));

  // Gallery images (Base64 or URLs)
  const [images, setImages] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(vehicle.images || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registrationNo.trim() || !makeModel.trim()) {
      toast.error("Registration Number and Make/Model are required");
      return;
    }

    startTransition(async () => {
      const featuresArray = featuresText
        .split(",")
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const params = {
        registrationNo: registrationNo.trim().toUpperCase(),
        makeModel: makeModel.trim(),
        type: type || null,
        year: year !== "" ? Number(year) : null,
        color: color.trim() || null,
        mileage: mileage !== "" ? Number(mileage) : null,
        engineCapacity: engineCapacity.trim() || null,
        chassisNo: chassisNo.trim().toUpperCase() || null,
        chassis_no: chassisNo.trim().toUpperCase() || null,
        engineNo: engineNo.trim().toUpperCase() || null,
        engine_no: engineNo.trim().toUpperCase() || null,
        transmission,
        fuelType,
        condition,
        purchasePrice: purchasePrice !== "" ? Number(purchasePrice) : 0,
        salePrice: salePrice !== "" ? Number(salePrice) : 0,
        purchaseDate: purchaseDate || null,
        isPublished: Boolean(isPublished),
        is_new_arrival: Boolean(isNewArrival),
        isNewArrival: Boolean(isNewArrival),
        for_hire: Boolean(forHire),
        forHire: Boolean(forHire),
        hire_price: forHire && hirePrice !== "" ? Number(hirePrice) : null,
        hirePrice: forHire && hirePrice !== "" ? Number(hirePrice) : null,
        hire_price_weekly: forHire && hirePriceWeekly !== "" ? Number(hirePriceWeekly) : null,
        hirePriceWeekly: forHire && hirePriceWeekly !== "" ? Number(hirePriceWeekly) : null,
        description: description.trim() || null,
        features: featuresArray,
        existingImages,
      };

      const formData = new FormData();
      formData.append('id', vehicle.id);
      formData.append('data', JSON.stringify(params));

      if (images.length > 0) {
        images.forEach((img, idx) => {
          formData.append(`image_${idx}`, img);
        });
      }

      const res = await updateVehicleFormData(formData);

      if (res.success) {
        toast.success("Vehicle updated successfully");
        router.push(`/vehicles/${vehicle.id}`);
        router.refresh();
      } else {
        toast.error(res.error || "Failed to update vehicle");
      }
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-16">
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── CARD 1: Core Identification ── */}
        <section className="rounded-xl min-h-[max-content] w-[100%]">
          <div className="flex items-center relative left-3 top-3 gap-3.5 pb-5 mb-6">
            <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60 shadow-xs">
              <Car className="size-5" />
            </div>
            <div>
              <h2 className="text-16 font-bold text-gray-900 tracking-tight">Core Information</h2>
              <p className="text-12 text-gray-500 font-medium">Essential registration, make, model, and classification</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative left-3 top-4 right-3">
            {/* Registration Number */}
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Registration Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={registrationNo}
                onChange={e => setRegistrationNo(e.target.value.toUpperCase())}
                placeholder="e.g. KDA 123A"
                className="input-class h-11 w-full uppercase tracking-wider font-bold text-gray-900"
              />
            </div>

            {/* Make & Model */}
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Make & Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={makeModel}
                onChange={e => setMakeModel(e.target.value)}
                placeholder="e.g. Toyota Prado TX L-Package"
                className="input-class h-11 w-full font-medium text-gray-900"
              />
            </div>

            {/* Vehicle Type */}
            <div className="space-y-1.5 relative">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Body / Vehicle Type
              </label>
              <Select value={type || undefined} onValueChange={setType}>
                <SelectTrigger className="input-class h-11 w-full flex items-center justify-between font-medium">
                  <SelectValue placeholder="Select vehicle type..." />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="Compact SUV">Compact SUV</SelectItem>
                  <SelectItem value="Saloon">Saloon (Sedan)</SelectItem>
                  <SelectItem value="Hatchback">Hatchback</SelectItem>
                  <SelectItem value="Station Wagon">Station Wagon</SelectItem>
                  <SelectItem value="Minivan">Minivan</SelectItem>
                  <SelectItem value="Pickup / Commercial">Pickup / Commercial</SelectItem>
                  <SelectItem value="Van">Van / Bus</SelectItem>
                  <SelectItem value="Coupe">Coupe</SelectItem>
                  <SelectItem value="Convertible">Convertible</SelectItem>
                  <SelectItem value="Pikipiki">Pikipiki (Motorcycle)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Year */}
            <div className="space-y-1.5 relative">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Year of Manufacture
              </label>
              <input
                type="number"
                min="1980"
                max={new Date().getFullYear() + 1}
                value={year}
                onChange={e => setYear(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g. 2018"
                className="input-class h-11 w-full text-gray-900 font-medium"
              />
            </div>
          </div>
        </section>
        <br />
        <br />

        {/* ── CARD 2: Technical Specifications & Identifiers ── */}
        <section className="rounded-2xl relative min-h-max w-full">
          <div className="flex items-center gap-3.5 pb-5 mb-6 relative left-3 top-3">
            <div className="size-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/60 shadow-xs">
              <Tag className="size-5" />
            </div>
            <div>
              <h2 className="text-16 font-bold text-gray-900 tracking-tight">Technical Specifications & Identifiers</h2>
              <p className="text-12 text-gray-500 font-medium">Engine, transmission, fuel, mileage, and VIN details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative left-3 top-4 right-3">
            {/* Color */}
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Exterior Color
              </label>
              <input
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="e.g. Pearl White"
                className="input-class h-11 w-full font-medium text-gray-900"
              />
            </div>

            {/* Engine Capacity */}
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Engine Capacity
              </label>
              <input
                type="text"
                value={engineCapacity}
                onChange={e => setEngineCapacity(e.target.value)}
                placeholder="e.g. 2000cc / 2.7L"
                className="input-class h-11 w-full font-medium text-gray-900"
              />
            </div>

            {/* Transmission */}
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Transmission
              </label>
              <Select value={transmission || undefined} onValueChange={setTransmission}>
                <SelectTrigger className="input-class h-11 w-full flex items-center justify-between font-medium">
                  <SelectValue placeholder="Select transmission..." />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <SelectItem value="Automatic">Automatic</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="CVT">CVT</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fuel Type */}
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Fuel Type
              </label>
              <Select value={fuelType || undefined} onValueChange={setFuelType}>
                <SelectTrigger className="input-class h-11 w-full flex items-center justify-between font-medium">
                  <SelectValue placeholder="Select fuel type..." />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                  <SelectItem value="Electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mileage */}
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Mileage (km)
              </label>
              <input
                type="number"
                min="0"
                value={mileage}
                onChange={e => setMileage(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g. 64000"
                className="input-class h-11 w-full font-medium text-gray-900"
              />
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Vehicle Condition
              </label>
              <Select value={condition || undefined} onValueChange={setCondition}>
                <SelectTrigger className="input-class h-11 w-full flex items-center justify-between font-medium">
                  <SelectValue placeholder="Select condition..." />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                  <SelectItem value="New">Brand New</SelectItem>
                  <SelectItem value="Foreign Used">Foreign Used (Direct Import)</SelectItem>
                  <SelectItem value="Locally Used">Locally Used</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chassis Number (VIN) */}
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Chassis Number (VIN)
              </label>
              <input
                type="text"
                value={chassisNo}
                onChange={e => setChassisNo(e.target.value.toUpperCase())}
                placeholder="e.g. JTEBU5JR8K..."
                className="input-class h-11 w-full uppercase tracking-wider text-gray-900 font-semibold"
              />
            </div>

            {/* Engine Number */}
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Engine Number
              </label>
              <input
                type="text"
                value={engineNo}
                onChange={e => setEngineNo(e.target.value.toUpperCase())}
                placeholder="e.g. 2TR-FE1234..."
                className="input-class h-11 w-full uppercase tracking-wider text-gray-900 font-semibold"
              />
            </div>
          </div>
        </section>
        <br />
        <br />

        {/* ── CARD 3: Pricing & Acquisition Particulars ── */}
        <section className="rounded-2xl relative min-h-max w-full">
          <div className="flex items-center gap-3.5 pb-5 mb-6 relative left-3 top-3">
            <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/60 shadow-xs">
              <DollarSign className="size-5" />
            </div>
            <div>
              <h2 className="text-16 font-bold text-gray-900 tracking-tight">Pricing & Acquisition</h2>
              <p className="text-12 text-gray-500 font-medium">Purchase cost, retail sale price, and date acquired</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative left-3 top-4 right-3">
            {/* Purchase Price */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                  Purchase Price <span className="text-red-500">*</span>
                </label>
                {purchasePrice !== "" && (
                  <span className="text-10 text-gray-400">
                    KSH {Number(purchasePrice).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="relative input-class">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-13 font-bold text-gray-700 select-none">
                  Ksh
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value ? Number(e.target.value) : "")}
                  placeholder="0.00"
                  className="pl-14 font-bold relative left-8 text-gray-900"
                />
              </div>
            </div>

            {/* Sale Price */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-12 font-bold text-blue-900 uppercase tracking-wider block">
                  Sale / Cash Price <span className="text-red-500">*</span>
                </label>
                {salePrice !== "" && (
                  <span className="text-10 text-blue-600 font-semibold">
                    KSH {Number(salePrice).toLocaleString()}
                  </span>
                )}
              </div>
              <div className="relative input-class border-blue-200 focus:border-blue-500">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-13 font-bold text-blue-500 select-none">
                  Ksh
                </span>
                <input
                  type="number"
                  required
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value ? Number(e.target.value) : "")}
                  placeholder="0.00"
                  className="font-bold text-blue-900 relative left-8 bg-blue-50/20 border-blue-200 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Purchase Date */}
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Purchase / Acquired Date
              </label>
              <DatePickerInput
                value={purchaseDate}
                onChange={setPurchaseDate}
                placeholder="Select acquired date"
              />
            </div>
          </div>
        </section>
        <br />
        <br />

        {/* ── CARD 4: Website Showcase & Online Marketing ── */}
        <section className="rounded-2xl relative min-h-max w-full">
          <div className="flex items-center gap-3.5 pb-5 mb-6 relative left-3 top-3">
            <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/60 shadow-xs">
              <Globe className="size-5" />
            </div>
            <div>
              <h2 className="text-16 font-bold text-gray-900 tracking-tight">Website Listing & Marketing</h2>
              <p className="text-12 text-gray-500 font-medium">Public visibility, rental availability, and featured status</p>
            </div>
          </div>

          {/* Marketing Toggle Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative left-3 top-4 right-3">
            {/* Publish Toggle Tile */}
            <div
              onClick={() => setIsPublished(!isPublished)}
              className={`cursor-pointer rounded-xl p-4 border transition-all flex items-start gap-6 select-none ${isPublished
                ? 'bg-blue-50/70 border-blue-200/90 shadow-xs ring-1 ring-blue-500/10'
                : 'bg-gray-50/60 border-gray-200 hover:bg-gray-100/60'
                }`}
            >
              <input
                type="checkbox"
                id="isPublished"
                checked={isPublished}
                onChange={() => { }}
                className="mt-5 size-4 relative top-2.5 left-2.5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 cursor-pointer pointer-events-none"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-14 font-bold text-gray-900">Publish to Website</span>
                  <span className={`text-[10px] badge badge-secondary relative right-3 top-2 px-2 py-0.5 rounded-full uppercase tracking-wider ${isPublished ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                    {isPublished ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <p className="text-12 text-gray-500 mt-1">Make visible to public customers in online inventory</p>
              </div>
            </div>

            {/* New Arrival Toggle Tile */}
            <div
              onClick={() => setIsNewArrival(!isNewArrival)}
              className={`cursor-pointer rounded-xl p-4 border transition-all flex items-start gap-6 select-none ${isNewArrival
                ? 'bg-amber-50/70 border-amber-200/90 shadow-xs ring-1 ring-amber-500/10'
                : 'bg-gray-50/60 border-gray-200 hover:bg-gray-100/60'
                }`}
            >
              <input
                type="checkbox"
                id="isNewArrival"
                checked={isNewArrival}
                onChange={() => { }}
                className="mt-1 size-4 relative top-2.5 left-2.5 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer pointer-events-none"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-14 font-bold text-gray-900">Mark as New Arrival</span>
                  <span className={`text-[10px] badge badge-secondary relative right-3 top-2 px-2 py-0.5 rounded-full uppercase tracking-wider ${isNewArrival ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                    {isNewArrival ? 'Featured' : 'Standard'}
                  </span>
                </div>
                <p className="text-12 text-gray-500 mt-1">New Arrival badge</p>
              </div>
            </div>

            {/* Available for Hire Toggle Tile 
            <div
              onClick={() => setForHire(!forHire)}
              className={`cursor-pointer rounded-xl p-4 border transition-all flex items-start gap-3.5 select-none ${forHire
                ? 'bg-emerald-50/70 border-emerald-200/90 shadow-xs ring-1 ring-emerald-500/10'
                : 'bg-gray-50/60 border-gray-200 hover:bg-gray-100/60'
                }`}
            >
              <input
                type="checkbox"
                id="forHire"
                checked={forHire}
                onChange={() => { }}
                className="mt-1 size-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer pointer-events-none"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-14 font-bold text-gray-900">Available for Hire</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${forHire ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                    {forHire ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-12 text-gray-500 mt-1">Allow clients to book this car for short or long-term hire</p>
              </div>
            </div>
            */}
          </div>

          {/* Conditional Hire Rates Section */}
          {/*
          {forHire && (
            <div className="mb-6 p-5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 animate-fade-in space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-13">
                <Clock className="size-4" />
                <span>Car Hire & Rental Pricing Particulars</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-12 font-bold text-emerald-900 uppercase tracking-wider block">
                      Daily Hire Rate (KES)
                    </label>
                    {hirePrice !== "" && (
                      <span className="text-11 font-mono text-emerald-700 font-semibold">
                        KES {Number(hirePrice).toLocaleString()} / day
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-13 font-bold text-emerald-600 select-none">
                      KES
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={hirePrice}
                      onChange={e => setHirePrice(e.target.value ? Number(e.target.value) : "")}
                      placeholder="e.g. 5000"
                      className="input-class h-11 w-full pl-14 font-mono font-bold text-emerald-950 bg-white border-emerald-200 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-12 font-bold text-emerald-900 uppercase tracking-wider block">
                      Weekly Hire Rate (KES)
                    </label>
                    {hirePriceWeekly !== "" && (
                      <span className="text-11 font-mono text-emerald-700 font-semibold">
                        KES {Number(hirePriceWeekly).toLocaleString()} / week
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-13 font-bold text-emerald-600 select-none">
                      KES
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={hirePriceWeekly}
                      onChange={e => setHirePriceWeekly(e.target.value ? Number(e.target.value) : "")}
                      placeholder="e.g. 30000"
                      className="input-class h-11 w-full pl-14 font-mono font-bold text-emerald-950 bg-white border-emerald-200 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          */}
          <br />
          <br />
          {/* Description & Features */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Public Marketing Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Highlight vehicle condition, executive specs, maintenance history, and selling points for website visitors..."
                className="input-class w-full p-3.5 text-14 leading-relaxed resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                Features & Equipment Highlights
              </label>
              <textarea
                rows={3}
                value={featuresText}
                onChange={e => setFeaturesText(e.target.value)}
                placeholder="e.g. Leather Seats, Sunroof, Reverse Camera, Push Start, Alloy Wheels, Android Auto"
                className="input-class w-full p-3.5 text-14 resize-none"
              />
              <p className="text-11 text-gray-500">
                <strong>Note:</strong> Separate items with commas. Each feature will display as an individual badge on the website showroom.
              </p>

              {/* Live Tag Previews */}
              {featuresText.trim().length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {featuresText
                    .split(",")
                    .map(f => f.trim())
                    .filter(f => f.length > 0)
                    .map((feature, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-12 font-semibold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs"
                      >
                        <Sparkles className="size-3 text-blue-500" />
                        {feature}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        </section>
        <br />

        {/* ── CARD 5: Vehicle Photo Gallery ── */}
        <section className="max-w-5xl mx-auto items-center justify-center h-[250px] bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 md:p-8 transition-shadow hover:shadow-sm">
          <div className="flex items-center gap-3.5 pb-5 mb-6 relative left-3 top-3">
            <div className="size-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100/60 shadow-xs">
              <Camera className="size-5" />
            </div>
            <div>
              <h2 className="text-16 font-bold text-gray-900 tracking-tight">Vehicle Photo Gallery</h2>
              <p className="text-12 text-gray-500 font-medium">Upload exterior and interior photos (Max 6 display images, 10MB each)</p>
            </div>
          </div>
          <div className="p-4 relative left-10 start-5 top-5 max-w-4xl items-center justify-center">
            <MultiFileUpload
              maxFiles={6}
              maxSizeMB={10}
              existingUrls={existingImages}
              onExistingUrlsChange={setExistingImages}
              onFilesSelect={(files) => {
                const compressImage = (file: File): Promise<string> => {
                  return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const img = new window.Image();
                      img.onload = () => {
                        const canvas = document.createElement("canvas");
                        const MAX_WIDTH = 1200;
                        const MAX_HEIGHT = 1200;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                          if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                          }
                        } else {
                          if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                          }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d");
                        ctx?.drawImage(img, 0, 0, width, height);

                        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                        resolve(dataUrl);
                      };
                      img.src = event.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                  });
                };

                const compressors = files.map(file => compressImage(file));
                Promise.all(compressors).then(results => {
                  setImages(results);
                });
              }}
              label="Upload Display Pictures"
              description="Drag & drop or browse photos to showcase this vehicle"
              className="cursor-pointer "
            />
          </div>
        </section>
        <br />

        {/* ── STICKY BOTTOM ACTION BAR ── */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md h-14 rounded-2xl border border-gray-200/90 shadow-lg p-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-13 text-gray-600 font-medium relative left-3">
            <span className="hidden sm:inline">Editing:</span>
            <span className="font-bold text-gray-900 px-2.5 py-1 rounded-lg">
              {registrationNo || vehicle.registration_no}
            </span>
            <span className="text-gray-400 hidden md:inline">•</span>
            <span className="text-gray-600 font-semibold hidden md:inline truncate max-w-xs">
              {makeModel || vehicle.make_model}
            </span>
          </div>

          <div className="flex items-center gap-3 relative end-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-9 px-6 badge badge-primary text-13 font-bold rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-2xs"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-8 text-13 badge badge-primary font-semibold rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm transition-all flex items-center justify-center"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <span>Save Changes</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
