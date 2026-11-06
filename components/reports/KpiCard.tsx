import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  icon?: ReactNode;
  variant?: "default" | "danger" | "success" | "warning" | "info" | "primary";
  className?: string;
}

export default function KpiCard({
  label,
  value,
  subtext,
  trend,
  trendLabel,
  icon,
  variant = "default",
  className,
}: KpiCardProps) {
  const variantStyles = {
    default: { bg: "bg-gray-50 dark:bg-[#18221A]", text: "text-gray-700 dark:text-[#C1CBC3]", ring: "ring-gray-200/50 dark:ring-[#29352D]" },
    danger:  { bg: "bg-red-50 dark:bg-rose-950/40",  text: "text-red-600 dark:text-[#FF626D]",  ring: "ring-red-100 dark:ring-rose-900/40" },
    success: { bg: "bg-green-50 dark:bg-emerald-950/40",text: "text-green-600 dark:text-[#B7FF3C]",ring: "ring-green-100 dark:ring-emerald-900/40" },
    warning: { bg: "bg-amber-50 dark:bg-amber-950/40",text: "text-amber-600 dark:text-[#F5BD4F]",ring: "ring-amber-100 dark:ring-amber-900/40" },
    info:    { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-100 dark:ring-blue-900/40" },
    primary: { bg: "bg-green-50 dark:bg-emerald-950/40", text: "text-green-600 dark:text-[#B7FF3C]", ring: "ring-green-100 dark:ring-emerald-900/40" },
  }[variant];

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-600 dark:text-[#B7FF3C]" : trend === "down" ? "text-red-500 dark:text-[#FF626D]" : "text-gray-400 dark:text-[#A1ADA4]";

  return (
    <div className={cn("card-premium dark:bg-[#151D17] dark:border-[#29352D] flex flex-col justify-between group overflow-hidden relative", className)}>
      <div className="flex justify-between items-start mb-6">
        <p className="text-12 font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-widest">{label}</p>
        {icon && (
          <div className={cn("p-2 rounded-lg ring-1 transition-colors", variantStyles.bg, variantStyles.text, variantStyles.ring)}>
            {icon}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-32 font-bold text-gray-900 dark:text-[#F4F7F4] tracking-tight tabular-nums leading-none">
          {value}
        </h2>

        {(subtext || trend) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {trend && (
              <span className={cn("flex items-center gap-1 text-12 font-semibold", trendColor)}>
                <TrendIcon className="size-3.5" />
                {trendLabel}
              </span>
            )}
            {subtext && (
              <span className="text-12 text-gray-500 dark:text-[#A1ADA4]">{subtext}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
