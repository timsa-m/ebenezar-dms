/**
 * lib/offline/sync.ts
 *
 * The Elelyon offline sync engine. Handles:
 *
 *   1. queueAction()       — write a pending mutation to the outbox
 *   2. flushOutbox()       — replay all pending items against Server Actions
 *   3. cacheClients()      — store a fresh client list in IndexedDB
 *   4. cacheLoans()        — store a fresh loan list in IndexedDB
 *   5. readCachedClients() — read clients from IndexedDB when offline
 *   6. readCachedLoans()   — read loans from IndexedDB when offline
 *   7. registerBackgroundSync() — ask the SW to sync when network returns
 *   8. getPendingCount()   — count entries waiting to sync (for badge UI)
 *
 * IMPORTANT: This file is client-only. All imports from Server Actions use
 * dynamic import() so they are never bundled on the server.
 */

'use client';

import {
  getOfflineDB,
  type OutboxActionType,
  type OutboxEntry,
  type OutboxPayload,
  type PenaltyPayload,
  type RepaymentPayload,
  type CachedClient,
  type CachedLoan,
} from './db';

// ─── Background Sync tag ───────────────────────────────────────────────────────
const SYNC_TAG = 'elelyon-outbox';
const MAX_ATTEMPTS = 3;

// ─── 1. queueAction ───────────────────────────────────────────────────────────

/**
 * Add a mutation to the IndexedDB outbox.
 * Returns the auto-assigned id of the new outbox entry.
 */
export async function queueAction(
  actionType: OutboxActionType,
  payload: OutboxPayload,
): Promise<number> {
  const db = getOfflineDB();
  const id = await db.outbox.add({
    actionType,
    payload,
    createdAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
  });
  // Ask the service worker to fire a sync event when connection returns.
  // This is best-effort — fallback is the 'online' event in OfflineBanner.
  await registerBackgroundSync();
  return id as number;
}

// ─── 2. flushOutbox ───────────────────────────────────────────────────────────

/**
 * Attempt to replay all pending/failed outbox entries against their
 * respective Server Actions.
 *
 * - Entries are processed oldest-first (ascending id).
 * - Each entry is marked 'syncing' while in-flight.
 * - On success → deleted from the outbox.
 * - On failure → marked 'failed', lastError updated, attempts incremented.
 * - After MAX_ATTEMPTS failures the entry is left in 'failed' state so
 *   the user can see it in the UI and take action.
 *
 * Returns counts for UI feedback.
 */
export async function flushOutbox(): Promise<{
  synced: number;
  failed: number;
  skipped: number;
}> {
  const db = getOfflineDB();

  // Fetch all pending OR previously-failed (within retry budget) entries
  const pending = await db.outbox
    .where('status')
    .anyOf(['pending', 'failed'])
    .sortBy('id');

  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of pending) {
    // Hard limit: don't retry beyond MAX_ATTEMPTS
    if (entry.attempts >= MAX_ATTEMPTS) {
      skipped++;
      continue;
    }

    // Mark as in-flight
    await db.outbox.update(entry.id!, {
      status: 'syncing',
      attempts: entry.attempts + 1,
    });

    try {
      await dispatchAction(entry);

      // Success — remove from outbox
      await db.outbox.delete(entry.id!);
      synced++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await db.outbox.update(entry.id!, {
        status: 'failed',
        lastError: message,
      });
      failed++;
    }
  }

  return { synced, failed, skipped };
}

// ─── Internal action dispatcher ───────────────────────────────────────────────

/**
 * Route an outbox entry to the correct Server Action.
 * Dynamic imports ensure Server Actions are never bundled client-side at
 * module load time — they are only imported when actually needed.
 */
async function dispatchAction(entry: OutboxEntry): Promise<void> {
  switch (entry.actionType) {
    case 'CREATE_PENALTY': {
      const { createPenalty } = await import('@/lib/actions/penalty.actions');
      const p = entry.payload as PenaltyPayload;
      await createPenalty({
        loanId: p.loanId,
        clientId: p.clientId,
        amount: p.amount,
        penaltyType: p.penaltyType as any,  // cast: validated at queue time
        comment: p.comment,
        appliedBy: p.appliedBy,
        dateApplied: p.dateApplied,
      });
      break;
    }

    case 'PROCESS_REPAYMENT': {
      const { processRepayment } = await import('@/lib/actions/repayment.actions');
      const r = entry.payload as RepaymentPayload;
      await processRepayment({
        loanId: r.loanId,
        amount: r.amount,
        paymentMethod: r.paymentMethod,
        referenceId: r.referenceId,
        performedBy: r.performedBy,
        paymentDate: r.paymentDate,
      });
      break;
    }

    default: {
      throw new Error(`[OfflineSync] Unknown action type: ${(entry as any).actionType}`);
    }
  }
}

