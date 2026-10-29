'use client';

import HeaderBox from "@/components/HeaderBox";
import { addVehicle } from "@/lib/actions/vehicle.actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Car,
  Settings,
  Hash,
  DollarSign,
  AlertCircle,
  Loader2,
  Camera,
  Info,
  User,
  FileText,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import MultiFileUpload from "@/components/MultiFileUpload";
import { toast } from '@/lib/toast';

export default function CreateVehiclePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadStep, setUploadStep] = useState<"idle" | "uploading" | "saving">("idle");
  const [recordPurchaseAgreement, setRecordPurchaseAgreement] = useState(true);

  // Dynamic pricing calculations for purchase agreement
  const [purchasePriceVal, setPurchasePriceVal] = useState<string>("");
  const [amountPaidVal, setAmountPaidVal] = useState<string>("");

  const calculatedBalance = Math.max(
    0,
    (Number(purchasePriceVal) || 0) - (amountPaidVal !== "" ? Number(amountPaidVal) || 0 : Number(purchasePriceVal) || 0)
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const tempId = crypto.randomUUID();

    startTransition(async () => {
      try {
        const uploadedPaths: string[] = [];

        if (photoFiles.length > 0) {
          setUploadStep("uploading");
          
          for (const file of photoFiles) {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("vehicleId", tempId);
            
            const res = await fetch("/api/upload/vehicle-photo", {
              method: "POST",
              body: fd,
            });
            
            if (res.ok) {
              const json = await res.json();
              uploadedPaths.push(json.path);
            } else {
              const json = await res.json().catch(() => ({}));
              throw new Error(json.error ?? "Photo upload failed");
            }
          }
          setUploadStep("saving");
        }

        const purchasePrice = Number(formData.get("purchasePrice")) || 0;
        const sellerName = (formData.get("sellerName") as string)?.trim();

        const vehiclePayload: any = {
          registrationNo: (formData.get("registrationNo") as string)?.trim().toUpperCase(),
          makeModel: (formData.get("makeModel") as string)?.trim().toUpperCase(),
          type: (formData.get("type") as string)?.trim().toUpperCase(),
          year: formData.get("year") ? Number(formData.get("year")) : undefined,
          color: (formData.get("color") as string)?.trim().toUpperCase(),
          mileage: formData.get("mileage") ? Number(formData.get("mileage")) : undefined,
          engineCapacity: (formData.get("engineCapacity") as string)?.trim(),
          chassisNo: (formData.get("chassisNo") as string)?.trim().toUpperCase(),
          engineNo: (formData.get("engineNo") as string)?.trim().toUpperCase(),
          transmission: (formData.get("transmission") as string) || "Automatic",
          fuelType: (formData.get("fuelType") as string) || "Petrol",
          purchasePrice,
          salePrice: Number(formData.get("salePrice")) || 0,
          images: uploadedPaths.length > 0 ? uploadedPaths : undefined,
        };

        if (recordPurchaseAgreement && sellerName) {
          const amountPaid = formData.get("amountPaid")
            ? Number(formData.get("amountPaid"))
            : purchasePrice;

          vehiclePayload.sellerName = sellerName.toUpperCase();
          vehiclePayload.sellerIdNumber = (formData.get("sellerIdNumber") as string)?.trim().toUpperCase();
          vehiclePayload.sellerPhone = (formData.get("sellerPhone") as string)?.trim();
          vehiclePayload.sellerAddress = (formData.get("sellerAddress") as string)?.trim().toUpperCase();
          vehiclePayload.sellerPoBox = (formData.get("sellerPoBox") as string)?.trim().toUpperCase();
          vehiclePayload.sellerOccupation = (formData.get("sellerOccupation") as string)?.trim().toUpperCase() || "BUSINESS";
          vehiclePayload.amountPaid = amountPaid;
          vehiclePayload.balance = Math.max(0, purchasePrice - amountPaid);
          vehiclePayload.paymentMethod = (formData.get("paymentMethod") as string) || "Bank Transfer";
          vehiclePayload.sellerWitnessName = (formData.get("sellerWitnessName") as string)?.trim().toUpperCase();
          vehiclePayload.sellerWitnessId = (formData.get("sellerWitnessId") as string)?.trim();
          vehiclePayload.sellerWitnessPhone = (formData.get("sellerWitnessPhone") as string)?.trim();
          vehiclePayload.buyerWitnessName = (formData.get("buyerWitnessName") as string)?.trim().toUpperCase() || "GEORGE DOLA ANDERE";
          vehiclePayload.specialNotes = (formData.get("specialNotes") as string)?.trim();
        }

        const result = await addVehicle(vehiclePayload);

        setUploadStep("idle");
        if (result && result.success) {
          if (recordPurchaseAgreement && sellerName && result.vehicle?.id) {
            toast.success("Vehicle registered and Purchase Agreement generated successfully!");
            router.push(`/vehicles/${result.vehicle.id}/purchase-contract`);
          } else {
            toast.success("Vehicle successfully added to inventory!");
            router.push("/vehicles");
          }
          router.refresh();
        } else {
          setError(result.error || "Failed to add vehicle. Please try again.");
          toast.error("Failed to add vehicle.");
        }
      } catch (err: any) {
        setUploadStep("idle");
        setError(err?.message || "An unexpected error occurred.");
        toast.error(err?.message || "An unexpected error occurred.");
      }
    });
  };

  const isLoading = isPending || uploadStep !== "idle";

  return (
    <section className="home-content">
      <header className="mb-6">
        <HeaderBox
          title="Vehicle Purchase & Intake"
          subtext="Register a new vehicle acquisition into yard inventory and generate its official Purchase Agreement."
        />
      </header>

      <section className="flex-1">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 max-w-5xl">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-14 font-semibold text-red-700">Failed to Add Vehicle</p>
                <p className="text-13 text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Fields Column */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              {/* Basic Details Section */}
              <div className="card-premium p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/5 rounded-lg text-primary">
                    <Car className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Vehicle Identity</h3>
                    <p className="text-xs text-gray-500">Core vehicle specifications and registration details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Hash className="size-3.5" />
                      Registration Number
                    </label>
                    <input
                      type="text"
                      name="registrationNo"
                      required
                      placeholder="e.g. KDP 123X"
                      className="input-class uppercase font-mono"
                      style={{ textTransform: 'uppercase' }}
                      onInput={(e) => {
                        e.currentTarget.value = e.currentTarget.value.toUpperCase();
                      }}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Info className="size-3.5" />
                      Make & Model
                    </label>
                    <input
                      type="text"
                      name="makeModel"
                      required
                      placeholder="e.g. TOYOTA PRADO"
                      className="input-class uppercase"
                      style={{ textTransform: 'uppercase' }}
                      onInput={(e) => {
                        e.currentTarget.value = e.currentTarget.value.toUpperCase();
                      }}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Type / Body</label>
                    <input
                      type="text"
                      name="type"
                      placeholder="e.g. SUV, SALOON, STATION WAGON"
                      className="input-class uppercase"
                      style={{ textTransform: 'uppercase' }}
                      onInput={(e) => {
                        e.currentTarget.value = e.currentTarget.value.toUpperCase();
                      }}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Year</label>
                      <input
                        type="number"
                        name="year"
                        placeholder="e.g. 2018"
                        className="input-class"
                        min="1990"
                        max={new Date().getFullYear() + 1}
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Color</label>
                      <input
                        type="text"
                        name="color"
                        placeholder="e.g. PEARL WHITE"
                        className="input-class uppercase"
                        style={{ textTransform: 'uppercase' }}
                        onInput={(e) => {
                          e.currentTarget.value = e.currentTarget.value.toUpperCase();
                        }}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical & Pricing Section */}
              <div className="card-premium p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/5 rounded-lg text-primary">
                    <Settings className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Technical & Valuation</h3>
                    <p className="text-xs text-gray-500">Chassis, engine numbers, and acquisition pricing</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Mileage (KM)</label>
                    <input type="number" inputMode="numeric" name="mileage" placeholder="e.g. 45000" className="input-class" disabled={isLoading} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Engine Capacity (CC)</label>
                    <input type="text" name="engineCapacity" placeholder="e.g. 2700cc" className="input-class" disabled={isLoading} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Chassis Number</label>
                    <input type="text" name="chassisNo" placeholder="e.g. GDJ150-123456" className="input-class uppercase font-mono" style={{ textTransform: 'uppercase' }} disabled={isLoading} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Engine Number</label>
                    <input type="text" name="engineNo" placeholder="e.g. 1GD-654321" className="input-class uppercase font-mono" style={{ textTransform: 'uppercase' }} disabled={isLoading} />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Transmission</label>
                    <select name="transmission" className="input-class bg-white" disabled={isLoading}>
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Fuel Type</label>
                    <select name="fuelType" className="input-class bg-white" disabled={isLoading}>
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Electric">Electric</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <DollarSign className="size-3.5" />
                      Agreed Purchase Price (KES)
                    </label>
                    <input
                      type="number"
                      name="purchasePrice"
                      required
                      placeholder="e.g. 2500000"
                      value={purchasePriceVal}
                      onChange={(e) => setPurchasePriceVal(e.target.value)}
                      className="input-class font-semibold"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <DollarSign className="size-3.5" />
                      Target Selling Price (KES)
                    </label>
                    <input
                      type="number"
                      name="salePrice"
                      placeholder="e.g. 2900000"
                      className="input-class"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Seller & Purchase Agreement Section */}
              <div className="card-premium p-8 border-2 border-emerald-500/20 bg-emerald-50/10">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600/10 rounded-lg text-emerald-700">
                      <FileText className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-16 font-semibold text-gray-900 tracking-tight flex items-center gap-2">
                        Seller &amp; Purchase Agreement Details
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          Legal Contract
                        </span>
                      </h3>
                      <p className="text-xs text-gray-500">Record vendor identity and automatically generate the Motor Vehicle Purchase Agreement</p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={recordPurchaseAgreement}
                      onChange={(e) => setRecordPurchaseAgreement(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-gray-700">Generate Agreement</span>
                  </label>
                </div>

                {recordPurchaseAgreement ? (
                  <div className="space-y-6">
                    {/* Seller details grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-12 font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                          <User className="size-3.5 text-gray-400" />
                          Seller / Vendor Full Name <span className="text-emerald-700 font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          name="sellerName"
                          required={recordPurchaseAgreement}
                          placeholder="e.g. JOHN OCHIENG KAMAU"
                          className="input-class uppercase"
                          style={{ textTransform: 'uppercase' }}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-12 font-bold text-gray-600 uppercase tracking-widest">
                          National ID / Passport No. <span className="text-emerald-700 font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          name="sellerIdNumber"
                          required={recordPurchaseAgreement}
                          placeholder="e.g. 28472910"
                          className="input-class"
                          disabled={isLoading}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-12 font-bold text-gray-600 uppercase tracking-widest">
                          Phone Number <span className="text-emerald-700 font-bold">*</span>
                        </label>
                        <input
                          type="tel"
                          name="sellerPhone"
                          required={recordPurchaseAgreement}
                          placeholder="e.g. 0712 345 678"
                          className="input-class"
                          disabled={isLoading}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-12 font-bold text-gray-600 uppercase tracking-widest">
                          Vendor Occupation / Entity
                        </label>
                        <input
                          type="text"
                          name="sellerOccupation"
                          placeholder="e.g. BUSINESS PERSON / CIVIL SERVANT"
                          defaultValue="BUSINESS"
                          className="input-class uppercase"
                          style={{ textTransform: 'uppercase' }}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-12 font-bold text-gray-600 uppercase tracking-widest">
                          Physical Address / Location
                        </label>
                        <input
                          type="text"
                          name="sellerAddress"
                          placeholder="e.g. KISUMU, MILIMANI ESTATE"
                          className="input-class uppercase"
                          style={{ textTransform: 'uppercase' }}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-12 font-bold text-gray-600 uppercase tracking-widest">
                          P.O. Box
                        </label>
                        <input
                          type="text"
                          name="sellerPoBox"
                          placeholder="e.g. P.O. BOX 1234 - 40100 KISUMU"
                          className="input-class uppercase"
                          style={{ textTransform: 'uppercase' }}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Payment breakdown */}
                    <div className="p-4 bg-white rounded-xl border border-gray-200/80 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Payment Breakdown &amp; Method
                        </span>
                        <span className="text-xs text-emerald-700 font-semibold">
                          Purchaser: Ebenezar Ent. Car Bazaar
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-gray-500 uppercase">Amount Paid (KES)</label>
                          <input
                            type="number"
                            name="amountPaid"
                            placeholder={purchasePriceVal || "Full or Advance"}
                            value={amountPaidVal}
                            onChange={(e) => setAmountPaidVal(e.target.value)}
                            className="input-class text-sm"
                            disabled={isLoading}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-gray-500 uppercase">Outstanding Balance</label>
                          <div className="h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-semibold text-gray-800 flex items-center">
                            KES {calculatedBalance.toLocaleString()}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-gray-500 uppercase">Payment Method</label>
                          <select name="paymentMethod" className="input-class text-sm bg-white" disabled={isLoading}>
                            <option value="Bank Transfer">Bank Transfer (RTGS / EFT)</option>
                            <option value="M-Pesa">M-Pesa Paybill / Till</option>
                            <option value="Cheque">Bankers Cheque</option>
                            <option value="Cash">Cash at Dealership</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Witnesses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-3 p-4 bg-white rounded-xl border border-gray-200/80">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Vendor's Witness
                        </span>
                        <div className="space-y-2">
                          <input
                            type="text"
                            name="sellerWitnessName"
                            placeholder="Witness Full Name"
                            className="input-class text-xs uppercase"
                            style={{ textTransform: 'uppercase' }}
                            disabled={isLoading}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              name="sellerWitnessId"
                              placeholder="ID Number"
                              className="input-class text-xs"
                              disabled={isLoading}
                            />
                            <input
                              type="tel"
                              name="sellerWitnessPhone"
                              placeholder="Phone Number"
                              className="input-class text-xs"
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 p-4 bg-white rounded-xl border border-gray-200/80">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                          Purchaser's Witness (Ebenezar)
                        </span>
                        <div className="space-y-2">
                          <input
                            type="text"
                            name="buyerWitnessName"
                            defaultValue="GEORGE DOLA ANDERE"
                            placeholder="Purchaser Representative"
                            className="input-class text-xs uppercase font-semibold"
                            style={{ textTransform: 'uppercase' }}
                            disabled={isLoading}
                          />
                          <p className="text-[11px] text-gray-400">
                            Representing Ebenezar Ent. Car Bazaar (P.O. Box 3547-40100, Patel's Ondiek Hwy, Kisumu)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Special notes */}
                    <div className="flex flex-col gap-2">
                      <label className="text-12 font-bold text-gray-600 uppercase tracking-widest">
                        Special Handover Notes &amp; Covenants (Optional)
                      </label>
                      <textarea
                        name="specialNotes"
                        rows={2}
                        placeholder="e.g. Original logbook surrendered; spare keys provided; pending tracker inspection..."
                        className="input-class text-xs resize-none"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic py-2">
                    Purchase Agreement generation disabled. You can always add seller details and generate the agreement later from the vehicle details page.
                  </p>
                )}
              </div>
            </div>
            
            {/* Photo Upload Column */}
            <div className="lg:col-span-1">
              <div className="card-premium p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/5 rounded-lg text-primary">
                    <Camera className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Vehicle Photos</h3>
                    <p className="text-xs text-gray-500">Inventory and condition pictures</p>
                  </div>
                </div>

                <div className="flex-1">
                  <MultiFileUpload
                    onFilesSelect={setPhotoFiles}
                    maxFiles={8}
                    className="mt-2"
                  />
                  <p className="text-12 text-gray-500 mt-4 leading-relaxed">
                    Upload up to 8 high-resolution photos of the vehicle exterior, interior, and dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-2">
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{uploadStep === 'uploading' ? 'Uploading photos…' : 'Saving Vehicle & Purchase…'}</span>
                </>
              ) : (
                <span>{recordPurchaseAgreement ? 'Record Purchase & Generate Contract' : 'Add Vehicle to Yard'}</span>
              )}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
