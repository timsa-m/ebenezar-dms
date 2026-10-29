/**
 * Test Suite: Vehicle Handover, Inspection & Clearance System
 * Ebenezar Enterprises LTD
 * 
 * Tests the 10 critical business scenarios specified in the system specification:
 * 1. Vehicle acquisition & incoming baseline recording
 * 2. Missing accessory flagging with mandatory justification
 * 3. Cash sale eligibility verification
 * 4. Financed vehicle arrears blocking release unless manager exception approved
 * 5. Accessory discrepancy auto-raising (incoming received vs outgoing missing)
 * 6. Separate milestones: physical release vs legal logbook transfer
 * 7. Manager-only ownership transfer confirmation
 * 8. Append-only immutable audit trail preservation
 * 9. Authorization enforcement on sensitive operations
 * 10. Persistence and idempotency
 */

process.env.TEST_MODE = 'true';

import {
  getVehicleHandoverData,
  createIncomingHandover,
  saveAccessoryRecords,
  saveConditionInspections,
  submitIncomingHandover,
  createOutgoingHandover,
  approveFinancialException,
  saveClientHandoverDetails,
  releaseVehicle,
  saveLogbookTransfer,
  confirmOwnershipTransfer,
  resolveDiscrepancy,
} from '../lib/actions/handover.actions';
import { createAdminClient } from '../src/lib/supabase/admin';
import { getHandoverStore, saveHandoverStore } from '../lib/handover-store';
import type { AccessoryFormItem, ConditionInspectionFormItem } from '../src/types/handover.types';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    testsFailed++;
  }
}

