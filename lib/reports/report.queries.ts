/**
 * Elelyon LMS — Report Query Layer
 *
 * All aggregated Supabase queries for the reporting module.
 * Uses the admin client (service-role). No UI logic here.
 *
 * Schema facts:
 *   - Payments / repayments are stored in loan_transactions (type = 'Repayment')
 *   - Penalties are stored in loan_transactions (type = 'Manual Penalty')
 *   - Waivers are stored in loan_transactions (type = 'Waiver')
 *   - Loan statuses: Pending, Active, Overdue, Fully Paid, Written Off, Loss, Denied
 *   - lifecycle_state: Standard, Rollover, Restructured
 */

import { createSupabaseAdminClient } from "../supabase";
import type {
  PortfolioSummary,
  CollectionSummary,
  CollectionReportRow,
  ArrearsSummary,
  ArrearsRow,
  ArrearsBucket,
  CashFlowReport,
  CashFlowMonth,
  PenaltySummary,
  PenaltyReportRow,
  AuditLogReport,
  LoanStatementData,
  ReportFilters,
  IncomeStatementReport,
  IncomeMonth,
  PARReport,
  PARRow,
  LoanOfficerReport,
  OfficerRow,
  VintageAnalysisReport,
  VintageCohort,
  DealershipBusinessReport,
  DealershipExpenseCategory,
  DealershipVehicleCostType,
  TopCostVehicleItem,
  DealershipLedgerItem,
  VehicleStatusBreakdownItem,
  AtRiskDebtorItem,
  DealershipActionableInsight,
} from "./report.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ["Active", "Overdue", "Substandard", "Loss"];
const DISBURSED_STATUSES = ["Active", "Overdue", "Substandard", "Loss", "Fully Paid", "Written Off"];

function periodBounds(dateFrom?: string, dateTo?: string) {
  const from = dateFrom ? new Date(dateFrom) : new Date("2000-01-01");
  const to = dateTo ? new Date(dateTo) : new Date();
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function arrearsBucket(days: number): ArrearsBucket {
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

// ─── Portfolio Summary ────────────────────────────────────────────────────────

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const supabase = createSupabaseAdminClient();

  const { data: loans, error } = await supabase
    .from("loans")
    .select(
      "status, lifecycle_state, principal_amount, total_payable, balance, total_interest, remaining_penalties, is_high_risk, days_past_due"
    );

  if (error) throw error;

  const summary: PortfolioSummary = {
    totalLoans: 0,
    pendingLoans: 0,
    activeLoans: 0,
    overdueLoans: 0,
    fullyPaidLoans: 0,
    writtenOffLoans: 0,
    lossLoans: 0,
    deniedLoans: 0,
    highRiskLoans: 0,
    standardLoans: 0,
    rolloverLoans: 0,
    restructuredLoans: 0,
    totalDisbursed: 0,
    totalOutstanding: 0,
    totalInterestEarned: 0,
    totalPenaltiesOutstanding: 0,
    collectionRate: 0,
    par30: 0,
    par60: 0,
    par90: 0,
  };

  let totalPayable = 0;
  let totalRepaid = 0;
  let totalPortfolioBalance = 0;
  let par30Balance = 0;
  let par60Balance = 0;
  let par90Balance = 0;

  for (const loan of loans ?? []) {
    summary.totalLoans++;
    if (loan.is_high_risk) summary.highRiskLoans++;

    // Status counts
    switch (loan.status) {
      case "Pending":     summary.pendingLoans++;    break;
      case "Active":      
        summary.activeLoans++;     
        if ((loan.days_past_due ?? 0) > 0) summary.overdueLoans++;
        break;
      case "Substandard": 
        if ((loan.days_past_due ?? 0) > 0) summary.overdueLoans++;
        break;
      case "Loss":        
        summary.lossLoans++;       
        if ((loan.days_past_due ?? 0) > 0) summary.overdueLoans++;
        break;
      case "Fully Paid":  summary.fullyPaidLoans++;  break;
      case "Written Off": summary.writtenOffLoans++; break;
      case "Denied":      summary.deniedLoans++;     break;
    }

    // Lifecycle counts
    switch (loan.lifecycle_state) {
      case "Standard":     summary.standardLoans++;     break;
      case "Rollover":     summary.rolloverLoans++;     break;
      case "Restructured": summary.restructuredLoans++; break;
    }

    // Financial aggregates for disbursed loans
    if (DISBURSED_STATUSES.includes(loan.status)) {
      summary.totalDisbursed += loan.principal_amount ?? 0;
      summary.totalInterestEarned += loan.total_interest ?? 0;
      summary.totalPenaltiesOutstanding += loan.remaining_penalties ?? 0;
      totalPayable += loan.total_payable ?? 0;
      totalRepaid += (loan.total_payable ?? 0) - (loan.balance ?? 0);
    }

    // Outstanding balance (active portfolio)
    if (ACTIVE_STATUSES.includes(loan.status)) {
      const bal = loan.balance ?? 0;
      summary.totalOutstanding += bal;
      totalPortfolioBalance += bal;
      const dpd = loan.days_past_due ?? 0;
      if (dpd >= 30) par30Balance += bal;
      if (dpd >= 60) par60Balance += bal;
      if (dpd >= 90) par90Balance += bal;
    }
  }

  summary.collectionRate =
    totalPayable > 0 ? Math.round((totalRepaid / totalPayable) * 10000) / 100 : 0;

  if (totalPortfolioBalance > 0) {
    summary.par30 = Math.round((par30Balance / totalPortfolioBalance) * 10000) / 100;
    summary.par60 = Math.round((par60Balance / totalPortfolioBalance) * 10000) / 100;
    summary.par90 = Math.round((par90Balance / totalPortfolioBalance) * 10000) / 100;
  }

  return summary;
}

// ─── Collection Report ────────────────────────────────────────────────────────

export async function getCollectionReport(
  filters: ReportFilters = {}
): Promise<CollectionSummary> {
  const supabase = createSupabaseAdminClient();
  const { from, to } = periodBounds(filters.dateRange?.from, filters.dateRange?.to);

  // Fetch repayment transactions in the period from the DMS table (repayments)
  let txQuery = supabase
    .from("repayments")
    .select("agreement_id, amount_paid, payment_date")
    .neq("payment_method", "Waiver") // Exclude waivers if they shouldn't count as cash collected
    .gte("payment_date", from)
    .lte("payment_date", to);

  const { data: transactions, error: txErr } = await txQuery;
  if (txErr) throw txErr;

  // Aggregate by agreement (loan)
  const repByLoan = new Map<string, number>();
  const lastPayByLoan = new Map<string, string>();
  for (const t of transactions ?? []) {
    repByLoan.set(t.agreement_id, (repByLoan.get(t.agreement_id) ?? 0) + (t.amount_paid || 0));
    const prev = lastPayByLoan.get(t.agreement_id);
    if (!prev || t.payment_date > prev) lastPayByLoan.set(t.agreement_id, t.payment_date);
  }

  // Fetch all active/relevant agreements from financing_agreements (the DMS core table)
  const { data: agreements, error: lErr } = await supabase
    .from("financing_agreements")
    .select(
      "id, client_id, contract_no, principal_amount, duration_months, balance, status, start_date, end_date, deposit_paid, created_at, monthly_due"
    )
    .not("status", "eq", "draft")
    .order("start_date", { ascending: false, nullsFirst: false });

  if (lErr) throw lErr;

  const clientIds = [...new Set((agreements ?? []).map((l) => l.client_id))];
  let clientMap: Record<string, string> = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, full_name")
      .in("id", clientIds);
    (clients ?? []).forEach((c) => {
      clientMap[c.id] = c.full_name;
    });
  }

  let totalExpected = 0;
  let totalRepayments = 0;
  let totalDepositsInPeriod = 0;
  const rows: CollectionReportRow[] = [];

  for (const ag of agreements ?? []) {
    const totalRepaid = repByLoan.get(ag.id) ?? 0;
    
    // Check if deposit/cash-sale falls in this period.
    // Use start_date as the authoritative date (the user-specified/backdated agreement date).
    // Fall back to created_at only when start_date is absent or is the epoch placeholder.
    let depositInPeriod = 0;
    if (ag.deposit_paid && ag.deposit_paid > 0) {
        const rawDate = ag.start_date && ag.start_date !== '1970-01-01'
          ? ag.start_date
          : ag.created_at;
        const agDate = new Date(rawDate).getTime();
        const fromDate = new Date(from).getTime();
        const toDate = new Date(to).getTime();
        if (agDate >= fromDate && agDate <= toDate) {
           depositInPeriod = ag.deposit_paid;
        }
    }

    // Skip if there's no collection activity for this agreement in the period
    if (totalRepaid === 0 && depositInPeriod === 0) {
      continue;
    }

    const installmentAmount = ag.monthly_due || 0;
    
    totalDepositsInPeriod += depositInPeriod;
    totalRepayments += totalRepaid;
    totalExpected += installmentAmount;

    rows.push({
      loanId: ag.id,
      clientName: clientMap[ag.client_id] ?? "Unknown",
      loanType: ag.contract_no ?? "—",
      lifecycleState: "Standard",
      principalAmount: ag.principal_amount ?? 0,
      installmentAmount,
      totalRepaid: totalRepaid + depositInPeriod,
      balance: ag.balance ?? 0,
      status: 
        (ag.status || '').toLowerCase() === 'active' ? 'Active' : 
        (ag.status || '').toLowerCase() === 'completed' ? 'Fully Paid' : 
        ['defaulted', 'overdue'].includes((ag.status || '').toLowerCase()) ? 'Overdue' : 
        (ag.status ? ag.status.charAt(0).toUpperCase() + ag.status.slice(1) : 'Pending'),
      lastPaymentDate: lastPayByLoan.get(ag.id) ?? null,
      dueDate: ag.end_date ?? null,
    });
  }

  const totalCollected = totalDepositsInPeriod + totalRepayments;
  const collectionRate =
    totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 10000) / 100 : 0;

  return {
    period: `${filters.dateRange?.from ?? "All time"} – ${filters.dateRange?.to ?? "Today"}`,
    totalExpected,
    totalCollected,
    totalDeposits: totalDepositsInPeriod,
    totalRepayments,
    collectionRate,
    rows,
  };
}

