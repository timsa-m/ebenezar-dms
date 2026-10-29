import React, { useEffect, useState } from 'react';
import { DocumentData } from '../types/document';
import { formatCurrency } from '../utils/taxCalculator';
import { 
  Building2, 
  User, 
  Receipt, 
  Calendar, 
  Copy, 
  Check, 
  Share2, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Smartphone,
  CreditCard
} from 'lucide-react';

interface Props {
  document: DocumentData;
  id?: string;
  onShare?: () => void;
}

export const MobileCardView: React.FC<Props> = ({
  document: doc,
  id = 'mobile-device-view',
  onShare,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getDocTypeBadge = () => {
    switch (doc.metadata.docType) {
      case 'PAYMENT_RECEIPT':
        return { label: 'Payment Receipt', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'PROFORMA_INVOICE':
        return { label: 'Proforma Invoice', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'CREDIT_NOTE':
        return { label: 'Credit Note', bg: 'bg-rose-50 text-rose-800 border-rose-200' };
      default:
        return { label: 'Tax Invoice', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
    }
  };

  const badge = getDocTypeBadge();

  return (
    <div className="flex justify-center w-full px-2 py-2">
      {/* Mobile Device Container (styled like modern smartphone app card) */}
      <div
        id={id}
        className="w-full max-w-[390px] bg-white rounded-3xl shadow-xl border border-neutral-200/80 overflow-hidden font-sans text-neutral-800"
      >
        {/* Mobile Header Bar */}
        <div className="bg-neutral-900 text-white px-5 pt-4 pb-4">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
            <span className="flex items-center gap-1 font-medium">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              Mobile Bill
            </span>
            <span className="font-mono text-[11px] text-neutral-300">
              {doc.metadata.createdAt.slice(0, 10)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border ${badge.bg}`}>
                {badge.label}
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                {doc.currency} {formatCurrency(doc.totalAmount)}
              </h2>
            </div>

            {/* Quick Share / Copy button */}
            <button
              onClick={onShare}
              className="p-2.5 rounded-full bg-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-700 transition-colors"
              title="Share document"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Mobile Body */}
        <div className="p-4 space-y-4 text-sm">
          {/* Quick Verification Strip */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-200/60">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-neutral-500">DOCUMENT REFERENCE</span>
              <p className="font-bold text-neutral-900 font-mono text-xs tracking-tight">
                {doc.metadata.invoiceNo}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(doc.metadata.invoiceNo, 'cu')}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-200/60 transition-colors"
              title="Copy Document Reference"
            >
              {copiedKey === 'cu' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Seller & Buyer Details Cards */}
          <div className="grid grid-cols-1 gap-2.5">
            {/* Seller */}
            <div className="p-3.5 rounded-2xl bg-white border border-neutral-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 uppercase">
                <Building2 className="w-3.5 h-3.5 text-neutral-700" />
                Merchant (Sale From)
              </div>
              <p className="font-bold text-neutral-900">{doc.seller.name}</p>
              {doc.seller.subName && (
                <p className="text-xs text-neutral-700">{doc.seller.subName}</p>
              )}
              <div className="text-xs text-neutral-600 space-y-0.5 pt-1">
                <p>
                  PIN: <span className="font-semibold text-neutral-800">{doc.seller.pin}</span>
                </p>
                <p>{doc.seller.address}</p>
                <p className="text-[11px] text-neutral-500 break-all">{doc.seller.email}</p>
              </div>
            </div>

            {/* Buyer */}
            <div className="p-3.5 rounded-2xl bg-white border border-neutral-200 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 uppercase">
                <User className="w-3.5 h-3.5 text-neutral-700" />
                Customer (Sale To)
              </div>
              <p className="font-bold text-neutral-900">{doc.buyer.name}</p>
              <div className="text-xs text-neutral-600 space-y-0.5 pt-1">
                {doc.buyer.pin && (
                  <p>
                    PIN: <span className="font-semibold text-neutral-800">{doc.buyer.pin}</span>
                  </p>
                )}
                {doc.buyer.phone && <p>Tel: {doc.buyer.phone}</p>}
                {doc.buyer.email && <p className="text-[11px] text-neutral-500">{doc.buyer.email}</p>}
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="rounded-2xl border border-neutral-200 p-3.5 bg-white space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100">
              <span className="font-bold text-neutral-900 text-xs uppercase tracking-wide">
                Items ({doc.items.length})
              </span>
              <span className="text-[11px] text-neutral-500 font-medium">
                Amounts in {doc.currency}
              </span>
            </div>

            <div className="divide-y divide-neutral-100">
              {doc.items.map((item) => (
                <div key={item.id} className="py-2.5 space-y-1">
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-neutral-900 text-[13px] pr-2">
                      {item.item}
                    </p>
                    <span className="font-bold text-neutral-900 tabular-nums">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      {item.qty.toFixed(2)} unit(s) @ {formatCurrency(item.price)}
                    </span>
                    <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-[10px] font-medium text-neutral-600">
                      {item.taxType}
                    </span>
                  </div>
                  {item.discount > 0 && (
                    <p className="text-[11px] text-emerald-600 font-medium">
                      Discount: -{formatCurrency(item.discount)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Totals Breakdown */}
            <div className="pt-2 border-t border-neutral-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Taxable Subtotal</span>
                <span className="tabular-nums font-medium text-neutral-800">
                  {formatCurrency(doc.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Total VAT (16%)</span>
                <span className="tabular-nums font-medium text-neutral-800">
                  {formatCurrency(doc.totalVat)}
                </span>
              </div>
              {doc.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Total Discount</span>
                  <span className="tabular-nums font-medium">
                    -{formatCurrency(doc.totalDiscount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-neutral-200 text-sm font-bold text-neutral-900">
                <span>Total Amount Due</span>
                <span className="text-base text-neutral-900">
                  {doc.currency} {formatCurrency(doc.totalAmount)}
                </span>
              </div>
            </div>

            {/* Expandable Tax Details Accordion */}
            <button
              onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
              className="w-full pt-2 flex items-center justify-between text-[11px] text-neutral-500 hover:text-neutral-800 transition-colors"
            >
              <span>View Rate Breakdown</span>
              {showTaxBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showTaxBreakdown && (
              <div className="pt-2 text-[11px] bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/70 space-y-1.5">
                {doc.taxBreakdowns.map((tb, idx) => (
                  <div key={idx} className="flex justify-between text-neutral-700">
                    <span className="font-medium">{tb.rate}:</span>
                    <span>
                      Taxable {formatCurrency(tb.taxableAmount)} | VAT {formatCurrency(tb.vatAmount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method Badge */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white shadow-xs text-neutral-700">
                <CreditCard className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 uppercase font-medium">Payment Mode</p>
                <p className="font-semibold text-neutral-900 capitalize">
                  {doc.metadata.paymentMethod.replace('_', ' ')}
                </p>
              </div>
            </div>

            {doc.metadata.paymentReference && (
              <div className="text-right">
                <p className="text-[10px] text-neutral-400">TX REF</p>
                <p className="font-mono text-xs font-semibold text-neutral-800">
                  {doc.metadata.paymentReference}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
