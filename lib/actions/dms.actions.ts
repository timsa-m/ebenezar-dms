"use server";

import { createAdminClient } from '@/src/lib/supabase/admin';
import { allocateRepayment, calculateBalance, classifyDelinquency } from '@/src/lib/financial-engine';
import { revalidatePath } from 'next/cache';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { logAuditEvent } from '@/lib/actions/audit.actions';
import type {
  FinancingAgreement,
  RepaymentRecord,
  PaymentMethod,
  AgreementStatus,
} from '@/src/types/database.types';

export interface AgreementWithDetails extends FinancingAgreement {
  client?: {
    id: string;
    full_name: string;
    phone: string;
    client_id_number: string;
    email?: string | null;
    notes?: string | null;
  };
  vehicle?: {
    id: string;
    registration_no: string;
    make_model: string;
    sale_price: number;
    year?: number | null;
    color?: string | null;
    mileage?: number | null;
    engine_capacity?: string | null;
    transmission?: string | null;
    fuel_type?: string | null;
    chassis_no?: string | null;
    engine_no?: string | null;
  };
  total_paid?: number;
}

export async function getFinancingAgreements(): Promise<AgreementWithDetails[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('financing_agreements')
    .select(`
      *,
      client:clients(id, full_name, phone, client_id_number, email, notes),
      vehicle:vehicles(id, registration_no, make_model, sale_price, year, color, mileage, engine_capacity, transmission, fuel_type, chassis_no, engine_no)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getFinancingAgreements] Error:', error);
    return [];
  }

  return (data || []) as AgreementWithDetails[];
}

export async function getFinancingAgreementById(id: string): Promise<AgreementWithDetails | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('financing_agreements')
    .select(`
      *,
      client:clients(id, full_name, phone, client_id_number, email, notes),
      vehicle:vehicles(id, registration_no, make_model, sale_price, year, color, mileage, engine_capacity, transmission, fuel_type, chassis_no, engine_no)
    `)
    .eq('id', id)
    .maybeSingle();
    
  if (error || !data) return null;
  return data as AgreementWithDetails;
}

export async function getRepaymentsByAgreement(agreementId: string): Promise<any[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('repayments')
    .select('*')
    .eq('agreement_id', agreementId)
    .order('payment_date', { ascending: false });
    
  if (error || !data) return [];
  
  // Map to LoanTransaction format for the UI
  return data.map((r: any) => ({
    $id: r.id,
    loanId: r.agreement_id,
    clientId: r.client_id,
    amount: r.amount_paid,
    type: (r.payment_method || '').toLowerCase() === 'waiver' ? 'Waiver' : 'Repayment',
    paymentMethod: r.payment_method,
    referenceId: r.reference_no,
    comment: r.notes,
    status: 'Active',
    allocatedFees: 0,
    allocatedPenalties: r.allocated_penalties || 0,
    allocatedOverdueInterest: r.allocated_overdue_interest || 0,
    allocatedCurrentInterest: 0,
    allocatedOverduePrincipal: 0,
    allocatedCurrentPrincipal: r.allocated_principal || 0,
    allocatedToWallet: 0,
    date: r.payment_date,
    createdAt: r.created_at,
  }));
}

export async function getInstallmentsByAgreement(agreementId: string): Promise<any[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('financing_installments')
    .select('*')
    .eq('agreement_id', agreementId)
    .order('installment_number', { ascending: true });
    
  if (!error && data && data.length > 0) {
    // Map to LoanInstallment format for the UI
    return data.map((i: any) => ({
      $id: i.id,
      loanId: i.agreement_id,
      clientId: i.client_id,
      installmentNumber: i.installment_number,
      dueDate: i.due_date,
      principalDue: Number(i.principal_due || 0),
      interestDue: Number(i.interest_due || 0),
      feesDue: Number(i.fees_due || 0),
      penaltiesDue: Number(i.penalties_due || 0),
      principalPaid: Number(i.principal_paid || 0),
      interestPaid: Number(i.interest_paid || 0),
      feesPaid: Number(i.fees_paid || 0),
      penaltiesPaid: Number(i.penalties_paid || 0),
      amountDue: Number(i.amount_due || 0),
      amountPaid: Number(i.amount_paid || 0),
      isSettled: Boolean(i.is_settled),
      status: i.status,
      paidDate: i.paid_date,
      createdAt: i.created_at,
    }));
  }

  // Fallback to loan_installments for legacy or alternate records
  const { data: legacyData } = await supabase
    .from('loan_installments')
    .select('*')
    .eq('loan_id', agreementId)
    .order('installment_number', { ascending: true });

  if (legacyData && legacyData.length > 0) {
    return legacyData.map((i: any) => ({
      $id: i.id,
      loanId: i.loan_id,
      clientId: i.client_id,
      installmentNumber: i.installment_number,
      dueDate: i.due_date,
      principalDue: Number(i.principal_due || 0),
      interestDue: Number(i.interest_due || 0),
      feesDue: Number(i.fees_due || 0),
      penaltiesDue: Number(i.penalties_due || 0),
      principalPaid: Number(i.principal_paid || 0),
      interestPaid: Number(i.interest_paid || 0),
      feesPaid: Number(i.fees_paid || 0),
      penaltiesPaid: Number(i.penalties_paid || 0),
      amountDue: Number(i.amount_due || 0),
      amountPaid: Number(i.amount_paid || 0),
      isSettled: Boolean(i.is_settled),
      status: i.status,
      paidDate: i.paid_date,
      createdAt: i.created_at,
    }));
  }

  return [];
}

export interface CreateAgreementParams {
  clientId: string;
  vehicleId: string;
  salePrice: number;
  depositPaid: number;
  monthlyDue: number;
  interestRate?: number;
  durationMonths?: number;
  startDate?: string;
  endDate?: string;
  comment?: string;
}

export async function createFinancingAgreement(params: CreateAgreementParams) {
  try {
    const supabase = createAdminClient();

    // 1. Fetch vehicle registration to construct contract_no
    const { data: vehicle, error: vErr } = await supabase
      .from('vehicles')
      .select('registration_no')
      .eq('id', params.vehicleId)
      .single();

    if (vErr || !vehicle) throw new Error('Selected vehicle not found.');

    const timestamp = Date.now().toString().slice(-4);
    const contractNo = `AGR-${vehicle.registration_no}-${timestamp}`;
    const principalAmount = params.salePrice - (params.depositPaid || 0);

    // Initial balance: Sale Price - Deposit Paid
    const initialBalance = calculateBalance(params.salePrice, params.depositPaid || 0);

    const durationMonths = params.durationMonths !== undefined && params.durationMonths !== null ? Number(params.durationMonths) : 12;
    const startDateStr = params.startDate || new Date().toISOString().split('T')[0];
    let endDateStr = params.endDate;
    if (!endDateStr && durationMonths > 0) {
      const endDt = new Date(startDateStr);
      endDt.setMonth(endDt.getMonth() + durationMonths);
      endDateStr = endDt.toISOString().split('T')[0];
    } else if (!endDateStr && durationMonths === 0) {
      endDateStr = startDateStr;
    }

    const { data: agreement, error: aErr } = await supabase
      .from('financing_agreements')
      .insert({
        contract_no: contractNo,
        client_id: params.clientId,
        vehicle_id: params.vehicleId,
        sale_price: Number(params.salePrice),
        deposit_paid: Number(params.depositPaid) || 0,
        principal_amount: principalAmount,
        monthly_due: Number(params.monthlyDue),
        interest_rate: 0,
        duration_months: durationMonths,
        start_date: startDateStr,
        end_date: endDateStr,
        balance: initialBalance,
        status: initialBalance <= 0 ? 'completed' : 'active',
        aging_bucket: '0-30 Days',
        days_overdue: 0,
        total_penalties: 0,
        comment: params.comment || null,
      })
      .select()
      .single();

    if (aErr) throw aErr;

    // 2. Transactional Delist: Delist car from public catalog & mark financed/cash_sale
    await supabase
      .from('vehicles')
      .update({
        status: initialBalance <= 0 ? 'cash_sale' : 'financed',
        is_published: false,
        date_sold: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.vehicleId);

    // 3. Generate Installments (if balance > 0)
    if (initialBalance > 0 && params.durationMonths) {
      const installments = [];
      const startDate = params.startDate ? new Date(params.startDate) : new Date();
      
      const principalPerMonth = principalAmount / params.durationMonths;
      const interestAmount = 0;
      const interestPerMonth = 0;

      for (let i = 1; i <= params.durationMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);

        let p_due = Math.round(principalPerMonth * 100) / 100;
        let i_due = 0;

        // adjust the last installment to avoid rounding errors
        if (i === params.durationMonths) {
          p_due = principalAmount - (Math.round(principalPerMonth * 100) / 100 * (i - 1));
        }

        installments.push({
          agreement_id: agreement.id,
          client_id: params.clientId,
          installment_number: i,
          due_date: dueDate.toISOString(),
          principal_due: p_due,
          interest_due: i_due,
          fees_due: 0,
          penalties_due: 0,
          status: "Pending"
        });
      }

      if (installments.length > 0) {
        const { error: installmentError } = await supabase
          .from("financing_installments")
          .insert(installments);
        if (installmentError) console.error("Failed to generate installments", installmentError);
      }
    }

    revalidatePath('/admin/contracts');
    revalidatePath('/admin/inventory');
    revalidatePath('/inventory');
    return { success: true, agreement };
  } catch (err: any) {
    console.error('[createFinancingAgreement] Error:', err);
    return { success: false, error: err?.message || 'Failed to create agreement.' };
  }
}

export interface RecordRepaymentParams {
  agreementId: string;
  receiptNo?: string;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  referenceNo?: string;
  notes?: string;
}

export async function recordRepaymentReceipt(params: RecordRepaymentParams) {
  try {
    const supabase = createAdminClient();

    // 1. Fetch current agreement state
    const { data: agreement, error: aErr } = await supabase
      .from('financing_agreements')
      .select('*')
      .eq('id', params.agreementId)
      .single();

    if (aErr || !agreement) throw new Error('Financing agreement not found.');

    // 2. Fetch all previous repayments to compute total paid
    const { data: prevPayments } = await supabase
      .from('repayments')
      .select('amount_paid')
      .eq('agreement_id', params.agreementId);

    const prevTotal = (prevPayments || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const newTotalPaid = prevTotal + Number(params.amountPaid);

    // 3. Derive accurate remaining balances from installment rows (source of truth)
    const { data: allInstallments } = await supabase
      .from('financing_installments')
      .select('principal_due, principal_paid, interest_due, interest_paid, fees_due, fees_paid, penalties_due, penalties_paid, is_settled')
      .eq('agreement_id', params.agreementId);

    let realRemainingPrincipal = 0;
    let realRemainingPenalties = 0;
    if (allInstallments && allInstallments.length > 0) {
      realRemainingPrincipal = allInstallments.reduce((sum, i) =>
        sum + Math.max(0, (Number(i.principal_due) || 0) - (Number(i.principal_paid) || 0))
            + Math.max(0, (Number(i.interest_due)  || 0) - (Number(i.interest_paid)  || 0))
            + Math.max(0, (Number(i.fees_due)       || 0) - (Number(i.fees_paid)       || 0))
      , 0);
      realRemainingPenalties = allInstallments.reduce((sum, i) =>
        sum + Math.max(0, (Number(i.penalties_due) || 0) - (Number(i.penalties_paid) || 0))
      , 0);
    } else {
      // Fallback to agreement fields if no installments exist yet
      realRemainingPenalties = Number(agreement.total_penalties) || 0;
      realRemainingPrincipal = Math.max(0, (Number(agreement.balance) || 0) - realRemainingPenalties);
    }

    // Apply Payment Waterfall:
    // Payment -> Outstanding Penalties -> Overdue Interest -> Principal
    const waterfall = allocateRepayment({
      paymentAmount: Number(params.amountPaid),
      outstandingPenalties: realRemainingPenalties,
      overdueInterest: 0,
      currentPrincipalBalance: realRemainingPrincipal,
    });

    // 4. Record Repayment Ledger
    const actualReceiptNo = params.receiptNo ? params.receiptNo.trim().toUpperCase() : `RCT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    // Normalise: accept full ISO or date-only → always store as YYYY-MM-DD
    const paymentDateStr = params.paymentDate
      ? params.paymentDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    console.log('[recordRepaymentReceipt] inserting repayment', {
      agreementId: params.agreementId, amount: params.amountPaid,
      method: params.paymentMethod, date: paymentDateStr,
      instCount: allInstallments?.length ?? 0,
      realRemainingPrincipal, realRemainingPenalties,
      waterfall: { allocPrin: waterfall.allocatedPrincipal, allocPen: waterfall.allocatedPenalties },
    });
    const { data: receipt, error: rErr } = await supabase
      .from('repayments')
      .insert({
        receipt_no: actualReceiptNo,
        agreement_id: params.agreementId,
        client_id: agreement.client_id,
        amount_paid: Number(params.amountPaid),
        payment_method: params.paymentMethod,
        payment_date: paymentDateStr,
        penalty_amount: 0,
        allocated_penalties: waterfall.allocatedPenalties,
        allocated_overdue_interest: waterfall.allocatedOverdueInterest,
        allocated_principal: waterfall.allocatedPrincipal,
        reference_no: params.referenceNo ? params.referenceNo.trim() : null,
        notes: params.notes ? params.notes.trim() : null,
      })
      .select()
      .single();

    if (rErr) {
      console.error('[recordRepaymentReceipt] repayment INSERT failed:', JSON.stringify(rErr));
      throw rErr;
    }
    console.log('[recordRepaymentReceipt] repayment inserted id:', receipt.id);

    // NOTE: Agreement balance is reconciled post-cascade below (step 7).
    // The stale pre-cascade update is intentionally removed to avoid overwriting
    // the correct self-healed value.

    // 6. Cascade payment to financing_installments
    const { data: pendingInstallments } = await supabase
      .from('financing_installments')
      .select('*')
      .eq('agreement_id', params.agreementId)
      .eq('is_settled', false)
      .order('installment_number', { ascending: true });

    if (pendingInstallments && pendingInstallments.length > 0) {
      let remAmountToAlloc = waterfall.allocatedPrincipal + waterfall.allocatedOverdueInterest;
      let remPenaltiesToAlloc = waterfall.allocatedPenalties;

      for (const inst of pendingInstallments) {
        if (remAmountToAlloc <= 0 && remPenaltiesToAlloc <= 0) break;

        const instRemPenalties = Math.max(0, Number(inst.penalties_due || 0) - Number(inst.penalties_paid || 0));
        const instRemInterest  = Math.max(0, Number(inst.interest_due  || 0) - Number(inst.interest_paid  || 0));
        const instRemPrincipal = Math.max(0, Number(inst.principal_due || 0) - Number(inst.principal_paid || 0));

        const allocPen  = Math.min(remPenaltiesToAlloc, instRemPenalties);
        remPenaltiesToAlloc -= allocPen;

        const allocInt  = Math.min(remAmountToAlloc, instRemInterest);
        remAmountToAlloc -= allocInt;

        const allocPrin = Math.min(remAmountToAlloc, instRemPrincipal);
        remAmountToAlloc -= allocPrin;

        if (allocPen > 0 || allocInt > 0 || allocPrin > 0) {
          const new_penalties_paid = Number(inst.penalties_paid || 0) + allocPen;
          const new_interest_paid  = Number(inst.interest_paid  || 0) + allocInt;
          const new_principal_paid = Number(inst.principal_paid || 0) + allocPrin;
          // NOTE: amount_paid is a generated column in the DB, so we do not include it in the update payload.

          const is_settled =
            (new_principal_paid >= Number(inst.principal_due || 0)) &&
            (new_interest_paid  >= Number(inst.interest_due  || 0)) &&
            (new_penalties_paid >= Number(inst.penalties_due || 0));

          const { error: updErr } = await supabase
            .from('financing_installments')
            .update({
              penalties_paid: new_penalties_paid,
              interest_paid:  new_interest_paid,
              principal_paid: new_principal_paid,
              is_settled,
              status:    is_settled ? 'Paid' : 'Partial',
              paid_date: is_settled
                ? (params.paymentDate || new Date().toISOString().split('T')[0])
                : inst.paid_date,
            })
            .eq('id', inst.id);

          if (updErr) {
            console.error('[recordRepaymentReceipt] installment update error:', updErr);
          }
        }
      }
    }

    // 7. Self-heal: re-read all installment rows after the cascade and write a perfectly
    //    reconciled balance back to financing_agreements (eliminates drift over time).
    const { data: reconInst } = await supabase
      .from('financing_installments')
      .select('principal_due, principal_paid, interest_due, interest_paid, fees_due, fees_paid, penalties_due, penalties_paid')
      .eq('agreement_id', params.agreementId);

    let reconBalance   = 0;
    let reconPenalties = 0;
    if (reconInst && reconInst.length > 0) {
      reconBalance = reconInst.reduce((sum, i) =>
        sum
        + Math.max(0, (Number(i.principal_due) || 0) - (Number(i.principal_paid) || 0))
        + Math.max(0, (Number(i.interest_due)  || 0) - (Number(i.interest_paid)  || 0))
        + Math.max(0, (Number(i.fees_due)       || 0) - (Number(i.fees_paid)      || 0))
        + Math.max(0, (Number(i.penalties_due)  || 0) - (Number(i.penalties_paid) || 0))
      , 0);
      reconPenalties = reconInst.reduce((sum, i) =>
        sum + Math.max(0, (Number(i.penalties_due) || 0) - (Number(i.penalties_paid) || 0))
      , 0);
    } else {
      // No installments — fall back to waterfall estimate
      reconBalance   = waterfall.newPrincipalBalance + waterfall.newPenaltiesBalance;
      reconPenalties = waterfall.newPenaltiesBalance;
    }

    const reconStatus: AgreementStatus = reconBalance <= 0 ? 'completed' : agreement.status;
    await supabase
      .from('financing_agreements')
      .update({
        balance:           Math.max(0, reconBalance),
        status:            reconStatus,
        total_penalties:   reconPenalties,
        last_payment_date: params.paymentDate || new Date().toISOString().split('T')[0],
        updated_at:        new Date().toISOString(),
      })
      .eq('id', params.agreementId);

    if (reconBalance <= 0 && agreement.vehicle_id) {
      await supabase
        .from('vehicles')
        .update({ status: 'sold', updated_at: new Date().toISOString() })
        .eq('id', agreement.vehicle_id);
    }

    revalidatePath('/admin/contracts');
    revalidatePath('/dashboard');
    revalidatePath('/loans');
    revalidatePath(`/loans/${params.agreementId}`);
    revalidatePath(`/loans/${params.agreementId}/statement`);
    return { success: true, receipt, newBalance: Math.max(0, reconBalance) };
  } catch (err: any) {
    console.error('[recordRepaymentReceipt] Error:', err);
    return { success: false, error: err?.message || 'Failed to record repayment.' };
  }
}

