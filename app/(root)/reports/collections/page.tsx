import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getCollectionReportAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import DateRangeFilter from "@/components/reports/DateRangeFilter";
import PdfExportButton from "@/components/reports/PdfExportButton";
import { TrendingUp, TrendingDown, Percent } from "lucide-react";
import Link from "next/link";
import CompanyHeader from "@/components/reports/CompanyHeader";
import { Suspense } from "react";

export default async function CollectionsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const sp = await searchParams;
  const report = await getCollectionReportAction({
    dateRange: sp.from || sp.to ? { from: sp.from ?? "", to: sp.to ?? "" } : undefined,
  });

  return (
    <section className="home-content animate-fade-in print:p-6">
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox title="Collections Report" subtext="Expected vs actual repayments collected." />
        </div>
        <PdfExportButton reportType="collections" data={report} />
      </header>

      <div className="hidden print:block">
        <CompanyHeader
          title="Collections Report"
          subtext={`Period: ${report?.period} | Generated: ${new Date().toLocaleString("en-KE")}`}
        />
      </div>

      {/* Filter bar */}
      <div className="card-premium mb-6 print:hidden">
        <Suspense fallback={<div className="h-9 w-64 bg-gray-100 rounded-md animate-pulse" />}>
          <DateRangeFilter label="Filter Period" />
        </Suspense>
      </div>

      {!report ? (
        <p className="text-gray-500 text-13">Failed to load report.</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <KpiCard
              label="Expected Collections"
              value={formatAmount(report.totalExpected)}
              icon={<TrendingUp className="size-4" />}
              variant="default"
            />
            <KpiCard
              label="Actual Collections"
              value={formatAmount(report.totalCollected)}
              icon={<TrendingDown className="size-4" />}
              variant="success"
            />

          </div>

          {/* Collection efficiency bar */}
          <div className="card-premium mb-6">
            {/*<div className="flex justify-between items-center mb-2">
              <span className="text-13 font-semibold text-gray-700">Collection Efficiency</span>
              <span className="text-13 font-bold text-green-600">{report.collectionRate}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  report.collectionRate >= 80 ? "bg-green-500" :
                  report.collectionRate >= 50 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${Math.min(100, report.collectionRate)}%` }}
              />
            </div>
            <p className="text-12 text-gray-400 mt-2">
              KES {report.totalCollected.toLocaleString()} collected of KES {report.totalExpected.toLocaleString()} expected
            </p>
            */}

            <details className="mt-4 group">
              <summary className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-md text-13 font-medium cursor-pointer hover:bg-blue-100 transition-colors list-none select-none">
                <TrendingUp className="size-4" />
                View Collection Breakdown
              </summary>
              <div className="mt-4 p-4 border border-gray-100 rounded-lg bg-gray-50/50 flex flex-col md:flex-row gap-6 animate-in slide-in-from-top-2">
                <div className="flex-1">
                  <p className="text-12 text-gray-500 uppercase tracking-wider font-bold mb-1">Deposits & Cash Sales</p>
                  <p className="text-18 font-extrabold text-blue-700">{formatAmount(report.totalDeposits)}</p>
                  <p className="text-12 text-gray-400 mt-1">Dated by agreement start date (backdated where applicable)</p>
                </div>
                <div className="w-px bg-gray-200 hidden md:block"></div>
                <div className="flex-1">
                  <p className="text-12 text-gray-500 uppercase tracking-wider font-bold mb-1">Recorded Payments</p>
                  <p className="text-18 font-extrabold text-green-700">{formatAmount(report.totalRepayments)}</p>
                  <p className="text-12 text-gray-400 mt-1">From ongoing financing installments</p>
                </div>
              </div>
            </details>
          </div>

          {/* Detail table */}
          <div className="card-premium">
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
              Collections Detail ({report.rows.length})
            </h3>
            <div className="data-table-wrap">
              <div className="data-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr className="data-table-head-row">
                      <th className="data-th text-left">Client</th>
                      <th className="data-th text-left">Sale Type</th>
                      <th className="data-th text-right">Financed Amount</th>
                      <th className="data-th text-right">Expected</th>
                      <th className="data-th text-right">Collected</th>
                      <th className="data-th text-right">Balance</th>
                      <th className="data-th text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="data-empty-cell">
                          <div className="data-empty"><p className="text-14 text-gray-500">No collections found</p></div>
                        </td>
                      </tr>
                    ) : report.rows.map((row: any) => (
                      <tr key={row.loanId} className="data-table-row">
                        <td className="data-td font-medium text-gray-900">{row.clientName}</td>
                        <td className="data-td text-gray-500">{row.loanType}</td>
                        <td className="data-td text-right tabular-nums">{formatAmount(row.principalAmount)}</td>
                        <td className="data-td text-right tabular-nums text-gray-500">{formatAmount(row.installmentAmount)}</td>
                        <td className="data-td text-right tabular-nums text-green-600 font-semibold">{formatAmount(row.totalRepaid)}</td>
                        <td className="data-td text-right tabular-nums font-semibold text-red-600">{formatAmount(row.balance)}</td>
                        <td className="data-td">
                          <span className={cn("badge", {
                            "badge-success": row.status === "Active",
                            "badge-error": row.status === "Overdue" || row.status === "Written Off" || row.status === "Loss",
                            "badge-completed": row.status === "Fully Paid",
                            "badge-pending": row.status === "Pending",
                          })}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )
      }
    </section >
  );
}
