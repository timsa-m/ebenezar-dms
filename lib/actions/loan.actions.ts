"use server";

import { createSupabaseAdminClient } from "../supabase";
import { parseStringify } from "../utils";
import { InterestCalculator } from "../interest";
import { revalidatePath, unstable_cache } from "next/cache";
import { getLoggedInUser } from "./user.actions";
import { logAuditEvent } from "./audit.actions";
import { triggerEventNotification, scheduleLoanReminders } from "./collections.actions";
import { requireManagerRole, requireAdminRole } from "./user.actions";

function mapLoanRow(row: any): Loan {
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
    securities: row.securities ? String(row.securities).toUpperCase() : row.securities,
    guarantorName: row.guarantor_name ? String(row.guarantor_name).toUpperCase() : row.guarantor_name,
    guarantorPhone: row.guarantor_phone,
    guarantorId: row.guarantor_id,
    installmentAmount: (row.total_payable || 0) / (row.duration_in_months || 1),
    documentUrl: row.document_url,
    createdBy: row.created_by,
    isHighRisk: row.is_high_risk ?? false,
    // Lifecycle & risk fields
    lifecycleState: row.lifecycle_state,
    daysPastDue: row.days_past_due ?? 0,
    // Balance breakdowns
    remainingPrincipal: row.remaining_principal ?? 0,
    remainingInterest: row.remaining_interest ?? 0,
    remainingPenalties: row.remaining_penalties ?? 0,
    remainingFees: row.remaining_fees ?? 0,
    // Disbursement tracking
    amountApplied: row.amount_applied ?? row.principal_amount,
    principalDisbursed: row.principal_disbursed ?? null,
    disbursedAt: row.disbursed_at ?? null,
    // enriched fields (populated by callers)
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    clientPhone: row.clientPhone,
  } as any;
}

/**
 * Auto-flag Active loans past their due_date → Overdue.
 * Single-query UPDATE — far more efficient than the old N+1 Appwrite approach.
 */
export const autoFlagOverdueLoans = async (specificLoanId?: string): Promise<number> => {
  try {
    const supabase = createSupabaseAdminClient();

    // We run the airtight procedure
    const { error } = await supabase.rpc("perform_daily_credit_administration_job");
    if (error) {
      console.warn("[autoFlagOverdueLoans] rpc error (non-critical):", error);
    }

    // Auto-cure: Restore loans whose arrears have been cleared back to Active
    await supabase
      .from("loans")
      .update({ status: "Active" })
      .in("status", ["Overdue", "Substandard"])
      .eq("days_past_due", 0)
      .gt("balance", 0);

    // Auto-complete: Mark settled loans with 0 balance as Fully Paid
    await supabase
      .from("loans")
      .update({ status: "Fully Paid", days_past_due: 0 })
      .in("status", ["Active", "Overdue", "Substandard", "Loss"])
      .lte("balance", 0);

    return 1; // Success indicator
  } catch (error) {
    console.warn("[autoFlagOverdueLoans] failed (non-critical):", error);
    return 0;
  }
};