// ─── Arrears / Delinquency Report ─────────────────────────────────────────────

export async function getArrearsReport(): Promise<ArrearsSummary> {
  const supabase = createSupabaseAdminClient();

  // Query financing_agreements — the DMS core table for this business.
  // Overdue agreements are identified by days_overdue > 0 and an active/problem status.
  const { data: agreements, error } = await supabase
    .from("financing_agreements")
    .select(
      `id, client_id, contract_no, principal_amount, balance, end_date,
       days_overdue, aging_bucket, total_penalties, status,
       vehicle:vehicles(registration_no, make_model)`
    )
    .not("status", "in", '("completed","cash sale","Cash Sale","Denied","Written Off","written off")')
    .gt("days_overdue", 0)
    .order("days_overdue", { ascending: false });

  if (error) throw error;

  const clientIds = [...new Set((agreements ?? []).map((l: any) => l.client_id))];
  let clientMap: Record<string, { name: string; phone: string }> = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, full_name, phone")
      .in("id", clientIds);
    (clients ?? []).forEach((c: any) => {
      clientMap[c.id] = { name: c.full_name ?? "Unknown", phone: c.phone ?? "" };
    });
  }

  const summary: ArrearsSummary = {
    bucket1_30:  { count: 0, totalBalance: 0 },
    bucket31_60: { count: 0, totalBalance: 0 },
    bucket61_90: { count: 0, totalBalance: 0 },
    bucket90plus: { count: 0, totalBalance: 0 },
    totalOverdue: 0,
    totalPenalties: 0,
    rows: [],
  };

  for (const ag of agreements ?? []) {
    const daysPastDue = Number(ag.days_overdue ?? 0);
    const bucket = arrearsBucket(daysPastDue);
    const client = clientMap[ag.client_id] ?? { name: "Unknown", phone: "" };
    const vehicle = (ag.vehicle as any);
    const balance = Number(ag.balance ?? 0);
    if (balance <= 0) continue;
    const penalties = Number(ag.total_penalties ?? 0);

    // Normalise the status label
    const rawSt = (ag.status || '').toLowerCase();
    let status = 'Overdue';
    if (rawSt === 'loss' || daysPastDue > 90) status = 'Loss';
    else if (rawSt === 'defaulting' || (daysPastDue >= 60 && daysPastDue <= 90)) status = 'Defaulting';
    else if (rawSt === 'substandard' || (daysPastDue > 30 && daysPastDue < 60)) status = 'Substandard';

    const row: ArrearsRow = {
      loanId: ag.id,
      clientName: client.name,
      clientPhone: client.phone,
      contractNo: ag.contract_no ?? "—",
      vehicleReg: vehicle?.registration_no ?? "N/A",
      agingBucket: ag.aging_bucket ?? `${daysPastDue} days`,
      principalAmount: Number(ag.principal_amount ?? 0),
      balance,
      dueDate: ag.end_date ?? "",
      daysPastDue,
      bucket,
      penaltyAccrued: penalties,
      status,
    };

    summary.rows.push(row);
    summary.totalOverdue  += balance;
    summary.totalPenalties += penalties;

    if (bucket === "1-30")  { summary.bucket1_30.count++;  summary.bucket1_30.totalBalance  += balance; }
    else if (bucket === "31-60") { summary.bucket31_60.count++; summary.bucket31_60.totalBalance += balance; }
    else if (bucket === "61-90") { summary.bucket61_90.count++; summary.bucket61_90.totalBalance += balance; }
    else                         { summary.bucket90plus.count++; summary.bucket90plus.totalBalance += balance; }
  }

  return summary;
}

// ─── Cash Flow Report ────────────────────────────────────────────────────────

