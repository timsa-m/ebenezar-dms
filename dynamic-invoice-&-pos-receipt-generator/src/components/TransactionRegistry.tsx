import React, { useState, useMemo } from 'react';
import { DocumentData, DocumentType, DateFilterRange } from '../types/document';
import { formatCurrency } from '../utils/taxCalculator';
import { 
  Calendar, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Plus, 
  Eye, 
  Receipt, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  FileText,
  Clock
} from 'lucide-react';
import { exportTransactionsToCSV } from '../utils/exportUtils';

interface Props {
  documents: DocumentData[];
  selectedDocId: string;
  onSelectDocument: (doc: DocumentData) => void;
  onNewDocument: () => void;
}

export const TransactionRegistry: React.FC<Props> = ({
  documents,
  selectedDocId,
  onSelectDocument,
  onNewDocument,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<DateFilterRange['preset']>('ALL');
  const [customStart, setCustomStart] = useState('2026-09-01');
  const [customEnd, setCustomEnd] = useState('2026-10-31');

  // Filter transactions based on date and criteria
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Type filter
      if (typeFilter !== 'ALL' && doc.metadata.docType !== typeFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches =
          doc.metadata.invoiceNo.toLowerCase().includes(term) ||
          doc.buyer.name.toLowerCase().includes(term) ||
          doc.seller.name.toLowerCase().includes(term) ||
          (doc.buyer.pin && doc.buyer.pin.toLowerCase().includes(term)) ||
          doc.items.some(i => i.item.toLowerCase().includes(term));
        if (!matches) return false;
      }

      // Date timeframe filter
      const docDateStr = doc.metadata.createdAt.slice(0, 10);
      const docDate = new Date(docDateStr);

      const refDate = new Date('2026-10-05T00:00:00'); // current mock anchor date

      if (datePreset === 'TODAY') {
        const todayStr = '2026-10-05';
        if (docDateStr !== todayStr) return false;
      } else if (datePreset === 'YESTERDAY') {
        const yesterdayStr = '2026-10-04';
        if (docDateStr !== yesterdayStr) return false;
      } else if (datePreset === 'LAST_7_DAYS') {
        const sevenDaysAgo = new Date(refDate);
        sevenDaysAgo.setDate(refDate.getDate() - 7);
        if (docDate < sevenDaysAgo || docDate > refDate) return false;
      } else if (datePreset === 'THIS_MONTH') {
        const yearMonth = '2026-10';
        if (!docDateStr.startsWith(yearMonth)) return false;
      } else if (datePreset === 'LAST_MONTH') {
        const lastYearMonth = '2026-09';
        if (!docDateStr.startsWith(lastYearMonth)) return false;
      } else if (datePreset === 'CUSTOM') {
        if (customStart && docDateStr < customStart) return false;
        if (customEnd && docDateStr > customEnd) return false;
      }

      return true;
    });
  }, [documents, typeFilter, searchTerm, datePreset, customStart, customEnd]);

  // Aggregate KPI metrics
  const metrics = useMemo(() => {
    let grossRevenue = 0;
    let totalVat = 0;
    let netTaxable = 0;

    filteredDocuments.forEach(d => {
      grossRevenue += d.totalAmount;
      totalVat += d.totalVat;
      netTaxable += d.subtotal;
    });

    return {
      grossRevenue,
      totalVat,
      netTaxable,
      count: filteredDocuments.length,
    };
  }, [filteredDocuments]);

  const handleExportCSV = () => {
    exportTransactionsToCSV(filteredDocuments, `transactions_registry_${datePreset.toLowerCase()}.csv`);
  };

  const getDocTypeBadge = (type: DocumentType) => {
    switch (type) {
      case 'PAYMENT_RECEIPT':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">Receipt</span>;
      case 'PROFORMA_INVOICE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">Proforma</span>;
      case 'CREDIT_NOTE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">Credit Note</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">Invoice</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-neutral-200/90 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Turnover</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-neutral-900">
            KES {formatCurrency(metrics.grossRevenue)}
          </p>
          <span className="text-[11px] text-neutral-400">Total in timeframe</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200/90 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">VAT Collected</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-neutral-900">
            KES {formatCurrency(metrics.totalVat)}
          </p>
          <span className="text-[11px] text-neutral-400">VAT 16% / 8%</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200/90 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Taxable</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-neutral-900">
            KES {formatCurrency(metrics.netTaxable)}
          </p>
          <span className="text-[11px] text-neutral-400">Exclusive of taxes</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200/90 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Documents</span>
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-neutral-900">
            {metrics.count} <span className="text-sm font-normal text-neutral-500">records</span>
          </p>
          <span className="text-[11px] text-neutral-400">Invoices & Receipts</span>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
            <span className="text-neutral-500 flex items-center gap-1 mr-1">
              <Clock className="w-3.5 h-3.5" />
              Timeframe:
            </span>
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'TODAY', label: 'Today (Oct 5)' },
              { id: 'YESTERDAY', label: 'Yesterday (Oct 4)' },
              { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'October 2026' },
              { id: 'LAST_MONTH', label: 'September 2026' },
              { id: 'CUSTOM', label: 'Custom Range' },
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => setDatePreset(preset.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  datePreset === preset.id
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Action: Export CSV & New */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 hover:border-neutral-400 text-neutral-700 bg-white text-xs font-semibold shadow-2xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Export CSV
            </button>
            <button
              onClick={onNewDocument}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Transaction
            </button>
          </div>
        </div>

        {/* Custom Range Picker (if CUSTOM selected) */}
        {datePreset === 'CUSTOM' && (
          <div className="flex items-center gap-3 pt-2 border-t border-neutral-100 text-xs">
            <span className="text-neutral-500 font-medium">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="px-2.5 py-1 rounded border border-neutral-300 bg-white"
            />
            <span className="text-neutral-500 font-medium">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 rounded border border-neutral-300 bg-white"
            />
          </div>
        )}

        {/* Search & Type Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by customer, invoice #, PIN, item..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-neutral-300 bg-white focus:outline-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-neutral-500" />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white focus:outline-emerald-500 font-medium text-neutral-700"
            >
              <option value="ALL">All Types</option>
              <option value="TAX_INVOICE">Tax Invoices</option>
              <option value="PAYMENT_RECEIPT">Payment Receipts</option>
              <option value="PROFORMA_INVOICE">Proformas</option>
              <option value="CREDIT_NOTE">Credit Notes</option>
            </select>
          </div>
        </div>
      </div>

      {/* TRANSACTIONS TABLE */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Doc #</th>
                <th className="py-3 px-3">Reference #</th>
                <th className="py-3 px-3">Buyer / Customer</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3 text-right">Amount (KES)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-500">
                    No transactions match the selected timeframe and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map(d => {
                  const isSelected = d.metadata.id === selectedDocId;
                  return (
                    <tr
                      key={d.metadata.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/70 font-medium'
                          : 'hover:bg-neutral-50/80 text-neutral-800'
                      }`}
                    >
                      <td className="py-3 px-3 whitespace-nowrap text-neutral-600">
                        {d.metadata.createdAt.slice(0, 10)}
                        <span className="text-[10px] text-neutral-400 block">
                          {d.metadata.createdAt.slice(11)}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getDocTypeBadge(d.metadata.docType)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                        #{d.metadata.invoiceNo}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-neutral-600">
                        {d.metadata.invoiceNo}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-neutral-900">{d.buyer.name}</div>
                        {d.buyer.pin && (
                          <div className="text-[10px] text-neutral-500">PIN: {d.buyer.pin}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap uppercase text-[11px] text-neutral-600">
                        {d.metadata.paymentMethod}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-neutral-900">
                        {formatCurrency(d.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700">
                          {d.metadata.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onSelectDocument(d)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isSelected ? 'Viewing' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
