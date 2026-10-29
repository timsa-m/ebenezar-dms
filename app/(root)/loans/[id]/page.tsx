export const dynamic = 'force-dynamic';

import { getFinancingAgreementById, getRepaymentsByAgreement, getInstallmentsByAgreement } from "@/lib/actions/dms.actions";
import { getPenaltiesByLoan } from "@/lib/actions/penalty.actions";
import { getAuditLogsByLoan } from "@/lib/actions/audit.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { cn } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import LoanDetailClient, { ActionPanel } from "@/components/LoanDetailClient";
import HeaderBox from "@/components/HeaderBox";

export default async function LoanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; warn?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [agreementData, currentUser] = await Promise.all([
    getFinancingAgreementById(id),
    getLoggedInUser(),
  ]);

  if (!agreementData) {
    return (
      <section className="home-content">
        <div className="card-premium" style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 700, color: "#111113" }}>Contract not found</p>
          <p style={{ fontSize: "0.875rem", color: "#9CA3AF", marginTop: "0.5rem" }}>
            The requested financing agreement does not exist.
          </p>
          <Link href="/loans" className="btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
            Back to Contracts
          </Link>
        </div>
      </section>
    );
  }

  const [repayments, penalties, auditLogs, installments] = await Promise.all([
    getRepaymentsByAgreement(id),
    getPenaltiesByLoan(id), // Can leave this pointing to loan actions for now
    getAuditLogsByLoan(id),
    getInstallmentsByAgreement(id),
  ]);

  const client = {
    $id: agreementData.client?.id || '',
    firstName: agreementData.client?.full_name?.split(' ')[0] || '',
    lastName: agreementData.client?.full_name?.split(' ').slice(1).join(' ') || '',
    nationalId: agreementData.client?.client_id_number || '',
    phone: agreementData.client?.phone || '',
    totalBorrowed: 0,
    outstandingBalance: 0,
  };

  const vehicleDetails = agreementData.vehicle || null;

  const loan: any = {
    $id: agreementData.id,
    clientId: agreementData.client_id,
    principalAmount: agreementData.sale_price,
    interestRate: agreementData.interest_rate || 0,
    interestType: 'Flat',
    durationInMonths: agreementData.duration_months || 0,
    startDate: agreementData.start_date,
    dueDate: agreementData.end_date,
    totalInterest: 0,
    totalPayable: agreementData.sale_price,
    balance: agreementData.balance,
    status: (() => {
      const rawStatus = (agreementData.status || '').toLowerCase();
      const dpd = agreementData.days_overdue || 0;
      if (agreementData.sale_price === agreementData.deposit_paid || agreementData.duration_months === 0) return 'Cash Sale';
      if (rawStatus === 'completed' || rawStatus === 'fully paid') return 'Fully Paid';
      if (rawStatus === 'written off' || rawStatus === 'written_off') return 'Written Off';
      if (rawStatus === 'loss' || dpd > 90) return 'Loss';
      if (rawStatus === 'defaulting' || (dpd >= 60 && dpd <= 90)) return 'Defaulting';
      if (rawStatus === 'substandard' || (dpd > 30 && dpd < 60)) return 'Substandard';
      if (rawStatus === 'overdue' || (dpd >= 7 && dpd <= 30)) return 'Overdue';
      return 'Active';
    })(),
    penaltyAccrued: agreementData.total_penalties || 0,
    loanType: agreementData.sale_price === agreementData.deposit_paid ? 'Cash Sale' : 'Vehicle Sale',
    vehicleDetails: vehicleDetails,
    comment: agreementData.comment || '',
    installmentAmount: agreementData.monthly_due,
    isHighRisk: false,
    salePrice: agreementData.sale_price,
    depositPaid: agreementData.deposit_paid || 0,
    amountApplied: agreementData.sale_price,
    principalDisbursed: agreementData.deposit_paid || 0,
    disbursedAt: agreementData.start_date,
    clientName: agreementData.client?.full_name,
    clientPhone: agreementData.client?.phone,
  };

  const safeRepayments = repayments || [];
  const safePenalties = penalties || [];
  const safeAuditLogs = auditLogs || [];
  const safeInstallments = installments || [];
  const safeTransactions = repayments || []; // Use repayments as transactions for UI consistency

  // For the Penalties KPI card: active non-rollover penalty transactions
  const activePenalties = safePenalties.filter((p: any) => p.status === 'Active' && p.penaltyType !== 'Rollover Fee');
  const totalPenaltiesAmt = activePenalties.reduce(
    (sum: number, p: any) => sum + (p.amount || 0),
    0
  );

  const cashRepayments = safeRepayments.filter(
    (r: any) => (r.paymentMethod || r.payment_method || '').toLowerCase() !== 'waiver'
  );
  const waiverRepayments = safeRepayments.filter(
    (r: any) => (r.paymentMethod || r.payment_method || '').toLowerCase() === 'waiver'
  );

  const totalPaid = cashRepayments.reduce(
    (acc: number, rep: any) => acc + (rep.amount || 0),
    0
  );

  const totalWaived = waiverRepayments.reduce(
    (acc: number, rep: any) => acc + (rep.amount || 0),
    0
  );

  loan.totalWaived = totalWaived;

  // Total Expected: sum every installment component (same logic as LoanDetailClient.tsx).
  // For Pending loans no installments exist — fall back to loan.totalPayable.
  const totalExpected = loan.status === 'Pending'
    ? (loan.totalPayable || 0)
    : safeInstallments.reduce(
      (sum: number, inst: any) =>
        sum + (inst.principalDue || 0)
        + (inst.interestDue || 0)
        + (inst.penaltiesDue || 0)
        + (inst.feesDue || 0),
      0
    );
  const totalDebtRelief = totalPaid + totalWaived;
  const progressPercent = Math.min(100, (totalDebtRelief / (totalExpected || 1)) * 100);

  // Approve/Deny are no longer needed since agreements are active upon creation
  const handleApprove = async () => { "use server"; };
  const handleDeny = async () => { "use server"; };

  return (
    <section className="home-content animate-fade-in">

      {/* High-Risk Client Banner — shown when loan is flagged or freshly created from a risky client */}
      {(loan.isHighRisk || sp?.warn === 'high_risk') && (
        <div style={{ display: 'flex', gap: '0.875rem', padding: '1rem 1.25rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.875rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#92400E' }}>High-Risk Client — Pending Admin Approval</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#78350F', lineHeight: 1.5 }}>This borrower has an existing Overdue, Written Off, or Loss loan. This facility has been flagged and must be reviewed and approved by an admin before disbursement.</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <header className="page-header">
        <HeaderBox
          title={
            <Link href={`/clients/${client?.$id}`} className="hover:underline text-gray-900 transition-colors hover:text-primary">
              {client?.firstName} {client?.lastName}
            </Link>
          }
          subtext={
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              <span
                className={cn("badge", {
                  "badge-success": loan.status === "Active",
                  "badge-pending": loan.status === "Pending",
                  "badge-warning": loan.status === "Overdue" || loan.status === "Substandard",
                  "badge-error": loan.status === "Defaulting" || loan.status === "Loss" || loan.status === "Denied",
                  "badge-neutral": loan.status === "Written Off",
                  "badge-completed": loan.status === "Fully Paid" || loan.status === "Cash Sale",
                })}
              >
                {loan.status}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 500 }}>

                {`Contract No. - ${agreementData.contract_no}`}
              </span>


              <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>·</span>
              {loan.loanType && (
                <span style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 500 }}>
                  {loan.loanType}
                </span>
              )}
            </div>
          }
        />
        <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>
          <Link href="/loans" className="btn-secondary">
            ← Contracts
          </Link>
          <Link href={`/loans/${id}/statement`} className="btn-primary">
            Statement
          </Link>
        </div>
      </header>

      {/* 2-column layout: main content + action panel */}
      <div style={{
        display: "grid",
        gap: "1.25rem",
      }}
        className="loan-detail-layout">

        {/* Left: interactive client component (KPI strip + tabs + audit) */}
        <div style={{ minWidth: 0 }}>
          <LoanDetailClient
            loan={loan}
            client={client}
            repayments={safeRepayments}
            penalties={safePenalties}
            auditLogs={safeAuditLogs}
            currentUser={currentUser}
            totalPaid={totalPaid}
            progressPercent={progressPercent}
            installments={safeInstallments}
            transactions={safeTransactions}
          />
        </div>

        {/* Right: action panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          <ActionPanel
            loan={loan}
            client={client}
            currentUser={currentUser}
            repayments={safeRepayments}
            penalties={safePenalties}
            installments={safeInstallments}
            transactions={safeTransactions}
          />
        </div>
      </div>
    </section>
  );
}
