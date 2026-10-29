/**
 * backfill_installments.mjs
 *
 * One-time script: for each financing agreement that has repayments but
 * installments with principal_paid = 0, re-cascade all repayments onto the
 * installments using the waterfall logic.
 *
 * Run with: node scripts/backfill_installments.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ecrabendfyuyygavswih.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcmFiZW5kZnl1eXlnYXZzd2loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTYyMDcyNCwiZXhwIjoyMTA1MTk2NzI0fQ.jKXrty03-HAF6AEcSAwJpckEfwroUsRsCrJ0kvPR-qk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function allocate(paymentAmount, penalties, principal) {
  let remaining = paymentAmount;
  const allocPen = Math.min(remaining, penalties);
  remaining -= allocPen;
  const allocPrin = Math.min(remaining, principal);
  return { allocPen, allocPrin, leftover: remaining - allocPrin };
}

async function backfillAgreement(agId, contractNo) {
  console.log(`\n── ${contractNo} (${agId})`);

  // Fetch repayments sorted oldest-first
  const { data: reps } = await supabase
    .from('repayments')
    .select('id, amount_paid, allocated_penalties, allocated_principal')
    .eq('agreement_id', agId)
    .order('payment_date', { ascending: true });

  if (!reps || reps.length === 0) {
    console.log('  no repayments — skip');
    return;
  }

  // Fetch installments
  const { data: installments } = await supabase
    .from('financing_installments')
    .select('*')
    .eq('agreement_id', agId)
    .order('installment_number', { ascending: true });

  if (!installments || installments.length === 0) {
    console.log('  no installments — skip');
    return;
  }

  // Reset all installment paid fields to 0
  for (const inst of installments) {
    await supabase.from('financing_installments').update({
      principal_paid: 0,
      interest_paid: 0,
      penalties_paid: 0,
      fees_paid: 0,
      is_settled: false,
      status: 'Pending',
      paid_date: null,
    }).eq('id', inst.id);
  }

  // Replay all repayments in chronological order
  const state = installments.map(i => ({
    ...i,
    principal_paid: 0,
    interest_paid: 0,
    penalties_paid: 0,
    fees_paid: 0,
    amount_paid: 0,
    is_settled: false,
  }));

  let totalAllocPrin = 0;
  let totalAllocPen = 0;

  for (const rep of reps) {
    const repAmount = Number(rep.amount_paid);

    // Compute remaining penalties and principal from state
    const remPenalties = state.reduce((s, i) =>
      s + Math.max(0, (Number(i.penalties_due) || 0) - (Number(i.penalties_paid) || 0)), 0);
    const remPrincipal = state.reduce((s, i) =>
      s + Math.max(0, (Number(i.principal_due) || 0) - (Number(i.principal_paid) || 0))
        + Math.max(0, (Number(i.interest_due)  || 0) - (Number(i.interest_paid)  || 0))
        + Math.max(0, (Number(i.fees_due)       || 0) - (Number(i.fees_paid)      || 0))
    , 0);

    let remPenToAlloc = Math.min(repAmount, remPenalties);
    let remPrinToAlloc = Math.min(repAmount - remPenToAlloc, remPrincipal);

    for (const inst of state) {
      if (remPenToAlloc <= 0 && remPrinToAlloc <= 0) break;

      const instRemPen = Math.max(0, (Number(inst.penalties_due) || 0) - (Number(inst.penalties_paid) || 0));
      const instRemPrin = Math.max(0, (Number(inst.principal_due) || 0) - (Number(inst.principal_paid) || 0));
      const instRemInt  = Math.max(0, (Number(inst.interest_due)  || 0) - (Number(inst.interest_paid)  || 0));

      const ap = Math.min(remPenToAlloc, instRemPen);
      remPenToAlloc -= ap;

      const ai = Math.min(remPrinToAlloc, instRemInt);
      remPrinToAlloc -= ai;

      const apr = Math.min(remPrinToAlloc, instRemPrin);
      remPrinToAlloc -= apr;

      if (ap > 0 || ai > 0 || apr > 0) {
        inst.penalties_paid = (Number(inst.penalties_paid) || 0) + ap;
        inst.interest_paid  = (Number(inst.interest_paid)  || 0) + ai;
        inst.principal_paid = (Number(inst.principal_paid) || 0) + apr;
        inst.amount_paid    = (Number(inst.amount_paid)    || 0) + ap + ai + apr;
        totalAllocPrin += apr;
        totalAllocPen  += ap;
      }
    }
  }

  // Write updated state back
  let settledCount = 0;
  for (const inst of state) {
    const is_settled =
      (Number(inst.principal_paid) >= Number(inst.principal_due)) &&
      (Number(inst.interest_paid)  >= Number(inst.interest_due))  &&
      (Number(inst.penalties_paid) >= Number(inst.penalties_due));

    const { error } = await supabase.from('financing_installments').update({
      principal_paid: inst.principal_paid,
      interest_paid:  inst.interest_paid,
      penalties_paid: inst.penalties_paid,
      fees_paid:      inst.fees_paid,
      is_settled,
      status: is_settled ? 'Paid' : (inst.amount_paid > 0 ? 'Partial' : 'Pending'),
    }).eq('id', inst.id);

    if (error) console.error('  update error:', error.message);
    if (is_settled) settledCount++;
  }

  // Reconcile agreement balance
  const reconBalance = state.reduce((s, i) =>
    s + Math.max(0, (Number(i.principal_due) || 0) - (Number(i.principal_paid) || 0))
      + Math.max(0, (Number(i.interest_due)  || 0) - (Number(i.interest_paid)  || 0))
      + Math.max(0, (Number(i.fees_due)       || 0) - (Number(i.fees_paid)      || 0))
      + Math.max(0, (Number(i.penalties_due)  || 0) - (Number(i.penalties_paid) || 0))
  , 0);
  const reconPenalties = state.reduce((s, i) =>
    s + Math.max(0, (Number(i.penalties_due) || 0) - (Number(i.penalties_paid) || 0)), 0);

  await supabase.from('financing_agreements').update({
    balance: Math.max(0, reconBalance),
    total_penalties: reconPenalties,
    status: reconBalance <= 0 ? 'completed' : undefined,
  }).eq('id', agId);

  const totalPaid = reps.reduce((s, r) => s + Number(r.amount_paid), 0);
  console.log(`  repayments: ${reps.length}, total paid: ${totalPaid.toLocaleString()}`);
  console.log(`  installments settled: ${settledCount}/${state.length}`);
  console.log(`  reconciled balance: ${reconBalance.toLocaleString()}`);
}

async function main() {
  console.log('Backfilling installments from repayments...\n');

  // Get all agreements that have repayments
  const { data: reps } = await supabase
    .from('repayments')
    .select('agreement_id')
    .order('agreement_id');

  if (!reps) { console.log('No repayments found.'); return; }

  const agreementIds = [...new Set(reps.map(r => r.agreement_id))];
  console.log(`Found ${agreementIds.length} agreements with repayments`);

  for (const agId of agreementIds) {
    const { data: ag } = await supabase
      .from('financing_agreements')
      .select('contract_no')
      .eq('id', agId)
      .single();
    await backfillAgreement(agId, ag?.contract_no || agId);
  }

  console.log('\nBackfill complete.');
}

main().catch(console.error);