export async function getCashFlowReport(monthsBack = 12): Promise<CashFlowReport> {
  const supabase = createSupabaseAdminClient();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - (monthsBack - 1));
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const [loansRes, txRes] = await Promise.all([
    supabase
      .from("loans")
      .select("start_date, principal_amount")
      .in("status", DISBURSED_STATUSES)
      .gte("start_date", startDate.toISOString()),
    supabase
      .from("loan_transactions")
      .select("date, amount")
      .eq("type", "Repayment")
      .neq("status", "Reversed")
      .gte("date", startDate.toISOString()),
  ]);

  // Build month buckets
  const months: CashFlowMonth[] = [];
  const now = new Date();
  const bucketMap = new Map<string, CashFlowMonth>();

  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(startDate);
    d.setMonth(startDate.getMonth() + i);
    if (d > now) break;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket: CashFlowMonth = {
      label: d.toLocaleDateString("en-KE", { month: "short", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      disbursed: 0,
      collected: 0,
      netFlow: 0,
    };
    months.push(bucket);
    bucketMap.set(key, bucket);
  }

  for (const loan of loansRes.data ?? []) {
    const d = new Date(loan.start_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = bucketMap.get(key);
    if (b) b.disbursed += loan.principal_amount ?? 0;
  }

  for (const tx of txRes.data ?? []) {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = bucketMap.get(key);
    if (b) b.collected += tx.amount ?? 0;
  }

  let totalDisbursed = 0;
  let totalCollected = 0;
  for (const m of months) {
    m.netFlow = m.collected - m.disbursed;
    totalDisbursed += m.disbursed;
    totalCollected += m.collected;
  }

  return { months, totalDisbursed, totalCollected, netCashFlow: totalCollected - totalDisbursed };
}

// ─── Penalty / Waiver Report ──────────────────────────────────────────────────

export async function getPenaltySummary(
  filters: ReportFilters = {}
): Promise<PenaltySummary> {
  const supabase = createSupabaseAdminClient();

  // Query DMS penalties table with joins to financing_agreements and clients
  let query = supabase
    .from("penalties")
    .select(
      `id, agreement_id, client_id, amount, penalty_type, comment, status, date_applied, created_at,
       agreement:financing_agreements(id, contract_no, balance, days_overdue, vehicle:vehicles(registration_no, make_model)),
       client:clients(id, full_name, phone)`
    );

  if (filters.dateRange?.from) {
    query = query.gte("date_applied", filters.dateRange.from);
  }
  if (filters.dateRange?.to) {
    const toDate = filters.dateRange.to.includes("T")
      ? filters.dateRange.to
      : `${filters.dateRange.to}T23:59:59.999Z`;
    query = query.lte("date_applied", toDate);
  }

  const { data: penalties, error } = await query.order("date_applied", { ascending: false });
  if (error) {
    console.error("[getPenaltySummary] Error querying penalties:", error);
    throw error;
  }

  let totalCharged = 0;
  let totalReversed = 0;
  let chargedCount = 0;
  let reversedCount = 0;
  const rows: PenaltyReportRow[] = [];
  const uniqueAgreements = new Set<string>();

  for (const p of penalties ?? []) {
    const amt = Number(p.amount || 0);
    const st = (p.status || "Active").trim();
    const isReversed = st.toLowerCase() === "reversed";

    if (isReversed) {
      totalReversed += amt;
      reversedCount++;
    } else {
      totalCharged += amt;
      chargedCount++;
    }

    if (p.agreement_id) {
      uniqueAgreements.add(p.agreement_id);
    }

    const ag = p.agreement as any;
    const cl = p.client as any;
    const vehicle = ag?.vehicle as any;

    rows.push({
      penaltyId: p.id,
      loanId: p.agreement_id || "",
      clientName: cl?.full_name || "Unknown Client",
      clientPhone: cl?.phone || "",
      contractNo: ag?.contract_no || "—",
      vehicleReg: vehicle?.registration_no || "N/A",
      vehicleMakeModel: vehicle?.make_model || "",
      penaltyType: p.penalty_type || "Late Payment",
      amount: amt,
      status: isReversed ? "Reversed" : "Active",
      dateApplied: p.date_applied || p.created_at || new Date().toISOString(),
      appliedBy: "System / Officer",
      comment: p.comment || "",
      agreementBalance: ag?.balance !== undefined ? Number(ag.balance) : undefined,
    });
  }

  return {
    totalCharged,
    totalReversed,
    totalOutstanding: totalCharged - totalReversed,
    chargedCount,
    reversedCount,
    uniqueAgreementsCount: uniqueAgreements.size,
    rows,
  };
}

// ─── Income Statement ─────────────────────────────────────────────────────────

export async function getIncomeStatement(
  filters: ReportFilters = {}
): Promise<IncomeStatementReport> {
  const supabase = createSupabaseAdminClient();
  const { from, to } = periodBounds(filters.dateRange?.from, filters.dateRange?.to);

  // Month buckets map
  const bucketMap = new Map<string, IncomeMonth>();

  const addMonth = (dateStr?: string | null) => {
    if (!dateStr || dateStr.startsWith("1970")) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        label: d.toLocaleDateString("en-KE", { month: "short", year: "numeric" }),
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        interest: 0,
        penalties: 0,
        margin: 0,
        waivers: 0,
        expenses: 0,
        net: 0,
      });
    }
    return bucketMap.get(key);
  };

  // 1. Fetch Repayments from DMS table
  let repQuery = supabase
    .from("repayments")
    .select("amount_paid, payment_date, created_at")
    .gt("amount_paid", 0);

  if (filters.dateRange?.from) repQuery = repQuery.gte("payment_date", from);
  if (filters.dateRange?.to)   repQuery = repQuery.lte("payment_date", to);

  const { data: repayments, error: repErr } = await repQuery;
  if (repErr) console.error("[getIncomeStatement] Repayments query error:", repErr);

  let interestCollected = 0;
  for (const r of repayments ?? []) {
    const amt = Number(r.amount_paid || 0);
    interestCollected += amt;
    const m = addMonth(r.payment_date) || addMonth(r.created_at);
    if (m) m.interest += amt;
  }

  // 2. Fetch Penalties from DMS table
  let penQuery = supabase
    .from("penalties")
    .select("amount, status, date_applied, created_at");

  if (filters.dateRange?.from) penQuery = penQuery.gte("date_applied", from);
  if (filters.dateRange?.to) {
    const toDate = to.includes("T") ? to : `${to}T23:59:59.999Z`;
    penQuery = penQuery.lte("date_applied", toDate);
  }

  const { data: penalties, error: penErr } = await penQuery;
  if (penErr) console.error("[getIncomeStatement] Penalties query error:", penErr);

  let penaltyRevenue = 0;
  let waiverAmount = 0;

  for (const p of penalties ?? []) {
    const amt = Number(p.amount || 0);
    const m = addMonth(p.date_applied) || addMonth(p.created_at);
    const st = (p.status || "Active").toLowerCase();

    if (st === "reversed") {
      waiverAmount += amt;
      if (m) m.waivers += amt;
    } else {
      penaltyRevenue += amt;
      if (m) m.penalties += amt;
    }
  }

  // 3. Fetch General Expenses
  let expQuery = supabase
    .from("expenses")
    .select("amount, expense_date, created_at");

  if (filters.dateRange?.from) expQuery = expQuery.gte("expense_date", from);
  if (filters.dateRange?.to)   expQuery = expQuery.lte("expense_date", to);

  const { data: expenses, error: expErr } = await expQuery;
  if (expErr) console.error("[getIncomeStatement] Expenses query error:", expErr);

  let operatingExpenses = 0;
  for (const exp of expenses ?? []) {
    const amt = Number(exp.amount || 0);
    operatingExpenses += amt;
    const m = addMonth(exp.expense_date) || addMonth(exp.created_at);
    if (m) m.expenses += amt;
  }

  // 4. Fetch Vehicle Yard Preparation & Reconditioning Costs
  let vcQuery = supabase
    .from("vehicle_costs")
    .select("amount, incurred_date, created_at");

  if (filters.dateRange?.from) vcQuery = vcQuery.gte("incurred_date", from);
  if (filters.dateRange?.to)   vcQuery = vcQuery.lte("incurred_date", to);

  const { data: vehicleCosts, error: vcErr } = await vcQuery;
  if (vcErr) console.error("[getIncomeStatement] VehicleCosts query error:", vcErr);

  for (const vc of vehicleCosts ?? []) {
    const amt = Number(vc.amount || 0);
    operatingExpenses += amt;
    const m = addMonth(vc.incurred_date) || addMonth(vc.created_at);
    if (m) m.expenses += amt;
  }

  // 5. Fetch Trading Margins from financing_agreements joined with vehicles
  let agQuery = supabase
    .from("financing_agreements")
    .select(`
      sale_price,
      deposit_paid,
      start_date,
      created_at,
      vehicle:vehicles (
        purchase_price,
        sale_price
      )
    `)
    .not("status", "in", '("draft","Denied")');

  if (filters.dateRange?.from) {
    agQuery = agQuery.gte("created_at", from);
  }
  if (filters.dateRange?.to) {
    const toDate = to.includes("T") ? to : `${to}T23:59:59.999Z`;
    agQuery = agQuery.lte("created_at", toDate);
  }

  const { data: agreements, error: agErr } = await agQuery;
  if (agErr) console.error("[getIncomeStatement] FinancingAgreements query error:", agErr);

  let tradingMargin = 0;
  for (const ag of agreements ?? []) {
    const v = ag.vehicle as any;
    const purchase = Number(v?.purchase_price || 0);
    const sale = Number(ag.sale_price || v?.sale_price || 0);

    if (purchase > 0 && sale > purchase) {
      const margin = sale - purchase;
      tradingMargin += margin;
      const agDate = ag.start_date && ag.start_date !== "1970-01-01" ? ag.start_date : ag.created_at;
      const m = addMonth(agDate);
      if (m) m.margin += margin;
    }
  }

  const months = Array.from(bucketMap.values())
    .sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month))
    .map((m) => ({
      ...m,
      net: m.interest + m.penalties + m.margin - m.waivers - m.expenses,
    }));

  const totalRevenue = interestCollected + penaltyRevenue + tradingMargin;
  const netIncome = totalRevenue - waiverAmount - operatingExpenses;

  return {
    period: `${filters.dateRange?.from ?? "All time"} – ${filters.dateRange?.to ?? "Today"}`,
    interestCollected,
    penaltyRevenue,
    tradingMargin,
    totalRevenue,
    waiverAmount,
    operatingExpenses,
    netIncome,
    months,
  };
}

