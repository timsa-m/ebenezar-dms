/**
 * Elelyon LMS — Reporting Type Definitions
 * All types shared by the report query layer, server actions, and UI components.
 * Aligned to the actual production DB schema (loan_transactions replaces repayments/penalties).
 */

// ─── Filters ────────────────────────────────────────────────────────────────

export interface ReportDateRange {
  from: string; // ISO date string YYYY-MM-DD
  to: string;
}

export interface ReportFilters {
  dateRange?: ReportDateRange;
  status?: string;
  loanType?: string;
  clientId?: string;
  page?: number;
  pageSize?: number;
}

export interface MonthlyReportFilters {
  year: number;
  month: number; // 1–12
}

// ─── Loan status constants (actual DB values) ────────────────────────────────

export const LOAN_STATUSES = {
  PENDING: "Pending",
  ACTIVE: "Active",
  OVERDUE: "Overdue",
  FULLY_PAID: "Fully Paid",
  WRITTEN_OFF: "Written Off",
  LOSS: "Loss",
  DENIED: "Denied",
} as const;

export type LoanStatus = typeof LOAN_STATUSES[keyof typeof LOAN_STATUSES];
export type LifecycleState = "Standard" | "Rollover" | "Restructured";

// ─── Portfolio Summary ───────────────────────────────────────────────────────

export interface PortfolioSummary {
  // Counts by status
  totalLoans: number;
  pendingLoans: number;
  activeLoans: number;
  overdueLoans: number;
  fullyPaidLoans: number;
  writtenOffLoans: number;
  lossLoans: number;
  deniedLoans: number;
  highRiskLoans: number;

  // Lifecycle counts
  standardLoans: number;
  rolloverLoans: number;
  restructuredLoans: number;

  // Financial totals
  totalDisbursed: number;       // sum of principal_amount (non-pending/denied)
  totalOutstanding: number;     // sum of balance (active + overdue)
  totalInterestEarned: number;  // sum of total_interest for disbursed loans
  totalPenaltiesOutstanding: number; // sum of remaining_penalties
  collectionRate: number;       // percentage

  // PAR (Portfolio At Risk) — % of active portfolio with days_past_due > 0
  par30: number; // % of portfolio with DPD >= 30
  par60: number;
  par90: number;
}

// ─── Collection Report ───────────────────────────────────────────────────────

export interface CollectionReportRow {
  loanId: string;
  clientName: string;
  loanType: string;
  lifecycleState: string;
  principalAmount: number;
  installmentAmount: number;
  totalRepaid: number;
  balance: number;
  status: string;
  lastPaymentDate: string | null;
  dueDate: string | null;
}

export interface CollectionSummary {
  period: string;
  totalExpected: number;
  totalCollected: number;
  totalDeposits: number;
  totalRepayments: number;
  collectionRate: number;
  rows: CollectionReportRow[];
}

// ─── Arrears / Delinquency ───────────────────────────────────────────────────

export type ArrearsBucket = '1-30' | '31-60' | '61-90' | '90+';

export interface ArrearsRow {
  loanId: string;
  clientName: string;
  clientPhone: string;
  /** Contract number (e.g. AGR-KDB-123A-4567) */
  contractNo: string;
  /** Vehicle registration plate */
  vehicleReg: string;
  /** Raw aging_bucket label from DB (e.g. "0-30 Days") */
  agingBucket: string;
  principalAmount: number;
  balance: number;
  dueDate: string;
  daysPastDue: number;
  bucket: ArrearsBucket;
  penaltyAccrued: number;
  status: string;
}

export interface ArrearsSummary {
  bucket1_30: { count: number; totalBalance: number };
  bucket31_60: { count: number; totalBalance: number };
  bucket61_90: { count: number; totalBalance: number };
  bucket90plus: { count: number; totalBalance: number };
  totalOverdue: number;
  totalPenalties: number;
  rows: ArrearsRow[];
}

// ─── Cash Flow ───────────────────────────────────────────────────────────────

export interface CashFlowMonth {
  label: string;   // e.g. "Jan 2026"
  year: number;
  month: number;
  disbursed: number;
  collected: number;
  netFlow: number;
}

export interface CashFlowReport {
  months: CashFlowMonth[];
  totalDisbursed: number;
  totalCollected: number;
  netCashFlow: number;
}

// ─── Penalty / Transaction Report ────────────────────────────────────────────

export interface PenaltySummary {
  totalCharged: number;
  totalReversed: number;
  totalOutstanding: number;
  chargedCount: number;
  reversedCount: number;
  uniqueAgreementsCount?: number;
  rows: PenaltyReportRow[];
}