export interface DmsExecutiveMetrics {
  totalPortfolioValue: number;
  totalCollected: number;
  totalOutstandingBalance: number;
  activeAgreementsCount: number;
  mrr: number; // Monthly Recurring Revenue / Contractual Monthly Run-Rate
  inStockCount: number;
  agingBuckets: {
    performing: { count: number; balance: number };
    earlyStage: { count: number; balance: number };
    highRisk: { count: number; balance: number };
    criticalDefault: { count: number; balance: number };
  };
  portfolioMix: {
    active: number;
    cashSales: number;
    fullyPaid: number;
    writtenOff: number;
  };
  cashFlow: Array<{ month: string; amount: number }>;
  topDebtors: Array<{
    id: string;
    contractNo: string;
    clientName: string;
    vehicleReg: string;
    balance: number;
    daysOverdue: number;
    bucket: string;
  }>;
}

export async function getDmsExecutiveSummary(): Promise<DmsExecutiveMetrics> {
  const supabase = createAdminClient();

  const [
    { data: agreements },
    { data: vehicles },
    { data: repayments },
  ] = await Promise.all([
    supabase
      .from('financing_agreements')
      .select(`
        *,
        client:clients(full_name),
        vehicle:vehicles(registration_no)
      `),
    supabase.from('vehicles').select('status'),
    supabase.from('repayments').select('amount_paid, payment_date'),
  ]);

  const agreementList = agreements || [];
  const inStockCount = (vehicles || []).filter((v) => v.status === 'in_stock').length;
  const totalCollected = (repayments || []).reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);

  let totalPortfolioValue = 0;
  let totalOutstandingBalance = 0;
  let activeAgreementsCount = 0;
  let mrr = 0;

  const buckets = {
    performing: { count: 0, balance: 0 },
    earlyStage: { count: 0, balance: 0 },
    highRisk: { count: 0, balance: 0 },
    criticalDefault: { count: 0, balance: 0 },
  };

  const portfolioMix = {
    active: 0,
    cashSales: 0,
    fullyPaid: 0,
    writtenOff: 0,
  };

  const cashFlowMap = new Map<string, number>();
  
  // Initialize last 6 months to 0
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    cashFlowMap.set(label, 0);
  }

  (repayments || []).forEach(r => {
    if (r.payment_date && r.amount_paid) {
      const d = new Date(r.payment_date);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (cashFlowMap.has(label)) {
        cashFlowMap.set(label, cashFlowMap.get(label)! + Number(r.amount_paid));
      }
    }
  });

  const cashFlow = Array.from(cashFlowMap.entries()).map(([month, amount]) => ({ month, amount }));

  const debtorList: DmsExecutiveMetrics['topDebtors'] = [];

  for (const a of agreementList) {
    totalPortfolioValue += Number(a.sale_price || 0);
    totalOutstandingBalance += Number(a.balance || 0);

    const rawStatus = (a.status || '').toLowerCase();
    const isClosed = rawStatus === 'completed' || rawStatus === 'fully paid' || rawStatus === 'written off' || rawStatus === 'written_off';
    if (!isClosed) {
      activeAgreementsCount++;
      mrr += Number(a.monthly_due || 0);
    }

    if (a.duration_months === 0 || a.sale_price === a.deposit_paid) {
      portfolioMix.cashSales++;
    } else if (rawStatus === 'completed' || rawStatus === 'fully paid') {
      portfolioMix.fullyPaid++;
    } else if (rawStatus === 'written off' || rawStatus === 'written_off') {
      portfolioMix.writtenOff++;
    } else {
      portfolioMix.active++;
    }

    const classification = classifyDelinquency(a.days_overdue || 0);
    const bal = Number(a.balance || 0);

    if (classification.bucket === '0-30 Days') {
      buckets.performing.count++;
      buckets.performing.balance += bal;
    } else if (classification.bucket === '31-60 Days') {
      buckets.earlyStage.count++;
      buckets.earlyStage.balance += bal;
    } else if (classification.bucket === '61-90 Days') {
      buckets.highRisk.count++;
      buckets.highRisk.balance += bal;
    } else {
      buckets.criticalDefault.count++;
      buckets.criticalDefault.balance += bal;
    }

    if (bal > 0) {
      debtorList.push({
        id: a.id,
        contractNo: a.contract_no,
        clientName: (a.client as any)?.full_name || 'Client',
        vehicleReg: (a.vehicle as any)?.registration_no || 'Vehicle',
        balance: bal,
        daysOverdue: a.days_overdue || 0,
        bucket: classification.bucket,
      });
    }
  }

  // Sort top debtors by highest outstanding balance
  debtorList.sort((x, y) => y.balance - x.balance);

  return {
    totalPortfolioValue,
    totalCollected,
    totalOutstandingBalance,
    activeAgreementsCount,
    mrr,
    inStockCount,
    agingBuckets: buckets,
    portfolioMix,
    cashFlow,
    topDebtors: debtorList.slice(0, 10),
  };
}

