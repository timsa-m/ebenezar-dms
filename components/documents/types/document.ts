export type DocumentType = 
  | 'TAX_INVOICE' 
  | 'PAYMENT_RECEIPT' 
  | 'PROFORMA_INVOICE' 
  | 'CREDIT_NOTE';

export type TaxRateType = 
  | 'B VAT 16%' 
  | 'A Exempt' 
  | 'E Zero Rated' 
  | 'C VAT 8%';

export interface LineItem {
  id: string;
  item: string;
  qty: number;
  price: number; // Unit price (tax inclusive)
  taxType: TaxRateType;
  taxRate: number; // percentage (16, 0, 8)
  discount: number;
  total: number;
  taxAmount: number;
  taxableAmount: number;
}

export interface TaxBreakdown {
  rate: TaxRateType;
  taxRate: number;
  taxableAmount: number;
  vatAmount: number;
}

export interface SellerDetails {
  name: string;
  subName?: string;
  pin: string;
  email: string;
  address: string;
  phone?: string;
  logoUrl?: string;
}

export interface BuyerDetails {
  name: string;
  pin?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface DocumentMetadata {
  id: string;
  docType: DocumentType;
  invoiceNo: string;
  scuId: string;
  receiptSignature: string;
  cuInvoiceNumber: string;
  createdAt: string; // YYYY-MM-DD HH:mm:ss
  paymentMethod: string;
  paymentReference?: string;
  termsAndConditions?: string;
  note?: string;
  status: 'ISSUED' | 'PAID' | 'VOID';
}

export interface DocumentData {
  metadata: DocumentMetadata;
  seller: SellerDetails;
  buyer: BuyerDetails;
  currency: string;
  items: LineItem[];
  subtotal: number;
  totalVat: number;
  totalDiscount: number;
  totalAmount: number;
  taxBreakdowns: TaxBreakdown[];
}

export interface DateFilterRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  preset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';
}