// ─── PAR (Portfolio At Risk) Report ──────────────────────────────────────────

export async function getPARReport(): Promise<PARReport> {
  const supabase = createSupabaseAdminClient();

  const { data: loans, error } = await supabase
    .from("loans")
    .select(
      "id, client_id, loan_type, lifecycle_state, principal_amount, balance, days_past_due, status"
    )
    .in("status", ["Active", "Overdue", "Substandard", "Written Off", "Loss"]);

  if (error) throw error;

  const clientIds = [...new Set((loans ?? []).map((l) => l.client_id))];
  let clientMap: Record<string, { name: string; phone: string }> = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, full_name, phone")
      .in("id", clientIds);
    (clients ?? []).forEach((c) => {
      clientMap[c.id] = { name: c.full_name ?? "", phone: c.phone ?? "" };
    });
  }

  let totalPortfolioBalance = 0;
  let par1Balance = 0;
  let par30Balance = 0;
  let par60Balance = 0;
  let par90Balance = 0;
  let writtenOffBalance = 0;
  let lossBalance = 0;
  const rows: PARRow[] = [];

  for (const loan of loans ?? []) {
    const bal = loan.balance ?? 0;
    const dpd = loan.days_past_due ?? 0;
    const client = clientMap[loan.client_id] ?? { name: "Unknown", phone: "" };

    if (loan.status === "Written Off") {
      writtenOffBalance += bal;
    } else {
      totalPortfolioBalance += bal;
      
      if (loan.status === "Loss") {
        lossBalance += bal;
      }
      
      if (dpd >= 1)  par1Balance  += bal;
      if (dpd >= 30) par30Balance += bal;
      if (dpd >= 60) par60Balance += bal;
      if (dpd >= 90) par90Balance += bal;
    }

    let riskBucket = "Performing";
    if (loan.status === "Written Off") riskBucket = "Written Off";
    else if (loan.status === "Loss") riskBucket = "Loss";
    else if (dpd >= 90) riskBucket = "90+ DPD";
    else if (dpd >= 60) riskBucket = "61–90 DPD";
    else if (dpd >= 30) riskBucket = "31–60 DPD";
    else if (dpd >= 1)  riskBucket = "1–30 DPD";

    rows.push({
      loanId: loan.id,
      clientName: client.name,
      clientPhone: client.phone,
      loanType: loan.loan_type ?? "—",
      lifecycleState: loan.lifecycle_state ?? "Standard",
      principalAmount: loan.principal_amount ?? 0,
      balance: bal,
      daysPastDue: dpd,
      status: loan.status,
      riskBucket,
    });
  }

  const pct = (v: number) =>
    totalPortfolioBalance > 0 ? Math.round((v / totalPortfolioBalance) * 10000) / 100 : 0;

  rows.sort((a, b) => b.daysPastDue - a.daysPastDue);

  return {
    totalPortfolioBalance,
    par1Balance,
    par30Balance,
    par60Balance,
    par90Balance,
    par1Rate:  pct(par1Balance),
    par30Rate: pct(par30Balance),
    par60Rate: pct(par60Balance),
    par90Rate: pct(par90Balance),
    writtenOffBalance,
    lossBalance,
    rows,
  };
}

// ─── Loan Officer Performance ─────────────────────────────────────────────────