export async function updateInstallmentsBulk(updates: { id: string, principalDue: number, dueDate: string }[]) {
  try {
    const supabase = createAdminClient();
    for (const update of updates) {
      const { error } = await supabase
        .from('financing_installments')
        .update({
          principal_due: update.principalDue,
          due_date: update.dueDate
        })
        .eq('id', update.id);
      
      if (error) throw error;
    }
    revalidatePath('/admin/contracts');
    revalidatePath('/loans');
    return { success: true };
  } catch (err: any) {
    console.error('[updateInstallmentsBulk] Error:', err);
    return { success: false, error: err?.message || 'Failed to update installments.' };
  }
}

export async function createInstallmentsBulk(installments: any[]) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('financing_installments')
      .insert(installments);
    
    if (error) throw error;
    
    revalidatePath('/admin/contracts');
    revalidatePath('/loans');
    return { success: true };
  } catch (err: any) {
    console.error('[createInstallmentsBulk] Error:', err);
    return { success: false, error: err?.message || 'Failed to create installments.' };
  }
}

export async function deleteFinancingAgreement(id: string) {
  try {
    const supabase = createAdminClient();
    
    // 1. Fetch agreement to get vehicle_id before deleting
    const { data: agreement } = await supabase
      .from('financing_agreements')
      .select('vehicle_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('financing_agreements')
      .delete()
      .eq('id', id);
    if (error) throw error;

    if (agreement?.vehicle_id) {
      await supabase
        .from('vehicles')
        .update({ 
          status: 'in_stock', 
          is_published: true, 
          date_sold: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', agreement.vehicle_id);
    }
    revalidatePath('/admin/contracts');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('[deleteFinancingAgreement] Error:', err);
    return { success: false, error: err?.message || 'Failed to delete agreement.' };
  }
}

export async function writeOffAgreement(payload: { id: string; reason: string }) {
  try {
    const user = await getLoggedInUser();
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Unauthorized: Only an Admin can write off a contract.');
    }

    if (!payload.reason || payload.reason.trim().length < 10) {
      throw new Error('A detailed reason (minimum 10 characters) is required to write off a contract.');
    }

    const supabase = createAdminClient();

    // Check financing_agreements
    const { data: agreement } = await supabase
      .from('financing_agreements')
      .select('id, contract_no, balance, status, vehicle_id')
      .eq('id', payload.id)
      .maybeSingle();

    if (agreement) {
      const prevStatus = agreement.status;
      const { error: faErr } = await supabase
        .from('financing_agreements')
        .update({
          status: 'Written Off',
          aging_bucket: 'WRITTEN OFF',
          comment: payload.reason ? `[WRITTEN OFF: ${payload.reason.trim()}]` : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.id);
      if (faErr) throw faErr;

      // Keep synced loans table in sync if present
      await supabase
        .from('loans')
        .update({
          status: 'Written Off',
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.id);

      // Also record an audit log
      await logAuditEvent({
        loanId: payload.id,
        entityType: 'financing_agreement',
        action: 'STATUS_CHANGED',
        performedBy: `${user.firstName} ${user.lastName} (Admin)`,
        description: `Contract written off as accounting credit loss. Reason: ${payload.reason.trim()}`,
        previousValue: `Status: ${prevStatus}, Balance: ${agreement.balance}`,
        newValue: 'Status: Written Off, Aging: WRITTEN OFF'
      });
    } else {
      // Check loans table
      const { data: loanRecord } = await supabase
        .from('loans')
        .select('id, balance, status')
        .eq('id', payload.id)
        .maybeSingle();
      if (!loanRecord) throw new Error('Contract/Loan not found.');

      const prevStatus = loanRecord.status;
      const { error: loanErr } = await supabase
        .from('loans')
        .update({
          status: 'Written Off',
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.id);
      if (loanErr) throw loanErr;

      await logAuditEvent({
        loanId: payload.id,
        entityType: 'loan',
        action: 'STATUS_CHANGED',
        performedBy: `${user.firstName} ${user.lastName} (Admin)`,
        description: `Loan written off as accounting credit loss. Reason: ${payload.reason.trim()}`,
        previousValue: `Status: ${prevStatus}, Balance: ${loanRecord.balance}`,
        newValue: 'Status: Written Off'
      });
    }

    revalidatePath('/admin/contracts');
    revalidatePath('/loans');
    revalidatePath(`/loans/${payload.id}`);
    revalidatePath('/');
    revalidatePath('/reports/portfolio');
    revalidatePath('/reports/par');
    return { success: true };
  } catch (err: any) {
    console.error('[writeOffAgreement] Error:', err);
    return { success: false, error: err?.message || 'Failed to write off agreement.' };
  }
}

export async function applyWaiverToInstallments(
  supabase: any,
  agreementOrLoanId: string,
  amountToWaive: number,
  waiverType: string,
  isSettled: boolean
) {
  const todayStr = new Date().toISOString().split('T')[0];

  const processTable = async (tableName: string, fkColumn: string) => {
    try {
      const { data: insts } = await supabase
        .from(tableName)
        .select('*')
        .eq(fkColumn, agreementOrLoanId)
        .order('installment_number', { ascending: true });

      if (!insts || insts.length === 0) return;

      if (isSettled) {
        // Contract fully settled: mark all remaining installments as waived
        for (const inst of insts) {
          if (inst.is_settled && (Number(inst.principal_paid || 0) >= Number(inst.principal_due || 0))) continue;
          const pDue = Number(inst.principal_due || 0);
          const iDue = Number(inst.interest_due || 0);
          const fDue = Number(inst.fees_due || 0);
          const penDue = Number(inst.penalties_due || 0);
          await supabase
            .from(tableName)
            .update({
              principal_paid: pDue,
              interest_paid: iDue,
              fees_paid: fDue,
              penalties_paid: penDue,
              is_settled: true,
              status: 'Waived',
              paid_date: inst.paid_date || todayStr,
            })
            .eq('id', inst.id);
        }
        return;
      }

      // Partial Waiver: waterfall allocation
      let remW = amountToWaive;

      if (waiverType === 'Penalty') {
        for (const inst of insts) {
          if (remW <= 0) break;
          const penDue = Number(inst.penalties_due || 0);
          const penPaid = Number(inst.penalties_paid || 0);
          const unpPen = Math.max(0, penDue - penPaid);
          if (unpPen > 0) {
            const alloc = Math.min(remW, unpPen);
            remW -= alloc;
            const newPenPaid = penPaid + alloc;
            const pDue = Number(inst.principal_due || 0);
            const pPaid = Number(inst.principal_paid || 0);
            const iDue = Number(inst.interest_due || 0);
            const iPaid = Number(inst.interest_paid || 0);
            const fDue = Number(inst.fees_due || 0);
            const fPaid = Number(inst.fees_paid || 0);
            const settled = (pPaid >= pDue) && (iPaid >= iDue) && (fPaid >= fDue) && (newPenPaid >= penDue);

            await supabase
              .from(tableName)
              .update({
                penalties_paid: newPenPaid,
                is_settled: settled,
                status: settled ? 'Waived' : inst.status,
                paid_date: settled ? (inst.paid_date || todayStr) : inst.paid_date,
              })
              .eq('id', inst.id);
          }
        }
      } else if (waiverType === 'Interest') {
        for (const inst of insts) {
          if (remW <= 0) break;
          const iDue = Number(inst.interest_due || 0);
          const iPaid = Number(inst.interest_paid || 0);
          const unpInt = Math.max(0, iDue - iPaid);
          if (unpInt > 0) {
            const alloc = Math.min(remW, unpInt);
            remW -= alloc;
            const newIPaid = iPaid + alloc;
            const pDue = Number(inst.principal_due || 0);
            const pPaid = Number(inst.principal_paid || 0);
            const fDue = Number(inst.fees_due || 0);
            const fPaid = Number(inst.fees_paid || 0);
            const penDue = Number(inst.penalties_due || 0);
            const penPaid = Number(inst.penalties_paid || 0);
            const settled = (pPaid >= pDue) && (newIPaid >= iDue) && (fPaid >= fDue) && (penPaid >= penDue);

            await supabase
              .from(tableName)
              .update({
                interest_paid: newIPaid,
                is_settled: settled,
                status: settled ? 'Waived' : 'Partial',
                paid_date: settled ? (inst.paid_date || todayStr) : null,
              })
              .eq('id', inst.id);
          }
        }
      } else {
        // Principal / General waiver
        for (const inst of insts) {
          if (remW <= 0) break;
          const pDue = Number(inst.principal_due || 0);
          const pPaid = Number(inst.principal_paid || 0);
          const unpPrin = Math.max(0, pDue - pPaid);
          if (unpPrin > 0) {
            const alloc = Math.min(remW, unpPrin);
            remW -= alloc;
            const newPPaid = pPaid + alloc;
            const iDue = Number(inst.interest_due || 0);
            const iPaid = Number(inst.interest_paid || 0);
            const fDue = Number(inst.fees_due || 0);
            const fPaid = Number(inst.fees_paid || 0);
            const penDue = Number(inst.penalties_due || 0);
            const penPaid = Number(inst.penalties_paid || 0);
            const settled = (newPPaid >= pDue) && (iPaid >= iDue) && (fPaid >= fDue) && (penPaid >= penDue);

            await supabase
              .from(tableName)
              .update({
                principal_paid: newPPaid,
                is_settled: settled,
                status: settled ? 'Waived' : 'Partial',
                paid_date: settled ? (inst.paid_date || todayStr) : null,
              })
              .eq('id', inst.id);
          }
        }
      }
    } catch (err) {
      console.warn(`[applyWaiverToInstallments] Failed updating ${tableName}:`, err);
    }
  };

  // Try updating both tables
  await processTable('financing_installments', 'agreement_id');
  await processTable('loan_installments', 'loan_id');
}

export async function waiveAgreementBalance(payload: { id: string; waiverType: string; amount: number; reason: string }) {
  try {
    const user = await getLoggedInUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      throw new Error('Unauthorized: Only Admin or Manager can execute a balance waiver.');
    }

    const amountToWaive = Number(payload.amount);
    if (isNaN(amountToWaive) || amountToWaive <= 0) {
      throw new Error('Waiver amount must be greater than zero.');
    }

    if (!payload.reason || payload.reason.trim().length < 10) {
      throw new Error('A detailed justification (minimum 10 characters) is required for audit compliance.');
    }

    const supabase = createAdminClient();

    // Check financing_agreements
    const { data: agreement } = await supabase
      .from('financing_agreements')
      .select('*')
      .eq('id', payload.id)
      .maybeSingle();

    if (agreement) {
      const currentBalance = Number(agreement.balance || 0);
      if (amountToWaive > currentBalance) {
        throw new Error(`Waiver amount (KES ${amountToWaive.toLocaleString()}) cannot exceed the current outstanding balance of KES ${currentBalance.toLocaleString()}.`);
      }

      const newBalance = Math.max(0, currentBalance - amountToWaive);
      const isSettled = newBalance <= 0;
      const newStatus = isSettled ? 'completed' : agreement.status;

      // Record the waiver as a repayment record with payment_method: 'Waiver'
      const { error: rErr } = await supabase
        .from('repayments')
        .insert({
          receipt_no: `WAIVE-${Date.now().toString().slice(-6)}`,
          agreement_id: payload.id,
          client_id: agreement.client_id,
          amount_paid: amountToWaive,
          payment_method: 'Waiver',
          notes: `[WAIVER: ${payload.waiverType}] ${payload.reason.trim()}`,
          allocated_principal: payload.waiverType === 'Penalty' ? 0 : amountToWaive,
          allocated_penalties: payload.waiverType === 'Penalty' ? amountToWaive : 0,
          allocated_overdue_interest: payload.waiverType === 'Interest' ? amountToWaive : 0,
          payment_date: new Date().toISOString().split('T')[0]
        });
      if (rErr) throw rErr;

      const updateFields: Record<string, any> = {
        balance: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (isSettled) {
        updateFields.aging_bucket = 'COMPLETED';
        updateFields.days_overdue = 0;
      }

      if (payload.waiverType === 'Penalty') {
        updateFields.total_penalties = Math.max(0, Number(agreement.total_penalties || 0) - amountToWaive);
      }

      const { error: uErr } = await supabase
        .from('financing_agreements')
        .update(updateFields)
        .eq('id', payload.id);
      if (uErr) throw uErr;

      // Keep synced loans table in sync if present
      await supabase
        .from('loans')
        .update({
          balance: newBalance,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.id);

      // Keep loan_transactions synced for UI timeline
      try {
        await supabase
          .from('loan_transactions')
          .insert({
            loan_id: payload.id,
            type: 'Waiver',
            amount: amountToWaive,
            payment_method: 'Waiver',
            notes: `[WAIVER: ${payload.waiverType}] ${payload.reason.trim()}`,
            status: 'Completed',
            created_at: new Date().toISOString()
          });
      } catch (_) {}

      // Update installments so installment schedule and breakdown reflect the waiver
      await applyWaiverToInstallments(supabase, payload.id, amountToWaive, payload.waiverType, isSettled);

      // If balance is zero and vehicle attached, update vehicle status to 'sold'
      if (isSettled && agreement.vehicle_id) {
        await supabase
          .from('vehicles')
          .update({ status: 'sold', updated_at: new Date().toISOString() })
          .eq('id', agreement.vehicle_id);
      }

      // Record audit log
      await logAuditEvent({
        loanId: payload.id,
        entityType: 'financing_agreement',
        action: 'STATUS_CHANGED',
        performedBy: `${user.firstName} ${user.lastName} (${user.role})`,
        description: `Applied KES ${amountToWaive.toLocaleString()} waiver (${payload.waiverType}): ${payload.reason.trim()}. New balance: KES ${newBalance.toLocaleString()}`,
        previousValue: `Balance: ${currentBalance}, Status: ${agreement.status}`,
        newValue: `Balance: ${newBalance}, Status: ${newStatus}`
      });

      revalidatePath('/admin/contracts');
      revalidatePath('/loans');
      revalidatePath(`/loans/${payload.id}`);
      revalidatePath('/');
      revalidatePath('/reports/income');
      revalidatePath('/reports/portfolio');
      return { success: true, newBalance };
    }

    // Check loans table
    const { data: loanRecord } = await supabase
      .from('loans')
      .select('*')
      .eq('id', payload.id)
      .maybeSingle();

    if (!loanRecord) throw new Error('Contract/Loan not found.');

    const currentBalance = Number(loanRecord.balance || 0);
    if (amountToWaive > currentBalance) {
      throw new Error(`Waiver amount (KES ${amountToWaive.toLocaleString()}) cannot exceed the current outstanding balance of KES ${currentBalance.toLocaleString()}.`);
    }

    const newBalance = Math.max(0, currentBalance - amountToWaive);
    const isSettled = newBalance <= 0;
    const newStatus = isSettled ? 'Completed' : loanRecord.status;

    const { error: loanUpdateErr } = await supabase
      .from('loans')
      .update({
        balance: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.id);
    if (loanUpdateErr) throw loanUpdateErr;

    // Record in loan_transactions
    await supabase
      .from('loan_transactions')
      .insert({
        loan_id: payload.id,
        type: 'Waiver',
        amount: amountToWaive,
        payment_method: 'Waiver',
        notes: `[WAIVER: ${payload.waiverType}] ${payload.reason.trim()}`,
        status: 'Completed',
        created_at: new Date().toISOString()
      });

    // Update installments so installment schedule and breakdown reflect the waiver
    await applyWaiverToInstallments(supabase, payload.id, amountToWaive, payload.waiverType, isSettled);

    await logAuditEvent({
      loanId: payload.id,
      entityType: 'loan',
      action: 'STATUS_CHANGED',
      performedBy: `${user.firstName} ${user.lastName} (${user.role})`,
      description: `Applied KES ${amountToWaive.toLocaleString()} waiver (${payload.waiverType}): ${payload.reason.trim()}. New balance: KES ${newBalance.toLocaleString()}`,
      previousValue: `Balance: ${currentBalance}, Status: ${loanRecord.status}`,
      newValue: `Balance: ${newBalance}, Status: ${newStatus}`
    });

    revalidatePath(`/loans/${payload.id}`);
    revalidatePath(`/loans/${payload.id}/statement`);
    revalidatePath('/loans');
    revalidatePath('/');
    return { success: true, newBalance };
  } catch (err: any) {
    console.error('[waiveAgreementBalance] Error:', err);
    return { success: false, error: err?.message || 'Failed to waive balance.' };
  }
}

export async function addPenaltyToAgreement(payload: {
  id: string;
  amount: number;
  reason: string;
  dateApplied?: string;
  penaltyType?: string;
}) {
  try {
    const supabase = createAdminClient();
    const { data: agreement } = await supabase
      .from('financing_agreements')
      .select('*')
      .eq('id', payload.id)
      .maybeSingle();

    let clientId = agreement?.client_id;

    if (!agreement) {
      // Fallback to loans table
      const { data: loanRecord } = await supabase
        .from('loans')
        .select('*')
        .eq('id', payload.id)
        .maybeSingle();

      if (!loanRecord) throw new Error('Contract or loan not found');
      clientId = loanRecord.client_id;

      const newPenalties = Number(loanRecord.remaining_penalties || loanRecord.penalty_amount || 0) + payload.amount;
      const newBalance = Number(loanRecord.balance || 0) + payload.amount;

      await supabase
        .from('loans')
        .update({
          balance: newBalance,
          remaining_penalties: newPenalties,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.id);
    } else {
      const newPenalties = Number(agreement.total_penalties || 0) + payload.amount;
      const newBalance = Number(agreement.balance || 0) + payload.amount;

      // Attach penalty to the earliest pending installment, or the last one if none are pending
      const { data: installments } = await supabase
        .from('financing_installments')
        .select('id, penalties_due')
        .eq('agreement_id', payload.id)
        .eq('is_settled', false)
        .order('installment_number', { ascending: true })
        .limit(1);

      const targetInstallment = installments && installments.length > 0 ? installments[0] : null;

      if (targetInstallment) {
        await supabase
          .from('financing_installments')
          .update({ penalties_due: Number(targetInstallment.penalties_due || 0) + payload.amount })
          .eq('id', targetInstallment.id);
      } else {
        const { data: lastInst } = await supabase
          .from('financing_installments')
          .select('id, penalties_due')
          .eq('agreement_id', payload.id)
          .order('installment_number', { ascending: false })
          .limit(1)
          .single();
        if (lastInst) {
          await supabase
            .from('financing_installments')
            .update({ penalties_due: Number(lastInst.penalties_due || 0) + payload.amount })
            .eq('id', lastInst.id);
        }
      }

      const { error: uErr } = await supabase
        .from('financing_agreements')
        .update({
          total_penalties: newPenalties,
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.id);
      if (uErr) throw uErr;

      // Keep synced loans table in sync if present
      await supabase
        .from('loans')
        .update({
          balance: newBalance,
          remaining_penalties: newPenalties,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.id);
    }

    const effectiveDate = payload.dateApplied
      ? (payload.dateApplied.includes('T') ? payload.dateApplied : `${payload.dateApplied}T12:00:00.000Z`)
      : new Date().toISOString();

    const pType = payload.penaltyType || 'Late Payment';

    // Ensure we insert into the 'penalties' table for audit/reporting purposes
    const { error: pErr } = await supabase
      .from('penalties')
      .insert({
        agreement_id: payload.id, 
        client_id: clientId,
        amount: payload.amount,
        penalty_type: pType,
        comment: payload.reason,
        status: 'Active',
        date_applied: effectiveDate,
        created_at: effectiveDate,
      });
    
    // Throw if inserting penalty fails, to prevent phantom balance increases
    if (pErr) {
      console.error("[addPenaltyToAgreement] Failed to log penalty record:", pErr);
      throw new Error("Database Error: Could not record the penalty. The contract balance was NOT updated.");
    }

    // Keep loan_transactions synced for UI timeline & statements
    try {
      await supabase
        .from('loan_transactions')
        .insert({
          loan_id: payload.id,
          client_id: clientId,
          amount: payload.amount,
          type: 'Manual Penalty',
          payment_method: pType,
          comment: payload.reason,
          date: effectiveDate,
          status: 'Active',
          created_at: effectiveDate,
        });
    } catch (_) {}

    revalidatePath('/admin/contracts');
    revalidatePath('/loans');
    revalidatePath(`/loans/${payload.id}`);
    revalidatePath(`/loans/${payload.id}/statement`);
    revalidatePath('/reports/portfolio');
    revalidatePath('/reports/par');
    revalidatePath('/reports/income');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to add penalty.' };
  }
}

export interface RolloverAgreementParams {
  agreementId: string;
  extensionMonths: number;
  feeType: 'percentage' | 'fixed';
  feeValue: number;
  rolloverDate?: string;
  reason?: string;
  currentUser?: any;
}

export async function rolloverAgreement(params: RolloverAgreementParams) {
  try {
    const supabase = createAdminClient();

    // 1. Fetch current agreement
    const { data: agreement, error: aErr } = await supabase
      .from('financing_agreements')
      .select('*')
      .eq('id', params.agreementId)
      .single();

    if (aErr || !agreement) {
      throw new Error('Financing agreement not found.');
    }

    const effectiveDate = params.rolloverDate
      ? new Date(params.rolloverDate.includes('T') ? params.rolloverDate : `${params.rolloverDate}T12:00:00`).toISOString()
      : new Date().toISOString();
    const isBackdated = !!(params.rolloverDate && new Date(effectiveDate) < new Date());

    // 2. Fetch existing installments
    const { data: insts, error: instsErr } = await supabase
      .from('financing_installments')
      .select('*')
      .eq('agreement_id', params.agreementId)
      .order('installment_number', { ascending: true });

    if (instsErr) throw instsErr;
    const allInsts = insts || [];

    // 3. Compute current outstanding principal
    let outstandingPrincipal = 0;
    if (allInsts.length > 0) {
      outstandingPrincipal = allInsts.reduce(
        (sum, i) => sum + Math.max(0, (Number(i.principal_due) || 0) - (Number(i.principal_paid) || 0)),
        0
      );
    } else {
      outstandingPrincipal = Math.max(0, (Number(agreement.balance) || 0) - (Number(agreement.total_penalties) || 0));
    }

    // 4. Compute rollover fee amount
    const rolloverFeeAmount = params.feeType === 'percentage'
      ? Math.round(outstandingPrincipal * (Number(params.feeValue || 0) / 100))
      : Number(params.feeValue || 0);

    // 5. Calculate new duration & due date
    const extensionMonths = Math.max(1, Math.round(Number(params.extensionMonths || 0)));
    const newDuration = Math.round((Number(agreement.duration_months) || 0) + extensionMonths);

    const lastInst = allInsts.length > 0 ? allInsts[allInsts.length - 1] : null;
    const baseDueDateStr = lastInst?.due_date || agreement.end_date || effectiveDate;
    const [baseYear, baseMonth, baseDay] = (baseDueDateStr.split('T')[0] || '2026-01-01')
      .split('-')
      .map(Number);

    const finalDueDate = new Date(Date.UTC(baseYear, baseMonth - 1 + extensionMonths, baseDay));
    const finalEndDateStr = finalDueDate.toISOString().split('T')[0];

    // 6. Handle installments schedule
    // Lock partially-paid unsettled installments to their paid amount
    const unsettledPartiallyPaid = allInsts.filter(i => !i.is_settled && Number(i.principal_paid || 0) > 0);
    for (const inst of unsettledPartiallyPaid) {
      const paidPrin = Number(inst.principal_paid || 0);
      const isSettled = (Number(inst.penalties_paid || 0) >= Number(inst.penalties_due || 0));
      await supabase
        .from('financing_installments')
        .update({
          principal_due: paidPrin,
          is_settled: isSettled,
          status: isSettled ? 'Paid' : 'Partial',
        })
        .eq('id', inst.id);
    }

    // Unsettled installments with 0 paid
    const existingZeroPaid = allInsts.filter(i => !i.is_settled && Number(i.principal_paid || 0) === 0);
    const totalFutureCount = existingZeroPaid.length + extensionMonths;

    let perInstPrincipal = 0;
    if (totalFutureCount > 0 && outstandingPrincipal > 0) {
      perInstPrincipal = Math.floor(outstandingPrincipal / totalFutureCount);
      const lastInstPrincipal = outstandingPrincipal - (perInstPrincipal * (totalFutureCount - 1));

      // Update existing 0-paid installments
      for (let j = 0; j < existingZeroPaid.length; j++) {
        const inst = existingZeroPaid[j];
        const isLastOverall = (j === totalFutureCount - 1);
        const pDue = isLastOverall ? lastInstPrincipal : perInstPrincipal;

        await supabase
          .from('financing_installments')
          .update({
            principal_due: pDue,
            status: 'Pending',
          })
          .eq('id', inst.id);
      }

      // Insert the new extended installment rows
      const lastInstNum = lastInst ? Number(lastInst.installment_number || 0) : 0;
      const newInstallmentsToInsert = [];

      for (let k = 1; k <= extensionMonths; k++) {
        const nextDueDate = new Date(Date.UTC(baseYear, baseMonth - 1 + k, baseDay));
        const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

        const currentFutureIndex = existingZeroPaid.length + k - 1;
        const isLastOverall = (currentFutureIndex === totalFutureCount - 1);
        const pDue = isLastOverall ? lastInstPrincipal : perInstPrincipal;

        newInstallmentsToInsert.push({
          agreement_id: params.agreementId,
          client_id: agreement.client_id,
          installment_number: lastInstNum + k,
          due_date: nextDueDateStr,
          principal_due: pDue,
          interest_due: 0,
          fees_due: 0,
          penalties_due: 0,
          status: 'Pending',
          is_settled: false,
        });
      }

      if (newInstallmentsToInsert.length > 0) {
        const { error: insErr } = await supabase
          .from('financing_installments')
          .insert(newInstallmentsToInsert);
        if (insErr) {
          console.error('[rolloverAgreement] Error inserting new installments:', insErr);
          throw insErr;
        }
      }
    }

    // 7. Add Rollover Fee if > 0
    if (rolloverFeeAmount > 0) {
      // Find the first unsettled installment to attach the penalty
      const firstUnsettled = allInsts.find(i => !i.is_settled);
      if (firstUnsettled) {
        await supabase
          .from('financing_installments')
          .update({
            penalties_due: Number(firstUnsettled.penalties_due || 0) + rolloverFeeAmount,
          })
          .eq('id', firstUnsettled.id);
      } else {
        const { data: firstNewInst } = await supabase
          .from('financing_installments')
          .select('id, penalties_due')
          .eq('agreement_id', params.agreementId)
          .eq('is_settled', false)
          .order('installment_number', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstNewInst) {
          await supabase
            .from('financing_installments')
            .update({
              penalties_due: Number(firstNewInst.penalties_due || 0) + rolloverFeeAmount,
            })
            .eq('id', firstNewInst.id);
        }
      }

      // Record in penalties table
      const { error: pErr } = await supabase
        .from('penalties')
        .insert({
          agreement_id: params.agreementId,
          client_id: agreement.client_id,
          amount: rolloverFeeAmount,
          penalty_type: 'Rollover Fee',
          comment: params.reason || `Rollover fee applied (${params.feeType === 'percentage' ? `${params.feeValue}% of outstanding principal` : 'Fixed amount'} KES ${outstandingPrincipal.toLocaleString()})${isBackdated ? ` [Backdated to ${new Date(effectiveDate).toLocaleDateString("en-KE")}]` : ""}`,
          status: 'Active',
          date_applied: effectiveDate,
        });

      if (pErr) {
        console.error('[rolloverAgreement] Error inserting penalty record:', pErr);
      }
    }

    // 8. Reconcile balance from all installments (self-healing source of truth)
    const { data: reconInst } = await supabase
      .from('financing_installments')
      .select('principal_due, principal_paid, interest_due, interest_paid, fees_due, fees_paid, penalties_due, penalties_paid')
      .eq('agreement_id', params.agreementId);

    let reconBalance = 0;
    let reconPenalties = 0;
    if (reconInst && reconInst.length > 0) {
      reconBalance = reconInst.reduce((sum, i) =>
        sum
        + Math.max(0, (Number(i.principal_due) || 0) - (Number(i.principal_paid) || 0))
        + Math.max(0, (Number(i.interest_due)  || 0) - (Number(i.interest_paid)  || 0))
        + Math.max(0, (Number(i.fees_due)       || 0) - (Number(i.fees_paid)      || 0))
        + Math.max(0, (Number(i.penalties_due)  || 0) - (Number(i.penalties_paid) || 0))
      , 0);
      reconPenalties = reconInst.reduce((sum, i) =>
        sum + Math.max(0, (Number(i.penalties_due) || 0) - (Number(i.penalties_paid) || 0))
      , 0);
    } else {
      reconPenalties = Number(agreement.total_penalties || 0) + rolloverFeeAmount;
      reconBalance = Number(agreement.balance || 0) + rolloverFeeAmount;
    }

    const now = new Date();
    const isOverdue = finalDueDate < now;
    const postRolloverStatus = reconBalance <= 0
      ? 'completed'
      : (isOverdue ? 'Overdue' : 'active');

    const recalculatedMonthlyDue = perInstPrincipal > 0
      ? perInstPrincipal
      : Number(agreement.monthly_due || 0);

    const { data: updatedAgreement, error: updAgErr } = await supabase
      .from('financing_agreements')
      .update({
        duration_months: newDuration,
        end_date: finalEndDateStr,
        monthly_due: recalculatedMonthlyDue,
        total_penalties: reconPenalties,
        balance: reconBalance,
        status: postRolloverStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.agreementId)
      .select()
      .single();

    if (updAgErr) throw updAgErr;

    revalidatePath('/admin/contracts');
    revalidatePath('/dashboard');
    revalidatePath('/loans');
    revalidatePath(`/loans/${params.agreementId}`);

    return {
      success: true,
      data: updatedAgreement,
    };
  } catch (err: any) {
    console.error('[rolloverAgreement] Error:', err);
    throw err;
  }
}

export async function recascadeAgreementInstallments(agreementId: string) {
  try {
    const supabase = createAdminClient();

    // 1. Fetch agreement
    const { data: agreement, error: agErr } = await supabase
      .from('financing_agreements')
      .select('*')
      .eq('id', agreementId)
      .single();

    if (agErr || !agreement) return;

    // 2. Fetch all repayments sorted chronologically (oldest first)
    const { data: reps } = await supabase
      .from('repayments')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('payment_date', { ascending: true })
      .order('created_at', { ascending: true });

    const repaymentsList = reps || [];

    // 3. Fetch installments
    const { data: installments, error: instsErr } = await supabase
      .from('financing_installments')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('installment_number', { ascending: true });

    if (instsErr || !installments || installments.length === 0) return;

    // 4. Initialize in-memory state with 0 paid
    const state = installments.map(i => ({
      ...i,
      principal_paid: 0,
      interest_paid: 0,
      penalties_paid: 0,
      fees_paid: 0,
      amount_paid: 0,
      is_settled: false,
    }));

    // 5. Replay repayments sequentially
    let lastRepDate: string | null = null;
    for (const rep of repaymentsList) {
      const repAmount = Math.max(0, Number(rep.amount_paid || 0) + Number(rep.penalty_amount || 0));
      lastRepDate = rep.payment_date || lastRepDate;

      const remPenalties = state.reduce((s, i) =>
        s + Math.max(0, (Number(i.penalties_due) || 0) - (Number(i.penalties_paid) || 0)), 0);
      const remPrincipal = state.reduce((s, i) =>
        s + Math.max(0, (Number(i.principal_due) || 0) - (Number(i.principal_paid) || 0))
          + Math.max(0, (Number(i.interest_due)  || 0) - (Number(i.interest_paid)  || 0))
          + Math.max(0, (Number(i.fees_due)       || 0) - (Number(i.fees_paid)      || 0))
      , 0);

      const initialPenToAlloc = Math.min(repAmount, remPenalties);
      let remPenToAlloc = initialPenToAlloc;
      const initialPrinToAlloc = Math.min(repAmount - remPenToAlloc, remPrincipal);
      let remPrinToAlloc = initialPrinToAlloc;

      for (const inst of state) {
        if (remPenToAlloc <= 0 && remPrinToAlloc <= 0) break;

        const instRemPen = Math.max(0, (Number(inst.penalties_due) || 0) - (Number(inst.penalties_paid) || 0));
        const instRemPrin = Math.max(0, (Number(inst.principal_due) || 0) - (Number(inst.principal_paid) || 0));
        const instRemInt  = Math.max(0, (Number(inst.interest_due)  || 0) - (Number(inst.interest_paid)  || 0));

        const ap = Math.min(remPenToAlloc, instRemPen);
        remPenToAlloc -= ap;

        const ai = Math.min(remPrinToAlloc, instRemInt);
        remPrinToAlloc -= ai;

        const apr = Math.min(remPrinToAlloc, instRemPrin);
        remPrinToAlloc -= apr;

        if (ap > 0 || ai > 0 || apr > 0) {
          inst.penalties_paid = (Number(inst.penalties_paid) || 0) + ap;
          inst.interest_paid  = (Number(inst.interest_paid)  || 0) + ai;
          inst.principal_paid = (Number(inst.principal_paid) || 0) + apr;
          inst.amount_paid    = (Number(inst.amount_paid)    || 0) + ap + ai + apr;
        }
      }

      const allocatedPen = initialPenToAlloc - remPenToAlloc;
      const allocatedPrin = initialPrinToAlloc - remPrinToAlloc;

      if (rep.allocated_penalties !== allocatedPen || rep.allocated_principal !== allocatedPrin) {
        await supabase
          .from('repayments')
          .update({
            allocated_penalties: allocatedPen,
            allocated_principal: allocatedPrin,
          })
          .eq('id', rep.id);
      }
    }

    // 6. Persist updated paid state to financing_installments
    const now = new Date();
    for (const inst of state) {
      const is_settled =
        (Number(inst.principal_paid) >= Number(inst.principal_due)) &&
        (Number(inst.interest_paid)  >= Number(inst.interest_due))  &&
        (Number(inst.penalties_paid) >= Number(inst.penalties_due)) &&
        (Number(inst.fees_paid)      >= Number(inst.fees_due));

      const hasAnyPayment = (Number(inst.principal_paid) > 0 || Number(inst.penalties_paid) > 0 || Number(inst.interest_paid) > 0);
      const isOverdue = new Date(inst.due_date) < now;

      let newStatus = is_settled
        ? 'Paid'
        : hasAnyPayment
          ? 'Partial'
          : isOverdue
            ? 'Overdue'
            : 'Pending';

      if (inst.status === 'Rolled Over') newStatus = 'Rolled Over';

      await supabase
        .from('financing_installments')
        .update({
          principal_paid: inst.principal_paid,
          interest_paid:  inst.interest_paid,
          penalties_paid: inst.penalties_paid,
          fees_paid:      inst.fees_paid,
          is_settled,
          status: newStatus,
          paid_date: is_settled ? (inst.paid_date || lastRepDate || now.toISOString().split('T')[0]) : null,
        })
        .eq('id', inst.id);
    }

    // 7. Reconcile agreement balance & penalties
    const reconBalance = state.reduce((s, i) =>
      s + Math.max(0, (Number(i.principal_due) || 0) - (Number(i.principal_paid) || 0))
        + Math.max(0, (Number(i.interest_due)  || 0) - (Number(i.interest_paid)  || 0))
        + Math.max(0, (Number(i.fees_due)       || 0) - (Number(i.fees_paid)      || 0))
        + Math.max(0, (Number(i.penalties_due)  || 0) - (Number(i.penalties_paid) || 0))
    , 0);

    const reconPenalties = state.reduce((s, i) =>
      s + Math.max(0, (Number(i.penalties_due) || 0) - (Number(i.penalties_paid) || 0)), 0);

    const postStatus = reconBalance <= 0 ? 'completed' : agreement.status === 'completed' ? 'active' : agreement.status;

    await supabase
      .from('financing_agreements')
      .update({
        balance: Math.max(0, reconBalance),
        total_penalties: reconPenalties,
        last_payment_date: lastRepDate,
        status: postStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agreementId);

  } catch (err) {
    console.error('[recascadeAgreementInstallments] Error:', err);
  }
}


