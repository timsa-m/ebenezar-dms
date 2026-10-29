import { NextResponse } from "next/server";
import { sendOverdueAlerts } from "@/lib/actions/daily-report.actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — sending N SMS takes time

/**
 * Cron Job 2: Overdue Loan Alert Blast
 * Schedule (vercel.json): "0 5 * * *"  → 05:00 UTC = 08:00 EAT every day
 *
 * Runs 1 hour after the daily credit admin job (cron/daily) so DPD values
 * and statuses are already updated before we fire alerts.
 *
 * What it does:
 *  - Fetches all loans with status Overdue / Substandard / Loss
 *  - Sends personalised SMS (Africa's Talking) + Email (Resend) to each client
 *    using the OVERDUE_NOTICE notification template
 *  - Returns a summary of sent/failed counts for Vercel's cron log viewer
 *
 * Security: Vercel injects Authorization: Bearer <CRON_SECRET> automatically.
 */
export async function GET(request: Request) {
  const start = Date.now();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[cron/alerts] Unauthorized call blocked.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/alerts] Starting overdue alert blast...");

    const result = await sendOverdueAlerts();

    const elapsed = Date.now() - start;
    console.log(
      `[cron/alerts] ✅ Done — ${result.sent} sent, ${result.failed} failed out of ${result.attempted} total.`
    );

    return NextResponse.json({
      success: true,
      message: "Overdue alert blast completed.",
      attempted: result.attempted,
      sent: result.sent,
      failed: result.failed,
      details: result.details,
      elapsedMs: elapsed,
      ranAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[cron/alerts] ❌ Failed:", error?.message ?? error);
    return NextResponse.json(
      {
        success: false,
        error: "Overdue alert blast failed",
        detail: error?.message ?? "Unknown error",
        ranAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
