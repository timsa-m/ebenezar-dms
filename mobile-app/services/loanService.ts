import { supabase } from './supabase';
import { InterestCalculator } from './interest';

function mapLoanRow(row: any) {
  return {
    $id: row.id,
    $createdAt: row.created_at,
    clientId: row.client_id,
    principalAmount: row.principal_amount,
    interestRate: row.interest_rate,
    interestType: row.interest_type,
    durationInMonths: row.duration_in_months,
    startDate: row.start_date,
    dueDate: row.due_date,
    totalInterest: row.total_interest,
    totalPayable: row.total_payable,
    balance: row.balance,
    status: row.status,
    penaltyAccrued: row.remaining_penalties ?? 0,
    loanType: row.loan_type,
    securities: row.securities,
    guarantorName: row.guarantor_name,
    guarantorPhone: row.guarantor_phone,
    guarantorId: row.guarantor_id,
    installmentAmount: (row.total_payable || 0) / (row.duration_in_months || 1),
    documentUrl: row.document_url,
    createdBy: row.created_by,
    isHighRisk: row.is_high_risk ?? false,
    lifecycleState: row.lifecycle_state,
    daysPastDue: row.days_past_due ?? 0,
    remainingPrincipal: row.remaining_principal ?? 0,
    remainingInterest: row.remaining_interest ?? 0,
    remainingPenalties: row.remaining_penalties ?? 0,
    remainingFees: row.remaining_fees ?? 0,
    amountApplied: row.amount_applied ?? row.principal_amount,
    principalDisbursed: row.principal_disbursed ?? null,
    disbursedAt: row.disbursed_at ?? null,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    clientPhone: row.clientPhone,
  };
}

export const createLoan = async (loanData: {
  clientId: string;
  principalAmount: number;
  interestRate: number;
  interestType: 'Flat' | 'Reducing';
  durationInMonths: number;
  loanType: string;
  startDate?: string;
  securities?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorId?: string;
  documentUri?: string;
  documentMimeType?: string;
}) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Not authenticated');

    const { data: badCredit } = await supabase
      .from('loans')
      .select('id')
      .eq('client_id', loanData.clientId)
      .in('status', ['Overdue', 'Defaulted'])
      .limit(1);

    const isHighRisk = !!(badCredit && badCredit.length > 0);

    const financialData =
      loanData.interestType === 'Flat'
        ? InterestCalculator.calculateFlatRate(loanData.principalAmount, loanData.interestRate, loanData.durationInMonths)
        : InterestCalculator.calculateReducingBalance(loanData.principalAmount, loanData.interestRate, loanData.durationInMonths);

    const startDate = loanData.startDate ? new Date(loanData.startDate) : new Date();
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + loanData.durationInMonths);

    let documentPath: string | undefined;
    if (loanData.documentUri && loanData.documentMimeType) {
      const fileExt = loanData.documentUri.split('.').pop() || 'pdf';
      const filePath = `loan-docs/${Date.now()}-doc.${fileExt}`;
      
      const formData = new FormData();
      formData.append('file', {
        uri: loanData.documentUri,
        name: `doc.${fileExt}`,
        type: loanData.documentMimeType,
      } as any);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('loan-documents')
        .upload(filePath, formData, { upsert: true });

      if (!uploadError && uploadData) {
        documentPath = uploadData.path;
      }
    }

    const { data, error } = await supabase
      .from('loans')
      .insert({
        client_id: loanData.clientId,
        principal_amount: loanData.principalAmount,
        amount_applied: loanData.principalAmount,
        interest_rate: loanData.interestRate,
        interest_type: loanData.interestType,
        duration_in_months: loanData.durationInMonths,
        loan_type: loanData.loanType,
        securities: loanData.securities,
        guarantor_name: loanData.guarantorName,
        guarantor_phone: loanData.guarantorPhone,
        guarantor_id: loanData.guarantorId,
        status: 'Pending',
        total_interest: financialData.totalInterest,
        total_payable: financialData.totalPayable,
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
        document_url: documentPath ?? null,
        created_by: user.id,
        is_high_risk: isHighRisk,
      })
      .select()
      .single();

    if (error) throw error;
    return mapLoanRow(data);
  } catch (error) {
    console.error('[loanService] Error creating loan:', error);
    return null;
  }
};

export const updateLoan = async (loanId: string, loanData: any) => {
  try {
    const payload: Record<string, any> = {};

    if (
      loanData.principalAmount !== undefined ||
      loanData.interestRate !== undefined ||
      loanData.durationInMonths !== undefined ||
      loanData.interestType !== undefined
    ) {
      const { data: current } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single();

      if (current?.status === 'Pending') {
        const p = loanData.principalAmount ?? current.principal_amount;
        const r = loanData.interestRate ?? current.interest_rate;
        const d = loanData.durationInMonths ?? current.duration_in_months;
        const t = loanData.interestType ?? current.interest_type;

        const fin = t === 'Flat'
          ? InterestCalculator.calculateFlatRate(p, r, d)
          : InterestCalculator.calculateReducingBalance(p, r, d);

        payload.total_interest = fin.totalInterest;
        payload.total_payable = fin.totalPayable;
      }
    }

    if (loanData.status !== undefined) payload.status = loanData.status;
    if (loanData.principalAmount !== undefined) payload.principal_amount = loanData.principalAmount;
    if (loanData.interestRate !== undefined) payload.interest_rate = loanData.interestRate;
    if (loanData.durationInMonths !== undefined) payload.duration_in_months = loanData.durationInMonths;
    if (loanData.interestType !== undefined) payload.interest_type = loanData.interestType;
    if (loanData.dueDate !== undefined) payload.due_date = loanData.dueDate;

    const { data, error } = await supabase
      .from('loans')
      .update(payload)
      .eq('id', loanId)
      .select()
      .single();

    if (error) throw error;
    return mapLoanRow(data);
  } catch (error) {
    console.error('[loanService] Error updating loan:', error);
    return null;
  }
};

export const approveLoan = async (loanId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: loan } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (!loan) throw new Error('Loan not found.');

    const { data, error } = await supabase
      .from('loans')
      .update({
        status: 'Approved',
        lifecycle_state: 'Awaiting Disbursement',
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
      .select()
      .single();

    if (error) throw error;
    return mapLoanRow(data);
  } catch (error) {
    console.error('[loanService] Error approving loan:', error);
    return null;
  }
};
