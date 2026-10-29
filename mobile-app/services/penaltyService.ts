import { supabase } from './supabase';

export const getPenaltiesByLoan = async (loanId: string) => {
  try {
    const { data, error } = await supabase
      .from('loan_transactions')
      .select('*')
      .eq('loan_id', loanId)
      .in('type', ['Manual Penalty', 'Automatic Penalty'])
      .order('date', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[penaltyService] Error fetching penalties:', error);
    return [];
  }
};

export const applyManualPenalty = async ({
  loanId,
  amount,
  reason,
  appliedBy = 'System',
}: {
  loanId: string;
  amount: number;
  reason: string;
  appliedBy?: string;
}) => {
  try {
    const { data, error } = await supabase.rpc('apply_manual_penalty', {
      p_loan_id: loanId,
      p_penalty_amount: amount,
      p_reason: reason,
      p_applied_by: appliedBy,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('[penaltyService] Error applying penalty:', error);
    return { success: false, error };
  }
};

export const reversePenalty = async (transactionId: string, reversedBy = 'System') => {
  try {
    const { data, error } = await supabase.rpc('reverse_penalty', {
      p_transaction_id: transactionId,
      p_reversed_by: reversedBy,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('[penaltyService] Error reversing penalty:', error);
    return { success: false, error };
  }
};
