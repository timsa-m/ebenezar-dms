import HeaderBox from "@/components/HeaderBox";
import { getClients, getClientById } from "@/lib/actions/client.actions";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ArrowRight, UserCheck, Briefcase, Calculator, Calendar, ShieldCheck, FileText, CheckCircle } from "lucide-react";
import ClientSearchSelect from "@/components/ClientSearchSelect";
import VehicleSearchSelect from "@/components/VehicleSearchSelect";
import DatePickerInput from "@/components/ui/DatePickerInput";
import SubmitFormButton from "@/components/ui/SubmitFormButton";
import { handleCreateAgreement } from "./actions";

export default async function CreateLoanPage({ searchParams }: { searchParams: Promise<{ error?: string, renewFrom?: string, clientId?: string, source?: string }> }) {
  const params = await searchParams;
  const clients = (await getClients()) || [];

  const supabase = createAdminClient();
  const { data: vehiclesData } = await supabase.from('vehicles').select('id, make_model, registration_no, sale_price').eq('status', 'in_stock');
  const vehicles = vehiclesData || [];

  let prefill: any = null;

  // Handle Orchestration Layer state
  let applicantClient = null;
  if (params?.clientId) {
    applicantClient = await getClientById(params.clientId);
    if (!applicantClient) {
      // Fallback: client not found (e.g. tampered URL)
      redirect('/clients/create');
    }

    // Set prefill clientId to lock it in the form
    if (!prefill) prefill = {};
    prefill.clientId = applicantClient.$id;
  }



  return (
    <section className="home-content">
      <header className="mb-6">
        <HeaderBox
          title="Financing Agreement Application"
          subtext="Initiate a new vehicle contract for a verified client."
        />
      </header>


      {params?.error === 'credit_rejected' && (
        <div style={{ display: 'flex', gap: '0.875rem', padding: '1rem 1.25rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.875rem', marginBottom: '1.5rem' }}>
          <div style={{ flexShrink: 0, width: '2rem', height: '2rem', background: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ⚠️
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#92400E' }}>High-Risk Client — Mandatory Review Required</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#78350F', lineHeight: 1.5 }}>This client has an existing Overdue or Defaulted contract. The facility will still be originated as <strong>Pending</strong> and flagged for admin approval before disbursement.</p>
          </div>
        </div>
      )}

      {params?.error && params.error !== 'credit_rejected' && (
        <div style={{ display: 'flex', gap: '0.875rem', padding: '1rem 1.25rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.875rem', marginBottom: '1.5rem' }}>
          <div style={{ flexShrink: 0, width: '2rem', height: '2rem', background: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ❌
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#991B1B' }}>Failed to create contract</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#7F1D1D', lineHeight: 1.5 }}>{decodeURIComponent(params.error)}</p>
          </div>
        </div>
      )}

      {applicantClient && (
        <div style={{ display: 'flex', gap: '0.875rem', padding: '1rem 1.25rem', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '0.875rem', marginBottom: '1.5rem' }}>
          <div style={{ flexShrink: 0, width: '2rem', height: '2rem', background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle className="size-4 text-emerald-600" />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#065F46' }}>
              {params?.source === 'new_client' ? 'Client Registration Successful' : 'Borrower Pre-Selected'}
            </p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#064E3B', lineHeight: 1.5 }}>
              Applying for: <strong>{applicantClient.firstName} {applicantClient.lastName}</strong> | National ID: {applicantClient.nationalId || applicantClient.$id}{applicantClient.phone ? ` | Phone: ${applicantClient.phone}` : ''}
            </p>
          </div>
        </div>
      )}

      <section className="flex-1">
        <form action={handleCreateAgreement} className="flex flex-col gap-8 max-w-3xl">

          {/* Client & Product Section */}
          <div className="card-premium p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/5 rounded-lg text-primary">
                <Briefcase className="size-5" />
              </div>
              <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Facility Details</h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <UserCheck className="size-3.5" />
                  Client Selection
                </label>
                <ClientSearchSelect
                  key={applicantClient?.$id || prefill?.clientId || 'new-loan'}
                  clients={clients}
                  defaultClientId={prefill?.clientId}
                  initialClient={applicantClient}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Vehicle Selection</label>
                <VehicleSearchSelect vehicles={vehicles} />
              </div>
            </div>
          </div>

          {/* Financial Terms Section */}
          <div className="card-premium p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/5 rounded-lg text-primary">
                <Calculator className="size-5" />
              </div>
              <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Financial Terms</h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Sale Price (KSH)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">KSH</span>
                  <input type="number" step="1" name="salePrice" required defaultValue={prefill?.salePrice} placeholder="1,500,000.00" className="input-class text-center w-full font-mono font-semibold" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Deposit Paid</label>
                  <div className="relative">
                    <input type="number" step="0.01" name="depositPaid" required defaultValue={prefill?.depositPaid} placeholder="500,000.00" className="input-class pr-12 w-full" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">KSH</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Monthly Due</label>
                  <div className="relative">
                    <input type="number" step="0.01" name="monthlyDue" required defaultValue={prefill?.monthlyDue} placeholder="85,000.00" className="input-class pr-12 w-full" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">KSH</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="size-3.5" />
                    Tenure
                  </label>
                  <div className="relative">
                    <input type="number" step="any" name="durationMonths" required defaultValue={prefill?.durationMonths} placeholder="12" className="input-class pr-24 w-full" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Months</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="size-3.5" />
                    Commencement Date
                  </label>
                  <div className="relative">
                    <DatePickerInput name="startDate" />
                  </div>
                </div>
              </div>
            </div>
            
            <script dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  function checkCashSale() {
                    const salePrice = parseFloat(document.querySelector('input[name="salePrice"]')?.value) || 0;
                    const depositPaid = parseFloat(document.querySelector('input[name="depositPaid"]')?.value) || 0;
                    const isCashSale = (salePrice > 0 && salePrice === depositPaid);
                    
                    const monthlyDueInput = document.querySelector('input[name="monthlyDue"]');
                    const durationMonthsInput = document.querySelector('input[name="durationMonths"]');
                    
                    if (monthlyDueInput) {
                      monthlyDueInput.disabled = isCashSale;
                      monthlyDueInput.required = !isCashSale;
                      if (isCashSale) monthlyDueInput.value = '0';
                      monthlyDueInput.style.opacity = isCashSale ? '0.5' : '1';
                      monthlyDueInput.style.cursor = isCashSale ? 'not-allowed' : 'text';
                    }
                    
                    if (durationMonthsInput) {
                      durationMonthsInput.disabled = isCashSale;
                      durationMonthsInput.required = !isCashSale;
                      if (isCashSale) durationMonthsInput.value = '0';
                      durationMonthsInput.style.opacity = isCashSale ? '0.5' : '1';
                      durationMonthsInput.style.cursor = isCashSale ? 'not-allowed' : 'text';
                    }
                  }
                  
                  document.addEventListener('input', function(e) {
                    if (e.target && (e.target.name === 'salePrice' || e.target.name === 'depositPaid')) {
                      checkCashSale();
                    }
                  });
                  
                  // Initial check
                  setTimeout(checkCashSale, 100);
                })();
              `
            }} />
          </div>

          {/* Risk Mitigation Section */}
          <div className="card-premium p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/5 rounded-lg text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Risk Mitigation & Security</h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="size-3.5" />
                    Additional Information
                  </label>
                  <textarea
                    name="comment"
                    rows={3}
                    defaultValue={prefill?.comment}
                    placeholder="Other relevant information..."
                    className="input-class w-full py-3 resize-none uppercase"
                    style={{ textTransform: 'uppercase' }}
                  ></textarea>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="size-3.5" />
                    Physical Document Upload (Optional)
                  </label>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center text-center">
                    <input
                      type="file"
                      name="documentFile"
                      accept=".pdf,image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FileText className="size-6 text-gray-400 mb-2" />
                    <p className="text-14 font-medium text-gray-700">Click to upload document</p>
                    <p className="text-12 text-gray-500 mt-1">PDF or Images up to 10MB</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-14 font-semibold text-gray-800 mb-4">Witness Information (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Full Name</label>
                    <input
                      type="text"
                      name="guarantorName"
                      defaultValue={prefill?.guarantorName}
                      placeholder="JANE DOE"
                      className="input-class w-full uppercase"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Phone Number</label>
                    <input type="text" name="guarantorPhone" defaultValue={prefill?.guarantorPhone} placeholder="+254..." className="input-class w-full" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">National ID</label>
                    <input type="text" name="guarantorId" defaultValue={prefill?.guarantorId} placeholder="12345678" className="input-class w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <SubmitFormButton className="btn-submit" pendingText="Creating Agreement...">
              <span>Create Agreement</span>
              <ArrowRight className="size-4 opacity-70" />
            </SubmitFormButton>
          </div>
        </form>
      </section>
    </section>
  )
}
