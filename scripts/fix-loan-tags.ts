import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLoanTags() {
  console.log('--- STARTING LOAN DB FIX ---\n');

  // Fetch all loans and their related installments
  const { data: loans, error } = await supabase
    .from('loans')
    .select(`
      id,
      status,
      lifecycle_state,
      loan_type,
      days_past_due,
      loan_installments (
        id,
        due_date,
        is_settled
      )
    `);

  if (error) {
    console.error('Error fetching loans:', error);
    return;
  }
  
  let fixedLifecycle = 0;
  let fixedStatus = 0;
  let fixedDpd = 0;
  
  for (const loan of loans) {
    const updates: any = {};
    const installments = loan.loan_installments || [];
    
    // 1. Fix Lifecycle Tags
    if (loan.loan_type?.toLowerCase().includes('restructured') && loan.lifecycle_state !== 'Restructured') {
      updates.lifecycle_state = 'Restructured';
    } else if (loan.loan_type?.toLowerCase().includes('rollover') && loan.lifecycle_state !== 'Rollover') {
      updates.lifecycle_state = 'Rollover';
    }

    // 2. Fix Fully Paid Status
    const allSettled = installments.length > 0 && installments.every((i: any) => i.is_settled);
    if (allSettled && loan.status !== 'Fully Paid') {
      updates.status = 'Fully Paid';
    }

    // 3. Fix Days Past Due
    let newDpd = loan.days_past_due;
    
    // If the loan is fully paid or will be fully paid, DPD should be 0
    if (loan.status === 'Fully Paid' || updates.status === 'Fully Paid') {
      if (loan.days_past_due !== 0) {
        updates.days_past_due = 0;
      }
    } else {
      // Calculate DPD for active/overdue loans
      const now = new Date();
      const pastDueInstallments = installments.filter((i: any) => !i.is_settled && new Date(i.due_date) < now);
      if (pastDueInstallments.length > 0) {
          pastDueInstallments.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
          const earliestDue = new Date(pastDueInstallments[0].due_date);
          newDpd = Math.max(0, Math.floor((now.getTime() - earliestDue.getTime()) / (1000 * 60 * 60 * 24)));
      } else {
          newDpd = 0;
      }
      
      // Update DPD if it's off by more than a day
      if (Math.abs(loan.days_past_due - newDpd) > 1) {
          updates.days_past_due = newDpd;
      }
    }

    if (Object.keys(updates).length > 0) {
       console.log(`Fixing Loan ID: ${loan.id} - Updates:`, updates);
       const { error: updateError } = await supabase
         .from('loans')
         .update(updates)
         .eq('id', loan.id);
         
       if (updateError) {
           console.error(`Failed to update loan ${loan.id}:`, updateError);
       } else {
           if (updates.lifecycle_state) fixedLifecycle++;
           if (updates.status) fixedStatus++;
           if (updates.days_past_due !== undefined) fixedDpd++;
       }
    }
  }

  console.log(`\n--- FIX COMPLETE ---`);
  console.log(`Fixed Lifecycle tags: ${fixedLifecycle}`);
  console.log(`Fixed Statuses to Fully Paid: ${fixedStatus}`);
  console.log(`Fixed DPD counters: ${fixedDpd}`);
}

fixLoanTags().catch(console.error);
