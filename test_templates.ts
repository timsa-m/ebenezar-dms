import { createSupabaseAdminClient } from './lib/supabase';
async function run() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('notification_templates').select('*');
  console.log('Templates:', data?.length, 'Error:', error);
}
run();
