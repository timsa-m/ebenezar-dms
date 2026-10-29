import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: recentLoans, error: fetchErr } = await supabase
    .from('loans')
    .select('id, created_at, status')
    .gte('created_at', oneHourAgo);

  if (fetchErr) {
    console.error("Fetch Error:", fetchErr.message);
    return;
  }

  console.log(`Found ${recentLoans?.length || 0} loans created in the last hour.`);
  
  const statuses: Record<string, number> = {};
  if (recentLoans) {
    for (const loan of recentLoans) {
      statuses[loan.status] = (statuses[loan.status] || 0) + 1;
    }
  }
  console.log("Current statuses:", statuses);

  if (recentLoans && recentLoans.length > 0) {
    const loanIdsToUpdate = recentLoans
      .filter(l => l.status !== 'Pending')
      .map(l => l.id);

    console.log(`Updating ${loanIdsToUpdate.length} loans to 'Pending'...`);

    if (loanIdsToUpdate.length > 0) {
      const { error: updateErr } = await supabase
        .from('loans')
        .update({ status: 'Pending' })
        .in('id', loanIdsToUpdate);

      if (updateErr) {
        console.error("Update Error:", updateErr.message);
      } else {
        console.log("Successfully updated remaining loans to 'Pending'.");
      }
    }
  }
}

run().catch(console.error);
