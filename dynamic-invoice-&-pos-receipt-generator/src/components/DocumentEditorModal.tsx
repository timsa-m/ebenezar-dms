import React, { useState } from 'react';
import { DocumentData, DocumentType, LineItem, TaxRateType } from '../types/document';
import { calculateDocumentTotals } from '../utils/taxCalculator';
import { Plus, Trash2, X, Save, RefreshCw, Sparkles, Building, User, FileText, CheckCircle2 } from 'lucide-react';
import { ORIGINAL_EBENEZAR_INVOICE, SUPERMARKET_RECEIPT, HARDWARE_INVOICE, RESTAURANT_RECEIPT, SAMPLE_CREDIT_NOTE } from '../data/mockDocuments';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentDocument: DocumentData;
  onSaveDocument: (doc: DocumentData) => void;
}

export const DocumentEditorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentDocument,
  onSaveDocument,
}) => {
  const [doc, setDoc] = useState<DocumentData>(JSON.parse(JSON.stringify(currentDocument)));
  const [activeTab, setActiveTab] = useState<'TYPE' | 'SELLER' | 'BUYER' | 'ITEMS' | 'PAYMENT'>('ITEMS');

  if (!isOpen) return null;

  const handleDocTypeChange = (newType: DocumentType) => {
    let prefix = 'INV';
    if (newType === 'PAYMENT_RECEIPT') prefix = 'RCP';
    if (newType === 'PROFORMA_INVOICE') prefix = 'PRO';
    if (newType === 'CREDIT_NOTE') prefix = 'CN';

    const updated = {
      ...doc,
      metadata: {
        ...doc.metadata,
        docType: newType,
        cuInvoiceNumber: `${doc.metadata.scuId}/${prefix}-${Math.floor(100 + Math.random() * 900)}`,
        status: newType === 'PAYMENT_RECEIPT' ? ('PAID' as const) : ('ISSUED' as const),
      },
    };
    setDoc(updated);
  };

  const handleItemChange = (index: number, field: keyof LineItem, val: any) => {
    const updatedItems = [...doc.items];
    const target = { ...updatedItems[index], [field]: val };

    if (field === 'taxType') {
      const typeStr = val as TaxRateType;
      target.taxRate = typeStr.includes('16%') ? 16 : typeStr.includes('8%') ? 8 : 0;
    }

    updatedItems[index] = target;
    const totals = calculateDocumentTotals(updatedItems);

    setDoc({
      ...doc,
      items: totals.items,
      subtotal: totals.subtotal,
      totalVat: totals.totalVat,
      totalDiscount: totals.totalDiscount,
      totalAmount: totals.totalAmount,
      taxBreakdowns: totals.taxBreakdowns,
    });
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      item: 'New Product / Service',
      qty: 1,
      price: 1000,
      taxType: 'B VAT 16%',
      taxRate: 16,
      discount: 0,
      total: 1000,
      taxAmount: 137.93,
      taxableAmount: 862.07,
    };

    const newItems = [...doc.items, newItem];
    const totals = calculateDocumentTotals(newItems);
    setDoc({
      ...doc,
      items: totals.items,
      subtotal: totals.subtotal,
      totalVat: totals.totalVat,
      totalDiscount: totals.totalDiscount,
      totalAmount: totals.totalAmount,
      taxBreakdowns: totals.taxBreakdowns,
    });
  };

  const handleRemoveItem = (index: number) => {
    if (doc.items.length <= 1) return;
    const newItems = doc.items.filter((_, i) => i !== index);
    const totals = calculateDocumentTotals(newItems);
    setDoc({
      ...doc,
      items: totals.items,
      subtotal: totals.subtotal,
      totalVat: totals.totalVat,
      totalDiscount: totals.totalDiscount,
      totalAmount: totals.totalAmount,
      taxBreakdowns: totals.taxBreakdowns,
    });
  };

  const handleApplyPreset = (preset: DocumentData) => {
    setDoc(JSON.parse(JSON.stringify(preset)));
  };

  const handleSave = () => {
    onSaveDocument(doc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-neutral-900">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Dynamic Document & Field Binder
            </h2>
            <p className="text-xs text-neutral-500">
              Customize transaction type, seller, buyer, line items, and tax rates with live recalculation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-6 py-2.5 bg-neutral-100/70 border-b border-neutral-200 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-neutral-500 font-medium whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick Presets:
          </span>
          <button
            onClick={() => handleApplyPreset(ORIGINAL_EBENEZAR_INVOICE)}
            className="px-2.5 py-1 rounded-md bg-white border border-neutral-300 text-neutral-800 hover:border-emerald-500 hover:text-emerald-700 transition-colors whitespace-nowrap font-medium"
          >
            Original Replica (Ebenezar Toyota)
          </button>
          <button
            onClick={() => handleApplyPreset(SUPERMARKET_RECEIPT)}
            className="px-2.5 py-1 rounded-md bg-white border border-neutral-300 text-neutral-800 hover:border-emerald-500 hover:text-emerald-700 transition-colors whitespace-nowrap font-medium"
          >
            Supermarket POS Receipt
          </button>
          <button
            onClick={() => handleApplyPreset(HARDWARE_INVOICE)}
            className="px-2.5 py-1 rounded-md bg-white border border-neutral-300 text-neutral-800 hover:border-emerald-500 hover:text-emerald-700 transition-colors whitespace-nowrap font-medium"
          >
            Hardware Store Invoice
          </button>
          <button
            onClick={() => handleApplyPreset(RESTAURANT_RECEIPT)}
            className="px-2.5 py-1 rounded-md bg-white border border-neutral-300 text-neutral-800 hover:border-emerald-500 hover:text-emerald-700 transition-colors whitespace-nowrap font-medium"
          >
            Restaurant Bill
          </button>
          <button
            onClick={() => handleApplyPreset(SAMPLE_CREDIT_NOTE)}
            className="px-2.5 py-1 rounded-md bg-white border border-neutral-300 text-neutral-800 hover:border-emerald-500 hover:text-emerald-700 transition-colors whitespace-nowrap font-medium"
          >
            Credit Note
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 px-6 bg-white overflow-x-auto">
          {[
            { id: 'TYPE', label: '1. Document Type' },
            { id: 'ITEMS', label: '2. Line Items & Tax' },
            { id: 'SELLER', label: '3. Seller Details' },
            { id: 'BUYER', label: '4. Buyer Details' },
            { id: 'PAYMENT', label: '5. Meta & Payment' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: DOCUMENT TYPE */}
          {activeTab === 'TYPE' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-800">
                Select Transaction Document Type
              </h3>
              <p className="text-xs text-neutral-500">
                Switching dynamically formats headings, numbering, and regulatory identifiers.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  {
                    type: 'TAX_INVOICE' as const,
                    title: 'Tax Invoice',
                    desc: 'Standard sales invoice for credit/business accounts.',
                  },
                  {
                    type: 'PAYMENT_RECEIPT' as const,
                    title: 'Payment Receipt / Cash Sale',
                    desc: 'Immediate cash/M-Pesa point-of-sale receipt with paid status.',
                  },
                  {
                    type: 'PROFORMA_INVOICE' as const,
                    title: 'Proforma Invoice',
                    desc: 'Preliminary quote and price schedule prior to final sale.',
                  },
                  {
                    type: 'CREDIT_NOTE' as const,
                    title: 'Credit Note',
                    desc: 'Document for returned goods, price adjustments, or reversals.',
                  },
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => handleDocTypeChange(item.type)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      doc.metadata.docType === item.type
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-neutral-900">{item.title}</span>
                      {doc.metadata.docType === item.type && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: LINE ITEMS */}
          {activeTab === 'ITEMS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-800">Line Items & Taxes</h3>
                  <p className="text-xs text-neutral-500">
                    Calculations automatically reverse-calculate 16% VAT or 8% tax based on tax-inclusive gross amounts.
                  </p>
                </div>
                <button
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {doc.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-600">Item #{index + 1}</span>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        disabled={doc.items.length <= 1}
                        className="text-neutral-400 hover:text-rose-600 disabled:opacity-30 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs">
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={item.item}
                          onChange={e => handleItemChange(index, 'item', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 bg-white focus:outline-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.qty}
                          onChange={e => handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 bg-white text-right focus:outline-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                          Price ({doc.currency})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          onChange={e => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-md border border-neutral-300 bg-white text-right focus:outline-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                          Tax Rate
                        </label>
                        <select
                          value={item.taxType}
                          onChange={e => handleItemChange(index, 'taxType', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-md border border-neutral-300 bg-white focus:outline-emerald-500"
                        >
                          <option value="B VAT 16%">B VAT 16%</option>
                          <option value="E Zero Rated">E Zero Rated (0%)</option>
                          <option value="A Exempt">A Exempt (0%)</option>
                          <option value="C VAT 8%">C VAT 8%</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-neutral-500 pt-1 border-t border-neutral-200">
                      <span>
                        Taxable: <strong className="text-neutral-800">{doc.currency} {item.taxableAmount.toFixed(2)}</strong> | 
                        VAT: <strong className="text-neutral-800">{doc.currency} {item.taxAmount.toFixed(2)}</strong>
                      </span>
                      <span className="font-bold text-neutral-900 text-sm">
                        Total: {doc.currency} {item.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="p-4 rounded-xl bg-neutral-100 text-xs space-y-1">
                <div className="flex justify-between text-neutral-600">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono font-medium">{doc.currency} {doc.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Total VAT:</span>
                  <span className="font-mono font-medium">{doc.currency} {doc.totalVat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Total Discount:</span>
                  <span className="font-mono font-medium">{doc.currency} {doc.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-900 font-bold text-sm pt-1 border-t border-neutral-300">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-800">{doc.currency} {doc.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SELLER DETAILS */}
          {activeTab === 'SELLER' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-emerald-600" />
                Seller / Business Details (Sale From)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Business Name</label>
                  <input
                    type="text"
                    value={doc.seller.name}
                    onChange={e => setDoc({ ...doc, seller: { ...doc.seller, name: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Sub Name (e.g. limited)</label>
                  <input
                    type="text"
                    value={doc.seller.subName || ''}
                    onChange={e => setDoc({ ...doc, seller: { ...doc.seller, subName: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Tax PIN / ID</label>
                  <input
                    type="text"
                    value={doc.seller.pin}
                    onChange={e => setDoc({ ...doc, seller: { ...doc.seller, pin: e.target.value.toUpperCase() } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 uppercase font-mono focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Email Address</label>
                  <input
                    type="email"
                    value={doc.seller.email}
                    onChange={e => setDoc({ ...doc, seller: { ...doc.seller, email: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-neutral-600 mb-1 font-medium">Physical Address / Postal</label>
                  <input
                    type="text"
                    value={doc.seller.address}
                    onChange={e => setDoc({ ...doc, seller: { ...doc.seller, address: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BUYER DETAILS */}
          {activeTab === 'BUYER' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" />
                Customer / Buyer Details (Sale To)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Customer / Client Name</label>
                  <input
                    type="text"
                    value={doc.buyer.name}
                    onChange={e => setDoc({ ...doc, buyer: { ...doc.buyer, name: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 uppercase focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Customer Tax PIN / ID (Optional)</label>
                  <input
                    type="text"
                    value={doc.buyer.pin || ''}
                    placeholder="e.g. A009182374Z"
                    onChange={e => setDoc({ ...doc, buyer: { ...doc.buyer, pin: e.target.value.toUpperCase() } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 uppercase font-mono focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Customer Email</label>
                  <input
                    type="email"
                    value={doc.buyer.email || ''}
                    onChange={e => setDoc({ ...doc, buyer: { ...doc.buyer, email: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Customer Phone</label>
                  <input
                    type="text"
                    value={doc.buyer.phone || ''}
                    placeholder="+254..."
                    onChange={e => setDoc({ ...doc, buyer: { ...doc.buyer, phone: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PAYMENT & METADATA */}
          {activeTab === 'PAYMENT' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-800">
                Document Metadata & Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Invoice / Doc No</label>
                  <input
                    type="text"
                    value={doc.metadata.invoiceNo}
                    onChange={e => setDoc({ ...doc, metadata: { ...doc.metadata, invoiceNo: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 font-mono focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Store ID</label>
                  <input
                    type="text"
                    value={doc.metadata.scuId}
                    onChange={e => setDoc({ ...doc, metadata: { ...doc.metadata, scuId: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 font-mono focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Receipt Signature</label>
                  <input
                    type="text"
                    value={doc.metadata.receiptSignature}
                    onChange={e => setDoc({ ...doc, metadata: { ...doc.metadata, receiptSignature: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 font-mono focus:outline-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-neutral-600 mb-1 font-medium">Internal Reference</label>
                  <input
                    type="text"
                    value={doc.metadata.cuInvoiceNumber}
                    onChange={e => setDoc({ ...doc, metadata: { ...doc.metadata, cuInvoiceNumber: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 font-mono font-bold focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Date Created</label>
                  <input
                    type="text"
                    value={doc.metadata.createdAt}
                    onChange={e => setDoc({ ...doc, metadata: { ...doc.metadata, createdAt: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Payment Method</label>
                  <select
                    value={doc.metadata.paymentMethod}
                    onChange={e => setDoc({ ...doc, metadata: { ...doc.metadata, paymentMethod: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-emerald-500"
                  >
                    <option value="mpesa">M-Pesa</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer / EFT</option>
                    <option value="card">Visa / Mastercard</option>
                    <option value="airtel_money">Airtel Money</option>
                    <option value="credit">Credit Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Payment Reference / Code</label>
                  <input
                    type="text"
                    value={doc.metadata.paymentReference || ''}
                    placeholder="e.g. QKD72847291"
                    onChange={e => setDoc({ ...doc, metadata: { ...doc.metadata, paymentReference: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 font-mono uppercase focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 mb-1 font-medium">Document Status</label>
                  <select
                    value={doc.metadata.status}
                    onChange={e => setDoc({ ...doc, metadata: { ...doc.metadata, status: e.target.value as any } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-emerald-500"
                  >
                    <option value="ISSUED">ISSUED</option>
                    <option value="PAID">PAID</option>
                    <option value="VOID">VOID</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-neutral-600 mb-1 font-medium">Terms & Conditions</label>
                  <input
                    type="text"
                    value={doc.metadata.termsAndConditions || ''}
                    onChange={e => setDoc({ ...doc, metadata: { ...doc.metadata, termsAndConditions: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-emerald-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-neutral-600 mb-1 font-medium">Note</label>
                  <input
                    type="text"
                    value={doc.metadata.note || ''}
                    onChange={e => setDoc({ ...doc, metadata: { ...doc.metadata, note: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              Apply & Update Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
