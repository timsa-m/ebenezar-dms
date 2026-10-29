import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data: loans, error: loansError } = await supabase
    .from("loans")
    .select("id")
    .eq("lifecycle_state", "Rollover")
    .neq("status", "Active");

  if (loansError) throw loansError;

  let fixedCount = 0;

  for (const loan of loans) {
    const { data: unpaidInsts, error: instError } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("loan_id", loan.id)
      .eq("is_settled", false)
      .order("installment_number", { ascending: false });

    if (instError || !unpaidInsts || unpaidInsts.length === 0) continue;

    // The first one in descending order is the highest installment number (the extension installment)
    const [balloonInst, ...oldInsts] = unpaidInsts;

    if (oldInsts.length === 0) {
      // Still need to update the loan status!
      await supabase
        .from("loans")
        .update({
          status: "Active",
          days_past_due: 0
        })
        .eq("id", loan.id);
      continue;
    }

    let totalUnpaidPrincipal = 0;
    let totalUnpaidInterest = 0;
    let totalUnpaidFees = 0;
    let totalUnpaidPenalties = 0;

    for (const inst of oldInsts) {
      const unpaidPrin = Math.max(0, Number(inst.principal_due) - Number(inst.principal_paid || 0));
      const unpaidInt = Math.max(0, Number(inst.interest_due) - Number(inst.interest_paid || 0));
      const unpaidFee = Math.max(0, Number(inst.fees_due) - Number(inst.fees_paid || 0));
      const unpaidPen = Math.max(0, Number(inst.penalties_due) - Number(inst.penalties_paid || 0));

      totalUnpaidPrincipal += unpaidPrin;
      totalUnpaidInterest += unpaidInt;
      totalUnpaidFees += unpaidFee;
      totalUnpaidPenalties += unpaidPen;

      // Settle the old installment (do not set is_settled directly)
      const { error: updError } = await supabase
        .from("loan_installments")
        .update({
          status: "Rolled Over",
          principal_due: inst.principal_paid || 0,
          interest_due: inst.interest_paid || 0,
          fees_due: inst.fees_paid || 0,
          penalties_due: inst.penalties_paid || 0
        })
        .eq("id", inst.id);
        
      if (updError) console.error("Error updating old inst", inst.id, updError);
    }

    // Add to balloon
    const { error: updBalError } = await supabase
      .from("loan_installments")
      .update({
        principal_due: Number(balloonInst.principal_due) + totalUnpaidPrincipal,
        interest_due: Number(balloonInst.interest_due) + totalUnpaidInterest,
        fees_due: Number(balloonInst.fees_due) + totalUnpaidFees,
        penalties_due: Number(balloonInst.penalties_due) + totalUnpaidPenalties
      })
      .eq("id", balloonInst.id);
      
    if (updBalError) console.error("Error updating balloon inst", balloonInst.id, updBalError);

    // Update loan status
    const { error: loanUpdError } = await supabase
      .from("loans")
      .update({
        status: "Active",
        days_past_due: 0
      })
      .eq("id", loan.id);
      
    if (loanUpdError) console.error("Error updating loan", loan.id, loanUpdError);

    console.log(`Fixed legacy rollover loan ${loan.id}`);
    fixedCount++;
  }

  console.log(`Finished fixing ${fixedCount} legacy rollover loans.`);
}

run().catch(console.error);
