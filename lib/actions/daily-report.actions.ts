"use server";

import { createSupabaseAdminClient } from "../supabase";
import { parseStringify } from "../utils";
import { formatAmount } from "../utils";
import { getLoggedInUser } from "./user.actions";
import { NotificationService } from "../notifications";
import { renderTemplate } from "../templates";

// ─── Auth guard ────────────────────────────────────────────────────────────────
async function requireAdminOrManager() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    throw new Error("UNAUTHORIZED: Admin or Manager access required.");
  }
  return user;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getISOWeekBoundaries(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon …
  // ISO week: Monday = 0-offset
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
  };
}

function mapReportRow(agreement: any, client: any, nextInstallment?: any): DailyReportLoan {
  return {
    $id: agreement.id,
    clientId: agreement.client_id,
    clientName: client?.full_name || "Unknown Client",
    clientPhone: client?.phone ?? "",
    clientEmail: client?.email ?? "",
    amountApplied: Number(agreement.sale_price || 0),
    principalDisbursed: Number(agreement.principal_amount || 0), // Financed amount
    balance: Number(agreement.balance || 0),
    remainingPrincipal: Number(agreement.balance || 0),
    remainingInterest: 0,
    remainingPenalties: Number(agreement.total_penalties || 0),
    dueDate: agreement.end_date ?? "",
    nextInstallmentDate: nextInstallment?.due_date ?? undefined,
    nextInstallmentAmount: nextInstallment
      ? Number(nextInstallment.principal_due) +
        Number(nextInstallment.interest_due || 0) +
        Number(nextInstallment.fees_due || 0) +
        Number(nextInstallment.penalties_due || 0)
      : undefined,
    daysPastDue: Number(agreement.days_overdue || 0),
    status: (() => {
      const rawStatus = (agreement.status || '').toLowerCase();
      const dpd = Number(agreement.days_overdue || 0);
      if (rawStatus === 'completed' || rawStatus === 'fully paid') return 'Fully Paid';
      if (rawStatus === 'written off' || rawStatus === 'written_off') return 'Written Off';
      if (rawStatus === 'loss' || dpd > 90) return 'Loss';
      if (rawStatus === 'defaulting' || (dpd >= 60 && dpd <= 90)) return 'Defaulting';
      if (rawStatus === 'substandard' || (dpd > 30 && dpd < 60)) return 'Substandard';
      if (rawStatus === 'overdue' || (dpd >= 7 && dpd <= 30)) return 'Overdue';
      return 'Active';
    })(),
    loanType: agreement.contract_no || 'Vehicle Financing',
  };
}

// ─── 1. Due This Week ──────────────────────────────────────────────────────────

/**
 * Returns loans that have at least one unsettled installment falling within
 * the current ISO week (Monday 00:00 → Sunday 23:59).
 */
export async function getDueThisWeekLoans(): Promise<DailyReportLoan[]> {
  await requireAdminOrManager();
  try {
    const supabase = createSupabaseAdminClient();
    const { weekStart, weekEnd } = getISOWeekBoundaries();

    // Fetch unsettled installments due this week
    const { data: installments, error: instError } = await supabase
      .from("financing_installments")
      .select("agreement_id, due_date, principal_due, interest_due, fees_due, penalties_due")
      .eq("is_settled", false)
      .gte("due_date", weekStart)
      .lte("due_date", weekEnd)
      .order("due_date", { ascending: true });

    if (instError) throw instError;
    if (!installments || installments.length === 0) return [];

    // Deduplicate by agreement_id — keep earliest installment per loan
    const seenLoanIds = new Set<string>();
    const uniqueInstallments: typeof installments = [];
    for (const inst of installments) {
      if (!seenLoanIds.has(inst.agreement_id)) {
        seenLoanIds.add(inst.agreement_id);
        uniqueInstallments.push(inst);
      }
    }

    const loanIds = [...seenLoanIds];

    // Fetch the full financing records
    const { data: agreements, error: loansError } = await supabase
      .from("financing_agreements")
      .select(
        "id, client_id, contract_no, sale_price, deposit_paid, principal_amount, " +
        "monthly_due, duration_months, start_date, end_date, balance, status, " +
        "aging_bucket, days_overdue, total_penalties"
      )
      .in("id", loanIds)
      .not("status", "in", '("completed","Written Off","written off")');

    if (loansError) throw loansError;

    // Batch-fetch clients
    const clientIds = [...new Set((agreements ?? []).map((l: any) => l.client_id as string))];
    const { data: clients } = await supabase
      .from("clients")
      .select("id, full_name, phone, email")
      .in("id", clientIds as string[]);

    const clientMap: Record<string, any> = {};
    (clients ?? []).forEach((c: any) => { clientMap[c.id] = c; });

    // Map installments by agreement_id for quick lookup
    const instMap: Record<string, any> = {};
    uniqueInstallments.forEach((i) => { instMap[i.agreement_id] = i; });

    const result = (agreements ?? []).map((agreement: any) =>
      mapReportRow(agreement, clientMap[agreement.client_id], instMap[agreement.id])
    );

    return parseStringify(result);
  } catch (error) {
    console.error("[getDueThisWeekLoans]", error);
    return [];
  }
}

