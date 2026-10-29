/**
 * diagnose-loan.ts
 * Usage: node node_modules\tsx\dist\cli.mjs scripts/diagnose-loan.ts 4B4D90FF
 *
 * Pulls every relevant row from the DB for the given loan suffix/ID
 * and prints a full breakdown of principal, interest, penalties, fees,
 * and how they compare to what the UI calculates.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const fmt = (n: number) =>
  "KES " + n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pct = (paid: number, due: number) =>
  due === 0 ? "—" : ((paid / due) * 100).toFixed(1) + "%";

async function run() {
  const suffix = (process.argv[2] || "").toUpperCase().replace(/-/g, "");
  if (!suffix) {
    console.error("Usage: npx tsx scripts/diagnose-loan.ts <loan-id-suffix>");
    process.exit(1);
  }

  // ── 1. Find the loan ──────────────────────────────────────────────────────
  // Supabase ilike doesn't work on UUID columns — fetch all and filter in JS
  const { data: allLoans, error: loanErr } = await supabase
    .from("loans")
    .select("id, status, lifecycle_state, loan_type, client_id, principal_amount, total_interest, total_payable, balance, remaining_principal, remaining_interest, remaining_penalties, remaining_fees, days_past_due, start_date, due_date, duration_in_months");

  if (loanErr) throw loanErr;

  const loans = (allLoans ?? []).filter(l =>
    l.id.replace(/-/g, "").toUpperCase().includes(suffix)
  );
  if (!loans || loans.length === 0) {
    console.error(`❌  No loan found matching suffix: ${suffix}`);
    process.exit(1);
  }
  if (loans.length > 1) {
    console.warn(`⚠️  Multiple loans matched — using the first one:`);
    loans.forEach((l) => console.warn(`   ${l.id}  ${l.status}`));
  }

  const loan = loans[0];
  const loanId = loan.id;

  // ── 2. Pull all related data ──────────────────────────────────────────────
  const [
    { data: client },
    { data: installments },
    { data: transactions },
    { data: auditLogs },
  ] = await Promise.all([
    supabase.from("clients").select("first_name, last_name, phone").eq("id", loan.client_id).single(),
    supabase.from("loan_installments").select("*").eq("loan_id", loanId).order("installment_number", { ascending: true }),
    supabase.from("loan_transactions").select("*").eq("loan_id", loanId).order("date", { ascending: true }),
    supabase.from("audit_logs").select("action, description, created_at").eq("loan_id", loanId).order("created_at", { ascending: true }),
  ]);

  const insts = installments ?? [];
  const txs = transactions ?? [];

  // ── 3. Loan header ────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(72));
  console.log(`  LOAN DIAGNOSTIC — ${loanId.slice(-8).toUpperCase()}`);
  console.log(`  Client : ${client?.first_name} ${client?.last_name}  (${client?.phone})`);
  console.log(`  Status : ${loan.status}  |  Lifecycle: ${loan.lifecycle_state ?? "Standard"}`);
  console.log(`  Type   : ${loan.loan_type}`);
  console.log("═".repeat(72));

  // ── 4. DB stored fields ───────────────────────────────────────────────────
  console.log("\n─── DB LOAN FIELDS ───────────────────────────────────────────────────");
  console.log(`  principal_amount    : ${fmt(+loan.principal_amount)}`);
  console.log(`  total_interest      : ${fmt(+loan.total_interest)}`);
  console.log(`  total_payable       : ${fmt(+loan.total_payable)}  ← principal + interest (+ rollover fees if any)`);
  console.log(`  balance (generated) : ${fmt(+loan.balance)}  ← DB computed from remaining_*`);
  console.log(`  remaining_principal : ${fmt(+loan.remaining_principal)}`);
  console.log(`  remaining_interest  : ${fmt(+loan.remaining_interest)}`);
  console.log(`  remaining_penalties : ${fmt(+loan.remaining_penalties)}`);
  console.log(`  remaining_fees      : ${fmt(+loan.remaining_fees)}`);
  console.log(`  days_past_due       : ${loan.days_past_due}`);
  console.log(`  start_date          : ${loan.start_date}`);
  console.log(`  due_date            : ${loan.due_date}`);

  // ── 5. Installments table ─────────────────────────────────────────────────
  console.log("\n─── INSTALLMENTS (" + insts.length + " rows) ──────────────────────────────────────");
  let instSumPrinDue = 0, instSumPrinPaid = 0;
  let instSumIntDue = 0, instSumIntPaid = 0;
  let instSumPenDue = 0, instSumPenPaid = 0;
  let instSumFeesDue = 0, instSumFeesPaid = 0;

  for (const inst of insts) {
    const pd = +inst.principal_due, pp = +inst.principal_paid;
    const id = +inst.interest_due,  ip = +inst.interest_paid;
    const nd = +inst.penalties_due, np = +inst.penalties_paid;
    const fd = +inst.fees_due,      fp = +inst.fees_paid;
    instSumPrinDue  += pd; instSumPrinPaid  += pp;
    instSumIntDue   += id; instSumIntPaid   += ip;
    instSumPenDue   += nd; instSumPenPaid   += np;
    instSumFeesDue  += fd; instSumFeesPaid  += fp;

    const remRow = (pd-pp) + (id-ip) + (nd-np) + (fd-fp);
    const flag = remRow < -0.01 ? " ← ⚠️ OVERPAID" : "";
    console.log(
      `  #${String(inst.installment_number).padEnd(3)} ${inst.status.padEnd(12)} due:${new Date(inst.due_date).toLocaleDateString("en-KE")}` +
      `  P:${fmt(pd-pp).padStart(16)}  I:${fmt(id-ip).padStart(14)}  Pen:${fmt(nd-np).padStart(12)}  Fee:${fmt(fd-fp).padStart(12)}${flag}`
    );
  }

  console.log("  " + "─".repeat(68));
  console.log(`  TOTALS (due / paid / remaining):`);
  console.log(`    Principal : ${fmt(instSumPrinDue)} / ${fmt(instSumPrinPaid)} / ${fmt(instSumPrinDue - instSumPrinPaid)}`);
  console.log(`    Interest  : ${fmt(instSumIntDue)}  / ${fmt(instSumIntPaid)}  / ${fmt(instSumIntDue - instSumIntPaid)}`);
  console.log(`    Penalties : ${fmt(instSumPenDue)}  / ${fmt(instSumPenPaid)}  / ${fmt(instSumPenDue - instSumPenPaid)}`);
  console.log(`    Fees      : ${fmt(instSumFeesDue)} / ${fmt(instSumFeesPaid)} / ${fmt(instSumFeesDue - instSumFeesPaid)}`);

  const instTotalDue  = instSumPrinDue  + instSumIntDue  + instSumPenDue  + instSumFeesDue;
  const instTotalPaid = instSumPrinPaid + instSumIntPaid + instSumPenPaid + instSumFeesPaid;
  const instTotalRem  = instTotalDue - instTotalPaid;
  console.log(`    ─────────────────────────────────────────────────────────`);
  console.log(`    GRAND    : ${fmt(instTotalDue)} / ${fmt(instTotalPaid)} / ${fmt(instTotalRem)}`);

  // ── 6. Transactions table ─────────────────────────────────────────────────
  console.log("\n─── TRANSACTIONS (" + txs.length + " rows) ─────────────────────────────────────────");
  let txRepayTotal = 0, txPenaltyTotal = 0, txDisbTotal = 0, txWaiverTotal = 0;
  for (const tx of txs) {
    const amt = +tx.amount;
    const isRev = tx.status === "Reversed";
    const marker = isRev ? " [REVERSED]" : "";
    console.log(
      `  ${new Date(tx.date).toLocaleDateString("en-KE").padEnd(12)} ${tx.type.padEnd(22)} ` +
      `${fmt(amt).padStart(16)} ${(tx.payment_method || "").padEnd(20)} ${tx.status}${marker}`
    );
    if (!isRev) {
      if (tx.type === "Repayment")      txRepayTotal   += amt;
      if (tx.type === "Manual Penalty") txPenaltyTotal += amt;
      if (tx.type === "Disbursement")   txDisbTotal    += amt;
      if (tx.type === "Waiver")         txWaiverTotal  += amt;
    }
  }
  console.log("  " + "─".repeat(68));
  console.log(`  Active Repayments   : ${fmt(txRepayTotal)}`);
  console.log(`  Active Penalties    : ${fmt(txPenaltyTotal)}`);
  console.log(`  Disbursements       : ${fmt(txDisbTotal)}`);
  console.log(`  Waivers             : ${fmt(txWaiverTotal)}`);

  // ── 7. UI Calculation Simulation ─────────────────────────────────────────
  console.log("\n─── UI CALCULATION SIMULATION ───────────────────────────────────────");

  const isNotPending = loan.status !== "Pending";

  // Outstanding Balance (fixed formula)
  const remPrin = isNotPending ? Math.max(0, instSumPrinDue - instSumPrinPaid) : +loan.principal_amount;
  const remInt  = isNotPending ? Math.max(0, instSumIntDue  - instSumIntPaid)  : +loan.total_interest;
  const remPen  = isNotPending ? Math.max(0, instSumPenDue  - instSumPenPaid)  : 0;
  const remFees = isNotPending ? Math.max(0, instSumFeesDue - instSumFeesPaid) : 0;
  const outstandingBalance = remPrin + remInt + remPen + remFees;

  // Total Expected (fixed formula)
  const totalExpected = isNotPending ? instTotalDue : +loan.total_payable;

  // Total Collected
  const totalCollected = txRepayTotal + txWaiverTotal;

  console.log(`  Total Expected (UI)      : ${fmt(totalExpected)}`);
  console.log(`    ↳ from installments    : Σ(principal_due + interest_due + penalties_due + fees_due)`);
  console.log(`    ↳ vs loan.totalPayable : ${fmt(+loan.total_payable)}`);
  const tpDiff = totalExpected - +loan.total_payable;
  if (Math.abs(tpDiff) > 0.01) {
    console.log(`    ↳ DIFFERENCE           : ${fmt(tpDiff)} ${tpDiff > 0 ? "(installments > totalPayable — extra penalties/fees)" : "(installments < totalPayable — some data missing?)"}`);
  }

  console.log(`\n  Total Collected (UI)     : ${fmt(totalCollected)}`);
  console.log(`    ↳ Repayments           : ${fmt(txRepayTotal)}`);
  console.log(`    ↳ Waivers              : ${fmt(txWaiverTotal)}`);

  console.log(`\n  Outstanding Balance (UI) : ${fmt(outstandingBalance)}`);
  console.log(`    ↳ Rem. Principal       : ${fmt(remPrin)}`);
  console.log(`    ↳ Rem. Interest        : ${fmt(remInt)}`);
  console.log(`    ↳ Rem. Penalties       : ${fmt(remPen)}`);
  console.log(`    ↳ Rem. Fees            : ${fmt(remFees)}`);
  console.log(`    ↳ DB balance field     : ${fmt(+loan.balance)}`);

  const balDiff = outstandingBalance - +loan.balance;
  if (Math.abs(balDiff) > 0.01) {
    console.log(`    ↳ ⚠️  MISMATCH vs DB    : ${fmt(balDiff)}`);
  } else {
    console.log(`    ↳ ✅  Matches DB balance`);
  }

  const impliedBalance = totalExpected - totalCollected;
  console.log(`\n  Implied balance (Expected − Collected): ${fmt(impliedBalance)}`);
  const impliedDiff = impliedBalance - outstandingBalance;
  if (Math.abs(impliedDiff) > 0.01) {
    console.log(`  ⚠️  DISCREPANCY vs Outstanding Balance: ${fmt(impliedDiff)}`);
    console.log(`     Likely cause: allocated_to_wallet or reversed transactions in collected total`);
  } else {
    console.log(`  ✅  Expected − Collected matches Outstanding Balance`);
  }

  // ── 8. Wallet / overpayment check ────────────────────────────────────────
  const walletAllocated = txs.filter(t => t.status !== "Reversed")
    .reduce((s: number, t: any) => s + (+t.allocated_to_wallet || 0), 0);
  if (walletAllocated > 0.01) {
    console.log(`\n  ℹ️  Wallet buffer (overpayments): ${fmt(walletAllocated)}`);
    console.log(`     This amount was received but not applied to principal/interest/penalties.`);
  }

  // ── 9. Audit log summary ──────────────────────────────────────────────────
  console.log("\n─── AUDIT TRAIL (" + (auditLogs?.length ?? 0) + " events) ──────────────────────────────────────");
  for (const log of auditLogs ?? []) {
    console.log(`  ${new Date(log.created_at).toLocaleDateString("en-KE")}  ${log.action.padEnd(20)}  ${log.description?.slice(0, 80) ?? ""}`);
  }

  console.log("\n" + "═".repeat(72) + "\n");
}

run().catch((e) => { console.error(e); process.exit(1); });
