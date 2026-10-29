import { NextResponse } from 'next/server';
import { createPenalty } from '@/lib/actions/penalty.actions';
import { processRepayment } from '@/lib/actions/repayment.actions';

/**
 * app/api/sync-outbox/route.ts
 *
 * Receives background sync payloads from the Service Worker.
 * When the SW detects connection restoration, it reads from IndexedDB
 * and POSTs pending items here.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { actionType, payload } = body;

    if (!actionType || !payload) {
      return NextResponse.json(
        { success: false, error: 'Missing actionType or payload' },
        { status: 400 }
      );
    }

    switch (actionType) {
      case 'CREATE_PENALTY': {
        await createPenalty({
          loanId: payload.loanId,
          clientId: payload.clientId,
          amount: payload.amount,
          penaltyType: payload.penaltyType,
          comment: payload.comment,
          appliedBy: payload.appliedBy,
          dateApplied: payload.dateApplied,
        });
        break;
      }
      case 'PROCESS_REPAYMENT': {
        const result = await processRepayment({
          loanId: payload.loanId,
          amount: payload.amount,
          paymentMethod: payload.paymentMethod,
          referenceId: payload.referenceId,
          performedBy: payload.performedBy,
          paymentDate: payload.paymentDate,
        });
        if (!result.success) {
          throw new Error(result.error);
        }
        break;
      }
      default:
        return NextResponse.json(
          { success: false, error: `Unknown actionType: ${actionType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Sync API] Error processing outbox item:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

