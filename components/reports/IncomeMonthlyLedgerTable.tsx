"use client";

import { useState, useMemo } from "react";
import { formatAmount, cn } from "@/lib/utils";
import type { IncomeMonth } from "@/lib/reports/report.types";
import {
  Search,
  Calendar,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface IncomeMonthlyLedgerTableProps {
  months: IncomeMonth[];
  tradingMargin: number;
  interestCollected: number;
  penaltyRevenue: number;
  operatingExpenses: number;
  waiverAmount: number;
  netIncome: number;
}

type YearFilter = "ALL" | "2026" | "2025" | "2024" | "PROFITABLE";
type SortField = "date" | "margin" | "interest" | "penalties" | "expenses" | "net";

export default function IncomeMonthlyLedgerTable({
  months,
  tradingMargin,
  interestCollected,
  penaltyRevenue,
  operatingExpenses,
  waiverAmount,
  netIncome,
}: IncomeMonthlyLedgerTableProps) {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<YearFilter>("ALL");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortAsc, setSortAsc] = useState(false);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: months.length,
      y2026: months.filter((m) => m.year === 2026).length,
      y2025: months.filter((m) => m.year === 2025).length,
      y2024: months.filter((m) => m.year === 2024).length,
      profitable: months.filter((m) => m.net > 0).length,
    };
  }, [months]);

  // Filtered and sorted rows
  const filteredMonths = useMemo(() => {
    const q = search.trim().toLowerCase();

    return months
      .filter((m) => {
        // Year / Profit filter
        if (yearFilter === "2026" && m.year !== 2026) return false;
        if (yearFilter === "2025" && m.year !== 2025) return false;
        if (yearFilter === "2024" && m.year !== 2024) return false;
        if (yearFilter === "PROFITABLE" && m.net <= 0) return false;

        // Search text
        if (!q) return true;
        return m.label.toLowerCase().includes(q) || String(m.year).includes(q);
      })
      .sort((a, b) => {
        if (sortField === "date") {
          const keyA = a.year * 100 + a.month;
          const keyB = b.year * 100 + b.month;
          return sortAsc ? keyA - keyB : keyB - keyA;
        }

        const numA = Number(a[sortField] || 0);
        const numB = Number(b[sortField] || 0);
        return sortAsc ? numA - numB : numB - numA;
      });
  }, [months, search, yearFilter, sortField, sortAsc]);

  // Subtotals
  const filteredTotals = useMemo(() => {
    return filteredMonths.reduce(
      (acc, m) => {
        acc.margin += m.margin;
        acc.interest += m.interest;
        acc.penalties += m.penalties;
        acc.expenses += m.expenses;
        acc.waivers += m.waivers;
        acc.net += m.net;
        return acc;
      },
      { margin: 0, interest: 0, penalties: 0, expenses: 0, waivers: 0, net: 0 }
    );
  }, [filteredMonths]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc
    }
  };

  return (
    <div className="card-premium space-y-4">
      {/* Title & Filter Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <h3 className="text-16 font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span>Monthly P&L Ledger</span>
            <span className="badge badge-primary text-12 font-medium px-2.5 py-0.5 rounded-full">
              {months.length} month{months.length !== 1 ? "s" : ""}
            </span>
          </h3>
          <p className="text-12 text-gray-400 mt-0.5">
            Chronological breakdown of trading profit, hire-purchase collections, penalties, and net operating income
          </p>
        </div>

        {/* Search input */}
        <div className="search-box">
          <div className="search-input relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search month or year..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input w-full pl-9 pr-8 py-2 text-13 bg-gray-50/70 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800 placeholder-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => setYearFilter("ALL")}
          className={cn(
            "badge px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
            yearFilter === "ALL"
              ? "bg-gray-900 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          All History
          <span
            className={cn(
              "text-11 px-1.5 py-0.2 rounded-full",
              yearFilter === "ALL" ? "bg-gray-700 text-white" : "bg-white text-gray-600"
            )}
          >
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setYearFilter("2026")}
          className={cn(
            "badge px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
            yearFilter === "2026"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/50"
          )}
        >
          2026 Current Year
          <span
            className={cn(
              "text-11 px-1.5 py-0.2 rounded-full",
              yearFilter === "2026" ? "bg-blue-700 text-white" : "bg-white text-blue-800"
            )}
          >
            {counts.y2026}
          </span>
        </button>

        <button
          onClick={() => setYearFilter("2025")}
          className={cn(
            "badge px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
            yearFilter === "2025"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/50"
          )}
        >
          2025 FY
          <span
            className={cn(
              "text-11 px-1.5 py-0.2 rounded-full",
              yearFilter === "2025" ? "bg-indigo-700 text-white" : "bg-white text-indigo-800"
            )}
          >
            {counts.y2025}
          </span>
        </button>

        <button
          onClick={() => setYearFilter("PROFITABLE")}
          className={cn(
            "badge px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
            yearFilter === "PROFITABLE"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/50"
          )}
        >
          <TrendingUp className="size-3.5" />
          Profitable Months
          <span
            className={cn(
              "text-11 px-1.5 py-0.2 rounded-full",
              yearFilter === "PROFITABLE" ? "bg-emerald-700 text-white" : "bg-white text-emerald-800"
            )}
          >
            {counts.profitable}
          </span>
        </button>
      </div>

      {/* Table Wrap */}
      <div className="data-table-wrap">
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr className="data-table-head-row">
                <th
                  className="data-th text-left cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("date")}
                >
                  <div className="flex items-center gap-1">
                    Month / Period
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("margin")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Vehicle Trading Margin
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("interest")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Financing Repayments
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("penalties")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Late Fee Revenue
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("expenses")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Operating Expenses
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("net")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Net Operating Surplus
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="data-th text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMonths.length === 0 ? (
                <tr>
                  <td colSpan={7} className="data-empty-cell py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="size-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-2">
                        <Search className="size-5" />
                      </div>
                      <p className="text-14 font-semibold text-gray-700">No matching periods</p>
                      <p className="text-12 text-gray-400 mt-1 max-w-xs">
                        No financial records match your current search or year filter.
                      </p>
                      <button
                        onClick={() => {
                          setSearch("");
                          setYearFilter("ALL");
                        }}
                        className="mt-3 px-3 py-1.5 text-12 font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                      >
                        Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMonths.map((m) => (
                  <tr key={`${m.year}-${m.month}`} className="data-table-row hover:bg-blue-50/15 transition-colors">
                    {/* Month */}
                    <td className="data-td font-semibold text-gray-900 text-13">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-blue-500" />
                        <span>{m.label}</span>
                      </div>
                    </td>

                    {/* Trading Margin */}
                    <td className="data-td text-right tabular-nums text-blue-700 font-bold text-13">
                      {m.margin > 0 ? formatAmount(m.margin) : "—"}
                    </td>

                    {/* Financing Collections */}
                    <td className="data-td text-right tabular-nums text-emerald-700 font-semibold text-13">
                      {m.interest > 0 ? formatAmount(m.interest) : "—"}
                    </td>

                    {/* Penalties */}
                    <td className="data-td text-right tabular-nums text-amber-600 font-medium text-12">
                      {m.penalties > 0 ? formatAmount(m.penalties) : "—"}
                    </td>

                    {/* Expenses */}
                    <td className="data-td text-right tabular-nums text-gray-600 text-12">
                      {m.expenses > 0 ? (
                        <span className="text-amber-700 font-medium">({formatAmount(m.expenses)})</span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Net Operating Surplus */}
                    <td
                      className={cn(
                        "data-td text-right tabular-nums font-extrabold text-13",
                        m.net >= 0 ? "text-emerald-700" : "text-red-600"
                      )}
                    >
                      {formatAmount(m.net)}
                    </td>

                    {/* Status Badge */}
                    <td className="data-td text-center">
                      {m.net >= 0 ? (
                        <span className="badge badge-success px-2.5 py-0.5 rounded-full text-10 font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          Surplus
                        </span>
                      ) : (
                        <span className="badge badge-error px-2.5 py-0.5 rounded-full text-10 font-bold uppercase tracking-wider inline-flex items-center gap-1">
                          <AlertTriangle className="size-3 text-red-600" />
                          Deficit
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Totals Footer */}
            {filteredMonths.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/80 font-bold">
                  <td className="data-td text-gray-900">
                    {yearFilter === "ALL" && !search
                      ? "Cumulative Total"
                      : `Filtered Total (${filteredMonths.length} months)`}
                  </td>
                  <td className="data-td text-right tabular-nums text-blue-800 font-extrabold text-13">
                    {formatAmount(filteredTotals.margin)}
                  </td>
                  <td className="data-td text-right tabular-nums text-emerald-800 font-extrabold text-13">
                    {formatAmount(filteredTotals.interest)}
                  </td>
                  <td className="data-td text-right tabular-nums text-amber-700 font-bold text-12">
                    {formatAmount(filteredTotals.penalties)}
                  </td>
                  <td className="data-td text-right tabular-nums text-gray-700 font-bold text-12">
                    {filteredTotals.expenses > 0 ? `(${formatAmount(filteredTotals.expenses)})` : "—"}
                  </td>
                  <td
                    className={cn(
                      "data-td text-right tabular-nums font-black text-14",
                      filteredTotals.net >= 0 ? "text-emerald-700" : "text-red-600"
                    )}
                  >
                    {formatAmount(filteredTotals.net)}
                  </td>
                  <td className="data-td" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
