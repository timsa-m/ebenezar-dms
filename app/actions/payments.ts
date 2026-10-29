"use server";

import { createAdminClient } from '@/src/lib/supabase/admin';
import { allocateRepayment, calculateBalance } from '@/src/lib/financial-engine';
import { revalidatePath } from 'next/cache';
import type { PaymentMethod, AgreementStatus } from '@/src/types/database.types';

export interface RecordPaymentInput {
  agreementId: string;
  receiptNo?: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  referenceNo?: string;
  notes?: string;
}

/**
 * Server Action: Repayment Recorder & Balance Reconciler
 * - Enforces Payment Waterfall: Outstanding Penalties -> Overdue Interest -> Principal
 * - Maintains Invariant: balance = sale_price - total_paid
 * - Updates status to 'completed' when balance <= 0
 */
export async function recordPayment(params: RecordPaymentInput) {
  try {
    const {
      agreementId,
      amountPaid,
      paymentMethod,
      paymentDate = new Date().toISOString().split('T')[0],
      referenceNo,
      notes,
    } = params;

    if (!agreementId) {
      return { success: false, error: 'Financing agreement ID is required.' };
    }

    if (!amountPaid || amountPaid <= 0) {
      return { success: false, error: 'Repayment amount must be greater than zero.' };
    }

    const supabase = createAdminClient();

    // 1. Fetch current agreement details
    const { data: agreement, error: aErr } = await supabase
      .from('financing_agreements')
      .select('*')
      .eq('id', agreementId)
      .single();

    if (aErr || !agreement) {
      return { success: false, error: 'Financing agreement not found.' };
    }

    // 2. Fetch all prior repayments to accurately calculate cumulative total paid and waived
    const { data: prevPayments, error: pErr } = await supabase
      .from('repayments')
      .select('amount_paid, payment_method')
      .eq('agreement_id', agreementId);

    if (pErr) {
      console.warn('[recordPayment] Error fetching prior repayments:', pErr);
    }

    const prevCashTotal = (prevPayments || [])
      .filter((p: any) => (p.payment_method || '').toLowerCase() !== 'waiver')
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

    const prevWaivedTotal = (prevPayments || [])
      .filter((p: any) => (p.payment_method || '').toLowerCase() === 'waiver')
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

    const isThisWaiver = (paymentMethod || '').toLowerCase() === 'waiver';
    const newTotalPaid = isThisWaiver ? prevCashTotal : prevCashTotal + Number(amountPaid);
    const newTotalWaived = isThisWaiver ? prevWaivedTotal + Number(amountPaid) : prevWaivedTotal;

    // 3. Apply Payment Waterfall
    const outstandingPenalties = Number(agreement.total_penalties) || 0;
    const currentPrincipalBalance = Number(agreement.balance) || 0;

    const waterfall = allocateRepayment({
      paymentAmount: Number(amountPaid),
      outstandingPenalties,
      overdueInterest: 0,
      currentPrincipalBalance,
    });

    // 4. Generate Receipt Number if not provided
    const receiptNo =
      params.receiptNo && params.receiptNo.trim()
        ? params.receiptNo.trim().toUpperCase()
        : `REC-${Date.now().toString().slice(-6)}`;

    // 5. Insert repayment record
    const { data: receipt, error: rErr } = await supabase
      .from('repayments')
      .insert({
        receipt_no: receiptNo,
        agreement_id: agreementId,
        client_id: agreement.client_id,
        amount_paid: Number(amountPaid),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        penalty_amount: 0,
        allocated_penalties: waterfall.allocatedPenalties,
        allocated_overdue_interest: waterfall.allocatedOverdueInterest,
        allocated_principal: waterfall.allocatedPrincipal,
        reference_no: referenceNo ? referenceNo.trim().toUpperCase() : null,
        notes: notes ? notes.trim() : null,
      })
      .select()
      .single();

    if (rErr) {
      console.error('[recordPayment] Repayment insert error:', rErr);
      throw rErr;
    }

    // 6. Balance Reconciliation: Balance = Sale Price - Total Paid - Total Waived
    const newBalance = calculateBalance(agreement.sale_price, newTotalPaid, newTotalWaived);
    const newStatus: AgreementStatus = newBalance <= 0 ? 'completed' : agreement.status;

    // 7. Update agreement state
    const { error: uErr } = await supabase
      .from('financing_agreements')
      .update({
        balance: newBalance,
        status: newStatus,
        total_penalties: waterfall.newPenaltiesBalance,
        last_payment_date: paymentDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agreementId);

    if (uErr) {
      console.error('[recordPayment] Agreement update error:', uErr);
      throw uErr;
    }

    // Keep synced loans table in sync if present
    await supabase
      .from('loans')
      .update({
        balance: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agreementId);

    // 8. Revalidate routes
    revalidatePath('/admin/contracts');
    revalidatePath('/dashboard');
    revalidatePath('/clients');

    return {
      success: true,
      receipt,
      newBalance,
      waterfall,
    };
  } catch (err: any) {
    console.error('[recordPayment] Error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to record repayment receipt.',
    };
  }
}
