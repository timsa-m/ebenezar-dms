'use client'

import React, { useEffect, useState } from 'react';
import { DocumentData } from '../types/document';
import { formatCurrency } from '../utils/taxCalculator';
import { Printer, Copy, Check } from 'lucide-react';
import { generateEscPosPlainText } from '../utils/exportUtils';

interface Props {
  document: DocumentData;
  id?: string;
  rollWidth?: '80mm' | '58mm';
}

export const POSReceiptView: React.FC<Props> = ({
  document: doc,
  id = 'pos-receipt-layout',
  rollWidth = '80mm',
}) => {
  const [copiedEscPos, setCopiedEscPos] = useState(false);

  const is58mm = rollWidth === '58mm';
  const maxWidth = is58mm ? '320px' : '400px';

  const docTitle = doc.metadata.docType === 'PAYMENT_RECEIPT'
    ? 'CASH / PAYMENT RECEIPT'
    : doc.metadata.docType === 'PROFORMA_INVOICE'
    ? 'PROFORMA INVOICE'
    : doc.metadata.docType === 'CREDIT_NOTE'
    ? 'CREDIT NOTE'
    : 'TAX INVOICE';

  const handleCopyEscPos = () => {
    const rawText = generateEscPosPlainText(doc);
    navigator.clipboard.writeText(rawText);
    setCopiedEscPos(true);
    setTimeout(() => setCopiedEscPos(false), 2000);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Quick POS action toolbar */}
      <div className="no-print flex items-center justify-between w-full max-w-[400px] mb-3 px-2 text-xs text-neutral-600">
        <span className="font-medium flex items-center gap-1.5 text-neutral-700">
          <Printer className="w-3.5 h-3.5 text-emerald-600" />
          Thermal {rollWidth} Paper Roll Mode
        </span>
        <button
          onClick={handleCopyEscPos}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors font-mono text-[11px]"
          title="Copy formatted ESC/POS printer text"
        >
          {copiedEscPos ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedEscPos ? 'Copied ESC/POS' : 'Copy Raw ESC/POS'}
        </button>
      </div>

      {/* Realistic Thermal Receipt Paper Container */}
      <div
        id={id}
        className="printable-area relative bg-[#fefefe] shadow-lg print:shadow-none border-x border-neutral-300 print:border-none text-neutral-900 font-receipt selection:bg-neutral-200"
        style={{
          width: '100%',
          maxWidth,
          padding: is58mm ? '20px 14px' : '28px 20px',
          boxSizing: 'border-box',
          fontSize: is58mm ? '11px' : '12px',
          lineHeight: 1.35,
        }}
      >
        {/* Top Paper Tear / Zigzag visual representation */}
        <div className="no-print absolute top-0 left-0 right-0 h-2 bg-[radial-gradient(circle,transparent_2px,#fefefe_2px)] bg-[length:8px_8px] -translate-y-2 border-b border-dashed border-neutral-300" />

        {/* Center Header */}
        <div className="text-center space-y-1 mb-3">
          <h2 className="text-[15px] font-bold tracking-tight text-black uppercase">
            {doc.seller.name}
          </h2>
          {doc.seller.subName && (
            <p className="text-[12px] font-semibold uppercase">{doc.seller.subName}</p>
          )}
          <p className="text-neutral-700">PIN: {doc.seller.pin}</p>
          <p className="text-neutral-600 text-[11px]">{doc.seller.address}</p>
          <p className="text-neutral-600 text-[10px] break-all">{doc.seller.email}</p>
          {doc.seller.phone && <p className="text-neutral-600 text-[11px]">Tel: {doc.seller.phone}</p>}
        </div>

        {/* Dashed Separator */}
        <div className="border-b border-dashed border-neutral-400 my-2" />

        {/* Document Title & Metadata */}
        <div className="text-center space-y-0.5 mb-2">
          <p className="font-bold text-[13px] tracking-wide uppercase">*** {docTitle} ***</p>
          <p className="text-[11px] text-neutral-700">Date: {doc.metadata.createdAt}</p>
          <p className="text-[11px]">
            {doc.metadata.docType === 'PAYMENT_RECEIPT' ? 'Receipt #' : 'Invoice #'}: {doc.metadata.invoiceNo}
          </p>
          <p className="text-[11px] font-bold tracking-tight">REF: {doc.metadata.invoiceNo}</p>
          <p className="text-[10px] text-neutral-600">Sig: {doc.metadata.receiptSignature}</p>
        </div>

        {/* Buyer Info */}
        <div className="border-t border-dashed border-neutral-400 pt-2 pb-2 text-[11px]">
          <p className="font-bold uppercase">BUYER: {doc.buyer.name}</p>
          {doc.buyer.pin && <p>BUYER PIN: {doc.buyer.pin}</p>}
          {doc.buyer.phone && <p>TEL: {doc.buyer.phone}</p>}
        </div>

        {/* Column Headers */}
        <div className="border-y border-dashed border-neutral-400 py-1 font-bold flex justify-between text-[11px]">
          <span>ITEM / DESCRIPTION</span>
          <span>TOTAL</span>
        </div>

        {/* Items List */}
        <div className="divide-y divide-dashed divide-neutral-200 py-1">
          {doc.items.map((item) => (
            <div key={item.id} className="py-1.5 space-y-0.5">
              <div className="flex justify-between items-start font-medium">
                <span className="break-words pr-2">{item.item}</span>
                <span className="font-bold tabular-nums whitespace-nowrap">
                  {formatCurrency(item.total)}
                </span>
              </div>
              <div className="flex justify-between text-[10.5px] text-neutral-600">
                <span>
                  {item.qty.toFixed(2)} x {formatCurrency(item.price)} [{item.taxType}]
                </span>
                {item.discount > 0 && <span>Disc: -{formatCurrency(item.discount)}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Subtotal, Taxes & Grand Total */}
        <div className="border-t border-dashed border-neutral-400 pt-2 space-y-1">
          <div className="flex justify-between text-neutral-700">
            <span>TAXABLE SUBTOTAL:</span>
            <span className="tabular-nums">{formatCurrency(doc.subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-700">
            <span>TOTAL VAT:</span>
            <span className="tabular-nums">{formatCurrency(doc.totalVat)}</span>
          </div>
          {doc.totalDiscount > 0 && (
            <div className="flex justify-between text-neutral-700">
              <span>TOTAL DISCOUNT:</span>
              <span className="tabular-nums">-{formatCurrency(doc.totalDiscount)}</span>
            </div>
          )}

          <div className="border-t border-dashed border-neutral-400 pt-1.5 pb-1 flex justify-between items-baseline font-bold text-[14px]">
            <span>TOTAL ({doc.currency}):</span>
            <span className="text-[16px] tabular-nums">{formatCurrency(doc.totalAmount)}</span>
          </div>
        </div>

        {/* Tax Breakdown Table */}
        <div className="border-t border-dashed border-neutral-300 pt-2 mt-2 text-[10.5px]">
          <p className="font-semibold mb-1">TAX SUMMARY</p>
          <div className="grid grid-cols-3 font-medium text-neutral-600 border-b border-neutral-200 pb-0.5">
            <span>RATE</span>
            <span className="text-right">TAXABLE</span>
            <span className="text-right">VAT</span>
          </div>
          {doc.taxBreakdowns.map((tb, i) => (
            <div key={i} className="grid grid-cols-3 py-0.5 text-neutral-700">
              <span className="truncate">{tb.rate}</span>
              <span className="text-right tabular-nums">{formatCurrency(tb.taxableAmount)}</span>
              <span className="text-right tabular-nums">{formatCurrency(tb.vatAmount)}</span>
            </div>
          ))}
        </div>

        {/* Payment Method Details */}
        <div className="border-t border-dashed border-neutral-400 pt-2 mt-2 text-[11px] space-y-0.5">
          <p>
            <span className="font-bold">PAID VIA:</span>{' '}
            <span className="uppercase font-semibold">{doc.metadata.paymentMethod}</span>
          </p>
          {doc.metadata.paymentReference && (
            <p>
              <span className="font-semibold">TX REF / CONFIRM:</span>{' '}
              <span className="font-mono">{doc.metadata.paymentReference}</span>
            </p>
          )}
          {doc.metadata.note && (
            <p className="text-neutral-600 text-[10.5px] italic mt-1">{doc.metadata.note}</p>
          )}
        </div>

        {/* Bottom Legal Notice */}
        <div className="text-center text-[9px] text-neutral-600 uppercase tracking-tight space-y-0.5 mt-2 border-t border-dashed border-neutral-300 pt-2">
          <p className="font-bold">VALID COMPUTER-GENERATED DOCUMENT</p>
          <p className="pt-1 text-neutral-400 font-mono">--- THANK YOU ---</p>
        </div>

        {/* Bottom Paper Tear visual representation */}
        <div className="no-print absolute bottom-0 left-0 right-0 h-2 bg-[radial-gradient(circle,transparent_2px,#fefefe_2px)] bg-[length:8px_8px] translate-y-2 border-t border-dashed border-neutral-300" />
      </div>
    </div>
  );
};
