import { supabase } from './supabase';

export const generateLoanAgreement = async (loanId: string) => {
  try {
    const { data, error } = await supabase.rpc('generate_loan_agreement', { p_loan_id: loanId });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('[agreementService] Error generating loan agreement:', error);
    return { success: false, error };
  }
};
