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

async function wipeData() {
  console.log("Starting data wipe...");
  console.log("WARNING: This action is irreversible. All operational data will be deleted.");

  try {
    // We must delete in the correct order to respect foreign key constraints:
    // audit_logs -> loan_transactions -> loan_installments -> loans -> clients
    // (users table is kept intact)

    console.log("1/5 Wiping audit_logs...");
    const { error: err1 } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err1) throw err1;

    console.log("2/5 Wiping loan_transactions...");
    const { error: err2 } = await supabase.from('loan_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) throw err2;

    console.log("3/5 Wiping loan_installments...");
    const { error: err3 } = await supabase.from('loan_installments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err3) throw err3;

    console.log("4/5 Wiping loans...");
    const { error: err4 } = await supabase.from('loans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err4) throw err4;

    console.log("5/5 Wiping clients...");
    const { error: err5 } = await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err5) throw err5;

    console.log("✅ Data wipe complete. The database is now a clean slate.");
  } catch (error: any) {
    console.error("❌ Error wiping data:", error.message);
  }
}

wipeData().catch(console.error);
