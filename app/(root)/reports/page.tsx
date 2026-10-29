import { getLoggedInUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import {
  BarChart2,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ShieldAlert,
  ClipboardList,
  Calendar,
  FileText,
  Activity,
  Users,
  PieChart,
  CalendarClock,
} from "lucide-react";
import ReportCard from "@/components/reports/ReportCard";
import HeaderBox from "@/components/HeaderBox";

export default async function ReportsPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    redirect("/");
  }

  const liveReports = [
    {
      title: "Daily Report",
      description: "Today's action list: Agreements due this ISO week and all overdue accounts.",
      href: "/reports/daily",
      icon: CalendarClock,
      badge: "Daily",
      badgeVariant: "danger" as const,
    },
    {
      title: "Dealership Business & Operations",
      description: "Executive operations: yard stock capital, vehicle reconditioning costs, operating overheads, and asset financing performance.",
      href: "/reports/portfolio",
      icon: BarChart2,
      badge: "Executive",
      badgeVariant: "success" as const,
    },
    {
      title: "Collections Report",
      description: "Track collections including financing installments, deposits, and pure cash sales (reported separately). Filterable by date.",
      href: "/reports/collections",
      icon: TrendingUp,
      badge: "Live",
      badgeVariant: "success" as const,
    },
    {
      title: "Arrears & Delinquency",
      description: "Overdue Agreements categorized by aging buckets: 1–30, 31–60, 61–90, and 90+ days past due. With client contact details.",
      href: "/reports/arrears",
      icon: AlertTriangle,
      badge: "Live",
      badgeVariant: "danger" as const,
    },
    {
      title: "Penalty & Waiver Log",
      description: "All manual penalties and waivers charged or reversed, filterable by date. Tracks total outstanding penalty exposure.",
      href: "/reports/penalties",
      icon: ShieldAlert,
    },

    {
      title: "Expenses Tracking",
      description: "Log and track all business and operational expenses to feed into the income statement.",
      href: "/expenses",
      icon: DollarSign,
      badge: "New",
      badgeVariant: "success" as const,
    },
  ];


  const analyticsReports = [
    {
      title: "Income Statement",
      description: "Trading Margin (Vehicle Sales - Purchase Costs) + Financing Income (Interest & Penalties) minus tracked expenses.",
      href: "/reports/income",
      icon: Activity,
      badge: "New",
      badgeVariant: "success" as const,
    },
    /*
     {
      title: "Cash Flow",
      description: "Monthly disbursements vs collections, net cash position, and 12-month trend analysis.",
      href: "/reports/cash-flow",
      icon: DollarSign,
      badge: "Live",
      badgeVariant: "success" as const,
    },
     */
    /*
    {
      title: "Portfolio At Risk (PAR)",
      description: "Industry-standard MFI health metric. PAR30/60/90 rates, risk ladder, and full at-risk loan ledger. PAR30 should stay below 5%.",
      href: "/reports/par",
      icon: PieChart,
      badge: "New",
      badgeVariant: "success" as const,
    },
    */
  ];

  const periodReports = [
    {
      title: "Monthly Portfolio Snapshot",
      description: "Immutable period-end snapshots. Opening/closing balances, new loans, collections — frozen at month-end and never modified.",
      href: "/reports/monthly",
      icon: Calendar,
      badge: "Snapshot",
      badgeVariant: "danger" as const,
    },

  ];

  return (
    <section className="home-content animate-fade-in">
      <header className="page-header">
        <HeaderBox
          title="Reports"
          subtext="Financial reports, portfolio analytics, and period snapshots."
        />
      </header>

      {/* Live Business Reports */}
      <div className="mb-8">
        <h2 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Live Business Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveReports.map((report) => (
            <ReportCard key={report.href} {...report} />
          ))}
        </div>
      </div>

      {/* Analytics & Risk */}
      <div className="mb-8">
        <h2 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Analytics &amp; Risk
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyticsReports.map((report) => (
            <ReportCard key={report.href} {...report} />
          ))}
        </div>
      </div>

      {/* Period-Based & Client */}
      <div>
        <h2 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Period-Based &amp; Client Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {periodReports.map((report) => (
            <ReportCard key={report.href} {...report} />
          ))}
        </div>
      </div>
    </section>
  );
}
