"use server";

import { createSupabaseAdminClient } from "../supabase";
import { parseStringify, formatAmount } from "../utils";
import { revalidatePath } from "next/cache";
import { getLoggedInUser, requireManagerRole } from "./user.actions";
import { triggerEventNotification } from "./collections.actions";

function mapPenaltyRow(row: any): Penalty {
  return {
    $id: row.id,
    $createdAt: row.created_at,
    loanId: row.loan_id,
    clientId: row.client_id,
    amount: row.amount,
    penaltyType: row.payment_method, // reusing this field for penalty_type
    comment: row.comment,
    appliedBy: row.applied_by,
    dateApplied: row.date,
    status: row.status,
    reversedAt: row.status === "Reversed" ? row.updated_at || row.created_at : "",
  };
}

export const createPenalty = async ({
  loanId,
  clientId,
  amount,
  penaltyType,
  comment = "",
  appliedBy,
  dateApplied,
}: {
  loanId: string;
  clientId: string;
  amount: number;
  penaltyType: PenaltyType;
  comment?: string;
  appliedBy: string;
  dateApplied: string;
}) => {
  try {
    const currentUser = await requireManagerRole();
    const supabase = createSupabaseAdminClient();

    const { data: agreementCheck } = await supabase
      .from("financing_agreements")
      .select("id")
      .eq("id", loanId)
      .maybeSingle();

    if (agreementCheck) {
      throw new Error("Penalty addition for Hire Purchase contracts is not yet supported via this module.");
    }

    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("status, balance")
      .eq("id", loanId)
      .single();

    if (loanError || !loan) throw new Error("Loan not found.");
    const ALLOWED_STATUSES = ["Active", "Overdue", "Substandard", "Loss"];
    if (!ALLOWED_STATUSES.includes(loan.status)) {
      throw new Error("Penalties can only be applied to Active, Overdue, Substandard, or Loss loans.");
    }
    if (amount <= 0) throw new Error("Penalty amount must be greater than zero.");

    // 1. Attach penalty to an installment
    const { data: installments } = await supabase
      .from("loan_installments")
      .select("id, penalties_due")
      .eq("loan_id", loanId)
      .eq("is_settled", false)
      .order("due_date", { ascending: true })
      .limit(1);

    const targetInstallment = installments && installments.length > 0 ? installments[0] : null;

    if (targetInstallment) {
      await supabase
        .from("loan_installments")
        .update({ penalties_due: targetInstallment.penalties_due + amount })
        .eq("id", targetInstallment.id);
    } else {
      // Fallback to the latest installment
      const { data: lastInst } = await supabase
        .from("loan_installments")
        .select("id, penalties_due")
        .eq("loan_id", loanId)
        .order("due_date", { ascending: false })
        .limit(1)
        .single();

      if (lastInst) {
        await supabase
          .from("loan_installments")
          .update({ penalties_due: lastInst.penalties_due + amount })
          .eq("id", lastInst.id);
      }
    }

    // 2. Insert penalty record into loan_transactions
    const { data: penalty, error: penaltyError } = await supabase
      .from("loan_transactions")
      .insert({
        loan_id: loanId,
        client_id: clientId,
        amount,
        type: "Manual Penalty",
        payment_method: penaltyType, // Using this column to store the penalty type
        comment,
        applied_by: appliedBy,
        date: dateApplied,
        status: "Active",
      })
      .select()
      .single();

    if (penaltyError) throw penaltyError;

    // 3. Ledger self-healing
    const { data: allInstallments } = await supabase
      .from("loan_installments")
      .select("penalties_due, penalties_paid")
      .eq("loan_id", loanId);

    const remainingPenalties = (allInstallments ?? []).reduce(
      (sum, inst) => sum + Math.max(0, inst.penalties_due - inst.penalties_paid),
      0
    );

    await supabase
      .from("loans")
      .update({
        remaining_penalties: remainingPenalties
      })
      .eq("id", loanId);

    const { data: client } = await supabase
      .from("clients")
      .select("outstanding_balance")
      .eq("id", clientId)
      .single();

    if (client) {
      await supabase
        .from("clients")
        .update({ outstanding_balance: (client.outstanding_balance ?? 0) + amount })
        .eq("id", clientId);
    }

    revalidatePath(`/loans/${loanId}`);

    try {
      await triggerEventNotification(loanId, 'PENALTY_APPLIED', { penalty_amount: formatAmount(amount) });
    } catch (notificationError: any) {
      // If the template is simply missing, send a direct notification as fallback
      if (notificationError?.message?.includes('Template PENALTY_APPLIED not found') || notificationError?.message?.includes('not found')) {
        try {
          const supabase = createSupabaseAdminClient();
          const { data: clientRow } = await supabase
            .from('clients')
            .select('full_name, phone, email')
            .eq('id', clientId)
            .single();

          if (clientRow) {
            const { NotificationService } = await import('../notifications');
            const clientName = clientRow.full_name || 'Valued Client';
            const message = `Dear ${clientName}, a penalty of ${formatAmount(amount)} has been applied to your loan account. Please contact us if you have any questions. — Ebenezar Enterprises Car Bazaar LTD`;
            await NotificationService.send({
              loanId,
              clientId,
              templateType: 'PENALTY_APPLIED',
              phone: clientRow.phone,
              email: clientRow.email,
              messageBody: message,
              subject: 'Penalty Applied — Ebenezar Enterprises Car Bazaar LTD',
              channels: ['SMS', 'EMAIL', 'WHATSAPP'],
            });
          }
        } catch (fallbackError) {
          console.error('[createPenalty] Fallback notification also failed:', fallbackError);
        }
      } else {
        console.warn('[createPenalty] Notification failed:', notificationError);
      }
    }

    return parseStringify(mapPenaltyRow(penalty));
  } catch (error) {
    console.error("Error creating penalty:", error);
    throw error;
  }
};

