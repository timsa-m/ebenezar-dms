import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getVintageAnalysisReportAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import HeaderBox from "@/components/HeaderBox";
import PdfExportButton from "@/components/reports/PdfExportButton";
import CompanyHeader from "@/components/reports/CompanyHeader";
import VintageChart from "@/components/reports/VintageChart";
import Link from "next/link";
import { BarChart2, ShieldAlert } from "lucide-react";

export default async function VintageAnalysisPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  // Fetch the last 12 months by default as requested
  const report = await getVintageAnalysisReportAction(12);

  if (!report) {
    return (
      <section className="home-content">
        <p className="text-gray-500 text-13">Failed to load vintage analysis report.</p>
      </section>
    );
  }

  // Calculate some aggregate KPIs
  let totalDisbursed = 0;
  let totalPar30 = 0;
  let totalDefault = 0;
  
  // Find worst performing cohort
  let worstCohort = report.cohorts[0];

  report.cohorts.forEach((c: any) => {
    totalDisbursed += c.totalDisbursed;
    totalPar30 += c.par30Balance;
    totalDefault += c.defaultBalance;
    
    if (c.par30Ratio + c.defaultRatio > (worstCohort?.par30Ratio || 0) + (worstCohort?.defaultRatio || 0)) {
      worstCohort = c;
    }
  });

  const avgPar30 = totalDisbursed > 0 ? (totalPar30 / totalDisbursed) * 100 : 0;
  const avgDefault = totalDisbursed > 0 ? (totalDefault / totalDisbursed) * 100 : 0;

  return (
    <section className="home-content animate-fade-in print:p-6">
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox
            title="Vintage Analysis"
            subtext="View performance and default rates of loan cohorts."
          />
        </div>
        <PdfExportButton reportType="vintage" data={report} />
      </header>

      <div className="hidden print:block">
        <CompanyHeader
          title="Vintage Analysis Report"
          subtext={`Period: ${report.period} | Generated: ${new Date().toLocaleString("en-KE")}`}
        />
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-premium flex flex-col justify-between p-5 border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start mb-4">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Total Volume Analyzed</p>
            <BarChart2 className="size-4 text-blue-500" />
          </div>
          <div>
            <h2 className="text-24 font-bold text-gray-900">{formatAmount(totalDisbursed)}</h2>
            <p className="text-12 text-gray-500 font-medium mt-1">Across {report.cohorts.length} cohorts</p>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between p-5 border-l-4 border-l-orange-500">
          <div className="flex justify-between items-start mb-4">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Average PAR30 Rate</p>
            <ShieldAlert className="size-4 text-orange-500" />
          </div>
          <div>
            <h2 className="text-24 font-bold text-gray-900">{avgPar30.toFixed(2)}%</h2>
            <p className="text-12 text-gray-500 font-medium mt-1">Total PAR30 / Total Disbursed</p>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between p-5 border-l-4 border-l-red-500">
          <div className="flex justify-between items-start mb-4">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Highest Risk Cohort</p>
            <ShieldAlert className="size-4 text-red-500" />
          </div>
          <div>
            <h2 className="text-24 font-bold text-gray-900">{worstCohort ? worstCohort.label : 'N/A'}</h2>
            <p className="text-12 text-gray-500 font-medium mt-1">
              {worstCohort ? `${worstCohort.par30Ratio}% PAR30 | ${worstCohort.defaultRatio}% Default` : 'No data'}
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card-premium mb-6">
        <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Risk Trend by Origination Month
        </h3>
        <VintageChart data={report.cohorts} />
      </div>

      {/* Data Table */}
      <div className="card-premium">
        <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Cohort Data Ledger
        </h3>
        <div className="data-table-wrap">
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr className="data-table-head-row">
                  <th className="data-th text-left">Cohort (Origination)</th>
                  <th className="data-th text-right">Total Disbursed</th>
                  <th className="data-th text-right">Active Balance</th>
                  <th className="data-th text-right">PAR30 Balance</th>
                  <th className="data-th text-right">Default Balance</th>
                  <th className="data-th text-right">PAR30 %</th>
                  <th className="data-th text-right">Default %</th>
                </tr>
              </thead>
              <tbody>
                {report.cohorts.length > 0 ? (
                  report.cohorts.map((cohort: any) => (
                    <tr key={cohort.label} className="data-table-row">
                      <td className="data-td font-medium text-gray-900">{cohort.label}</td>
                      <td className="data-td text-right tabular-nums">{formatAmount(cohort.totalDisbursed)}</td>
                      <td className="data-td text-right tabular-nums text-gray-600">{formatAmount(cohort.activeBalance)}</td>
                      <td className="data-td text-right tabular-nums font-medium text-orange-600">{formatAmount(cohort.par30Balance)}</td>
                      <td className="data-td text-right tabular-nums font-bold text-red-600">{formatAmount(cohort.defaultBalance)}</td>
                      <td className="data-td text-right tabular-nums">
                        <span className={`px-2 py-1 rounded-lg text-12 font-bold ${cohort.par30Ratio > 5 ? 'bg-orange-100 text-orange-700' : 'text-gray-600'}`}>
                          {cohort.par30Ratio}%
                        </span>
                      </td>
                      <td className="data-td text-right tabular-nums">
                        <span className={`px-2 py-1 rounded-lg text-12 font-bold ${cohort.defaultRatio > 0 ? 'bg-red-100 text-red-700' : 'text-gray-600'}`}>
                          {cohort.defaultRatio}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-sm text-gray-500">
                      No data available for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
