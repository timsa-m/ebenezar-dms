import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixContract() {
  const contractNo = 'AGR-KBP115P-0680';
  
  const { data: ag, error } = await supabase
    .from('financing_agreements')
    .select('id, balance, total_penalties')
    .eq('contract_no', contractNo)
    .single();

  if (error || !ag) {
    console.error('Error fetching agreement:', error);
    return;
  }
  
  if (Number(ag.total_penalties) === 10000) {
    console.log(`Fixing contract ${contractNo}...`);
    const newBalance = Number(ag.balance) - 10000;
    
    const { error: updateErr } = await supabase
      .from('financing_agreements')
      .update({
        total_penalties: 0,
        balance: newBalance
      })
      .eq('id', ag.id);
      
    if (updateErr) {
      console.error('Failed to update:', updateErr);
    } else {
      console.log('Successfully removed phantom 10,000 penalty. New Balance:', newBalance);
    }
  } else {
    console.log('Contract does not have a 10,000 penalty. Total penalties:', ag.total_penalties);
  }
}
fixContract();
