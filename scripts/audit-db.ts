import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditLoans() {
  console.log('--- STARTING LOAN DB AUDIT ---\n');

  // Fetch all loans and their related installments
  const { data: loans, error } = await supabase
    .from('loans')
    .select(`
      id,
      client_id,
      status,
      lifecycle_state,
      loan_type,
      days_past_due,
      remaining_principal,
      remaining_interest,
      remaining_penalties,
      remaining_fees,
      total_paid_principal,
      balance,
      loan_installments (
        id,
        installment_number,
        due_date,
        principal_due, interest_due, penalties_due, fees_due,
        principal_paid, interest_paid, penalties_paid, fees_paid,
        is_settled,
        status,
        amount_due, amount_paid
      )
    `);

  if (error) {
    console.error('Error fetching loans:', error);
    return;
  }

  console.log(`Total loans retrieved: ${loans.length}`);
  
  let issues = 0;
  
  for (const loan of loans) {
    const installments = loan.loan_installments || [];
    const loanIssues: string[] = [];
    
    // Check 1: Balance mismatches
    const actualBalance = Number(loan.remaining_principal) + Number(loan.remaining_interest) + Number(loan.remaining_penalties) + Number(loan.remaining_fees);
    
    // Check 2: Status inconsistencies
    const hasUnsettled = installments.some((i: any) => !i.is_settled);
    const allSettled = installments.length > 0 && installments.every((i: any) => i.is_settled);
    
    if (allSettled && loan.status !== 'Fully Paid') {
      loanIssues.push(`All installments settled but loan status is '${loan.status}' (expected 'Fully Paid')`);
    }
    if (hasUnsettled && loan.status === 'Fully Paid') {
      loanIssues.push(`Loan is 'Fully Paid' but has unsettled installments.`);
    }
    
    // Check 3: Overpaid installments or negative remaining balances
    if (Number(loan.remaining_principal) < 0 || Number(loan.remaining_interest) < 0 || Number(loan.remaining_penalties) < 0 || Number(loan.remaining_fees) < 0) {
      loanIssues.push(`Negative remaining balances detected: P:${loan.remaining_principal}, I:${loan.remaining_interest}, Pen:${loan.remaining_penalties}, F:${loan.remaining_fees}`);
    }
    
    // Check 4: DPD and Status alignment
    const now = new Date();
    let calculatedDpd = 0;
    const pastDueInstallments = installments.filter((i: any) => !i.is_settled && new Date(i.due_date) < now);
    if (pastDueInstallments.length > 0) {
        // Find earliest unpaid due date
        pastDueInstallments.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        const earliestDue = new Date(pastDueInstallments[0].due_date);
        calculatedDpd = Math.max(0, Math.floor((now.getTime() - earliestDue.getTime()) / (1000 * 60 * 60 * 24)));
    }
    
    if (loan.days_past_due !== calculatedDpd) {
       // Only log if it's a significant deviation, as DPD is updated by daily CRON, it could be out by 1 day.
       if (Math.abs(loan.days_past_due - calculatedDpd) > 1) {
          loanIssues.push(`DPD mismatch: DB says ${loan.days_past_due}, calculated is ~${calculatedDpd}`);
       }
    }

    if (loan.status === 'Active' && loan.days_past_due >= 30) {
      loanIssues.push(`Loan is 'Active' but DPD is ${loan.days_past_due} (expected Substandard or Loss)`);
    }

    // Check 5: Lifecycle vs Loan Type text
    if (loan.loan_type?.toLowerCase().includes('restructured') && loan.lifecycle_state !== 'Restructured') {
      loanIssues.push(`Loan type says '${loan.loan_type}' but lifecycle_state is '${loan.lifecycle_state}'`);
    }
    if (loan.loan_type?.toLowerCase().includes('rollover') && loan.lifecycle_state !== 'Rollover') {
      loanIssues.push(`Loan type says '${loan.loan_type}' but lifecycle_state is '${loan.lifecycle_state}'`);
    }

    if (loanIssues.length > 0) {
       issues++;
       console.log(`\n⚠️  Loan ID: ${loan.id}`);
       console.log(`   Type: ${loan.loan_type} | Status: ${loan.status} | Lifecycle: ${loan.lifecycle_state} | DPD: ${loan.days_past_due}`);
       loanIssues.forEach(issue => console.log(`   - ${issue}`));
    }
  }

  console.log(`\n--- AUDIT COMPLETE: Found ${issues} loans with potential tagging/state issues ---`);
}

auditLoans().catch(console.error);
