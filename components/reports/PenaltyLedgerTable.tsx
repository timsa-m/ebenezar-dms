"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatAmount, cn } from "@/lib/utils";
import type { PenaltyReportRow } from "@/lib/reports/report.types";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Car,
  FileText,
  Phone,
  AlertTriangle,
  ArrowUpDown,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  X,
  Calendar,
  CheckCircle2,
} from "lucide-react";

interface PenaltyLedgerTableProps {
  rows: PenaltyReportRow[];
  totalCharged: number;
  totalReversed: number;
}

type StatusFilter = "ALL" | "Active" | "Reversed";
type SortField = "dateApplied" | "amount" | "clientName" | "contractNo";

export default function PenaltyLedgerTable({
  rows,
  totalCharged,
  totalReversed,
}: PenaltyLedgerTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortField, setSortField] = useState<SortField>("dateApplied");
  const [sortAsc, setSortAsc] = useState(false);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: rows.length,
      active: rows.filter((r) => r.status.toLowerCase() === "active").length,
      reversed: rows.filter((r) => r.status.toLowerCase() === "reversed").length,
    };
  }, [rows]);

  // Filtered & sorted rows
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows
      .filter((row) => {
        // Status filter
        if (statusFilter !== "ALL") {
          if (row.status.toLowerCase() !== statusFilter.toLowerCase()) {
            return false;
          }
        }

        // Search query
        if (!q) return true;
        const nameMatch = row.clientName?.toLowerCase().includes(q);
        const phoneMatch = row.clientPhone?.toLowerCase().includes(q);
        const contractMatch = row.contractNo?.toLowerCase().includes(q);
        const vehicleMatch = row.vehicleReg?.toLowerCase().includes(q);
        const modelMatch = row.vehicleMakeModel?.toLowerCase().includes(q);
        const commentMatch = row.comment?.toLowerCase().includes(q);
        const typeMatch = row.penaltyType?.toLowerCase().includes(q);

        return (
          nameMatch ||
          phoneMatch ||
          contractMatch ||
          vehicleMatch ||
          modelMatch ||
          commentMatch ||
          typeMatch
        );
      })
      .sort((a, b) => {
        if (sortField === "dateApplied") {
          const timeA = new Date(a.dateApplied).getTime() || 0;
          const timeB = new Date(b.dateApplied).getTime() || 0;
          return sortAsc ? timeA - timeB : timeB - timeA;
        }

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
  }, [rows, search, statusFilter, sortField, sortAsc]);

  // Totals for current filtered list
  const filteredTotal = useMemo(() => {
    return filteredRows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  }, [filteredRows]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc
    }
  };

  return (
    <div className="card-premium dark:bg-[#151D17] dark:border-[#29352D] space-y-4">
      {/* Title & Filter Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-[#29352D]">
        <div>
          <h3 className="text-16 font-bold text-gray-900 dark:text-[#F4F7F4] tracking-tight flex items-center gap-2">
            <span>Penalty & Late Fee Ledger</span>
            <span className="badge badge-error text-12 font-medium bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-900/40">
              {rows.length} record{rows.length !== 1 ? "s" : ""}
            </span>
          </h3>
          <p className="text-12 text-gray-400 dark:text-[#A1ADA4] mt-0.5">
            Audit log of all manual and automated late fees applied to financing agreements
          </p>
        </div>

        {/* Search input */}
        <div className="search-box">
          <div className="search-input relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 dark:text-[#A1ADA4]" />
            <input
              type="text"
              placeholder="Search here"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input w-full pl-9 pr-8 py-2 text-13 bg-gray-50/70 dark:bg-[#101612] rounded-lg border border-transparent dark:border-[#29352D] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800 dark:text-[#F4F7F4] placeholder-gray-400 dark:placeholder-[#5d6f62]"
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

      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={cn(
            "badge badge-primary px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
            statusFilter === "ALL"
              ? "bg-gray-900 text-white dark:bg-[#B7FF3C] dark:text-[#090C0A] shadow-xs"
              : "bg-gray-100 dark:bg-[#18221A] text-gray-600 dark:text-[#C1CBC3] hover:bg-gray-200 dark:hover:bg-[#1D2920]"
          )}
        >
          All Penalties
          <span
            className={cn(
              "badge badge-primary text-11 px-1.5 py-0.5 rounded-full",
              statusFilter === "ALL" ? "bg-gray-700 text-white dark:bg-[#090C0A]/20 dark:text-[#090C0A]" : "bg-white dark:bg-[#101612] text-gray-600 dark:text-[#A1ADA4]"
            )}
          >
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("Active")}
          className={cn(
            "badge badge-error px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
            statusFilter === "Active"
              ? "bg-red-600 text-white shadow-xs"
              : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60 border border-red-200/50 dark:border-red-900/40"
          )}
        >
          <ShieldAlert className="size-3.5" />
          Active Charged
          <span
            className={cn(
              "badge badge-error text-11 px-1.5 py-0.2 rounded-full",
              statusFilter === "Active" ? "bg-red-700 text-white" : "bg-white dark:bg-red-900/40 text-red-800 dark:text-red-300"
            )}
          >
            {counts.active}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("Reversed")}
          className={cn(
            "badge badge-success px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
            statusFilter === "Reversed"
              ? "bg-emerald-700 text-white dark:bg-[#B7FF3C] dark:text-[#090C0A] shadow-xs"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-900/40"
          )}
        >
          <ShieldCheck className="size-3.5" />
          Reversed / Waived
          <span
            className={cn(
              "badge badge-error text-11 px-1.5 py-0.2 rounded-full",
              statusFilter === "Reversed" ? "bg-emerald-800 text-white dark:bg-[#090C0A]/20 dark:text-[#090C0A]" : "bg-white dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300"
            )}
          >
            {counts.reversed}
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
                  onClick={() => toggleSort("dateApplied")}
                >
                  <div className="flex items-center gap-1">
                    Date Applied
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="data-th text-left cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("contractNo")}
                >
                  <div className="flex items-center gap-1">
                    Contract #
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="data-th text-left cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("clientName")}
                >
                  <div className="flex items-center gap-1">
                    Client & Contact
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="data-th text-left">Reg No.</th>
                <th className="data-th text-left">Fee Type</th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100/80 transition-colors select-none"
                  onClick={() => toggleSort("amount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Penalty Amount
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="data-th text-left">Status</th>
                <th className="data-th text-left">Reason / Comment</th>
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
                          <div className="size-12 rounded-full bg-green-50 dark:bg-emerald-950/40 text-green-600 dark:text-[#B7FF3C] flex items-center justify-center mb-2">
                            <CheckCircle2 className="size-6" />
                          </div>
                          <p className="text-15 font-bold text-gray-900 dark:text-[#F4F7F4]">No penalties recorded</p>
                          <p className="text-12 text-gray-400 dark:text-[#A1ADA4] mt-1 max-w-sm">
                            No late payment fees or manual penalties have been applied for this period.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="size-12 rounded-full bg-gray-100 dark:bg-[#18221A] text-gray-400 dark:text-[#A1ADA4] flex items-center justify-center mb-2">
                            <Search className="size-5" />
                          </div>
                          <p className="text-14 font-semibold text-gray-700 dark:text-[#F4F7F4]">No matching penalties</p>
                          <p className="text-12 text-gray-400 dark:text-[#A1ADA4] mt-1 max-w-xs">
                            No records match &ldquo;{search}&rdquo; with status &ldquo;{statusFilter}&rdquo;.
                          </p>
                          <button
                            onClick={() => {
                              setSearch("");
                              setStatusFilter("ALL");
                            }}
                            className="mt-3 px-3 py-1.5 text-12 font-medium bg-gray-100 dark:bg-[#18221A] hover:bg-gray-200 dark:hover:bg-[#1D2920] text-gray-700 dark:text-[#C1CBC3] rounded-md transition-colors"
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
                  <tr key={row.penaltyId} className="data-table-row hover:bg-red-50/20 dark:hover:bg-red-950/20 transition-colors">
                    {/* Date */}
                    <td className="data-td text-12 text-gray-600 dark:text-[#C1CBC3] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-gray-400 dark:text-[#A1ADA4]" />
                        <span>
                          {row.dateApplied
                            ? new Date(row.dateApplied).toLocaleDateString("en-KE", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                            : "—"}
                        </span>
                      </div>
                    </td>

                    {/* Contract # */}
                    <td className="data-td font-medium">
                      {row.loanId ? (
                        <Link
                          href={`/loans/${row.loanId}`}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-[#65C8F2] hover:text-blue-800 dark:hover:text-[#B7FF3C] hover:underline font-roboto text-12"
                        >
                          <FileText className="size-3.5 text-blue-400 dark:text-[#65C8F2]" />
                          {row.contractNo || "—"}
                        </Link>
                      ) : (
                        <span className="font-mono text-12 text-gray-400 dark:text-[#A1ADA4]">{row.contractNo || "—"}</span>
                      )}
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
                      <div className="badge badge-yellow-500 px-3 py-1.5 rounded-lg inline-flex flex-col">
                        <div className="badge badge-yellow-500 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 px-2 py-0.5 rounded font-roboto font-bold text-11 bg-amber-50 dark:bg-[#18221A] text-amber-900 dark:text-[#B7FF3C] border border-amber-200 dark:border-[#29352D] w-fit">
                          {row.vehicleReg || "N/A"}
                        </div>
                        {row.vehicleMakeModel && (
                          <span className="text-10 text-gray-400 dark:text-[#A1ADA4] mt-0.5 truncate max-w-[130px]">
                            {row.vehicleMakeModel}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Fee Type */}
                    <td className="data-td">
                      <span className="badge badge-gray-500 px-3 py-1.5 rounded-lg inline-block text-13 font-medium bg-gray-100 dark:bg-[#18221A] text-gray-700 dark:text-[#C1CBC3] px-2 py-0.5 rounded border border-gray-200 dark:border-[#29352D]">
                        {row.penaltyType || "Late Payment"}
                      </span>
                    </td>

                    {/* Penalty Amount */}
                    <td className="data-td text-right tabular-nums font-bold text-red-600 dark:text-[#FF626D] text-13">
                      {formatAmount(row.amount)}
                    </td>

                    {/* Status */}
                    <td className="data-td">
                      {row.status.toLowerCase() === "active" ? (
                        <span className="badge badge-red-500 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 text-10 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
                          <ShieldAlert className="size-3" />
                          Active
                        </span>
                      ) : (
                        <span className="badge badge-emerald-500 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 text-10 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                          <ShieldCheck className="size-3" />
                          Reversed
                        </span>
                      )}
                    </td>

                    {/* Reason / Comment */}
                    <td className="data-td text-12 text-gray-600 dark:text-[#C1CBC3] max-w-xs truncate" title={row.comment || ""}>
                      {row.comment || "—"}
                    </td>

                    {/* Action */}
                    <td className="data-td text-center print:hidden">
                      {row.loanId ? (
                        <Link
                          href={`/loans/${row.loanId}`}
                          className="badge badge-blue-500 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 px-2.5 py-1 rounded text-11 font-medium bg-gray-100 dark:bg-[#18221A] text-gray-700 dark:text-[#C1CBC3] border border-transparent dark:border-[#29352D] hover:bg-blue-600 hover:text-white dark:hover:bg-[#1D2920] dark:hover:text-[#F4F7F4] transition-colors"
                        >
                          <span>View</span>
                          <ExternalLink className="size-3" />
                        </Link>
                      ) : (
                        <span className="text-blue-300 dark:text-blue-900 text-11">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Totals Footer */}
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-[#29352D] bg-gray-50/80 dark:bg-[#18221A] font-semibold">
                  <td colSpan={5} className="data-td text-gray-900 dark:text-[#F4F7F4] font-bold">
                    {statusFilter === "ALL" && !search
                      ? `Total Penalties Ledger (${filteredRows.length} records)`
                      : `Filtered Subtotal (${filteredRows.length} records)`}
                  </td>
                  <td className="data-td text-right font-extrabold text-red-600 dark:text-[#FF626D] tabular-nums text-14">
                    {formatAmount(filteredTotal)}
                  </td>
                  <td colSpan={3} className="data-td text-gray-400 dark:text-[#A1ADA4] text-11 text-right">
                    KES {filteredTotal.toLocaleString()} penalty subtotal
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
