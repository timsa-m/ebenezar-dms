export const dynamic = "force-dynamic";

import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getArrearsReportAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import PdfExportButton from "@/components/reports/PdfExportButton";
import PrintButton from "@/components/reports/PrintButton";
import ArrearsChart from "@/components/reports/ArrearsChart";
import ArrearsLedgerTable from "@/components/reports/ArrearsLedgerTable";
import CompanyHeader from "@/components/reports/CompanyHeader";
import Link from "next/link";
import {
  AlertTriangle,
  Car,
  ShieldAlert,
  ArrowUpRight,
  TrendingDown,
  Clock,
  Coins,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export default async function ArrearsReportPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    redirect("/");
  }

  const report = await getArrearsReportAction();

  // High risk counts (DPD > 60: bucket 61-90 + 90+)
  const criticalCount = report
    ? (report.bucket61_90?.count || 0) + (report.bucket90plus?.count || 0)
    : 0;
  const criticalBalance = report
    ? (report.bucket61_90?.totalBalance || 0) + (report.bucket90plus?.totalBalance || 0)
    : 0;

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
            title="Arrears & Delinquency"
            subtext="Overdue vehicle financing contracts categorized by aging bucket, recovery stage, and days past due (DPD)."
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <PrintButton className="btn-secondary flex items-center gap-2 text-13" />
          <PdfExportButton reportType="arrears" data={report} />
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
          title="Vehicle Financing Arrears & Delinquency Report"
          subtext={`Generated: ${new Date().toLocaleString("en-KE")} | Authorized: ${user.firstName} ${user.lastName}`}
        />
      </div>

      {!report ? (
        <div className="card-premium py-12 text-center text-gray-500">
          <AlertTriangle className="size-8 mx-auto text-amber-500 mb-2" />
          <p className="font-semibold text-gray-800">Failed to load arrears report.</p>
          <p className="text-12 text-gray-400 mt-1">Please try again or contact system administrator.</p>
        </div>
      ) : (
        <>
          {/* Executive Overview KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Overdue Balance"
              value={formatAmount(report.totalOverdue)}
              subtext={`${report.rows.length} vehicle contract${report.rows.length !== 1 ? "s" : ""} in arrears`}
              icon={<TrendingDown className="size-4" />}
              variant="danger"
            />
            <KpiCard
              label="Accrued Late Penalties"
              value={formatAmount(report.totalPenalties)}
              subtext="Unpaid regulatory & late fees"
              icon={<Coins className="size-4" />}
              variant="warning"
            />
            <KpiCard
              label="Total Claim (Debt + Fees)"
              value={formatAmount(report.totalOverdue + report.totalPenalties)}
              subtext="Cumulative recovery claim"
              icon={<Car className="size-4" />}
              variant="default"
            />
            <KpiCard
              label="Critical Repossession Risk"
              value={`${criticalCount} units`}
              subtext={`Total claim: ${formatAmount(criticalBalance)} (>60 DPD)`}
              icon={<ShieldAlert className="size-4" />}
              variant={criticalCount > 0 ? "danger" : "success"}
            />
          </div>

          {/* Aging Bucket Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-13 font-bold text-gray-500 uppercase tracking-widest">
                Aging Bucket Classification
              </h3>
              <span className="text-12 text-gray-400 font-medium">
                Standard Hire-Purchase Recovery Stages
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "1–30 Days (Watchlist)",
                  data: report.bucket1_30,
                  variant: "warning" as const,
                  stage: "Early Grace / Automated SMS",
                  icon: <Clock className="size-4" />,
                },
                {
                  label: "31–60 Days (Substandard)",
                  data: report.bucket31_60,
                  variant: "warning" as const,
                  stage: "Collections Officer Outreach",
                  icon: <AlertTriangle className="size-4" />,
                },
                {
                  label: "61–90 Days (Defaulting)",
                  data: report.bucket61_90,
                  variant: "danger" as const,
                  stage: "Pre-Repossession Warning",
                  icon: <AlertTriangle className="size-4" />,
                },
                {
                  label: "90+ Days (Critical / Loss)",
                  data: report.bucket90plus,
                  variant: "danger" as const,
                  stage: "Vehicle Repossession Candidate",
                  icon: <ShieldAlert className="size-4" />,
                },
              ].map(({ label, data, variant, stage, icon }) => (
                <KpiCard
                  key={label}
                  label={label}
                  value={formatAmount(data.totalBalance)}
                  subtext={`${data.count} vehicle${data.count !== 1 ? "s" : ""} • ${stage}`}
                  icon={icon}
                  variant={variant}
                />
              ))}
            </div>
          </div>

          {/* Visual Analytics & Recovery Protocol */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Chart */}
            <div className="card-premium lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-14 font-bold text-gray-700 uppercase tracking-wider">
                    Aging Bucket Exposure Distribution
                  </h3>
                  <span className="text-12 text-gray-400">Total Outstanding by Stage</span>
                </div>
                <p className="text-12 text-gray-400 mb-4">
                  Visual breakdown of total capital exposure grouped by delinquency severity.
                </p>
              </div>

              <div className="py-2">
                <ArrearsChart summary={report} />
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-12 text-gray-500">
                <span>Total Delinquent Balance:</span>
                <span className="font-bold text-red-600 text-13 tabular-nums">
                  {formatAmount(report.totalOverdue)}
                </span>
              </div>
            </div>

            {/* Delinquency Escalation Policy Card */}
            <div className="card-premium lg:col-span-5 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-14 font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-blue-600" />
                  <span>Delinquency Recovery Protocol</span>
                </h3>
                <p className="text-12 text-gray-400 mb-4">
                  Dealership policy for asset finance collections and asset protection.
                </p>

                <div className="space-y-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-12">
                    <div className="font-bold text-emerald-900 flex items-center justify-between">
                      <span>0–7 Days: Grace Period</span>
                      <span className="text-10 uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                        Performing
                      </span>
                    </div>
                    <p className="text-emerald-700/90 text-11 mt-0.5">
                      Standard buffer. No penalty applied; gentle SMS reminder.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100 text-12">
                    <div className="font-bold text-amber-900 flex items-center justify-between">
                      <span>7–30 Days: Watchlist</span>
                      <span className="text-10 uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                        Overdue
                      </span>
                    </div>
                    <p className="text-amber-700/90 text-11 mt-0.5">
                      Late payment fees accrue daily. Automated notifications sent to borrower.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-orange-50/60 border border-orange-100 text-12">
                    <div className="font-bold text-orange-900 flex items-center justify-between">
                      <span>31–60 Days: Substandard</span>
                      <span className="text-10 uppercase px-1.5 py-0.2 rounded bg-orange-100 text-orange-800">
                        First Cycle Miss
                      </span>
                    </div>
                    <p className="text-orange-700/90 text-11 mt-0.5">
                      Direct debt recovery officer assignment & contact with vehicle guarantors.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-12">
                    <div className="font-bold text-rose-900 flex items-center justify-between">
                      <span>61–90+ Days: Default & Loss</span>
                      <span className="text-10 uppercase px-1.5 py-0.2 rounded bg-rose-200 text-rose-900 font-extrabold">
                        Repossession
                      </span>
                    </div>
                    <p className="text-rose-800/90 text-11 mt-0.5">
                      Formal legal demand, GPS tracking activation, and repossession order dispatch. Debt remains active.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <Link
                  href="/loans"
                  className="inline-flex items-center gap-1.5 text-12 font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <span>Review all active financing agreements</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Interactive Overdue Ledger Table */}
          <ArrearsLedgerTable
            rows={report.rows}
            totalOverdue={report.totalOverdue}
            totalPenalties={report.totalPenalties}
          />
        </>
      )}
    </section>
  );
}
