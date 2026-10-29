/**
 * ============================================================
 * EL-ELYON LMS — Repayment Ledger Analyzer (Offline)
 * ============================================================
 *
 * Runs entirely offline on the CSV — no DB connection needed.
 * Produces a per-client summary showing:
 *   - Total payments received
 *   - Total penalties/fees added
 *   - Missing dates
 *   - Loans identified (base, -L1, -R1, -R2 suffixes)
 *   - Data quality flags
 *
 * USAGE:
 *   npx tsx scripts/analyze-repayment-ledger.ts
 * ============================================================
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';

const CSV_PATH = path.resolve(
  process.cwd(),
  'public/EL-ELYON CAPITAL & CREDIT SOLUTIONS - Repayment Ledger.csv'
);

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

interface LoanSummary {
  loanKey: string; // e.g. "30539375" or "22883717-L1"
  nationalId: string;
  suffix: string | null;
  clientName: string;
  paymentsIn: number;
  penaltiesAdded: number;
  feesAdded: number;
  restructureAmount: number;
  transactionCount: number;
  missingDateCount: number;
  dateRange: { first: string | null; last: string | null };
  paymentMethods: Set<string>;
  flags: string[];
}

function parseKsh(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/Ksh\s*/gi, '').replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseClientIdField(raw: string): { nationalId: string; suffix: string | null } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d+)(-[A-Z]\d+)?$/);
  if (match) {
    return { nationalId: match[1], suffix: match[2] || null };
  }
  return { nationalId: trimmed, suffix: null };
}

function isMarkerRow(row: LedgerRow): boolean {
  const amount = row.Amount?.trim() || '';
  const txType = (row['Transaction Type'] || '').trim();
  const notes = (row.Notes || '').toLowerCase();

  if (!txType && parseKsh(amount) === 0) return true;
  if (/^-+$/.test(amount) || /^[A-Za-z\s]+$/.test(amount)) return true;
  if (
    notes.includes('commence date') ||
    notes.includes('start date') ||
    notes.includes('restructure commence') ||
    notes.includes('second restructure')
  )
    return true;

  return false;
}

