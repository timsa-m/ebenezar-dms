export const dynamic = 'force-dynamic';

import HeaderBox from "@/components/HeaderBox";
import { getFinancingAgreements } from "@/lib/actions/dms.actions";
import Link from "next/link";
import { ArrowUpRight, Activity, Clock, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import LoansTable from "@/components/LoansTable";

export default async function AdminContractsPage() {
  const agreements = (await getFinancingAgreements()) || [];

  // Map agreements to the Loan interface expected by LoansTable and the UI
  const mappedLoans = agreements.map(a => {
    let mappedStatus = 'Active';
    const rawStatus = (a.status || '').toLowerCase();
    const dpd = a.days_overdue || 0;
    
    if (a.duration_months === 0 || a.sale_price === a.deposit_paid) mappedStatus = 'Cash Sale';
    else if (rawStatus === 'completed' || rawStatus === 'fully paid') mappedStatus = 'Fully Paid';
    else if (rawStatus === 'written off' || rawStatus === 'written_off') mappedStatus = 'Written Off';
    else if (rawStatus === 'loss' || dpd > 90) mappedStatus = 'Loss';
    else if (rawStatus === 'defaulting' || (dpd >= 60 && dpd <= 90)) mappedStatus = 'Defaulting';
    else if (rawStatus === 'substandard' || (dpd > 30 && dpd < 60)) mappedStatus = 'Substandard';
    else if (rawStatus === 'overdue' || (dpd >= 7 && dpd <= 30)) mappedStatus = 'Overdue';

    return {
      $id: a.id,
      clientName: a.client?.full_name || 'Unknown',
      clientId: a.client_id,
      loanType: 'Hire Purchase',
      principalAmount: a.principal_amount || 0,
      status: mappedStatus,
      startDate: a.start_date,
      $createdAt: a.created_at,
      vehicleRegNo: a.vehicle?.registration_no || 'N/A',
    };
  });

  const activeLoans = mappedLoans.filter(l => l.status === 'Active').length;
  const overdueLoans = mappedLoans.filter(l => l.status === 'Overdue').length;
  const defaultingLoans = mappedLoans.filter(l => l.status === 'Defaulting').length;
  const lossLoans = mappedLoans.filter(l => l.status === 'Loss').length;
  const fullyPaidLoans = mappedLoans.filter(l => l.status === 'Fully Paid').length;

  return (
    <section className="home-content">
      <header className="page-header">
        <HeaderBox
          title="Financing Agreements"
          subtext="Overview and management of client vehicle hire-purchase contracts."
        />
        <Link href="/loans/create" className="btn-primary">
          <span>New Contract</span>
          <ArrowUpRight className="size-4 opacity-70" />
        </Link>
      </header>

      {/* Contract Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-success-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Active Contracts</p>
            <div className="p-2 bg-success-50 rounded-lg text-success-600 ring-1 ring-success-100">
              <Activity className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{activeLoans}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-success">Servicing</span>
              <p className="text-12 text-gray-500 font-medium">Interest earning</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Overdue Accounts</p>
              <p className="text-11 text-gray-400">7–30 days past due</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 ring-1 ring-amber-100">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{overdueLoans}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-warning">Overdue</span>
              <p className="text-12 text-gray-500 font-medium">Payment due</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Defaulting</p>
              <p className="text-11 text-gray-400">60–90 days past due</p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600 ring-1 ring-orange-100">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{defaultingLoans}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-error">Defaulting</span>
              <p className="text-12 text-gray-500 font-medium">Pre-repossession</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Loss Accounts</p>
              <p className="text-11 text-gray-400">&gt;90 days past due</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600 ring-1 ring-red-100">
              <ShieldAlert className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{lossLoans}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-error">Loss</span>
              <p className="text-12 text-gray-500 font-medium">Not written off</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Fully Paid</p>
              <p className="text-11 text-gray-400">Settled accounts</p>
            </div>
            <div className="p-2 bg-sky-50 rounded-lg text-sky-600 ring-1 ring-sky-100">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{fullyPaidLoans}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-completed">Settled</span>
              <p className="text-12 text-gray-500 font-medium">Fully repaid</p>
            </div>
          </div>
        </div>
      </div>

      <LoansTable loans={mappedLoans} />
    </section>
  );
}
