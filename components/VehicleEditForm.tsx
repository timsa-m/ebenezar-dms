'use client';

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Car,
  Tag,
  DollarSign,
  Globe,
  Sparkles,
  Camera,
  ArrowRight,
  Loader2,
  Plus,
  Trash2,
  Star,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";
import { updateVehicleFormData } from "@/lib/actions/vehicle.actions";
import type { Vehicle } from "@/src/types/database.types";
import { toast } from '@/lib/toast';
import { getVehicleAssetPublicUrl } from "@/lib/storage-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DatePickerInput from "@/components/ui/DatePickerInput";

const formatNumberWithCommas = (val: string | number | null | undefined): string => {
  if (val === null || val === undefined || val === "") return "";
  const str = String(val).replace(/,/g, "").trim();
  if (!str) return "";

  const hasTrailingDot = str.endsWith(".");
  const parts = str.split(".");
  const intPart = (parts[0] || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (hasTrailingDot) {
    return `${intPart || "0"}.`;
  }
  if (parts.length > 1) {
    return `${intPart || "0"}.${parts[1].slice(0, 2)}`;
  }
  return intPart;
};

const parseCommaNumber = (val: string | number | null | undefined): number | "" => {
  if (val === null || val === undefined || val === "") return "";
  const clean = String(val).replace(/,/g, "").trim();
  if (clean === "" || isNaN(Number(clean))) return "";
  return Number(clean);
};

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
  const [purchasePrice, setPurchasePrice] = useState<string>(
    vehicle.purchase_price !== null && vehicle.purchase_price !== undefined
      ? formatNumberWithCommas(vehicle.purchase_price)
      : ""
  );
  const [salePrice, setSalePrice] = useState<string>(
    vehicle.sale_price !== null && vehicle.sale_price !== undefined
      ? formatNumberWithCommas(vehicle.sale_price)
      : ""
  );
  const [purchaseDate, setPurchaseDate] = useState(vehicle.date_purchased ? vehicle.date_purchased.split('T')[0] : "");

  const handlePriceChange = (
    rawVal: string,
    setter: (val: string) => void
  ) => {
    const clean = rawVal.replace(/[^0-9.]/g, "");
    if (clean === "") {
      setter("");
      return;
    }
    const parts = clean.split(".");
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : clean;
    setter(formatNumberWithCommas(sanitized));
  };

  // Website & Online Display
  const [isPublished, setIsPublished] = useState(vehicle.is_published ?? true);
  const [isNewArrival, setIsNewArrival] = useState(vehicle.is_new_arrival ?? false);
  const [forHire, setForHire] = useState(vehicle.for_hire ?? false);
  const [hirePrice, setHirePrice] = useState<number | "">(vehicle.hire_price ?? "");
  const [hirePriceWeekly, setHirePriceWeekly] = useState<number | "">(vehicle.hire_price_weekly ?? "");
  const [description, setDescription] = useState(vehicle.description || "");
  const [featuresText, setFeaturesText] = useState((vehicle.features || []).join(", "));

  // Gallery images (URLs)
  const [existingImages, setExistingImages] = useState<string[]>(vehicle.images || []);

  // Uploading state with loading percentage
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const [isDragOverGallery, setIsDragOverGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1400;
          const MAX_HEIGHT = 1400;
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

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Image compression failed"));
            },
            "image/jpeg",
            0.85
          );
        };
        img.onerror = () => reject(new Error("Failed to load image for compression"));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });
  };

  const uploadSingleFileWithProgress = (
    blob: Blob,
    fileName: string,
    onProgress: (percent: number) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload/vehicle-photo");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.publicUrl) {
              resolve(data.publicUrl);
            } else if (data.path) {
              const pubUrl = getVehicleAssetPublicUrl(data.path);
              resolve(pubUrl);
            } else {
              reject(new Error("No valid image URL returned from upload server"));
            }
          } catch {
            reject(new Error("Invalid upload response format"));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.error || `Upload failed (Status ${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error during photo upload"));

      const formData = new FormData();
      formData.append("file", blob, fileName);
      formData.append("vehicleId", vehicle.id);
      xhr.send(formData);
    });
  };

  const handleFilesChosen = async (filesToProcess: File[]) => {
    if (!filesToProcess || filesToProcess.length === 0) return;

    const currentCount = existingImages.length;
    const availableSlots = 6 - currentCount;

    if (availableSlots <= 0) {
      toast.error("Maximum 6 photos reached. Remove an existing photo to upload more.");
      return;
    }

    const filesToUpload = filesToProcess.slice(0, availableSlots);
    if (filesToProcess.length > availableSlots) {
      toast.info(`Only ${availableSlots} more photo${availableSlots === 1 ? '' : 's'} can be added (maximum 6).`);
    }

    setIsUploading(true);
    setUploadProgress(1);
    setUploadStatusText(`Preparing ${filesToUpload.length} photo${filesToUpload.length > 1 ? 's' : ''}...`);

    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadStatusText(`Compressing photo ${i + 1} of ${filesToUpload.length}...`);

        let uploadBlob: Blob;
        try {
          uploadBlob = await compressImage(file);
        } catch {
          uploadBlob = file;
        }

        const safeFileName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, "_") : `photo-${Date.now()}.jpg`;
        setUploadStatusText(`Uploading photo ${i + 1} of ${filesToUpload.length}...`);

        const url = await uploadSingleFileWithProgress(uploadBlob, safeFileName, (filePercent) => {
          const basePercent = (i / filesToUpload.length) * 100;
          const slicePercent = (filePercent / filesToUpload.length);
          const totalProgress = Math.min(99, Math.round(basePercent + slicePercent));
          setUploadProgress(totalProgress);
        });

        uploadedUrls.push(url);
      }

      setUploadProgress(100);
      setUploadStatusText("All photos uploaded successfully!");
      setExistingImages((prev) => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} uploaded`);
    } catch (err: any) {
      console.error("[VehicleEditForm] Upload error:", err);
      toast.error(err?.message || "Failed to upload photo");
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatusText("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 700);
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setExistingImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    toast.info("Photo removed from gallery");
  };

  const makeCoverPhoto = (indexToCover: number) => {
    if (indexToCover === 0) return;
    setExistingImages((prev) => {
      const target = prev[indexToCover];
      const rest = prev.filter((_, idx) => idx !== indexToCover);
      return [target, ...rest];
    });
    toast.success("Cover photo updated");
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesChosen(Array.from(e.target.files));
    }
  };

  const handleGalleryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverGallery(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (validFiles.length > 0) {
        handleFilesChosen(validFiles);
      } else {
        toast.error("Please drop valid image files (JPG, PNG, WEBP)");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isUploading) {
      toast.warning("Please wait for photos to finish uploading.");
      return;
    }

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
        purchasePrice: parseCommaNumber(purchasePrice) !== "" ? Number(parseCommaNumber(purchasePrice)) : 0,
        salePrice: parseCommaNumber(salePrice) !== "" ? Number(parseCommaNumber(salePrice)) : 0,
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

  const emptySlotsCount = Math.max(0, 6 - existingImages.length);

  return (
    <div className="w-full max-w-7xl mx-auto pb-16">
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── CARD 1: Core Identification ── */}
        <section className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 md:p-8 space-y-6 transition-shadow hover:shadow-sm">
          <div className="flex items-center gap-3.5 pb-5 border-b border-gray-100">
            <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60 shadow-xs">
              <Car className="size-5" />
            </div>
            <div>
              <h2 className="text-16 font-bold text-gray-900 tracking-tight">Core Information</h2>
              <p className="text-12 text-gray-500 font-medium">Essential registration, make, model, and classification</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                className="input-class h-11 w-full uppercase tracking-wider font-bold text-gray-900 dark:text-[#F4F7F4]"
              />
            </div>

            {/* Make & Model */}
            <div className="space-y-1.5">
              <label className="text-12 font-bold text-gray-700 dark:text-[#C1CBC3] uppercase tracking-wider block">
                Make & Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={makeModel}
                onChange={e => setMakeModel(e.target.value)}
                placeholder="e.g. Toyota Prado TX L-Package"
                className="input-class h-11 w-full font-medium text-gray-900 dark:text-[#F4F7F4]"
              />
            </div>

            {/* Vehicle Type */}
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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

        {/* ── CARD 2: Technical Specifications & Identifiers ── */}
        <section className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 md:p-8 space-y-6 transition-shadow hover:shadow-sm">
          <div className="flex items-center gap-3.5 pb-5 border-b border-gray-100">
            <div className="size-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/60 shadow-xs">
              <Tag className="size-5" />
            </div>
            <div>
              <h2 className="text-16 font-bold text-gray-900 tracking-tight">Technical Specifications & Identifiers</h2>
              <p className="text-12 text-gray-500 font-medium">Engine, transmission, fuel, mileage, and VIN details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* ── CARD 3: Pricing & Acquisition Particulars ── */}
        <section className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 md:p-8 space-y-6 transition-shadow hover:shadow-sm">
          <div className="flex items-center gap-3.5 pb-5 border-b border-gray-100">
            <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/60 shadow-xs">
              <DollarSign className="size-5" />
            </div>
            <div>
              <h2 className="text-16 font-bold text-gray-900 tracking-tight">Pricing & Acquisition</h2>
              <p className="text-12 text-gray-500 font-medium">Purchase cost, retail sale price, and date acquired</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Purchase Price */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-12 font-bold text-gray-700 uppercase tracking-wider block">
                  Purchase Price <span className="text-red-500">*</span>
                </label>
                {purchasePrice !== "" && (
                  <span className="text-10 text-gray-400 font-semibold">
                    KSH {purchasePrice}
                  </span>
                )}
              </div>
              <div className="flex items-center h-11 w-full rounded-xl border border-gray-200 bg-white shadow-2xs transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 overflow-hidden">
                <div className="flex items-center justify-center h-full px-3.5 bg-gray-50 border-r border-gray-200 text-gray-600 font-bold text-13 select-none shrink-0">
                  Ksh
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={purchasePrice}
                  onChange={e => handlePriceChange(e.target.value, setPurchasePrice)}
                  placeholder="0"
                  className="h-full w-full px-3.5 font-bold text-gray-900 bg-transparent text-14 outline-none placeholder:text-gray-400 placeholder:font-normal"
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
                    KSH {salePrice}
                  </span>
                )}
              </div>
              <div className="flex items-center h-11 w-full rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 overflow-hidden">
                <div className="flex items-center justify-center h-full px-3.5 bg-blue-100/60 border-r border-blue-200 text-blue-700 font-bold text-13 select-none shrink-0">
                  Ksh
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={salePrice}
                  onChange={e => handlePriceChange(e.target.value, setSalePrice)}
                  placeholder="0"
                  className="h-full w-full px-3.5 font-bold text-blue-900 bg-transparent text-14 outline-none placeholder:text-blue-300 placeholder:font-normal"
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

        {/* ── CARD 4: Website Showcase & Online Marketing ── */}
        <section className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 md:p-8 space-y-6 transition-shadow hover:shadow-sm">
          <div className="flex items-center gap-3.5 pb-5 border-b border-gray-100">
            <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/60 shadow-xs">
              <Globe className="size-5" />
            </div>
            <div>
              <h2 className="text-16 font-bold text-gray-900 tracking-tight">Website Listing & Marketing</h2>
              <p className="text-12 text-gray-500 font-medium">Public visibility, rental availability, and featured status</p>
            </div>
          </div>

          {/* Marketing Toggle Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Publish Toggle Tile */}
            <div
              onClick={() => setIsPublished(!isPublished)}
              className={`cursor-pointer rounded-xl p-4 border transition-all flex items-start gap-3.5 select-none ${isPublished
                ? 'bg-blue-50/70 border-blue-200/90 shadow-xs ring-1 ring-blue-500/10'
                : 'bg-gray-50/60 border-gray-200 hover:bg-gray-100/60'
                }`}
            >
              <input
                type="checkbox"
                id="isPublished"
                checked={isPublished}
                onChange={() => { }}
                className="mt-1 size-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer pointer-events-none"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-14 font-bold text-gray-900">Publish to Website</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isPublished ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
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
              className={`cursor-pointer rounded-xl p-4 border transition-all flex items-start gap-3.5 select-none ${isNewArrival
                ? 'bg-amber-50/70 border-amber-200/90 shadow-xs ring-1 ring-amber-500/10'
                : 'bg-gray-50/60 border-gray-200 hover:bg-gray-100/60'
                }`}
            >
              <input
                type="checkbox"
                id="isNewArrival"
                checked={isNewArrival}
                onChange={() => { }}
                className="mt-1 size-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer pointer-events-none"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-14 font-bold text-gray-900">Mark as New Arrival</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isNewArrival ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                    {isNewArrival ? 'Featured' : 'Standard'}
                  </span>
                </div>
                <p className="text-12 text-gray-500 mt-1">Highlights car in showroom with a New Arrival badge</p>
              </div>
            </div>
          </div>

          {/* Description & Features */}
          <div className="space-y-6 pt-2">
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

        {/* ── CARD 5: Vehicle Photo Gallery ── */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOverGallery(true);
          }}
          onDragLeave={() => setIsDragOverGallery(false)}
          onDrop={handleGalleryDrop}
          className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs p-6 md:p-8 space-y-6 ${isDragOverGallery
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10'
            : 'border-gray-200/80 hover:shadow-sm'
            }`}
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100">
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100/60 shadow-xs">
                <Camera className="size-5" />
              </div>
              <div>
                <h2 className="text-16 font-bold text-gray-900 tracking-tight">Vehicle Photo Gallery</h2>
                <p className="text-12 text-gray-500 font-medium">
                  Upload exterior and interior photos (Max 6 display images, 10MB each)
                </p>
              </div>
            </div>

            {/* Gallery Counter Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span
                className={`text-12 font-bold px-3 py-1 rounded-full border ${existingImages.length === 6
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
              >
                {existingImages.length} of 6 Photos
              </span>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            id="vehicle-gallery-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            disabled={isUploading || existingImages.length >= 6}
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Upload Progress Bar with Percentage */}
          {isUploading && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-13 font-semibold text-blue-900">
                  <Loader2 className="size-4 animate-spin text-blue-600" />
                  <span>{uploadStatusText || `Uploading photos...`}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-13 font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-md shadow-2xs">
                  <span>{uploadProgress}%</span>
                </div>
              </div>
              <div className="w-full bg-blue-100/80 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Unified 6-Slot Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Render Existing Images */}
            {existingImages.map((url, idx) => (
              <div
                key={`gallery-img-${idx}`}
                className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-2xs transition-all hover:shadow-md hover:border-gray-300"
              >
                <Image
                  src={url}
                  alt={`Vehicle view ${idx + 1}`}
                  fill
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Primary Cover Badge or Number Pill */}
                {idx === 0 ? (
                  <span className="absolute top-2 left-2 bg-blue-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs flex items-center gap-1">
                    <Star className="size-2.5 fill-white" />
                    Cover
                  </span>
                ) : (
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs">
                    #{idx + 1}
                  </span>
                )}

                {/* Top-Right Delete Button */}
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-2 right-2 size-7 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 hover:bg-red-700 active:scale-95 flex items-center justify-center transition-all shadow-md"
                  title="Remove this photo"
                >
                  <Trash2 className="size-3.5" />
                </button>

                {/* Set as Cover button for non-cover images */}
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => makeCoverPhoto(idx)}
                    className="absolute bottom-2 inset-x-2 py-1 px-2 text-[10px] font-bold text-gray-800 bg-white/95 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white hover:text-blue-600 shadow-sm transition-all flex items-center justify-center gap-1 backdrop-blur-xs"
                    title="Make primary showroom cover photo"
                  >
                    <Star className="size-3 text-amber-500" />
                    Set as Cover
                  </button>
                )}
              </div>
            ))}

            {/* Option to Add More Photos when less than 6 */}
            {emptySlotsCount > 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="relative aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 bg-gray-50/70 hover:bg-blue-50/40 flex flex-col items-center justify-center cursor-pointer transition-all gap-1.5 p-3 text-center group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="size-9 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-500 group-hover:text-blue-600 group-hover:border-blue-300 group-hover:scale-110 transition-all">
                  <Plus className="size-4" />
                </div>
                <span className="text-12 font-bold text-gray-700 group-hover:text-blue-600">
                  Add Photo
                </span>
                <span className="text-10 text-gray-400 font-medium">
                  {emptySlotsCount} slot{emptySlotsCount === 1 ? '' : 's'} left
                </span>
              </button>
            )}

            {/* Empty Outline Placeholders for remaining slots */}
            {emptySlotsCount > 1 &&
              Array.from({ length: emptySlotsCount - 1 }).map((_, slotIdx) => {
                const absoluteSlotNumber = existingImages.length + 2 + slotIdx;
                return (
                  <div
                    key={`placeholder-${slotIdx}`}
                    onClick={() => fileInputRef.current?.click()}
                    className="relative aspect-square rounded-xl border border-dashed border-gray-200 bg-gray-50/30 hover:border-gray-300 hover:bg-gray-50/60 flex flex-col items-center justify-center p-3 text-center transition-colors cursor-pointer group"
                    title="Click to add photos"
                  >
                    <div className="size-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:text-gray-600 transition-colors">
                      <Camera className="size-3.5" />
                    </div>
                    <span className="text-10 text-gray-400 font-medium mt-1.5 group-hover:text-gray-600">
                      Slot {absoluteSlotNumber}
                    </span>
                  </div>
                );
              })}
          </div>

          {/* Helper Footnote */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-12 text-gray-500 border-t border-gray-100">
            <p>
              <strong>Tip:</strong> The first photo will be used as the primary showroom cover image. Hover any photo to set as cover or delete.
            </p>
            {existingImages.length === 6 && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-md">
                <CheckCircle2 className="size-3.5" />
                All 6 slots filled
              </span>
            )}
          </div>
        </section>

        {/* ── STICKY BOTTOM ACTION BAR ── */}
        <div className="sticky bottom-4 z-20 bg-white/95 dark:bg-[#151D17]/95 backdrop-blur-md h-16 rounded-2xl border border-gray-200/90 dark:border-[#29352D] shadow-lg px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-13 text-gray-600 dark:text-[#A1ADA4] font-medium min-w-0">
            <span className="hidden sm:inline">Editing:</span>
            <span className="font-bold text-gray-900 dark:text-[#F4F7F4] bg-gray-100 dark:bg-[#18221A] border border-gray-200 dark:border-[#29352D] px-2.5 py-1 rounded-lg">
              {registrationNo || vehicle.registration_no}
            </span>
            <span className="text-gray-400 dark:text-[#5d6f62] hidden md:inline">•</span>
            <span className="text-gray-600 dark:text-[#C1CBC3] font-semibold hidden md:inline truncate max-w-xs">
              {makeModel || vehicle.make_model}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-10 px-6 text-13 font-bold rounded-xl border border-gray-200 dark:border-[#29352D] text-gray-700 dark:text-[#C1CBC3] bg-white dark:bg-[#18221A] hover:bg-gray-50 dark:hover:bg-[#1D2920] active:bg-gray-100 transition-colors shadow-2xs cursor-pointer"
              disabled={isPending || isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-8 text-13 font-semibold rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-[#B7FF3C] dark:hover:bg-[#c9ff66] text-white dark:text-[#090C0A] shadow-sm transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
              disabled={isPending || isUploading}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Uploading ({uploadProgress}%)...</span>
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
