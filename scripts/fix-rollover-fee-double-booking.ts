/**
 * fix-rollover-fee-double-booking.ts
 *
 * ROOT CAUSE:
 *   The rollover action adds a rollover fee to installments.interest_due on the
 *   balloon installment AND stores a Manual Penalty transaction (payment_method = 'Rollover Fee').
 *
 *   The fix-ghost-penalties.ts script previously saw those Manual Penalty transactions
 *   as "orphaned" and pushed their amounts ALSO into installments.penalties_due.
 *
 *   Result: Rollover fees appear in BOTH interest_due AND penalties_due — causing
 *   Total Expected and Outstanding Balance to be inflated.
 *
 * FIX:
 *   For every loan with active Rollover Fee transactions:
 *     1. Sum the rollover fees
 *     2. Remove that exact amount from installments.penalties_due (starting from the
 *        last installment, clamping at 0)
 *     3. Recalculate remaining_penalties on the loan record
 *
 * DRY RUN: set DRY_RUN=true to preview without touching the DB.
 *
 * USAGE:
 *   node node_modules\tsx\dist\cli.mjs scripts\fix-rollover-fee-double-booking.ts
 *   DRY_RUN=true node node_modules\tsx\dist\cli.mjs scripts\fix-rollover-fee-double-booking.ts
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const DRY_RUN = process.env.DRY_RUN === "true";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const fmt = (n: number) =>
  "KES " + n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Step 1: Find all active Rollover Fee transactions ──────────────────────
async function run() {
  console.log(DRY_RUN ? "\n🔍 DRY RUN — no DB changes will be made\n" : "\n⚡ LIVE RUN — DB will be updated\n");

  const { data: rolloverTxs, error: txErr } = await supabase
    .from("loan_transactions")
    .select("id, loan_id, amount, payment_method, status, date")
    .eq("type", "Manual Penalty")
    .eq("payment_method", "Rollover Fee")
    .eq("status", "Active");

  if (txErr) throw txErr;
  if (!rolloverTxs || rolloverTxs.length === 0) {
    console.log("✅  No active Rollover Fee transactions found. Nothing to fix.");
    return;
  }

  // Group by loan_id
  const byLoan = new Map<string, { loanId: string; totalFees: number; txCount: number }>();
  for (const tx of rolloverTxs) {
    const existing = byLoan.get(tx.loan_id) ?? { loanId: tx.loan_id, totalFees: 0, txCount: 0 };
    existing.totalFees += Number(tx.amount);
    existing.txCount++;
    byLoan.set(tx.loan_id, existing);
  }

  console.log(`Found ${rolloverTxs.length} Rollover Fee transactions across ${byLoan.size} loans.\n`);
  console.log("─".repeat(80));

  let loansFixed = 0;
  let loansSkipped = 0;
  let totalPenaltiesCleared = 0;

  for (const { loanId, totalFees, txCount } of byLoan.values()) {

    // ── Fetch installments for this loan (newest first so we drain from the end) ──
    const { data: insts, error: instErr } = await supabase
      .from("loan_installments")
      .select("id, installment_number, penalties_due, penalties_paid, status, due_date")
      .eq("loan_id", loanId)
      .order("due_date", { ascending: false }); // newest first — drain from end

    if (instErr || !insts) {
      console.warn(`  ⚠️  [${loanId.slice(-8)}] Could not fetch installments: ${instErr?.message}`);
      continue;
    }

    // ── Calculate how much to remove from penalties_due ──────────────────────
    const totalPenaltiesDue = insts.reduce((s, i) => s + Number(i.penalties_due), 0);

    if (totalPenaltiesDue < 0.01) {
      // Nothing in penalties_due — the fee wasn't pushed in (or already cleaned)
      loansSkipped++;
      continue;
    }

    // The amount to remove is: min(totalFees, totalPenaltiesDue)
    // We never remove more than what's actually there
    const toRemove = Math.min(totalFees, totalPenaltiesDue);

    if (toRemove < 0.01) {
      loansSkipped++;
      continue;
    }

    console.log(`\n  Loan ${loanId.slice(-8).toUpperCase()}  |  ${txCount} rollover fee txs  |  fees: ${fmt(totalFees)}  |  current penalties_due: ${fmt(totalPenaltiesDue)}  |  removing: ${fmt(toRemove)}`);

    // ── Walk installments newest-first and drain the amount ──────────────────
    let remaining = toRemove;
    const updates: Array<{ id: string; new_penalties_due: number; inst_num: number; old: number }> = [];

    for (const inst of insts) {
      if (remaining <= 0.001) break;
      const currentDue = Number(inst.penalties_due);
      if (currentDue <= 0.001) continue;

      const deduction = Math.min(remaining, currentDue);
      const newDue = Math.max(0, currentDue - deduction);
      remaining -= deduction;

      updates.push({
        id: inst.id,
        new_penalties_due: Math.round(newDue * 100) / 100,
        inst_num: inst.installment_number,
        old: currentDue,
      });
    }

    for (const u of updates) {
      console.log(`    Installment #${u.inst_num}: penalties_due  ${fmt(u.old)}  →  ${fmt(u.new_penalties_due)}`);

      if (!DRY_RUN) {
        const { error } = await supabase
          .from("loan_installments")
          .update({ penalties_due: u.new_penalties_due })
          .eq("id", u.id);

        if (error) {
          console.error(`    ❌  Failed to update installment #${u.inst_num}: ${error.message}`);
        }
      }
    }

    // ── Recalculate remaining_penalties on the loan ───────────────────────────
    const { data: freshInsts } = DRY_RUN
      ? { data: insts.map(i => {
          const upd = updates.find(u => u.id === i.id);
          return upd
            ? { ...i, penalties_due: upd.new_penalties_due }
            : i;
        })}
      : await supabase
          .from("loan_installments")
          .select("penalties_due, penalties_paid")
          .eq("loan_id", loanId);

    const newRemainingPenalties = (freshInsts ?? []).reduce(
      (sum: number, i: any) => sum + Math.max(0, Number(i.penalties_due) - Number(i.penalties_paid || 0)),
      0
    );

    console.log(`    remaining_penalties: will be → ${fmt(newRemainingPenalties)}`);

    if (!DRY_RUN) {
      const { error } = await supabase
        .from("loans")
        .update({ remaining_penalties: Math.round(newRemainingPenalties * 100) / 100 })
        .eq("id", loanId);

      if (error) {
        console.error(`    ❌  Failed to update loan remaining_penalties: ${error.message}`);
      } else {
        console.log(`    ✅  Done.`);
      }
    }

    totalPenaltiesCleared += toRemove;
    loansFixed++;
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(80));
  console.log(`  SUMMARY`);
  console.log(`  ──────────────────────────────────────────`);
  console.log(`  Loans fixed               : ${loansFixed}`);
  console.log(`  Loans skipped (clean)     : ${loansSkipped}`);
  console.log(`  Total penalties_due cleared: ${fmt(totalPenaltiesCleared)}`);
  if (DRY_RUN) {
    console.log(`\n  ⚠️  DRY RUN — run without DRY_RUN=true to apply these changes.`);
  } else {
    console.log(`\n  ✅  All changes applied. Refresh the loan detail pages to verify.`);
  }
  console.log("═".repeat(80) + "\n");
}

run().catch((e) => { console.error(e); process.exit(1); });
