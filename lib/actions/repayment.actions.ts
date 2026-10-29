"use server";

import { createSupabaseAdminClient } from "../supabase";
import { parseStringify, formatAmount } from "../utils";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "./audit.actions";
import { getLoggedInUser, requireManagerRole } from "./user.actions";
import { triggerEventNotification } from "./collections.actions";

// ─── Retry helper ────────────────────────────────────────────────────────────
async function withRetry<T>(fn: () => PromiseLike<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isTimeout =
        err?.cause?.code === "ETIMEDOUT" ||
        err?.message?.includes("ETIMEDOUT") ||
        err?.message?.includes("fetch failed");
      if (!isTimeout || attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw lastError;
}

function friendlyError(err: unknown): string {
  const msg = (err as any)?.message || String(err);
  if (msg.includes("ETIMEDOUT") || msg.includes("fetch failed") || msg.includes("AggregateError")) {
    return "Connection timed out. Please check your internet connection and try again.";
  }
  return msg || "An unexpected error occurred.";
}

function mapRepaymentRow(row: any): Repayment {
  return {
    $id: row.id,
    $createdAt: row.created_at,
    loanId: row.loan_id,
    clientId: row.client_id,
    amount: row.amount,
    paymentMethod: row.payment_method,
    referenceId: row.reference_id,
    date: row.date,
  };
}

// ─── syncInstallments ─────────────────────────────────────────────────────────
export const syncInstallments = async (
  supabase: any,
  loanId: string,
  originalPrincipal: number,
  remainingPrincipal: number,
  remainingInterest: number,
  effectiveDate: string
) => {
  // Fetch all installments
  const { data: installments, error: instError } = await supabase
    .from("loan_installments")
    .select("*")
    .eq("loan_id", loanId)
    .order("installment_number", { ascending: true });

  if (instError || !installments) {
    console.error("Failed to fetch installments for sync", instError);
    return;
  }

  // Calculate total interest due across all installments
  const totalInterestDue = installments.reduce((sum: number, inst: any) => sum + Number(inst.interest_due || 0), 0);

  // Interest paid pool
  let interestPaidPool = Math.max(0, totalInterestDue - remainingInterest);

  // Principal paid pool
  let principalPaidPool = Math.max(0, originalPrincipal - remainingPrincipal);

  // Sequentially allocate paid interest and principal to installments in order
  for (const inst of installments) {
    const instInterestDue = Number(inst.interest_due || 0);
    const instPrincipalDue = Number(inst.principal_due || 0);

    const instInterestPaid = Math.min(interestPaidPool, instInterestDue);
    interestPaidPool -= instInterestPaid;

    const instPrincipalPaid = Math.min(principalPaidPool, instPrincipalDue);
    principalPaidPool -= instPrincipalPaid;

    // Preserve existing fees and penalties paid amounts
    const instFeesPaid = Number(inst.fees_paid || 0);
    const instPenaltiesPaid = Number(inst.penalties_paid || 0);

    const isSettled =
      (instPrincipalPaid >= instPrincipalDue) &&
      (instInterestPaid >= instInterestDue) &&
      (instFeesPaid >= Number(inst.fees_due || 0)) &&
      (instPenaltiesPaid >= Number(inst.penalties_due || 0));

    let newStatus = isSettled
      ? "Paid"
      : (instPrincipalPaid > 0 || instInterestPaid > 0)
        ? "Partial"
        : new Date(inst.due_date) < new Date()
          ? "Overdue"
          : "Pending";

    // Preserve Rolled Over status
    if (inst.status === "Rolled Over") {
      newStatus = "Rolled Over";
    }

    await supabase
      .from("loan_installments")
      .update({
        interest_paid: instInterestPaid,
        principal_paid: instPrincipalPaid,
        fees_paid: instFeesPaid,
        penalties_paid: instPenaltiesPaid,
        status: newStatus,
        paid_date: isSettled ? (inst.paid_date || effectiveDate) : null,
      })
      .eq("id", inst.id);
  }
};

// ─── processRepayment ─────────────────────────────────────────────────────────
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
}): Promise<{ success: boolean; error?: string; data?: any }> => {
  try {
    let currentUser;
    if (process.env.TEST_SUITE === "true") {
      currentUser = { $id: "system-test", userId: "system-test", firstName: "Test", lastName: "Suite", role: "ADMIN" } as any;
    } else {
      currentUser = await requireManagerRole();
    }
    const supabase = createSupabaseAdminClient();

    if (amount <= 0) return { success: false, error: "Repayment amount must be greater than zero." };

    const effectiveDate = paymentDate
      ? new Date(paymentDate.includes("T") ? paymentDate : `${paymentDate}T12:00:00`).toISOString()
      : new Date().toISOString();
    const isBackdated = paymentDate && new Date(effectiveDate) < new Date();

    // Check if loanId belongs to financing_agreements
    const { data: agreementCheck } = await supabase
      .from('financing_agreements')
      .select('id')
      .eq('id', loanId)
      .maybeSingle();

    if (agreementCheck) {
      const { recordRepaymentReceipt } = await import('./dms.actions');
      const result = await recordRepaymentReceipt({
        agreementId: loanId,
        receiptNo: referenceId || `REC-${Date.now().toString().slice(-6)}`,
        amountPaid: amount,
        paymentMethod: paymentMethod as any,
        paymentDate: effectiveDate,
        referenceNo: referenceId,
        notes: `Recorded via system ${performedBy || ''}`.trim()
      });
      if (!result.success) throw new Error(result.error);
      
      if (process.env.TEST_SUITE !== "true") {
        revalidatePath(`/contracts/${loanId}`);
        revalidatePath(`/loans/${loanId}`);
      }
      return { success: true, data: result.receipt };
    }

    // Call the database function to handle clean slate atomic allocation
    const { data: txId, error: rpcError } = await supabase.rpc("process_loan_repayment", {
      p_loan_id: loanId,
      p_payment_amount: amount,
      p_payment_method: paymentMethod,
      p_reference_id: referenceId,
      p_applied_by: performedBy,
      p_date: effectiveDate,
    });

    if (rpcError) throw rpcError;

    // Fetch the newly created transaction
    const { data: tx, error: txError } = await supabase
      .from("loan_transactions")
      .select("*")
      .eq("id", txId)
      .single();

    if (txError) throw txError;

    // Client aggregate + audit in parallel (both non-critical)
    const [, currentUserResult] = await Promise.allSettled([
      (async () => {
        try {
          const { data: loan } = await supabase.from("loans").select("client_id").eq("id", loanId).single();
          if (loan) {
            const { data: client } = await supabase
              .from("clients")
              .select("outstanding_balance")
              .eq("id", loan.client_id)
              .single();
            if (client) {
              await supabase
                .from("clients")
                .update({ outstanding_balance: Math.max(0, (client.outstanding_balance ?? 0) - amount) })
                .eq("id", loan.client_id);
            }
          }
        } catch (e) {
          console.warn("[processRepayment] Client aggregate update failed (non-critical):", e);
        }
      })(),
      getLoggedInUser().catch(() => null),
    ]);

    const loggedInUser = currentUser;

    // Audit log (non-critical)
    try {
      await logAuditEvent({
        loanId,
        entityType: "repayment",
        action: "REPAYMENT_CREATED",
        performedBy,
        userId: loggedInUser?.$id || loggedInUser?.userId || "system",
        description: `Repayment of KES ${amount.toLocaleString()} logged via ${paymentMethod}${referenceId ? ` (Ref: ${referenceId})` : ""
          }${isBackdated
            ? ` [Backdated to ${new Date(effectiveDate).toLocaleDateString("en-KE")}]`
            : ""
          }.`,
        previousValue: "Active",
        newValue: "Active",
      });
    } catch (auditErr) {
      console.warn("[processRepayment] Audit log failed (non-critical):", auditErr);
    }

    if (process.env.TEST_SUITE !== "true") {
      revalidatePath(`/loans/${loanId}`);
    }

    try {
      await triggerEventNotification(loanId, 'PAYMENT_CONFIRMATION', { payment_amount: formatAmount(amount) });
    } catch (notificationError) {
      console.warn("[processRepayment] Notification failed:", notificationError);
    }

    return { success: true, data: parseStringify(mapRepaymentRow(tx)) };
  } catch (error) {
    console.error("Repayment failed", error);
    return { success: false, error: friendlyError(error) };
  }
};

