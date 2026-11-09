import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_VEHICLE_ID = '04e865f7-9e10-42ee-9ad4-487b21ca4527';
const STORE_PATH = path.join(process.cwd(), 'scratch', 'handover_store.json');

const VALID_HANDOVER_COLS = new Set([
  'id', 'vehicle_id', 'acquisition_ref', 'sale_ref', 'client_id',
  'handover_type', 'incoming_status', 'outgoing_status', 'acquisition_date',
  'previous_owner', 'received_by_user_id', 'received_by_name', 'handed_over_by',
  'odometer_km', 'fuel_level', 'storage_location', 'collection_date',
  'releasing_user_id', 'releasing_user_name', 'authorized_recipient',
  'customer_acknowledged', 'acknowledgment_notes', 'financial_clearance_status',
  'exception_approved_by', 'exception_approved_by_name', 'exception_reason',
  'exception_approved_at', 'overall_condition', 'outstanding_issues',
  'workflow_step', 'submitted_at', 'completed_at', 'is_cancelled',
  'cancelled_by', 'cancelled_at', 'cancellation_reason',
  'created_by_user_id', 'created_by_name', 'updated_by_user_id', 'updated_by_name',
  'created_at', 'updated_at'
]);

const VALID_ACCESSORY_COLS = new Set([
  'id', 'handover_id', 'vehicle_id', 'handover_type', 'accessory_name',
  'accessory_label', 'status', 'condition_notes', 'reason_if_missing',
  'is_original_document', 'document_verified', 'received_from_name',
  'ownership_discrepancy', 'photo_urls', 'recorded_by_user_id',
  'recorded_by_name', 'recorded_at', 'updated_at'
]);

const VALID_INSPECTION_COLS = new Set([
  'id', 'handover_id', 'vehicle_id', 'handover_type', 'category',
  'item_key', 'item_label', 'rating', 'notes', 'photo_urls',
  'inspected_by_user_id', 'inspected_by_name', 'inspected_at', 'updated_at'
]);

const VALID_TRANSFER_COLS = new Set([
  'id', 'handover_id', 'vehicle_id', 'current_registered_owner',
  'intended_new_owner', 'document_reference', 'status', 'transfer_initiated_date',
  'transfer_reference_no', 'handling_user_id', 'handling_user_name',
  'supporting_doc_urls', 'notes', 'delay_reason', 'ownership_confirmed_date',
  'confirmed_by_user_id', 'confirmed_by_name', 'document_released_to_client_date',
  'releasing_user_id', 'releasing_user_name', 'created_at', 'updated_at'
]);

const VALID_AUDIT_COLS = new Set([
  'id', 'handover_id', 'vehicle_id', 'event_type', 'event_data',
  'description', 'performed_by_user_id', 'performed_by_name', 'performed_at'
]);

function pickCols(obj: Record<string, any>, validCols: Set<string>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (validCols.has(k)) {
      result[k] = v;
    }
  }
  return result;
}

