import { supabase } from './supabase';

export const processRepayment = async ({
  loanId,
  amount,
  paymentMethod,
  referenceId = "",
  performedBy = "System",
  paymentDate,
}: {
  loanId: string;
  amount: number;
  paymentMethod: string;
  referenceId?: string;
  performedBy?: string;
  paymentDate?: string;
}) => {
  try {
    const effectiveDate = paymentDate
      ? new Date(paymentDate.includes("T") ? paymentDate : `${paymentDate}T12:00:00`).toISOString()
      : new Date().toISOString();

    const { data: txId, error: rpcError } = await supabase.rpc("process_loan_repayment", {
      p_loan_id: loanId,
      p_payment_amount: amount,
      p_payment_method: paymentMethod,
      p_reference_id: referenceId,
      p_applied_by: performedBy,
      p_date: effectiveDate,
    });

    if (rpcError) throw rpcError;

    const { data: tx, error: txError } = await supabase
      .from("loan_transactions")
      .select("*")
      .eq("id", txId)
      .single();

    if (txError) throw txError;
    return { success: true, data: tx };
  } catch (error) {
    console.error("[repaymentService] Repayment failed:", error);
    return { success: false, error };
  }
};

export const getRepaymentsByLoan = async (loanId: string) => {
  try {
    const { data, error } = await supabase
      .from("loan_transactions")
      .select("*")
      .eq("loan_id", loanId)
      .eq("type", "Repayment")
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[repaymentService] Error fetching repayments:", error);
    return [];
  }
};

export const getInstallmentsByLoan = async (loanId: string) => {
  try {
    const { data, error } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("loan_id", loanId)
      .order("installment_number", { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[repaymentService] Error fetching installments:", error);
    return [];
  }
};

export const getAllTransactionsByLoan = async (loanId: string) => {
  try {
    const { data, error } = await supabase
      .from("loan_transactions")
      .select("*")
      .eq("loan_id", loanId)
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[repaymentService] Error fetching all transactions:", error);
    return [];
  }
};
