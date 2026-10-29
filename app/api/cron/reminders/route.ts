import { NextResponse } from "next/server";
import { processAutomatedReminders } from "@/lib/actions/collections.actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — sending reminder SMS takes time

/**
 * Cron Job 3: Scheduled Payment Reminders
 * Schedule (vercel.json): "0 6 * * *"  → 06:00 UTC = 09:00 EAT every day
 *
 * Runs after both the daily admin job and the overdue alert blast.
 *
 * What it does:
 *  - Scans the `reminder_schedules` table for any PENDING rows where
 *    `scheduled_for` = today
 *  - Fires PAYMENT_REMINDER notifications (7 days before, 3 days before,
 *    on due date) and OVERDUE_NOTICE escalations (3 days over, 7 days over)
 *  - Marks processed rows as PROCESSED so they don't double-send
 *
 * These reminders are scheduled when a loan is approved via
 * `scheduleLoanReminders()` in collections.actions.ts.
 *
 * Security: Vercel injects Authorization: Bearer <CRON_SECRET> automatically.
 */
export async function GET(request: Request) {
  const start = Date.now();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[cron/reminders] Unauthorized call blocked.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/reminders] Processing scheduled payment reminders...");

    const result = await processAutomatedReminders();

    const elapsed = Date.now() - start;
    console.log(`[cron/reminders] ✅ Done — ${result?.processed ?? 0} reminders processed.`);

    return NextResponse.json({
      success: true,
      message: "Scheduled reminders processed.",
      processed: result?.processed ?? 0,
      elapsedMs: elapsed,
      ranAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[cron/reminders] ❌ Failed:", error?.message ?? error);
    return NextResponse.json(
      {
        success: false,
        error: "Reminder processing failed",
        detail: error?.message ?? "Unknown error",
        ranAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