async function sync() {
  console.log('🔄 Starting Handover Store to Supabase Sync...');

  if (!fs.existsSync(STORE_PATH)) {
    console.log('Store file does not exist, nothing to sync.');
    return;
  }

  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));

  // 1. Clean and filter handovers
  const realHandovers = store.handovers
    .filter((h: any) => h.vehicle_id !== TEST_VEHICLE_ID)
    .map((h: any) => {
      const copy = { ...h };
      copy.handed_over_by = copy.handed_over_by ?? copy.handedOverBy ?? null;
      delete copy.handedOverBy;
      return pickCols(copy, VALID_HANDOVER_COLS);
    });

  console.log(`Found ${realHandovers.length} real handovers to upsert.`);

  for (const h of realHandovers) {
    const { error } = await supabase
      .from('vehicle_handover_records')
      .upsert(h, { onConflict: 'id' });
    if (error) {
      console.error(`❌ Error upserting handover ${h.id} (${h.vehicle_id}):`, error);
    } else {
      console.log(`✅ Upserted handover ${h.id} for vehicle ${h.vehicle_id}`);
    }
  }

  // Collect all known handover IDs in Supabase (plus existing ones)
  const { data: allDbHandovers } = await supabase
    .from('vehicle_handover_records')
    .select('id');
  const validHandoverIds = new Set((allDbHandovers || []).map(h => h.id));

  // 2. Clean and filter accessories
  const realAccessories = store.accessories
    .filter((a: any) => a.vehicle_id !== TEST_VEHICLE_ID && validHandoverIds.has(a.handover_id))
    .map((a: any) => pickCols(a, VALID_ACCESSORY_COLS));

  console.log(`Found ${realAccessories.length} real accessories to upsert.`);
  for (const a of realAccessories) {
    const { error } = await supabase
      .from('vehicle_accessory_records')
      .upsert(a, { onConflict: 'id' });
    if (error) {
      console.error(`❌ Error upserting accessory ${a.id}:`, error);
    }
  }
  console.log(`✅ Finished accessories upsert.`);

  // 3. Clean and filter condition inspections
  const realInspections = store.inspections
    .filter((i: any) => i.vehicle_id !== TEST_VEHICLE_ID && validHandoverIds.has(i.handover_id))
    .map((i: any) => pickCols(i, VALID_INSPECTION_COLS));

  console.log(`Found ${realInspections.length} real inspections to upsert.`);
  // Upsert in batches of 25
  for (let idx = 0; idx < realInspections.length; idx += 25) {
    const batch = realInspections.slice(idx, idx + 25);
    const { error } = await supabase
      .from('vehicle_condition_inspections')
      .upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`❌ Error upserting inspection batch at index ${idx}:`, error);
    }
  }
  console.log(`✅ Finished condition inspections upsert.`);

  // 4. Clean and filter logbook transfers
  const realTransfers = store.logbookTransfers
    .filter((lt: any) => lt.vehicle_id !== TEST_VEHICLE_ID && validHandoverIds.has(lt.handover_id))
    .map((lt: any) => pickCols(lt, VALID_TRANSFER_COLS));

  console.log(`Found ${realTransfers.length} real logbook transfers to upsert.`);
  for (const lt of realTransfers) {
    const { error } = await supabase
      .from('vehicle_logbook_transfers')
      .upsert(lt, { onConflict: 'id' });
    if (error) {
      console.error(`❌ Error upserting transfer ${lt.id}:`, error);
    }
  }
  console.log(`✅ Finished logbook transfers upsert.`);

  // 5. Clean and filter audit logs
  const realAuditLogs = store.auditLogs
    .filter((al: any) => al.vehicle_id !== TEST_VEHICLE_ID && (!al.handover_id || validHandoverIds.has(al.handover_id)))
    .map((al: any) => pickCols(al, VALID_AUDIT_COLS));

  console.log(`Found ${realAuditLogs.length} real audit logs to upsert.`);
  for (let idx = 0; idx < realAuditLogs.length; idx += 25) {
    const batch = realAuditLogs.slice(idx, idx + 25);
    const { error } = await supabase
      .from('vehicle_handover_audit_logs')
      .upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`❌ Error upserting audit log batch at index ${idx}:`, error);
    }
  }
  console.log(`✅ Finished audit logs upsert.`);

  // Clean scratch store
  store.handovers = store.handovers
    .filter((h: any) => h.vehicle_id !== TEST_VEHICLE_ID)
    .map((h: any) => {
      h.handed_over_by = h.handed_over_by ?? h.handedOverBy ?? null;
      delete h.handedOverBy;
      return h;
    });
  store.accessories = store.accessories.filter((a: any) => a.vehicle_id !== TEST_VEHICLE_ID && a.handover_id);
  store.inspections = store.inspections.filter((i: any) => i.vehicle_id !== TEST_VEHICLE_ID && i.handover_id);
  store.logbookTransfers = store.logbookTransfers.filter((lt: any) => lt.vehicle_id !== TEST_VEHICLE_ID && lt.handover_id);
  store.auditLogs = store.auditLogs.filter((al: any) => al.vehicle_id !== TEST_VEHICLE_ID);
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  console.log('✅ Cleaned local handover store.');

  console.log('🎉 SYNC COMPLETE!');
}

sync().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});

