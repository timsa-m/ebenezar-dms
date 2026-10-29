import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyBalances() {
  console.log('--- LOAN BALANCE VERIFICATION ---\n');

  const { data: loans, error } = await supabase
    .from('loans')
    .select(`
      id,
      client_id,
      status,
      principal_amount,
      total_interest,
      balance,
      clients ( first_name, last_name, national_id ),
      loan_transactions (
        amount,
        type,
        allocated_penalties,
        allocated_fees
      )
    `);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  let fullyPaidMatches = 0;
  let activeMatches = 0;
  let mismatches = 0;

  for (const loan of loans) {
    const txs = loan.loan_transactions || [];
    
    // Calculate total expected
    const initialExpected = Number(loan.principal_amount) + Number(loan.total_interest);
    
    // Penalties and fees are tracked in transactions
    let totalPenaltiesAndFees = 0;
    let totalRestructureAdjustments = 0;
    let totalReceived = 0;

    for (const tx of txs) {
      if (tx.type === 'Manual Penalty') {
        totalPenaltiesAndFees += Number(tx.amount);
      } else if (tx.type === 'Restructure Adjustment') {
        totalRestructureAdjustments += Number(tx.amount);
      } else if (tx.type === 'Repayment') {
        totalReceived += Number(tx.amount);
      }
    }

    const totalExpected = initialExpected + totalPenaltiesAndFees + totalRestructureAdjustments;
    
    // Expected Balance
    const expectedBalance = totalExpected - totalReceived;
    const actualBalance = Number(loan.balance);

    // Round to 2 decimal places to avoid floating point issues
    const roundedExpectedBalance = Math.round(expectedBalance * 100) / 100;
    const roundedActualBalance = Math.round(actualBalance * 100) / 100;
    const clientName = `${loan.clients?.first_name} ${loan.clients?.last_name}`.trim();

    if (Math.abs(roundedExpectedBalance - roundedActualBalance) > 1) { // Tolerate 1 KES difference
      console.log(`❌ MISMATCH for ${clientName} (Loan ID: ${loan.id})`);
      console.log(`   Status: ${loan.status}`);
      console.log(`   Total Expected: Ksh ${totalExpected.toLocaleString()}`);
      console.log(`   Total Received: Ksh ${totalReceived.toLocaleString()}`);
      console.log(`   Expected Balance: Ksh ${expectedBalance.toLocaleString()}`);
      console.log(`   Actual DB Balance: Ksh ${actualBalance.toLocaleString()}`);
      console.log(`   Difference: Ksh ${(actualBalance - expectedBalance).toLocaleString()}\n`);
      mismatches++;
    } else {
      if (roundedActualBalance <= 0) {
        fullyPaidMatches++;
      } else {
        activeMatches++;
      }
    }
    
    // Check if status matches balance
    if (roundedActualBalance <= 0 && loan.status !== 'Fully Paid') {
        console.log(`⚠️  STATUS WARNING: ${clientName} has 0 balance but status is ${loan.status}`);
    }
  }

  console.log('--- VERIFICATION SUMMARY ---');
  console.log(`Total Loans Checked: ${loans.length}`);
  console.log(`Perfectly Matched Fully Paid: ${fullyPaidMatches}`);
  console.log(`Perfectly Matched Active/Overdue: ${activeMatches}`);
  console.log(`Balance Mismatches Found: ${mismatches}`);
}

verifyBalances().catch(console.error);