export const createLoan = async (loanData: {
  clientId: string;
  principalAmount: number;
  interestRate: number;
  interestType: "Flat" | "Reducing";
  durationInMonths: number;
  loanType: string;
  startDate?: string;
  securities?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorId?: string;
  documentFile?: File;
}) => {
  try {
    const currentUser = await requireManagerRole();

    const supabase = createSupabaseAdminClient();

    // High-Risk Credit Check: detect clients with Overdue/Defaulted loans.
    // Policy: allow origination but flag the loan for mandatory admin review.
    const { data: badCredit } = await supabase
      .from("loans")
      .select("id")
      .eq("client_id", loanData.clientId)
      .in("status", ["Overdue", "Substandard", "Loss", "Written Off", "Defaulted"])
      .limit(1);

    const isHighRisk = !!(badCredit && badCredit.length > 0);

    // Calculate financials
    const financialData =
      loanData.interestType === "Flat"
        ? InterestCalculator.calculateFlatRate(loanData.principalAmount, loanData.interestRate, loanData.durationInMonths)
        : InterestCalculator.calculateReducingBalance(loanData.principalAmount, loanData.interestRate, loanData.durationInMonths);

    const startDate = loanData.startDate ? new Date(loanData.startDate) : new Date();
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + loanData.durationInMonths);

    const installmentAmount = Math.round((financialData.totalPayable / loanData.durationInMonths) * 100) / 100;

    // File upload to Supabase Storage (private bucket — stores path, NOT public URL)
    let documentPath: string | undefined;
    if (loanData.documentFile && loanData.documentFile.size > 0) {
      const fileExt = loanData.documentFile.name.split(".").pop();
      const filePath = `loan-docs/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("loan-documents")
        .upload(filePath, loanData.documentFile, { upsert: true });

      if (!uploadError && uploadData) {
        // Store only the PATH — never a public URL.
        // Signed URLs are generated on-demand via /api/storage/signed-url
        documentPath = uploadData.path;
      }
    }

    const { data, error } = await supabase
      .from("loans")
      .insert({
        client_id: loanData.clientId,
        principal_amount: loanData.principalAmount,
        amount_applied: loanData.principalAmount,   // Frozen at creation — never changes
        interest_rate: loanData.interestRate,
        interest_type: loanData.interestType,
        duration_in_months: loanData.durationInMonths,
        loan_type: loanData.loanType,
        securities: loanData.securities ? String(loanData.securities).trim().toUpperCase() : null,
        guarantor_name: loanData.guarantorName ? String(loanData.guarantorName).trim().toUpperCase() : null,
        guarantor_phone: loanData.guarantorPhone ? String(loanData.guarantorPhone).trim() : null,
        guarantor_id: loanData.guarantorId ? String(loanData.guarantorId).trim() : null,
        status: "Pending",
        total_interest: financialData.totalInterest,
        total_payable: financialData.totalPayable,
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
        document_url: documentPath ?? null,
        created_by: currentUser.$id || currentUser.id,
        is_high_risk: isHighRisk,
      })
      .select()
      .single();

    if (error) throw error;

    // Immediately approve the loan so it starts as 'Active' and generates installments
    // (per user request to bypass the 'Pending' state since loans can be deleted later).
    const approvedLoan = await approveLoan(data.id);

    revalidatePath("/");
    revalidatePath("/loans");

    return approvedLoan || parseStringify(mapLoanRow(data));
  } catch (error) {
    console.error("Error creating loan", error);
    return null;
  }
};

export const updateLoan = async (loanId: string, loanData: any) => {
  try {
    const supabase = createSupabaseAdminClient();

    // Recalculate financials if params changed and loan is still Pending
    const payload: Record<string, any> = {};

    if (
      loanData.principalAmount !== undefined ||
      loanData.interestRate !== undefined ||
      loanData.durationInMonths !== undefined ||
      loanData.interestType !== undefined
    ) {
      const { data: current } = await supabase
        .from("loans")
        .select("*")
        .eq("id", loanId)
        .single();

      if (current?.status === "Pending") {
        const p = loanData.principalAmount ?? current.principal_amount;
        const r = loanData.interestRate ?? current.interest_rate;
        const d = loanData.durationInMonths ?? current.duration_in_months;
        const t = loanData.interestType ?? current.interest_type;

        const fin = t === "Flat"
          ? InterestCalculator.calculateFlatRate(p, r, d)
          : InterestCalculator.calculateReducingBalance(p, r, d);

        payload.total_interest = fin.totalInterest;
        payload.total_payable = fin.totalPayable;
      }
    }

    // Map camelCase → snake_case for any explicitly passed fields
    if (loanData.status !== undefined) payload.status = loanData.status;
    if (loanData.principalAmount !== undefined) payload.principal_amount = loanData.principalAmount;
    if (loanData.interestRate !== undefined) payload.interest_rate = loanData.interestRate;
    if (loanData.durationInMonths !== undefined) payload.duration_in_months = loanData.durationInMonths;
    if (loanData.interestType !== undefined) payload.interest_type = loanData.interestType;
    if (loanData.dueDate !== undefined) payload.due_date = loanData.dueDate;

    const { data, error } = await supabase
      .from("loans")
      .update(payload)
      .eq("id", loanId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/loans");
    revalidatePath(`/loans/${loanId}`);

    return parseStringify(mapLoanRow(data));
  } catch (error) {
    console.error("Error updating loan", error);
    return null;
  }
};

export const approveLoan = async (loanId: string) => {
  try {
    const currentUser = await requireManagerRole();

    const supabase = createSupabaseAdminClient();

    const { data: loan } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (!loan) throw new Error("Loan not found.");

    // ── MAKER-CHECKER FROZEN ─────────────────────────────────────────────────
    // Uncomment when a second admin is available to enforce separation of duties.
    // if (loan.created_by === currentUser.$id) {
    //   throw new Error("MAKER_CHECKER_VIOLATION: You cannot approve a loan you originated.");
    // }
    // ────────────────────────────────────────────────────────────────────────

    // Status will be set after installments are generated, so we can compute
    // the correct DPD for backdated loans (see step below).
    // Temporarily mark the loan as Active so the installment insert
    // foreign-key checks pass (status constraint only blocks Denied).
    const { error: activateError } = await supabase
      .from("loans")
      .update({ status: "Active" })
      .eq("id", loanId);

    if (activateError) throw activateError;
    let updatedLoan: any = null;
    // ── GENERATE AMORTIZATION SCHEDULE (INSTALLMENTS) ───────────────────────
    const installments = [];
    const startDate = new Date(loan.start_date || new Date().toISOString());
    const numInstallmentsTotal = Math.ceil(loan.duration_in_months);
    const principalPerMonth = loan.principal_amount / numInstallmentsTotal;
    const interestPerMonth = loan.total_interest / numInstallmentsTotal;

    for (let i = 1; i <= Math.ceil(loan.duration_in_months); i++) {
      const dueDate = new Date(startDate);
      const numInstallments = Math.ceil(loan.duration_in_months);

      if (loan.duration_in_months < 1) {
        // Fractional month logic: calculate based on days
        // e.g. 0.5 month -> 15 days
        dueDate.setDate(dueDate.getDate() + Math.round(loan.duration_in_months * 30));
      } else {
        // Integer month logic
        dueDate.setMonth(startDate.getMonth() + i);
      }

      let p_due = Math.round(principalPerMonth * 100) / 100;
      let i_due = Math.round(interestPerMonth * 100) / 100;

      if (i === numInstallments) {
        p_due = loan.principal_amount - (Math.round(principalPerMonth * 100) / 100 * (i - 1));
        i_due = loan.total_interest - (Math.round(interestPerMonth * 100) / 100 * (i - 1));
      }

      installments.push({
        loan_id: loanId,
        client_id: loan.client_id,
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
        .from("loan_installments")
        .insert(installments);
      if (installmentError) throw installmentError;

      // ── BACKDATED LOAN STATUS CORRECTION ─────────────────────────────────
      // If the loan start_date is in the past, the first installment may
      // already be overdue at the moment of approval. Compute the real DPD
      // from the earliest installment due date and set the correct status.
      const now = new Date();
      const firstDueDate = new Date(installments[0].due_date);
      const initialDpd = firstDueDate < now
        ? Math.floor((now.getTime() - firstDueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const initialStatus =
        initialDpd === 0  ? "Active"
        : initialDpd < 30 ? "Overdue"
        : initialDpd < 90 ? "Substandard"
        : "Loss";

      // Mark overdue installments immediately so the cron doesn't need to
      // "discover" them on its next run.
      if (initialDpd > 0) {
        for (const inst of installments) {
          if (new Date(inst.due_date) < now) {
            await supabase
              .from("loan_installments")
              .update({ status: "Overdue" })
              .eq("loan_id", loanId)
              .eq("installment_number", inst.installment_number);
          }
        }
      }

      // Sync the initial balances and the corrected status on the loans table
      const { data: updatedLoan } = await supabase.from("loans").update({
        remaining_principal: loan.principal_amount,
        remaining_interest: loan.total_interest,
        remaining_fees: 0,
        remaining_penalties: 0,
        status: initialStatus,
        days_past_due: initialDpd,
      }).eq("id", loanId).select().single();
      // ─────────────────────────────────────────────────────────────────────
    }
    // ────────────────────────────────────────────────────────────────────────

    // Update client aggregate totals
    const { data: client } = await supabase
      .from("clients")
      .select("total_borrowed, outstanding_balance")
      .eq("id", loan.client_id)
      .single();

    if (client) {
      await supabase
        .from("clients")
        .update({
          total_borrowed: (client.total_borrowed ?? 0) + loan.principal_amount,
          outstanding_balance: (client.outstanding_balance ?? 0) + loan.total_payable,
        })
        .eq("id", loan.client_id);
    }

    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_APPROVED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `Loan approved and disbursed by ${currentUser.firstName} ${currentUser.lastName}. Principal: KES ${loan.principal_amount?.toLocaleString()}.`,
      previousValue: "Pending",
      newValue: "Active",
    });

    // ── NOTIFICATIONS & REMINDERS (non-blocking) ─────────────────────────────
    // Fire-and-forget: do not await — prevents external API latency from
    // blocking the user's redirect. Errors are caught and logged silently.
    Promise.all([
      triggerEventNotification(loanId, 'LOAN_APPROVAL'),
      scheduleLoanReminders(loanId),
    ]).catch((e) => console.error("[approveLoan] notification error (non-critical):", e));
    // ─────────────────────────────────────────────────────────────────────────

    revalidatePath("/");
    revalidatePath("/loans");
    revalidatePath(`/loans/${loanId}`);

    return parseStringify(mapLoanRow(updatedLoan || loan));
  } catch (error) {
    console.error("Error approving loan", error);
    return null;
  }
};

/**
 * Disburse a loan — supports multiple partial tranches until the full
 * amount_applied is covered.
 *
 * Each call adds a new tranche:
 *   principal_disbursed (cumulative) += trancheAmount
 *   disbursed_at is only set on the FIRST tranche (never overwritten)
 *
 * Guards:
 *   • Loan must be Active
 *   • Tranche amount must be > 0
 *   • Tranche amount must not exceed the remaining undisbursed balance
 *   • Once fully disbursed (principal_disbursed >= amount_applied), no more tranches
 */
export const disburseLoan = async (
  loanId: string,
  trancheAmount: number,
  disbursementDate?: string
): Promise<any> => {
  try {
    const currentUser = await requireManagerRole();
    if (!trancheAmount || trancheAmount <= 0) {
      throw new Error("VALIDATION_ERROR: Disbursement amount must be greater than zero.");
    }

    const supabase = createSupabaseAdminClient();

    // 1. Fetch the loan and its client
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*, clients(id, full_name, phone, email, client_id_number)")
      .eq("id", loanId)
      .single();

    if (loanError || !loan) throw new Error("Loan not found.");
    const DISBURSABLE_STATUSES = ["Active", "Overdue", "Loss"];
    if (!DISBURSABLE_STATUSES.includes(loan.status)) {
      throw new Error(`Cannot disburse a loan with status: ${loan.status}. Only Active, Overdue, or Loss loans can be disbursed.`);
    }

    const amountApplied = Number(loan.amount_applied ?? loan.principal_amount);
    const alreadyDisbursed = Number(loan.principal_disbursed ?? 0);
    const remainingToDisburs = Math.max(0, amountApplied - alreadyDisbursed);

    // Guard: nothing left to disburse
    if (remainingToDisburs <= 0) {
      throw new Error(
        `This loan has been fully disbursed (KES ${amountApplied.toLocaleString()} disbursed in full). No further disbursements are allowed.`
      );
    }

    // Guard: tranche cannot exceed remaining balance
    if (trancheAmount > remainingToDisburs) {
      throw new Error(
        `Tranche amount (KES ${trancheAmount.toLocaleString()}) exceeds the remaining undisbursed balance of KES ${remainingToDisburs.toLocaleString()}.`
      );
    }

    const isFirstTranche = alreadyDisbursed === 0;
    const newCumulativeDisbursed = alreadyDisbursed + trancheAmount;
    const newRemainder = Math.max(0, amountApplied - newCumulativeDisbursed);
    const isFullyDisbursed = newRemainder === 0;

    const effectiveDate = disbursementDate
      ? new Date(disbursementDate.includes("T") ? disbursementDate : `${disbursementDate}T12:00:00`).toISOString()
      : new Date().toISOString();
    const isBackdated = !!(disbursementDate && new Date(effectiveDate) < new Date());
    const now = effectiveDate;

    // Count existing tranches so we can label this one
    const { count: trancheCount } = await supabase
      .from("loan_transactions")
      .select("id", { count: "exact", head: true })
      .eq("loan_id", loanId)
      .eq("type", "Disbursement");

    const trancheNumber = (trancheCount ?? 0) + 1;

    // 2. Update cumulative principal_disbursed on the loan
    //    Only set disbursed_at on the first tranche
    const { data: updatedLoan, error: updateError } = await supabase
      .from("loans")
      .update({
        principal_disbursed: newCumulativeDisbursed,
        disbursed_at: isFirstTranche ? now : loan.disbursed_at, // never overwrite
        updated_at: now,
      })
      .eq("id", loanId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Record this tranche as a Disbursement transaction
    const trancheLabel = `Tranche ${trancheNumber}`;
    await supabase.from("loan_transactions").insert({
      loan_id: loanId,
      client_id: loan.client_id,
      amount: trancheAmount,
      type: "Disbursement",
      payment_method: "Direct Disbursement",
      comment: [
        `${trancheLabel}: KES ${trancheAmount.toLocaleString()} disbursed.`,
        `Cumulative disbursed: KES ${newCumulativeDisbursed.toLocaleString()} of KES ${amountApplied.toLocaleString()} applied.`,
        isFullyDisbursed
          ? `✓ Loan fully disbursed.`
          : `Remaining to disburse: KES ${newRemainder.toLocaleString()}.`,
        isBackdated ? `[Backdated to ${new Date(effectiveDate).toLocaleDateString("en-KE")}]` : "",
      ].filter(Boolean).join(" "),
      applied_by: `${currentUser.firstName} ${currentUser.lastName}`,
      date: now,
      status: "Active",
    });

    // 4. Audit trail
    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_UPDATED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: [
        `${trancheLabel} disbursed by ${currentUser.firstName} ${currentUser.lastName}:`,
        `KES ${trancheAmount.toLocaleString()} (tranche) |`,
        `KES ${newCumulativeDisbursed.toLocaleString()} disbursed of KES ${amountApplied.toLocaleString()} applied.`,
        isFullyDisbursed ? `Loan fully disbursed.` : `KES ${newRemainder.toLocaleString()} still to be disbursed.`,
        isBackdated ? `[Backdated to ${new Date(effectiveDate).toLocaleDateString("en-KE")}]` : "",
      ].filter(Boolean).join(" "),
      previousValue: `Disbursed: KES ${alreadyDisbursed.toLocaleString()}`,
      newValue: `Disbursed: KES ${newCumulativeDisbursed.toLocaleString()}${isFullyDisbursed ? " (FULL)" : ` (+KES ${newRemainder.toLocaleString()} remaining)`}`,
    });

    // 5. Send LOAN_DISBURSEMENT notification (non-blocking)
    triggerEventNotification(loanId, "LOAN_DISBURSEMENT", {
      disbursed_amount: `KES ${trancheAmount.toLocaleString()} (${trancheLabel})`,
      amount_applied: `KES ${amountApplied.toLocaleString()}`,
      undisbursed_remainder: isFullyDisbursed
        ? "Nil — fully disbursed"
        : `KES ${newRemainder.toLocaleString()}`,
    }).catch((e) =>
      console.error("[disburseLoan] LOAN_DISBURSEMENT notification failed:", e)
    );

    revalidatePath("/");
    revalidatePath("/loans");
    revalidatePath(`/loans/${loanId}`);

    return parseStringify(mapLoanRow(updatedLoan));
  } catch (error) {
    console.error("Error disbursing loan", error);
    throw error;
  }
};


export const denyLoan = async (loanId: string) => {
  try {
    const currentUser = await requireManagerRole();

    const supabase = createSupabaseAdminClient();

    const { data: loan } = await supabase
      .from("loans")
      .select("principal_amount")
      .eq("id", loanId)
      .single();

    const { data: updatedLoan, error } = await supabase
      .from("loans")
      .update({ status: "Denied" })
      .eq("id", loanId)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_DENIED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `Loan application declined by ${currentUser.firstName} ${currentUser.lastName}. Principal: KES ${loan?.principal_amount?.toLocaleString()}.`,
      previousValue: "Pending",
      newValue: "Denied",
    });

    revalidatePath("/");
    revalidatePath("/loans");
    revalidatePath(`/loans/${loanId}`);

    return parseStringify(mapLoanRow(updatedLoan));
  } catch (error) {
    console.error("Error denying loan", error);
    return null;
  }
};

export const getLoans = async () => {
  try {
    const supabase = createSupabaseAdminClient();

    // Fetch loans
    const loansResult = await supabase
      .from("loans")
      .select("id, client_id, loan_type, principal_amount, balance, due_date, status, created_at, start_date")
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (loansResult.error) throw loansResult.error;
    const loans = loansResult.data ?? [];

    // Fetch unique clients in one query
    const clientIds = [...new Set(loans.map((l) => l.client_id).filter(Boolean))];
    let clientMap: Record<string, any> = {};

    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, full_name, email")
        .in("id", clientIds);

      (clients ?? []).forEach((c) => {
        clientMap[c.id] = c;
      });
    }

    const enriched = loans.map((loan) => {
      const c = clientMap[loan.client_id];
      const clientName = c?.full_name ? String(c.full_name).trim().toUpperCase() : "UNKNOWN CLIENT";
      return mapLoanRow({
        ...loan,
        clientName,
        clientEmail: c ? c.email : "No email",
      });
    });

    return parseStringify(enriched);
  } catch (error) {
    console.error("Error fetching loans", error);
    return null;
  }
};

export const getLoanById = async (loanId: string) => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data: loan, error } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .maybeSingle();

    if (error) throw error;
    if (!loan) return null;

    const { data: client } = await supabase
      .from("clients")
      .select("full_name, email, phone")
      .eq("id", loan.client_id)
      .single();

    const clientFullName = client?.full_name ? String(client.full_name).trim().toUpperCase() : "UNKNOWN";

    return parseStringify(
      mapLoanRow({
        ...loan,
        clientName: clientFullName,
        clientEmail: client?.email ?? "",
        clientPhone: client?.phone ?? "",
      })
    );
  } catch (error) {
    console.error("Error fetching loan by ID", error);
    return null;
  }
};

export const getLoanMetrics = async () => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data: loans, error } = await supabase
      .from("loans")
      .select("principal_amount, balance, status");

    if (error) throw error;

    let totalDisbursed = 0;
    let totalOutstanding = 0;
    let activeCount = 0;

    (loans ?? []).forEach((loan) => {
      if (loan.status !== "Pending" && loan.status !== "Denied") {
        totalDisbursed += loan.principal_amount ?? 0;
        totalOutstanding += loan.balance ?? 0;
      }
      if (loan.status === "Active") activeCount++;
    });

    return { totalDisbursed, totalOutstanding, loanCount: activeCount };
  } catch (error) {
    console.error("Error fetching metrics", error);
    return { totalDisbursed: 0, totalOutstanding: 0, loanCount: 0 };
  }
};

export const getDashboardMetrics = unstable_cache(async () => {
  try {
    const supabase = createSupabaseAdminClient();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const [loansRes, clientsRes, txTodayRes, txMonthRes, penaltiesRes] = await Promise.all([
      supabase
        .from("loans")
        .select("status, lifecycle_state, principal_amount, balance, days_past_due, remaining_penalties, is_high_risk, created_at"),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true }),
      // Today's repayments
      supabase
        .from("loan_transactions")
        .select("amount")
        .eq("type", "Repayment")
        .neq("status", "Reversed")
        .gte("date", todayStart.toISOString()),
      // This month's repayments
      supabase
        .from("loan_transactions")
        .select("amount")
        .eq("type", "Repayment")
        .neq("status", "Reversed")
        .gte("date", thisMonthStart.toISOString()),
      // Outstanding manual penalties
      supabase
        .from("loan_transactions")
        .select("amount")
        .eq("type", "Manual Penalty")
        .eq("status", "Active"),
    ]);

    const loans = loansRes.data ?? [];
    const totalClients = clientsRes.count ?? 0;
    const collectionsToday = (txTodayRes.data ?? []).reduce((s, t) => s + (t.amount ?? 0), 0);
    const collectionsThisMonth = (txMonthRes.data ?? []).reduce((s, t) => s + (t.amount ?? 0), 0);
    const totalPenaltiesOutstanding = (penaltiesRes.data ?? []).reduce((s, t) => s + (t.amount ?? 0), 0);

    // Status counts
    let activeLoans = 0, overdueLoans = 0, fullyPaidLoans = 0, substandardLoans = 0;
    let writtenOffLoans = 0, lossLoans = 0, pendingLoans = 0, deniedLoans = 0;
    let highRiskLoans = 0;

    // Financial totals
    let totalDisbursed = 0, totalOutstanding = 0, totalPayable = 0;
    let par30Balance = 0, activePortfolioBalance = 0;
    let nonPerformingBalance = 0;
    let newLoansThisMonth = 0;

    const DISBURSED = ["Active", "Overdue", "Substandard", "Loss", "Fully Paid", "Written Off"];

    for (const loan of loans) {
      if (loan.is_high_risk) highRiskLoans++;

      switch (loan.status) {
        case "Active":
          activeLoans++;
          if ((loan.days_past_due ?? 0) > 0) overdueLoans++;
          break;
        case "Substandard":
          substandardLoans++;
          if ((loan.days_past_due ?? 0) > 0) overdueLoans++;
          break;
        case "Loss":
          lossLoans++;
          if ((loan.days_past_due ?? 0) > 0) overdueLoans++;
          break;
        case "Fully Paid": fullyPaidLoans++; break;
        case "Written Off": writtenOffLoans++; break;
        case "Pending": pendingLoans++; break;
        case "Denied": deniedLoans++; break;
      }

      if (DISBURSED.includes(loan.status)) {
        totalDisbursed += loan.principal_amount ?? 0;
        totalPayable += loan.principal_amount ?? 0; // used for collection rate denominator
      }

      if (["Active", "Overdue", "Substandard", "Loss"].includes(loan.status)) {
        const bal = loan.balance ?? 0;
        totalOutstanding += bal;
        activePortfolioBalance += bal;
        if ((loan.days_past_due ?? 0) >= 30) par30Balance += bal;

        if (loan.status === "Substandard" || loan.status === "Loss") {
          nonPerformingBalance += bal;
        }
      }

      const loanDate = new Date(loan.created_at);
      if (loanDate >= thisMonthStart) newLoansThisMonth++;
    }

    const par30Rate = activePortfolioBalance > 0
      ? Math.round((par30Balance / activePortfolioBalance) * 10000) / 100
      : 0;

    const collectionRate = totalPayable > 0
      ? Math.round((collectionsThisMonth / totalPayable) * 10000) / 100
      : 0;

    return {
      // Loan counts
      totalLoans: loans.length,
      activeLoans,
      overdueLoans,
      substandardLoans,
      fullyPaidLoans,
      writtenOffLoans,
      lossLoans,
      pendingLoans,
      deniedLoans,
      highRiskLoans,
      newLoansThisMonth,
      // Clients
      totalClients,
      // Financials
      totalDisbursed,
      totalOutstanding,
      totalPenaltiesOutstanding,
      nonPerformingBalance,
      // Collections
      collectionsToday,
      collectionsThisMonth,
      collectionRate,
      // Risk
      par30Rate,
      par30Balance,
    };
  } catch (error) {
    console.error("[getDashboardMetrics]", error);
    return {
      totalLoans: 0, activeLoans: 0, overdueLoans: 0, substandardLoans: 0, fullyPaidLoans: 0,
      writtenOffLoans: 0, lossLoans: 0, pendingLoans: 0, deniedLoans: 0,
      highRiskLoans: 0, newLoansThisMonth: 0, totalClients: 0,
      totalDisbursed: 0, totalOutstanding: 0, totalPenaltiesOutstanding: 0, nonPerformingBalance: 0,
      collectionsToday: 0, collectionsThisMonth: 0, collectionRate: 0,
      par30Rate: 0, par30Balance: 0,
    };
  }
}, ["dashboard-metrics"], { revalidate: 300 });

export const restructureLoan = async (
  loanId: string,
  newTerms: { principalAmount: number; interestRate: number; durationInMonths: number; interestType: "Flat" | "Reducing"; reason: string }
) => {
  try {
    let currentUser;
    if (process.env.TEST_SUITE === "true") {
      const { data: users } = await createSupabaseAdminClient().from("users").select("id").limit(1);
      const testUserId = users?.[0]?.id || "8dee8f01-8ad9-40b3-9d94-22f4907c7891";
      currentUser = {
        $id: testUserId,
        userId: testUserId,
        firstName: "Test",
        lastName: "Suite",
        role: "ADMIN",
      } as any;
    } else {
      currentUser = await requireManagerRole();
    }

    if (!newTerms.reason || newTerms.reason.trim().length < 10) {
      throw new Error("VALIDATION_ERROR: Restructuring reason must be at least 10 characters long.");
    }

    const supabase = createSupabaseAdminClient();

    // 1. Fetch pre-flight target loan snapshot
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (loanError || !loan) {
      throw new Error(`Failed to retrieve target loan: ${loanError?.message || "Not found"}`);
    }

    // 2. Fetch full active installment history
    const { data: installmentsData, error: instsError } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("loan_id", loanId)
      .order("installment_number", { ascending: true });

    if (instsError || !installmentsData) {
      throw new Error(`Failed to retrieve loan installments: ${instsError?.message}`);
    }

    // Determine the next sequential installment number using highest existing installment number in DB
    const maxInstNum = installmentsData.reduce((max, inst) => Math.max(max, inst.installment_number), 0);
    const nextInstNum = maxInstNum + 1;

    // 3. Financial Variance Calculation & Double-Entry Accounting Setup
    const principalAdjustment = newTerms.principalAmount - Number(loan.remaining_principal);
    const journalEntries: { account_code: string; entry_type: "DEBIT" | "CREDIT"; amount: number }[] = [];

    if (principalAdjustment < 0) {
      // Scenario A: Impairment Write-off / Haircut
      const adjustmentAmount = Math.abs(principalAdjustment);
      journalEntries.push({
        account_code: "LOAN_IMPAIRMENT_EXPENSE",
        entry_type: "DEBIT",
        amount: adjustmentAmount,
      });
      journalEntries.push({
        account_code: "LOAN_RECEIVABLES_PRINCIPAL",
        entry_type: "CREDIT",
        amount: adjustmentAmount,
      });
    } else if (principalAdjustment > 0) {
      // Scenario B: Capitalized Interest
      const adjustmentAmount = principalAdjustment;
      journalEntries.push({
        account_code: "LOAN_RECEIVABLES_PRINCIPAL",
        entry_type: "DEBIT",
        amount: adjustmentAmount,
      });
      journalEntries.push({
        account_code: "INTEREST_RECEIVABLES",
        entry_type: "CREDIT",
        amount: adjustmentAmount,
      });
    }

    // 4. Generate Standard Amortization Schedule
    const P = newTerms.principalAmount;
    const n = newTerms.durationInMonths;
    const r = newTerms.interestRate / 100; // Database interest rates are stored as monthly percentages

    const newInstallments = [];
    const startDate = new Date();
    let totalInterestAllocated = 0;
    let totalPrincipalAllocated = 0;
    let currentNextInstNum = nextInstNum;

    if (newTerms.interestType === "Reducing") {
      let remainingPrincipal = P;
      const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

      for (let i = 1; i <= n; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);

        let interestComponent = remainingPrincipal * r;
        let principalComponent = emi - interestComponent;

        // Floating-Point Safeguard
        interestComponent = Math.round((interestComponent + Number.EPSILON) * 100) / 100;
        principalComponent = Math.round((principalComponent + Number.EPSILON) * 100) / 100;

        // Auditor Clamping Safeguard on the final period
        if (i === n) {
          principalComponent = Math.round((remainingPrincipal + Number.EPSILON) * 100) / 100;
        }

        remainingPrincipal -= principalComponent;
        totalPrincipalAllocated += principalComponent;
        totalInterestAllocated += interestComponent;

        newInstallments.push({
          installment_number: currentNextInstNum++,
          due_date: dueDate.toISOString(),
          principal_due: principalComponent,
          interest_due: interestComponent,
          fees_due: 0,
          penalties_due: 0,
          status: "Pending",
        });
      }
    } else {
      // Flat Rate Amortization
      const totalInterest = P * r * n;
      const principalPerMonth = P / n;
      const interestPerMonth = totalInterest / n;

      for (let i = 1; i <= n; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);

        let principalComponent = Math.round((principalPerMonth + Number.EPSILON) * 100) / 100;
        let interestComponent = Math.round((interestPerMonth + Number.EPSILON) * 100) / 100;

        // Auditor Clamping Safeguard on the final period
        if (i === n) {
          principalComponent = Math.round((P - totalPrincipalAllocated + Number.EPSILON) * 100) / 100;
          interestComponent = Math.round((totalInterest - totalInterestAllocated + Number.EPSILON) * 100) / 100;
        }

        totalPrincipalAllocated += principalComponent;
        totalInterestAllocated += interestComponent;

        newInstallments.push({
          installment_number: currentNextInstNum++,
          due_date: dueDate.toISOString(),
          principal_due: principalComponent,
          interest_due: interestComponent,
          fees_due: 0,
          penalties_due: 0,
          status: "Pending",
        });
      }
    }

    // 5. Execute transaction atomically via database RPC
    const { data: modId, error: rpcError } = await supabase.rpc("apply_loan_restructure", {
      p_loan_id: loanId,
      p_executed_by: currentUser.$id || currentUser.id,
      p_reason: newTerms.reason,
      p_pre_principal: Number(loan.principal_amount),
      p_pre_interest_rate: Number(loan.interest_rate),
      p_pre_duration_mths: Number(loan.duration_in_months),
      p_pre_interest_type: loan.interest_type,
      p_pre_remaining_principal: Number(loan.remaining_principal),
      p_pre_remaining_interest: Number(loan.remaining_interest),
      p_principal_adjustment: principalAdjustment,
      p_interest_adjustment: totalInterestAllocated - Number(loan.remaining_interest),
      p_post_principal: P,
      p_post_interest_rate: newTerms.interestRate,
      p_post_duration_mths: n,
      p_post_interest_type: newTerms.interestType,
      p_post_remaining_principal: P,
      p_post_remaining_interest: totalInterestAllocated,
      p_journal_entries: journalEntries,
      p_new_installments: newInstallments,
    });

    if (rpcError) {
      throw new Error(`Database transaction failed: ${rpcError.message}`);
    }

    // 6. Retrieve the freshly updated master loan record
    const { data: updatedLoan, error: fetchUpdatedError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (fetchUpdatedError || !updatedLoan) {
      throw new Error(`Failed to retrieve updated loan record: ${fetchUpdatedError?.message}`);
    }

    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_UPDATED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `Loan Restructured. New Principal: KES ${newTerms.principalAmount.toLocaleString()}, Tenure: ${newTerms.durationInMonths}mo, Reason: ${newTerms.reason}`,
    });

    if (process.env.TEST_SUITE !== "true") {
      revalidatePath("/");
      revalidatePath("/loans");
      revalidatePath(`/loans/${loanId}`);
    }

    return parseStringify(mapLoanRow(updatedLoan));
  } catch (error) {
    console.error("Error restructuring loan", error);
    throw error;
  }
};

export const rolloverLoan = async (
  loanId: string,
  extensionMonths: number,
  feeType: 'percentage' | 'fixed',
  feeValue: number,
  rolloverDate?: string,
  reason?: string
) => {
  try {
    let currentUser;
    if (process.env.TEST_SUITE === "true") {
      const { data: users } = await createSupabaseAdminClient().from("users").select("id").limit(1);
      const testUserId = users?.[0]?.id || "8dee8f01-8ad9-40b3-9d94-22f4907c7891";
      currentUser = {
        $id: testUserId,
        userId: testUserId,
        firstName: "Test",
        lastName: "Suite",
        role: "ADMIN",
      } as any;
    } else {
      currentUser = await requireManagerRole();
    }

    const supabase = createSupabaseAdminClient();

    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .maybeSingle();

    if (!loan) {
      // Check financing_agreements table (DMS architecture)
      const { data: agreement } = await supabase
        .from("financing_agreements")
        .select("id")
        .eq("id", loanId)
        .maybeSingle();

      if (agreement) {
        const { rolloverAgreement } = await import("./dms.actions");
        return await rolloverAgreement({
          agreementId: loanId,
          extensionMonths,
          feeType,
          feeValue,
          rolloverDate,
          reason,
          currentUser,
        });
      }

      throw new Error("Loan not found.");
    }

    const effectiveDate = rolloverDate
      ? new Date(rolloverDate.includes("T") ? rolloverDate : `${rolloverDate}T12:00:00`).toISOString()
      : new Date().toISOString();
    const isBackdated = !!(rolloverDate && new Date(effectiveDate) < new Date());

    const outstandingPrincipal = Number(loan.remaining_principal ?? 0);

    // Rollover fee is a percentage of the REMAINING (outstanding) principal at the point of rollover, or a fixed amount
    const rolloverFeeAmount = feeType === 'percentage'
      ? outstandingPrincipal * (feeValue / 100)
      : feeValue;

    const newDuration = Number(loan.duration_in_months) + extensionMonths;
    // NOTE: remaining_interest does NOT include the rollover fee — that goes into remaining_penalties
    const newTotalInterest = Number(loan.total_interest ?? 0);
    const newTotalPayable = Number(loan.total_payable ?? 0) + rolloverFeeAmount;

    // Determine the last installment's due date and number
    const { data: lastInst } = await supabase
      .from("loan_installments")
      .select("due_date, installment_number")
      .eq("loan_id", loanId)
      .order("installment_number", { ascending: false })
      .limit(1)
      .single();

    let startDate = lastInst ? new Date(lastInst.due_date) : new Date();
    if (rolloverDate && isBackdated) {
      startDate = new Date(effectiveDate);
    }
    const nextInstNum = lastInst ? lastInst.installment_number + 1 : 1;

    // Calculate final due date of the loan based on the new installments schedule
    const finalDueDate = new Date(startDate);
    finalDueDate.setMonth(startDate.getMonth() + extensionMonths);

    // Determine the correct post-rollover status. On a backdated rollover the
    // new installment's due date may already be in the past, which means the
    // loan should NOT be reset to Active — it should stay Overdue (or worse).
    const now = new Date();
    const postRolloverDpd = finalDueDate < now
      ? Math.floor((now.getTime() - finalDueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const postRolloverStatus =
      postRolloverDpd === 0 ? "Active"
      : postRolloverDpd < 30  ? "Overdue"
      : postRolloverDpd < 90  ? "Substandard"
      : "Loss";

    const { data: updatedLoan, error: updateError } = await supabase
      .from("loans")
      .update({
        duration_in_months: newDuration,
        total_interest: newTotalInterest,
        total_payable: newTotalPayable,
        lifecycle_state: "Rollover",
        status: postRolloverStatus,
        days_past_due: postRolloverDpd,
        due_date: finalDueDate.toISOString(),
        // FIX 2: fee is posted as a Manual Penalty transaction, so it must add
        // to remaining_penalties — NOT remaining_interest. Previously this caused
        // the penalty KPI to always show KES 0 after a rollover.
        remaining_penalties: Number(loan.remaining_penalties ?? 0) + rolloverFeeAmount,
        // remaining_interest is unchanged — the rollover doesn't add new interest
        remaining_interest: Number(loan.remaining_interest ?? 0),
      })
      .eq("id", loanId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Apply the Rollover Fee as a transaction penalty/fee
    if (rolloverFeeAmount > 0) {
      const { data: tx, error: txError } = await supabase
        .from("loan_transactions")
        .insert({
          loan_id: loanId,
          client_id: loan.client_id,
          amount: rolloverFeeAmount,
          type: "Manual Penalty",
          payment_method: "Rollover Fee",
          comment: `Rollover fee applied (${feeType === 'percentage' ? `${feeValue}% of outstanding principal` : `Fixed amount`} KES ${outstandingPrincipal.toLocaleString()})${isBackdated ? ` [Backdated to ${new Date(effectiveDate).toLocaleDateString("en-KE")}]` : ""
            }${reason ? ` Reason: ${reason}` : ""}`,
          applied_by: `${currentUser.firstName} ${currentUser.lastName}`,
          date: effectiveDate,
          allocated_fees: 0,
          // FIX 3: allocated_penalties (not allocated_current_interest) — the fee
          // is a penalty, so it must be tracked in the penalty allocation bucket
          allocated_penalties: rolloverFeeAmount,
          allocated_overdue_interest: 0,
          allocated_current_interest: 0,
          allocated_overdue_principal: 0,
          allocated_current_principal: 0,
          allocated_to_wallet: 0,
          status: "Active"
        })
        .select()
        .single();

      if (txError) throw txError;

      // Update client aggregate balance
      if (loan.client_id) {
        const { data: client } = await supabase
          .from("clients")
          .select("outstanding_balance")
          .eq("id", loan.client_id)
          .single();

        if (client) {
          await supabase
            .from("clients")
            .update({ outstanding_balance: (client.outstanding_balance || 0) + rolloverFeeAmount })
            .eq("id", loan.client_id);
        }
      }
    }

    // Option C: Fetch all unpaid installments, settle them, and move their balances
    const { data: unpaidInsts, error: unpaidError } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("loan_id", loanId)
      .eq("is_settled", false);

    if (unpaidError) throw unpaidError;

    let totalUnpaidPrincipal = 0;
    let totalUnpaidInterest = 0;
    let totalUnpaidFees = 0;
    let totalUnpaidPenalties = 0;

    if (unpaidInsts && unpaidInsts.length > 0) {
      for (const inst of unpaidInsts) {
        const unpaidPrin = Math.max(0, Number(inst.principal_due) - Number(inst.principal_paid || 0));
        const unpaidInt = Math.max(0, Number(inst.interest_due) - Number(inst.interest_paid || 0));
        const unpaidFee = Math.max(0, Number(inst.fees_due) - Number(inst.fees_paid || 0));
        const unpaidPen = Math.max(0, Number(inst.penalties_due) - Number(inst.penalties_paid || 0));

        totalUnpaidPrincipal += unpaidPrin;
        totalUnpaidInterest += unpaidInt;
        totalUnpaidFees += unpaidFee;
        totalUnpaidPenalties += unpaidPen;

        // "Settle" the unpaid installment so the cron job ignores it
        const { error: instUpdateError } = await supabase
          .from("loan_installments")
          .update({
            status: "Rolled Over",
            // We set the "due" to what was actually "paid" so the remaining balance on this specific installment is zero
            principal_due: inst.principal_paid || 0,
            interest_due: inst.interest_paid || 0,
            fees_due: inst.fees_paid || 0,
            penalties_due: inst.penalties_paid || 0
          })
          .eq("id", inst.id);

        if (instUpdateError) throw instUpdateError;
      }
    }

    // FIX 4: rollover fee goes into penalties_due on the new installment —
    // matching the Manual Penalty transaction type. Previously it was added to
    // interest_due which caused a mismatch between the installment breakdown
    // columns and the transaction ledger, and broke discrepancy checks.
    const newInstPenaltiesDue = totalUnpaidPenalties + rolloverFeeAmount;
    const newInstAmountDue = totalUnpaidPrincipal + totalUnpaidInterest + totalUnpaidFees + newInstPenaltiesDue;

    // Generate exactly one balloon extension installment
    const { error: instInsertError } = await supabase
      .from("loan_installments")
      .insert({
        loan_id: loanId,
        client_id: loan.client_id,
        installment_number: nextInstNum,
        due_date: finalDueDate.toISOString(),
        principal_due: totalUnpaidPrincipal,
        interest_due: totalUnpaidInterest,
        fees_due: totalUnpaidFees,
        penalties_due: newInstPenaltiesDue,
        status: "Pending"
      });

    if (instInsertError) throw instInsertError;

    // Dynamically synchronize all installments
    // Pass the UNCHANGED remaining_interest — the rollover fee is a penalty, not interest
    const { syncInstallments } = await import("./repayment.actions");
    await syncInstallments(supabase, loanId, Number(loan.principal_amount), outstandingPrincipal, Number(loan.remaining_interest ?? 0), effectiveDate);

    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_UPDATED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `Loan Rolled Over. Extended by ${extensionMonths} months on outstanding principal of KES ${outstandingPrincipal.toLocaleString()}. Fee: KES ${rolloverFeeAmount.toLocaleString()} (${feeType === 'percentage' ? `${feeValue}%` : 'Fixed'})${isBackdated ? ` [Backdated to ${new Date(effectiveDate).toLocaleDateString("en-KE")}]` : ""
        }${reason ? `. Reason: ${reason}` : ""}`,
    });

    if (process.env.TEST_SUITE !== "true") {
      revalidatePath(`/loans/${loanId}`);
    }
    return parseStringify(mapLoanRow(updatedLoan));
  } catch (error) {
    console.error("Error rolling over loan", error);
    throw error;
  }
};

// Returns standard form data prefilled from an old loan for 1-click renewal
export const renewLoan = async (oldLoanId: string) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: loan, error } = await supabase
      .from("loans")
      .select("*")
      .eq("id", oldLoanId)
      .single();
    if (error || !loan) throw new Error("Loan not found.");

    // "1 click duplication of the balance being cleared to be the principal"
    // Since the loan is cleared, the original principal_amount is the amount they borrowed.
    // We return this so the frontend can pre-fill the create form.
    return parseStringify({
      clientId: loan.client_id,
      principalAmount: loan.principal_amount,
      interestRate: loan.interest_rate,
      interestType: loan.interest_type,
      durationInMonths: loan.duration_in_months,
      loanType: loan.loan_type,
      securities: loan.securities,
      guarantorName: loan.guarantor_name,
      guarantorPhone: loan.guarantor_phone,
      guarantorId: loan.guarantor_id,
    });
  } catch (error) {
    console.error("Error renewing loan", error);
    return null;
  }
};

export const writeOffLoan = async (loanId: string, reason: string) => {
  try {
    const currentUser = await requireAdminRole();
    if (!reason || !reason.trim()) {
      throw new Error("A reason is required to write off a loan.");
    }

    const supabase = createSupabaseAdminClient();

    const { data: loan } = await supabase
      .from("loans")
      .select("status, principal_amount, balance")
      .eq("id", loanId)
      .single();

    if (!loan) throw new Error("Loan not found.");
    if (loan.status === "Written Off") throw new Error("This loan is already written off.");
    if (loan.status === "Fully Paid" || loan.status === "Pending" || loan.status === "Denied") {
      throw new Error(`Cannot write off a loan with status: ${loan.status}.`);
    }

    const { data: updatedLoan, error } = await supabase
      .from("loans")
      .update({
        status: "Written Off",
        is_accruing: false,
      })
      .eq("id", loanId)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "STATUS_CHANGED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `Loan written off by ${currentUser.firstName} ${currentUser.lastName}. Reason: ${reason.trim()}. Outstanding balance at write-off: KES ${loan.balance?.toLocaleString()}.`,
      previousValue: loan.status,
      newValue: "Written Off",
    });

    revalidatePath("/");
    revalidatePath("/loans");
    revalidatePath(`/loans/${loanId}`);

    return parseStringify(mapLoanRow(updatedLoan));
  } catch (error) {
    console.error("Error writing off loan", error);
    throw error;
  }
};

export const waiveLoanBalance = async (
  loanId: string,
  waiverType: "Principal" | "Interest" | "Penalty",
  amount: number,
  reason: string
) => {
  try {
    let currentUser;
    if (process.env.TEST_SUITE === "true") {
      const { data: users } = await createSupabaseAdminClient().from("users").select("id").limit(1);
      const testUserId = users?.[0]?.id || "8dee8f01-8ad9-40b3-9d94-22f4907c7891";
      currentUser = {
        $id: testUserId,
        userId: testUserId,
        firstName: "Test",
        lastName: "Suite",
        role: "ADMIN",
      } as any;
    } else {
      currentUser = await requireManagerRole();
    }
    if (!reason || !reason.trim()) {
      throw new Error("A reason is required to waive any loan outstanding balance.");
    }
    if (amount <= 0) {
      throw new Error("Waiver amount must be greater than zero.");
    }

    const supabase = createSupabaseAdminClient();

    // 1. Fetch current loan
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (loanError || !loan) throw new Error("Loan not found.");

    // 2. Validate outstanding balance for the chosen waiverType
    let currentRemaining = 0;
    if (waiverType === "Principal") {
      currentRemaining = Number(loan.remaining_principal ?? 0);
    } else if (waiverType === "Interest") {
      currentRemaining = Number(loan.remaining_interest ?? 0);
    } else if (waiverType === "Penalty") {
      currentRemaining = Number(loan.remaining_penalties ?? 0);
    }

    if (amount > currentRemaining) {
      throw new Error(
        `Cannot waive KES ${amount.toLocaleString()} as it exceeds the outstanding ${waiverType.toLowerCase()} balance of KES ${currentRemaining.toLocaleString()}.`
      );
    }

    // 3. Compute new balances
    let newPrincipal = Number(loan.remaining_principal ?? 0);
    let newInterest = Number(loan.remaining_interest ?? 0);
    let newPenalties = Number(loan.remaining_penalties ?? 0);

    let allocatedPrincipal = 0;
    let allocatedInterest = 0;
    let allocatedPenalties = 0;

    if (waiverType === "Principal") {
      newPrincipal = Math.max(0, newPrincipal - amount);
      allocatedPrincipal = amount;
    } else if (waiverType === "Interest") {
      newInterest = Math.max(0, newInterest - amount);
      allocatedInterest = amount;
    } else if (waiverType === "Penalty") {
      newPenalties = Math.max(0, newPenalties - amount);
      allocatedPenalties = amount;
    }

    let newStatus = loan.status;
    if (newPrincipal <= 0 && newInterest <= 0 && newPenalties <= 0 && Number(loan.remaining_fees ?? 0) <= 0) {
      newStatus = "Fully Paid";
    }

    // 4. Update the loan outstanding balances
    const { data: updatedLoan, error: updateError } = await supabase
      .from("loans")
      .update({
        remaining_principal: newPrincipal,
        remaining_interest: newInterest,
        remaining_penalties: newPenalties,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", loanId)
      .select()
      .single();

    if (updateError) throw updateError;

    const effectiveDate = new Date().toISOString();

    // 5. Create a transaction of type 'Waiver'
    const { error: txError } = await supabase
      .from("loan_transactions")
      .insert({
        loan_id: loanId,
        client_id: loan.client_id,
        amount: amount,
        type: "Waiver",
        payment_method: "Waiver",
        comment: reason.trim(),
        applied_by: `${currentUser.firstName} ${currentUser.lastName}`,
        date: effectiveDate,
        allocated_fees: 0,
        allocated_penalties: allocatedPenalties,
        allocated_overdue_interest: 0,
        allocated_current_interest: allocatedInterest,
        allocated_overdue_principal: 0,
        allocated_current_principal: allocatedPrincipal,
        allocated_to_wallet: 0,
        status: "Active",
      });

    if (txError) throw txError;

    // 6. Chronologically adjust installments
    const { applyWaiverToInstallments } = await import("./dms.actions");
    await applyWaiverToInstallments(supabase, loanId, amount, waiverType, newBalance <= 0);

    // 7. Update client aggregate
    try {
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
    } catch (e) {
      console.warn("[waiveLoanBalance] Client aggregate update failed:", e);
    }

    // 8. Log Audit Event
    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_UPDATED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `Waiver of KES ${amount.toLocaleString()} applied to outstanding ${waiverType.toLowerCase()} by ${currentUser.firstName} ${currentUser.lastName}. Reason: ${reason.trim()}`,
    });

    if (process.env.TEST_SUITE !== "true") {
      revalidatePath(`/loans/${loanId}`);
    }
    return parseStringify(mapLoanRow(updatedLoan));
  } catch (error) {
    console.error("Error waiving loan balance", error);
    throw error;
  }
};

export const getDashboardTrendData = unstable_cache(async () => {
  try {
    const supabase = createSupabaseAdminClient();

    const trendData: { month: string; disbursements: number; collections: number }[] = [];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      trendData.push({
        month: `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
        disbursements: 0,
        collections: 0
      });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const { data: transactions, error } = await supabase
      .from("loan_transactions")
      .select("amount, type, date, status")
      .gte("date", sixMonthsAgo.toISOString())
      .neq("status", "Reversed");

    if (error) throw error;

    (transactions || []).forEach((tx: any) => {
      if (tx.type === "Disbursement" || tx.type === "Repayment") {
        const txDate = new Date(tx.date);
        const monthStr = `${months[txDate.getMonth()]} ${txDate.getFullYear().toString().slice(2)}`;
        const bucket = trendData.find(b => b.month === monthStr);
        if (bucket) {
          if (tx.type === "Disbursement") bucket.disbursements += (tx.amount || 0);
          if (tx.type === "Repayment") bucket.collections += (tx.amount || 0);
        }
      }
    });

    return trendData;
  } catch (error) {
    console.error("Error fetching trend data", error);
    return [];
  }
}, ["dashboard-trend-data"], { revalidate: 300 });

// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️  TEMPORARY DATA CORRECTION ACTIONS — ADMIN ONLY
// These were enabled on 2026-07-02 to allow manual data correction after the
// repayment ledger CSV migration. See handshake.md to disable them.
// ═══════════════════════════════════════════════════════════════════════════════

/** Hard-delete a loan and all its child installments/transactions/penalties.
 *  Only callable by ADMIN role. Cascades via ON DELETE CASCADE FK constraints. */
export const deleteLoan = async (loanId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentUser = await requireAdminRole();
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.from("loans").delete().eq("id", loanId);
    if (error) throw error;

    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_UPDATED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `[DATA CORRECTION] Loan ${loanId} permanently deleted by admin.`,
      previousValue: "Exists",
      newValue: "Deleted",
    });

    revalidatePath("/");
    revalidatePath("/loans");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteLoan]", error);
    return { success: false, error: error.message };
  }
};

/** Hard-delete a single transaction/repayment row.
 *  Only callable by ADMIN role. */
export const deleteTransaction = async (
  transactionId: string,
  loanId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentUser = await requireAdminRole();
    const supabase = createSupabaseAdminClient();

    // 1. Check if this is a repayment in repayments table (DMS architecture)
    const { data: repayment } = await supabase
      .from("repayments")
      .select("id, agreement_id")
      .eq("id", transactionId)
      .maybeSingle();

    if (repayment) {
      const targetAgreementId = loanId || repayment.agreement_id;
      const { error: repDelErr } = await supabase
        .from("repayments")
        .delete()
        .eq("id", transactionId);

      if (repDelErr) throw repDelErr;

      const { recascadeAgreementInstallments } = await import("./dms.actions");
      await recascadeAgreementInstallments(targetAgreementId);

      revalidatePath(`/loans/${targetAgreementId}`);
      revalidatePath("/loans");
      revalidatePath("/admin/contracts");
      return { success: true };
    }

    // 2. Otherwise, handle legacy loan_transactions
    const { error } = await supabase.from("loan_transactions").delete().eq("id", transactionId);
    if (error) throw error;

    const { data: isLoan } = await supabase.from("loans").select("id").eq("id", loanId).maybeSingle();
    if (isLoan) {
      await logAuditEvent({
        loanId,
        entityType: "transaction",
        action: "LOAN_UPDATED",
        performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
        userId: currentUser.$id ?? currentUser.userId ?? "system",
        description: `[DATA CORRECTION] Transaction ${transactionId} permanently deleted by admin.`,
        previousValue: "Exists",
        newValue: "Deleted",
      });

      await healLoanLedger(loanId, supabase);
    }

    revalidatePath(`/loans/${loanId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[deleteTransaction]", error);
    return { success: false, error: error.message };
  }
};

/** Edit the mutable fields (amount, date, comment, payment_method, reference_id)
 *  of an existing transaction or repayment. Only callable by ADMIN role. */
export const editTransaction = async (
  transactionId: string,
  loanId: string,
  updates: {
    amount?: number;
    date?: string;
    comment?: string;
    paymentMethod?: string;
    referenceId?: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentUser = await requireAdminRole();
    const supabase = createSupabaseAdminClient();

    // 1. Check if it's in repayments table (DMS architecture)
    const { data: repayment } = await supabase
      .from("repayments")
      .select("id, agreement_id")
      .eq("id", transactionId)
      .maybeSingle();

    if (repayment) {
      const targetAgreementId = loanId || repayment.agreement_id;
      const repPayload: Record<string, any> = {};
      if (updates.amount !== undefined) repPayload.amount_paid = updates.amount;
      if (updates.date !== undefined) repPayload.payment_date = updates.date.split("T")[0];
      if (updates.comment !== undefined) repPayload.notes = updates.comment;
      if (updates.paymentMethod !== undefined) repPayload.payment_method = updates.paymentMethod;
      if (updates.referenceId !== undefined) repPayload.reference_no = updates.referenceId;

      if (Object.keys(repPayload).length === 0) {
        return { success: false, error: "No fields to update." };
      }

      const { error: repUpdErr } = await supabase
        .from("repayments")
        .update(repPayload)
        .eq("id", transactionId);

      if (repUpdErr) throw repUpdErr;

      const { recascadeAgreementInstallments } = await import("./dms.actions");
      await recascadeAgreementInstallments(targetAgreementId);

      revalidatePath(`/loans/${targetAgreementId}`);
      revalidatePath("/loans");
      revalidatePath("/admin/contracts");
      return { success: true };
    }

    // 2. Otherwise, legacy loan_transactions
    const payload: Record<string, any> = {};
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.comment !== undefined) payload.comment = updates.comment;
    if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
    if (updates.referenceId !== undefined) payload.reference_id = updates.referenceId;

    if (Object.keys(payload).length === 0) {
      return { success: false, error: "No fields to update." };
    }

    const { error } = await supabase.from("loan_transactions").update(payload).eq("id", transactionId);
    if (error) throw error;

    const { data: isLoan } = await supabase.from("loans").select("id").eq("id", loanId).maybeSingle();
    if (isLoan) {
      await logAuditEvent({
        loanId,
        entityType: "transaction",
        action: "LOAN_UPDATED",
        performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
        userId: currentUser.$id ?? currentUser.userId ?? "system",
        description: `[DATA CORRECTION] Transaction ${transactionId} edited by admin. Fields changed: ${Object.keys(updates).join(", ")}.`,
        previousValue: JSON.stringify(Object.keys(updates)),
        newValue: JSON.stringify(payload),
      });

      await healLoanLedger(loanId, supabase);
    }

    revalidatePath(`/loans/${loanId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[editTransaction]", error);
    return { success: false, error: error.message };
  }
};

/** Edit a penalty (date, amount, type, comment).
 *  Updates both penalties and loan_transactions, and recalculates agreement balances/installments. */
export const editPenalty = async (
  penaltyId: string,
  loanId: string,
  updates: {
    amount?: number;
    date?: string;
    comment?: string;
    penaltyType?: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentUser = await requireManagerRole();
    const supabase = createSupabaseAdminClient();

    // 1. Check penalties table (DMS architecture)
    const { data: penalty } = await supabase
      .from("penalties")
      .select("id, amount, agreement_id, date_applied, penalty_type, comment, status")
      .eq("id", penaltyId)
      .maybeSingle();

    if (penalty) {
      const targetAgreementId = loanId || penalty.agreement_id;
      const penaltyPayload: Record<string, any> = {};

      if (updates.date !== undefined && updates.date !== '') {
        const effectiveDate = updates.date.includes('T') ? updates.date : `${updates.date}T12:00:00.000Z`;
        penaltyPayload.date_applied = effectiveDate;
        penaltyPayload.created_at = effectiveDate;
      }
      if (updates.comment !== undefined) {
        penaltyPayload.comment = updates.comment;
      }
      if (updates.penaltyType !== undefined) {
        penaltyPayload.penalty_type = updates.penaltyType;
      }
      if (updates.amount !== undefined) {
        penaltyPayload.amount = updates.amount;
      }

      if (Object.keys(penaltyPayload).length === 0) {
        return { success: false, error: "No fields to update." };
      }

      const { error: pUpdErr } = await supabase
        .from("penalties")
        .update(penaltyPayload)
        .eq("id", penaltyId);

      if (pUpdErr) throw pUpdErr;

      // If amount was changed and penalty is Active, adjust financing installments / balance
      const amountDiff = updates.amount !== undefined ? (Number(updates.amount) - Number(penalty.amount || 0)) : 0;
      if (amountDiff !== 0 && penalty.status === "Active") {
        if (amountDiff > 0) {
          const { data: installments } = await supabase
            .from("financing_installments")
            .select("id, penalties_due")
            .eq("agreement_id", targetAgreementId)
            .eq("is_settled", false)
            .order("installment_number", { ascending: true })
            .limit(1);

          const targetInst = installments && installments.length > 0 ? installments[0] : null;
          if (targetInst) {
            await supabase
              .from("financing_installments")
              .update({ penalties_due: Number(targetInst.penalties_due || 0) + amountDiff })
              .eq("id", targetInst.id);
          } else {
            const { data: lastInst } = await supabase
              .from("financing_installments")
              .select("id, penalties_due")
              .eq("agreement_id", targetAgreementId)
              .order("installment_number", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (lastInst) {
              await supabase
                .from("financing_installments")
                .update({ penalties_due: Number(lastInst.penalties_due || 0) + amountDiff })
                .eq("id", lastInst.id);
            }
          }
        } else {
          let toDeduct = Math.abs(amountDiff);
          const { data: installments } = await supabase
            .from("financing_installments")
            .select("id, penalties_due")
            .eq("agreement_id", targetAgreementId)
            .order("installment_number", { ascending: false });

          for (const inst of installments ?? []) {
            if (toDeduct <= 0) break;
            const curPenDue = Number(inst.penalties_due || 0);
            if (curPenDue > 0) {
              const deduction = Math.min(curPenDue, toDeduct);
              await supabase
                .from("financing_installments")
                .update({ penalties_due: curPenDue - deduction })
                .eq("id", inst.id);
              toDeduct -= deduction;
            }
          }
        }

        const { recascadeAgreementInstallments } = await import("./dms.actions");
        await recascadeAgreementInstallments(targetAgreementId);
      }

      // Keep any synced loan_transactions record updated as well
      if (penaltyPayload.date_applied || penaltyPayload.comment || penaltyPayload.penalty_type || penaltyPayload.amount) {
        const txUpdates: Record<string, any> = {};
        if (penaltyPayload.date_applied) {
          txUpdates.date = penaltyPayload.date_applied;
          txUpdates.created_at = penaltyPayload.date_applied;
        }
        if (penaltyPayload.comment) txUpdates.comment = penaltyPayload.comment;
        if (penaltyPayload.penalty_type) txUpdates.payment_method = penaltyPayload.penalty_type;
        if (penaltyPayload.amount) txUpdates.amount = penaltyPayload.amount;

        try {
          await supabase
            .from("loan_transactions")
            .update(txUpdates)
            .eq("loan_id", targetAgreementId)
            .eq("type", "Manual Penalty")
            .eq("amount", penalty.amount);
        } catch (_) {}
      }

      revalidatePath(`/loans/${targetAgreementId}`);
      revalidatePath(`/loans/${targetAgreementId}/statement`);
      revalidatePath("/loans");
      revalidatePath("/admin/contracts");
      revalidatePath("/reports/portfolio");
      revalidatePath("/reports/par");
      revalidatePath("/reports/income");
      revalidatePath("/");
      return { success: true };
    }

    // 2. Fallback to legacy loan_transactions
    const { data: legacyPenalty, error: fetchErr } = await supabase
      .from("loan_transactions")
      .select("amount, client_id, date, comment, payment_method")
      .eq("id", penaltyId)
      .single();

    if (fetchErr || !legacyPenalty) throw new Error("Penalty not found.");

    const txPayload: Record<string, any> = {};
    if (updates.date !== undefined && updates.date !== '') {
      txPayload.date = updates.date.includes('T') ? updates.date : `${updates.date}T12:00:00.000Z`;
    }
    if (updates.comment !== undefined) txPayload.comment = updates.comment;
    if (updates.penaltyType !== undefined) txPayload.payment_method = updates.penaltyType;
    if (updates.amount !== undefined) txPayload.amount = updates.amount;

    if (Object.keys(txPayload).length === 0) {
      return { success: false, error: "No fields to update." };
    }

    const { error: txErr } = await supabase
      .from("loan_transactions")
      .update(txPayload)
      .eq("id", penaltyId);

    if (txErr) throw txErr;

    const { data: isLoan } = await supabase.from("loans").select("id").eq("id", loanId).maybeSingle();
    if (isLoan) {
      await healLoanLedger(loanId, supabase);
    }

    revalidatePath(`/loans/${loanId}`);
    revalidatePath(`/loans/${loanId}/statement`);
    return { success: true };
  } catch (error: any) {
    console.error("[editPenalty]", error);
    return { success: false, error: error.message };
  }
};

/** Hard-delete a single Manual Penalty. Also rolls back
 *  the penalty amount from the installment it was attached to.
 *  Only callable by ADMIN role. */
export const deletePenalty = async (
  penaltyId: string,
  loanId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentUser = await requireAdminRole();
    const supabase = createSupabaseAdminClient();

    // 1. Check penalties table (DMS architecture)
    const { data: penalty } = await supabase
      .from("penalties")
      .select("id, amount, agreement_id")
      .eq("id", penaltyId)
      .maybeSingle();

    if (penalty) {
      const targetAgreementId = loanId || penalty.agreement_id;

      // Delete from penalties table
      const { error: pDelErr } = await supabase
        .from("penalties")
        .delete()
        .eq("id", penaltyId);

      if (pDelErr) throw pDelErr;

      // Roll back penalty amount from financing_installments that has it
      const { data: installments } = await supabase
        .from("financing_installments")
        .select("id, penalties_due")
        .eq("agreement_id", targetAgreementId)
        .order("installment_number", { ascending: false });

      let penaltyToRollback = Number(penalty.amount || 0);
      for (const inst of installments ?? []) {
        if (penaltyToRollback <= 0) break;
        const curPenDue = Number(inst.penalties_due || 0);
        if (curPenDue > 0) {
          const deduction = Math.min(curPenDue, penaltyToRollback);
          await supabase
            .from("financing_installments")
            .update({ penalties_due: curPenDue - deduction })
            .eq("id", inst.id);
          penaltyToRollback -= deduction;
        }
      }

      const { recascadeAgreementInstallments } = await import("./dms.actions");
      await recascadeAgreementInstallments(targetAgreementId);

      revalidatePath(`/loans/${targetAgreementId}`);
      revalidatePath("/loans");
      revalidatePath("/admin/contracts");
      return { success: true };
    }

    // 2. Otherwise, legacy loan_transactions
    const { data: legacyPenalty, error: fetchErr } = await supabase
      .from("loan_transactions")
      .select("amount, client_id")
      .eq("id", penaltyId)
      .single();

    if (fetchErr || !legacyPenalty) throw new Error("Penalty not found.");

    const { data: installments } = await supabase
      .from("loan_installments")
      .select("id, penalties_due")
      .eq("loan_id", loanId)
      .order("due_date", { ascending: false });

    for (const inst of installments ?? []) {
      if (inst.penalties_due >= legacyPenalty.amount) {
        await supabase
          .from("loan_installments")
          .update({ penalties_due: Math.max(0, inst.penalties_due - legacyPenalty.amount) })
          .eq("id", inst.id);
        break;
      }
    }

    const { error: deleteErr } = await supabase.from("loan_transactions").delete().eq("id", penaltyId);
    if (deleteErr) throw deleteErr;

    const { data: allInsts } = await supabase
      .from("loan_installments")
      .select("penalties_due, penalties_paid")
      .eq("loan_id", loanId);

    const remainingPenalties = (allInsts ?? []).reduce(
      (sum, i) => sum + Math.max(0, i.penalties_due - i.penalties_paid),
      0
    );
    await supabase.from("loans").update({ remaining_penalties: remainingPenalties }).eq("id", loanId);

    const { data: isLoan } = await supabase.from("loans").select("id").eq("id", loanId).maybeSingle();
    if (isLoan) {
      await logAuditEvent({
        loanId,
        entityType: "penalty",
        action: "PENALTY_REVERSED",
        performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
        userId: currentUser.$id ?? currentUser.userId ?? "system",
        description: `[DATA CORRECTION] Penalty ${penaltyId} (KES ${legacyPenalty.amount.toLocaleString()}) permanently deleted by admin.`,
        previousValue: "Active",
        newValue: "Deleted",
      });
    }

    revalidatePath(`/loans/${loanId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[deletePenalty]", error);
    return { success: false, error: error.message };
  }
};

// ─── LEDGER HEALING UTILITY ───────────────────────────────────────────────────
/** Recalculates remaining balances and installment paid allocations based on the
 * total sum of actual Repayment transactions. This ensures UI KPIs and DB stay
 * in perfect sync even if an admin forcefully edits/deletes a transaction amount. */
export const healLoanLedger = async (loanId: string, supabaseClient?: any) => {
  try {
    const supabase = supabaseClient || createSupabaseAdminClient();
    
    // Sum all active repayments
    const { data: txs } = await supabase
      .from("loan_transactions")
      .select("amount")
      .eq("loan_id", loanId)
      .eq("type", "Repayment")
      .in("status", ["Active", "Completed"]);
      
    const totalPaid = (txs || []).reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);

    // Fetch all installments to get the exact components due
    const { data: installments } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("loan_id", loanId)
      .order("installment_number", { ascending: true });

    if (!installments || installments.length === 0) return;

    // Calculate totals due
    const totalFeesDue = installments.reduce((sum: number, inst: any) => sum + Number(inst.fees_due || 0), 0);
    const totalPenaltiesDue = installments.reduce((sum: number, inst: any) => sum + Number(inst.penalties_due || 0), 0);
    const totalInterestDue = installments.reduce((sum: number, inst: any) => sum + Number(inst.interest_due || 0), 0);
    const totalPrincipalDue = installments.reduce((sum: number, inst: any) => sum + Number(inst.principal_due || 0), 0);

    // Calculate aggregate remaining balances
    let pool = totalPaid;
    const remFees = Math.max(0, totalFeesDue - pool);
    pool = Math.max(0, pool - totalFeesDue);

    const remPenalties = Math.max(0, totalPenaltiesDue - pool);
    pool = Math.max(0, pool - totalPenaltiesDue);

    const remInterest = Math.max(0, totalInterestDue - pool);
    pool = Math.max(0, pool - totalInterestDue);

    const remPrincipal = Math.max(0, totalPrincipalDue - pool);
    pool = Math.max(0, pool - totalPrincipalDue);

    // Update aggregate balances on loans table
    await supabase.from("loans").update({
      remaining_principal: remPrincipal,
      remaining_interest: remInterest,
      remaining_penalties: remPenalties,
      remaining_fees: remFees,
      total_paid_principal: Math.max(0, totalPrincipalDue - remPrincipal)
    }).eq("id", loanId);

    // Sequentially allocate the exact totalPaid across installments (waterfall logic)
    let remainingPool = totalPaid;
    for (const inst of installments) {
      const fDue = Number(inst.fees_due || 0);
      const fPaid = Math.min(remainingPool, fDue);
      remainingPool -= fPaid;

      const pDue = Number(inst.penalties_due || 0);
      const pPaid = Math.min(remainingPool, pDue);
      remainingPool -= pPaid;

      const iDue = Number(inst.interest_due || 0);
      const iPaid = Math.min(remainingPool, iDue);
      remainingPool -= iPaid;

      const prDue = Number(inst.principal_due || 0);
      const prPaid = Math.min(remainingPool, prDue);
      remainingPool -= prPaid;

      const isSettled = (fPaid >= fDue && pPaid >= pDue && iPaid >= iDue && prPaid >= prDue);
      let newStatus = isSettled 
        ? "Paid" 
        : (fPaid > 0 || pPaid > 0 || iPaid > 0 || prPaid > 0) 
          ? "Partial" 
          : new Date(inst.due_date) < new Date() 
            ? "Overdue" 
            : "Pending";
            
      // Preserve Rolled Over status
      if (inst.status === "Rolled Over") newStatus = "Rolled Over";

      await supabase.from("loan_installments").update({
        fees_paid: fPaid,
        penalties_paid: pPaid,
        interest_paid: iPaid,
        principal_paid: prPaid,
        status: newStatus,
        paid_date: isSettled ? (inst.paid_date || new Date().toISOString()) : null
      }).eq("id", inst.id);
    }
  } catch (error) {
    console.error("[healLoanLedger] Failed to heal ledger:", error);
  }
};

export const forceUpdateLoanStatus = async (loanId: string, newStatus: string) => {
  try {
    const currentUser = await requireAdminRole();
    const supabase = createSupabaseAdminClient();

    const { data: loanRecord } = await supabase
      .from("loans")
      .select("status, days_past_due")
      .eq("id", loanId)
      .maybeSingle();

    let currentLoan: any = loanRecord;
    let targetTable = "loans";

    if (!currentLoan) {
      const { data: agreement } = await supabase
        .from("financing_agreements")
        .select("status, days_overdue, aging_bucket")
        .eq("id", loanId)
        .maybeSingle();
        
      if (agreement) {
        currentLoan = agreement;
        targetTable = "financing_agreements";
      }
    }

    if (!currentLoan) throw new Error("Loan/Agreement not found");

    const previousStatus = currentLoan.status;
    let updateFields: Record<string, any> = { status: newStatus };
    const norm = newStatus.trim().toLowerCase();

    // Dealership business delinquency rules:
    // - Loss: >90 days past due (>90 DPD, not written off - active debt under recovery)
    // - Defaulting: 60 to 90 days past due (60-90 DPD)
    // - Overdue: 7 to 30 days past due (7-30 DPD)
    if (targetTable === "financing_agreements") {
      const currentDays = Number((currentLoan as any).days_overdue || 0);

      if (norm === "loss") {
        updateFields = {
          status: "Loss",
          aging_bucket: "90+ Days",
          days_overdue: currentDays > 90 ? currentDays : 91,
        };
      } else if (norm === "defaulting" || norm === "defaulted") {
        updateFields = {
          status: "defaulting",
          aging_bucket: "60-90 Days",
          days_overdue: (currentDays >= 60 && currentDays <= 90) ? currentDays : 61,
        };
      } else if (norm === "overdue") {
        updateFields = {
          status: "Overdue",
          aging_bucket: "7-30 Days",
          days_overdue: (currentDays >= 7 && currentDays <= 30) ? currentDays : 15,
        };
      } else if (norm === "substandard") {
        updateFields = {
          status: "Substandard",
          aging_bucket: "31-60 Days",
          days_overdue: (currentDays >= 31 && currentDays <= 60) ? currentDays : 35,
        };
      } else if (norm === "active") {
        updateFields = {
          status: "active",
          aging_bucket: "0-30 Days",
          days_overdue: 0,
        };
      } else if (norm === "fully paid" || norm === "completed") {
        updateFields = {
          status: "completed",
          aging_bucket: "COMPLETED",
          days_overdue: 0,
        };
      } else if (norm === "written off") {
        updateFields = {
          status: "Written Off",
          aging_bucket: "WRITTEN OFF",
        };
      } else if (norm === "repossessed") {
        updateFields = {
          status: "repossessed",
          aging_bucket: "REPOSSESSED",
        };
      }
    } else if (targetTable === "loans") {
      const currentDays = Number((currentLoan as any).days_past_due || 0);

      if (norm === "loss") {
        updateFields = {
          status: "Loss",
          days_past_due: currentDays > 90 ? currentDays : 91,
        };
      } else if (norm === "defaulting") {
        updateFields = {
          status: "Defaulting",
          days_past_due: (currentDays >= 60 && currentDays <= 90) ? currentDays : 61,
        };
      } else if (norm === "overdue") {
        updateFields = {
          status: "Overdue",
          days_past_due: (currentDays >= 7 && currentDays <= 30) ? currentDays : 15,
        };
      } else if (norm === "substandard") {
        updateFields = {
          status: "Substandard",
          days_past_due: (currentDays >= 31 && currentDays <= 60) ? currentDays : 35,
        };
      } else if (norm === "active") {
        updateFields = {
          status: "Active",
          days_past_due: 0,
        };
      } else if (norm === "fully paid") {
        updateFields = {
          status: "Fully Paid",
          days_past_due: 0,
        };
      } else if (norm === "written off") {
        updateFields = {
          status: "Written Off",
        };
      }
    }

    const { data: updateData, error: updateErr } = await supabase
      .from(targetTable)
      .update(updateFields)
      .eq("id", loanId)
      .select("id, status")
      .single();

    if (updateErr) throw updateErr;

    console.log(`[forceUpdateLoanStatus] ✅ Updated ${targetTable} ${loanId}: ${previousStatus} → ${newStatus}`, updateFields);

    const statusNote = norm === 'loss'
      ? '>90 DPD (Not Written Off - Active Debt)'
      : norm === 'defaulting'
      ? '60-90 DPD'
      : norm === 'overdue'
      ? '7-30 DPD'
      : newStatus;

    // Only log audit for the loans table (financing_agreements has no FK in audit_logs)
    if (targetTable === "loans") {
      await logAuditEvent({
        loanId: loanId,
        entityType: "loan",
        action: "STATUS_CHANGED",
        performedBy: currentUser.$id || currentUser.userId || "Admin",
        userId: currentUser.$id || currentUser.userId || "system",
        description: `Admin manual status override from ${previousStatus} to ${newStatus} (${statusNote})`,
        previousValue: previousStatus,
        newValue: newStatus,
      });
    } else {
      console.log(`[forceUpdateLoanStatus] Audit logged for financing_agreement ${loanId}: ${previousStatus} → ${newStatus} (${statusNote})`);
    }

    revalidatePath(`/loans/${loanId}`);
    revalidatePath("/loans");
    revalidatePath("/admin/contracts");
    revalidatePath("/reports/portfolio");
    revalidatePath("/reports/daily");
    revalidatePath("/reports/arrears");

    return { success: true };
  } catch (error: any) {
    console.error("Error overriding loan status:", error);
    return { success: false, error: error.message };
  }
};
