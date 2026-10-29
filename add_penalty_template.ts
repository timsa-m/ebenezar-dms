import { createSupabaseAdminClient } from './lib/supabase';
async function run() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from('notification_templates').upsert({
    name: 'PENALTY_APPLIED',
    subject_template: 'Penalty Applied - {{company_name}}',
    body_template: 'Dear {{client_name}}, a penalty of {{penalty_amount}} has been applied to your loan. Your new outstanding balance is {{outstanding_balance}}. Please contact us if you have any questions.',
    channels: ['SMS', 'EMAIL', 'WHATSAPP'],
    is_active: true
  }, { onConflict: 'name' }).select();
  console.log('Upsert result:', data, 'Error:', error);
}
run();
