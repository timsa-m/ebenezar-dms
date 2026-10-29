/**
 * Dealership Asset Financing — Monthly Portfolio Reporting Engine
 *
 * Implements period-based monthly portfolio snapshots for vehicle hire-purchase
 * and asset financing contracts.
 *
 * Calculates:
 *   - Active vehicle financing agreements
 *   - New contracts originated during the month
 *   - Collections (repayments & deposits)
 *   - Penalties applied & waived
 *   - Opening and closing portfolio balances
 *   - Contract-by-contract monthly ledger with vehicle plates and client details
 */

import { createSupabaseAdminClient } from "../supabase";
import type {
  MonthlyReportRecord,
  MonthlyReportEntry,
  MonthlyReportFull,
  GenerateMonthlyReportInput,
} from "./report.types";

// ─── Period helpers ───────────────────────────────────────────────────────────

export function getPeriodBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999); // last day of month
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getPeriodLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-KE", {
    month: "long",
    year: "numeric",
  });
}

export function getPreviousPeriod(year: number, month: number) {
  const d = new Date(year, month - 2, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// ─── Dynamic Monthly Report Calculation ───────────────────────────────────────

export async function computeMonthlySnapshotLive(
  year: number,
  month: number,
  generatedBy: string = "System"
): Promise<MonthlyReportFull> {
  const supabase = createSupabaseAdminClient();
  const { start: periodStart, end: periodEnd } = getPeriodBounds(year, month);
  const periodLabel = getPeriodLabel(year, month);
  const periodStartDate = new Date(periodStart);
  const periodEndDate = new Date(periodEnd);

  // 1. Fetch agreements that could possibly belong to this period.
  //    Inclusion rules are applied per-contract in the loop below.
  const { data: rawAgreements, error: aErr } = await supabase
    .from("financing_agreements")
    .select(`
      id, contract_no, client_id, sale_price, deposit_paid, principal_amount,
      monthly_due, balance, status, start_date, end_date, days_overdue, total_penalties,
      created_at, duration_months, last_payment_date,
      vehicle:vehicles(registration_no, make_model),
      client:clients(full_name, phone)
    `)
    .not("status", "in", '("draft","Denied")');

  if (aErr) {
    console.error("[computeMonthlySnapshotLive] Agreements query error:", aErr);
  }

  // 2. Fetch repayments in this period
  const { data: rawRepayments, error: rErr } = await supabase
    .from("repayments")
    .select("agreement_id, amount_paid, payment_date, created_at")
    .gte("payment_date", periodStart)
    .lte("payment_date", periodEnd)
    .gt("amount_paid", 0);

  if (rErr) {
    console.error("[computeMonthlySnapshotLive] Repayments query error:", rErr);
  }

  // 3. Fetch penalties in this period
  let penQuery = supabase
    .from("penalties")
    .select("agreement_id, amount, status, date_applied, created_at")
    .gte("date_applied", periodStart);

  const toDate = periodEnd.includes("T") ? periodEnd : `${periodEnd}T23:59:59.999Z`;
  penQuery = penQuery.lte("date_applied", toDate);

  const { data: rawPenalties, error: pErr } = await penQuery;
  if (pErr) {
    console.error("[computeMonthlySnapshotLive] Penalties query error:", pErr);
  }

  // Map repayments & penalties by agreement
  const repByAgreement = new Map<string, number>();
  for (const r of rawRepayments || []) {
    const aid = r.agreement_id;
    if (aid) {
      repByAgreement.set(aid, (repByAgreement.get(aid) || 0) + Number(r.amount_paid || 0));
    }
  }

  const penByAgreement = new Map<string, number>();
  for (const p of rawPenalties || []) {
    const aid = p.agreement_id;
    if (aid && p.status !== "Reversed") {
      penByAgreement.set(aid, (penByAgreement.get(aid) || 0) + Number(p.amount || 0));
    }
  }

  // Filter agreements that belong to this period
  const entries: MonthlyReportEntry[] = [];
  let totalNewLoans = 0;
  let totalClosedLoans = 0;
  let totalActiveLoans = 0;
  let totalOverdueLoans = 0;
  let totalDefaultedLoans = 0;
  let newLoansDisbursed = 0;
  let totalRepaymentsCollected = 0;
  let totalPenaltiesCharged = 0;
  let openingPortfolioBalance = 0;
  let closingPortfolioBalance = 0;
  let expectedCollections = 0;

  for (const ag of rawAgreements || []) {
    // ── Determine the canonical start date (use user-entered start_date; fall back to created_at) ──
    const dateStr = ag.start_date && ag.start_date !== "1970-01-01" ? ag.start_date : ag.created_at;
    const agDate = new Date(dateStr);

    // Agreement hasn't started yet in this period — skip entirely
    if (agDate > periodEndDate) continue;

    const vehicle = ag.vehicle as any;
    const client = ag.client as any;
    const rawSt = (ag.status || "").toLowerCase();
    const isCashSale = Number(ag.duration_months) === 0 || ag.sale_price === ag.deposit_paid;
    const isClosed = rawSt === "completed" || rawSt === "fully paid";

    // ── Inclusion rules ─────────────────────────────────────────────────────────
    //
    // CASH SALES: Only appear in the exact month their start_date falls in.
    if (isCashSale) {
      if (agDate < periodStartDate || agDate > periodEndDate) continue;
    }
    // FULLY PAID / SETTLED HIRE-PURCHASE: Appear from their start month up to and
    // including the month their last payment was recorded. After that month they
    // fall off the ledger. We use last_payment_date (user-entered / backdated).
    else if (isClosed) {
      const lastPayStr = ag.last_payment_date;
      if (!lastPayStr) {
        // No payment date recorded — exclude from all ledgers
        continue;
      }
      const lastPayDate = new Date(lastPayStr);
      // Settlement month is the month of last_payment_date
      // Contract is visible from its start month to its settlement month (inclusive)
      if (lastPayDate < periodStartDate) {
        // Settled before this period started — no longer in this ledger
        continue;
      }
    }
    // ACTIVE / OVERDUE / DEFAULTING / LOSS: Visible from their start_date onward
    // (already filtered by agDate <= periodEndDate above)
    // No extra exclusion needed here.

    // ── Compute period metrics for this contract ────────────────────────────────
    const isNewThisPeriod = agDate >= periodStartDate && agDate <= periodEndDate;
    const amountPaid = repByAgreement.get(ag.id) || 0;
    const penaltiesThisMonth = penByAgreement.get(ag.id) || 0;

    const principal = Number(ag.principal_amount || ag.sale_price || 0);
    const currBalance = Number(ag.balance || 0);
    const monthlyDue = Number(ag.monthly_due || 0);
    const dpd = Number(ag.days_overdue || 0);

    const closingBal = isCashSale ? 0 : currBalance;
    const openingBal = isNewThisPeriod ? 0 : Math.max(0, closingBal + amountPaid - penaltiesThisMonth);

    const isLoss = rawSt === "loss" || (!isCashSale && !isClosed && dpd > 90);
    const isDefaulting = rawSt === "defaulting" || (!isCashSale && !isClosed && dpd >= 60 && dpd <= 90);
    const isOverdue = rawSt === "overdue" || (!isCashSale && !isClosed && dpd >= 7 && dpd < 60);

    let mappedStatus: string;
    if (isCashSale) mappedStatus = "Cash Sale";
    else if (isClosed) mappedStatus = "Fully Paid";
    else if (isLoss) mappedStatus = "Loss";
    else if (isDefaulting) mappedStatus = "Defaulting";
    else if (isOverdue) mappedStatus = "Overdue";
    else mappedStatus = "Active";

    // ── Accumulate report-level counters ────────────────────────────────────────
    if (isNewThisPeriod && !isCashSale) {
      totalNewLoans++;
      newLoansDisbursed += principal;
    }

    if (isClosed) {
      totalClosedLoans++;
    } else if (isCashSale) {
      // Cash sales don't count toward active/overdue financing portfolio
    } else if (isLoss || isDefaulting) {
      totalDefaultedLoans++;
      totalActiveLoans++;
    } else if (isOverdue) {
      totalOverdueLoans++;
      totalActiveLoans++;
    } else {
      totalActiveLoans++;
    }

    // Cash sales and fully-paid contracts don't carry closing receivables
    openingPortfolioBalance += openingBal;
    closingPortfolioBalance += closingBal;
    totalRepaymentsCollected += amountPaid;
    totalPenaltiesCharged += penaltiesThisMonth;
    // Only include installment-based contracts in expected collections
    if (!isCashSale && !isClosed) {
      expectedCollections += monthlyDue;
    }

    entries.push({
      id: `entry-${ag.id}-${year}-${month}`,
      reportId: `rep-${year}-${month}`,
      loanId: ag.id,
      clientId: ag.client_id || "",
      clientName: client?.full_name || "Valued Client",
      clientPhone: client?.phone || "",
      contractNo: ag.contract_no || "—",
      vehicleReg: vehicle?.registration_no || "N/A",
      vehicleMakeModel: vehicle?.make_model || "",
      depositPaid: Number(ag.deposit_paid || 0),
      loanType: isCashSale ? "Cash Sale" : "Hire Purchase",
      disbursementDate: dateStr,
      dueDate: ag.end_date || "",
      openingBalance: openingBal,
      newLoanAmount: isNewThisPeriod && !isCashSale ? principal : 0,
      amountPaidThisMonth: amountPaid,
      penaltiesThisMonth,
      closingBalance: closingBal,
      loanStatus: mappedStatus,
      daysPastDue: dpd,
      installmentAmount: monthlyDue,
    });
  }

  // Sort entries: largest closing balance first
  entries.sort((a, b) => b.closingBalance - a.closingBalance);

  const collectionRate = expectedCollections > 0
    ? Math.round((totalRepaymentsCollected / expectedCollections) * 1000) / 10
    : totalRepaymentsCollected > 0 ? 100 : 0;

  return {
    id: `rep-${year}-${month}`,
    year,
    month,
    periodLabel,
    generatedAt: new Date().toISOString(),
    generatedBy,
    totalActiveLoans,
    totalNewLoans,
    totalClosedLoans,
    totalOverdueLoans,
    totalDefaultedLoans,
    openingPortfolioBalance,
    newLoansDisbursed,
    totalRepaymentsCollected,
    totalPenaltiesCharged,
    closingPortfolioBalance,
    expectedCollections,
    actualCollections: totalRepaymentsCollected,
    collectionRate,
    entries,
  };
}

// ─── Fetch existing reports ───────────────────────────────────────────────────

export async function listMonthlyReports(): Promise<MonthlyReportRecord[]> {
  const supabase = createSupabaseAdminClient();

  // 1. Try to fetch from persistent monthly_reports table if it exists
  try {
    const { data, error } = await supabase
      .from("monthly_reports")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        year: row.year,
        month: row.month,
        periodLabel: row.period_label,
        generatedAt: row.generated_at,
        generatedBy: row.generated_by ?? "",
        totalActiveLoans: row.total_active_loans ?? 0,
        totalNewLoans: row.total_new_loans ?? 0,
        totalClosedLoans: row.total_closed_loans ?? 0,
        totalOverdueLoans: row.total_overdue_loans ?? 0,
        totalDefaultedLoans: row.total_defaulted_loans ?? 0,
        openingPortfolioBalance: row.opening_portfolio_balance ?? 0,
        newLoansDisbursed: row.new_loans_disbursed ?? 0,
        totalRepaymentsCollected: row.total_repayments_collected ?? 0,
        totalPenaltiesCharged: row.total_penalties_charged ?? 0,
        closingPortfolioBalance: row.closing_portfolio_balance ?? 0,
        expectedCollections: row.expected_collections ?? 0,
        actualCollections: row.actual_collections ?? 0,
        collectionRate: row.collection_rate ?? 0,
      }));
    }
  } catch (err) {
    // Table not created yet - fall through to dynamic calculation
  }

  // 2. Generate dynamic history for active dealership months
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const history: MonthlyReportRecord[] = [];

  // Generate last 12 months of live dealership portfolio snapshots
  for (let i = 0; i < 12; i++) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const snap = await computeMonthlySnapshotLive(y, m, "Live Engine");
    history.push({
      id: snap.id,
      year: snap.year,
      month: snap.month,
      periodLabel: snap.periodLabel,
      generatedAt: snap.generatedAt,
      generatedBy: snap.generatedBy,
      totalActiveLoans: snap.totalActiveLoans,
      totalNewLoans: snap.totalNewLoans,
      totalClosedLoans: snap.totalClosedLoans,
      totalOverdueLoans: snap.totalOverdueLoans,
      totalDefaultedLoans: snap.totalDefaultedLoans,
      openingPortfolioBalance: snap.openingPortfolioBalance,
      newLoansDisbursed: snap.newLoansDisbursed,
      totalRepaymentsCollected: snap.totalRepaymentsCollected,
      totalPenaltiesCharged: snap.totalPenaltiesCharged,
      closingPortfolioBalance: snap.closingPortfolioBalance,
      expectedCollections: snap.expectedCollections,
      actualCollections: snap.actualCollections,
      collectionRate: snap.collectionRate,
    });
  }

  return history;
}

