"use server";

import { createAdminClient } from '@/src/lib/supabase/admin';
import type { DocumentData, LineItem, TaxBreakdown } from './types/document';

export async function getDocumentTransactions(): Promise<DocumentData[]> {
  const supabase = createAdminClient();
  const docs: DocumentData[] = [];

  // 1. Fetch Repayments (Receipts)
  const { data: repayments, error: repErr } = await supabase
    .from('repayments')
    .select(`
      *,
      agreement:financing_agreements(
        *,
        client:clients(*),
        vehicle:vehicles(*)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!repErr && repayments) {
    for (const r of repayments) {
      if (!r.agreement || !r.agreement.client) continue;

      const client = r.agreement.client;
      const vehicle = r.agreement.vehicle;
      const amount = Number(r.amount_paid) || 0;

      const items: LineItem[] = [{
        id: `item-${r.id}`,
        item: `Payment against Contract ${r.agreement.contract_number || r.agreement.id.slice(0,8)}${vehicle ? ` - ${vehicle.make_model} (${vehicle.registration_no})` : ''}`,
        qty: 1,
        price: amount,
        taxType: 'A Exempt',
        taxRate: 0,
        discount: 0,
        total: amount,
        taxAmount: 0,
        taxableAmount: amount
      }];

      docs.push({
        metadata: {
          id: r.id,
          docType: 'PAYMENT_RECEIPT',
          invoiceNo: r.receipt_no || `REC-${r.id.slice(0, 6).toUpperCase()}`,
          scuId: 'SCU-EBENEZAR-01',
          receiptSignature: r.id.replace(/-/g, '').slice(0, 16).toUpperCase(),
          cuInvoiceNumber: `KRA-${r.id.slice(0, 8).toUpperCase()}`,
          createdAt: new Date(r.payment_date || r.created_at).toISOString().replace('T', ' ').slice(0, 19),
          paymentMethod: r.payment_method || 'Bank Transfer',
          paymentReference: r.reference_no || '',
          status: 'PAID',
          note: r.notes || ''
        },
        seller: {
          name: 'Ebenezar Car Bazaar',
          pin: 'P051610427Q',
          email: 'sales@ebenezarcarbazaar.co.ke',
          address: 'Jamhuri, Ngong Road, Nairobi',
          phone: '+254 722 000 000',
          logoUrl: '/icons/logo.svg'
        },
        buyer: {
          name: client.full_name,
          pin: client.client_id_number,
          email: client.email || '',
          phone: client.phone || '',
        },
        currency: 'KES',
        items,
        subtotal: amount,
        totalVat: 0,
        totalDiscount: 0,
        totalAmount: amount,
        taxBreakdowns: [{
          rate: 'A Exempt',
          taxRate: 0,
          taxableAmount: amount,
          vatAmount: 0
        }]
      });
    }
  }

  // 2. Fetch Financing Agreements (Invoices)
  const { data: agreements, error: agrErr } = await supabase
    .from('financing_agreements')
    .select(`
      *,
      client:clients(*),
      vehicle:vehicles(*)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!agrErr && agreements) {
    for (const a of agreements) {
      if (!a.client) continue;

      const client = a.client;
      const vehicle = a.vehicle;
      const amount = Number(a.total_amount) || 0;

      const items: LineItem[] = [];
      if (vehicle) {
        items.push({
          id: `veh-${vehicle.id}`,
          item: `Vehicle Purchase: ${vehicle.make_model} (${vehicle.registration_no})`,
          qty: 1,
          price: Number(vehicle.sale_price) || amount,
          taxType: 'B VAT 16%',
          taxRate: 16,
          discount: 0,
          total: Number(vehicle.sale_price) || amount,
          taxAmount: (Number(vehicle.sale_price) || amount) * 0.16,
          taxableAmount: Number(vehicle.sale_price) || amount
        });
      } else {
        items.push({
          id: `item-${a.id}`,
          item: `Financing Contract ${a.contract_number || a.id.slice(0,8)}`,
          qty: 1,
          price: amount,
          taxType: 'B VAT 16%',
          taxRate: 16,
          discount: 0,
          total: amount,
          taxAmount: amount * 0.16,
          taxableAmount: amount
        });
      }

      const totalItemsPrice = items.reduce((sum, item) => sum + item.total, 0);
      const totalVat = items.reduce((sum, item) => sum + item.taxAmount, 0);

      docs.push({
        metadata: {
          id: a.id,
          docType: 'TAX_INVOICE',
          invoiceNo: a.contract_number || `INV-${a.id.slice(0, 6).toUpperCase()}`,
          scuId: 'SCU-EBENEZAR-01',
          receiptSignature: a.id.replace(/-/g, '').slice(0, 16).toUpperCase(),
          cuInvoiceNumber: `KRA-${a.id.slice(0, 8).toUpperCase()}`,
          createdAt: new Date(a.created_at).toISOString().replace('T', ' ').slice(0, 19),
          paymentMethod: 'Financing',
          status: a.status === 'ACTIVE' ? 'ISSUED' : 'PAID',
          note: a.notes || 'Vehicle financing agreement'
        },
        seller: {
          name: 'Ebenezar Car Bazaar',
          pin: 'P051610427Q',
          email: 'sales@ebenezarcarbazaar.co.ke',
          address: 'Jamhuri, Ngong Road, Nairobi',
          phone: '+254 722 000 000',
          logoUrl: '/icons/logo.svg'
        },
        buyer: {
          name: client.full_name,
          pin: client.client_id_number,
          email: client.email || '',
          phone: client.phone || '',
        },
        currency: 'KES',
        items,
        subtotal: totalItemsPrice - totalVat,
        totalVat: totalVat,
        totalDiscount: 0,
        totalAmount: totalItemsPrice,
        taxBreakdowns: [{
          rate: 'B VAT 16%',
          taxRate: 16,
          taxableAmount: totalItemsPrice - totalVat,
          vatAmount: totalVat
        }]
      });
    }
  }

  // Sort by date descending
  return docs.sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime());
}
