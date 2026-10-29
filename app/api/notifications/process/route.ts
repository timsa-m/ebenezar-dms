import { NextResponse } from "next/server";
import { processAutomatedReminders } from '@/lib/actions/collections.actions';

/**
 * GET /api/notifications/process
 * Secure endpoint to trigger the automated collections engine.
 * Protect with a secret key to prevent unauthorized execution.
 * Auth: Vercel injects Authorization: Bearer <CRON_SECRET> automatically.
 */
export async function GET(request: Request) {
  try {
    // Security check: Verify the Authorization header (same pattern as cron routes)
    const authHeader = (request as any).headers?.get
      ? (request as any).headers.get("authorization")
      : null;

    const CRON_SECRET = process.env.CRON_SECRET;
    if (!CRON_SECRET) {
      console.error("[API_NOTIFICATIONS_PROCESS] CRON_SECRET is not configured.");
      return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const result = await processAutomatedReminders();
    
    return NextResponse.json({ 
      success: true, 
      processed: result.processed,
      timestamp: new Date().toISOString() 
    }, { status: 202 });
  } catch (error: any) {
    console.error("[API_NOTIFICATIONS_PROCESS] Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