export const getPenaltiesByLoan = async (loanId: string) => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("penalties")
      .select("*")
      .eq("agreement_id", loanId)
      .order("date_applied", { ascending: false });

    if (error) throw error;

    return parseStringify((data ?? []).map((row: any) => ({
      $id: row.id,
      loanId: row.agreement_id,
      penaltyType: row.penalty_type,
      amount: Number(row.amount),
      status: row.status,
      dateApplied: row.date_applied,
      comment: row.comment,
    })));
  } catch (error) {
    console.error("Error fetching penalties:", error);
    return [];
  }
};

export const reversePenalty = async (penaltyId: string, loanId: string) => {
  try {
    const currentUser = await requireManagerRole();

    const supabase = createSupabaseAdminClient();

    const { data: penalty, error: fetchError } = await supabase
      .from("penalties")
      .select("status, amount, client_id")
      .eq("id", penaltyId)
      .single();

    if (fetchError || !penalty) throw new Error("Penalty not found.");
    if (penalty.status === "Reversed") throw new Error("This penalty has already been reversed.");

    const { data: loan } = await supabase
      .from("financing_agreements")
      .select("balance, total_penalties")
      .eq("id", loanId)
      .single();

    // 1. Mark as Reversed
    const { data: reversed, error: reverseError } = await supabase
      .from("penalties")
      .update({ status: "Reversed" })
      .eq("id", penaltyId)
      .select()
      .single();

    if (reverseError) throw reverseError;

    // 2. We don't have penalties_due in financing_installments anymore,
    // so we skip updating the installments array and just update the financing_agreements balance.
    // Instead of installments manipulation, we just reduce total_penalties and balance.

    // 3. Ledger self-healing
    if (loan) {
      await supabase
        .from("financing_agreements")
        .update({
          balance: Math.max(0, Number(loan.balance) - Number(penalty.amount)),
          total_penalties: Math.max(0, Number(loan.total_penalties) - Number(penalty.amount)),
        })
        .eq("id", loanId);
    }

    if (penalty.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("outstanding_balance")
        .eq("id", penalty.client_id)
        .single();

      if (client) {
        await supabase
          .from("clients")
          .update({ outstanding_balance: Math.max(0, (client.outstanding_balance ?? 0) - penalty.amount) })
          .eq("id", penalty.client_id);
      }
    }

    revalidatePath(`/loans/${loanId}`);
    return parseStringify(mapPenaltyRow(reversed));
  } catch (error) {
    console.error("Error reversing penalty:", error);
    throw error;
  }
};