export async function getMonthlyReport(
  year: number,
  month: number
): Promise<MonthlyReportFull | null> {
  const supabase = createSupabaseAdminClient();

  // 1. Try persistent snapshot
  try {
    const { data: report, error: rErr } = await supabase
      .from("monthly_reports")
      .select("*")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (!rErr && report) {
      const { data: entries } = await supabase
        .from("monthly_report_entries")
        .select("*")
        .eq("report_id", report.id)
        .order("closing_balance", { ascending: false });

      if (entries && entries.length > 0) {
        return {
          id: report.id,
          year: report.year,
          month: report.month,
          periodLabel: report.period_label,
          generatedAt: report.generated_at,
          generatedBy: report.generated_by ?? "",
          totalActiveLoans: report.total_active_loans ?? 0,
          totalNewLoans: report.total_new_loans ?? 0,
          totalClosedLoans: report.total_closed_loans ?? 0,
          totalOverdueLoans: report.total_overdue_loans ?? 0,
          totalDefaultedLoans: report.total_defaulted_loans ?? 0,
          openingPortfolioBalance: report.opening_portfolio_balance ?? 0,
          newLoansDisbursed: report.new_loans_disbursed ?? 0,
          totalRepaymentsCollected: rowOrZero(report.total_repayments_collected),
          totalPenaltiesCharged: rowOrZero(report.total_penalties_charged),
          closingPortfolioBalance: rowOrZero(report.closing_portfolio_balance),
          expectedCollections: rowOrZero(report.expected_collections),
          actualCollections: rowOrZero(report.actual_collections),
          collectionRate: report.collection_rate ?? 0,
          entries: entries.map((e: any) => ({
            id: e.id,
            reportId: e.report_id,
            loanId: e.loan_id,
            clientId: e.client_id,
            clientName: e.client_name ?? "",
            clientPhone: e.client_phone ?? "",
            contractNo: e.contract_no ?? "",
            vehicleReg: e.vehicle_reg ?? "",
            vehicleMakeModel: e.vehicle_make_model ?? "",
            depositPaid: Number(e.deposit_paid || 0),
            loanType: e.loan_type ?? "Hire Purchase",
            disbursementDate: e.disbursement_date ?? "",
            dueDate: e.due_date ?? "",
            openingBalance: e.opening_balance ?? 0,
            newLoanAmount: e.new_loan_amount ?? 0,
            amountPaidThisMonth: e.amount_paid_this_month ?? 0,
            penaltiesThisMonth: e.penalties_this_month ?? 0,
            closingBalance: e.closing_balance ?? 0,
            loanStatus: e.loan_status ?? "Active",
            daysPastDue: e.days_past_due ?? 0,
            installmentAmount: e.installment_amount ?? 0,
          })),
        };
      }
    }
  } catch (err) {
    // Ignore and calculate dynamically
  }

  // 2. Compute live snapshot from DMS tables
  return computeMonthlySnapshotLive(year, month, "Certified Snapshot");
}

