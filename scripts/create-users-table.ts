import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createUsersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      first_name TEXT,
      last_name TEXT,
      role TEXT DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'MANAGER', 'STAFF')),
      user_status TEXT DEFAULT 'pending' CHECK (user_status IN ('pending', 'active', 'rejected', 'suspended')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Enable RLS
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for users to read their own data
    CREATE POLICY "Users can read own data" ON public.users
      FOR SELECT USING (auth.uid() = auth_id);
  `;
  
  // Quick way to run raw SQL: use an RPC or just rely on a migration script
  // Since we don't have direct SQL access through supabase-js without an RPC,
  // I will write this to a .sql file and run it via Supabase CLI or REST if possible.
  // Actually, wait, let me just create an RPC in SQL and run it... No, I can't.
  console.log("SQL to run:", sql);
}

createUsersTable();
