"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatAmount, cn } from "@/lib/utils";
import type { MonthlyReportEntry } from "@/lib/reports/report.types";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Car,
  FileText,
  Phone,
  AlertTriangle,
  ArrowUpDown,
  ExternalLink,
  Download,
  X,
  CheckCircle2,
  Clock,
  HelpCircle,
} from "lucide-react";

interface MonthlyLedgerTableProps {
  entries: MonthlyReportEntry[];
  periodLabel: string;
}

type StatusFilter = "ALL" | "ACTIVE" | "OVERDUE" | "COMPLETED" | "CASH_SALE";
type SortField =
  | "closingBalance"
  | "openingBalance"
  | "amountPaidThisMonth"
  | "newLoanAmount"
  | "daysPastDue"
  | "clientName";

export default function MonthlyLedgerTable({
  entries,
  periodLabel,
}: MonthlyLedgerTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortField, setSortField] = useState<SortField>("closingBalance");
  const [sortAsc, setSortAsc] = useState(false);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: entries.length,
      active: entries.filter(
        (e) =>
          e.loanStatus === "Active" ||
          e.loanStatus === "Standard" ||
          e.loanStatus === "Restructured"
      ).length,
      overdue: entries.filter(
        (e) =>
          e.loanStatus === "Overdue" ||
          e.loanStatus === "Defaulting" ||
          e.loanStatus === "Loss" ||
          e.daysPastDue > 0
      ).length,
      completed: entries.filter(
        (e) => e.loanStatus === "Fully Paid" || e.loanStatus === "Completed"
      ).length,
      cashSale: entries.filter(
        (e) => e.loanType === "Cash Sale" || e.loanStatus === "Cash Sale"
      ).length,
    };
  }, [entries]);

  // Filtered & sorted entries
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();

    return entries
      .filter((entry) => {
        // Tab filter
        if (statusFilter === "ACTIVE") {
          const isActive =
            entry.loanStatus === "Active" ||
            entry.loanStatus === "Standard" ||
            entry.loanStatus === "Restructured";
          if (!isActive) return false;
        } else if (statusFilter === "OVERDUE") {
          const isOverdue =
            entry.loanStatus === "Overdue" ||
            entry.loanStatus === "Defaulting" ||
            entry.loanStatus === "Loss" ||
            entry.daysPastDue > 0;
          if (!isOverdue) return false;
        } else if (statusFilter === "COMPLETED") {
          const isCompleted =
            entry.loanStatus === "Fully Paid" ||
            entry.loanStatus === "Completed";
          if (!isCompleted) return false;
        } else if (statusFilter === "CASH_SALE") {
          const isCash =
            entry.loanType === "Cash Sale" ||
            entry.loanStatus === "Cash Sale";
          if (!isCash) return false;
        }

        // Search text
        if (!q) return true;
        const nameMatch = entry.clientName?.toLowerCase().includes(q);
        const phoneMatch = entry.clientPhone?.toLowerCase().includes(q);
        const contractMatch = entry.contractNo?.toLowerCase().includes(q);
        const regMatch = entry.vehicleReg?.toLowerCase().includes(q);
        const modelMatch = entry.vehicleMakeModel?.toLowerCase().includes(q);
        const statusMatch = entry.loanStatus?.toLowerCase().includes(q);

        return (
          nameMatch ||
          phoneMatch ||
          contractMatch ||
          regMatch ||
          modelMatch ||
          statusMatch
        );
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
  }, [entries, search, statusFilter, sortField, sortAsc]);

  // Subtotals of current view
  const filteredTotals = useMemo(() => {
    return filteredEntries.reduce(
      (acc, e) => {
        acc.openingBalance += Number(e.openingBalance || 0);
        acc.newLoanAmount += Number(e.newLoanAmount || 0);
        acc.amountPaidThisMonth += Number(e.amountPaidThisMonth || 0);
        acc.penaltiesThisMonth += Number(e.penaltiesThisMonth || 0);
        acc.closingBalance += Number(e.closingBalance || 0);
        return acc;
      },
      {
        openingBalance: 0,
        newLoanAmount: 0,
        amountPaidThisMonth: 0,
        penaltiesThisMonth: 0,
        closingBalance: 0,
      }
    );
  }, [filteredEntries]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc for financial figures
    }
  };

  // CSV export
  const exportToCSV = () => {
    const headers = [
      "Contract No",
      "Client Name",
      "Client Phone",
      "Vehicle Plate",
      "Vehicle Model",
      "Type",
      "Start Date",
      "Opening Balance",
      "New Financed Volume",
      "Repayments Paid",
      "Penalties",
      "Closing Balance",
      "Status",
      "Days Past Due",
    ];

    const csvRows = [headers.join(",")];

    for (const e of filteredEntries) {
      const row = [
        `"${e.contractNo || ""}"`,
        `"${(e.clientName || "").replace(/"/g, '""')}"`,
        `"${e.clientPhone || ""}"`,
        `"${e.vehicleReg || ""}"`,
        `"${(e.vehicleMakeModel || "").replace(/"/g, '""')}"`,
        `"${e.loanType || "Hire Purchase"}"`,
        `"${e.disbursementDate || ""}"`,
        e.openingBalance || 0,
        e.newLoanAmount || 0,
        e.amountPaidThisMonth || 0,
        e.penaltiesThisMonth || 0,
        e.closingBalance || 0,
        `"${e.loanStatus || ""}"`,
        e.daysPastDue || 0,
      ];
      csvRows.push(row.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `monthly-ledger-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string, dpd: number) => {
    const s = (status || "").toLowerCase();
    if (s === "fully paid" || s === "completed") {
      return (
        <span className="badge badge-completed inline-flex items-center gap-1">
          <CheckCircle2 className="size-3" />
          Fully Paid
        </span>
      );
    }
    if (s === "loss" || dpd > 90) {
      return (
        <span className="badge badge-error inline-flex items-center gap-1">
          <AlertTriangle className="size-3" />
          Loss (90+d)
        </span>
      );
    }
    if (s === "defaulting" || (dpd >= 60 && dpd <= 90)) {
      return (
        <span className="badge badge-error inline-flex items-center gap-1">
          <AlertTriangle className="size-3" />
          Defaulting
        </span>
      );
    }
    if (s === "overdue" || (dpd >= 7 && dpd < 60)) {
      return (
        <span className="badge badge-yellow-500 inline-flex items-center gap-1">
          <Clock className="size-3" />
          Overdue
        </span>
      );
    }
    if (s === "cash sale") {
      return (
        <span className="badge badge-blue-500 inline-flex items-center gap-1">
          Cash Sale
        </span>
      );
    }
    return (
      <span className="badge badge-success inline-flex items-center gap-1">
        Active
      </span>
    );
  };

  return (
    <div className="card-premium">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-15 font-bold text-gray-900 tracking-tight flex items-center gap-2">

            Monthly Vehicle Contract Ledger
            <span className="text-12 font-medium text-gray-400">
              ({filteredEntries.length} of {entries.length} contracts)
            </span>
          </h3>
          <p className="text-12 text-gray-500 mt-0.5">
            Audit-ready period snapshot for {periodLabel}. Showing asset financing receivables, repayments, and accrued penalties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="btn-secondary text-12 py-1.5 px-3 flex items-center gap-1.5"
            title="Export filtered ledger to CSV"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 pb-3 mb-4">
        {[
          { key: "ALL", label: "All Contracts", count: counts.all },
          { key: "ACTIVE", label: "Active Deals", count: counts.active },
          { key: "OVERDUE", label: "Overdue & Default", count: counts.overdue, alert: counts.overdue > 0 },
          { key: "COMPLETED", label: "Settled / Fully Paid", count: counts.completed },
          { key: "CASH_SALE", label: "Cash Sales", count: counts.cashSale },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key as StatusFilter)}
            className={cn(
              "badge badge-primary px-3 py-1.5 rounded-lg text-12 font-medium transition-all flex items-center gap-1.5",
              statusFilter === tab.key
                ? "bg-primary text-white shadow-sm font-semibold"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "badge badge-primary text-10 px-1.5 py-0.2 rounded-full font-bold",
                statusFilter === tab.key
                  ? "bg-white/20 text-white"
                  : tab.alert
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-200 text-gray-700"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <div className="search-box mb-4">
        <div className="search-input relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, phone, contract #, or vehicle plate (e.g. KDD 123X, Premio)..."
            className="input-class w-full pl-10 pr-9 text-13"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="data-table-wrap">
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr className="data-table-head-row">
                <th className="data-th text-left">Contract #</th>
                <th
                  className="data-th text-left cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => toggleSort("clientName")}
                >
                  <div className="flex items-center gap-1">
                    <span>Client &amp; Contact</span>
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="data-th text-left">Vehicle Details</th>
                <th className="data-th text-left">Deal Type</th>
                <th className="data-th text-left">Start Date</th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => toggleSort("openingBalance")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Opening Bal.</span>
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => toggleSort("newLoanAmount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>New Volume</span>
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => toggleSort("amountPaidThisMonth")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Inflow Paid</span>
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="data-th text-right">Penalties</th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => toggleSort("closingBalance")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Closing Bal.</span>
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
                <th className="data-th text-left">Status</th>
                <th
                  className="data-th text-right cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => toggleSort("daysPastDue")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>DPD</span>
                    <ArrowUpDown className="size-3 text-gray-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={12} className="data-empty-cell">
                    <div className="data-empty py-12 text-center">
                      <Car className="size-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-14 font-semibold text-gray-700">
                        No vehicle contracts found
                      </p>
                      <p className="text-12 text-gray-400 max-w-sm mx-auto mt-1">
                        {search
                          ? `No records matching "${search}" in this snapshot.`
                          : "No vehicle contracts recorded for this category."}
                      </p>
                      {search && (
                        <button
                          onClick={() => setSearch("")}
                          className="btn-secondary text-12 mt-3 inline-flex items-center gap-1"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="data-table-row group hover:bg-gray-50/80 transition-colors">
                    {/* Contract # */}
                    <td className="data-td font-medium">
                      <Link
                        href={`/loans/${entry.loanId}`}
                        className="font-roboto text-12 font-bold text-primary hover:underline inline-flex items-center gap-1"
                        title="View contract details"
                      >
                        {entry.contractNo || entry.loanId.slice(0, 8)}
                        <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity" />
                      </Link>
                    </td>

                    {/* Client & Contact */}
                    <td className="data-td">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 text-13">
                          {entry.clientName}
                        </span>
                        {entry.clientPhone && (
                          <span className="text-11 text-gray-400 flex items-center gap-1 font-mono">
                            <Phone className="size-2.5" />
                            {entry.clientPhone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Vehicle Plate & Model */}
                    <td className="data-td">
                      <div className="flex flex-col">
                        <span className="badge badge-info  inline-flex items-center gap-1 font-roboto text-12 font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 w-fit">

                          {entry.vehicleReg || "—"}
                        </span>
                        {entry.vehicleMakeModel && (
                          <span className="text-11 text-gray-500 mt-0.5 truncate max-w-[160px]">
                            {entry.vehicleMakeModel}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Deal Type */}
                    <td className="data-td">
                      <span className="text-12 font-medium text-gray-600">
                        {entry.loanType || "Hire Purchase"}
                      </span>
                    </td>

                    {/* Start Date */}
                    <td className="data-td text-12 text-gray-500 tabular-nums">
                      {entry.disbursementDate
                        ? new Date(entry.disbursementDate).toLocaleDateString(
                          "en-KE",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )
                        : "—"}
                    </td>

                    {/* Opening Bal. */}
                    <td className="data-td text-right tabular-nums text-gray-600 text-13">
                      {formatAmount(entry.openingBalance)}
                    </td>

                    {/* New Volume */}
                    <td className="data-td text-right tabular-nums font-semibold text-13">
                      {entry.newLoanAmount > 0 ? (
                        <span className="text-indigo-600">
                          {formatAmount(entry.newLoanAmount)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Inflow Paid */}
                    <td className="data-td text-right tabular-nums font-semibold text-13">
                      {entry.amountPaidThisMonth > 0 ? (
                        <span className="text-green-600">
                          {formatAmount(entry.amountPaidThisMonth)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Penalties */}
                    <td className="data-td text-right tabular-nums text-13">
                      {entry.penaltiesThisMonth > 0 ? (
                        <span className="text-orange-500 font-medium">
                          {formatAmount(entry.penaltiesThisMonth)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Closing Bal. */}
                    <td className="data-td text-right tabular-nums font-bold text-gray-900 text-13">
                      {formatAmount(entry.closingBalance)}
                    </td>

                    {/* Status */}
                    <td className="data-td">
                      {getStatusBadge(entry.loanStatus, entry.daysPastDue)}
                    </td>

                    {/* DPD */}
                    <td className="data-td text-right">
                      {entry.daysPastDue > 0 ? (
                        <span
                          className={cn(
                            "text-12 font-bold tabular-nums px-1.5 py-0.5 rounded",
                            entry.daysPastDue > 90
                              ? "bg-red-100 text-red-800"
                              : entry.daysPastDue > 60
                                ? "bg-red-50 text-red-600"
                                : entry.daysPastDue > 30
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-amber-50 text-amber-700"
                          )}
                        >
                          {entry.daysPastDue}d
                        </span>
                      ) : (
                        <span className="text-gray-300 text-12">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Table Totals Footer */}
            {filteredEntries.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/90 font-bold">
                  <td colSpan={5} className="data-td text-12 text-gray-700 uppercase tracking-wider">
                    <span className="font-bold">
                      Subtotal ({filteredEntries.length} {filteredEntries.length === 1 ? "deal" : "deals"}):
                    </span>
                  </td>
                  <td className="data-td text-right tabular-nums text-gray-700 font-bold">
                    {formatAmount(filteredTotals.openingBalance)}
                  </td>
                  <td className="data-td text-right tabular-nums text-indigo-600 font-bold">
                    {filteredTotals.newLoanAmount > 0
                      ? formatAmount(filteredTotals.newLoanAmount)
                      : "—"}
                  </td>
                  <td className="data-td text-right tabular-nums text-green-600 font-bold">
                    {filteredTotals.amountPaidThisMonth > 0
                      ? formatAmount(filteredTotals.amountPaidThisMonth)
                      : "—"}
                  </td>
                  <td className="data-td text-right tabular-nums text-orange-500 font-bold">
                    {filteredTotals.penaltiesThisMonth > 0
                      ? formatAmount(filteredTotals.penaltiesThisMonth)
                      : "—"}
                  </td>
                  <td className="data-td text-right tabular-nums text-gray-900 font-extrabold text-14">
                    {formatAmount(filteredTotals.closingBalance)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
