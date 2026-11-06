"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatAmount, cn } from "@/lib/utils";
import type { ArrearsRow, ArrearsBucket } from "@/lib/reports/report.types";
import {
  Search,
  Car,
  FileText,
  Phone,
  AlertTriangle,
  ArrowUpDown,
  ExternalLink,
  ShieldAlert,
  X,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface ArrearsLedgerTableProps {
  rows: ArrearsRow[];
  totalOverdue: number;
  totalPenalties: number;
}

type FilterBucket = "ALL" | ArrearsBucket;
type SortField = "balance" | "daysPastDue" | "penaltyAccrued" | "clientName";

export default function ArrearsLedgerTable({
  rows,
  totalOverdue,
  totalPenalties,
}: ArrearsLedgerTableProps) {
  const [search, setSearch] = useState("");
  const [selectedBucket, setSelectedBucket] = useState<FilterBucket>("ALL");
  const [sortField, setSortField] = useState<SortField>("daysPastDue");
  const [sortAsc, setSortAsc] = useState(false);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: rows.length,
      b1_30: rows.filter((r) => r.bucket === "1-30").length,
      b31_60: rows.filter((r) => r.bucket === "31-60").length,
      b61_90: rows.filter((r) => r.bucket === "61-90").length,
      b90plus: rows.filter((r) => r.bucket === "90+").length,
    };
  }, [rows]);

  // Filtered & sorted rows
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows
      .filter((row) => {
        // Bucket filter
        if (selectedBucket !== "ALL" && row.bucket !== selectedBucket) {
          return false;
        }

        // Search query
        if (!q) return true;
        const nameMatch = row.clientName?.toLowerCase().includes(q);
        const phoneMatch = row.clientPhone?.toLowerCase().includes(q);
        const contractMatch = row.contractNo?.toLowerCase().includes(q);
        const vehicleMatch = row.vehicleReg?.toLowerCase().includes(q);
        const statusMatch = row.status?.toLowerCase().includes(q);

        return nameMatch || phoneMatch || contractMatch || vehicleMatch || statusMatch;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === "string") {
          valA = valA.toLowerCase();
          valB = (valB || "").toLowerCase();
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        const numA = Number(valA || 0);
        const numB = Number(valB || 0);
        return sortAsc ? numA - numB : numB - numA;
      });
  }, [rows, search, selectedBucket, sortField, sortAsc]);

  // Totals for current filtered list
  const filteredTotals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => {
        acc.overdue += Number(r.balance || 0);
        acc.penalties += Number(r.penaltyAccrued || 0);
        return acc;
      },
      { overdue: 0, penalties: 0 }
    );
  }, [filteredRows]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc for financial figures
    }
  };

  const getBucketBadge = (bucket: ArrearsBucket, days: number) => {
    switch (bucket) {
      case "1-30":
        return (
          <span className="inline-flex items-center gap-1 text-10 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-[#F5BD4F] border border-amber-200 dark:border-amber-900/40">
            <Clock className="size-3" />
            1–30d (Watchlist)
          </span>
        );
      case "31-60":
        return (
          <span className="inline-flex items-center gap-1 text-10 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 dark:bg-amber-950/40 text-orange-700 dark:text-[#F5BD4F] border border-orange-200 dark:border-amber-900/40">
            <AlertTriangle className="size-3" />
            31–60d (Substandard)
          </span>
        );
      case "61-90":
        return (
          <span className="inline-flex items-center gap-1 text-10 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40">
            <AlertTriangle className="size-3" />
            61–90d (Defaulting)
          </span>
        );
      case "90+":
        return (
          <span className="inline-flex items-center gap-1 text-10 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 dark:bg-red-950/60 text-rose-800 dark:text-[#FF626D] border border-rose-300 dark:border-red-900/60 font-extrabold animate-pulse">
            <ShieldAlert className="size-3 text-rose-700 dark:text-[#FF626D]" />
            90+d (Repossession)
          </span>
        );
      default:
        return (
          <span className="text-10 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#18221A] text-gray-700 dark:text-[#C1CBC3] border border-transparent dark:border-[#29352D]">
            {bucket}
          </span>
        );
    }
  };

  return (
    <div className="card-premium dark:bg-[#151D17] dark:border-[#29352D] space-y-4">
      {/* Title & Filter Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-[#29352D]">
        <div>
          <h3 className="text-16 font-bold text-gray-900 dark:text-[#F4F7F4] tracking-tight flex items-center gap-2">
            <span>Overdue Agreements Ledger</span>
            <span className="text-12 font-medium bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-900/40">
              {rows.length} contract{rows.length !== 1 ? "s" : ""}
            </span>
          </h3>
          <p className="text-12 text-gray-400 dark:text-[#A1ADA4] mt-0.5">
            Active vehicle hire-purchase agreements with unpaid installments or overdue balance
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 dark:text-[#A1ADA4]" />
          <input
            type="text"
            placeholder="Search client, contract, plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-13 bg-gray-50/70 dark:bg-[#101612] border border-gray-200 dark:border-[#29352D] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800 dark:text-[#F4F7F4] placeholder-gray-400 dark:placeholder-[#5d6f62]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#A1ADA4] hover:text-gray-600 dark:hover:text-[#F4F7F4] p-0.5"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => setSelectedBucket("ALL")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
            selectedBucket === "ALL"
              ? "bg-gray-900 text-white dark:bg-[#B7FF3C] dark:text-[#090C0A] shadow-xs"
              : "bg-gray-100 dark:bg-[#18221A] text-gray-600 dark:text-[#C1CBC3] hover:bg-gray-200 dark:hover:bg-[#1D2920]"
          )}
        >
          All Overdue
          <span
            className={cn(
              "text-11 px-1.5 py-0.2 rounded-full",
              selectedBucket === "ALL" ? "bg-gray-700 text-white dark:bg-[#090C0A]/20 dark:text-[#090C0A]" : "bg-white dark:bg-[#101612] text-gray-600 dark:text-[#A1ADA4]"
            )}
          >
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setSelectedBucket("1-30")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
            selectedBucket === "1-30"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-[#F5BD4F] hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-200/50 dark:border-amber-900/40"
          )}
        >
          1–30 Days (Watchlist)
          <span
            className={cn(
              "text-11 px-1.5 py-0.2 rounded-full",
              selectedBucket === "1-30" ? "bg-amber-700 text-white" : "bg-white dark:bg-amber-900/40 text-amber-800 dark:text-[#F5BD4F]"
            )}
          >
            {counts.b1_30}
          </span>
        </button>

        <button
          onClick={() => setSelectedBucket("31-60")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
            selectedBucket === "31-60"
              ? "bg-orange-600 text-white shadow-xs"
              : "bg-orange-50 dark:bg-amber-950/30 text-orange-800 dark:text-amber-400 hover:bg-orange-100 dark:hover:bg-amber-950/50 border border-orange-200/50 dark:border-amber-900/40"
          )}
        >
          31–60 Days (Substandard)
          <span
            className={cn(
              "text-11 px-1.5 py-0.2 rounded-full",
              selectedBucket === "31-60" ? "bg-orange-700 text-white" : "bg-white dark:bg-amber-900/40 text-orange-800 dark:text-amber-400"
            )}
          >
            {counts.b31_60}
          </span>
        </button>

        <button
          onClick={() => setSelectedBucket("61-90")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
            selectedBucket === "61-90"
              ? "bg-red-600 text-white shadow-xs"
              : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-200/50 dark:border-red-900/40"
          )}
        >
          61–90 Days (Defaulting)
          <span
            className={cn(
              "text-11 px-1.5 py-0.2 rounded-full",
              selectedBucket === "61-90" ? "bg-red-700 text-white" : "bg-white dark:bg-red-900/40 text-red-800 dark:text-red-300"
            )}
          >
            {counts.b61_90}
          </span>
        </button>

        <button
          onClick={() => setSelectedBucket("90+")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
            selectedBucket === "90+"
              ? "bg-rose-900 text-white shadow-xs"
              : "bg-rose-50 dark:bg-red-950/50 text-rose-800 dark:text-red-300 hover:bg-rose-100 dark:hover:bg-red-950/70 border border-rose-200 dark:border-red-900/50"
          )}
        >
          <ShieldAlert className="size-3.5" />
          90+ Days (Repossession)
          <span
            className={cn(
              "text-11 px-1.5 py-0.2 rounded-full",
              selectedBucket === "90+" ? "bg-rose-950 text-white" : "bg-white dark:bg-red-900/50 text-rose-800 dark:text-red-300"
            )}
          >
            {counts.b90plus}
          </span>
        </button>
      </div>

      {/* Table Wrap */}
      <div className="data-table-wrap">
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr className="data-table-head-row">
                <th className="data-th text-left">Contract #</th>
                <th
                  className="data-th text-left cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("clientName")}
                >
                  <div className="flex items-center gap-1">
                    Client & Contact
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="data-th text-left">Vehicle Plate</th>
                <th className="data-th text-right">Principal Financed</th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("balance")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Overdue Balance
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("penaltyAccrued")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Penalties Accrued
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("daysPastDue")}
                >
                  <div className="flex items-center justify-end gap-1">
                    DPD
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="data-th text-left">Aging Stage</th>
                <th className="data-th text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="data-empty-cell py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      {rows.length === 0 ? (
                        <>
                          <div className="size-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-2">
                            <CheckCircle2 className="size-6" />
                          </div>
                          <p className="text-15 font-bold text-gray-900">No overdue contracts 🎉</p>
                          <p className="text-12 text-gray-400 mt-1 max-w-sm">
                            All active vehicle financing agreements are currently up to date.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="size-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-2">
                            <Search className="size-5" />
                          </div>
                          <p className="text-14 font-semibold text-gray-700">No matching contracts</p>
                          <p className="text-12 text-gray-400 mt-1 max-w-xs">
                            No overdue contracts match your current search &ldquo;{search}&rdquo; or filter.
                          </p>
                          <button
                            onClick={() => {
                              setSearch("");
                              setSelectedBucket("ALL");
                            }}
                            className="mt-3 px-3 py-1.5 text-12 font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                          >
                            Reset filters
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.loanId} className="data-table-row hover:bg-red-50/20 dark:hover:bg-red-950/20 transition-colors">
                    {/* Contract # */}
                    <td className="data-td font-medium">
                      <Link
                        href={`/loans/${row.loanId}`}
                        className="inline-flex items-center gap-1.5 text-blue-600 dark:text-[#65C8F2] hover:text-blue-800 dark:hover:text-[#B7FF3C] hover:underline font-mono text-12"
                      >
                        <FileText className="size-3.5 text-gray-400 dark:text-[#A1ADA4]" />
                        {row.contractNo || "—"}
                      </Link>
                    </td>

                    {/* Client */}
                    <td className="data-td">
                      <div className="font-semibold text-gray-900 dark:text-[#F4F7F4] text-13">{row.clientName}</div>
                      {row.clientPhone ? (
                        <a
                          href={`tel:${row.clientPhone}`}
                          className="inline-flex items-center gap-1 text-gray-400 dark:text-[#A1ADA4] hover:text-blue-600 dark:hover:text-[#B7FF3C] text-11 mt-0.5"
                        >
                          <Phone className="size-3" />
                          {row.clientPhone}
                        </a>
                      ) : (
                        <span className="text-11 text-gray-300 dark:text-[#5d6f62]">No phone</span>
                      )}
                    </td>

                    {/* Vehicle Plate */}
                    <td className="data-td">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-11 bg-amber-50 dark:bg-[#18221A] text-amber-900 dark:text-[#B7FF3C] border border-amber-200 dark:border-[#29352D]">
                        <Car className="size-3 text-amber-700 dark:text-[#B7FF3C]" />
                        {row.vehicleReg || "N/A"}
                      </div>
                    </td>

                    {/* Principal Financed */}
                    <td className="data-td text-right tabular-nums text-gray-600 dark:text-[#C1CBC3] text-12">
                      {formatAmount(row.principalAmount)}
                    </td>

                    {/* Overdue Balance */}
                    <td className="data-td text-right tabular-nums font-bold text-red-600 dark:text-[#FF626D] text-13">
                      {formatAmount(row.balance)}
                    </td>

                    {/* Penalties Accrued */}
                    <td className="data-td text-right tabular-nums text-amber-600 dark:text-[#F5BD4F] font-medium text-12">
                      {formatAmount(row.penaltyAccrued)}
                    </td>

                    {/* Days Overdue (DPD) */}
                    <td className="data-td text-right">
                      <span
                        className={cn(
                          "inline-block font-extrabold tabular-nums px-2 py-0.5 rounded text-12",
                          row.daysPastDue > 90
                            ? "bg-rose-100 dark:bg-red-950/50 text-rose-800 dark:text-[#FF626D] border border-rose-300 dark:border-red-900/50"
                            : row.daysPastDue > 60
                            ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40"
                            : row.daysPastDue > 30
                            ? "bg-orange-50 dark:bg-amber-950/40 text-orange-700 dark:text-[#F5BD4F] border border-orange-200 dark:border-amber-900/40"
                            : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-[#F5BD4F] border border-amber-200 dark:border-amber-900/30"
                        )}
                      >
                        {row.daysPastDue}d
                      </span>
                    </td>

                    {/* Aging Stage */}
                    <td className="data-td">{getBucketBadge(row.bucket, row.daysPastDue)}</td>

                    {/* Action */}
                    <td className="data-td text-center print:hidden">
                      <Link
                        href={`/loans/${row.loanId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-11 font-medium bg-gray-100 dark:bg-[#18221A] hover:bg-gray-200 dark:hover:bg-[#1D2920] text-gray-700 dark:text-[#C1CBC3] border border-transparent dark:border-[#29352D] transition-colors"
                      >
                        <span>View</span>
                        <ExternalLink className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Totals Footer */}
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-[#29352D] bg-gray-50/80 dark:bg-[#18221A] font-semibold">
                  <td colSpan={3} className="data-td text-gray-900 dark:text-[#F4F7F4] font-bold">
                    {selectedBucket === "ALL" && !search
                      ? "Total Delinquent Portfolio"
                      : `Filtered Subtotal (${filteredRows.length} contracts)`}
                  </td>
                  <td className="data-td" />
                  <td className="data-td text-right font-extrabold text-red-600 dark:text-[#FF626D] tabular-nums text-13">
                    {formatAmount(filteredTotals.overdue)}
                  </td>
                  <td className="data-td text-right font-bold text-amber-600 dark:text-[#F5BD4F] tabular-nums text-12">
                    {formatAmount(filteredTotals.penalties)}
                  </td>
                  <td colSpan={3} className="data-td text-gray-400 dark:text-[#A1ADA4] text-11 text-right">
                    KES {(filteredTotals.overdue + filteredTotals.penalties).toLocaleString()} total claim
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