function rowOrZero(val: any): number {
  return typeof val === "number" ? val : Number(val || 0);
}

// ─── Snapshot Generator / Persist Action ──────────────────────────────────────

export async function generateMonthlySnapshot(
  input: GenerateMonthlyReportInput
): Promise<MonthlyReportRecord> {
  const { year, month, generatedBy } = input;
  const snapshot = await computeMonthlySnapshotLive(year, month, generatedBy);
  const supabase = createSupabaseAdminClient();

  // Attempt to persist to database if tables are available
  try {
    const { data: existing } = await supabase
      .from("monthly_reports")
      .select("id")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (existing) {
      await supabase.from("monthly_report_entries").delete().eq("report_id", existing.id);
      await supabase.from("monthly_reports").delete().eq("id", existing.id);
    }

    const { data: savedReport } = await supabase
      .from("monthly_reports")
      .insert({
        year,
        month,
        period_label: snapshot.periodLabel,
        generated_by: generatedBy,
        total_active_loans: snapshot.totalActiveLoans,
        total_new_loans: snapshot.totalNewLoans,
        total_closed_loans: snapshot.totalClosedLoans,
        total_overdue_loans: snapshot.totalOverdueLoans,
        total_defaulted_loans: snapshot.totalDefaultedLoans,
        opening_portfolio_balance: snapshot.openingPortfolioBalance,
        new_loans_disbursed: snapshot.newLoansDisbursed,
        total_repayments_collected: snapshot.totalRepaymentsCollected,
        total_penalties_charged: snapshot.totalPenaltiesCharged,
        closing_portfolio_balance: snapshot.closingPortfolioBalance,
        expected_collections: snapshot.expectedCollections,
        actual_collections: snapshot.actualCollections,
        collection_rate: snapshot.collectionRate,
      })
      .select()
      .maybeSingle();

    if (savedReport && snapshot.entries.length > 0) {
      await supabase.from("monthly_report_entries").insert(
        snapshot.entries.map((e) => ({
          report_id: savedReport.id,
          loan_id: e.loanId,
          client_id: e.clientId,
          client_name: e.clientName,
          client_phone: e.clientPhone,
          contract_no: e.contractNo,
          vehicle_reg: e.vehicleReg,
          vehicle_make_model: e.vehicleMakeModel,
          loan_type: e.loanType,
          disbursement_date: e.disbursementDate || null,
          due_date: e.dueDate || null,
          opening_balance: e.openingBalance,
          new_loan_amount: e.newLoanAmount,
          amount_paid_this_month: e.amountPaidThisMonth,
          penalties_this_month: e.penaltiesThisMonth,
          closing_balance: e.closingBalance,
          loan_status: e.loanStatus,
          days_past_due: e.daysPastDue,
          installment_amount: e.installmentAmount,
        }))
      );
    }
  } catch (err) {
    console.warn("[generateMonthlySnapshot] Could not persist to table (computed in-memory):", err);
  }

  return {
    id: snapshot.id,
    year: snapshot.year,
    month: snapshot.month,
    periodLabel: snapshot.periodLabel,
    generatedAt: snapshot.generatedAt,
    generatedBy: snapshot.generatedBy,
    totalActiveLoans: snapshot.totalActiveLoans,
    totalNewLoans: snapshot.totalNewLoans,
    totalClosedLoans: snapshot.totalClosedLoans,
    totalOverdueLoans: snapshot.totalOverdueLoans,
    totalDefaultedLoans: snapshot.totalDefaultedLoans,
    openingPortfolioBalance: snapshot.openingPortfolioBalance,
    newLoansDisbursed: snapshot.newLoansDisbursed,
    totalRepaymentsCollected: snapshot.totalRepaymentsCollected,
    totalPenaltiesCharged: snapshot.totalPenaltiesCharged,
    closingPortfolioBalance: snapshot.closingPortfolioBalance,
    expectedCollections: snapshot.expectedCollections,
    actualCollections: snapshot.actualCollections,
    collectionRate: snapshot.collectionRate,
  };
}
