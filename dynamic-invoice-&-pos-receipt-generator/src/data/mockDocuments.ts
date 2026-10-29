import { DocumentData } from '../types/document';
import { calculateDocumentTotals } from '../utils/taxCalculator';

// 1. EXACT REPLICA OF USER'S DOCUMENT
const doc1Calculations = calculateDocumentTotals([
  {
    id: 'item-1',
    item: 'TOYOTA KBP115P 1',
    qty: 1.0,
    price: 10000.0,
    taxType: 'B VAT 16%',
    taxRate: 16,
    discount: 0.0,
    total: 10000.0,
    taxAmount: 1379.31,
    taxableAmount: 8620.69,
  },
]);

export const ORIGINAL_EBENEZAR_INVOICE: DocumentData = {
  metadata: {
    id: 'doc-001',
    docType: 'TAX_INVOICE',
    invoiceNo: '1',
    scuId: 'STR-000437570',
    receiptSignature: 'HFHA000013',
    cuInvoiceNumber: 'REF-1',
    createdAt: '2026-09-30 09:28:39',
    paymentMethod: 'mpesa',
    paymentReference: 'QKD72847291',
    termsAndConditions: '',
    note: '',
    status: 'ISSUED',
  },
  seller: {
    name: 'Ebenezar enterprises',
    subName: 'limited',
    pin: 'P051642988V',
    email: 'ebenezarenterprisesltd@gmail.com',
    address: '1282, 40100, Kisumu, Kenya',
    phone: '+254722000000',
  },
  buyer: {
    name: 'HEZRON OPIYO',
    pin: '',
    email: 'hezronopiyo@gmail.com',
    phone: '+254701681401',
  },
  currency: 'KES',
  items: doc1Calculations.items,
  subtotal: doc1Calculations.subtotal,
  totalVat: doc1Calculations.totalVat,
  totalDiscount: doc1Calculations.totalDiscount,
  totalAmount: doc1Calculations.totalAmount,
  taxBreakdowns: doc1Calculations.taxBreakdowns,
};

// 2. PAYMENT RECEIPT PRESET (Supermarket / Quick Mart POS)
const doc2Items = [
  {
    id: 'item-2-1',
    item: 'FRESH MILK 500ML POUCH',
    qty: 2.0,
    price: 65.0,
    taxType: 'E Zero Rated' as const,
    taxRate: 0,
    discount: 0.0,
    total: 130.0,
    taxAmount: 0,
    taxableAmount: 130.0,
  },
  {
    id: 'item-2-2',
    item: 'BAKER\'S CHOICE WHITE BREAD 400G',
    qty: 1.0,
    price: 70.0,
    taxType: 'E Zero Rated' as const,
    taxRate: 0,
    discount: 0.0,
    total: 70.0,
    taxAmount: 0,
    taxableAmount: 70.0,
  },
  {
    id: 'item-2-3',
    item: 'MULTI-SURFACE DISINFECTANT 750ML',
    qty: 1.0,
    price: 450.0,
    taxType: 'B VAT 16%' as const,
    taxRate: 16,
    discount: 20.0,
    total: 430.0,
    taxAmount: 59.31,
    taxableAmount: 370.69,
  },
];
const doc2Calc = calculateDocumentTotals(doc2Items);

export const SUPERMARKET_RECEIPT: DocumentData = {
  metadata: {
    id: 'doc-002',
    docType: 'PAYMENT_RECEIPT',
    invoiceNo: '1042',
    scuId: 'STR-000918231',
    receiptSignature: 'TRX99281744',
    cuInvoiceNumber: 'REF-1042',
    createdAt: '2026-10-04 14:15:22',
    paymentMethod: 'mpesa',
    paymentReference: 'RK89102948',
    termsAndConditions: 'Goods once sold cannot be returned without original receipt within 48 hours.',
    note: 'Thank you for shopping with us! Till: 489210',
    status: 'PAID',
  },
  seller: {
    name: 'NAIVASHA METRO SUPERMARKET',
    subName: 'KENYA LTD',
    pin: 'P051283991K',
    email: 'customercare@naivashametro.co.ke',
    address: 'Plaza Wing, Moi Avenue, Nairobi, Kenya',
    phone: '+254711902030',
  },
  buyer: {
    name: 'WALK-IN CUSTOMER (MARY WANJIKU)',
    pin: 'A009182746Z',
    email: 'wanjiku.m@gmail.com',
    phone: '+254712345678',
  },
  currency: 'KES',
  items: doc2Calc.items,
  subtotal: doc2Calc.subtotal,
  totalVat: doc2Calc.totalVat,
  totalDiscount: doc2Calc.totalDiscount,
  totalAmount: doc2Calc.totalAmount,
  taxBreakdowns: doc2Calc.taxBreakdowns,
};

