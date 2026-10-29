import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { DocumentData } from '../types/document';
import { formatCurrency } from './taxCalculator';

export async function exportElementToPDF(elementId: string, fileName: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) return false;

  try {
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Check aspect ratio to determine if this is POS roll or A4
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const isThermal = imgWidth < 500 || elementId.includes('pos');

    if (isThermal) {
      // 80mm roll width
      const pdfWidth = 80;
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pdfWidth, Math.max(pdfHeight, 100)],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${fileName}.pdf`);
    } else {
      // Standard A4
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${fileName}.pdf`);
    }

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}

export function printDocument() {
  window.print();
}

export function exportTransactionsToCSV(documents: DocumentData[], filename: string = 'etims_transactions.csv') {
  const headers = [
    'Document Type',
    'Invoice / Doc No',
    'Date & Time',
    'Reference Number',
    'Store ID',
    'Receipt Signature',
    'Seller Name',
    'Seller PIN',
    'Buyer Name',
    'Buyer PIN',
    'Payment Method',
    'Subtotal (Excl. VAT)',
    'VAT Amount',
    'Discount',
    'Total Amount (KES)',
    'Status'
  ];

  const rows = documents.map(doc => [
    `"${doc.metadata.docType}"`,
    `"${doc.metadata.invoiceNo}"`,
    `"${doc.metadata.createdAt}"`,
    `"${doc.metadata.cuInvoiceNumber}"`,
    `"${doc.metadata.scuId}"`,
    `"${doc.metadata.receiptSignature}"`,
    `"${doc.seller.name.replace(/"/g, '""')}"`,
    `"${doc.seller.pin}"`,
    `"${doc.buyer.name.replace(/"/g, '""')}"`,
    `"${doc.buyer.pin || ''}"`,
    `"${doc.metadata.paymentMethod}"`,
    doc.subtotal.toFixed(2),
    doc.totalVat.toFixed(2),
    doc.totalDiscount.toFixed(2),
    doc.totalAmount.toFixed(2),
    `"${doc.metadata.status}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportDocumentItemsToCSV(doc: DocumentData) {
  const headers = ['Item Description', 'Qty', 'Unit Price', 'Tax Type', 'Tax Amount', 'Discount', 'Total (KES)'];
  const rows = doc.items.map(i => [
    `"${i.item.replace(/"/g, '""')}"`,
    i.qty.toFixed(2),
    i.price.toFixed(2),
    `"${i.taxType}"`,
    i.taxAmount.toFixed(2),
    i.discount.toFixed(2),
    i.total.toFixed(2)
  ]);

  rows.push([]);
  rows.push(['Subtotal (Taxable Amount)', '', '', '', '', '', doc.subtotal.toFixed(2)]);
  rows.push(['Total VAT', '', '', '', '', '', doc.totalVat.toFixed(2)]);
  rows.push(['Total Discount', '', '', '', '', '', doc.totalDiscount.toFixed(2)]);
  rows.push(['TOTAL AMOUNT', '', '', '', '', '', doc.totalAmount.toFixed(2)]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `${doc.metadata.docType}_${doc.metadata.invoiceNo.replace(/[^a-zA-Z0-9]/g, '_')}_items.csv`;
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function generateEscPosPlainText(doc: DocumentData): string {
  const line = '------------------------------------------';
  const center = (str: string, width = 42) => {
    const pad = Math.max(0, Math.floor((width - str.length) / 2));
    return ' '.repeat(pad) + str;
  };

  const padRight = (str: string, len: number) => (str + ' '.repeat(len)).slice(0, len);
  const padLeft = (str: string, len: number) => (' '.repeat(len) + str).slice(-len);

  let text = '';
  text += center(doc.seller.name.toUpperCase()) + '\n';
  if (doc.seller.subName) text += center(doc.seller.subName.toUpperCase()) + '\n';
  text += center(`PIN: ${doc.seller.pin}`) + '\n';
  text += center(doc.seller.address) + '\n';
  text += center(doc.seller.email) + '\n';
  text += line + '\n';
  
  const title = doc.metadata.docType.replace('_', ' ');
  text += center(`*** ${title} ***`) + '\n';
  text += `Date: ${doc.metadata.createdAt}\n`;
  text += `Doc No: ${doc.metadata.invoiceNo}   Store ID: ${doc.metadata.scuId}\n`;
  text += `Ref No: ${doc.metadata.cuInvoiceNumber}\n`;
  text += `Receipt Sig: ${doc.metadata.receiptSignature}\n`;
  text += line + '\n';

  text += `BUYER: ${doc.buyer.name}\n`;
  if (doc.buyer.pin) text += `PIN: ${doc.buyer.pin}\n`;
  if (doc.buyer.phone) text += `Phone: ${doc.buyer.phone}\n`;
  text += line + '\n';

  text += `${padRight('ITEM', 22)}${padLeft('QTY', 5)}${padLeft('PRICE', 7)}${padLeft('TOTAL', 8)}\n`;
  text += line + '\n';

  doc.items.forEach(item => {
    text += `${item.item.slice(0, 40)}\n`;
    text += `${padRight('  [' + item.taxType + ']', 18)}${padLeft(item.qty.toFixed(2), 6)}${padLeft(formatCurrency(item.price), 9)}${padLeft(formatCurrency(item.total), 9)}\n`;
  });

  text += line + '\n';
  text += `${padRight('Taxable Subtotal:', 28)}${padLeft(formatCurrency(doc.subtotal), 14)}\n`;
  text += `${padRight('Total VAT:', 28)}${padLeft(formatCurrency(doc.totalVat), 14)}\n`;
  if (doc.totalDiscount > 0) {
    text += `${padRight('Total Discount:', 28)}${padLeft(formatCurrency(doc.totalDiscount), 14)}\n`;
  }
  text += line + '\n';
  text += `${padRight('TOTAL (' + doc.currency + '):', 26)}${padLeft(formatCurrency(doc.totalAmount), 16)}\n`;
  text += line + '\n';

  text += `Payment: ${doc.metadata.paymentMethod.toUpperCase()}\n`;
  if (doc.metadata.paymentReference) {
    text += `Ref: ${doc.metadata.paymentReference}\n`;
  }

  text += '\n';
  text += center('THIS IS A VALID COMPUTER-GENERATED DOCUMENT') + '\n';
  text += '\n\n\n';

  return text;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
