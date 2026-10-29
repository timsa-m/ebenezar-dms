import React, { useState, useCallback, lazy, Suspense } from "react";
import { ArrowLeft, UploadCloud, X } from "lucide-react";
import { createVehicle, updateVehicle, uploadDirectImage } from "../../services/vehicleApi";
import { invalidateVehicleCache } from "../../services/vehicleCache";

import imageCompression from 'browser-image-compression';

// react-quill-new is a React 19 compatible fork (no findDOMNode)
const ReactQuill = lazy(() =>
  import("react-quill-new").then((m) => {
    import("react-quill-new/dist/quill.snow.css");
    return m;
  })
);

const emptyForm = {
  name: "", brand: "", modelYear: "", price: "", hirePrice: "", hirePriceWeekly: "",
  fuelType: "", mileage: "", transmission: "", power: "", ccRating: "", color: "",
  chassisNo: "", engineNo: "", category: "", condition: "", description: "", features: "",
  images: [], isNewArrival: false, forHire: false, isSold: false
};

const VehicleForm = ({ vehicle, onClose }) => {
  const isEditing = !!vehicle;
  const [form, setForm] = useState(isEditing ? {
    ...vehicle,
    features: vehicle.features ? vehicle.features.join("\n") : "",
    images: vehicle.images || [],
    isSold: vehicle.isSold || false
  } : emptyForm);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [uploadingImages, setUploadingImages] = useState(false);

  const onDragOver = useCallback((e) => { e.preventDefault(); }, []);

  const onDrop = useCallback(async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length === 0) return;
    await handleFileUpload(files);
  }, []);

  const onFileInput = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    await handleFileUpload(files);
  };

  const handleFileUpload = async (files) => {
    try {
      setUploadingImages(true);
      
      const uploadPromises = files.map(async (file) => {
        // Compress image to ensure it's under 1MB to safely bypass Vercel's 4.5MB limit
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        const compressedFile = await imageCompression(file, options);
        
        const response = await uploadDirectImage([compressedFile]);
        return response.data[0];
      });

      const newUrls = await Promise.all(uploadPromises);
      
      setForm(prev => ({ ...prev, images: [...prev.images, ...newUrls] }));
    } catch (err) {
      alert("Failed to upload images. Ensure individual files are under 4MB: " + err.message);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setForm(prev => {
      const newImages = [...prev.images];
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ state: "loading", message: "" });

    const payload = { ...form };
    payload.modelYear = payload.modelYear ? Number(payload.modelYear) : undefined;
    payload.price = payload.price ? Number(payload.price) : undefined;
    payload.hirePrice = payload.hirePrice ? Number(payload.hirePrice) : undefined;
    payload.hirePriceWeekly = payload.hirePriceWeekly ? Number(payload.hirePriceWeekly) : undefined;
    payload.mileage = payload.mileage ? Number(payload.mileage) : undefined;

    if (typeof payload.features === "string") {
      payload.features = payload.features.split("\n").map(f => f.trim()).filter(Boolean);
    }

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    try {
      if (isEditing) {
        await updateVehicle(vehicle._id, payload);
      } else {
        await createVehicle(payload);
      }
      invalidateVehicleCache();
      setStatus({ state: "success", message: "Vehicle saved successfully!" });
      setTimeout(() => onClose(true), 1500);
    } catch (err) {
      setStatus({ state: "error", message: err.message || "Failed to save vehicle." });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-muted/60 pb-8">
      <div className="flex items-center gap-4 p-6 border-b border-brand-muted/60 sticky top-0 bg-white/90 backdrop-blur-md z-10 rounded-t-2xl">
        <button type="button" onClick={() => onClose(false)} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-heading font-semibold text-brand-primary">
            {isEditing ? `Editing — ${vehicle.brand} ${vehicle.name}` : "Add New Vehicle"}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Fill in the details below and save when done.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">

        {/* Section 1 — Basic Details */}
        <Section number="1" title="Basic Details" color="blue">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Vehicle Name" value={form.name} onChange={v => setForm({ ...form, name: v })} required placeholder="e.g. Prado TX" />
            <Input label="Brand" value={form.brand} onChange={v => setForm({ ...form, brand: v })} required placeholder="e.g. Toyota" />
            <Input label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} placeholder="e.g. SUV" />
            <Input label="Model Year" type="number" value={form.modelYear} onChange={v => setForm({ ...form, modelYear: v })} required placeholder="e.g. 2021" />
            <Input label="Asking Price (Ksh)" type="number" value={form.price} onChange={v => setForm({ ...form, price: v })} required placeholder="e.g. 4500000" />
            <Input label="Mileage (km)" type="number" value={form.mileage} onChange={v => setForm({ ...form, mileage: v })} required placeholder="e.g. 45000" />
          </div>
        </Section>

        {/* Section 2 — Images */}
        <Section number="2" title="Photos" color="purple">
          <div
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${uploadingImages ? "border-brand-accent bg-brand-accent/5" : "border-slate-300 hover:border-brand-accent bg-slate-50"}`}
          >
            {uploadingImages ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-brand-primary">Uploading to Cloudflare R2...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                  <UploadCloud size={24} />
                </div>
                <p className="text-sm font-semibold text-brand-primary">Drag & drop images here</p>
                <p className="text-xs text-slate-500">High resolution JPEGs or PNGs, up to 8 MB each</p>
                <label className="mt-2 bg-white border border-slate-200 text-sm font-semibold px-5 py-2 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                  Browse Files
                  <input type="file" multiple accept="image/*" className="hidden" onChange={onFileInput} />
                </label>
              </div>
            )}
          </div>

          {form.images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
              {form.images.map((url, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 shadow-sm">
                  <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Section 3 — Specifications */}
        <Section number="3" title="Specifications" color="emerald">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input label="Fuel Type" value={form.fuelType} onChange={v => setForm({ ...form, fuelType: v })} required placeholder="e.g. Diesel" />
            <Input label="Transmission" value={form.transmission} onChange={v => setForm({ ...form, transmission: v })} required placeholder="e.g. Automatic" />
            <Input label="Engine Power" value={form.power} onChange={v => setForm({ ...form, power: v })} placeholder="e.g. 150 HP" />
            <Input label="CC Rating" value={form.ccRating} onChange={v => setForm({ ...form, ccRating: v })} placeholder="e.g. 2000cc" />
            <Input label="Color" value={form.color} onChange={v => setForm({ ...form, color: v })} placeholder="e.g. Pearl White" />
            <Input label="Condition" value={form.condition} onChange={v => setForm({ ...form, condition: v })} placeholder="e.g. Used — Excellent" />
            <Input label="Chassis Number" value={form.chassisNo} onChange={v => setForm({ ...form, chassisNo: v })} />
            <Input label="Engine Number" value={form.engineNo} onChange={v => setForm({ ...form, engineNo: v })} />
          </div>
        </Section>

        {/* Section 4 — Hire */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
            <input
              type="checkbox"
              id="forHire"
              checked={form.forHire}
              onChange={(e) => setForm({ ...form, forHire: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-brand-accent focus:ring-brand-accent"
            />
            <label htmlFor="forHire" className="font-semibold text-slate-800 cursor-pointer text-sm">Available for Hire</label>
          </div>
          {form.forHire && (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Daily Hire Price (Ksh)" type="number" value={form.hirePrice} onChange={v => setForm({ ...form, hirePrice: v })} />
              <Input label="Weekly Hire Price (Ksh)" type="number" value={form.hirePriceWeekly} onChange={v => setForm({ ...form, hirePriceWeekly: v })} />
            </div>
          )}
        </div>

        {/* Section 5 — Description */}
        <Section number="5" title="Description & Features" color="orange">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Vehicle Description</label>
            <div className="bg-white rounded-xl overflow-hidden border border-slate-200 focus-within:border-brand-accent transition-colors">
              <Suspense fallback={
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm bg-slate-50">
                  Loading editor...
                </div>
              }>
                <ReactQuill
                  theme="snow"
                  value={form.description}
                  onChange={(content) => setForm({ ...form, description: content })}
                  className="h-48 pb-12"
                />
              </Suspense>
            </div>
          </div>

          <div className="mt-8">
            <label htmlFor="features" className="block text-sm font-semibold text-slate-700 mb-2">Key Features <span className="text-slate-400 font-normal">(one per line)</span></label>
            <textarea
              id="features"
              name="features"
              rows="5"
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              placeholder={"Leather seats\nSunroof\nBluetooth\nReverse Camera"}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-none font-mono"
            />
          </div>
        </Section>

        {/* Flags */}
        <div className="flex flex-wrap items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <CheckboxField
            id="isNewArrival"
            checked={form.isNewArrival}
            onChange={e => setForm({ ...form, isNewArrival: e.target.checked })}
            label="Mark as New Arrival"
            description="Displays a 'New' badge on the listing"
          />
          <CheckboxField
            id="isSold"
            checked={form.isSold}
            onChange={e => setForm({ ...form, isSold: e.target.checked })}
            label="Mark as Sold"
            description="Hides from public inventory automatically"
            danger
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-6 border-t border-brand-muted/60">
          <div>
            {status.state === "error" && <p className="text-red-500 text-sm">{status.message}</p>}
            {status.state === "success" && <p className="text-emerald-600 text-sm font-semibold">{status.message}</p>}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-6 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={status.state === "loading" || uploadingImages}
              className="bg-brand-primary hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-md disabled:opacity-70 flex items-center gap-2"
            >
              {status.state === "loading" ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</>
              ) : "Save Vehicle"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

/* ─── Sub-components ─── */

const Section = ({ number, title, color, children }) => {
  const colors = {
    blue: "bg-blue-600",
    purple: "bg-purple-600",
    emerald: "bg-emerald-600",
    orange: "bg-orange-500",
  };
  return (
    <section>
      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-3">
        <span className={`w-6 h-6 rounded-md ${colors[color] || "bg-slate-600"} text-white flex items-center justify-center text-xs font-bold`}>
          {number}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
};

const Input = ({ label, value, onChange, type = "text", required, placeholder }) => {
  const safeId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <label htmlFor={safeId} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={safeId}
        name={safeId}
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-none transition-all bg-white"
      />
    </div>
  );
};

const CheckboxField = ({ id, checked, onChange, label, description, danger }) => (
  <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={onChange}
      className={`mt-0.5 w-4 h-4 rounded border-slate-300 focus:ring-offset-0 ${danger ? "text-red-500 focus:ring-red-400" : "text-brand-accent focus:ring-brand-accent"}`}
    />
    <div>
      <p className={`text-sm font-semibold ${danger ? "text-red-700" : "text-slate-800"}`}>{label}</p>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  </label>
);

export default VehicleForm;