// 3. HARDWARE & CONSTRUCTION INVOICE
const doc3Items = [
  {
    id: 'item-3-1',
    item: 'BAMBURI CEMENT CEMEX 50KG',
    qty: 20.0,
    price: 850.0,
    taxType: 'B VAT 16%' as const,
    taxRate: 16,
    discount: 500.0,
    total: 16500.0,
    taxAmount: 2275.86,
    taxableAmount: 14224.14,
  },
  {
    id: 'item-3-2',
    item: 'DEFORMED REBAR Y12 12M STEEL',
    qty: 15.0,
    price: 1420.0,
    taxType: 'B VAT 16%' as const,
    taxRate: 16,
    discount: 0.0,
    total: 21300.0,
    taxAmount: 2937.93,
    taxableAmount: 18362.07,
  },
];
const doc3Calc = calculateDocumentTotals(doc3Items);

export const HARDWARE_INVOICE: DocumentData = {
  metadata: {
    id: 'doc-003',
    docType: 'TAX_INVOICE',
    invoiceNo: '582',
    scuId: 'STR-000182736',
    receiptSignature: 'KJ99281726',
    cuInvoiceNumber: 'REF-582',
    createdAt: '2026-10-05 08:45:10',
    paymentMethod: 'bank_transfer',
    paymentReference: 'KCB-FT-99182',
    termsAndConditions: 'Payment due within 30 days of invoice issuance.',
    note: 'Site Delivery to Milimani Estate Site B',
    status: 'ISSUED',
  },
  seller: {
    name: 'SIMBA HARDWARE & BUILDING SUPPLIES',
    subName: 'LIMITED',
    pin: 'P051992837L',
    email: 'accounts@simbahardware.co.ke',
    address: 'Plot 44, Commercial Street, Industrial Area, Nairobi',
    phone: '+254720998877',
  },
  buyer: {
    name: 'KILIFI PRIME CONSTRUCTIONS LTD',
    pin: 'P051876543W',
    email: 'procurement@kilifiprime.co.ke',
    phone: '+254733445566',
  },
  currency: 'KES',
  items: doc3Calc.items,
  subtotal: doc3Calc.subtotal,
  totalVat: doc3Calc.totalVat,
  totalDiscount: doc3Calc.totalDiscount,
  totalAmount: doc3Calc.totalAmount,
  taxBreakdowns: doc3Calc.taxBreakdowns,
};

// 4. RESTAURANT / CAFE BILL (Payment Receipt)
const doc4Items = [
  {
    id: 'item-4-1',
    item: 'GRILLED CHICKEN BREAST & ROASTED HERBS',
    qty: 2.0,
    price: 1200.0,
    taxType: 'B VAT 16%' as const,
    taxRate: 16,
    discount: 0.0,
    total: 2400.0,
    taxAmount: 331.03,
    taxableAmount: 2068.97,
  },
  {
    id: 'item-4-2',
    item: 'FRESH PASSION FRUIT JUICE 500ML',
    qty: 2.0,
    price: 350.0,
    taxType: 'B VAT 16%' as const,
    taxRate: 16,
    discount: 0.0,
    total: 700.0,
    taxAmount: 96.55,
    taxableAmount: 603.45,
  },
  {
    id: 'item-4-3',
    item: 'CAPPUCCINO DOUBLE SHOT',
    qty: 1.0,
    price: 380.0,
    taxType: 'B VAT 16%' as const,
    taxRate: 16,
    discount: 0.0,
    total: 380.0,
    taxAmount: 52.41,
    taxableAmount: 327.59,
  },
];
const doc4Calc = calculateDocumentTotals(doc4Items);

