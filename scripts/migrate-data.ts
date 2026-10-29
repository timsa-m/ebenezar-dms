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

function parseKsh(str: string): number {
  if (!str) return 0;
  return Number(str.replace(/Ksh\s*|,/g, '').trim());
}

function parsePct(str: string): number {
  if (!str) return 0;
  return Number(str.replace('%', '').trim());
}

function parseDateStr(str: string): string | null {
  if (!str) return null;
  // expects DD/MM/YYYY
  const parts = str.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`;
  }
  return null;
}

function mapStatus(csvStatus: string): string {
  if (csvStatus === 'Current') return 'Active';
  if (csvStatus === 'Default') return 'Overdue';
  if (csvStatus === 'Cleared') return 'Fully Paid';
  return 'Pending';
}

async function migrate() {
  const csvPath = path.resolve(process.cwd(), 'public/EL-ELYON CAPITAL & CREDIT SOLUTIONS - Client & Loan Master.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf8');
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Loaded ${records.length} records from CSV.`);

  // Process rows sequentially to handle clients
  const clientMap = new Map<string, string>(); // nationalId -> clientId

  for (const record of records) {
    try {
      const clientIdRaw = record['Client ID'];
      const nationalId = clientIdRaw.split('-')[0].trim();
      const applicantName = record['Applicant Name'].trim();
      
      const nameParts = applicantName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'N/A';
      
      const phone = record['Phone Number'];
      const address = record['Physical Address'];
      
      let clientId = clientMap.get(nationalId);

      // Create Client if not exists
      if (!clientId) {
        // Check if exists in DB
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('national_id', nationalId)
          .single();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const { data: newClient, error: clientErr } = await supabase
            .from('clients')
            .insert({
              first_name: firstName,
              last_name: lastName,
              national_id: nationalId,
              phone: phone,
              address: address,
              total_borrowed: 0,
              outstanding_balance: 0
            })
            .select('id')
            .single();
            
          if (clientErr) throw new Error(`Client Error: ${clientErr.message}`);
          clientId = newClient.id;
        }
        clientMap.set(nationalId, clientId!);
      }

      // Create Loan
      const principal = parseKsh(record['Principal Amount']);
      const interestRate = parsePct(record['Interest Rate (%)']);
      const totalExpected = parseKsh(record['Total Expected']);
      const totalPaid = parseKsh(record['Total Paid']);
      const currentBalance = parseKsh(record['Current Balance']);
      
      const loanTerm = parseInt(record['Loan Term (Months)']) || 1;
      const loanStatus = mapStatus(record['Loan Status']);
      const startDate = parseDateStr(record['Disbursement Date']) || new Date().toISOString();
      const dueDate = parseDateStr(record['Compleation Date']) || parseDateStr(record['Due Date']) || startDate;

      const { data: newLoan, error: loanErr } = await supabase
        .from('loans')
        .insert({
          client_id: clientId,
          principal_amount: principal,
          amount_applied: principal,
          interest_rate: interestRate,
          duration_in_months: loanTerm,
          total_payable: totalExpected,
          total_interest: totalExpected - principal,
          remaining_principal: currentBalance,
          remaining_interest: 0,
          status: loanStatus,
          loan_type: record['Type of Loan'],
          securities: record['Security Type'] ? `${record['Security Type']} - ${record['Make & Model']} (${record['Reg / Serial No.']})` : null,
          start_date: startDate,
          due_date: dueDate,
          is_accruing: loanStatus === 'Active' || loanStatus === 'Overdue',
          total_paid_principal: totalPaid > principal ? principal : totalPaid
        })
        .select('id')
        .single();

      if (loanErr) throw new Error(`Loan Error: ${loanErr.message}`);

      // Create a master installment to hold the balance so UI doesn't crash
      if (currentBalance > 0) {
        const { error: instErr } = await supabase
          .from('loan_installments')
          .insert({
            loan_id: newLoan.id,
            client_id: clientId,
            installment_number: 1,
            due_date: dueDate,
            principal_due: currentBalance,
            interest_due: 0,
            principal_paid: 0,
            interest_paid: 0,
            status: loanStatus === 'Active' ? 'Pending' : loanStatus
          });
          
        if (instErr) throw new Error(`Installment Error: ${instErr.message}`);
      }

      console.log(`✅ Migrated Loan for ${applicantName} (${clientIdRaw}) -> Balance: ${currentBalance}`);
    } catch (e: any) {
      console.error(`❌ Failed migrating record for ${record['Applicant Name']} (${record['Client ID']}):`, e.message);
    }
  }

  console.log("Migration complete.");
}

migrate().catch(console.error);