export async function getLoanOfficerReport(): Promise<LoanOfficerReport> {
  const supabase = createSupabaseAdminClient();

  const { data: loans, error: lErr } = await supabase
    .from("loans")
    .select(
      "id, created_by, principal_amount, balance, status, total_payable, duration_in_months"
    )
    .in("status", [...DISBURSED_STATUSES, "Pending", "Denied"]);

  if (lErr) throw lErr;

  // Aggregate collections per loan
  const { data: txns, error: tErr } = await supabase
    .from("loan_transactions")
    .select("loan_id, amount")
    .eq("type", "Repayment")
    .neq("status", "Reversed");

  if (tErr) throw tErr;

  const repByLoan = new Map<string, number>();
  for (const t of txns ?? []) {
    repByLoan.set(t.loan_id, (repByLoan.get(t.loan_id) ?? 0) + t.amount);
  }

  const officerMap = new Map<string, OfficerRow>();

  for (const loan of loans ?? []) {
    const officer = loan.created_by ?? "Unknown";
    if (!officerMap.has(officer)) {
      officerMap.set(officer, {
        officerName: officer,
        totalOriginated: 0,
        totalDisbursed: 0,
        activeCount: 0,
        overdueCount: 0,
        fullyPaidCount: 0,
        writtenOffCount: 0,
        lossCount: 0,
        totalCollected: 0,
        collectionRate: 0,
      });
    }
    const row = officerMap.get(officer)!;
    row.totalOriginated++;

    if (DISBURSED_STATUSES.includes(loan.status)) {
      row.totalDisbursed += loan.principal_amount ?? 0;
      row.totalCollected += repByLoan.get(loan.id) ?? 0;
    }

    switch (loan.status) {
      case "Active":      row.activeCount++;     break;
      case "Overdue":     row.overdueCount++;    break;
      case "Fully Paid":  row.fullyPaidCount++;  break;
      case "Written Off": row.writtenOffCount++; break;
      case "Loss":        row.lossCount++;       break;
    }
  }

  const officers = Array.from(officerMap.values()).map((o) => ({
    ...o,
    collectionRate:
      o.totalDisbursed > 0
        ? Math.round((o.totalCollected / o.totalDisbursed) * 10000) / 100
        : 0,
  })).sort((a, b) => b.totalDisbursed - a.totalDisbursed);

  return {
    officers,
    totalLoans: loans?.length ?? 0,
    totalDisbursed: officers.reduce((s, o) => s + o.totalDisbursed, 0),
  };
}

// ─── Audit Log Report ─────────────────────────────────────────────────────────

export async function getAuditLogReport(
  filters: ReportFilters = {}
): Promise<AuditLogReport> {
  const supabase = createSupabaseAdminClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("audit_logs")
    .select("id, loan_id, action, performed_by, description, previous_value, new_value, timestamp", {
      count: "exact",
    })
    .order("timestamp", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters.dateRange?.from) query = query.gte("timestamp", filters.dateRange.from);
  if (filters.dateRange?.to)   query = query.lte("timestamp", filters.dateRange.to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    rows: (data ?? []).map((row) => ({
      id: row.id,
      loanId: row.loan_id ?? "",
      action: row.action,
      performedBy: row.performed_by,
      description: row.description ?? "",
      previousValue: row.previous_value,
      newValue: row.new_value,
      timestamp: row.timestamp,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

// ─── Loan Statement (client-facing) ──────────────────────────────────────────

export async function getLoanStatementData(loanId: string): Promise<LoanStatementData | null> {
  const supabase = createSupabaseAdminClient();

  const { data: loan, error: lErr } = await supabase
    .from("loans")
    .select("*, clients(full_name, email, phone, client_id_number)")
    .eq("id", loanId)
    .single();

  if (lErr || !loan) return null;

  const [txRes, penRes] = await Promise.all([
    supabase
      .from("loan_transactions")
      .select("id, date, amount, type, payment_method, reference_id, comment, status")
      .eq("loan_id", loanId)
      .in("type", ["Repayment", "Waiver"])
      .neq("status", "Reversed")
      .order("date", { ascending: true }),
    supabase
      .from("loan_transactions")
      .select("id, date, amount, type, status, comment")
      .eq("loan_id", loanId)
      .in("type", ["Manual Penalty"])
      .order("date", { ascending: false }),
  ]);

  const client = (loan as any).clients;
  const repayments = txRes.data ?? [];
  const penaltyTxns = penRes.data ?? [];

  // Build running balance
  let runningBalance = loan.total_payable ?? 0;
  const repaymentRows = repayments.map((r) => {
    runningBalance -= r.amount;
    return {
      id: r.id,
      date: r.date,
      amount: r.amount,
      paymentMethod: r.payment_method ?? "—",
      referenceId: r.reference_id,
      runningBalance: Math.max(0, runningBalance),
    };
  });

  const totalPaid = repayments.reduce((s, r) => s + r.amount, 0);
  const totalPenaltiesPaid = penaltyTxns
    .filter((p) => p.status === "Reversed")
    .reduce((s, p) => s + p.amount, 0);
  const remainingBalance = loan.balance ?? 0;
  const progressPercent = Math.min(100, (totalPaid / (loan.total_payable || 1)) * 100);

  return {
    loan: {
      id: loan.id,
      clientName: client?.full_name || `${client?.first_name || ''} ${client?.last_name || ''}`.trim() || "Unknown",
      clientPhone: client?.phone ?? "",
      clientEmail: client?.email ?? "",
      nationalId: client?.client_id_number ?? client?.national_id ?? "",
      loanType: loan.loan_type ?? "Loan",
      lifecycleState: loan.lifecycle_state ?? "Standard",
      principalAmount: loan.principal_amount ?? 0,
      interestRate: loan.interest_rate ?? 0,
      interestType: loan.interest_type ?? "Flat",
      durationInMonths: loan.duration_in_months ?? 0,
      totalInterest: loan.total_interest ?? 0,
      totalPayable: loan.total_payable ?? 0,
      startDate: loan.start_date ?? "",
      dueDate: loan.due_date ?? "",
      status: loan.status ?? "Unknown",
      balance: loan.balance ?? 0,
      penaltyAccrued: loan.remaining_penalties ?? 0,
      installmentAmount: (loan.total_payable || 0) / Math.ceil(loan.duration_in_months || 1),
      daysPastDue: loan.days_past_due ?? 0,
      securities: loan.securities,
      guarantorName: loan.guarantor_name,
    },
    repayments: repaymentRows,
    penalties: penaltyTxns.map((p) => ({
      id: p.id,
      dateApplied: p.date,
      amount: p.amount,
      penaltyType: p.type,
      status: p.status,
      comment: p.comment,
    })),
    summary: { totalPaid, totalPenaltiesPaid, remainingBalance, progressPercent },
  };
}

// ─── Vintage Analysis Report ──────────────────────────────────────────────────

export async function getVintageAnalysisReport(monthsBack = 12): Promise<VintageAnalysisReport> {
  const supabase = createSupabaseAdminClient();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - (monthsBack - 1));
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  // Fetch all loans within timeframe
  const { data: loans, error } = await supabase
    .from("loans")
    .select("principal_amount, balance, days_past_due, status, start_date")
    .in("status", ["Active", "Overdue", "Fully Paid", "Written Off", "Loss"])
    .gte("start_date", startDate.toISOString());

  if (error) throw error;

  // Build month buckets
  const bucketMap = new Map<string, VintageCohort>();

  const addMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: d.toLocaleDateString("en-KE", { month: "short", year: "numeric" }),
        totalDisbursed: 0,
        activeBalance: 0,
        par30Balance: 0,
        defaultBalance: 0,
        par30Ratio: 0,
        defaultRatio: 0,
      });
    }
    return key;
  };

  for (const loan of loans ?? []) {
    const key = addMonth(loan.start_date || new Date().toISOString());
    const m = bucketMap.get(key)!;

    m.totalDisbursed += loan.principal_amount ?? 0;

    if (loan.status === "Written Off" || loan.status === "Loss") {
      m.defaultBalance += loan.balance ?? 0;
    } else if (loan.status === "Active" || loan.status === "Overdue") {
      m.activeBalance += loan.balance ?? 0;
      if ((loan.days_past_due ?? 0) >= 30) {
        m.par30Balance += loan.balance ?? 0;
      }
    }
  }

  const cohorts = Array.from(bucketMap.values())
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map(c => {
      c.par30Ratio = c.totalDisbursed > 0 ? Math.round((c.par30Balance / c.totalDisbursed) * 10000) / 100 : 0;
      c.defaultRatio = c.totalDisbursed > 0 ? Math.round((c.defaultBalance / c.totalDisbursed) * 10000) / 100 : 0;
      return c;
    });

  let overallTotalDisbursed = 0;
  for (const c of cohorts) {
    overallTotalDisbursed += c.totalDisbursed;
  }

  const fromLabel = new Date(startDate).toLocaleDateString("en-KE", { month: "short", year: "numeric" });
  const toLabel = new Date().toLocaleDateString("en-KE", { month: "short", year: "numeric" });

  return {
    period: `${fromLabel} – ${toLabel}`,
    totalDisbursed: overallTotalDisbursed,
    cohorts,
  };
}