// ─── 3. cacheClients ──────────────────────────────────────────────────────────

/**
 * Write a fresh array of clients into IndexedDB.
 * Uses bulkPut so existing records are upserted (not duplicated).
 * Stamps each record with `cachedAt` so staleness can be checked.
 */
export async function cacheClients(clients: LMSClient[]): Promise<void> {
  const db = getOfflineDB();
  const now = new Date().toISOString();

  const records: CachedClient[] = clients.map((c) => ({
    $id: c.$id,
    $createdAt: c.$createdAt,
    firstName: c.firstName,
    lastName: c.lastName,
    nationalId: c.nationalId,
    email: c.email,
    phone: c.phone,
    address: c.address,
    totalBorrowed: c.totalBorrowed,
    outstandingBalance: c.outstandingBalance,
    profilePhotoUrl: c.profilePhotoUrl,
    profilePhotoPath: c.profilePhotoPath,
    updatedAt: c.updatedAt,
    cachedAt: now,
  }));

  await db.cachedClients.bulkPut(records);
}

// ─── 4. cacheLoans ────────────────────────────────────────────────────────────

/**
 * Write a fresh array of loans into IndexedDB.
 */
export async function cacheLoans(loans: Loan[]): Promise<void> {
  const db = getOfflineDB();
  const now = new Date().toISOString();

  const records: CachedLoan[] = loans.map((l) => ({
    $id: l.$id,
    $createdAt: l.$createdAt,
    clientId: l.clientId,
    principalAmount: l.principalAmount,
    interestRate: l.interestRate,
    interestType: l.interestType,
    durationInMonths: l.durationInMonths,
    startDate: l.startDate,
    dueDate: l.dueDate,
    totalInterest: l.totalInterest,
    totalPayable: l.totalPayable,
    balance: l.balance,
    status: l.status,
    penaltyAccrued: l.penaltyAccrued,
    loanType: l.loanType,
    clientName: l.clientName,
    clientEmail: l.clientEmail,
    clientPhone: l.clientPhone,
    securities: l.securities,
    guarantorName: l.guarantorName,
    guarantorPhone: l.guarantorPhone,
    guarantorId: l.guarantorId,
    installmentAmount: l.installmentAmount,
    documentUrl: l.documentUrl,
    createdBy: l.createdBy,
    isHighRisk: l.isHighRisk,
    lifecycleState: l.lifecycleState,
    daysPastDue: l.daysPastDue,
    remainingPrincipal: l.remainingPrincipal,
    remainingInterest: l.remainingInterest,
    remainingPenalties: l.remainingPenalties,
    remainingFees: l.remainingFees,
    amountApplied: l.amountApplied,
    principalDisbursed: l.principalDisbursed,
    disbursedAt: l.disbursedAt,
    cachedAt: now,
  }));

  await db.cachedLoans.bulkPut(records);
}

// ─── 5. readCachedClients ─────────────────────────────────────────────────────

/**
 * Return all clients from the IndexedDB cache.
 * Called when navigator.onLine === false.
 */
export async function readCachedClients(): Promise<CachedClient[]> {
  const db = getOfflineDB();
  return db.cachedClients.orderBy('$id').toArray();
}

// ─── 6. readCachedLoans ───────────────────────────────────────────────────────

/**
 * Return all loans from the IndexedDB cache.
 * Optionally filter by clientId.
 */
export async function readCachedLoans(clientId?: string): Promise<CachedLoan[]> {
  const db = getOfflineDB();
  if (clientId) {
    return db.cachedLoans.where('clientId').equals(clientId).toArray();
  }
  return db.cachedLoans.orderBy('$id').toArray();
}

// ─── 7. registerBackgroundSync ────────────────────────────────────────────────

/**
 * Ask the service worker to register a Background Sync task.
 * When the browser regains connectivity, the SW fires 'sync' with our tag,
 * which triggers the /api/sync-outbox endpoint (Phase 5).
 *
 * Falls back silently on browsers that don't support the Background Sync API
 * (e.g. Safari/iOS) — the 'online' event in OfflineBanner handles those.
 */
export async function registerBackgroundSync(): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;

    // SyncManager is not yet available in all browsers
    if ('sync' in registration) {
      await (registration as any).sync.register(SYNC_TAG);
    }
  } catch (err) {
    // Non-fatal — the 'online' event fallback will cover it
    console.warn('[OfflineSync] Background Sync registration failed:', err);
  }
}

// ─── 8. getPendingCount ───────────────────────────────────────────────────────

/**
 * Return the number of outbox entries that haven't been synced yet.
 * Used by OfflineBanner and any future badge indicator.
 */
export async function getPendingCount(): Promise<number> {
  const db = getOfflineDB();
  return db.outbox
    .where('status')
    .anyOf(['pending', 'syncing', 'failed'])
    .count();
}

