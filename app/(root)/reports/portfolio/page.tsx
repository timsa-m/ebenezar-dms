export const dynamic = "force-dynamic";

import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getDealershipBusinessReportAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { formatKES } from "@/src/lib/financial-engine";
import {
  Car,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Wrench,
  Receipt,
  ShieldAlert,
  ArrowRight,
  PlusCircle,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  TrendingDown,
  Percent,
  Activity,
  CheckCircle2,
} from "lucide-react";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import CompanyHeader from "@/components/reports/CompanyHeader";
import DealershipBusinessCharts from "@/components/reports/DealershipBusinessCharts";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function PortfolioReportPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    redirect("/");
  }

  const report = await getDealershipBusinessReportAction();
  if (!report) {
    return (
      <div className="home-content">
        <p className="text-gray-500">Failed to generate dealership report.</p>
      </div>
    );
  }

  const { executive, expenses, inventory, financing, actionableInsights } = report;

  // Executive Top KPIs
  const topKpis = [
    {
      label: "Total Cash Inflow",
      value: formatKES(executive.totalRevenue),
      subtext: `Deposits: ${formatKES(executive.totalDepositsCollected)} | Collections: ${formatKES(executive.totalRepaymentsCollected)}`,
      icon: <DollarSign className="size-4" />,
      variant: "success" as const,
    },
    {
      label: "Total Expenses (All)",
      value: formatKES(executive.totalExpenses),
      subtext: `Overheads: ${formatKES(executive.generalExpensesTotal)} | Yard Prep: ${formatKES(executive.vehicleCostsTotal)}`,
      icon: <Receipt className="size-4" />,
      variant: executive.expenseToRevenueRatio > 25 ? ("danger" as const) : ("warning" as const),
    },
    {
      label: "Net Operating Surplus",
      value: formatKES(executive.netOperatingSurplus),
      subtext: `Net cash position after all outflows`,
      icon: <TrendingUp className="size-4" />,
      variant: executive.netOperatingSurplus >= 0 ? ("success" as const) : ("danger" as const),
    },
    {
      label: "Capital in Yard Stock",
      value: formatKES(executive.capitalInYardStock),
      subtext: `${inventory.inStockCount} unsold units ready for sale`,
      icon: <Car className="size-4" />,
      variant: "default" as const,
    },
    {
      label: "Projected Yard Retail",
      value: formatKES(executive.potentialYardRetailValue),
      subtext: `Potential Gross Margin: ${formatKES(executive.unrealizedYardMargin)}`,
      icon: <Activity className="size-4" />,
      variant: "success" as const,
    },
    {
      label: "Financing Receivables",
      value: formatKES(executive.totalFinancingReceivables),
      subtext: `${financing.activeCount + financing.defaultingCount} active contracts on book`,
      icon: <Percent className="size-4" />,
      variant: "default" as const,
    },
    {
      label: "Expense Ratio",
      value: `${executive.expenseToRevenueRatio}%`,
      subtext: `Total expenses vs gross inflow`,
      icon: <TrendingDown className="size-4" />,
      variant: executive.expenseToRevenueRatio < 20 ? ("success" as const) : ("warning" as const),
    },
    {
      label: "Collection Efficiency",
      value: `${executive.collectionRate}%`,
      subtext: `Against total book volume`,
      icon: <CheckCircle2 className="size-4" />,
      variant: executive.collectionRate > 40 ? ("success" as const) : ("warning" as const),
    },
    {
      label: "Critical PAR90 Rate",
      value: `${financing.par90Rate}%`,
      subtext: `Balances >90 days overdue`,
      icon: <ShieldAlert className="size-4" />,
      variant: financing.par90Rate > 5 ? ("danger" as const) : ("success" as const),
    },
  ];

  return (
    <section className="home-content animate-fade-in print:p-6 space-y-8">
      {/* ── Page Header ────────────────────────────────────────── */}
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox
            title="Dealership Operations & Business Report"
            subtext="Complete operational intelligence: yard inventory capital, vehicle preparation costs, operating overheads, and asset financing performance."
          />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/expenses"
            className="btn-secondary flex items-center gap-2 text-xs font-semibold"
          >
            <PlusCircle className="size-3.5" />
            <span>Manage Expenses</span>
          </Link>
          <Link
            href="/vehicles/create"
            className="btn-primary flex items-center gap-2 text-xs font-semibold"
          >
            <Car className="size-3.5" />
            <span>Add Vehicle</span>
          </Link>
        </div>
      </header>

      {/* ── Print Header ────────────────────────────────────────── */}
      <div className="hidden print:block">
        <CompanyHeader
          title="Dealership Operations & Business Report"
          subtext={`Generated: ${new Date().toLocaleString("en-KE")} | Prepared for Executive Management`}
        />
      </div>

      {/* ── Executive Top Scorecard ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {topKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* ── Actionable Managerial Decision Insights ─────────────── 
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-14 font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            Executive Operational Recommendations &amp; Action Items
          </h2>
          <span className="text-12 text-gray-400">Live operational flags</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actionableInsights.map((insight, idx) => {
            const isAlert = insight.type === "alert" || insight.type === "warning";
            const borderClass =
              insight.type === "alert"
                ? "border-red-200 bg-red-50/70 text-red-950"
                : insight.type === "warning"
                  ? "border-amber-200 bg-amber-50/70 text-amber-950"
                  : insight.type === "opportunity"
                    ? "border-blue-200 bg-blue-50/70 text-blue-950"
                    : "border-emerald-200 bg-emerald-50/70 text-emerald-950";

            const badgeBg =
              insight.type === "alert"
                ? "bg-red-200 text-red-800"
                : insight.type === "warning"
                  ? "bg-amber-200 text-amber-800"
                  : insight.type === "opportunity"
                    ? "bg-blue-200 text-blue-800"
                    : "bg-emerald-200 text-emerald-800";

            return (
              <div
                key={idx}
                className={`rounded-2xl border p-4 flex flex-col justify-between shadow-xs transition hover:shadow-md ${borderClass}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeBg}`}>
                      {insight.type}
                    </span>
                    {insight.metric && (
                      <span className="text-xs font-bold font-mono">
                        {insight.metric}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm leading-tight mb-1.5">
                    {insight.title}
                  </h3>
                  <p className="text-xs opacity-85 leading-relaxed">
                    {insight.message}
                  </p>
                </div>

                {insight.actionHref && (
                  <div className="mt-3 pt-2.5 border-t border-black/5 flex justify-end">
                    <Link
                      href={insight.actionHref}
                      className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                    >
                      <span>{insight.actionLabel || "Take Action"}</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div> */}

      {/* ── Visual Analytics & Expense Breakdown Charts ─────────── */}
      <DealershipBusinessCharts
        generalExpensesTotal={executive.generalExpensesTotal}
        vehicleCostsTotal={executive.vehicleCostsTotal}
        capitalInYardStock={executive.capitalInYardStock}
        totalFinancingReceivables={executive.totalFinancingReceivables}
        totalRevenue={executive.totalRevenue}
        generalByCategory={expenses.generalByCategory}
        vehicleCostsByType={expenses.vehicleCostsByType}
        delinquency={financing.delinquency}
      />

      {/* ── EXPENSES ANALYSIS: General Overheads vs Yard Reconditioning ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: General Operating Expenses */}
        <div className="card-premium flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Receipt className="size-4 text-orange-600" />
                  General Operating Overheads
                </h3>
                <p className="text-12 text-gray-400 mt-0.5">
                  Showroom rent, staff payroll, marketing, yard maintenance, licenses & utilities
                </p>
              </div>
              <div className="text-right">
                <span className="text-16 font-black text-gray-900 block tabular-nums">
                  {formatKES(expenses.generalTotal)}
                </span>
                <span className="text-11 text-gray-400">
                  {expenses.generalCount} expense logged
                </span>
              </div>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr className="data-table-head-row">
                    <th className="data-th text-left">Expense Category</th>
                    <th className="data-th text-center">Items</th>
                    <th className="data-th text-right">Amount</th>
                    <th className="data-th text-right">Share %</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.generalByCategory.length === 0 ? (
                    <tr className="data-table-row">
                      <td colSpan={4} className="data-td text-center text-gray-400 py-6">
                        No general expenses recorded yet. Click "Manage Expenses" to add.
                      </td>
                    </tr>
                  ) : (
                    expenses.generalByCategory.map((cat) => (
                      <tr key={cat.category} className="data-table-row">
                        <td className="data-td font-semibold text-gray-900">{cat.category}</td>
                        <td className="data-td text-center text-gray-500 tabular-nums">{cat.count}</td>
                        <td className="data-td text-right font-bold text-gray-900 tabular-nums">
                          {formatKES(cat.amount)}
                        </td>
                        <td className="data-td text-right text-gray-500 tabular-nums font-medium">
                          {cat.percentage}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Recorded in <code className="px-1 py-0.5 rounded text-gray-700">expenses</code> module</span>
            <Link href="/expenses" className="text-blue-600 hover:underline font-semibold flex items-center gap-1">
              <span>View General Expense Ledger</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Column 2: Yard Vehicle Preparation Expenses */}
        <div className="card-premium flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Wrench className="size-4 text-rose-600" />
                  Yard Vehicle Costs
                </h3>
                <p className="text-12 text-gray-400 mt-0.5">
                  Mechanical repairs, bodywork, NTSA transfers & inspections, parts & detailing
                </p>
              </div>
              <div className="text-right">
                <span className="text-16 font-black text-gray-900 block tabular-nums">
                  {formatKES(expenses.vehicleCostsTotal)}
                </span>
                <span className="text-11 text-gray-400">
                  {expenses.vehicleCostsCount} items logged
                </span>
              </div>
            </div>

            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr className="data-table-head-row">
                    <th className="data-th text-left">Cost Classification</th>
                    <th className="data-th text-center">Items</th>
                    <th className="data-th text-right">Incurred Cost</th>
                    <th className="data-th text-right">Share %</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.vehicleCostsByType.length === 0 ? (
                    <tr className="data-table-row">
                      <td colSpan={4} className="data-td text-center text-gray-400 py-6">
                        No vehicle preparation costs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    expenses.vehicleCostsByType.map((cost) => (
                      <tr key={cost.costType} className="data-table-row">
                        <td className="data-td font-semibold text-gray-900">{cost.label}</td>
                        <td className="data-td text-center text-gray-500 tabular-nums">{cost.count}</td>
                        <td className="data-td text-right font-bold text-gray-900 tabular-nums">
                          {formatKES(cost.amount)}
                        </td>
                        <td className="data-td text-right text-gray-500 tabular-nums font-medium">
                          {cost.percentage}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Avg Yard Cost: <strong className="text-gray-900">{formatKES(inventory.avgYardCostPerVehicle)}</strong> / unit</span>
            <Link href="/vehicles" className="text-blue-600 hover:underline font-semibold flex items-center gap-1">
              <span>View Yard Stock</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── TOP VEHICLES WITH HIGHEST YARD COSTS (Margin Watchlist) ── */}
      <div className="card-premium">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Car className="size-4 text-blue-600" />
              Highest Reconditioning Cost Vehicles (Dealer Margin Watchlist)
            </h3>
            <p className="text-12 text-gray-400 mt-0.5">
              Identifies units where workshop &amp; prep costs are high relative to acquisition cost. Protects floor pricing.
            </p>
          </div>
          <span className="badge badge-primary text-12 font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
            High Cost Threshold: &gt;15% of purchase
          </span>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr className="data-table-head-row">
                <th className="data-th text-left">Vehicle Plate</th>
                <th className="data-th text-left">Make &amp; Model</th>
                <th className="data-th text-center">Status</th>
                <th className="data-th text-right">Purchase Price</th>
                <th className="data-th text-right">Yard Prep Costs</th>
                <th className="data-th text-right">Total Cost Basis</th>
                <th className="data-th text-right">Retail Price</th>
                <th className="data-th text-right">Projected Margin</th>
                <th className="data-th text-center">Cost % Ratio</th>
              </tr>
            </thead>
            <tbody>
              {expenses.topCostVehicles.length === 0 ? (
                <tr className="data-table-row">
                  <td colSpan={9} className="data-td text-center text-gray-400 py-6">
                    No vehicles have recorded repair or preparation costs yet.
                  </td>
                </tr>
              ) : (
                expenses.topCostVehicles.map((unit) => (
                  <tr key={unit.id} className="data-table-row">
                    <td className="data-td">
                      <Link
                        href={`/vehicles/${unit.id}`}
                        className="font-roboto font-bold text-blue-600 hover:underline"
                      >
                        {unit.registrationNo}
                      </Link>
                    </td>
                    <td className="data-td font-medium text-gray-800">{unit.makeModel}</td>
                    <td className="data-td text-center">
                      <span className="badge capitalize text-xs">
                        {unit.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="data-td text-right font-medium text-gray-700 tabular-nums">
                      {formatKES(unit.purchasePrice)}
                    </td>
                    <td className="data-td text-right font-bold text-rose-600 tabular-nums">
                      {formatKES(unit.incurredCosts)}
                    </td>
                    <td className="data-td text-right font-bold text-gray-900 tabular-nums">
                      {formatKES(unit.totalCostBasis)}
                    </td>
                    <td className="data-td text-right font-medium text-gray-700 tabular-nums">
                      {formatKES(unit.salePrice)}
                    </td>
                    <td className="data-td text-right font-bold tabular-nums">
                      <span className={unit.projectedMargin >= 0 ? "text-emerald-600" : "text-rose-600"}>
                        {formatKES(unit.projectedMargin)}
                      </span>
                    </td>
                    <td className="data-td text-center">
                      {unit.isHighCostRisk ? (
                        <span className="badge badge-error inline-flex items-center gap-1 font-bold">
                          <AlertTriangle className="size-3" />
                          {unit.costRatio}% (High)
                        </span>
                      ) : (
                        <span className="badge badge-success font-medium">
                          {unit.costRatio}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TWO-COLUMN: Physical Inventory Breakdown vs Receivables Delinquency ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yard Inventory Status Breakdown */}
        <div className="card-premium">
          <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
            <span>Yard Inventory Status Breakdown</span>
            <span className="text-12 font-normal text-gray-400">{inventory.totalVehicles} Vehicles Tracked</span>
          </h3>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr className="data-table-head-row">
                  <th className="data-th text-left">Stock Status</th>
                  <th className="data-th text-center">Units</th>
                  <th className="data-th text-right">Purchase Capital</th>
                  <th className="data-th text-right">Retail Value</th>
                  <th className="data-th text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {inventory.statusBreakdown.map((row) => (
                  <tr key={row.status} className="data-table-row">
                    <td className="data-td">
                      <span className={`badge ${row.badgeClass}`}>{row.label}</span>
                    </td>
                    <td className="data-td text-center font-bold text-gray-900 tabular-nums">
                      {row.count}
                    </td>
                    <td className="data-td text-right font-medium text-gray-700 tabular-nums">
                      {formatKES(row.totalPurchaseCost)}
                    </td>
                    <td className="data-td text-right font-bold text-gray-900 tabular-nums">
                      {formatKES(row.totalSaleValue)}
                    </td>
                    <td className="data-td text-right text-gray-500 tabular-nums font-medium">
                      {row.share}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>In-Stock Floor Value: <strong className="text-emerald-700">{formatKES(executive.potentialYardRetailValue)}</strong></span>
            <span>Unrealized Equity: <strong className="text-blue-700">{formatKES(executive.unrealizedYardMargin)}</strong></span>
          </div>
        </div>

        {/* Asset Financing Delinquency Aging (PAR Indicators) */}
        <div className="card-premium">
          <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
            <span>Financing Book Delinquency (PAR)</span>
            <span className="text-12 font-normal text-gray-400">{financing.totalAgreements} Contracts</span>
          </h3>
          <br />

          <div className="grid grid-rows-4 gap-x-4 gap-y-3 space-y-4 mb-6">
            {[
              { label: "Performing (0–30 DPD)", balance: financing.delinquency.performing.balance, count: financing.delinquency.performing.count, color: "bg-emerald-500" },
              { label: "Early Arrears (31–60 DPD)", balance: financing.delinquency.earlyArrears.balance, count: financing.delinquency.earlyArrears.count, color: "bg-amber-500" },
              { label: "High Risk (61–90 DPD)", balance: financing.delinquency.highRisk.balance, count: financing.delinquency.highRisk.count, color: "bg-orange-500" },
              { label: "Critical Default (>90 DPD)", balance: financing.delinquency.criticalDefault.balance, count: financing.delinquency.criticalDefault.count, color: "bg-red-600" },
            ].map(({ label, balance, count, color }) => {
              const totalRec = executive.totalFinancingReceivables || 1;
              const pct = Math.round((balance / totalRec) * 100);
              return (
                <div key={label}>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-gray-700">{label} ({count} accounts)</span>
                    <span className="font-bold text-gray-900 tabular-nums">{formatKES(balance)} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <br />

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-gray-100">
            <div className="p-2 bg-amber-50 rounded-lg">
              <p className="text-11 text-amber-700 font-semibold">PAR30</p>
              <p className="text-14 font-bold text-amber-900 mt-0.5">{financing.par30Rate}%</p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <p className="text-11 text-orange-700 font-semibold">PAR60</p>
              <p className="text-14 font-bold text-orange-900 mt-0.5">{financing.par60Rate}%</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <p className="text-11 text-red-700 font-semibold">PAR90</p>
              <p className="text-14 font-bold text-red-900 mt-0.5">{financing.par90Rate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP AT-RISK OVERDUE DEBTORS (Action Required) ───────── */}
      {financing.topAtRiskDebtors.length > 0 && (
        <div className="card-premium">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="size-4 text-red-600" />
                Priority Delinquent Accounts (&gt;30 Days Past Due)
              </h3>
              <p className="text-12 text-gray-400 mt-0.5">
                Top overdue clients by outstanding balance. Recommended for demand notice or vehicle repossession.
              </p>
            </div>
            <Link
              href="/reports/arrears"
              className="text-12 font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>View Full Arrears Aging Report</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr className="data-table-head-row">
                  <th className="data-th text-left">Contract No</th>
                  <th className="data-th text-left">Client Name</th>
                  <th className="data-th text-left">Vehicle Plate</th>
                  <th className="data-th text-center">Days Overdue</th>
                  <th className="data-th text-center">Risk Bucket</th>
                  <th className="data-th text-right">Monthly Due</th>
                  <th className="data-th text-right">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody>
                {financing.topAtRiskDebtors.map((debtor) => (
                  <tr key={debtor.id} className="data-table-row relative cursor-pointer hover:bg-red-50/40 transition-colors">
                    <td className="data-td font-roboto font-bold text-blue-600 relative">
                      <Link
                        href={`/loans/${debtor.id}`}
                        className="absolute inset-0"
                        aria-label={`View contract ${debtor.contractNo}`}
                      />
                      {debtor.contractNo}
                    </td>
                    <td className="data-td font-semibold text-gray-900">{debtor.clientName}</td>
                    <td className="data-td font-roboto font-medium text-gray-700">{debtor.vehicleReg}</td>
                    <td className="data-td text-center font-bold text-red-600 tabular-nums">
                      {debtor.daysOverdue} days
                    </td>
                    <td className="data-td text-center">
                      <span className="badge badge-error text-xs font-semibold">
                        {debtor.bucket}
                      </span>
                    </td>
                    <td className="data-td text-right font-medium text-gray-700 tabular-nums">
                      {formatKES(debtor.monthlyDue)}
                    </td>
                    <td className="data-td text-right font-bold text-red-600 tabular-nums">
                      {formatKES(debtor.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RECENT COMBINED EXPENSE LEDGER ──────────────────────── */}
      <div className="card-premium">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Clock className="size-4 text-gray-500" />
              Recent Expense Activity
            </h3>
            <br />
          </div>
          <Link
            href="/expenses"
            className="text-12 font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            <span>Go to Full Expenses Tracker</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr className="data-table-head-row">
                <th className="data-th text-left">Date</th>
                <th className="data-th text-center">Type</th>
                <th className="data-th text-left">Category / Cost Type</th>
                <th className="data-th text-left">Vehicle / Entity</th>
                <th className="data-th text-left">Description</th>
                <th className="data-th text-left">Recorded By / Vendor</th>
                <th className="data-th text-right">Amount Outflow</th>
              </tr>
            </thead>
            <tbody>
              {expenses.recentLedger.length === 0 ? (
                <tr className="data-table-row">
                  <td colSpan={7} className="data-td text-center text-gray-400 py-6">
                    No expense transactions logged in database yet.
                  </td>
                </tr>
              ) : (
                expenses.recentLedger.map((item) => (
                  <tr key={item.id} className="data-table-row">
                    <td className="data-td text-xs text-gray-600 font-roboto">
                      {new Date(item.date).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="data-td text-center">
                      <span
                        className={`badge badge-primary text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.source === "general"
                          ? "bg-orange-100 text-orange-800 border border-orange-200"
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                      >
                        {item.source === "general" ? "Overhead" : "Yard Prep"}
                      </span>
                    </td>
                    <td className="data-td font-semibold text-gray-900 text-xs">
                      {item.categoryOrType}
                    </td>
                    <td className="data-td text-xs text-gray-700 font-medium">
                      {item.entityOrVehicle}
                    </td>
                    <td className="data-td text-xs text-gray-600 max-w-xs truncate">
                      {item.description}
                    </td>
                    <td className="data-td text-xs text-gray-500">
                      {item.vendorOrRecordedBy}
                    </td>
                    <td className="data-td text-right font-bold text-gray-900 tabular-nums">
                      {formatKES(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
