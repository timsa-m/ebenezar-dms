"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { formatKES } from "@/src/lib/financial-engine";
import type {
  DealershipExpenseCategory,
  DealershipVehicleCostType,
} from "@/lib/reports/report.types";

interface DealershipBusinessChartsProps {
  generalExpensesTotal: number;
  vehicleCostsTotal: number;
  capitalInYardStock: number;
  totalFinancingReceivables: number;
  totalRevenue: number;
  generalByCategory: DealershipExpenseCategory[];
  vehicleCostsByType: DealershipVehicleCostType[];
  delinquency: {
    performing: { count: number; balance: number };
    earlyArrears: { count: number; balance: number };
    highRisk: { count: number; balance: number };
    criticalDefault: { count: number; balance: number };
  };
}

const EXPENSE_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"];
const CAPITAL_COLORS = ["#3b82f6", "#8b5cf6", "#10b981"];

export default function DealershipBusinessCharts({
  generalExpensesTotal,
  vehicleCostsTotal,
  capitalInYardStock,
  totalFinancingReceivables,
  totalRevenue,
  generalByCategory,
  vehicleCostsByType,
  delinquency,
}: DealershipBusinessChartsProps) {
  const [expenseView, setExpenseView] = useState<"summary" | "yard" | "general">("summary");

  // 1. Expense Breakdown Data
  const summaryExpenseData = [
    { name: "General Operating Overheads", value: generalExpensesTotal, color: "#f97316" },
    { name: "Yard Vehicle Reconditioning", value: vehicleCostsTotal, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const yardCostData = vehicleCostsByType.map((c, i) => ({
    name: c.label,
    value: c.amount,
    color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
  })).filter(d => d.value > 0);

  const generalExpenseData = generalByCategory.map((c, i) => ({
    name: c.category,
    value: c.amount,
    color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
  })).filter(d => d.value > 0);

  const currentExpenseChartData =
    expenseView === "yard"
      ? yardCostData
      : expenseView === "general"
        ? generalExpenseData
        : summaryExpenseData;

  // 2. Capital & Value Allocation
  const capitalAllocationData = [
    { name: "Capital in Yard Vehicles", value: capitalInYardStock, color: "#3b82f6" },
    { name: "Active Financing Receivables", value: totalFinancingReceivables, color: "#8b5cf6" },
    { name: "Collected Inflow to Date", value: totalRevenue, color: "#10b981" },
  ].filter((d) => d.value > 0);

  // 3. Delinquency Risk Bar Chart
  const delinquencyBarData = [
    { name: "0-30 DPD (Performing)", balance: delinquency.performing.balance, count: delinquency.performing.count, fill: "#10b981" },
    { name: "31-60 DPD (Arrears)", balance: delinquency.earlyArrears.balance, count: delinquency.earlyArrears.count, fill: "#f59e0b" },
    { name: "61-90 DPD (High Risk)", balance: delinquency.highRisk.balance, count: delinquency.highRisk.count, fill: "#f97316" },
    { name: "90+ DPD (Critical)", balance: delinquency.criticalDefault.balance, count: delinquency.criticalDefault.count, fill: "#ef4444" },
  ];

  const totalExpenseVal = generalExpensesTotal + vehicleCostsTotal;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Expense Distribution Chart ─────────────────────────── */}
      <div className="card-premium flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest">
                Dealership Expense Distribution
              </h3>
              <p className="text-12 text-gray-400 mt-0.5">
                Total Tracked Outflow: <span className="font-bold text-gray-900">{formatKES(totalExpenseVal)}</span>
              </p>
            </div>

            {/* Toggle tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-semibold">
              <Badge
                variant={expenseView === "summary" ? "secondary" : "outline"}
                role="button"
                tabIndex={0}
                aria-pressed={expenseView === "summary"}
                onClick={() => setExpenseView("summary")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpenseView("summary");
                  }
                }}
                className={`badge badge-primary p-2 cursor-pointer px-2.5 py-1 rounded-md transition select-none ${expenseView === "summary"
                  ? "bg-white text-gray-900 shadow-xs hover:bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-blue-400"
                  }`}
              >
                Overview
              </Badge>
              <Badge
                variant={expenseView === "yard" ? "secondary" : "outline"}
                role="button"
                tabIndex={0}
                aria-pressed={expenseView === "yard"}
                onClick={() => setExpenseView("yard")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpenseView("yard");
                  }
                }}
                className={`badge badge-primary cursor-pointer p-2 px-2.5 py-1 rounded-md transition select-none ${expenseView === "yard"
                  ? "bg-white text-gray-900 shadow-xs hover:bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-red-400"
                  }`}
              >
                Yard Prep ({vehicleCostsByType.length})
              </Badge>
              <Badge
                variant={expenseView === "general" ? "secondary" : "outline"}
                role="button"
                tabIndex={0}
                aria-pressed={expenseView === "general"}
                onClick={() => setExpenseView("general")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpenseView("general");
                  }
                }}
                className={`badge badge-primarycursor-pointer px-2.5 py-1 rounded-md transition select-none ${expenseView === "general"
                  ? "bg-white text-gray-900 shadow-xs hover:bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-amber-400"
                  }`}
              >
                Overheads ({generalByCategory.length})
              </Badge>
            </div>
          </div>

          {currentExpenseChartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-13">
              No expense records found in this category
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={currentExpenseChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name.substring(0, 16)}${name.length > 16 ? "..." : ""} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {currentExpenseChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color || EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatKES(Number(val)), "Amount"]}
                  contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e5e7eb", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Breakdown Key */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-around gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-orange-500" />
            <span className="text-gray-600 font-medium">General Overheads:</span>
            <span className="font-bold text-gray-900">{formatKES(generalExpensesTotal)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-600" />
            <span className="text-gray-600 font-medium">Yard Vehicle Prep:</span>
            <span className="font-bold text-gray-900">{formatKES(vehicleCostsTotal)}</span>
          </div>
        </div>
      </div>

      {/* ── Capital Allocation & Portfolio Velocity ────────────── */}
      <div className="card-premium flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest">
                Business Capital Allocation
              </h3>
              <p className="text-12 text-gray-400 mt-0.5">
                Physical Inventory vs. Outstanding Book vs. Collected Capital
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={capitalAllocationData}
                cx="50%"
                cy="50%"
                outerRadius={95}
                innerRadius={55}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name.split(" ")[0]} ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {capitalAllocationData.map((entry, index) => (
                  <Cell key={index} fill={entry.color || CAPITAL_COLORS[index % CAPITAL_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any) => [formatKES(Number(val)), "Value"]}
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Metric tiles */}
        <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-blue-50/70 p-2 rounded-lg">
            <p className="text-11 text-blue-700 font-medium">Yard Stock</p>
            <p className="font-bold text-blue-900 mt-0.5">{formatKES(capitalInYardStock)}</p>
          </div>
          <div className="bg-purple-50/70 p-2 rounded-lg">
            <p className="text-11 text-purple-700 font-medium">Receivables</p>
            <p className="font-bold text-purple-900 mt-0.5">{formatKES(totalFinancingReceivables)}</p>
          </div>
          <div className="bg-emerald-50/70 p-2 rounded-lg">
            <p className="text-11 text-emerald-700 font-medium">Collected</p>
            <p className="font-bold text-emerald-900 mt-0.5">{formatKES(totalRevenue)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