export const RESTAURANT_RECEIPT: DocumentData = {
  metadata: {
    id: 'doc-004',
    docType: 'PAYMENT_RECEIPT',
    invoiceNo: '309',
    scuId: 'STR-000371928',
    receiptSignature: 'NV99182341',
    cuInvoiceNumber: 'REF-309',
    createdAt: '2026-10-02 20:12:05',
    paymentMethod: 'mpesa',
    paymentReference: 'QPL9102934',
    termsAndConditions: 'All prices are VAT and Tourism Levy inclusive.',
    note: 'Table 7 - Server: Kevin O.',
    status: 'PAID',
  },
  seller: {
    name: 'SAVANNAH ROASTERS BISTRO & LOUNGE',
    subName: 'KENYA',
    pin: 'P051443219T',
    email: 'info@savannahroasters.co.ke',
    address: 'The Hub Karen, Dagoretti Road, Nairobi',
    phone: '+254799112233',
  },
  buyer: {
    name: 'DR. DANIEL KIPRUTO',
    pin: 'A003456789R',
    email: 'daniel.kipruto@hospital.org',
    phone: '+254710556677',
  },
  currency: 'KES',
  items: doc4Calc.items,
  subtotal: doc4Calc.subtotal,
  totalVat: doc4Calc.totalVat,
  totalDiscount: doc4Calc.totalDiscount,
  totalAmount: doc4Calc.totalAmount,
  taxBreakdowns: doc4Calc.taxBreakdowns,
};

// 5. CREDIT NOTE PRESET
const doc5Items = [
  {
    id: 'item-5-1',
    item: 'DEFECTIVE BRAKE PADS RETURN - REPAIR OFFSET',
    qty: 1.0,
    price: 3500.0,
    taxType: 'B VAT 16%' as const,
    taxRate: 16,
    discount: 0.0,
    total: 3500.0,
    taxAmount: 482.76,
    taxableAmount: 3017.24,
  },
];
const doc5Calc = calculateDocumentTotals(doc5Items);

export const SAMPLE_CREDIT_NOTE: DocumentData = {
  metadata: {
    id: 'doc-005',
    docType: 'CREDIT_NOTE',
    invoiceNo: 'CN-14',
    scuId: 'STR-000437570',
    receiptSignature: 'CNHF992104',
    cuInvoiceNumber: 'REF-CN14',
    createdAt: '2026-10-01 11:30:00',
    paymentMethod: 'credit_adjustment',
    paymentReference: 'ORIG-INV-001',
    termsAndConditions: 'Credit note issued against original invoice REF-1 for defective warranty item.',
    note: 'Authorized by Service Manager',
    status: 'ISSUED',
  },
  seller: {
    name: 'Ebenezar enterprises',
    subName: 'limited',
    pin: 'P051642988V',
    email: 'ebenezarenterprisesltd@gmail.com',
    address: '1282, 40100, Kisumu, Kenya',
    phone: '+254722000000',
  },
  buyer: {
    name: 'HEZRON OPIYO',
    pin: '',
    email: 'hezronopiyo@gmail.com',
    phone: '+254701681401',
  },
  currency: 'KES',
  items: doc5Calc.items,
  subtotal: doc5Calc.subtotal,
  totalVat: doc5Calc.totalVat,
  totalDiscount: doc5Calc.totalDiscount,
  totalAmount: doc5Calc.totalAmount,
  taxBreakdowns: doc5Calc.taxBreakdowns,
};

export const INITIAL_DOCUMENTS: DocumentData[] = [
  ORIGINAL_EBENEZAR_INVOICE,
  SUPERMARKET_RECEIPT,
  HARDWARE_INVOICE,
  RESTAURANT_RECEIPT,
  SAMPLE_CREDIT_NOTE,
];
