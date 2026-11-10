export const dynamic = 'force-dynamic';

import HeaderBox from "@/components/HeaderBox";
import { getFinancingAgreements } from "@/lib/actions/dms.actions";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import LoansTable, { Agreement } from "@/components/LoansTable";

export default async function LoansPage() {
  const agreements = (await getFinancingAgreements()) || [];

  // Map agreements to the rich Agreement interface expected by LoansTable and the UI
  const mappedLoans: Agreement[] = agreements.map((a) => {
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
      contractNo: a.contract_no || `EBZ-${a.id.slice(-6).toUpperCase()}`,
      clientName: a.client?.full_name || 'Unknown',
      clientId: a.client_id,
      clientPhone: a.client?.phone || '',
      clientIdNumber: a.client?.client_id_number || '',
      loanType: mappedStatus === 'Cash Sale' ? 'Cash Sale' : 'Hire Purchase',
      principalAmount: Number(a.principal_amount) || 0,
      balance: typeof a.balance === 'number' ? Number(a.balance) : (Number(a.principal_amount) || 0),
      salePrice: Number(a.sale_price) || 0,
      depositPaid: Number(a.deposit_paid) || 0,
      monthlyDue: Number(a.monthly_due) || 0,
      durationMonths: Number(a.duration_months) || 0,
      daysOverdue: dpd,
      totalPenalties: Number(a.total_penalties) || 0,
      status: mappedStatus,
      startDate: a.start_date,
      endDate: a.end_date,
      lastPaymentDate: a.last_payment_date,
      $createdAt: a.created_at,
      vehicleRegNo: a.vehicle?.registration_no || 'N/A',
      vehicleMakeModel: a.vehicle?.make_model || '',
    };
  });

  return (
    <section className="home-content">
      {/* Page Heading & Primary Action */}
      <header className="page-header flex flex-col md:flex-row md:items-center md:justify-between">
        <HeaderBox
          title="Financing Agreements"
          subtext="Executive oversight of vehicle hire-purchase portfolios, repayment ledgers, and credit risk."
        />
        <div className="flex items-center gap-2.5 mt-4 md:mt-0">
          <Link
            href="/loans/create"
            className="btn-primary flex items-center justify-center gap-2 text-xs px-4 py-2.5 cursor-pointer shadow-sm"
          >
            <span>New Contract</span>
            <ArrowUpRight className="size-4 opacity-70" />
          </Link>
        </div>
      </header>

      {/* Modernised Business Dashboard & Table */}
      <LoansTable loans={mappedLoans} />
    </section>
  );
}
