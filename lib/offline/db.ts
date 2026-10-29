/**
 * lib/offline/db.ts
 *
 * Dexie (IndexedDB) database for Elelyon offline mode.
 *
 * Three object stores:
 *   1. outbox         — pending mutations waiting to reach Supabase
 *   2. cachedClients  — read-only snapshot of LMSClient records
 *   3. cachedLoans    — read-only snapshot of Loan records
 *
 * Schema notes:
 *  - Primary keys use `++id` (auto-increment integer) for the outbox so
 *    records can be enumerated in insertion order.
 *  - `$id` is the Supabase UUID used as the primary key for entity stores.
 *  - Indexed fields are those we actually query/filter on.
 *
 * IMPORTANT: Only import this file from Client Components or client-side hooks
 * (never from Server Actions or route handlers — IndexedDB is browser-only).
 */

import Dexie, { type Table } from 'dexie';

// ─── Outbox entry types ────────────────────────────────────────────────────────

/** Payload for CREATE_PENALTY action */
export interface PenaltyPayload {
  loanId: string;
  clientId: string;
  amount: number;
  penaltyType: string;  // PenaltyType union — stored as string for serialisability
  comment: string;
  appliedBy: string;
  dateApplied: string;  // ISO string
}

/** Payload for PROCESS_REPAYMENT action */
export interface RepaymentPayload {
  loanId: string;
  amount: number;
  paymentMethod: string;  // PaymentMethod union
  referenceId?: string;
  performedBy: string;
  paymentDate: string;    // ISO string
}

/** Union of all supported offline action payloads */
export type OutboxActionType = 'CREATE_PENALTY' | 'PROCESS_REPAYMENT';
export type OutboxPayload = PenaltyPayload | RepaymentPayload;

/** Status of an outbox entry across its lifecycle */
export type OutboxStatus = 'pending' | 'syncing' | 'failed' | 'done';

/** One item in the write-ahead outbox */
export interface OutboxEntry {
  /** Auto-increment primary key — assigned by IndexedDB */
  id?: number;
  /** The Server Action to invoke when replaying this entry */
  actionType: OutboxActionType;
  /** Serialised payload — passed verbatim to the Server Action */
  payload: OutboxPayload;
  /** ISO timestamp when the action was queued locally */
  createdAt: string;
  /** Current lifecycle status */
  status: OutboxStatus;
  /** Error message from the last failed sync attempt */
  lastError?: string;
  /** Number of times a sync has been attempted */
  attempts: number;
}

// ─── Cached entity types (mirrors real domain types) ──────────────────────────

/**
 * Cached LMSClient — identical shape to the LMSClient declare type.
 * Stored flat; no nested objects.
 */
export interface CachedClient {
  $id: string;
  $createdAt?: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  email?: string;
  phone: string;
  address?: string;
  totalBorrowed: number;
  outstandingBalance: number;
  profilePhotoUrl?: string;
  profilePhotoPath?: string;
  updatedAt?: string;
  /** Derived field populated at cache time */
  hasOverdueLoans?: boolean;
  /** ISO timestamp this cache record was written */
  cachedAt: string;
}

/**
 * Cached Loan — identical shape to the Loan declare type.
 */
export interface CachedLoan {
  $id: string;
  $createdAt?: string;
  clientId: string;
  principalAmount: number;
  interestRate: number;
  interestType: string;
  durationInMonths: number;
  startDate?: string;
  dueDate?: string;
  totalInterest: number;
  totalPayable: number;
  balance: number;
  status: string;
  penaltyAccrued: number;
  loanType?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  securities?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorId?: string;
  installmentAmount?: number;
  documentUrl?: string;
  createdBy?: string;
  isHighRisk?: boolean;
  lifecycleState?: string;
  daysPastDue?: number;
  remainingPrincipal?: number;
  remainingInterest?: number;
  remainingPenalties?: number;
  remainingFees?: number;
  amountApplied?: number;
  principalDisbursed?: number;
  disbursedAt?: string;
  /** ISO timestamp this cache record was written */
  cachedAt: string;
}

// ─── Database class ────────────────────────────────────────────────────────────

export class ElelyonOfflineDB extends Dexie {
  outbox!: Table<OutboxEntry, number>;
  cachedClients!: Table<CachedClient, string>;
  cachedLoans!: Table<CachedLoan, string>;

  constructor() {
    super('ElelyonOfflineDB');

    this.version(1).stores({
      // outbox: auto-increment id, index on status for efficient queue reads
      outbox: '++id, actionType, status, createdAt',
      // cachedClients: primary key $id, indexes for filtering
      cachedClients: '$id, nationalId, phone, cachedAt',
      // cachedLoans: primary key $id, indexes for client lookups and status
      cachedLoans: '$id, clientId, status, cachedAt',
    });
  }
}

// ─── Singleton instance ────────────────────────────────────────────────────────
// Lazily created once and reused across the app.
// Guards against SSR: Dexie will throw if instantiated on the server.

let _db: ElelyonOfflineDB | null = null;

export function getOfflineDB(): ElelyonOfflineDB {
  if (typeof window === 'undefined') {
    throw new Error('[ElelyonOfflineDB] Cannot be used on the server.');
  }
  if (!_db) {
    _db = new ElelyonOfflineDB();
  }
  return _db;
}

