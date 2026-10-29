import { createSupabaseAdminClient } from './lib/supabase';
async function run() {
  const supabase = createSupabaseAdminClient();
  const { data: rep } = await supabase.from('repayments').select('*').limit(1);
  const { data: pen } = await supabase.from('penalties').select('*').limit(1);
  console.log('Repayments sample:', rep);
  console.log('Penalties sample:', pen);
}
run();
