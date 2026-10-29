import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkSchema() {
    const res = await fetch(`${url}/rest/v1/`, {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    });
    
    const data = await res.json();
    console.log("TABLES EXPOSED:", Object.keys(data.definitions).filter(k => !k.includes('_')));
    
    for (const table of ['clients', 'vehicles', 'financing_agreements', 'repayments']) {
        if (data.definitions[table]) {
            console.log(`\n--- SCHEMA FOR ${table} ---`);
            const props = data.definitions[table].properties;
            for (const col in props) {
                console.log(`${col}: ${props[col].format || props[col].type} ${props[col].default ? '(has default)' : ''}`);
            }
        }
    }
}

checkSchema().catch(console.error);
