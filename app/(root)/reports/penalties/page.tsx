export const dynamic = "force-dynamic";

import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getPenaltySummaryAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import DateRangeFilter from "@/components/reports/DateRangeFilter";
import PdfExportButton from "@/components/reports/PdfExportButton";
import PrintButton from "@/components/reports/PrintButton";
import CompanyHeader from "@/components/reports/CompanyHeader";
import PenaltyLedgerTable from "@/components/reports/PenaltyLedgerTable";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Coins,
  Car,
  ArrowUpRight,
  AlertTriangle,
  Info,
} from "lucide-react";

export default async function PenaltiesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    redirect("/");
  }

  const sp = await searchParams;
  const report = await getPenaltySummaryAction({
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
            title="Penalties & Late Fees"
            subtext="Charged late payment fees, penalty waivers, and fee receivables across vehicle financing contracts."
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <PrintButton className="btn-secondary flex items-center gap-2 text-13" />
          <PdfExportButton reportType="penalties" data={report} />
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
          title="Vehicle Financing Penalties & Late Fees Report"
          subtext={`Generated: ${new Date().toLocaleString("en-KE")} | Officer: ${user.firstName} ${user.lastName}`}
        />
      </div>

      {/* Date Filter Bar */}
      <div className="card-premium print:hidden">
        <Suspense fallback={<div className="h-9 w-64 bg-gray-100 rounded-md animate-pulse" />}>
          <DateRangeFilter label="Filter Penalty Period" />
        </Suspense>
      </div>

      {!report ? (
        <div className="card-premium py-12 text-center text-gray-500">
          <AlertTriangle className="size-8 mx-auto text-amber-500 mb-2" />
          <p className="font-semibold text-gray-800">Failed to load penalty report.</p>
          <p className="text-12 text-gray-400 mt-1">Please try again or contact system administrator.</p>
        </div>
      ) : (
        <>
          {/* Executive Overview KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Penalties Charged"
              value={formatAmount(report.totalCharged)}
              subtext={`${report.chargedCount} active late fee record${report.chargedCount !== 1 ? "s" : ""}`}
              icon={<ShieldAlert className="size-4" />}
              variant="danger"
            />
            <KpiCard
              label="Penalties Reversed / Waived"
              value={formatAmount(report.totalReversed)}
              subtext={`${report.reversedCount} waived record${report.reversedCount !== 1 ? "s" : ""}`}
              icon={<ShieldCheck className="size-4" />}
              variant="success"
            />
            <KpiCard
              label="Net Fee Receivables"
              value={formatAmount(report.totalOutstanding)}
              subtext="Unpaid late fees owed"
              icon={<Coins className="size-4" />}
              variant="warning"
            />
            <KpiCard
              label="Contracts Penalized"
              value={`${report.uniqueAgreementsCount ?? 0} units`}
              subtext="Vehicle agreements with fees"
              icon={<Car className="size-4" />}
              variant="default"
            />
          </div>

          {/* Policy & Repayment Waterfall Context Notice */}
          <div className="card-premium bg-gradient-to-r from-blue-50/60 to-indigo-50/40 border-blue-100/80 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100/70 text-blue-700 shrink-0 mt-0.5">
                <Info className="size-4" />
              </div>
              <div className="text-12 space-y-1">
                <p className="font-bold text-blue-900">
                  Dealership Penalty & Repayment Allocation Policy
                </p>
                <p className="text-blue-800/80 leading-relaxed">
                  Penalties accrue automatically or via manager action when installments fall past due.
                  Incoming client repayments are prioritized through the strict payment waterfall:
                  <span className="font-semibold text-blue-950"> 1. Outstanding Penalties → 2. Overdue Interest → 3. Principal Balance</span>.
                  Penalty reversals require management approval and immediately update the agreement ledger.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Interactive Penalty Ledger */}
          <PenaltyLedgerTable
            rows={report.rows}
            totalCharged={report.totalCharged}
            totalReversed={report.totalReversed}
          />
        </>
      )}
    </section>
  );
}
