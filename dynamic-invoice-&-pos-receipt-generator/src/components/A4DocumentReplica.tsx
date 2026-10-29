import React, { useEffect, useState } from 'react';
import { DocumentData } from '../types/document';
import { formatCurrency } from '../utils/taxCalculator';
import { SecurityWatermark } from './SecurityWatermark';
import { ImageIcon } from 'lucide-react';

interface Props {
  document: DocumentData;
  id?: string;
}

export const A4DocumentReplica: React.FC<Props> = ({ document: doc, id = 'a4-document-replica' }) => {
  const docTitle = doc.metadata.docType === 'PAYMENT_RECEIPT'
    ? 'Payment Receipt'
    : doc.metadata.docType === 'PROFORMA_INVOICE'
    ? 'Proforma Invoice'
    : doc.metadata.docType === 'CREDIT_NOTE'
    ? 'Credit Note'
    : 'Invoice';

  return (
    <div
      id={id}
      className="printable-area relative bg-white mx-auto shadow-xl print:shadow-none border border-neutral-200 print:border-none text-neutral-800 transition-all font-sans"
      style={{
        width: '100%',
        maxWidth: '820px',
        minHeight: '1100px',
        padding: '36px 42px',
        boxSizing: 'border-box',
      }}
    >
      {/* Background Guilloche Security Watermark Pattern */}
      <SecurityWatermark opacity={0.35} />

      {/* TOP HEADER SECTION */}
      <div className="relative z-10 flex justify-between items-start mb-6">
        {/* Left: Logo & Title Block */}
        <div className="flex-1">
          {/* Logo Placeholder / Custom Logo */}
          <div className="w-16 h-16 border border-neutral-300 rounded bg-neutral-50/60 flex items-center justify-center mb-4 overflow-hidden shadow-xs">
            {doc.seller.logoUrl ? (
              <img
                src={doc.seller.logoUrl}
                alt="Company Logo"
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-neutral-400">
                <ImageIcon className="w-6 h-6 stroke-1" />
              </div>
            )}
          </div>

          <h1 className="text-[34px] leading-tight font-bold text-neutral-900 tracking-tight mb-2">
            {docTitle}
          </h1>

          <div className="text-[13px] text-neutral-700 space-y-1">
            <p>
              <span className="font-normal text-neutral-600">Date Created: </span>
              <span className="font-semibold text-neutral-900">{doc.metadata.createdAt}</span>
            </p>
            
            <div className="flex flex-wrap items-center gap-x-4 text-[13px] text-neutral-800 pt-0.5">
              <div className="flex items-center gap-1">
                <span className="text-neutral-600 font-normal">
                  {doc.metadata.docType === 'PAYMENT_RECEIPT' ? 'Receipt No:' : 'Invoice No:'}
                </span>
                <span className="font-medium text-neutral-900">{doc.metadata.invoiceNo}</span>
              </div>
              
              <span className="text-neutral-300">|</span>

              <div className="flex items-center gap-1">
                <span className="text-neutral-600 font-normal">SCU ID:</span>
                <span className="font-medium text-neutral-900">{doc.metadata.scuId}</span>
              </div>

              <span className="text-neutral-300">|</span>

              <div className="flex items-center gap-1">
                <span className="text-neutral-600 font-normal">Receipt Signature:</span>
                <span className="font-medium text-neutral-900">{doc.metadata.receiptSignature}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* THREE PILL BADGES SECTION (SALE FROM, SALE TO, CU INVOICE NUMBER) */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mb-7 pt-2">
        {/* Sale From */}
        <div>
          <div className="inline-block bg-[#242528] text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-sm mb-2 shadow-xs">
            Sale From:
          </div>
          <div className="text-[13px] leading-relaxed text-neutral-700">
            <p className="font-semibold text-neutral-900">{doc.seller.name}</p>
            {doc.seller.subName && (
              <p className="font-semibold text-neutral-900">{doc.seller.subName}</p>
            )}
            <p className="text-neutral-600">
              PIN: <span className="text-neutral-800 font-medium">{doc.seller.pin}</span>
            </p>
            <p className="text-neutral-600 break-all">{doc.seller.email}</p>
            <p className="text-neutral-600">{doc.seller.address}</p>
            {doc.seller.phone && <p className="text-neutral-600">{doc.seller.phone}</p>}
          </div>
        </div>

        {/* Sale To */}
        <div>
          <div className="inline-block bg-[#242528] text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-sm mb-2 shadow-xs">
            Sale To:
          </div>
          <div className="text-[13px] leading-relaxed text-neutral-700">
            <p className="font-bold text-neutral-900 uppercase">{doc.buyer.name}</p>
            <p className="text-neutral-600">
              PIN: <span className="text-neutral-800 font-medium">{doc.buyer.pin || ''}</span>
            </p>
            {doc.buyer.email && <p className="text-neutral-600 break-all">{doc.buyer.email}</p>}
            {doc.buyer.phone && <p className="text-neutral-600">{doc.buyer.phone}</p>}
            {doc.buyer.address && <p className="text-neutral-600">{doc.buyer.address}</p>}
          </div>
        </div>

        {/* Document Status */}
        <div>
          <div className="inline-block bg-[#242528] text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-sm mb-2 shadow-xs">
            Document Reference:
          </div>
          <div className="text-[13px] leading-relaxed text-neutral-700">
            <p className="font-semibold text-neutral-900 text-[15px] sm:text-[16px] tracking-tight">
              {doc.metadata.invoiceNo}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Status: <span className="uppercase font-medium text-emerald-700">{doc.metadata.status}</span>
            </p>
          </div>
        </div>
      </div>

      {/* CURRENCY NOTICE */}
      <div className="relative z-10 text-[12px] text-neutral-500 mb-2 font-normal">
        Amounts are in {doc.currency}
      </div>

      {/* LINE ITEMS TABLE */}
      <div className="relative z-10 mb-2">
        <table className="w-full text-left text-[12.5px] border-collapse">
          <thead>
            <tr className="border-b border-neutral-300 text-neutral-800 font-semibold">
              <th className="py-2 pr-3 font-semibold text-neutral-800">Item</th>
              <th className="py-2 px-2 text-right font-semibold text-neutral-800">Qty</th>
              <th className="py-2 px-2 text-right font-semibold text-neutral-800">Price</th>
              <th className="py-2 px-2 text-center font-semibold text-neutral-800">Tax Type</th>
              <th className="py-2 px-2 text-right font-semibold text-neutral-800">Tax</th>
              <th className="py-2 px-2 text-right font-semibold text-neutral-800">Discount</th>
              <th className="py-2 pl-2 text-right font-semibold text-neutral-800">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {doc.items.map((item) => (
              <tr key={item.id} className="text-neutral-700 hover:bg-neutral-50/40">
                <td className="py-2.5 pr-3 text-neutral-900 font-normal">{item.item}</td>
                <td className="py-2.5 px-2 text-right tabular-nums">{item.qty.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right tabular-nums">{formatCurrency(item.price)}</td>
                <td className="py-2.5 px-2 text-center text-neutral-600 whitespace-nowrap">
                  {item.taxType}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums">{formatCurrency(item.taxAmount)}</td>
                <td className="py-2.5 px-2 text-right tabular-nums">{formatCurrency(item.discount || 0)}</td>
                <td className="py-2.5 pl-2 text-right tabular-nums font-medium text-neutral-900">
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* NUMBER OF ITEMS */}
      <div className="relative z-10 text-[12px] text-neutral-700 font-medium mb-8">
        Number of items: {doc.items.length}
      </div>

      {/* LOWER SECTION: PAYMENT METHOD, NOTES, TAX SUMMARY & TOTALS */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 pt-2">
        {/* Left Column: Payment details & eTIMS logo */}
        <div className="space-y-4 text-[12.5px] text-neutral-700 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-neutral-900">Payment Method:</p>
              <p className="capitalize text-neutral-800 mt-0.5">
                {doc.metadata.paymentMethod.replace('_', ' ')}
                {doc.metadata.paymentReference ? ` (${doc.metadata.paymentReference})` : ''}
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900">Terms & Conditions:</p>
              <p className="text-neutral-600 mt-0.5 text-[12px]">
                {doc.metadata.termsAndConditions || ''}
              </p>
            </div>

            <div>
              <p className="font-semibold text-neutral-900">Note:</p>
              <p className="text-neutral-600 mt-0.5 text-[12px]">
                {doc.metadata.note || ''}
              </p>
            </div>
          </div>

        </div>

        {/* Right Column: Rate Breakdown Table & Totals */}
        <div>
          {/* Rate Taxable VAT Table */}
          <table className="w-full text-[12px] text-right mb-4">
            <thead>
              <tr className="border-b border-neutral-300 text-neutral-800 font-semibold">
                <th className="py-1 text-left font-semibold">Rate</th>
                <th className="py-1 text-right font-semibold">Taxable Amount</th>
                <th className="py-1 text-right font-semibold">VAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {doc.taxBreakdowns.map((tb, idx) => (
                <tr key={idx} className="text-neutral-700">
                  <td className="py-1.5 text-left whitespace-nowrap">{tb.rate}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatCurrency(tb.taxableAmount)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatCurrency(tb.vatAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="space-y-1.5 text-[13px] pt-1">
            <div className="flex justify-between items-center text-neutral-700">
              <span className="font-normal">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(doc.subtotal)}</span>
            </div>

            <div className="flex justify-between items-center text-neutral-700">
              <span className="font-normal">Total VAT</span>
              <span className="tabular-nums">{formatCurrency(doc.totalVat)}</span>
            </div>

            <div className="flex justify-between items-center text-neutral-700">
              <span className="font-normal">Total Discount</span>
              <span className="tabular-nums">{formatCurrency(doc.totalDiscount)}</span>
            </div>

            <div className="flex justify-between items-baseline pt-4 border-t border-neutral-200 mt-3">
              <span className="text-[15px] font-bold text-neutral-900">Total Amount</span>
              <span className="text-[20px] font-extrabold text-neutral-900 tabular-nums">
                {formatCurrency(doc.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
