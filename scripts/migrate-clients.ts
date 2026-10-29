import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
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

async function migrateClients() {
  const csvPath = path.resolve(process.cwd(), 'public/EL-ELYON CAPITAL & CREDIT SOLUTIONS - Client & Loan Master.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf8');
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Loaded ${records.length} records from CSV.`);

  // Use a map to deduplicate clients
  const clientMap = new Map<string, any>(); 

  for (const record of records) {
    const clientIdRaw = record['Client ID'];
    if (!clientIdRaw) continue;
    
    // Some clients have suffixes like -L1, extract the base ID
    const nationalId = String(clientIdRaw).split('-')[0].trim();
    
    if (!clientMap.has(nationalId)) {
      const applicantName = record['Applicant Name'].trim();
      const nameParts = applicantName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'N/A';
      
      const phone = record['Phone Number'];
      const address = record['Physical Address'];

      clientMap.set(nationalId, {
        first_name: firstName,
        last_name: lastName,
        national_id: nationalId,
        phone: phone,
        address: address,
        total_borrowed: 0,
        outstanding_balance: 0
      });
    }
  }

  const uniqueClients = Array.from(clientMap.values());
  console.log(`Found ${uniqueClients.length} unique clients to import.`);

  let successCount = 0;
  for (const client of uniqueClients) {
    try {
      // Check if client already exists (idempotency check)
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('national_id', client.national_id)
        .single();

      if (!existingClient) {
        const { error: clientErr } = await supabase
          .from('clients')
          .insert(client);
          
        if (clientErr) throw clientErr;
        successCount++;
        console.log(`✅ Imported Client: ${client.first_name} ${client.last_name} (${client.national_id})`);
      } else {
        console.log(`⏭️ Skipped Client (Already exists): ${client.first_name} ${client.last_name} (${client.national_id})`);
      }
    } catch (e: any) {
      console.error(`❌ Failed importing client ${client.first_name} ${client.last_name}:`, e.message);
    }
  }

  console.log(`\n🎉 Migration complete. Successfully imported ${successCount} clients.`);
}

migrateClients().catch(console.error);