function formatKsh(n: number): string {
  return `Ksh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compareDates(a: string | null, b: string | null): number {
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

// ── Main ───────────────────────────────────────────────────────
function analyze() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌  CSV not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const records: LedgerRow[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`\n📂  Loaded ${records.length} rows\n`);

  // Collect per-loan-key summaries
  const summaryMap = new Map<string, LoanSummary>();

  let totalSkippedMarkers = 0;
  let totalMissingDates = 0;
  let totalPaymentsIn = 0;
  let totalPenalties = 0;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rawClientId = (row['Client ID'] || '').trim();
    if (!rawClientId) continue;

    const { nationalId, suffix } = parseClientIdField(rawClientId);
    const loanKey = rawClientId;

    if (!summaryMap.has(loanKey)) {
      summaryMap.set(loanKey, {
        loanKey,
        nationalId,
        suffix,
        clientName: (row['Client Name'] || '').trim(),
        paymentsIn: 0,
        penaltiesAdded: 0,
        feesAdded: 0,
        restructureAmount: 0,
        transactionCount: 0,
        missingDateCount: 0,
        dateRange: { first: null, last: null },
        paymentMethods: new Set(),
        flags: [],
      });
    }

    const summary = summaryMap.get(loanKey)!;

    // Update client name if more specific
    if (row['Client Name']?.trim()) {
      summary.clientName = row['Client Name'].trim();
    }

    // Marker rows
    if (isMarkerRow(row)) {
      totalSkippedMarkers++;
      continue;
    }

    const amount = parseKsh(row.Amount);
    const txType = (row['Transaction Type'] || '').trim();
    const dateRaw = (row.Date || '').trim();
    const method = (row['Payment Method'] || '').trim();

    // Date tracking
    if (!dateRaw) {
      summary.missingDateCount++;
      totalMissingDates++;
    } else {
      // Normalize to YYYY-MM-DD for comparison
      const parts = dateRaw.split('/');
      if (parts.length === 3) {
        const iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        if (!summary.dateRange.first || iso < summary.dateRange.first) {
          summary.dateRange.first = iso;
        }
        if (!summary.dateRange.last || iso > summary.dateRange.last) {
          summary.dateRange.last = iso;
        }
      }
    }

    // Payment method tracking
    if (method) summary.paymentMethods.add(method);

    // Transaction categorization
    if (txType === 'Payment IN' && amount > 0) {
      summary.paymentsIn += amount;
      summary.transactionCount++;
      totalPaymentsIn += amount;
    } else if (txType === 'Penalty ADDED' && amount > 0) {
      summary.penaltiesAdded += amount;
      summary.transactionCount++;
      totalPenalties += amount;
    } else if (txType === 'Fee ADDED' && amount > 0) {
      summary.feesAdded += amount;
      summary.transactionCount++;
    } else if (txType === 'RESTRUCTURE Transfer' && amount > 0) {
      summary.restructureAmount += amount;
      summary.transactionCount++;
    }
  }

  // ── Flag generation ──────────────────────────────────────────
  for (const [, s] of summaryMap) {
    if (s.missingDateCount > 0) {
      s.flags.push(`⚠️  ${s.missingDateCount} row(s) with no date`);
    }
    if (s.paymentsIn === 0 && (s.penaltiesAdded > 0 || s.feesAdded > 0)) {
      s.flags.push('🔴 No payments received — only penalties/fees');
    }
    if (s.penaltiesAdded > s.paymentsIn && s.paymentsIn > 0) {
      s.flags.push('⚠️  Total penalties exceed total payments');
    }
    if (s.suffix && s.suffix.startsWith('-L')) {
      s.flags.push(`ℹ️  Second/subsequent loan (${s.suffix})`);
    }
    if (s.suffix && s.suffix.startsWith('-R')) {
      s.flags.push(`ℹ️  Restructured loan (${s.suffix})`);
    }
  }

  // ── Print per-loan summaries ─────────────────────────────────
  // Group by nationalId to show related loans together
  const grouped = new Map<string, LoanSummary[]>();
  for (const [, s] of summaryMap) {
    if (!grouped.has(s.nationalId)) grouped.set(s.nationalId, []);
    grouped.get(s.nationalId)!.push(s);
  }

  const sortedNationalIds = Array.from(grouped.keys()).sort();

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  PER-CLIENT LOAN REPAYMENT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  for (const natId of sortedNationalIds) {
    const loans = grouped.get(natId)!;
    const primaryName = loans[0].clientName;

    console.log(`┌─ ${primaryName} (National ID: ${natId})`);
    console.log(`│  Loan(s): ${loans.map((l) => l.loanKey).join(', ')}`);

    for (const loan of loans) {
      const netBalance = loan.paymentsIn - (loan.penaltiesAdded + loan.feesAdded);
      console.log(`│`);
      console.log(`│  📋 Loan: ${loan.loanKey}`);
      console.log(`│     Transactions:  ${loan.transactionCount}`);
      console.log(`│     Payments IN:   ${formatKsh(loan.paymentsIn)}`);
      if (loan.penaltiesAdded > 0)
        console.log(`│     Penalties:     ${formatKsh(loan.penaltiesAdded)}`);
      if (loan.feesAdded > 0) console.log(`│     Fees:          ${formatKsh(loan.feesAdded)}`);
      if (loan.restructureAmount > 0)
        console.log(`│     Restructured:  ${formatKsh(loan.restructureAmount)}`);
      console.log(
        `│     Date range:    ${loan.dateRange.first ?? '(no date)'} → ${loan.dateRange.last ?? '(no date)'}`
      );
      if (loan.paymentMethods.size > 0)
        console.log(`│     Methods:       ${Array.from(loan.paymentMethods).join(', ')}`);
      if (loan.missingDateCount > 0)
        console.log(`│     Missing dates: ${loan.missingDateCount} row(s)`);
      for (const flag of loan.flags) {
        console.log(`│     ${flag}`);
      }
    }

    console.log(`└${'─'.repeat(68)}\n`);
  }

  // ── Overall Summary ─────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  OVERALL TOTALS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Total CSV rows          : ${records.length}`);
  console.log(`  Marker rows (skipped)   : ${totalSkippedMarkers}`);
  console.log(`  Rows with missing date  : ${totalMissingDates}`);
  console.log(`  Unique loan accounts    : ${summaryMap.size}`);
  console.log(`  Unique clients          : ${grouped.size}`);
  console.log(`  Total Payments IN       : ${formatKsh(totalPaymentsIn)}`);
  console.log(`  Total Penalties ADDED   : ${formatKsh(totalPenalties)}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // ── Write JSON report ───────────────────────────────────────
  const report: Record<string, any> = {};
  for (const [key, s] of summaryMap) {
    report[key] = {
      ...s,
      paymentMethods: Array.from(s.paymentMethods),
    };
  }

  const reportPath = path.resolve(process.cwd(), 'public/ledger-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📝  Full JSON report written to: ${reportPath}`);
}

analyze();
