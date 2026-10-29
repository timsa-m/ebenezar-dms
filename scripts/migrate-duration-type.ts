import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runMigration() {
  const query = `
    ALTER TABLE loans ALTER COLUMN duration_in_months DROP DEFAULT;
    ALTER TABLE loans ALTER COLUMN duration_in_months TYPE NUMERIC;
  `;
  const { error } = await supabase.rpc('query_db', { query });
  
  if (error) {
    // query_db might not exist, let's use the postgres meta API if possible, or just log error
    console.error("Migration failed via RPC:", error.message);
  } else {
    console.log("Migration successful.");
  }
}

runMigration();
