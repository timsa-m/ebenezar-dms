/**
 * fix-remaining-principal-sync.ts
 *
 * ROOT CAUSE:
 *   For some rolled-over loans, the loan.remaining_principal field in the loans table
 *   does not match the sum of (principal_due - principal_paid) across installments.
 *   This causes the DB-generated `balance` field to be wrong.
 *
 * FIX:
 *   For every active/overdue/loss/substandard loan, recalculate remaining_principal,
 *   remaining_interest, remaining_penalties, remaining_fees from the installments
 *   and update the loans table if there's a discrepancy.
 *
 * DRY RUN: set DRY_RUN=true to preview without touching the DB.
 *
 * USAGE:
 *   node node_modules\tsx\dist\cli.mjs scripts\fix-remaining-principal-sync.ts
 *   DRY_RUN=true node node_modules\tsx\dist\cli.mjs scripts\fix-remaining-principal-sync.ts
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

const ACTIVE_STATUSES = ["Active", "Overdue", "Substandard", "Loss"];

async function run() {
  console.log(DRY_RUN ? "\n🔍 DRY RUN — no DB changes will be made\n" : "\n⚡ LIVE RUN — DB will be updated\n");

  // Fetch all non-closed loans
  const { data: loans, error: loanErr } = await supabase
    .from("loans")
    .select("id, status, remaining_principal, remaining_interest, remaining_penalties, remaining_fees, balance")
    .in("status", ACTIVE_STATUSES);

  if (loanErr) throw loanErr;
  if (!loans || loans.length === 0) {
    console.log("No active loans found.");
    return;
  }

  console.log(`Checking ${loans.length} active loans...\n`);
  console.log("─".repeat(80));

  let fixed = 0;
  let clean = 0;
  const TOLERANCE = 0.05; // KES 0.05 rounding tolerance

  for (const loan of loans) {
    const { data: insts, error: instErr } = await supabase
      .from("loan_installments")
      .select("principal_due, principal_paid, interest_due, interest_paid, penalties_due, penalties_paid, fees_due, fees_paid")
      .eq("loan_id", loan.id);

    if (instErr || !insts || insts.length === 0) continue;

    const calcPrincipal  = insts.reduce((s, i) => s + Math.max(0, Number(i.principal_due)  - Number(i.principal_paid  || 0)), 0);
    const calcInterest   = insts.reduce((s, i) => s + Math.max(0, Number(i.interest_due)   - Number(i.interest_paid  || 0)), 0);
    const calcPenalties  = insts.reduce((s, i) => s + Math.max(0, Number(i.penalties_due)  - Number(i.penalties_paid || 0)), 0);
    const calcFees       = insts.reduce((s, i) => s + Math.max(0, Number(i.fees_due)       - Number(i.fees_paid      || 0)), 0);

    const dbPrincipal  = Number(loan.remaining_principal);
    const dbInterest   = Number(loan.remaining_interest);
    const dbPenalties  = Number(loan.remaining_penalties);
    const dbFees       = Number(loan.remaining_fees);

    const principalMismatch  = Math.abs(calcPrincipal  - dbPrincipal)  > TOLERANCE;
    const interestMismatch   = Math.abs(calcInterest   - dbInterest)   > TOLERANCE;
    const penaltiesMismatch  = Math.abs(calcPenalties  - dbPenalties)  > TOLERANCE;
    const feesMismatch       = Math.abs(calcFees       - dbFees)       > TOLERANCE;

    const hasAnymismatch = principalMismatch || interestMismatch || penaltiesMismatch || feesMismatch;

    if (!hasAnymismatch) {
      clean++;
      continue;
    }

    // Print the discrepancy
    console.log(`\n  Loan ${loan.id.slice(-8).toUpperCase()}  [${loan.status}]`);
    if (principalMismatch)  console.log(`    remaining_principal : DB=${fmt(dbPrincipal)}  →  ${fmt(calcPrincipal)}`);
    if (interestMismatch)   console.log(`    remaining_interest  : DB=${fmt(dbInterest)}   →  ${fmt(calcInterest)}`);
    if (penaltiesMismatch)  console.log(`    remaining_penalties : DB=${fmt(dbPenalties)}   →  ${fmt(calcPenalties)}`);
    if (feesMismatch)       console.log(`    remaining_fees      : DB=${fmt(dbFees)}        →  ${fmt(calcFees)}`);

    const newBalance = calcPrincipal + calcInterest + calcPenalties + calcFees;
    console.log(`    balance (generated) : DB=${fmt(Number(loan.balance))}  →  ${fmt(newBalance)}`);

    if (!DRY_RUN) {
      const update: Record<string, number> = {};
      if (principalMismatch) update.remaining_principal = Math.round(calcPrincipal * 100) / 100;
      if (interestMismatch)  update.remaining_interest  = Math.round(calcInterest  * 100) / 100;
      if (penaltiesMismatch) update.remaining_penalties = Math.round(calcPenalties * 100) / 100;
      if (feesMismatch)      update.remaining_fees      = Math.round(calcFees      * 100) / 100;

      const { error } = await supabase
        .from("loans")
        .update(update)
        .eq("id", loan.id);

      if (error) {
        console.error(`    ❌  Update failed: ${error.message}`);
      } else {
        console.log(`    ✅  Fixed.`);
      }
    }

    fixed++;
  }

  console.log("\n" + "═".repeat(80));
  console.log(`  SUMMARY`);
  console.log(`  ──────────────────────────────────────────`);
  console.log(`  Loans with mismatches fixed : ${fixed}`);
  console.log(`  Loans already clean         : ${clean}`);
  if (DRY_RUN) {
    console.log(`\n  ⚠️  DRY RUN — run without DRY_RUN=true to apply.`);
  } else {
    console.log(`\n  ✅  All remaining_* fields synced to installment columns.`);
  }
  console.log("═".repeat(80) + "\n");
}

run().catch((e) => { console.error(e); process.exit(1); });
