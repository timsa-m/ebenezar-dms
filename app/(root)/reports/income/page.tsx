export const dynamic = "force-dynamic";

import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getIncomeStatementAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { Suspense } from "react";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import DateRangeFilter from "@/components/reports/DateRangeFilter";
import PdfExportButton from "@/components/reports/PdfExportButton";
import PrintButton from "@/components/reports/PrintButton";
import CompanyHeader from "@/components/reports/CompanyHeader";
import IncomeMonthlyLedgerTable from "@/components/reports/IncomeMonthlyLedgerTable";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  Coins,
  Car,
  ArrowUpRight,
  PieChart,
  Receipt,
  AlertTriangle,
} from "lucide-react";

export default async function IncomeStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    redirect("/");
  }

  const sp = await searchParams;
  const report = await getIncomeStatementAction({
    dateRange: sp.from || sp.to ? { from: sp.from ?? "", to: sp.to ?? "" } : undefined,
  });

  return (
    <section className="home-content animate-fade-in print:p-6 space-y-6">
      {/* Top Header */}
      <header className="page-header print:hidden">
        <div>
          <Link
            href="/reports"
            className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-flex items-center gap-1 transition-colors"
          >
            ← Back to Reports
          </Link>
          <HeaderBox
            title="Income Statement & P&L"
            subtext="Vehicle sales margins, hire-purchase collections, penalty revenue, operational expenses, and net dealership operating profit."
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <PrintButton className="btn-secondary flex items-center gap-2 text-13" />
          <PdfExportButton reportType="income" data={report} />
          <Link
            href="/loans"
            className="btn-primary flex items-center gap-1.5 text-13 shadow-xs"
          >
            <span>Financing Contracts</span>
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </header>

      {/* Print Company Header */}
      <div className="hidden print:block">
        <CompanyHeader
          title="Dealership Income Statement & Operating Surplus"
          subtext={`Period: ${report?.period ?? "All Time"} | Generated: ${new Date().toLocaleString("en-KE")} | Officer: ${user.firstName} ${user.lastName}`}
        />
      </div>

      {/* Date Filter Bar */}
      <div className="card-premium print:hidden">
        <Suspense fallback={<div className="h-9 w-64 bg-gray-100 rounded-md animate-pulse" />}>
          <DateRangeFilter label="Filter Reporting Period" />
        </Suspense>
      </div>

      {!report ? (
        <div className="card-premium py-12 text-center text-gray-500">
          <AlertTriangle className="size-8 mx-auto text-amber-500 mb-2" />
          <p className="font-semibold text-gray-800">Failed to load income statement.</p>
          <p className="text-12 text-gray-400 mt-1">Please try again or contact system administrator.</p>
        </div>
      ) : (
        <>
          {/* Executive P&L KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard
              label="Vehicle Trading Margin"
              value={formatAmount(report.tradingMargin)}
              icon={<TrendingUp className="size-4" />}
              variant="success"
              subtext="Gross vehicle sales markup"
            />
            <KpiCard
              label="Financing Repayments"
              value={formatAmount(report.interestCollected)}
              icon={<DollarSign className="size-4" />}
              variant="default"
              subtext="Hire-purchase cash inflow"
            />
            <KpiCard
              label="Late Fee & Penalty Revenue"
              value={formatAmount(report.penaltyRevenue)}
              icon={<Coins className="size-4" />}
              variant="warning"
              subtext="Charged delinquency fees"
            />
            <KpiCard
              label="Total Operating Outflows"
              value={formatAmount(report.operatingExpenses)}
              icon={<MinusCircle className="size-4" />}
              variant="warning"
              subtext="Overheads & prep costs"
            />
            <KpiCard
              label="Net Operating Surplus"
              value={formatAmount(report.netIncome)}
              icon={report.netIncome >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              variant={report.netIncome >= 0 ? "success" : "danger"}
              subtext={report.netIncome >= 0 ? "Net operating profit" : "Operating deficit"}
            />
          </div>

          {/* Revenue Composition & Inflow Breakdown */}
          <div className="card-premium space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-14 font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <PieChart className="size-4 text-blue-600" />
                  <span>Revenue Stream Composition</span>
                </h3>
                <p className="text-12 text-gray-400 mt-0.5">
                  Breakdown of gross inflows across trading markup, ongoing installment repayments, and late fees
                </p>
              </div>
              <div className="text-right">
                <span className="text-11 text-gray-400 uppercase font-semibold">Total Revenue Inflow</span>
                <p className="text-16 font-extrabold text-gray-900 tabular-nums">
                  {formatAmount(report.totalRevenue)}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {report.totalRevenue > 0 && [
                {
                  label: "Vehicle Trading Margins (Car Sales Profit)",
                  value: report.tradingMargin,
                  color: "bg-blue-600",
                  textColor: "text-blue-700",
                },
                {
                  label: "Hire-Purchase Installment Repayments",
                  value: report.interestCollected,
                  color: "bg-emerald-600",
                  textColor: "text-emerald-700",
                },
                {
                  label: "Late Payment Fees & Penalties",
                  value: report.penaltyRevenue,
                  color: "bg-amber-500",
                  textColor: "text-amber-700",
                },
              ].map(({ label, value, color, textColor }) => {
                const pct = report.totalRevenue > 0 ? Math.round((value / report.totalRevenue) * 1000) / 10 : 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between items-center text-12">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        <span className={`size-2 rounded-full ${color}`} />
                        {label}
                      </span>
                      <div className="flex items-center gap-2 font-bold tabular-nums">
                        <span className="text-gray-900">{formatAmount(value)}</span>
                        <span className={`text-11 ${textColor}`}>({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Income Ledger Table */}
          <IncomeMonthlyLedgerTable
            months={report.months}
            tradingMargin={report.tradingMargin}
            interestCollected={report.interestCollected}
            penaltyRevenue={report.penaltyRevenue}
            operatingExpenses={report.operatingExpenses}
            waiverAmount={report.waiverAmount}
            netIncome={report.netIncome}
          />
        </>
      )}
    </section>
  );
}
