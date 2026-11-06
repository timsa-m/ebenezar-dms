import { formatAmount, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, CreditCard, Activity, CalendarCheck, Clock } from "lucide-react";
import type { ClientMetrics } from "@/lib/metrics";

interface ClientOverviewProps {
  client: any;
  clientMetrics: ClientMetrics;
}

export default function ClientOverview({ client, clientMetrics }: ClientOverviewProps) {
  const {
    totalBorrowed,
    totalOutstanding,
    totalExpectedDebt,
    totalRepaid,
    repaymentRate,
    activeLoansCount,
    healthStatus,
    healthMessage,
    healthColor,
    healthBg,
    healthIconBg,
    healthBarBg,
    healthBarContainer,
    lastPaymentDate,
    nextDueDate,
    maxDaysPastDue
  } = clientMetrics || {};

  const formattedLastPayment = lastPaymentDate
    ? new Date(lastPaymentDate).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    : 'None';

  const formattedNextDue = nextDueDate
    ? new Date(nextDueDate).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    : 'None due';

  const metrics = [
    {
      label: "Total Financed",
      value: formatAmount(client?.totalBorrowed || totalBorrowed || 0),
      icon: <TrendingUp className="size-4" />,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-100 dark:ring-blue-900/40"
    },
    {
      label: "Outstanding Balance",
      value: formatAmount(totalOutstanding || 0),
      icon: <TrendingDown className="size-4" />,
      color: "text-red-600 dark:text-rose-400",
      bg: "bg-red-50 dark:bg-rose-950/40 ring-1 ring-red-100 dark:ring-rose-900/40"
    },
    {
      label: "Total Repaid",
      value: formatAmount(totalRepaid),
      icon: <CreditCard className="size-4" />,
      color: "text-emerald-600 dark:text-[#B7FF3C]",
      bg: "bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-100 dark:ring-emerald-900/40"
    },
    {
      label: "Active Contracts",
      value: (activeLoansCount || 0).toString(),
      icon: <Activity className="size-4" />,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/40 ring-1 ring-orange-100 dark:ring-orange-900/40"
    }
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <div key={idx} className="card-premium p-6">
            <div className="flex justify-between items-start mb-4">
              <p className="text-12 font-bold text-gray-400 dark:text-[#A1ADA4] uppercase tracking-widest">{m.label}</p>
              <div className={cn("p-2 rounded-lg transition-colors", m.bg, m.color)}>
                {m.icon}
              </div>
            </div>
            <h3 className="text-24 font-bold text-gray-900 dark:text-[#F4F7F4]">{m.value}</h3>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-8">
        {/* Additional Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-premium p-6">
            <div className="flex justify-between items-center gap-4 p-4 bg-white dark:bg-[#18221A] rounded-xl border border-gray-100 dark:border-[#29352D]">
              <div>
                <p className="text-11 font-bold text-gray-400 dark:text-[#A1ADA4] uppercase tracking-wider">Last Payment</p>
                <p className="text-14 font-semibold text-gray-900 dark:text-[#F4F7F4]">
                  {formattedLastPayment}
                </p>
              </div>
              <div className="flex justify-end p-3 bg-gray-50 dark:bg-[#101612] rounded-full text-gray-400 dark:text-[#A1ADA4] ring-1 ring-gray-100 dark:ring-[#29352D]">
                <CalendarCheck className="size-5" />
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="flex justify-between items-center gap-4 p-4 bg-white dark:bg-[#18221A] rounded-xl border border-gray-100 dark:border-[#29352D]">
              <div>
                <p className="text-11 font-bold text-gray-400 dark:text-[#A1ADA4] uppercase tracking-wider">Next Due Date</p>
                <p className="text-14 font-semibold text-gray-900 dark:text-[#F4F7F4]">
                  {formattedNextDue}
                </p>
                {maxDaysPastDue > 0 && (
                  <p className="text-12 font-semibold text-red-600 dark:text-rose-400 mt-1">
                    Days Past Due: {maxDaysPastDue} (DPD)
                  </p>
                )}
              </div>
              <div className="flex justify-end p-3 bg-gray-50 dark:bg-[#101612] rounded-full text-gray-400 dark:text-[#A1ADA4] ring-1 ring-gray-100 dark:ring-[#29352D]">
                <Clock className="size-5" />
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-[#18221A] rounded-xl border border-gray-100 dark:border-[#29352D]">
              <div>
                <p className="text-11 font-bold text-gray-400 dark:text-[#A1ADA4] uppercase tracking-wider">Repayment Rate</p>
                <p className={cn("text-14 font-semibold", healthColor)}>{repaymentRate}%</p>
              </div>
              <div className={cn("flex justify-end p-3 rounded-full ring-1 ring-black/5 dark:ring-white/10", healthIconBg, healthColor)}>
                <TrendingUp className="size-4" />
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
