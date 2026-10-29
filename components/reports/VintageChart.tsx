"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart
} from "recharts";
import type { VintageCohort } from "@/lib/reports/report.types";
import { formatAmount } from "@/lib/utils";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const cohort = payload[0].payload as VintageCohort;
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 min-w-[240px]">
        <p className="text-sm font-bold text-slate-800 mb-3">{label} Cohort</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-slate-500">Total Disbursed</span>
            <span className="text-xs font-semibold text-slate-900">
              {formatAmount(cohort.totalDisbursed)}
            </span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-slate-500">Active Balance</span>
            <span className="text-xs font-semibold text-slate-900">
              {formatAmount(cohort.activeBalance)}
            </span>
          </div>
          <div className="h-px bg-slate-100 my-2" />
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs font-medium text-orange-600">PAR30 Balance</span>
            <span className="text-xs font-bold text-orange-600">
              {formatAmount(cohort.par30Balance)}
            </span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs font-medium text-red-600">Default Balance</span>
            <span className="text-xs font-bold text-red-600">
              {formatAmount(cohort.defaultBalance)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function VintageChart({ data }: { data: VintageCohort[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
        <p className="text-sm text-gray-500">No vintage data available for this period.</p>
      </div>
    );
  }


  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "#64748B" }} 
            dy={10}
          />
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "#64748B" }} 
            dx={-10}
            tickFormatter={(val) => `${val}%`}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "#64748B" }} 
            dx={10}
            tickFormatter={(val) => `KES ${(val / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(241, 245, 249, 0.5)" }} />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          
          {/* Background Bar for Total Volume */}
          <Bar 
            yAxisId="right"
            dataKey="totalDisbursed" 
            name="Disbursed Volume" 
            fill="#E2E8F0" 
            radius={[4, 4, 0, 0]} 
            barSize={40}
          />
          
          {/* Lines for Risk Rates */}
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="par30Ratio" 
            name="PAR30 Rate (%)" 
            stroke="#F97316" 
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="defaultRatio" 
            name="Default Rate (%)" 
            stroke="#DC2626" 
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
