import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixGhostPenalties() {
  console.log('--- STARTING GHOST PENALTY FIX ---\n');

  const { data: loans, error } = await supabase
    .from('loans')
    .select(`
      id,
      status,
      balance,
      loan_transactions (
        id,
        amount,
        type,
        comment,
        date
      ),
      loan_installments (
        id,
        installment_number,
        due_date,
        fees_due,
        penalties_due,
        fees_paid,
        penalties_paid,
        is_settled
      )
    `);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  let loansFixed = 0;
  let totalPenaltyRestored = 0;
  let totalFeeRestored = 0;

  for (const loan of loans) {
    const txs = loan.loan_transactions || [];
    const insts = loan.loan_installments || [];

    // Sort installments to find the latest one to attach missing debts to
    insts.sort((a: any, b: any) => a.installment_number - b.installment_number);
    const targetInstallment = insts[insts.length - 1]; // Use the last installment

    if (!targetInstallment) continue;

    let txPenalties = 0;
    let txFees = 0;

    for (const tx of txs) {
      if (tx.type === 'Manual Penalty') {
        if (tx.comment && tx.comment.includes('[FEE]')) {
          txFees += Number(tx.amount);
        } else {
          txPenalties += Number(tx.amount);
        }
      }
    }

    let instPenalties = 0;
    let instFees = 0;

    for (const inst of insts) {
      instPenalties += Number(inst.penalties_due);
      instFees += Number(inst.fees_due);
    }

    const missingPenalties = txPenalties - instPenalties;
    const missingFees = txFees - instFees;

    if (missingPenalties > 0 || missingFees > 0) {
      console.log(`Fixing Loan ${loan.id}: Adding ${missingPenalties} in penalties and ${missingFees} in fees to Installment ${targetInstallment.installment_number}`);
      
      const newPenaltiesDue = Number(targetInstallment.penalties_due) + missingPenalties;
      const newFeesDue = Number(targetInstallment.fees_due) + missingFees;
      
      // Since we are adding due amounts, the installment might no longer be settled
      const isSettled = (
          Number(targetInstallment.principal_paid) >= Number(targetInstallment.principal_due) &&
          Number(targetInstallment.interest_paid) >= Number(targetInstallment.interest_due) &&
          Number(targetInstallment.penalties_paid) >= newPenaltiesDue &&
          Number(targetInstallment.fees_paid) >= newFeesDue
      );

      // Update the installment
      const { error: instUpdateErr } = await supabase
        .from('loan_installments')
        .update({
          penalties_due: newPenaltiesDue,
          fees_due: newFeesDue,
        })
        .eq('id', targetInstallment.id);

      if (instUpdateErr) {
        console.error(`Failed to update installment ${targetInstallment.id}:`, instUpdateErr);
        continue;
      }

      // Update the loan's aggregate remaining fields directly so balance gets restored instantly
      const { error: loanUpdateErr } = await supabase
        .from('loans')
        .update({
          remaining_penalties: txPenalties - insts.reduce((sum: number, i: any) => sum + Number(i.penalties_paid), 0),
          remaining_fees: txFees - insts.reduce((sum: number, i: any) => sum + Number(i.fees_paid), 0),
          status: 'Overdue', // Automatically revert to Overdue since it has unpaid penalties
          days_past_due: loan.days_past_due === 0 ? 1 : loan.days_past_due // Ensure DPD is > 0
        })
        .eq('id', loan.id);

      if (loanUpdateErr) {
        console.error(`Failed to update loan ${loan.id}:`, loanUpdateErr);
      }

      loansFixed++;
      totalPenaltyRestored += missingPenalties;
      totalFeeRestored += missingFees;
    }
  }

  console.log('\n--- FIX COMPLETE ---');
  console.log(`Loans Fixed: ${loansFixed}`);
  console.log(`Total Penalties Restored: Ksh ${totalPenaltyRestored.toLocaleString()}`);
  console.log(`Total Fees Restored: Ksh ${totalFeeRestored.toLocaleString()}`);
}

fixGhostPenalties().catch(console.error);
