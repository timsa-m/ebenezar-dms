import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: ag, error } = await supabase.from('financing_agreements').select('*').eq('contract_no', 'AGR-KBP115P-0680').single();
  if (error) {
    console.error('Error fetching agreement:', error);
    return;
  }
  console.log('AGREEMENT:', ag);
  if (ag) {
    const { data: inst } = await supabase.from('financing_installments').select('*').eq('agreement_id', ag.id);
    console.log('INSTALLMENTS SUMMARY:', inst?.length, 'Total Principal:', inst?.reduce((a,b)=>a+Number(b.principal_due),0));
    console.log('INSTALLMENTS:', inst);
    const { data: rep } = await supabase.from('repayments').select('*').eq('agreement_id', ag.id);
    console.log('REPAYMENTS:', rep);
    const { data: pen } = await supabase.from('penalties').select('*').eq('agreement_id', ag.id);
    console.log('PENALTIES:', pen);
  }
}
run();
