import { getLoggedInUser } from "@/lib/actions/user.actions";
import {
  listMonthlyReportsAction,
  generateMonthlySnapshotAction,
} from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import HeaderBox from "@/components/HeaderBox";
import Link from "next/link";
import { formatAmount, cn } from "@/lib/utils";
import {
  Calendar,
  Plus,
  FileBarChart,
  Car,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Activity,
  AlertCircle,
} from "lucide-react";

export default async function MonthlyReportsHubPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const reports = await listMonthlyReportsAction();

  // Server action to generate or update monthly snapshot
  const handleGenerateSnapshot = async (formData: FormData) => {
    "use server";
    const year = parseInt(formData.get("year") as string, 10);
    const month = parseInt(formData.get("month") as string, 10);
    const overwrite = formData.get("overwrite") === "true";
    await generateMonthlySnapshotAction({ year, month, generatedBy: "", overwrite });
    revalidatePath("/reports/monthly");
    redirect(`/reports/monthly/${year}/${month}`);
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Latest snapshot metrics
  const latestReport = reports && reports.length > 0 ? reports[0] : null;

  return (
    <section className="home-content animate-fade-in">
      <header className="page-header">
        <div>
          <Link
            href="/reports"
            className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-flex items-center gap-1"
          >
            ← Back to All Reports
          </Link>
          <HeaderBox
            title="Monthly Portfolio Snapshots"
            subtext="Period-based audit ledgers for motor vehicle hire-purchase and asset financing agreements."
          />
        </div>
      </header>

      {/* Dealership Executive Quick Summary */}
      {latestReport && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card-premium py-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Car className="size-4" />
              </div>
              <span className="text-11 font-semibold text-gray-400 uppercase tracking-wider">
                Active Contracts ({latestReport.periodLabel.split(" ")[0]})
              </span>
            </div>
            <p className="text-20 font-bold text-gray-900 mt-1">
              {latestReport.totalActiveLoans}
              <span className="text-12 font-normal text-gray-400 ml-1.5"> vehicles</span>
            </p>
          </div>

          <div className="card-premium py-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
                <DollarSign className="size-4" />
              </div>
              <span className="text-11 font-semibold text-gray-400 uppercase tracking-wider">
                Closing Receivables
              </span>
            </div>
            <p className="text-20 font-bold text-gray-900 mt-1">
              {formatAmount(latestReport.closingPortfolioBalance)}
            </p>
          </div>

          <div className="card-premium py-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <TrendingUp className="size-4" />
              </div>
              <span className="text-11 font-semibold text-gray-400 uppercase tracking-wider">
                Monthly Inflow Collected
              </span>
            </div>
            <p className="text-20 font-bold text-green-600 mt-1">
              {formatAmount(latestReport.totalRepaymentsCollected)}
            </p>
          </div>

          <div className="card-premium py-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Activity className="size-4" />
              </div>
              <span className="text-11 font-semibold text-gray-400 uppercase tracking-wider">
                Collection Efficiency
              </span>
            </div>
            <p
              className={cn(
                "text-20 font-bold mt-1",
                latestReport.collectionRate >= 80
                  ? "text-green-600"
                  : latestReport.collectionRate >= 50
                    ? "text-amber-600"
                    : "text-red-600"
              )}
            >
              {latestReport.collectionRate}%
            </p>
          </div>
        </div>
      )}

      {/* Quick Jump to Recent Periods */}
      {reports && reports.length > 0 && (
        <div className="card-premium mb-6 bg-gradient-to-r from-gray-50/50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <span className="text-13 font-bold text-gray-700">
                Quick Jump to Recent Periods:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {reports.slice(0, 5).map((r: any) => (
                <Link
                  key={r.id}
                  href={`/reports/monthly/${r.year}/${r.month}`}
                  className="badge badge-primary px-3 py-1 bg-white hover:bg-primary hover:text-white text-gray-700 text-12 font-medium rounded-lg border border-gray-200 transition-colors shadow-2xs flex items-center gap-1 group"
                >
                  {r.periodLabel}
                  <ChevronRight className="size-3 text-gray-400 group-hover:text-white" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generate / Certify Snapshot Form */}
        <div className="lg:col-span-1">
          <div className="card-premium sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Plus className="size-4" />
              </div>
              <div>
                <h3 className="text-14 font-bold text-gray-900">
                  Generate / Certify Snapshot
                </h3>
                <p className="text-11 text-gray-400">
                  Immutable period-end financial ledger
                </p>
              </div>
            </div>

            <p className="text-12 text-gray-600 mb-4 leading-relaxed">
              Generate an official month-end audit snapshot for vehicle financing contracts. Captures opening portfolio receivables, new vehicle originations, collections &amp; deposits, penalties, and closing balances.
            </p>

            <form action={handleGenerateSnapshot} className="space-y-3.5">
              <div>
                <label className="form-label text-12 font-semibold text-gray-700">
                  Financial Year
                </label>
                <input
                  type="number"
                  name="year"
                  defaultValue={currentYear}
                  min={2020}
                  max={currentYear + 1}
                  className="input-class w-full"
                  required
                />
              </div>

              <div>
                <label className="form-label text-12 font-semibold text-gray-700">
                  Accounting Month
                </label>
                <select
                  name="month"
                  defaultValue={currentMonth}
                  className="input-class w-full"
                  required
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1, 1).toLocaleDateString("en-KE", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="overwrite"
                  value="true"
                  id="overwrite"
                  className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                />
                <label
                  htmlFor="overwrite"
                  className="text-12 text-gray-600 cursor-pointer select-none"
                >
                  Recalculate &amp; overwrite if snapshot already exists
                </label>
              </div>

              <button
                type="submit"
                className="btn-primary w-full justify-center py-2.5 mt-2"
              >
                <Calendar className="size-4" />
                Generate &amp; Open Snapshot
              </button>
            </form>

            <div className="mt-5 p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-blue-800 text-12 font-bold">
                <ShieldCheck className="size-4 text-blue-600" />
                Dealership Accounting Standards
              </div>
              <p className="text-11 text-blue-700 leading-relaxed">
                • <strong>Inclusion Rule:</strong> Vehicle agreements are included if originated on or prior to the month-end date and not closed prior to the month start.
              </p>
              <p className="text-11 text-blue-700 leading-relaxed">
                • <strong>Cash Sales:</strong> Classified separately from hire-purchase contracts to maintain zero recurring receivables.
              </p>
            </div>
          </div>
        </div>

        {/* Snapshot History Table */}
        <div className="lg:col-span-2">
          <div className="card-premium">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-14 font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <FileBarChart className="size-4 text-primary" />
                Dealership Snapshot History
                <span className="text-12 font-normal text-gray-400">
                  ({reports?.length || 0} periods available)
                </span>
              </h3>
            </div>

            {!reports || reports.length === 0 ? (
              <div className="data-empty py-16 text-center">
                <Car className="size-12 text-gray-200 mx-auto mb-2" />
                <p className="text-14 text-gray-600 font-semibold">
                  No monthly snapshots recorded yet
                </p>
                <p className="text-12 text-gray-400 max-w-xs mx-auto mt-1">
                  Select a year and month to generate your first vehicle financing portfolio snapshot.
                </p>
              </div>
            ) : (
              <div className="data-table-wrap">
                <div className="data-table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr className="data-table-head-row">
                        <th className="data-th text-left">Period</th>
                        <th className="data-th text-right">Active Deals</th>
                        <th className="data-th text-right">New Financed</th>
                        <th className="data-th text-right">Repayments Inflow</th>
                        <th className="data-th text-right">Closing Receivables</th>
                        <th className="data-th text-right">Collection Rate</th>
                        <th className="data-th text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((r: any) => (
                        <tr
                          key={r.id}
                          className="data-table-row group hover:bg-gray-50/80 transition-colors"
                        >
                          <td className="data-td">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 text-13">
                                {r.periodLabel}
                              </span>
                              <span className="text-11 text-gray-400">
                                {new Date(r.generatedAt).toLocaleDateString("en-KE", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </td>

                          <td className="data-td text-right tabular-nums font-semibold text-gray-800 text-13">
                            {r.totalActiveLoans}
                          </td>

                          <td className="data-td text-right tabular-nums text-13">
                            {r.totalNewLoans > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="font-semibold text-indigo-600">
                                  {r.totalNewLoans} deals
                                </span>
                                <span className="text-11 text-gray-400">
                                  {formatAmount(r.newLoansDisbursed)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          <td className="data-td text-right tabular-nums text-13">
                            <span className="font-semibold text-green-600">
                              {formatAmount(r.totalRepaymentsCollected)}
                            </span>
                          </td>

                          <td className="data-td text-right tabular-nums font-bold text-gray-900 text-13">
                            {formatAmount(r.closingPortfolioBalance)}
                          </td>

                          <td className="data-td text-right">
                            <span
                              className={cn(
                                "badge text-11 font-bold inline-block",
                                r.collectionRate >= 80
                                  ? "badge-success"
                                  : r.collectionRate >= 50
                                    ? "badge-yellow-500"
                                    : "badge-error"
                              )}
                            >
                              {r.collectionRate}%
                            </span>
                          </td>

                          <td className="data-td text-right">
                            <Link
                              href={`/reports/monthly/${r.year}/${r.month}`}
                              className="btn-secondary text-12 py-1 px-2.5 inline-flex items-center gap-1 group-hover:border-primary group-hover:text-primary transition-colors"
                            >
                              View Ledger
                              <ArrowUpRight className="size-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
