import { NextResponse } from "next/server";
import { autoFlagOverdueLoans } from "@/lib/actions/loan.actions";
import { processAutomatedReminders } from "@/lib/actions/collections.actions";

export const dynamic = "force-dynamic";
// Vercel cron jobs have a max duration — use a generous limit for DB work
export const maxDuration = 60;

/**
 * Cron Job 1: Daily Credit Administration
 * Schedule (vercel.json): "0 4 * * *"  → 04:00 UTC = 07:00 EAT every day
 *
 * What it does:
 *  1. Calls the Supabase RPC `perform_daily_credit_administration_job` which:
 *     - Recalculates days_past_due for all active loans
 *     - Promotes loans through status stages (Active → Overdue → Substandard → Loss)
 *     - Applies auto late-fee penalties where configured
 *  2. Scans reminder_schedules and enqueues any due SMS/email reminders
 *
 * Security: Vercel automatically sends Authorization: Bearer <CRON_SECRET>
 *           on every invocation. The check below rejects all other callers.
 */
export async function GET(request: Request) {
  const start = Date.now();

  // ── Auth: Vercel injects CRON_SECRET automatically ─────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[cron/daily] Unauthorized call blocked.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/daily] Starting daily credit administration job...");

    // 1. Core DPD + status promotion + auto penalties
    await autoFlagOverdueLoans();
    console.log("[cron/daily] ✅ autoFlagOverdueLoans complete.");

    // 2. Enqueue any due scheduled reminders (7-day, 3-day, due-date notices)
    const reminderResult = await processAutomatedReminders();
    console.log(`[cron/daily] ✅ Reminders enqueued: ${reminderResult?.processed ?? 0}`);

    const elapsed = Date.now() - start;
    return NextResponse.json({
      success: true,
      message: "Daily credit administration job completed.",
      remindersEnqueued: reminderResult?.processed ?? 0,
      elapsedMs: elapsed,
      ranAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[cron/daily] ❌ Failed:", error?.message ?? error);
    return NextResponse.json(
      {
        success: false,
        error: "Daily job failed",
        detail: error?.message ?? "Unknown error",
        ranAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
