'use client';

import HeaderBox from "@/components/HeaderBox";
import { createClient } from "@/lib/actions/client.actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, UserPlus, Phone, FileText, MapPin, AlertCircle, Loader2, Camera } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { useLoanApplicationFlow } from "@/hooks/useLoanApplicationFlow";
import { toast } from '@/lib/toast';

export default function CreateClientPage() {
  const router = useRouter();
  const { handleClientCompleted } = useLoanApplicationFlow();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<"idle" | "uploading" | "saving">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const actionType = submitter?.value || "register"; // 'register' or 'register_loan'

    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    // use a temp UUID as placeholder; replaced after client is created
    const tempId = crypto.randomUUID();

    startTransition(async () => {
      try {
        let photoPath: string | undefined;

        if (photoFile) {
          setUploadStep("uploading");
          // Use a multipart/form-data API route to avoid the
          // "Maximum array nesting exceeded" error that occurs when
          // large base64 strings are passed through Server Action arguments.
          const fd = new FormData();
          fd.append("file", photoFile);
          fd.append("clientId", tempId);
          const res = await fetch("/api/upload/client-photo", {
            method: "POST",
            body: fd,
          });
          if (res.ok) {
            const json = await res.json();
            photoPath = json.path;
          } else {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error ?? "Photo upload failed");
          }
          setUploadStep("saving");
        }

        const result = await createClient({
          firstName: firstName?.trim().toUpperCase(),
          lastName: lastName?.trim().toUpperCase(),
          nationalId: (formData.get("nationalId") as string)?.trim(),
          email: (formData.get("email") as string)?.trim(),
          phone: (formData.get("phone") as string)?.trim(),
          address: (formData.get("address") as string)?.trim().toUpperCase(),
          profilePhotoPath: photoPath,
        });

        setUploadStep("idle");
        if (result && result.$id) {
          toast.success("Client successfully registered!", { position: "top-center" });
          if (actionType === "register_loan") {
            handleClientCompleted(result.$id);
          } else {
            router.push("/clients");
            router.refresh();
          }
        } else {
          setError("Registration failed. Please try again.");
          toast.error("Registration failed.");
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
          title="Buyer Registration"
          subtext="Onboard a new client."
        />
      </header>

      <section className="flex-1">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 max-w-4xl">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-14 font-semibold text-red-700">Registration Failed</p>
                <p className="text-13 text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Photo Upload Column */}
            <div className="lg:col-span-1">
              <div className="card-premium p-6 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/5 rounded-lg text-primary">
                    <Camera className="size-5" />
                  </div>
                  <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Profile Photo</h3>
                </div>

                <FileUpload
                  onFileSelect={setPhotoFile}
                  className="mt-2"
                />
                <p className="text-12 text-gray-500 mt-4 leading-relaxed">
                  A clear profile photo helps in identifying the buyer during field visits and repayments.
                </p>
              </div>
            </div>

            {/* Form Fields Column */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              {/* Personal Details Section */}
              <div className="card-premium p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/5 rounded-lg text-primary">
                    <UserPlus className="size-5" />
                  </div>
                  <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Personal Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      placeholder="e.g. JOHN"
                      className="input-class uppercase"
                      style={{ textTransform: 'uppercase' }}
                      onInput={(e) => {
                        e.currentTarget.value = e.currentTarget.value.toUpperCase();
                      }}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      placeholder="e.g. DOE"
                      className="input-class uppercase"
                      style={{ textTransform: 'uppercase' }}
                      onInput={(e) => {
                        e.currentTarget.value = e.currentTarget.value.toUpperCase();
                      }}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="size-3.5" />
                      National ID / Passport
                    </label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" name="nationalId" required placeholder="Enter ID Number" className="input-class font-mono" disabled={isLoading} />
                  </div>
                </div>
              </div>

              {/* Contact & Location Section */}
              <div className="card-premium p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/5 rounded-lg text-primary">
                    <Phone className="size-5" />
                  </div>
                  <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Contact Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Phone Number</label>
                    <input type="tel" inputMode="numeric" pattern="[0-9]*" name="phone" required placeholder="+254 7..." className="input-class" disabled={isLoading} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Email Address</label>
                    <input type="email" name="email" placeholder="john@example.com" className="input-class" disabled={isLoading} />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="size-3.5" />
                      Residential Address / Location
                    </label>
                    <input
                      type="text"
                      name="address"
                      placeholder="e.g. NYAMASARIA, KISUMU"
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
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-2">
            <button type="submit" name="action" value="register" className="btn-secondary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{uploadStep === 'uploading' ? 'Uploading photo…' : 'Registering…'}</span>
                </>
              ) : (
                <span>Register Client</span>
              )}
            </button>
            <button type="submit" name="action" value="register_loan" className="btn-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{uploadStep === 'uploading' ? 'Uploading photo…' : 'Registering…'}</span>
                </>
              ) : (
                <>
                  <span>Register & Create Agreement</span>
                  <ArrowRight className="size-4 opacity-70" />
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

