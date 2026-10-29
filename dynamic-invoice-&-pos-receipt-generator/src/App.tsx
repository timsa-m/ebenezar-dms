/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DocumentData, DocumentType } from './types/document';
import { INITIAL_DOCUMENTS, ORIGINAL_EBENEZAR_INVOICE } from './data/mockDocuments';
import { A4DocumentReplica } from './components/A4DocumentReplica';
import { POSReceiptView } from './components/POSReceiptView';
import { MobileCardView } from './components/MobileCardView';
import { TransactionRegistry } from './components/TransactionRegistry';
import { DocumentEditorModal } from './components/DocumentEditorModal';
import { 
  exportElementToPDF, 
  printDocument, 
  exportDocumentItemsToCSV 
} from './utils/exportUtils';
import { 
  FileText, 
  Printer, 
  Smartphone, 
  Calendar, 
  Download, 
  Edit3, 
  FileSpreadsheet, 
  Check, 
  Sparkles, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Layers,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

export default function App() {
  const [documents, setDocuments] = useState<DocumentData[]>(INITIAL_DOCUMENTS);
  const [activeDoc, setActiveDoc] = useState<DocumentData>(ORIGINAL_EBENEZAR_INVOICE);
  const [activeLayout, setActiveLayout] = useState<'A4' | 'POS' | 'MOBILE' | 'REGISTRY'>('A4');
  const [posWidth, setPosWidth] = useState<'80mm' | '58mm'>('80mm');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveDocument = (updatedDoc: DocumentData) => {
    setActiveDoc(updatedDoc);
    setDocuments(prev => {
      const idx = prev.findIndex(d => d.metadata.id === updatedDoc.metadata.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedDoc;
        return copy;
      } else {
        return [updatedDoc, ...prev];
      }
    });
    showToast('Document updated successfully with dynamic bindings.');
  };

  const handleNewDocument = () => {
    const newId = `doc-${Date.now()}`;
    const newDoc: DocumentData = {
      ...ORIGINAL_EBENEZAR_INVOICE,
      metadata: {
        ...ORIGINAL_EBENEZAR_INVOICE.metadata,
        id: newId,
        invoiceNo: `${Math.floor(100 + Math.random() * 900)}`,
        cuInvoiceNumber: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        status: 'ISSUED',
      },
    };
    setActiveDoc(newDoc);
    setDocuments(prev => [newDoc, ...prev]);
    setIsEditorOpen(true);
  };

  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    let elementId = 'a4-document-replica';
    if (activeLayout === 'POS') elementId = 'pos-receipt-layout';
    else if (activeLayout === 'MOBILE') elementId = 'mobile-device-view';

    const filename = `${activeDoc.metadata.docType}_${activeDoc.metadata.invoiceNo}`;
    const ok = await exportElementToPDF(elementId, filename);
    setIsExportingPdf(false);
    if (ok) {
      showToast('PDF downloaded successfully!');
    } else {
      showToast('PDF generated. Check your downloads.');
    }
  };

  const handleExportCSV = () => {
    exportDocumentItemsToCSV(activeDoc);
    showToast('Line items exported to CSV.');
  };

  const handleSelectDocFromRegistry = (doc: DocumentData) => {
    setActiveDoc(doc);
    setActiveLayout('A4');
    showToast(`Loaded ${doc.metadata.docType.replace('_', ' ')} #${doc.metadata.invoiceNo}`);
  };

  return (
    <div className="min-h-screen bg-neutral-100/80 text-neutral-900 font-sans flex flex-col selection:bg-emerald-100">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-neutral-700 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER & APP NAVIGATION */}
      <header className="no-print bg-white border-b border-neutral-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Document context */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                Doc
              </div>
              <div>
                <h1 className="text-sm font-bold text-neutral-900 leading-tight flex items-center gap-1.5">
                  Document & POS Engine
                </h1>
                <p className="text-[11px] text-neutral-500 hidden sm:block">
                  Current: <strong className="text-neutral-800">{activeDoc.metadata.invoiceNo}</strong> ({activeDoc.metadata.docType.replace('_', ' ')})
                </p>
              </div>
            </div>
          </div>

          {/* LAYOUT / FORMAT SELECTOR TABS */}
          <div className="flex items-center p-1 bg-neutral-100 rounded-xl border border-neutral-200/80 text-xs font-semibold">
            <button
              onClick={() => setActiveLayout('A4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeLayout === 'A4'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Exact Replica (A4)</span>
            </button>

            <button
              onClick={() => setActiveLayout('POS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeLayout === 'POS'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-emerald-600" />
              <span>POS Printer</span>
            </button>

            <button
              onClick={() => setActiveLayout('MOBILE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeLayout === 'MOBILE'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-600" />
              <span>Mobile Screen</span>
            </button>

            <button
              onClick={() => setActiveLayout('REGISTRY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeLayout === 'REGISTRY'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Date Filter & Registry</span>
            </button>
          </div>

          {/* ACTION BUTTONS (EDIT, EXPORT PDF, EXPORT CSV, PRINT) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditorOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 hover:border-neutral-400 bg-white text-neutral-800 text-xs font-semibold shadow-2xs hover:bg-neutral-50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Edit Data</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-300 hover:border-neutral-400 bg-white text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition-colors"
              title="Export items to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">CSV</span>
            </button>

            <button
              onClick={printDocument}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-300 hover:border-neutral-400 bg-white text-neutral-700 text-xs font-semibold hover:bg-neutral-50 transition-colors"
              title="Print document directly"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-600" />
              <span className="hidden md:inline">Print</span>
            </button>
          </div>
        </div>

        {/* SUB-BAR FOR QUICK SWITCHING PRESETS & FORMAT OPTIONS */}
        {activeLayout !== 'REGISTRY' && (
          <div className="bg-neutral-50 border-t border-neutral-200/80 px-4 sm:px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-neutral-500 font-medium whitespace-nowrap flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Templates:
              </span>
              {documents.map(d => (
                <button
                  key={d.metadata.id}
                  onClick={() => {
                    setActiveDoc(d);
                    showToast(`Loaded ${d.seller.name}`);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                    activeDoc.metadata.id === d.metadata.id
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  {d.metadata.id === 'doc-001' ? 'Original Ebenezar Replica' : d.seller.name.slice(0, 18)}
                </button>
              ))}
            </div>

            {/* Layout specific controls */}
            <div className="flex items-center gap-3">
              {activeLayout === 'POS' && (
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-neutral-300 text-[11px] font-semibold">
                  <button
                    onClick={() => setPosWidth('80mm')}
                    className={`px-2 py-0.5 rounded ${
                      posWidth === '80mm' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
                    }`}
                  >
                    80mm Standard
                  </button>
                  <button
                    onClick={() => setPosWidth('58mm')}
                    className={`px-2 py-0.5 rounded ${
                      posWidth === '58mm' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
                    }`}
                  >
                    58mm Handheld
                  </button>
                </div>
              )}

              {activeLayout === 'A4' && (
                <div className="hidden sm:flex items-center gap-1.5 text-neutral-500 text-[11px]">
                  <span>Zoom:</span>
                  <button
                    onClick={() => setZoomScale(s => Math.max(0.7, Number((s - 0.1).toFixed(1))))}
                    className="p-1 rounded hover:bg-neutral-200"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-neutral-800">{Math.round(zoomScale * 100)}%</span>
                  <button
                    onClick={() => setZoomScale(s => Math.min(1.3, Number((s + 0.1).toFixed(1))))}
                    className="p-1 rounded hover:bg-neutral-200"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 overflow-x-hidden">
        {/* VIEW 1: EXACT A4 REPLICA */}
        {activeLayout === 'A4' && (
          <div className="flex flex-col items-center justify-center">
            {/* Informational banner */}
            <div className="no-print mb-4 w-full max-w-[820px] p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  <strong>1:1 Authentic Replica:</strong> Accurately formats the document according to industry standard guidelines.
                </span>
              </div>
              <button
                onClick={() => setIsEditorOpen(true)}
                className="font-semibold underline ml-2 hover:text-blue-800 whitespace-nowrap"
              >
                Change Data
              </button>
            </div>

            <div
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="w-full flex justify-center"
            >
              <A4DocumentReplica document={activeDoc} />
            </div>
          </div>
        )}

        {/* VIEW 2: POS PRINTER THERMAL ROLL VIEW */}
        {activeLayout === 'POS' && (
          <div className="flex flex-col items-center">
            <div className="no-print mb-4 w-full max-w-[400px] p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-700" />
                POS Thermal Printer Format ({posWidth})
              </p>
              <p className="text-emerald-800 text-[11px]">
                Monospace typography formatted for direct thermal printing (ESC/POS), handheld Sunmi/Telpo devices, or receipt paper rolls.
              </p>
            </div>

            <POSReceiptView document={activeDoc} rollWidth={posWidth} />
          </div>
        )}

        {/* VIEW 3: MOBILE DEVICE SCREEN VIEW */}
        {activeLayout === 'MOBILE' && (
          <div className="flex flex-col items-center">
            <div className="no-print mb-4 w-full max-w-[390px] p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-purple-700" />
                Mobile Device Scaled View
              </p>
              <p className="text-purple-800 text-[11px]">
                Specially scaled for smartphone screens (iOS / Android), ensuring ultra-legible typography, tap-to-copy codes, and collapsible tax items.
              </p>
            </div>

            <MobileCardView
              document={activeDoc}
              onShare={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${activeDoc.metadata.docType} ${activeDoc.metadata.invoiceNo}`,
                    text: `${activeDoc.seller.name} - ${activeDoc.currency} ${activeDoc.totalAmount}`,
                    url: window.location.href,
                  }).catch(() => {});
                } else {
                  handleExportPDF();
                }
              }}
            />
          </div>
        )}

        {/* VIEW 4: TIMEFRAME DATE FILTER & TRANSACTION REGISTRY */}
        {activeLayout === 'REGISTRY' && (
          <TransactionRegistry
            documents={documents}
            selectedDocId={activeDoc.metadata.id}
            onSelectDocument={handleSelectDocFromRegistry}
            onNewDocument={handleNewDocument}
          />
        )}
      </main>

      {/* DYNAMIC DOCUMENT EDITOR MODAL */}
      <DocumentEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        currentDocument={activeDoc}
        onSaveDocument={handleSaveDocument}
      />
    </div>
  );
}
