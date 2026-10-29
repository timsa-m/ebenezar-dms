import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  // We need to find the loans that I accidentally doubled the principal for.
  // The script I ran earlier updated the balloon installment:
  // principal_due = balloonInst.principal_due + totalUnpaidPrincipal
  // Since balloonInst.principal_due ALREADY contained the unpaid principal, it was exactly doubled.
  
  const { data: loans, error: loansError } = await supabase
    .from("loans")
    .select("id, principal_amount, balance")
    .in("id", [
      "41f497f7-98b7-47d7-83dc-8a86bcdd7263",
      "314ae785-42b5-4ddb-8f25-4aa1314a8040",
      "8a20b398-4ab1-4e18-b373-bc01b77f5e4c",
      "5a1601c5-3f3e-493f-86ac-cc74dbea094f",
      "4bb47c03-d8e7-4c5e-9b81-17cb3d921608",
      "1624305c-db28-4067-84a2-6aa41730e512",
      "392f625d-85c6-4e28-996b-7945d8d6124d"
    ]);

  if (loansError || !loans) {
    console.error("Could not fetch legacy loans", loansError);
    return;
  }

  for (const loan of loans) {
    const { data: insts } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("loan_id", loan.id)
      .order("installment_number", { ascending: false });

    if (!insts || insts.length < 2) continue;

    // The balloon installment is the one with the highest installment number
    const balloonInst = insts[0];
    const oldInsts = insts.slice(1);

    // Calculate what the unpaid principal of the old installments WAS before the script zeroed it out.
    // Wait, the previous script set principal_due = principal_paid on the old installments!
    // So the old installments NO LONGER have their original principal_due!
    // But the total sum of principal_due across all installments SHOULD equal the loan's principal_amount!
    
    // Right now, the sum is:
    // (old1.principal_paid) + (old2.principal_paid) + balloonInst.principal_due
    // And this is TWICE what it should be (plus or minus something).
    // The balloonInst.principal_due should be exactly: loan.principal_amount - sum(oldInst.principal_paid)
    
    let totalOldPrincipalPaid = 0;
    for (const inst of oldInsts) {
      totalOldPrincipalPaid += Number(inst.principal_paid || 0);
    }
    
    const correctBalloonPrincipalDue = Number(loan.principal_amount) - totalOldPrincipalPaid;
    
    // What about interest?
    // My old script did: interest_due: Number(balloonInst.interest_due) + totalUnpaidInterest.
    // But totalUnpaidInterest was calculated as inst.interest_due - inst.interest_paid.
    // Since my old script ALREADY ran AFTER the Option C code, the old installments' interest_due was ALREADY equal to interest_paid!
    // So totalUnpaidInterest was 0! So interest_due was NOT doubled!
    // Wait, the user said: interestDue is 13,625 (instead of 13,125).
    // 13,625 is exactly 13,125 + 500. The 500 is the rollover fee!
    // So interest_due is ACTUALLY PERFECT! It is correct. The user just didn't realize the rollover fee was added.
    
    // Let's only fix the principal_due.
    console.log(`Fixing loan ${loan.id}: Balloon principal_due from ${balloonInst.principal_due} -> ${correctBalloonPrincipalDue}`);
    
    await supabase
      .from("loan_installments")
      .update({
        principal_due: correctBalloonPrincipalDue
      })
      .eq("id", balloonInst.id);
      
    // Resync the remaining balances
    const { syncInstallments } = await import("../lib/actions/repayment.actions");
    
    const { data: latestLoan } = await supabase.from("loans").select("*").eq("id", loan.id).single();
    await syncInstallments(supabase, loan.id, Number(loan.principal_amount), Number(latestLoan.remaining_principal), Number(latestLoan.remaining_interest), new Date().toISOString());
  }

  console.log("Legacy loans fixed.");
}

run().catch(console.error);