export interface PenaltyReportRow {
  penaltyId: string;
  loanId: string;
  clientName: string;
  clientPhone?: string;
  contractNo?: string;
  vehicleReg?: string;
  vehicleMakeModel?: string;
  penaltyType: string;   // e.g. "Manual Penalty", "Late Payment"
  amount: number;
  status: string;        // Active | Reversed
  dateApplied: string;
  appliedBy: string;
  comment?: string;
  agreementBalance?: number;
}

// ─── Income Statement ────────────────────────────────────────────────────────

export interface IncomeStatementReport {
  period: string;
  // Revenue
  interestCollected: number;     // allocated_current_interest + allocated_overdue_interest from Repayments
  penaltyRevenue: number;        // Manual Penalty transactions (Active)
  tradingMargin: number;         // Sale price - Purchase price for vehicles sold
  totalRevenue: number;
  // Waivers & Expenses
  waiverAmount: number;          // Waiver transactions
  operatingExpenses: number;     // Tracked operational expenses
  netIncome: number;
  // Monthly breakdown
  months: IncomeMonth[];
}

export interface IncomeMonth {
  label: string;
  year: number;
  month: number;
  interest: number;
  penalties: number;
  margin: number;
  waivers: number;
  expenses: number;
  net: number;
}

// ─── PAR (Portfolio At Risk) ─────────────────────────────────────────────────

export interface PARReport {
  totalPortfolioBalance: number;
  par1Balance: number;    // DPD >= 1
  par30Balance: number;   // DPD >= 30
  par60Balance: number;   // DPD >= 60
  par90Balance: number;   // DPD >= 90
  par1Rate: number;       // percentage of total portfolio
  par30Rate: number;
  par60Rate: number;
  par90Rate: number;
  writtenOffBalance: number;
  lossBalance: number;
  rows: PARRow[];
}

export interface PARRow {
  loanId: string;
  clientName: string;
  clientPhone: string;
  loanType: string;
  lifecycleState: string;
  principalAmount: number;
  balance: number;
  daysPastDue: number;
  status: string;
  riskBucket: string;
}

// ─── Loan Officer Performance ────────────────────────────────────────────────

export interface LoanOfficerReport {
  officers: OfficerRow[];
  totalLoans: number;
  totalDisbursed: number;
}

export interface OfficerRow {
  officerName: string;
  totalOriginated: number;
  totalDisbursed: number;
  activeCount: number;
  overdueCount: number;
  fullyPaidCount: number;
  writtenOffCount: number;
  lossCount: number;
  totalCollected: number;
  collectionRate: number;
}

// ─── Audit Log Report ────────────────────────────────────────────────────────

