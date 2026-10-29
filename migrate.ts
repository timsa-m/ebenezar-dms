import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables if not already pre-injected
dotenv.config();

const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.error('Available ENV keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    throw new Error('Supabase URL is missing. Add SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL to your .env file.');
}

if (!supabaseKey) {
    throw new Error('Supabase Key is missing. Add SUPABASE_SERVICE_ROLE_KEY to your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);
// Helpers
function parseDate(val: any): string | null {
    if (!val) return null;
    const str = String(val).trim();
    // Handle DDMMYYYY format from Excel
    if (/^\d{8}$/.test(str)) {
        const day = str.substring(0, 2);
        const month = str.substring(2, 4);
        const year = str.substring(4, 8);
        return `${year}-${month}-${day}`;
    }
    const dateObj = new Date(val);
    return isNaN(dateObj.getTime()) ? null : dateObj.toISOString().split('T')[0];
}

function normalizePhone(val: any): string {
    if (!val) return '';
    let str = String(val).replace(/[^0-9+]/g, '').trim();
    if (str.startsWith('07') || str.startsWith('01')) {
        str = '+254' + str.substring(1);
    }
    return str;
}

async function runMigration() {
    console.log('Reading Excel workbook...');
    const workbook = XLSX.readFile('./ebenezar_data.xlsx');

    const clientsSheet = (XLSX.utils.sheet_to_json(workbook.Sheets['Clients'] || []) as any[]);
    const inventorySheet = (XLSX.utils.sheet_to_json(workbook.Sheets['Inventory'] || []) as any[]);
    const paymentsSheet = (XLSX.utils.sheet_to_json(workbook.Sheets['Payment Log'] || workbook.Sheets['PAYMENTS'] || []) as any[]);

    console.log(`Loaded: ${clientsSheet.length} clients, ${inventorySheet.length} vehicles, ${paymentsSheet.length} payments.`);

    // 1. Migrate Clients
    console.log('Migrating Clients...');
    const clientMap = new Map<string, string>(); // maps client_id_number -> supabase UUID

    for (const row of clientsSheet) {
        const clientIdNum = String(row['CLIENT ID'] || '').trim();
        if (!clientIdNum) continue;

        const payload = {
            client_id_number: clientIdNum,
            full_name: String(row['NAME'] || '').trim(),
            phone: normalizePhone(row['PHONE']),
            conflict_flag: Boolean(row['CONFLICT']),
            notes: row['COMMENT'] ? String(row['COMMENT']) : null
        };

        const { data, error } = await supabase
            .from('clients')
            .upsert(payload, { onConflict: 'client_id_number' })
            .select('id, client_id_number')
            .single();

        if (error) {
            console.error(`Error inserting client ${clientIdNum}:`, error.message);
        } else if (data) {
            clientMap.set(data.client_id_number, data.id);
        }
    }

    // 2. Migrate Inventory (Vehicles)
    console.log('Migrating Inventory...');
    const vehicleMap = new Map<string, string>(); // maps registration_no -> supabase UUID

    for (const row of inventorySheet) {
        const regNo = String(row['CAR ID'] || '').trim().toUpperCase();
        if (!regNo) continue;

        const payload = {
            registration_no: regNo,
            make_model: String(row['MODEL'] || 'Unknown'),
            type: row['TYPE'] || null,
            purchase_price: Number(row['PURCHASE PRICE']) || 0,
            base_price: Number(row['BASE PRICE']) || 0,
            sale_price: Number(row['SALE PRICE']) || 0,
            status: String(row['STATUS'] || 'in_stock').toLowerCase(),
            is_published: String(row['STATUS'] || '').toLowerCase() === 'in_stock',
            date_purchased: parseDate(row['DATE PURCHASED']),
            date_sold: parseDate(row['DATE SOLD'])
        };

        const { data, error } = await supabase
            .from('vehicles')
            .insert(payload)
            .select('id, registration_no')
            .single();

        if (error) {
            console.error(`Error inserting vehicle ${regNo}:`, error.message);
        } else if (data) {
            vehicleMap.set(data.registration_no, data.id);
        }
    }

    // 3. Migrate Agreements
    console.log('Migrating Financing Agreements...');
    const agreementMap = new Map<string, string>(); // maps "CLIENT_ID_NUM|CAR_ID" -> supabase UUID

    for (const row of clientsSheet) {
        const clientIdNum = String(row['CLIENT ID'] || '').trim();
        const carId = String(row['CAR ID'] || '').trim().toUpperCase();
        const clientUuid = clientMap.get(clientIdNum);
        const vehicleUuid = vehicleMap.get(carId);

        if (!clientUuid || !vehicleUuid) {
            console.warn(`Skipping agreement for Client: ${clientIdNum}, Car: ${carId} (record missing)`);
            continue;
        }

        const contractNo = `AGR-${carId}-${clientIdNum.slice(-4)}`;
        const payload = {
            contract_no: contractNo,
            client_id: clientUuid,
            vehicle_id: vehicleUuid,
            sale_price: Number(row['SALE PRICE']) || 0,
            monthly_due: Number(row['MONTHLY DUE']) || 0,
            interest_rate: Number(row['INTEREST RATE(%)']) || 0,
            start_date: parseDate(row['START DATE']),
            end_date: parseDate(row['END DATE']),
            last_payment_date: parseDate(row['LAST PAYMENT DATE']),
            status: String(row['STATUS'] || 'active').toLowerCase(),
            aging_bucket: row['AGING BUCKET'] || '0-30 Days',
            days_overdue: Number(row['DAYS OVERDUE']) || 0,
            total_penalties: Number(row['TOTAL PENALTIES']) || 0,
            comment: row['COMMENT'] || null
        };

        const { data, error } = await supabase
            .from('financing_agreements')
            .upsert(payload, { onConflict: 'contract_no' })
            .select('id')
            .single();

        if (error) {
            console.error(`Error inserting agreement ${contractNo}:`, error.message);
        } else if (data) {
            agreementMap.set(`${clientIdNum}|${carId}`, data.id);
        }
    }

    // 4. Migrate Payment Log
    console.log('Migrating Payments...');
    for (const row of paymentsSheet) {
        const receiptNo = String(row['RECEIPT NO.'] || '').trim();
        const clientIdNum = String(row['CLIENT ID'] || '').trim();
        const clientUuid = clientMap.get(clientIdNum);

        if (!receiptNo || !clientUuid) continue;

        // Find the client's agreement
        const matchingKey = Array.from(agreementMap.keys()).find(k => k.startsWith(`${clientIdNum}|`));
        const agreementUuid = matchingKey ? agreementMap.get(matchingKey) : null;

        if (!agreementUuid) {
            console.warn(`Skipping payment ${receiptNo}: No matching agreement for Client ${clientIdNum}`);
            continue;
        }

        const payload = {
            receipt_no: receiptNo,
            agreement_id: agreementUuid,
            client_id: clientUuid,
            amount_paid: Number(row['AMOUNT PAID']) || 0,
            payment_method: String(row['PAYMENT METHOD'] || 'mpesa').toLowerCase(),
            payment_date: parseDate(row['DATE(DDMMYYYY)']) || new Date().toISOString().split('T')[0],
            penalty_amount: Number(row['Penalty Amount']) || 0
        };

        const { error } = await supabase
            .from('repayments')
            .upsert(payload, { onConflict: 'receipt_no' });

        if (error) {
            console.error(`Error inserting receipt ${receiptNo}:`, error.message);
        }
    }

    console.log('Migration completed successfully.');
}

runMigration().catch(console.error);