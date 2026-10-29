import { getLoanById } from "@/lib/actions/loan.actions";
import { getRepaymentsByLoan, getInstallmentsByLoan } from "@/lib/actions/repayment.actions";
import { getPenaltiesByLoan } from "@/lib/actions/penalty.actions";
import { getClientById } from "@/lib/actions/client.actions";
import { getContractData, } from "@/lib/actions/contract.actions";
import { getRepaymentsByAgreement, getFinancingAgreementById } from "@/lib/actions/dms.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { generateSignedUrl } from "@/lib/supabase-storage";
import { formatAmount, cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import PrintButton from "@/components/PrintButton";

export default async function StatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let [loan, currentUser, contract] = await Promise.all([
    getLoanById(id),
    getLoggedInUser(),
    getContractData(id),
  ]);

  if (!loan && contract) {
    const agreementData = await getFinancingAgreementById(id);
    const lastInstallment = contract.installments && contract.installments.length > 0
      ? contract.installments[contract.installments.length - 1]
      : null;

    // Fallback: If it's a vehicle contract instead of a standard loan, map it to the expected loan interface
    loan = {
      $id: contract.id,
      clientId: contract.buyer?.id || "",
      principalAmount: contract.payment?.balance || 0,
      interestRate: 0,
      durationInMonths: contract.installments?.length || 1,
      interestType: "Flat",
      startDate: contract.agreementDate || new Date().toISOString(),
      dueDate: lastInstallment?.date || contract.agreementDate || new Date().toISOString(),
      totalInterest: 0,
      totalPayable: contract.payment?.balance || 0,
      balance: contract.payment?.balance || 0,
      status: contract.status || "Active",
      loanType: "Vehicle on Loan",
      securities: contract.vehicle ? `${contract.vehicle.make} ${contract.vehicle.model} - ${contract.vehicle.registrationNo}` : undefined,
      comment: agreementData?.comment || "",
    } as any;
  }

  if (!loan) {
    return (
      <div style={{ padding: "4rem", textAlign: "center" }}>
        <p>Contract not found.</p>
        <Link href="/loans">Back to Contracts</Link>
      </div>
    );
  }

  const [client, repayments, dmsRepayments, penalties, installments] = await Promise.all([
    getClientById(loan.clientId),
    getRepaymentsByLoan(id),
    // For DMS financing agreements, repayments live in the `repayments` table — fetch both
    contract ? getRepaymentsByAgreement(id) : Promise.resolve([]),
    getPenaltiesByLoan(id),
    getInstallmentsByLoan(id),
  ]);

  // Generate signed URLs server-side (valid for 5 minutes — enough to render the page)
  const TTL = 300;
  const [photoSignedUrl] = await Promise.all([
    client?.profilePhotoPath
      ? generateSignedUrl("client-assets", client.profilePhotoPath, TTL)
      : Promise.resolve(null),
  ]);

  // Merge both repayment sources (old loan_transactions + DMS repayments table)
  const safeRepayments = [...(repayments || []), ...(dmsRepayments || [])];
  // Deduplicate by $id in case a record appears in both
  const seenIds = new Set<string>();
  const mergedRepayments = safeRepayments.filter(r => {
    if (seenIds.has(r.$id)) return false;
    seenIds.add(r.$id);
    return true;
  });
  const safePenalties = (penalties || []) as Penalty[];
  const totalPaid = mergedRepayments.reduce((a: number, r: any) => a + (r.amount || 0), 0);
  const activePenaltyTotal = safePenalties
    .filter((p) => p.status === "Active")
    .reduce((a, p) => a + p.amount, 0);

  const initialInterest = installments && installments.length > 0
    ? installments
      .filter((inst) => (inst.principalDue ?? 0) > 0)
      .reduce((sum, inst) => sum + (inst.interestDue ?? 0), 0)
    : (loan.totalInterest || 0);

  let displayNotes = loan.comment || "";
  if (displayNotes) {
    displayNotes = displayNotes.replace(/GUARANTOR:[\s\S]*/i, "").trim();
  }

  const statementNumber = `STM-${id.slice(-6).toUpperCase()}-${id.slice(0, 4).toUpperCase()}`;
  const generatedOn = new Date().toLocaleDateString("en-KE", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  // Combine and sort chronological transaction ledger
  type LedgerEntry = {
    date: string;
    type: "Disbursement" | "Repayment" | "Penalty" | "Financing";
    description: string;
    debit: number;
    credit: number;
    balance: number;
  };

  const ledger: LedgerEntry[] = [];

  // Opening disbursement
  if (loan.startDate) {
    ledger.push({
      date: loan.startDate,
      type: contract ? "Financing" : "Disbursement",
      description: contract
        ? `Vehicle Loan Started — ${contract.vehicle ? contract.vehicle.make + ' ' + contract.vehicle.model : 'Vehicle'}`
        : `Loan disbursed — ${loan.loanType || "Loan"}`,
      debit: loan.principalAmount + initialInterest,
      credit: 0,
      balance: loan.principalAmount + initialInterest,
    });
  }

  // Repayments & Waivers (merged from both loan_transactions and DMS repayments table)
  mergedRepayments.forEach((r: any) => {
    const isWaiver = (r.paymentMethod || r.payment_method || '').toLowerCase() === 'waiver' || (r.type || '').toLowerCase() === 'waiver';
    ledger.push({
      date: r.date,
      type: "Repayment",
      description: isWaiver
        ? `Waiver / Debt Relief — ${r.comment || r.notes || 'Approved Balance Waiver'}`
        : `${r.paymentMethod || 'Payment'}${r.referenceId ? ` — ${r.referenceId}` : ""}`,
      debit: 0,
      credit: r.amount,
      balance: 0, // computed below
    });
  });

  // Penalties
  safePenalties.forEach((p) => {
    ledger.push({
      date: p.dateApplied,
      type: "Penalty",
      description: `${p.penaltyType}${p.comment ? ` — ${p.comment}` : ""}`,
      debit: p.status === "Active" ? p.amount : 0,
      credit: p.status === "Reversed" ? p.amount : 0,
      balance: 0,
    });
  });

  // Sort chronologically
  ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Running balance
  let runningBalance = 0;
  ledger.forEach((entry) => {
    runningBalance += entry.debit - entry.credit;
    entry.balance = runningBalance;
  });

  // Current balance is the final running balance after all ledger entries
  // (opening debit minus all repayments/credits), keeping it consistent with the table below.
  const currentBalance = ledger.length > 0 ? ledger[ledger.length - 1].balance : (loan.balance || 0);

  return (
    <div className="statement-wrapper">
      {/* Print controls — hidden on print */}
      <div className="no-print" style={{ maxWidth: "860px", margin: "0 auto 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <Link href={`/loans/${id}`} className="btn-secondary" style={{ fontSize: "0.8125rem" }}>
          ← Back to Contracts
        </Link>
        <PrintButton />
      </div>
      {/* Statement Document */}
      <div className="statement-page">

        {/* Header */}
        <div className="statement-header">
          {/* LEFT */}
          <div className="statement-company">
            <div className="statement-logo-wrap">
              <Image
                src="/icons/logo.png"
                width={120}
                height={120}
                alt="Ebenezar Logo"
                className="statement-logo-img"
                style={{
                  maxWidth: "100%",
                  height: "auto"
                }} />

              <div className="statement-company-text">
                <h3 className="statement-brand">Ebenezar</h3>
                <h5 className="statement-tagline">
                  Enterprises Car Bazaar
                </h5>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="statement-contact-info" style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <p className="statement-contact-text">Patel&apos;s, Ondiek Highway, Kisumu, Kenya</p>
            <p className="statement-contact-text">Email: ebenezerltd@gmail.com | Phone: +254 722 263 192</p>
            <p className="statement-contact-text">Website: www.carbazaar.ebenezarenterprises.com</p>
          </div>
        </div>
        <div className="statement-header-divider" />

        {/* Financial Summary Box */}
        {/*
        <div className="statement-summary-box">
          <div className="statement-summary-item">
            <span className="statement-summary-label">Total Payable</span>
            <span className="statement-summary-value">{formatAmount(loan.totalPayable || 0)}</span>
          </div>
          <div className="statement-summary-item">
            <span className="statement-summary-label">Total Paid</span>
            <span className="statement-summary-value statement-summary-value-success">{formatAmount(totalPaid)}</span>
          </div>
          <div className="statement-summary-item">
            <span className="statement-summary-label">Outstanding Balance</span>
            <span className={cn("statement-summary-value", loan.balance > 0 ? "statement-summary-value-danger" : "statement-summary-value-success")}>
              {formatAmount(loan.balance || 0)}
            </span>
          </div>
          <div className="statement-summary-item">
            <span className="statement-summary-label">Penalty Accrued</span>
            <span className={cn("statement-summary-value", activePenaltyTotal > 0 ? "statement-summary-value-danger" : "")}>
              {formatAmount(loan.penaltyAccrued || 0)}
            </span>
          </div>
        </div>
        */}

        {/* Vehicle Details (If available via Contract) */}
        {contract?.vehicle && (
          <div className="statement-section">
            <p className="statement-section-title">Vehicle Details</p>
            <div className="statement-grid">
              <div className="statement-field">
                <span className="statement-field-label">Make & Model</span>
                <span className="statement-field-value">{contract.vehicle.make} {contract.vehicle.model}</span>
              </div>
              <div className="statement-field">
                <span className="statement-field-label">Registration No</span>
                <span className="statement-field-value">{contract.vehicle.registrationNo}</span>
              </div>
              <div className="statement-field">
                <span className="statement-field-label">Chassis No</span>
                <span className="statement-field-value">{contract.vehicle.chassisNo || "—"}</span>
              </div>
              <div className="statement-field">
                <span className="statement-field-label">Engine No</span>
                <span className="statement-field-value">{contract.vehicle.engineNo || "—"}</span>
              </div>
              <div className="statement-field">
                <span className="statement-field-label">Color</span>
                <span className="statement-field-value">{contract.vehicle.color || "—"}</span>
              </div>
              <div className="statement-field">
                <span className="statement-field-label">Fuel Type</span>
                <span className="statement-field-value">{contract.vehicle.fuel || "—"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Client Information */}
        <div className="statement-section">
          <p className="statement-section-title">{contract ? "Buyer Information" : "Borrower Information"}</p>
          <div className="statement-grid">
            <div className="statement-field">
              <span className="statement-field-label">Full Name</span>
              <span className="statement-field-value">{client?.firstName} {client?.lastName}</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">Phone</span>
              <span className="statement-field-value">{client?.phone || "—"}</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">National ID</span>
              <span className="statement-field-value">{client?.nationalId || "—"}</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">Email</span>
              <span className="statement-field-value">{client?.email || "—"}</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">{contract ? "Agreement ID" : "Loan ID"}</span>
              <span className="statement-field-value">
                {id.slice(-8).toUpperCase()}
              </span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">{contract ? "Contract Status" : "Loan Status"}</span>
              <span className={cn("statement-field-value", {
                "kpi-value-success": ["ACTIVE", "FULLY PAID", "COMPLETED"].includes((loan.status || "").toUpperCase()),
                "kpi-value-warning": ["PENDING"].includes((loan.status || "").toUpperCase()),
                "kpi-value-danger": ["OVERDUE", "DENIED", "WRITTEN OFF", "LOSS"].includes((loan.status || "").toUpperCase()),
              })}>
                {loan.status}
              </span>
            </div>
          </div>
        </div>


        {/* Loan Terms */}
        <div className="statement-section">
          <p className="statement-section-title">{contract ? "Terms" : "Loan Terms"}</p>
          <div className="statement-grid">
            {contract ? (
              <>
                <div className="statement-field">
                  <span className="statement-field-label">Vehicle Price</span>
                  <span className="statement-field-value">{formatAmount(contract.payment?.vehiclePrice || 0)}</span>
                </div>
                <div className="statement-field">
                  <span className="statement-field-label">Deposit Paid</span>
                  <span className="statement-field-value">{formatAmount(contract.payment?.deposit || 0)}</span>
                </div>
                <div className="statement-field">
                  <span className="statement-field-label">Bal After Deposit</span>
                  <span className="statement-field-value">{formatAmount(contract.payment?.balance || 0)}</span>
                </div>
                <div className="statement-field">
                  <span className="statement-field-label">Current Balance</span>
                  <span className="statement-field-value" style={{ fontWeight: 700, color: currentBalance > 0 ? '#B91C1C' : '#047857' }}>
                    {formatAmount(currentBalance)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="statement-field">
                  <span className="statement-field-label">Principal</span>
                  <span className="statement-field-value">{formatAmount(loan.principalAmount || 0)}</span>
                </div>
                <div className="statement-field">
                  <span className="statement-field-label">Interest Rate</span>
                  <span className="statement-field-value">{loan.interestRate}% / month</span>
                </div>
                <div className="statement-field">
                  <span className="statement-field-label">Interest Type</span>
                  <span className="statement-field-value">{loan.interestType}</span>
                </div>
                <div className="statement-field">
                  <span className="statement-field-label">Total Interest</span>
                  <span className="statement-field-value">{formatAmount(loan.totalInterest || 0)}</span>
                </div>
              </>
            )}
            <div className="statement-field">
              <span className="statement-field-label">Duration</span>
              <span className="statement-field-value">{loan.durationInMonths} months</span>
            </div>
            <div className="statement-field">
              <span className="statement-field-label">{contract ? "Agreement Type" : "Loan Type"}</span>
              <span className="statement-field-value">{loan.loanType || "—"}</span>
            </div>
            {loan.startDate && (
              <div className="statement-field">
                <span className="statement-field-label">Start Date</span>
                <span className="statement-field-value">
                  {new Date(loan.startDate).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            )}
            {loan.dueDate && (
              <div className="statement-field">
                <span className="statement-field-label">End Date</span>
                <span className="statement-field-value">
                  {new Date(loan.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Security & Guarantor Details / Witness Info */}
        {(loan.securities || loan.guarantorName || contract) && (
          <div className="statement-section">
            <p className="statement-section-title">{contract ? "Notes & Witness Information" : "Security & Guarantor Details"}</p>
            <div className="statement-grid">
              {contract ? (
                <>
                  {displayNotes && (
                    <div className="statement-field" style={{ gridColumn: "1 / -1" }}>
                      <span className="statement-field-label">Notes</span>
                      <span className="statement-field-value">{displayNotes}</span>
                    </div>
                  )}
                  <div className="statement-field">
                    <span className="statement-field-label">Witness Name</span>
                    <span className="statement-field-value">{contract.signatures?.buyerWitnessName || "—"}</span>
                  </div>
                  <div className="statement-field">
                    <span className="statement-field-label">Witness Phone</span>
                    <span className="statement-field-value">{contract.signatures?.buyerWitnessPhone || "—"}</span>
                  </div>
                  <div className="statement-field">
                    <span className="statement-field-label">Witness ID</span>
                    <span className="statement-field-value">{contract.signatures?.buyerWitnessId || "—"}</span>
                  </div>
                </>
              ) : (
                <>
                  {displayNotes && (
                    <div className="statement-field" style={{ gridColumn: "1 / -1" }}>
                      <span className="statement-field-label">Notes</span>
                      <span className="statement-field-value">{displayNotes}</span>
                    </div>
                  )}
                  {loan.securities && (
                    <div className="statement-field" style={{ gridColumn: "1 / -1" }}>
                      <span className="statement-field-label">Collateral / Securities</span>
                      <span className="statement-field-value">{loan.securities}</span>
                    </div>
                  )}
                  {loan.guarantorName && (
                    <div className="statement-field">
                      <span className="statement-field-label">Guarantor Name</span>
                      <span className="statement-field-value">{loan.guarantorName}</span>
                    </div>
                  )}
                  {loan.guarantorPhone && (
                    <div className="statement-field">
                      <span className="statement-field-label">Guarantor Phone</span>
                      <span className="statement-field-value">{loan.guarantorPhone || "—"}</span>
                    </div>
                  )}
                  {loan.guarantorId && (
                    <div className="statement-field">
                      <span className="statement-field-label">Guarantor ID</span>
                      <span className="statement-field-value">{loan.guarantorId || "—"}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}


        {/* Transaction Ledger */}
        <div className="statement-section">
          <p className="statement-section-title">Transaction History</p>
          <table className="statement-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Debit (KSH)</th>
                <th style={{ textAlign: "right" }}>Payments (KSH)</th>
                <th style={{ textAlign: "right" }}>Balance (KSH)</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "#9CA3AF", padding: "2rem" }}>
                    No transactions recorded.
                  </td>
                </tr>
              )}
              {ledger.map((entry, idx) => (
                <tr key={idx}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {new Date(entry.date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td>
                    <span style={{
                      fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                      color: entry.type === "Repayment" ? "#047857" : entry.type === "Penalty" ? "#B91C1C" : "#1D4ED8",
                    }}>
                      {entry.type}
                    </span>
                  </td>
                  <td style={{ color: "#374151" }}>{entry.description}</td>
                  <td className={entry.debit > 0 ? "statement-table-debit" : ""} style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {entry.debit > 0 ? entry.debit.toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "—"}
                  </td>
                  <td className={entry.credit > 0 ? "statement-table-credit" : ""} style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {entry.credit > 0 ? entry.credit.toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "—"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: entry.balance > 0 ? "#B91C1C" : "#047857" }}>
                    {entry.balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Penalty Summary */}
        {safePenalties.length > 0 && (
          <div className="statement-section">
            <p className="statement-section-title">Penalty Register</p>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Date Applied</th>
                  <th>Penalty Type</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Applied By</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {safePenalties.map((p) => (
                  <tr key={p.$id} style={{ opacity: p.status === "Reversed" ? 0.55 : 1 }}>
                    <td>{new Date(p.dateApplied).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td style={{ fontWeight: 600 }}>{p.penaltyType}</td>
                    <td className="statement-table-debit" style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {p.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </td>
                    <td>{p.appliedBy}</td>
                    <td style={{ color: "#9CA3AF" }}>{p.comment || "—"}</td>
                    <td style={{ fontWeight: 700, color: p.status === "Active" ? "#B91C1C" : "#9CA3AF", fontSize: "0.75rem" }}>
                      {p.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Signature */}
        <div style={{ marginTop: "3rem", paddingTop: "1.5rem", borderTop: "2px solid #111113" }}>

          {/* Disclaimer */}
          <div style={{ textAlign: "center", borderTop: "1px solid #E5E7EB", paddingTop: "1rem" }}>
            <p style={{ fontSize: "0.6875rem", color: "#9CA3AF", lineHeight: 1.6 }}>
              This statement is auto-generated and is accurate as of the generation date. For disputes, contact your account manager.
            </p>
          </div>
        </div>

        {/* Footer Tagline */}
        <div style={{ marginTop: "2.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", fontStyle: "italic", color: "#6B7280", fontWeight: 500 }}>
            &ldquo;Quality Vehicles for the Road Ahead.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
