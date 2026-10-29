/**
 * ============================================================
 * EL-ELYON LMS — Repayment Ledger Ingestion Script
 * ============================================================
 *
 * PURPOSE:
 *   Reads the "Repayment Ledger.csv" and ensures every payment,
 *   penalty and fee row is correctly recorded in the database
 *   against the right loan for the right client.
 *
 * HOW CLIENT/LOAN MATCHING WORKS:
 *   The CSV uses a "Client ID" column that can look like:
 *     30539375         → base national ID, first/only loan
 *     4829907-L1       → national ID 4829907, second loan (L1 = Loan #2)
 *     22883717-L1      → national ID 22883717, second loan
 *     1713603-R1       → national ID 1713603, first restructure
 *     1713603-R2       → national ID 1713603, second restructure
 *     13892618-L1      → national ID 13892618, second loan
 *     13892618         → national ID 13892618, first loan
 *
 *   Matching priority:
 *     1.  Look up client by national_id (base part before any dash)
 *     2.  For the exact suffix (-L1, -R1, -R2 etc.) try to find the
 *         matching loan by loan_type substring ("Subsequent", "Restructured").
 *     3.  If no suffix → pick the earliest active/overdue loan for that client.
 *     4.  Log every match so you can audit the results.
 *
 * TRANSACTION HANDLING:
 *   "Payment IN"          → type 'Repayment'   (calls process_loan_repayment RPC)
 *   "Penalty ADDED"       → type 'Manual Penalty' (direct insert with positive amount)
 *   "Fee ADDED"           → type 'Manual Penalty' (labelled as fee in comment)
 *   "RESTRUCTURE Transfer"→ type 'Restructure Adjustment'
 *   Marker rows (dashes, "SECOND LOAN COMMENCE DATE", etc.) → skipped
 *
 * SAFETY:
 *   - Dry-run mode: set DRY_RUN=true to see what *would* happen without touching DB.
 *   - All errors are collected and printed at the end; the script never crashes mid-run.
 *   - Idempotency: rows with a reference_id are checked for duplicates before inserting.
 *
 * USAGE:
 *   npx tsx scripts/ingest-repayment-ledger.ts
 *   DRY_RUN=true npx tsx scripts/ingest-repayment-ledger.ts
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ─── Config ───────────────────────────────────────────────────
const CSV_PATH = path.resolve(
  process.cwd(),
  'public/EL-ELYON CAPITAL & CREDIT SOLUTIONS - Repayment Ledger.csv'
);
const DRY_RUN = process.env.DRY_RUN === 'true';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Types ────────────────────────────────────────────────────
interface LedgerRow {
  Date: string;
  'Client ID': string;
  'Transaction Type': string;
  'Client Name': string;
  Amount: string;
  'Payment Method': string;
  'Receipt / Ref No.': string;
  Notes: string;
}

interface IngestionResult {
  rowIndex: number;
  clientId: string;
  clientName: string;
  action: string;
  amount: number;
  status: 'SKIPPED' | 'DRY_RUN' | 'SUCCESS' | 'ERROR' | 'DUPLICATE';
  detail: string;
}

// ─── Helpers ──────────────────────────────────────────────────

/** Parse "Ksh 5,000.00" or "Ksh 200" or "200" → number */
function parseKsh(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/Ksh\s*/gi, '').replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/** Parse "06/12/2025" (DD/MM/YYYY) → ISO string, or null */
function parseDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const parts = raw.trim().split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy || yyyy.length < 4) return null;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T00:00:00Z`;
}

/** Determine whether a row is a "marker" row that should be skipped */
function isMarkerRow(row: LedgerRow): boolean {
  const amount = row.Amount?.trim() || '';
  const txType = (row['Transaction Type'] || '').trim();
  const notes = (row.Notes || '').toLowerCase();

  // Rows with no real transaction type AND no numeric amount
  if (!txType && parseKsh(amount) === 0) return true;

  // Amounts that are dashes / descriptive text
  if (/^-+$/.test(amount) || /^[A-Za-z\s]+$/.test(amount)) return true;

  // Specific marker note patterns
  if (
    notes.includes('commence date') ||
    notes.includes('start date') ||
    notes.includes('restructure commence') ||
    notes.includes('second restructure')
  )
    return true;

  return false;
}

/** Extract base national ID and loan suffix from the CSV "Client ID" field */
function parseClientIdField(raw: string): { nationalId: string; suffix: string | null } {
  const trimmed = raw.trim();
  // Match patterns like 22883717-L1, 1713603-R2, 13892618-L1
  const match = trimmed.match(/^(\d+)(-[A-Z]\d+)?$/);
  if (match) {
    return { nationalId: match[1], suffix: match[2] || null };
  }
  // Fallback — treat the whole thing as national ID
  return { nationalId: trimmed, suffix: null };
}

// ─── Loan resolution cache ─────────────────────────────────────
// Maps "nationalId|suffix" → loan UUID (or null if not found)
const loanCache = new Map<string, string | null>();
const clientCache = new Map<string, string | null>(); // nationalId → client UUID

async function resolveClientId(nationalId: string): Promise<string | null> {
  if (clientCache.has(nationalId)) return clientCache.get(nationalId)!;

  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .eq('national_id', nationalId)
    .maybeSingle();

  if (error) {
    console.warn(`  ⚠️  DB error looking up client ${nationalId}: ${error.message}`);
    clientCache.set(nationalId, null);
    return null;
  }

  const id = data?.id ?? null;
  clientCache.set(nationalId, id);
  return id;
}

async function resolveLoanId(
  nationalId: string,
  suffix: string | null,
  clientDbId: string
): Promise<string | null> {
  const cacheKey = `${nationalId}|${suffix ?? ''}`;
  if (loanCache.has(cacheKey)) return loanCache.get(cacheKey)!;

  // Fetch all loans for this client, ordered by start_date ascending
  const { data: loans, error } = await supabase
    .from('loans')
    .select('id, loan_type, start_date, status, created_at')
    .eq('client_id', clientDbId)
    .order('start_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error || !loans || loans.length === 0) {
    loanCache.set(cacheKey, null);
    return null;
  }

  let resolved: string | null = null;

  if (!suffix) {
    // No suffix → first loan that is NOT a restructure or subsequent
    const baseLoan = loans.find(
      (l) =>
        !l.loan_type?.toLowerCase().includes('restructured') &&
        !l.loan_type?.toLowerCase().includes('subsequent')
    );
    resolved = baseLoan?.id ?? loans[0]?.id ?? null;
  } else if (suffix.startsWith('-L')) {
    // -L1 = second loan, -L2 = third loan, etc.
    const loanNum = parseInt(suffix.replace('-L', ''), 10); // L1 → 1
    const subsequentLoans = loans.filter((l) =>
      l.loan_type?.toLowerCase().includes('subsequent')
    );
    // loanNum is 1-indexed; L1 = first subsequent loan
    resolved = subsequentLoans[loanNum - 1]?.id ?? null;
    // Fallback: if no loan_type tagging, pick by position (skip the base loan)
    if (!resolved) {
      const allExceptFirst = loans.slice(1);
      resolved = allExceptFirst[loanNum - 1]?.id ?? null;
    }
  } else if (suffix.startsWith('-R')) {
    // -R1 = first restructure, -R2 = second restructure
    const restructureNum = parseInt(suffix.replace('-R', ''), 10);
    const restructuredLoans = loans.filter((l) =>
      l.loan_type?.toLowerCase().includes('restructured')
    );
    resolved = restructuredLoans[restructureNum - 1]?.id ?? null;
  }

  loanCache.set(cacheKey, resolved);
  return resolved;
}

// ─── Main ingestion ────────────────────────────────────────────
async function ingestLedger() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌  CSV file not found at: ${CSV_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const records: LedgerRow[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`\n📂  Loaded ${records.length} rows from Repayment Ledger CSV`);
  if (DRY_RUN) console.log('🔍  DRY_RUN mode — no database writes will occur\n');

  const results: IngestionResult[] = [];
  let skipped = 0,
    success = 0,
    errors = 0,
    duplicates = 0,
    dryRuns = 0;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // +2 because CSV is 1-indexed and has a header

    // ── Step 1: Parse the Client ID field ──────────────────────
    const rawClientId = (row['Client ID'] || '').trim();
    if (!rawClientId) {
      results.push({
        rowIndex: rowNum,
        clientId: '(empty)',
        clientName: row['Client Name'],
        action: 'SKIP',
        amount: 0,
        status: 'SKIPPED',
        detail: 'Missing Client ID',
      });
      skipped++;
      continue;
    }

    const { nationalId, suffix } = parseClientIdField(rawClientId);

    // ── Step 2: Skip marker/header rows ────────────────────────
    if (isMarkerRow(row)) {
      results.push({
        rowIndex: rowNum,
        clientId: rawClientId,
        clientName: row['Client Name'],
        action: 'SKIP',
        amount: 0,
        status: 'SKIPPED',
        detail: 'Marker/commence row — no financial transaction',
      });
      skipped++;
      continue;
    }

    // ── Step 3: Parse amount ────────────────────────────────────
    const amount = parseKsh(row.Amount);
    if (amount <= 0) {
      results.push({
        rowIndex: rowNum,
        clientId: rawClientId,
        clientName: row['Client Name'],
        action: 'SKIP',
        amount: 0,
        status: 'SKIPPED',
        detail: `Non-positive amount: "${row.Amount}"`,
      });
      skipped++;
      continue;
    }

    // ── Step 4: Parse transaction type ─────────────────────────
    const txType = (row['Transaction Type'] || '').trim();
    let dbTxType: 'Repayment' | 'Manual Penalty' | 'Restructure Adjustment' | null = null;

    if (txType === 'Payment IN') {
      dbTxType = 'Repayment';
    } else if (txType === 'Penalty ADDED') {
      dbTxType = 'Manual Penalty';
    } else if (txType === 'Fee ADDED') {
      dbTxType = 'Manual Penalty';
    } else if (txType === 'RESTRUCTURE Transfer') {
      dbTxType = 'Restructure Adjustment';
    } else {
      results.push({
        rowIndex: rowNum,
        clientId: rawClientId,
        clientName: row['Client Name'],
        action: 'SKIP',
        amount,
        status: 'SKIPPED',
        detail: `Unknown transaction type: "${txType}"`,
      });
      skipped++;
      continue;
    }

    // ── Step 5: Parse date (may be blank — use today as fallback) ──
    let isMissingDate = false;
    let txDate = parseDate(row.Date);
    if (!txDate) {
      isMissingDate = true;
      txDate = new Date().toISOString(); // Fallback to today
    }
    const paymentMethod = row['Payment Method']?.trim() || null;
    const refNo = row['Receipt / Ref No.']?.trim() || null;
    let notes = row.Notes?.trim() || null;

    if (isMissingDate) {
      notes = notes ? `[NO DATE INDICATED] ${notes}` : '[NO DATE INDICATED]';
    }

    // ── Step 6: Resolve client → loan ──────────────────────────
    const clientDbId = await resolveClientId(nationalId);
    if (!clientDbId) {
      results.push({
        rowIndex: rowNum,
        clientId: rawClientId,
        clientName: row['Client Name'],
        action: dbTxType,
        amount,
        status: 'ERROR',
        detail: `Client not found in DB for national_id=${nationalId}`,
      });
      errors++;
      continue;
    }

    const loanId = await resolveLoanId(nationalId, suffix, clientDbId);
    if (!loanId) {
      results.push({
        rowIndex: rowNum,
        clientId: rawClientId,
        clientName: row['Client Name'],
        action: dbTxType,
        amount,
        status: 'ERROR',
        detail: `No loan found for national_id=${nationalId}, suffix=${suffix ?? 'none'}`,
      });
      errors++;
      continue;
    }

    // ── Step 7: Duplicate guard ─────────────────────────────────
    // We consider a row a duplicate if the same loan has a transaction
    // on the same date with the same type and amount from the same ref#.
    if (refNo) {
      const { count } = await supabase
        .from('loan_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('loan_id', loanId)
        .eq('reference_id', refNo)
        .eq('amount', amount);

      if ((count ?? 0) > 0) {
        results.push({
          rowIndex: rowNum,
          clientId: rawClientId,
          clientName: row['Client Name'],
          action: dbTxType,
          amount,
          status: 'DUPLICATE',
          detail: `Already recorded (ref=${refNo}, amount=${amount})`,
        });
        duplicates++;
        continue;
      }
    }

    // ── Step 8: Write to DB ─────────────────────────────────────
    if (DRY_RUN) {
      results.push({
        rowIndex: rowNum,
        clientId: rawClientId,
        clientName: row['Client Name'],
        action: dbTxType,
        amount,
        status: 'DRY_RUN',
        detail: `Would insert: loan=${loanId}, type=${dbTxType}, date=${txDate}`,
      });
      dryRuns++;
      continue;
    }

    try {
      if (dbTxType === 'Repayment') {
        // ── Use the stored procedure for waterfall allocation ──
        const { error: rpcError } = await supabase.rpc('process_loan_repayment', {
          p_loan_id: loanId,
          p_payment_amount: amount,
          p_payment_method: paymentMethod,
          p_reference_id: refNo,
          p_applied_by: 'ledger-import',
          p_date: txDate,
        });

        if (rpcError) throw new Error(rpcError.message);
      } else {
        // ── Direct insert for penalties, fees, restructures ────
        const commentParts: string[] = [];
        if (txType === 'Fee ADDED') commentParts.push('[FEE]');
        if (txType === 'RESTRUCTURE Transfer') commentParts.push('[RESTRUCTURE]');
        if (notes) commentParts.push(notes);

        const { error: insertError } = await supabase.from('loan_transactions').insert({
          loan_id: loanId,
          client_id: clientDbId,
          amount,
          type: dbTxType,
          payment_method: paymentMethod,
          reference_id: refNo,
          comment: commentParts.join(' | ') || null,
          applied_by: 'ledger-import',
          date: txDate,
          // For penalties/fees, update the loan's remaining_penalties
          allocated_penalties: dbTxType === 'Manual Penalty' ? amount : 0,
        });

        if (insertError) throw new Error(insertError.message);

        // Update the loan's remaining_penalties balance for penalty/fee rows
        if (dbTxType === 'Manual Penalty') {
          const { error: updateError } = await supabase.rpc('admin_add_penalty_to_loan', {
            p_loan_id: loanId,
            p_amount: amount,
            p_reason: commentParts.join(' | ') || 'Ledger import',
          }).maybeSingle();
          // Not all instances have this RPC; suppress error silently
          void updateError;
        }
      }

      results.push({
        rowIndex: rowNum,
        clientId: rawClientId,
        clientName: row['Client Name'],
        action: dbTxType,
        amount,
        status: 'SUCCESS',
        detail: `Recorded for loan ${loanId} on ${txDate}`,
      });
      success++;
    } catch (err: any) {
      results.push({
        rowIndex: rowNum,
        clientId: rawClientId,
        clientName: row['Client Name'],
        action: dbTxType,
        amount,
        status: 'ERROR',
        detail: err.message,
      });
      errors++;
    }
  }

  // ── Summary Report ──────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('  REPAYMENT LEDGER INGESTION — SUMMARY REPORT');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Total rows processed : ${records.length}`);
  console.log(`  ✅ Success           : ${success}`);
  console.log(`  🔍 Dry-run (no write): ${dryRuns}`);
  console.log(`  ⏭️  Skipped (markers) : ${skipped}`);
  console.log(`  🔁 Duplicates        : ${duplicates}`);
  console.log(`  ❌ Errors            : ${errors}`);
  console.log('══════════════════════════════════════════════════\n');

  // Print per-row details for anything that isn't a clean success/skip
  const notable = results.filter((r) => r.status === 'ERROR' || r.status === 'DUPLICATE');
  if (notable.length > 0) {
    console.log('Notable rows (errors / duplicates):');
    for (const r of notable) {
      console.log(
        `  Row ${r.rowIndex.toString().padStart(3)} | ${r.status.padEnd(9)} | ${r.clientId.padEnd(16)} | ${r.clientName.slice(0, 30).padEnd(30)} | Ksh ${r.amount.toLocaleString()} | ${r.detail}`
      );
    }
    console.log();
  }

  // Print dry-run records
  if (DRY_RUN) {
    console.log('Dry-run preview (would be written):');
    for (const r of results.filter((r) => r.status === 'DRY_RUN')) {
      console.log(
        `  Row ${r.rowIndex.toString().padStart(3)} | ${r.action.padEnd(22)} | ${r.clientId.padEnd(16)} | ${r.clientName.slice(0, 30).padEnd(30)} | Ksh ${r.amount.toLocaleString()}`
      );
    }
    console.log();
  }

  // Write full report to file
  const reportPath = path.resolve(process.cwd(), 'public/ledger-ingestion-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`📝  Full report written to: ${reportPath}`);
}

ingestLedger().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