// ─── Dealership Executive Business & Operations Report ──────────────────────

export async function getDealershipBusinessReport(): Promise<DealershipBusinessReport> {
  const supabase = createSupabaseAdminClient();

  const [
    { data: rawVehicles, error: vErr },
    { data: rawVehicleCosts, error: vcErr },
    { data: rawExpenses, error: eErr },
    { data: rawAgreements, error: aErr },
    { data: rawRepayments, error: rErr },
  ] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, registration_no, make_model, purchase_price, base_price, sale_price, status, created_at, date_purchased, date_sold")
      .neq("status", "deleted")
      .order("created_at", { ascending: false }),
    supabase
      .from("vehicle_costs")
      .select("id, vehicle_id, cost_type, amount, description, vendor_name, incurred_date, created_at")
      .order("incurred_date", { ascending: false }),
    supabase
      .from("expenses")
      .select("id, amount, category, description, expense_date, created_by, created_at")
      .order("expense_date", { ascending: false }),
    supabase
      .from("financing_agreements")
      .select(`
        id, contract_no, client_id, vehicle_id, sale_price, monthly_due, interest_rate,
        balance, deposit_paid, status, days_overdue, total_penalties, created_at,
        client:clients(full_name, phone),
        vehicle:vehicles(registration_no, make_model)
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("repayments")
      .select("id, amount_paid, payment_date, payment_method, receipt_no, penalty_amount, created_at")
      .order("payment_date", { ascending: false }),
  ]);

  if (vErr) console.error("[getDealershipBusinessReport] Vehicles error:", vErr);
  if (vcErr) console.error("[getDealershipBusinessReport] VehicleCosts error:", vcErr);
  if (eErr) console.error("[getDealershipBusinessReport] Expenses error:", eErr);
  if (aErr) console.error("[getDealershipBusinessReport] Agreements error:", aErr);
  if (rErr) console.error("[getDealershipBusinessReport] Repayments error:", rErr);

  const vehicles = rawVehicles || [];
  const vehicleCosts = rawVehicleCosts || [];
  const expenses = rawExpenses || [];
  const agreements = rawAgreements || [];
  const repayments = rawRepayments || [];

  // 1. Vehicle Costs aggregation by vehicle & type
  const vehicleCostsMap = new Map<string, number>();
  const vehicleCostTypeMap = new Map<string, { amount: number; count: number }>();
  let totalVehicleCosts = 0;

  for (const c of vehicleCosts) {
    const amt = Number(c.amount || 0);
    totalVehicleCosts += amt;

    if (c.vehicle_id) {
      vehicleCostsMap.set(c.vehicle_id, (vehicleCostsMap.get(c.vehicle_id) || 0) + amt);
    }

    const typeKey = (c.cost_type || "other").toLowerCase();
    const curr = vehicleCostTypeMap.get(typeKey) || { amount: 0, count: 0 };
    vehicleCostTypeMap.set(typeKey, { amount: curr.amount + amt, count: curr.count + 1 });
  }

  const COST_TYPE_LABELS: Record<string, string> = {
    mechanical: "Engine & Mechanical Repairs",
    bodywork: "Bodywork, Panel & Paint",
    inspection: "Inspection & NTSA Roadworthiness",
    import_logistics: "Shipping, Port & Logistics",
    clearance: "Customs Duty & Clearance",
    parts_servicing: "Parts, Fluids & Servicing",
    insurance_tracking: "Tracker, Alarm & Insurance",
    detailing_wash: "Detailing, Valet & Polish",
    storage_yard: "Yard Parking & Storage",
    other: "Other Pre-sale Preparation",
  };

  const vehicleCostsByType: DealershipVehicleCostType[] = Array.from(vehicleCostTypeMap.entries()).map(([k, v]) => ({
    costType: k,
    label: COST_TYPE_LABELS[k] || k.replace(/_/g, " "),
    amount: v.amount,
    count: v.count,
    percentage: totalVehicleCosts > 0 ? Math.round((v.amount / totalVehicleCosts) * 1000) / 10 : 0,
  })).sort((a, b) => b.amount - a.amount);

  // Top Cost Vehicles
  const vehicleMap = new Map<string, any>();
  for (const v of vehicles) {
    vehicleMap.set(v.id, v);
  }

  const topCostVehicles: TopCostVehicleItem[] = vehicles.map((v) => {
    const incurred = vehicleCostsMap.get(v.id) || 0;
    const purchase = Number(v.purchase_price || 0);
    const sale = Number(v.sale_price || 0);
    const costBasis = purchase + incurred;
    const projectedMargin = sale - costBasis;
    const costRatio = purchase > 0 ? (incurred / purchase) * 100 : 0;
    return {
      id: v.id,
      registrationNo: v.registration_no || "N/A",
      makeModel: v.make_model || "Unknown",
      purchasePrice: purchase,
      incurredCosts: incurred,
      totalCostBasis: costBasis,
      salePrice: sale,
      projectedMargin,
      costRatio: Math.round(costRatio * 10) / 10,
      status: v.status || "in_stock",
      isHighCostRisk: costRatio > 15 || incurred > 80000,
    };
  })
  .filter((v) => v.incurredCosts > 0)
  .sort((a, b) => b.incurredCosts - a.incurredCosts)
  .slice(0, 10);

  // 2. General Operating Expenses breakdown
  let totalGeneralExpenses = 0;
  const generalCategoryMap = new Map<string, { amount: number; count: number }>();

  for (const e of expenses) {
    const amt = Number(e.amount || 0);
    totalGeneralExpenses += amt;
    const cat = e.category || "General Overheads";
    const curr = generalCategoryMap.get(cat) || { amount: 0, count: 0 };
    generalCategoryMap.set(cat, { amount: curr.amount + amt, count: curr.count + 1 });
  }

  const generalByCategory: DealershipExpenseCategory[] = Array.from(generalCategoryMap.entries()).map(([cat, val]) => ({
    category: cat,
    amount: val.amount,
    count: val.count,
    percentage: totalGeneralExpenses > 0 ? Math.round((val.amount / totalGeneralExpenses) * 1000) / 10 : 0,
  })).sort((a, b) => b.amount - a.amount);

  // 3. Combined Recent Ledger (General + Vehicle)
  const recentLedger: DealershipLedgerItem[] = [];

  for (const e of expenses.slice(0, 20)) {
    recentLedger.push({
      id: `gen-${e.id}`,
      date: e.expense_date || e.created_at || new Date().toISOString(),
      source: "general",
      categoryOrType: e.category || "General",
      entityOrVehicle: "Showroom / Operations",
      description: e.description || "General Operating Expense",
      amount: Number(e.amount || 0),
      vendorOrRecordedBy: e.created_by || "Admin",
    });
  }

  for (const c of vehicleCosts.slice(0, 20)) {
    const v = vehicleMap.get(c.vehicle_id);
    recentLedger.push({
      id: `veh-${c.id}`,
      date: c.incurred_date || c.created_at || new Date().toISOString(),
      source: "vehicle",
      categoryOrType: COST_TYPE_LABELS[(c.cost_type || "").toLowerCase()] || c.cost_type || "Vehicle Cost",
      entityOrVehicle: v ? `${v.registration_no} (${v.make_model})` : "Vehicle",
      description: c.description || "Vehicle preparation/mechanical work",
      amount: Number(c.amount || 0),
      vendorOrRecordedBy: c.vendor_name || "Workshop / Technician",
    });
  }

  recentLedger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const trimmedLedger = recentLedger.slice(0, 25);

  // 4. Vehicle Yard Inventory Metrics
  let inStockCount = 0;
  let financedCount = 0;
  let soldCount = 0;
  let reservedCount = 0;
  let repossessedCount = 0;

  let capitalInYardStock = 0;
  let potentialYardRetailValue = 0;

  const statusMap = new Map<string, { count: number; purchase: number; sale: number }>();

  for (const v of vehicles) {
    const st = (v.status || "in_stock").toLowerCase();
    const purchase = Number(v.purchase_price || 0);
    const sale = Number(v.sale_price || 0);
    const yardCosts = vehicleCostsMap.get(v.id) || 0;

    const isAvailable = st === "in_stock" || st === "in-stock" || st === "available";
    const isFinanced = st === "financed" || st === "credit";
    const isSold = st === "sold" || st === "cash_sale";
    const isReserved = st === "reserved";
    const isRepossessed = st === "repossessed";

    if (isAvailable) {
      inStockCount++;
      capitalInYardStock += purchase + yardCosts;
      potentialYardRetailValue += sale;
    } else if (isFinanced) {
      financedCount++;
    } else if (isSold) {
      soldCount++;
    } else if (isReserved) {
      reservedCount++;
    } else if (isRepossessed) {
      repossessedCount++;
    }

    const normStatus = isAvailable ? "in_stock" : isFinanced ? "financed" : isSold ? "sold" : isReserved ? "reserved" : isRepossessed ? "repossessed" : st;
    const curr = statusMap.get(normStatus) || { count: 0, purchase: 0, sale: 0 };
    statusMap.set(normStatus, {
      count: curr.count + 1,
      purchase: curr.purchase + purchase,
      sale: curr.sale + sale,
    });
  }

  const STATUS_CONFIGS: Record<string, { label: string; badge: string }> = {
    in_stock: { label: "In Stock (Available)", badge: "badge-success" },
    financed: { label: "Financed on Deal", badge: "badge-pending" },
    sold: { label: "Sold / Cash Sale", badge: "badge-completed" },
    reserved: { label: "Reserved / Deposit", badge: "badge-warning" },
    repossessed: { label: "Repossessed Stock", badge: "badge-error" },
  };

  const statusBreakdown: VehicleStatusBreakdownItem[] = Array.from(statusMap.entries()).map(([st, data]) => {
    const cfg = STATUS_CONFIGS[st] || { label: st.replace(/_/g, " "), badge: "badge-new" };
    const projectedMargin = data.sale - data.purchase;
    return {
      status: st,
      label: cfg.label,
      count: data.count,
      totalPurchaseCost: data.purchase,
      totalSaleValue: data.sale,
      projectedMargin,
      share: vehicles.length > 0 ? Math.round((data.count / vehicles.length) * 1000) / 10 : 0,
      badgeClass: cfg.badge,
    };
  }).sort((a, b) => b.count - a.count);

  const unrealizedYardMargin = potentialYardRetailValue - capitalInYardStock;
  const avgYardCostPerVehicle = vehicles.length > 0 ? Math.round(totalVehicleCosts / vehicles.length) : 0;

  // 5. Asset Financing Portfolio & Delinquency Aging
  let totalFinancingReceivables = 0;
  let totalFinancedVolume = 0;
  let totalDepositsCollected = 0;
  let totalPenaltiesAccrued = 0;

  let activeAgreementCount = 0;
  let completedAgreementCount = 0;
  let defaultingAgreementCount = 0;
  let repossessedAgreementCount = 0;
  let lossAgreementCount = 0;

  const delinquency = {
    performing: { count: 0, balance: 0, share: 0 },
    earlyArrears: { count: 0, balance: 0, share: 0 },
    highRisk: { count: 0, balance: 0, share: 0 },
    criticalDefault: { count: 0, balance: 0, share: 0 },
  };

  let par30Balance = 0;
  let par60Balance = 0;
  let par90Balance = 0;

  const atRiskDebtors: AtRiskDebtorItem[] = [];

  for (const a of agreements) {
    const sale = Number(a.sale_price || 0);
    const bal = Number(a.balance || 0);
    const dep = Number(a.deposit_paid || 0);
    const pen = Number(a.total_penalties || 0);
    const days = Number(a.days_overdue || 0);

    totalFinancedVolume += sale;
    totalDepositsCollected += dep;
    totalPenaltiesAccrued += pen;

    const rawSt = (a.status || "").toLowerCase();
    const isCompleted = rawSt === "completed" || rawSt === "fully paid";
    const isWrittenOff = rawSt === "written off" || rawSt === "written_off";
    const isLoss = rawSt === "loss" || days > 90;
    const isDefaulting = rawSt === "defaulting" || (days >= 60 && days <= 90);
    const isRepossessed = rawSt === "repossessed";

    if (isCompleted) {
      completedAgreementCount++;
    } else if (isWrittenOff) {
      // Written off loans are bad debts removed from active receivables
    } else if (isLoss) {
      lossAgreementCount++;
      totalFinancingReceivables += bal;
    } else if (isRepossessed) {
      repossessedAgreementCount++;
      totalFinancingReceivables += bal;
    } else if (isDefaulting) {
      defaultingAgreementCount++;
      totalFinancingReceivables += bal;
    } else {
      activeAgreementCount++;
      totalFinancingReceivables += bal;
    }

    if (!isCompleted && !isWrittenOff && bal > 0) {
      let bucket = "Performing (0-7 DPD)";
      if (days < 7) {
        delinquency.performing.count++;
        delinquency.performing.balance += bal;
      } else if (days <= 30) {
        delinquency.earlyArrears.count++;
        delinquency.earlyArrears.balance += bal;
        par30Balance += bal;
        bucket = "Overdue (7-30 DPD)";
      } else if (days <= 60) {
        delinquency.earlyArrears.count++;
        delinquency.earlyArrears.balance += bal;
        par30Balance += bal;
        bucket = "Early Arrears (31-60 DPD)";
      } else if (days <= 90) {
        delinquency.highRisk.count++;
        delinquency.highRisk.balance += bal;
        par30Balance += bal;
        par60Balance += bal;
        bucket = "Defaulting (60-90 DPD)";
      } else {
        delinquency.criticalDefault.count++;
        delinquency.criticalDefault.balance += bal;
        par30Balance += bal;
        par60Balance += bal;
        par90Balance += bal;
        bucket = "Loss (>90 DPD — Not Written Off)";
      }

      if (days > 30) {
        atRiskDebtors.push({
          id: a.id,
          contractNo: a.contract_no || "N/A",
          clientName: (a.client as any)?.full_name || "Valued Client",
          vehicleReg: (a.vehicle as any)?.registration_no || "Vehicle",
          balance: bal,
          daysOverdue: days,
          monthlyDue: Number(a.monthly_due || 0),
          bucket,
        });
      }
    }
  }

  atRiskDebtors.sort((a, b) => b.balance - a.balance);

  const totalDelinquentBalance = delinquency.performing.balance + delinquency.earlyArrears.balance + delinquency.highRisk.balance + delinquency.criticalDefault.balance;
  if (totalDelinquentBalance > 0) {
    delinquency.performing.share = Math.round((delinquency.performing.balance / totalDelinquentBalance) * 1000) / 10;
    delinquency.earlyArrears.share = Math.round((delinquency.earlyArrears.balance / totalDelinquentBalance) * 1000) / 10;
    delinquency.highRisk.share = Math.round((delinquency.highRisk.balance / totalDelinquentBalance) * 1000) / 10;
    delinquency.criticalDefault.share = Math.round((delinquency.criticalDefault.balance / totalDelinquentBalance) * 1000) / 10;
  }

  const par30Rate = totalFinancingReceivables > 0 ? Math.round((par30Balance / totalFinancingReceivables) * 1000) / 10 : 0;
  const par60Rate = totalFinancingReceivables > 0 ? Math.round((par60Balance / totalFinancingReceivables) * 1000) / 10 : 0;
  const par90Rate = totalFinancingReceivables > 0 ? Math.round((par90Balance / totalFinancingReceivables) * 1000) / 10 : 0;

  // 6. Cash Inflows & P&L
  let totalRepaymentsCollected = 0;
  for (const r of repayments) {
    totalRepaymentsCollected += Number(r.amount_paid || 0);
  }

  const totalRevenue = totalDepositsCollected + totalRepaymentsCollected;
  const totalCombinedExpenses = totalGeneralExpenses + totalVehicleCosts;
  const netOperatingSurplus = totalRevenue - totalCombinedExpenses;
  const expenseToRevenueRatio = totalRevenue > 0 ? Math.round((totalCombinedExpenses / totalRevenue) * 1000) / 10 : 0;
  const totalFinancingBilled = totalFinancedVolume + totalPenaltiesAccrued;
  const collectionRate = totalFinancingBilled > 0 ? Math.round(((totalDepositsCollected + totalRepaymentsCollected) / totalFinancingBilled) * 1000) / 10 : 0;

  // 7. Actionable Managerial Decision Insights
  const actionableInsights: DealershipActionableInsight[] = [];

  // Insight 1: Yard Capital Lockup
  if (capitalInYardStock > 0) {
    actionableInsights.push({
      type: "opportunity",
      title: "Showroom Capital Allocation & Velocity",
      message: `You currently have ${inStockCount} vehicles in stock with KES ${capitalInYardStock.toLocaleString("en-KE")} tied up in physical capital. If sold at list price, these will yield KES ${unrealizedYardMargin.toLocaleString("en-KE")} in gross margin.`,
      metric: `${inStockCount} In Stock`,
      actionLabel: "View Yard Stock",
      actionHref: "/vehicles",
    });
  }

  // Insight 2: Vehicle Cost Exposure
  const highCostUnits = topCostVehicles.filter(v => v.isHighCostRisk);
  if (highCostUnits.length > 0) {
    const unit = highCostUnits[0];
    actionableInsights.push({
      type: "warning",
      title: "Elevated Vehicle Reconditioning Expense",
      message: `${unit.registrationNo} (${unit.makeModel}) has accumulated KES ${unit.incurredCosts.toLocaleString("en-KE")} in yard costs (${unit.costRatio}% of purchase price). Ensure final sale price protects dealer margin.`,
      metric: `KES ${unit.incurredCosts.toLocaleString("en-KE")}`,
      actionLabel: "Review Vehicle",
      actionHref: `/vehicles/${unit.id}`,
    });
  }

  // Insight 3: Critical Receivables Default Exposure
  if (delinquency.criticalDefault.balance > 0) {
    actionableInsights.push({
      type: "alert",
      title: "Critical Overdue Receivables (90+ DPD)",
      message: `KES ${delinquency.criticalDefault.balance.toLocaleString("en-KE")} is in critical default (>90 days past due) across ${delinquency.criticalDefault.count} agreements. Immediate repossession notice or auctioneer assignment recommended to halt capital leakage.`,
      metric: `PAR90: ${par90Rate}%`,
      actionLabel: "View Arrears",
      actionHref: "/reports/arrears",
    });
  }

  // Insight 4: Operating Cost Efficiency
  actionableInsights.push({
    type: "positive",
    title: "Operating Expense & Recovery Ratio",
    message: `Total combined expenses are KES ${totalCombinedExpenses.toLocaleString("en-KE")} (General Overheads: KES ${totalGeneralExpenses.toLocaleString("en-KE")}, Vehicle Prep: KES ${totalVehicleCosts.toLocaleString("en-KE")}), representing ${expenseToRevenueRatio}% of total cash inflow.`,
    metric: `${expenseToRevenueRatio}% Expense Ratio`,
    actionLabel: "Manage Expenses",
    actionHref: "/expenses",
  });

  return {
    executive: {
      totalRevenue,
      totalExpenses: totalCombinedExpenses,
      netOperatingSurplus,
      generalExpensesTotal: totalGeneralExpenses,
      vehicleCostsTotal: totalVehicleCosts,
      expenseToRevenueRatio,
      capitalInYardStock,
      potentialYardRetailValue,
      unrealizedYardMargin,
      totalFinancingReceivables,
      totalFinancedVolume,
      totalDepositsCollected,
      totalRepaymentsCollected,
      collectionRate,
      totalPenaltiesAccrued,
    },
    expenses: {
      generalTotal: totalGeneralExpenses,
      generalCount: expenses.length,
      generalByCategory,
      vehicleCostsTotal: totalVehicleCosts,
      vehicleCostsCount: vehicleCosts.length,
      vehicleCostsByType,
      topCostVehicles,
      recentLedger: trimmedLedger,
    },
    inventory: {
      totalVehicles: vehicles.length,
      inStockCount,
      financedCount,
      soldCount,
      reservedCount,
      repossessedCount,
      statusBreakdown,
      avgYardCostPerVehicle,
    },
    financing: {
      totalAgreements: agreements.length,
      activeCount: activeAgreementCount,
      completedCount: completedAgreementCount,
      defaultingCount: defaultingAgreementCount,
      repossessedCount: repossessedAgreementCount,
      lossCount: lossAgreementCount,
      delinquency,
      par30Rate,
      par60Rate,
      par90Rate,
      topAtRiskDebtors: atRiskDebtors.slice(0, 10),
    },
    actionableInsights,
  };
}