// ─── getRepaymentsByLoan ──────────────────────────────────────────────────────
export const getRepaymentsByLoan = async (loanId: string) => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("loan_transactions")
      .select("*")
      .eq("loan_id", loanId)
      .eq("type", "Repayment")
      .order("date", { ascending: false });

    if (error) throw error;

    return parseStringify((data ?? []).map(mapRepaymentRow));
  } catch (error) {
    console.error("Error fetching repayments", error);
    return null;
  }
};

// ─── getInstallmentsByLoan ────────────────────────────────────────────────────
function mapInstallmentRow(row: any): LoanInstallment {
  return {
    $id: row.id,
    loanId: row.loan_id,
    clientId: row.client_id,
    installmentNumber: row.installment_number,
    dueDate: row.due_date,
    principalDue: row.principal_due,
    interestDue: row.interest_due,
    feesDue: row.fees_due,
    penaltiesDue: row.penalties_due,
    principalPaid: row.principal_paid,
    interestPaid: row.interest_paid,
    feesPaid: row.fees_paid,
    penaltiesPaid: row.penalties_paid,
    amountDue: row.amount_due,
    amountPaid: row.amount_paid,
    isSettled: row.is_settled,
    status: row.status,
    paidDate: row.paid_date,
    createdAt: row.created_at,
  };
}

export const getInstallmentsByLoan = async (loanId: string): Promise<LoanInstallment[]> => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("loan_id", loanId)
      .order("installment_number", { ascending: true });

    if (error) throw error;

    return parseStringify((data ?? []).map(mapInstallmentRow));
  } catch (error) {
    console.error("Error fetching installments", error);
    return [];
  }
};

// ─── getAllTransactionsByLoan ─────────────────────────────────────────────────
function mapTransactionRow(row: any): LoanTransaction {
  return {
    $id: row.id,
    loanId: row.loan_id,
    clientId: row.client_id,
    amount: row.amount,
    type: row.type,
    paymentMethod: row.payment_method,
    referenceId: row.reference_id,
    comment: row.comment,
    appliedBy: row.applied_by,
    status: row.status,
    allocatedFees: row.allocated_fees ?? 0,
    allocatedPenalties: row.allocated_penalties ?? 0,
    allocatedOverdueInterest: row.allocated_overdue_interest ?? 0,
    allocatedCurrentInterest: row.allocated_current_interest ?? 0,
    allocatedOverduePrincipal: row.allocated_overdue_principal ?? 0,
    allocatedCurrentPrincipal: row.allocated_current_principal ?? 0,
    allocatedToWallet: row.allocated_to_wallet ?? 0,
    date: row.date,
    createdAt: row.created_at,
  };
}

export const getAllTransactionsByLoan = async (loanId: string): Promise<LoanTransaction[]> => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("loan_transactions")
      .select("*")
      .eq("loan_id", loanId)
      .order("date", { ascending: false });

    if (error) throw error;

    return parseStringify((data ?? []).map(mapTransactionRow));
  } catch (error) {
    console.error("Error fetching all transactions", error);
    return [];
  }
};