export interface AuditLogReportRow {
  id: string;
  loanId: string;
  action: string;
  performedBy: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface AuditLogReport {
  rows: AuditLogReportRow[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Monthly Snapshot ────────────────────────────────────────────────────────

/** Stored in monthly_reports table */
export interface MonthlyReportRecord {
  id: string;
  year: number;
  month: number;
  periodLabel: string;
  generatedAt: string;
  generatedBy: string;

  // Portfolio counts
  totalActiveLoans: number;
  totalNewLoans: number;
  totalClosedLoans: number;
  totalOverdueLoans: number;
  totalDefaultedLoans: number;

  // Financial totals
  openingPortfolioBalance: number;
  newLoansDisbursed: number;
  totalRepaymentsCollected: number;
  totalPenaltiesCharged: number;
  closingPortfolioBalance: number;

  // Efficiency
  expectedCollections: number;
  actualCollections: number;
  collectionRate: number;
}

/** One entry row per vehicle financing agreement per month */
export interface MonthlyReportEntry {
  id: string;
  reportId: string;
  loanId: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  contractNo?: string;
  vehicleReg?: string;
  vehicleMakeModel?: string;
  depositPaid?: number;
  loanType: string;
  disbursementDate: string;
  dueDate: string;
  openingBalance: number;
  newLoanAmount: number;
  amountPaidThisMonth: number;
  penaltiesThisMonth: number;
  closingBalance: number;
  loanStatus: string;
  daysPastDue: number;
  installmentAmount: number;
}

/** Full monthly report with entries */
export interface MonthlyReportFull extends MonthlyReportRecord {
  entries: MonthlyReportEntry[];
}

/** Input for generating a monthly snapshot */
export interface GenerateMonthlyReportInput {
  year: number;
  month: number;
  generatedBy: string;
  overwrite?: boolean;
}

// ─── Loan Statement (client-facing) ──────────────────────────────────────────

export interface LoanStatementData {
  loan: {
    id: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    nationalId: string;
    loanType: string;
    lifecycleState: string;
    principalAmount: number;
    interestRate: number;
    interestType: string;
    durationInMonths: number;
    totalInterest: number;
    totalPayable: number;
    startDate: string;
    dueDate: string;
    status: string;
    balance: number;
    penaltyAccrued: number;
    installmentAmount: number;
    daysPastDue: number;
    securities?: string;
    guarantorName?: string;
  };
  repayments: {
    id: string;
    date: string;
    amount: number;
    paymentMethod: string;
    referenceId?: string;
    runningBalance: number;
  }[];
  penalties: {
    id: string;
    dateApplied: string;
    amount: number;
    penaltyType: string;
    status: string;
    comment?: string;
  }[];
  summary: {
    totalPaid: number;
    totalPenaltiesPaid: number;
    remainingBalance: number;
    progressPercent: number;
  };
}

// ─── Vintage Analysis ────────────────────────────────────────────────────────

export interface VintageCohort {
  month: number;
  year: number;
  label: string; // e.g. "Jan 2026"
  totalDisbursed: number;
  activeBalance: number;
  par30Balance: number;
  defaultBalance: number;
  par30Ratio: number;
  defaultRatio: number;
}

export interface VintageAnalysisReport {
  period: string;
  totalDisbursed: number;
  cohorts: VintageCohort[];
}

// ─── Dealership Executive Business & Operations Report ──────────────────────

export interface DealershipExpenseCategory {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface DealershipVehicleCostType {
  costType: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TopCostVehicleItem {
  id: string;
  registrationNo: string;
  makeModel: string;
  purchasePrice: number;
  incurredCosts: number;
  totalCostBasis: number;
  salePrice: number;
  projectedMargin: number;
  costRatio: number;
  status: string;
  isHighCostRisk: boolean;
}

export interface DealershipLedgerItem {
  id: string;
  date: string;
  source: 'general' | 'vehicle';
  categoryOrType: string;
  entityOrVehicle: string;
  description: string;
  amount: number;
  vendorOrRecordedBy: string;
}

export interface VehicleStatusBreakdownItem {
  status: string;
  label: string;
  count: number;
  totalPurchaseCost: number;
  totalSaleValue: number;
  projectedMargin: number;
  share: number;
  badgeClass: string;
}

export interface AtRiskDebtorItem {
  id: string;
  contractNo: string;
  clientName: string;
  vehicleReg: string;
  balance: number;
  daysOverdue: number;
  monthlyDue: number;
  bucket: string;
}

export interface DealershipActionableInsight {
  type: 'warning' | 'alert' | 'opportunity' | 'positive';
  title: string;
  message: string;
  metric?: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface DealershipBusinessReport {
  executive: {
    totalRevenue: number;
    totalExpenses: number;
    netOperatingSurplus: number;
    generalExpensesTotal: number;
    vehicleCostsTotal: number;
    expenseToRevenueRatio: number;
    capitalInYardStock: number;
    potentialYardRetailValue: number;
    unrealizedYardMargin: number;
    totalFinancingReceivables: number;
    totalFinancedVolume: number;
    totalDepositsCollected: number;
    totalRepaymentsCollected: number;
    collectionRate: number;
    totalPenaltiesAccrued: number;
  };
  expenses: {
    generalTotal: number;
    generalCount: number;
    generalByCategory: DealershipExpenseCategory[];
    vehicleCostsTotal: number;
    vehicleCostsCount: number;
    vehicleCostsByType: DealershipVehicleCostType[];
    topCostVehicles: TopCostVehicleItem[];
    recentLedger: DealershipLedgerItem[];
  };
  inventory: {
    totalVehicles: number;
    inStockCount: number;
    financedCount: number;
    soldCount: number;
    reservedCount: number;
    repossessedCount: number;
    statusBreakdown: VehicleStatusBreakdownItem[];
    avgYardCostPerVehicle: number;
  };
  financing: {
    totalAgreements: number;
    activeCount: number;
    completedCount: number;
    defaultingCount: number;
    repossessedCount: number;
    lossCount: number;
    delinquency: {
      performing: { count: number; balance: number; share: number };
      earlyArrears: { count: number; balance: number; share: number };
      highRisk: { count: number; balance: number; share: number };
      criticalDefault: { count: number; balance: number; share: number };
    };
    par30Rate: number;
    par60Rate: number;
    par90Rate: number;
    topAtRiskDebtors: AtRiskDebtorItem[];
  };
  actionableInsights: DealershipActionableInsight[];
}