// ─── 2. Overdue Loans ──────────────────────────────────────────────────────────

/**
 * Returns all financing agreements currently classified as Overdue (days_overdue > 0).
 */
export async function getOverdueLoans(): Promise<DailyReportLoan[]> {
  await requireAdminOrManager();
  try {
    const supabase = createSupabaseAdminClient();

    const { data: agreements, error } = await supabase
      .from("financing_agreements")
      .select(
        "id, client_id, contract_no, sale_price, deposit_paid, principal_amount, " +
        "monthly_due, duration_months, start_date, end_date, balance, status, " +
        "aging_bucket, days_overdue, total_penalties"
      )
      .not("status", "in", '("completed","Written Off","written off")')
      .gt("days_overdue", 0)
      .order("days_overdue", { ascending: false });

    if (error) throw error;
    if (!agreements || agreements.length === 0) return [];

    const clientIds = [...new Set((agreements as any[]).map((l: any) => l.client_id as string))];
    const { data: clients } = await supabase
      .from("clients")
      .select("id, full_name, phone, email")
      .in("id", clientIds as string[]);

    const clientMap: Record<string, any> = {};
    (clients ?? []).forEach((c: any) => { clientMap[c.id] = c; });

    const result = (agreements as any[]).map((agreement: any) =>
      mapReportRow(agreement, clientMap[agreement.client_id])
    );

    return parseStringify(result);
  } catch (error) {
    console.error("[getOverdueLoans]", error);
    return [];
  }
}

// ─── 3. Send Overdue Alerts ────────────────────────────────────────────────────

/**
 * Triggers SMS + Email alerts via Africa's Talking / Resend to every
 * client on the overdue list. Uses the OVERDUE_NOTICE template.
 * Non-blocking per client — failures are counted, not thrown.
 */
export async function sendOverdueAlerts(): Promise<{
  attempted: number;
  sent: number;
  failed: number;
  details: { clientName: string; status: "sent" | "failed"; error?: string }[];
}> {
  await requireAdminOrManager();

  const supabase = createSupabaseAdminClient();

  // Fetch the OVERDUE_NOTICE template
  const { data: template } = await supabase
    .from("notification_templates")
    .select("*")
    .eq("name", "OVERDUE_NOTICE")
    .eq("is_active", true)
    .single();

  if (!template) {
    throw new Error("OVERDUE_NOTICE template not found in notification_templates. Run the migration first.");
  }

  const overdueLoans = await getOverdueLoans();
  if (overdueLoans.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, details: [] };
  }

  let sent = 0;
  let failed = 0;
  const details: { clientName: string; status: "sent" | "failed"; error?: string }[] = [];

  await Promise.allSettled(
    overdueLoans.map(async (loan) => {
      try {
        const messageBody = renderTemplate(template.body_template, {
          client_name: loan.clientName,
          loan_amount: formatAmount(loan.principalDisbursed),
          disbursed_amount: formatAmount(loan.principalDisbursed),
          outstanding_balance: formatAmount(loan.balance),
          due_date: loan.dueDate
            ? new Date(loan.dueDate).toLocaleDateString("en-KE", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "N/A",
          days_past_due: String(loan.daysPastDue),
          company_name: "Ebenezar Enterprises Car Bazaar LTD",
          installment_amount: formatAmount(loan.balance),
        });

        const subject = template.subject_template
          ? renderTemplate(template.subject_template, {
              client_name: loan.clientName,
              company_name: "Ebenezar Enterprises Car Bazaar LTD",
              loan_amount: formatAmount(loan.principalDisbursed),
              outstanding_balance: formatAmount(loan.balance),
              due_date: loan.dueDate ?? "N/A",
              installment_amount: formatAmount(loan.balance),
            })
          : "URGENT: Overdue Loan Payment";

        const channels: ("SMS" | "EMAIL")[] = [];
        if (loan.clientPhone) channels.push("SMS");
        if (loan.clientEmail) channels.push("EMAIL");

        if (channels.length === 0) {
          failed++;
          details.push({ clientName: loan.clientName, status: "failed", error: "No contact details" });
          return;
        }

        await NotificationService.send({
          loanId: loan.$id,
          clientId: loan.clientId,
          templateType: "OVERDUE_NOTICE",
          phone: loan.clientPhone,
          email: loan.clientEmail,
          messageBody,
          subject,
          channels,
        });

        sent++;
        details.push({ clientName: loan.clientName, status: "sent" });
      } catch (err: any) {
        failed++;
        details.push({
          clientName: loan.clientName,
          status: "failed",
          error: err?.message ?? "Unknown error",
        });
      }
    })
  );

  return parseStringify({ attempted: overdueLoans.length, sent, failed, details });
}