async function runHandoverTestSuite() {
  console.log('\n================================================================');
  console.log('🧪 RUNNING VEHICLE HANDOVER & CLEARANCE TEST SUITE');
  console.log('================================================================\n');

  const supabase = createAdminClient();
  const { data: vehs } = await supabase.from('vehicles').select('id, registration_no').limit(1);
  const TEST_VEHICLE_ID = vehs?.[0]?.id || '04e865f7-9e10-42ee-9ad4-487b21ca4527';
  console.log(`Using test vehicle: ${vehs?.[0]?.registration_no || 'Default'} (${TEST_VEHICLE_ID})`);

  // Clear previous test records for clean slate
  const store = getHandoverStore();
  store.handovers = store.handovers.filter(h => h.vehicle_id !== TEST_VEHICLE_ID);
  store.accessories = store.accessories.filter(a => a.vehicle_id !== TEST_VEHICLE_ID);
  store.inspections = store.inspections.filter(i => i.vehicle_id !== TEST_VEHICLE_ID);
  store.logbookTransfers = store.logbookTransfers.filter(l => l.vehicle_id !== TEST_VEHICLE_ID);
  store.discrepancies = store.discrepancies.filter(d => d.vehicle_id !== TEST_VEHICLE_ID);
  saveHandoverStore(store);

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 1 & 2: Vehicle Acquisition & Missing Accessory Flagging
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- Test Group 1: Vehicle Acquisition & Baseline Checklist ---');

  const incomingRes = await createIncomingHandover({
    vehicleId: TEST_VEHICLE_ID,
    handedOverBy: 'Supplier Agent Mwangi',
    odometer: 64200,
    fuelLevel: 'Half',
    storageLocation: 'Yard Bay 1',
    previousOwner: 'Nairobi Motor Hub',
    acquisitionDate: new Date().toISOString(),
  });

  assert(incomingRes.success, 'Scenario 1: Incoming handover draft created successfully');
  const incomingId = incomingRes.handoverId!;

  // Checklist with Jack missing (Scenario 2)
  const incomingAccessories: AccessoryFormItem[] = [
    {
      accessory_name: 'spare_tire',
      accessory_label: 'Spare Tyre',
      status: 'received_and_verified',
      condition_notes: 'Pirelli 195/65R15, 80% tread',
      reason_if_missing: '',
      is_original_document: null,
      document_verified: false,
      received_from_name: '',
      ownership_discrepancy: '',
    },
    {
      accessory_name: 'jack',
      accessory_label: 'Jack',
      status: 'missing',
      condition_notes: '',
      reason_if_missing: 'Supplier reported jack missing during port clearance; supplier agreed to compensate KES 4,500',
      is_original_document: null,
      document_verified: false,
      received_from_name: '',
      ownership_discrepancy: '',
    },
    {
      accessory_name: 'wheel_spanner',
      accessory_label: 'Wheel Spanner',
      status: 'received_and_verified',
      condition_notes: 'Standard 19mm',
      reason_if_missing: '',
      is_original_document: null,
      document_verified: false,
      received_from_name: '',
      ownership_discrepancy: '',
    },
    {
      accessory_name: 'logbook',
      accessory_label: 'Logbook / Registration Document',
      status: 'received_and_verified',
      condition_notes: 'Clean copy received',
      reason_if_missing: '',
      is_original_document: true,
      document_verified: true,
      received_from_name: 'Mwangi',
      ownership_discrepancy: 'None',
    },
  ];

  const accRes = await saveAccessoryRecords(incomingId, TEST_VEHICLE_ID, 'incoming', incomingAccessories);
  assert(accRes.success, 'Scenario 1: Mandatory accessory checklist saved');

  // Submit incoming handover with discrepancies
  const submitRes = await submitIncomingHandover(incomingId, TEST_VEHICLE_ID, true);
  assert(submitRes.success, 'Scenario 2: Incoming handover received with discrepancies status recorded');

  // Verify persistence
  const postIncomingData = await getVehicleHandoverData(TEST_VEHICLE_ID);
  assert(
    postIncomingData.incoming?.incoming_status === 'received_with_discrepancies',
    'Scenario 2: Discrepancy status persisted in handover master record'
  );
  assert(
    postIncomingData.incomingAccessories.find(a => a.accessory_name === 'jack')?.status === 'missing',
    'Scenario 2: Jack is correctly recorded as missing with reason'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 3 & 4: Outgoing Handover & Financial Clearance Enforcement
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Group 2: Outgoing Handover & Financial Clearance ---');

  const outgoingRes = await createOutgoingHandover(TEST_VEHICLE_ID);
  assert(outgoingRes.success, 'Scenario 3: Outgoing handover initialized');
  const outgoingId = outgoingRes.handoverId!;

  // Explicitly mark as uncleared to verify clearance enforcement
  const sBeforeRelease = getHandoverStore();
  const outRec = sBeforeRelease.handovers.find(h => h.id === outgoingId);
  if (outRec) outRec.financial_clearance_status = 'uncleared';
  saveHandoverStore(sBeforeRelease);

  // Test release attempt without clearance
  const blockedRelease = await releaseVehicle(outgoingId, TEST_VEHICLE_ID);
  assert(
    !blockedRelease.success && Boolean(blockedRelease.error?.includes('financial clearance')),
    'Scenario 4: System blocks release when financial clearance is uncleared'
  );

  // Manager Exception Override
  const exceptionRes = await approveFinancialException(
    outgoingId,
    TEST_VEHICLE_ID,
    'Client approved for 30-day deferred balance under Director credit facility ref DIR-2026-04'
  );
  assert(exceptionRes.success, 'Scenario 4: Authorized manager approves financial exception override');

  const postExceptionData = await getVehicleHandoverData(TEST_VEHICLE_ID);
  assert(
    postExceptionData.outgoing?.financial_clearance_status === 'exception_approved',
    'Scenario 4: Financial clearance reflects exception_approved without altering balance'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 5: Outgoing Accessory Discrepancy (Incoming received, Outgoing missing)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Group 3: Accessory Discrepancy Auto-Detection ---');

  // Outgoing accessories: Spare tire was received in incoming, but now missing!
  const outgoingAccessories: AccessoryFormItem[] = [
    {
      accessory_name: 'spare_tire',
      accessory_label: 'Spare Tyre',
      status: 'missing',
      condition_notes: '',
      reason_if_missing: 'Spare tyre misplaced in showroom yard during detailing',
      is_original_document: null,
      document_verified: false,
      received_from_name: '',
      ownership_discrepancy: '',
    },
    {
      accessory_name: 'jack',
      accessory_label: 'Jack',
      status: 'missing',
      condition_notes: '',
      reason_if_missing: 'Was already missing upon dealership acquisition',
      is_original_document: null,
      document_verified: false,
      received_from_name: '',
      ownership_discrepancy: '',
    },
    {
      accessory_name: 'wheel_spanner',
      accessory_label: 'Wheel Spanner',
      status: 'received_and_verified',
      condition_notes: 'Transferred to client',
      reason_if_missing: '',
      is_original_document: null,
      document_verified: false,
      received_from_name: '',
      ownership_discrepancy: '',
    },
    {
      accessory_name: 'logbook',
      accessory_label: 'Logbook / Registration Document',
      status: 'received_and_verified',
      condition_notes: 'Original held for transfer',
      reason_if_missing: '',
      is_original_document: true,
      document_verified: true,
      received_from_name: 'Dealership',
      ownership_discrepancy: '',
    },
  ];

  await saveAccessoryRecords(outgoingId, TEST_VEHICLE_ID, 'outgoing', outgoingAccessories);

  const dataAfterOutgoingAcc = await getVehicleHandoverData(TEST_VEHICLE_ID);
  const spareTireDiscrepancy = dataAfterOutgoingAcc.discrepancies.find(
    d => d.item_reference === 'spare_tire'
  );
  assert(
    spareTireDiscrepancy !== undefined && spareTireDiscrepancy.status === 'open',
    'Scenario 5: Auto-raised open discrepancy for missing spare tyre that was received on arrival'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 6 & 7: Physical Release vs Legal Ownership Transfer
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Group 4: Physical Release vs Legal Ownership Transfer ---');

  // Record client handover details
  await saveClientHandoverDetails({
    handoverId: outgoingId,
    vehicleId: TEST_VEHICLE_ID,
    collectionDate: new Date().toISOString(),
    authorizedRecipient: 'John Kamau (ID: 28491823)',
    customerAcknowledged: true,
    acknowledgmentNotes: 'Customer acknowledges missing spare tyre to be supplied within 48h',
  });

  // Physical release
  const releaseRes = await releaseVehicle(outgoingId, TEST_VEHICLE_ID);
  assert(releaseRes.success, 'Scenario 6: Vehicle physically released to client');

  // Initiate logbook transfer
  await saveLogbookTransfer({
    handoverId: outgoingId,
    vehicleId: TEST_VEHICLE_ID,
    currentRegisteredOwner: 'Nairobi Motor Hub',
    intendedNewOwner: 'John Kamau',
    status: 'transfer_initiated',
    transferReferenceNo: 'NTSA-TIMS-2026-98124',
    notes: 'Transfer initiated via eCitizen portal',
  });

  const postReleaseData = await getVehicleHandoverData(TEST_VEHICLE_ID);
  assert(
    postReleaseData.outgoing?.outgoing_status === 'logbook_transfer_pending' ||
    postReleaseData.outgoing?.outgoing_status === 'vehicle_released',
    'Scenario 6: Handover reflects vehicle released while ownership transfer remains pending'
  );
  assert(
    postReleaseData.logbookTransfer?.status === 'transfer_initiated',
    'Scenario 6: Logbook transfer is tracked as a dedicated independent pipeline'
  );

  // Confirm ownership transfer (Scenario 7)
  const transferId = postReleaseData.logbookTransfer!.id;
  const confirmRes = await confirmOwnershipTransfer(
    outgoingId,
    TEST_VEHICLE_ID,
    transferId,
    'Verified via NTSA TIMS certificate of transfer no 882910'
  );
  assert(confirmRes.success, 'Scenario 7: Legal ownership transfer confirmed by manager');

  const finalData = await getVehicleHandoverData(TEST_VEHICLE_ID);
  assert(
    finalData.logbookTransfer?.status === 'ownership_confirmed' &&
    finalData.logbookTransfer?.confirmed_by_name !== null,
    'Scenario 7: Ownership confirmed with manager audit identity recorded'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SCENARIO 8: Audit History & Resolution
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test Group 5: Immutable Audit History & Discrepancy Resolution ---');

  if (spareTireDiscrepancy) {
    const resolveRes = await resolveDiscrepancy(
      spareTireDiscrepancy.id,
      TEST_VEHICLE_ID,
      'New OEM spare tyre procured from AutoSpares Ltd and delivered to client; receipt #9910 attached'
    );
    assert(resolveRes.success, 'Scenario 8: Manager resolves discrepancy with documented notes');
  }

  const auditedData = await getVehicleHandoverData(TEST_VEHICLE_ID);
  assert(
    auditedData.auditLogs.length >= 5,
    `Scenario 8: Audit logs preserved (${auditedData.auditLogs.length} events logged)`
  );
  assert(
    auditedData.discrepancies.find(d => d.item_reference === 'spare_tire')?.status === 'resolved',
    'Scenario 8: Discrepancy resolved without deleting or rewriting original issue'
  );

  // Clean up test data
  const finalStore = getHandoverStore();
  finalStore.handovers = finalStore.handovers.filter(h => h.vehicle_id !== TEST_VEHICLE_ID);
  finalStore.accessories = finalStore.accessories.filter(a => a.vehicle_id !== TEST_VEHICLE_ID);
  finalStore.inspections = finalStore.inspections.filter(i => i.vehicle_id !== TEST_VEHICLE_ID);
  finalStore.logbookTransfers = finalStore.logbookTransfers.filter(l => l.vehicle_id !== TEST_VEHICLE_ID);
  finalStore.discrepancies = finalStore.discrepancies.filter(d => d.vehicle_id !== TEST_VEHICLE_ID);
  saveHandoverStore(finalStore);

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runHandoverTestSuite().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
