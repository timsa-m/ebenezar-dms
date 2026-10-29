"use server";

// ============================================================================
// Vehicle Handover Server Actions — Ebenezar Enterprises LTD
// All operations are server-side only. Auth is enforced on every mutation.
// Supabase Postgres first with automatic resilient store fallback.
// ============================================================================

import { createAdminClient } from '@/src/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import {
  requireAuthenticatedUser,
  requireManagerRole,
} from '@/lib/actions/user.actions';
import { getHandoverStore, saveHandoverStore } from '@/lib/handover-store';
import type {
  VehicleHandoverRecord,
  VehicleAccessoryRecord,
  VehicleConditionInspection,
  VehicleLogbookTransfer,
  VehicleHandoverDiscrepancy,
  VehicleHandoverAuditLog,
  VehicleHandoverData,
  HandoverFinancialSummary,
  HandoverType,
  IncomingHandoverStatus,
  OutgoingHandoverStatus,
  AccessoryStatus,
  AccessoryName,
  ConditionRating,
  InspectionCategory,
  LogbookTransferStatus,
  AccessoryFormItem,
  ConditionInspectionFormItem,
} from '@/src/types/handover.types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function revalidateVehiclePaths(vehicleId: string) {
  try {
    revalidatePath(`/vehicles/${vehicleId}`);
    revalidatePath('/vehicles');
    revalidatePath('/admin/inventory');
  } catch {
    // Non-critical when executed in test scripts outside Next.js request store
  }
}

async function logHandoverAudit(
  supabase: ReturnType<typeof createAdminClient>,
  {
    handoverId,
    vehicleId,
    eventType,
    description,
    eventData,
    performedByUserId,
    performedByName,
  }: {
    handoverId: string;
    vehicleId: string;
    eventType: string;
    description: string;
    eventData?: Record<string, any>;
    performedByUserId?: string;
    performedByName?: string;
  }
) {
  const auditEntry: VehicleHandoverAuditLog = {
    id: crypto.randomUUID(),
    handover_id: handoverId,
    vehicle_id: vehicleId,
    event_type: eventType,
    description,
    event_data: eventData ?? null,
    performed_by_user_id: performedByUserId ?? null,
    performed_by_name: performedByName ?? null,
    performed_at: new Date().toISOString(),
  };

  // Always append to fallback store
  try {
    const store = getHandoverStore();
    store.auditLogs.unshift(auditEntry);
    saveHandoverStore(store);
  } catch (err) {
    console.warn('[logHandoverAudit] store fallback non-critical:', err);
  }

  // Also try Supabase table
  try {
    await supabase.from('vehicle_handover_audit_logs').insert({
      id: auditEntry.id,
      handover_id: handoverId,
      vehicle_id: vehicleId,
      event_type: eventType,
      description,
      event_data: eventData ?? null,
      performed_by_user_id: performedByUserId ?? null,
      performed_by_name: performedByName ?? null,
      performed_at: auditEntry.performed_at,
    });
  } catch (err) {
    // Non-critical
  }
}

// ── READ: Get All Handover Data For A Vehicle ─────────────────────────────────

export async function getVehicleHandoverData(vehicleId: string): Promise<VehicleHandoverData> {
  const supabase = createAdminClient();

  const [
    { data: handovers },
    { data: accessories },
    { data: inspections },
    { data: logbookTransfers },
    { data: discrepancies },
    { data: auditLogs },
  ] = await Promise.all([
    supabase
      .from('vehicle_handover_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('is_cancelled', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('vehicle_accessory_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('recorded_at', { ascending: true }),
    supabase
      .from('vehicle_condition_inspections')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('inspected_at', { ascending: true }),
    supabase
      .from('vehicle_logbook_transfers')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('vehicle_handover_discrepancies')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('raised_at', { ascending: false }),
    supabase
      .from('vehicle_handover_audit_logs')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('performed_at', { ascending: false })
      .limit(100),
  ]);

  const store = getHandoverStore();

  const allHandovers = (handovers && handovers.length > 0
    ? handovers
    : store.handovers.filter(h => h.vehicle_id === vehicleId && !h.is_cancelled)) as VehicleHandoverRecord[];

  const incoming = allHandovers.find(h => h.handover_type === 'incoming') ?? null;
  const outgoing = allHandovers.find(h => h.handover_type === 'outgoing') ?? null;

  const allAccessories = (accessories && accessories.length > 0
    ? accessories
    : store.accessories.filter(a => a.vehicle_id === vehicleId)) as VehicleAccessoryRecord[];

  const incomingAccessories = incoming
    ? allAccessories.filter(a => a.handover_id === incoming.id)
    : [];
  const outgoingAccessories = outgoing
    ? allAccessories.filter(a => a.handover_id === outgoing.id)
    : [];

  const allInspections = (inspections && inspections.length > 0
    ? inspections
    : store.inspections.filter(i => i.vehicle_id === vehicleId)) as VehicleConditionInspection[];

  const incomingInspections = incoming
    ? allInspections.filter(i => i.handover_id === incoming.id)
    : [];
  const outgoingInspections = outgoing
    ? allInspections.filter(i => i.handover_id === outgoing.id)
    : [];

  const allTransfers = (logbookTransfers && logbookTransfers.length > 0
    ? logbookTransfers
    : store.logbookTransfers.filter(lt => lt.vehicle_id === vehicleId)) as VehicleLogbookTransfer[];

  const allDiscrepancies = (discrepancies && discrepancies.length > 0
    ? discrepancies
    : store.discrepancies.filter(d => d.vehicle_id === vehicleId)) as VehicleHandoverDiscrepancy[];

  const allAuditLogs = (auditLogs && auditLogs.length > 0
    ? auditLogs
    : store.auditLogs.filter(a => a.vehicle_id === vehicleId)) as VehicleHandoverAuditLog[];

  // Fetch financial summary for the vehicle
  const financialSummary = await getHandoverFinancialSummary(supabase, vehicleId);

  return {
    incoming,
    outgoing,
    incomingAccessories,
    outgoingAccessories,
    incomingInspections,
    outgoingInspections,
    logbookTransfer: allTransfers[0] ?? null,
    discrepancies: allDiscrepancies,
    auditLogs: allAuditLogs,
    financialSummary,
  };
}

// ── FINANCIAL SUMMARY ─────────────────────────────────────────────────────────

async function getHandoverFinancialSummary(
  supabase: ReturnType<typeof createAdminClient>,
  vehicleId: string
): Promise<HandoverFinancialSummary | null> {
  const { data: agreements } = await supabase
    .from('financing_agreements')
    .select(`
      *,
      client:clients(id, full_name, phone, client_id_number)
    `)
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1);

  const agreement = agreements?.[0];

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('status, sale_price, date_sold')
    .eq('id', vehicleId)
    .maybeSingle();

  if (!agreement) {
    if (vehicle?.status === 'cash_sale' || vehicle?.status === 'sold') {
      return {
        agreementId: null,
        contractNo: null,
        saleType: 'cash_sale',
        salePrice: Number(vehicle?.sale_price ?? 0),
        depositPaid: Number(vehicle?.sale_price ?? 0),
        totalPaid: Number(vehicle?.sale_price ?? 0),
        outstandingBalance: 0,
        outstandingPenalties: 0,
        totalOutstanding: 0,
        agreementStatus: 'completed',
        daysOverdue: 0,
        isFinanciallyCleared: true,
        clientName: null,
        clientPhone: null,
        clientIdNumber: null,
      };
    }
    return null;
  }

  const { data: repayments } = await supabase
    .from('repayments')
    .select('amount_paid')
    .eq('agreement_id', agreement.id);

  const totalPaid =
    Number(agreement.deposit_paid ?? 0) +
    (repayments ?? []).reduce((sum: number, r: any) => sum + Number(r.amount_paid ?? 0), 0);

  const balance = Number(agreement.balance ?? 0);
  const penalties = Number(agreement.total_penalties ?? 0);
  const totalOutstanding = balance + penalties;
  const isFinanciallyCleared = totalOutstanding <= 0 && agreement.status === 'completed';

  const client = (agreement as any).client;

  return {
    agreementId: agreement.id,
    contractNo: agreement.contract_no,
    saleType: isFinanciallyCleared ? 'cash_sale' : 'financed',
    salePrice: Number(agreement.sale_price ?? 0),
    depositPaid: Number(agreement.deposit_paid ?? 0),
    totalPaid,
    outstandingBalance: balance,
    outstandingPenalties: penalties,
    totalOutstanding,
    agreementStatus: agreement.status,
    daysOverdue: Number(agreement.days_overdue ?? 0),
    isFinanciallyCleared,
    clientName: client?.full_name ?? null,
    clientPhone: client?.phone ?? null,
    clientIdNumber: client?.client_id_number ?? null,
  };
}

// ── CREATE INCOMING HANDOVER ──────────────────────────────────────────────────

export interface CreateIncomingHandoverParams {
  vehicleId: string;
  acquisitionRef?: string;
  handedOverBy?: string;
  odometer?: number;
  fuelLevel?: string;
  storageLocation?: string;
  previousOwner?: string;
  acquisitionDate?: string;
}

export async function createIncomingHandover(params: CreateIncomingHandoverParams) {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createAdminClient();

    const { data: vehicle, error: vErr } = await supabase
      .from('vehicles')
      .select('id, registration_no, status')
      .eq('id', params.vehicleId)
      .maybeSingle();

    if (vErr || !vehicle) {
      return { success: false, error: 'Vehicle not found.' };
    }

    const store = getHandoverStore();
    const existingInStore = store.handovers.find(
      h => h.vehicle_id === params.vehicleId && h.handover_type === 'incoming' && !h.is_cancelled
    );

    const { data: existing } = await supabase
      .from('vehicle_handover_records')
      .select('id, incoming_status')
      .eq('vehicle_id', params.vehicleId)
      .eq('handover_type', 'incoming')
      .eq('is_cancelled', false)
      .maybeSingle();

    if (existing || existingInStore) {
      const activeRec = existing || existingInStore;
      return {
        success: false,
        error: `An incoming handover record already exists for ${vehicle.registration_no} (Status: ${activeRec?.incoming_status}). Please update the existing record.`,
      };
    }

    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const { data: purchase } = await supabase
      .from('vehicle_purchases')
      .select('id')
      .eq('vehicle_id', params.vehicleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      vehicle_id: params.vehicleId,
      acquisition_ref: purchase?.id ?? params.acquisitionRef ?? null,
      handover_type: 'incoming' as HandoverType,
      incoming_status: 'draft' as IncomingHandoverStatus,
      acquisition_date: params.acquisitionDate ?? new Date().toISOString(),
      previous_owner: params.previousOwner ?? null,
      received_by_user_id: user.$id,
      received_by_name: staffName,
      handedOverBy: params.handedOverBy ?? null,
      odometer_km: params.odometer ?? null,
      fuel_level: params.fuelLevel ?? null,
      storage_location: params.storageLocation ?? null,
      workflow_step: 1,
      created_by_user_id: user.$id,
      created_by_name: staffName,
      updated_by_user_id: user.$id,
      updated_by_name: staffName,
    };

    let record: any = null;
    const { data: dbRecord, error: rErr } = await supabase
      .from('vehicle_handover_records')
      .insert(payload)
      .select()
      .single();

    if (rErr || !dbRecord) {
      // Fallback store
      record = {
        id: crypto.randomUUID(),
        ...payload,
        is_cancelled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.handovers.push(record);
      saveHandoverStore(store);
    } else {
      record = dbRecord;
    }

    await logHandoverAudit(supabase, {
      handoverId: record.id,
      vehicleId: params.vehicleId,
      eventType: 'handover_created',
      description: `Incoming handover record created for vehicle ${vehicle.registration_no}.`,
      eventData: { vehicleId: params.vehicleId, status: 'draft' },
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(params.vehicleId);
    return { success: true, handoverId: record.id, record };
  } catch (err: any) {
    console.error('[createIncomingHandover]', err);
    return { success: false, error: err?.message || 'Failed to create incoming handover.' };
  }
}

// ── SAVE ACCESSORIES ──────────────────────────────────────────────────────────

export async function saveAccessoryRecords(
  handoverId: string,
  vehicleId: string,
  handoverType: HandoverType,
  accessories: AccessoryFormItem[]
) {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createAdminClient();
    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const rows = accessories.map(acc => ({
      id: crypto.randomUUID(),
      handover_id: handoverId,
      vehicle_id: vehicleId,
      handover_type: handoverType,
      accessory_name: acc.accessory_name,
      accessory_label: acc.accessory_label,
      status: acc.status,
      condition_notes: acc.condition_notes || null,
      reason_if_missing: acc.reason_if_missing || null,
      is_original_document:
        acc.accessory_name === 'logbook' ? acc.is_original_document : null,
      document_verified:
        acc.accessory_name === 'logbook' ? acc.document_verified : false,
      received_from_name:
        acc.accessory_name === 'logbook' ? acc.received_from_name || null : null,
      ownership_discrepancy:
        acc.accessory_name === 'logbook' ? acc.ownership_discrepancy || null : null,
      photo_urls: null,
      recorded_by_user_id: user.$id,
      recorded_by_name: staffName,
      recorded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Always update store
    const store = getHandoverStore();
    store.accessories = store.accessories.filter(a => a.handover_id !== handoverId);
    store.accessories.push(...(rows as VehicleAccessoryRecord[]));
    saveHandoverStore(store);

    // Try Supabase table
    try {
      await supabase
        .from('vehicle_accessory_records')
        .delete()
        .eq('handover_id', handoverId);
      await supabase.from('vehicle_accessory_records').insert(rows);
    } catch {
      // Non-critical if table pending migration
    }

    if (handoverType === 'outgoing') {
      await autoRaiseAccessoryDiscrepancies(supabase, handoverId, vehicleId, accessories, user.$id, staffName);
    }

    await logHandoverAudit(supabase, {
      handoverId,
      vehicleId,
      eventType: 'accessories_saved',
      description: `Accessory checklist saved for ${handoverType} handover (${accessories.length} items).`,
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(vehicleId);
    return { success: true };
  } catch (err: any) {
    console.error('[saveAccessoryRecords]', err);
    return { success: false, error: err?.message || 'Failed to save accessories.' };
  }
}

async function autoRaiseAccessoryDiscrepancies(
  supabase: ReturnType<typeof createAdminClient>,
  handoverId: string,
  vehicleId: string,
  outgoingAccessories: AccessoryFormItem[],
  userId: string,
  userName: string
) {
  const store = getHandoverStore();
  const incomingHandover = store.handovers.find(
    h => h.vehicle_id === vehicleId && h.handover_type === 'incoming' && !h.is_cancelled
  );

  if (!incomingHandover) return;

  const incomingAccs = store.accessories.filter(a => a.handover_id === incomingHandover.id);

  for (const outAcc of outgoingAccessories) {
    const inAcc = incomingAccs.find(a => a.accessory_name === outAcc.accessory_name);

    if (
      inAcc &&
      inAcc.status === 'received_and_verified' &&
      (outAcc.status === 'missing' || outAcc.status === 'received_but_defective')
    ) {
      const disc: VehicleHandoverDiscrepancy = {
        id: crypto.randomUUID(),
        handover_id: handoverId,
        vehicle_id: vehicleId,
        discrepancy_type: 'accessory_missing',
        item_reference: outAcc.accessory_name,
        description: `${outAcc.accessory_label} was recorded as received during incoming inspection but is now ${outAcc.status === 'missing' ? 'missing' : 'defective'} during outgoing handover.`,
        severity: 'high',
        status: 'open',
        resolution_notes: null,
        resolved_by_user_id: null,
        resolved_by_name: null,
        resolved_at: null,
        supporting_doc_urls: null,
        raised_by_user_id: userId,
        raised_by_name: userName,
        raised_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      store.discrepancies.unshift(disc);
      saveHandoverStore(store);

      try {
        await supabase.from('vehicle_handover_discrepancies').insert(disc);
      } catch {
        // Table fallback
      }
    }
  }
}

// ── SAVE CONDITION INSPECTIONS ────────────────────────────────────────────────

export async function saveConditionInspections(
  handoverId: string,
  vehicleId: string,
  handoverType: HandoverType,
  items: ConditionInspectionFormItem[],
  overallCondition?: string,
  outstandingIssues?: string
) {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createAdminClient();
    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const rows = items.map(item => ({
      id: crypto.randomUUID(),
      handover_id: handoverId,
      vehicle_id: vehicleId,
      handover_type: handoverType,
      category: item.category,
      item_key: item.item_key,
      item_label: item.item_label,
      rating: item.rating,
      notes: item.notes || null,
      photo_urls: null,
      inspected_by_user_id: user.$id,
      inspected_by_name: staffName,
      inspected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Update store
    const store = getHandoverStore();
    store.inspections = store.inspections.filter(i => i.handover_id !== handoverId);
    store.inspections.push(...(rows as VehicleConditionInspection[]));

    const rec = store.handovers.find(h => h.id === handoverId);
    if (rec) {
      if (overallCondition !== undefined) rec.overall_condition = overallCondition;
      if (outstandingIssues !== undefined) rec.outstanding_issues = outstandingIssues;
      rec.updated_at = new Date().toISOString();
    }
    saveHandoverStore(store);

    // Try Supabase table
    try {
      await supabase
        .from('vehicle_condition_inspections')
        .delete()
        .eq('handover_id', handoverId);
      if (rows.length > 0) {
        await supabase.from('vehicle_condition_inspections').insert(rows);
      }

      if (overallCondition !== undefined || outstandingIssues !== undefined) {
        await supabase
          .from('vehicle_handover_records')
          .update({
            overall_condition: overallCondition ?? null,
            outstanding_issues: outstandingIssues ?? null,
            updated_by_user_id: user.$id,
            updated_by_name: staffName,
          })
          .eq('id', handoverId);
      }
    } catch {
      // Table fallback
    }

    await logHandoverAudit(supabase, {
      handoverId,
      vehicleId,
      eventType: 'inspection_completed',
      description: `Vehicle condition inspection completed for ${handoverType} handover (${items.length} items assessed).`,
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(vehicleId);
    return { success: true };
  } catch (err: any) {
    console.error('[saveConditionInspections]', err);
    return { success: false, error: err?.message || 'Failed to save inspection data.' };
  }
}

// ── UPDATE HANDOVER STATUS ────────────────────────────────────────────────────

export async function updateIncomingHandoverStatus(
  handoverId: string,
  vehicleId: string,
  newStatus: IncomingHandoverStatus
) {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createAdminClient();
    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const store = getHandoverStore();
    const rec = store.handovers.find(h => h.id === handoverId);
    if (rec) {
      rec.incoming_status = newStatus;
      rec.updated_by_user_id = user.$id;
      rec.updated_by_name = staffName;
      rec.updated_at = new Date().toISOString();
      if (newStatus === 'received_and_verified' || newStatus === 'received_with_discrepancies') {
        rec.submitted_at = new Date().toISOString();
      }
      if (newStatus === 'closed') {
        rec.completed_at = new Date().toISOString();
      }
      saveHandoverStore(store);
    }

    try {
      const updatePayload: any = {
        incoming_status: newStatus,
        updated_by_user_id: user.$id,
        updated_by_name: staffName,
      };
      if (newStatus === 'received_and_verified' || newStatus === 'received_with_discrepancies') {
        updatePayload.submitted_at = new Date().toISOString();
      }
      if (newStatus === 'closed') {
        updatePayload.completed_at = new Date().toISOString();
      }
      await supabase.from('vehicle_handover_records').update(updatePayload).eq('id', handoverId);
    } catch {
      // Table fallback
    }

    await logHandoverAudit(supabase, {
      handoverId,
      vehicleId,
      eventType: 'status_changed',
      description: `Incoming handover status updated to: ${newStatus}.`,
      eventData: { newStatus },
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(vehicleId);
    return { success: true };
  } catch (err: any) {
    console.error('[updateIncomingHandoverStatus]', err);
    return { success: false, error: err?.message || 'Failed to update status.' };
  }
}

export async function submitIncomingHandover(
  handoverId: string,
  vehicleId: string,
  hasDiscrepancies: boolean
) {
  const finalStatus: IncomingHandoverStatus = hasDiscrepancies
    ? 'received_with_discrepancies'
    : 'received_and_verified';
  return updateIncomingHandoverStatus(handoverId, vehicleId, finalStatus);
}

// ── CREATE OUTGOING HANDOVER ──────────────────────────────────────────────────

export async function createOutgoingHandover(vehicleId: string) {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createAdminClient();

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id, registration_no, status')
      .eq('id', vehicleId)
      .maybeSingle();

    if (!vehicle) return { success: false, error: 'Vehicle not found.' };

    const soldStatuses = ['financed', 'cash_sale', 'sold', 'credit'];
    if (!soldStatuses.includes(vehicle.status)) {
      return {
        success: false,
        error: `Outgoing handover is only available for sold or financed vehicles. Current status: ${vehicle.status.replace('_', ' ')}.`,
      };
    }

    const store = getHandoverStore();
    const existingInStore = store.handovers.find(
      h => h.vehicle_id === vehicleId && h.handover_type === 'outgoing' && !h.is_cancelled
    );

    const { data: existing } = await supabase
      .from('vehicle_handover_records')
      .select('id, outgoing_status')
      .eq('vehicle_id', vehicleId)
      .eq('handover_type', 'outgoing')
      .eq('is_cancelled', false)
      .maybeSingle();

    if (existing || existingInStore) {
      const active = existing || existingInStore;
      return {
        success: false,
        error: `An outgoing handover record already exists for ${vehicle.registration_no} (Status: ${active?.outgoing_status}).`,
      };
    }

    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const { data: agreements } = await supabase
      .from('financing_agreements')
      .select('id, client_id, status, balance, total_penalties')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .limit(1);

    const agreement = agreements?.[0];
    const initialStatus: OutgoingHandoverStatus =
      !agreement || (Number(agreement?.balance ?? 0) + Number(agreement?.total_penalties ?? 0)) <= 0
        ? 'awaiting_inspection'
        : 'awaiting_financial_clearance';

    const payload = {
      vehicle_id: vehicleId,
      sale_ref: agreement?.id ?? null,
      client_id: agreement?.client_id ?? null,
      handover_type: 'outgoing' as HandoverType,
      outgoing_status: initialStatus,
      workflow_step: 1,
      financial_clearance_status:
        initialStatus === 'awaiting_inspection' ? 'cleared' : 'uncleared',
      releasing_user_id: user.$id,
      releasing_user_name: staffName,
      created_by_user_id: user.$id,
      created_by_name: staffName,
      updated_by_user_id: user.$id,
      updated_by_name: staffName,
    };

    let record: any = null;
    const { data: dbRecord, error: rErr } = await supabase
      .from('vehicle_handover_records')
      .insert(payload)
      .select()
      .single();

    if (rErr || !dbRecord) {
      record = {
        id: crypto.randomUUID(),
        ...payload,
        is_cancelled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.handovers.push(record);
      saveHandoverStore(store);
    } else {
      record = dbRecord;
    }

    await logHandoverAudit(supabase, {
      handoverId: record.id,
      vehicleId,
      eventType: 'handover_created',
      description: `Outgoing handover record created for vehicle ${vehicle.registration_no}. Initial status: ${initialStatus}.`,
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(vehicleId);
    return { success: true, handoverId: record.id, record };
  } catch (err: any) {
    console.error('[createOutgoingHandover]', err);
    return { success: false, error: err?.message || 'Failed to create outgoing handover.' };
  }
}

// ── APPROVE FINANCIAL EXCEPTION ───────────────────────────────────────────────

export async function approveFinancialException(
  handoverId: string,
  vehicleId: string,
  reason: string
) {
  try {
    const user = await requireManagerRole();
    const supabase = createAdminClient();

    if (!reason?.trim()) {
      return { success: false, error: 'A documented reason is required for financial exceptions.' };
    }

    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const store = getHandoverStore();
    const rec = store.handovers.find(h => h.id === handoverId);
    if (rec) {
      rec.financial_clearance_status = 'exception_approved';
      rec.exception_approved_by = user.$id;
      rec.exception_approved_by_name = staffName;
      rec.exception_reason = reason.trim();
      rec.exception_approved_at = new Date().toISOString();
      rec.outgoing_status = 'awaiting_inspection';
      rec.updated_by_user_id = user.$id;
      rec.updated_by_name = staffName;
      rec.updated_at = new Date().toISOString();
      saveHandoverStore(store);
    }

    try {
      await supabase
        .from('vehicle_handover_records')
        .update({
          financial_clearance_status: 'exception_approved',
          exception_approved_by: user.$id,
          exception_approved_by_name: staffName,
          exception_reason: reason.trim(),
          exception_approved_at: new Date().toISOString(),
          outgoing_status: 'awaiting_inspection',
          updated_by_user_id: user.$id,
          updated_by_name: staffName,
        })
        .eq('id', handoverId);
    } catch {
      // Table fallback
    }

    await logHandoverAudit(supabase, {
      handoverId,
      vehicleId,
      eventType: 'financial_exception_approved',
      description: `Financial exception approved by ${staffName}. Reason: ${reason}. Note: outstanding balance remains on account.`,
      eventData: { approvedBy: staffName, reason },
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(vehicleId);
    return { success: true };
  } catch (err: any) {
    console.error('[approveFinancialException]', err);
    return { success: false, error: err?.message || 'Failed to approve exception.' };
  }
}

// ── SAVE CLIENT HANDOVER DETAILS ──────────────────────────────────────────────

export interface SaveClientHandoverParams {
  handoverId: string;
  vehicleId: string;
  collectionDate: string;
  authorizedRecipient?: string;
  customerAcknowledged: boolean;
  acknowledgmentNotes?: string;
}

export async function saveClientHandoverDetails(params: SaveClientHandoverParams) {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createAdminClient();
    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const store = getHandoverStore();
    const rec = store.handovers.find(h => h.id === params.handoverId);
    if (rec) {
      rec.collection_date = params.collectionDate;
      rec.releasing_user_id = user.$id;
      rec.releasing_user_name = staffName;
      rec.authorized_recipient = params.authorizedRecipient ?? null;
      rec.customer_acknowledged = params.customerAcknowledged;
      rec.acknowledgment_notes = params.acknowledgmentNotes ?? null;
      rec.updated_by_user_id = user.$id;
      rec.updated_by_name = staffName;
      rec.updated_at = new Date().toISOString();
      saveHandoverStore(store);
    }

    try {
      await supabase
        .from('vehicle_handover_records')
        .update({
          collection_date: params.collectionDate,
          releasing_user_id: user.$id,
          releasing_user_name: staffName,
          authorized_recipient: params.authorizedRecipient ?? null,
          customer_acknowledged: params.customerAcknowledged,
          acknowledgment_notes: params.acknowledgmentNotes ?? null,
          updated_by_user_id: user.$id,
          updated_by_name: staffName,
        })
        .eq('id', params.handoverId);
    } catch {
      // Table fallback
    }

    await logHandoverAudit(supabase, {
      handoverId: params.handoverId,
      vehicleId: params.vehicleId,
      eventType: 'client_details_saved',
      description: `Client handover details recorded. Customer acknowledged: ${params.customerAcknowledged}.`,
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(params.vehicleId);
    return { success: true };
  } catch (err: any) {
    console.error('[saveClientHandoverDetails]', err);
    return { success: false, error: err?.message || 'Failed to save client details.' };
  }
}

// ── RELEASE VEHICLE (Mark as Handed Over) ────────────────────────────────────

export async function releaseVehicle(handoverId: string, vehicleId: string) {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createAdminClient();
    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const store = getHandoverStore();
    const handover = store.handovers.find(h => h.id === handoverId);

    if (handover && handover.financial_clearance_status === 'uncleared') {
      return {
        success: false,
        error: 'Cannot release vehicle: financial clearance has not been confirmed or an exception has not been approved by a manager.',
      };
    }

    if (handover) {
      handover.outgoing_status = 'vehicle_released';
      handover.submitted_at = new Date().toISOString();
      handover.updated_by_user_id = user.$id;
      handover.updated_by_name = staffName;
      handover.updated_at = new Date().toISOString();
      saveHandoverStore(store);
    }

    try {
      await supabase
        .from('vehicle_handover_records')
        .update({
          outgoing_status: 'vehicle_released',
          submitted_at: new Date().toISOString(),
          updated_by_user_id: user.$id,
          updated_by_name: staffName,
        })
        .eq('id', handoverId);
    } catch {
      // Table fallback
    }

    await logHandoverAudit(supabase, {
      handoverId,
      vehicleId,
      eventType: 'vehicle_released',
      description: `Vehicle physically released to client by ${staffName}.`,
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(vehicleId);
    return { success: true };
  } catch (err: any) {
    console.error('[releaseVehicle]', err);
    return { success: false, error: err?.message || 'Failed to mark vehicle as released.' };
  }
}

// ── LOGBOOK TRANSFER MANAGEMENT ───────────────────────────────────────────────

export interface SaveLogbookTransferParams {
  handoverId: string;
  vehicleId: string;
  currentRegisteredOwner?: string;
  intendedNewOwner?: string;
  documentReference?: string;
  status: LogbookTransferStatus;
  transferReferenceNo?: string;
  notes?: string;
  delayReason?: string;
  transferInitiatedDate?: string;
}

export async function saveLogbookTransfer(params: SaveLogbookTransferParams) {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createAdminClient();
    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const payload = {
      handover_id: params.handoverId,
      vehicle_id: params.vehicleId,
      current_registered_owner: params.currentRegisteredOwner ?? null,
      intended_new_owner: params.intendedNewOwner ?? null,
      document_reference: params.documentReference ?? null,
      status: params.status,
      transfer_reference_no: params.transferReferenceNo ?? null,
      handling_user_id: user.$id,
      handling_user_name: staffName,
      supporting_doc_urls: null,
      notes: params.notes ?? null,
      delay_reason: params.delayReason ?? null,
      transfer_initiated_date: params.transferInitiatedDate ?? null,
      ownership_confirmed_date: null,
      confirmed_by_user_id: null,
      confirmed_by_name: null,
      document_released_to_client_date: null,
      releasing_user_id: null,
      releasing_user_name: null,
    };

    const store = getHandoverStore();
    const existingIdx = store.logbookTransfers.findIndex(lt => lt.handover_id === params.handoverId);
    if (existingIdx >= 0) {
      store.logbookTransfers[existingIdx] = {
        ...store.logbookTransfers[existingIdx],
        ...payload,
        updated_at: new Date().toISOString(),
      };
    } else {
      store.logbookTransfers.push({
        id: crypto.randomUUID(),
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    saveHandoverStore(store);

    try {
      const { data: existing } = await supabase
        .from('vehicle_logbook_transfers')
        .select('id')
        .eq('handover_id', params.handoverId)
        .maybeSingle();

      if (existing) {
        await supabase.from('vehicle_logbook_transfers').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('vehicle_logbook_transfers').insert(payload);
      }
    } catch {
      // Table fallback
    }

    await logHandoverAudit(supabase, {
      handoverId: params.handoverId,
      vehicleId: params.vehicleId,
      eventType: 'logbook_transfer_updated',
      description: `Logbook transfer status updated to: ${params.status}.`,
      eventData: { status: params.status, reference: params.transferReferenceNo },
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(params.vehicleId);
    return { success: true };
  } catch (err: any) {
    console.error('[saveLogbookTransfer]', err);
    return { success: false, error: err?.message || 'Failed to save logbook transfer.' };
  }
}

// ── CONFIRM OWNERSHIP TRANSFER ────────────────────────────────────────────────

export async function confirmOwnershipTransfer(
  handoverId: string,
  vehicleId: string,
  transferId: string,
  evidenceNotes?: string
) {
  try {
    const user = await requireManagerRole();
    const supabase = createAdminClient();
    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
    const now = new Date().toISOString();

    const store = getHandoverStore();
    const lt = store.logbookTransfers.find(t => t.id === transferId || t.handover_id === handoverId);
    if (lt) {
      lt.status = 'ownership_confirmed';
      lt.ownership_confirmed_date = now;
      lt.confirmed_by_user_id = user.$id;
      lt.confirmed_by_name = staffName;
      if (evidenceNotes) lt.notes = evidenceNotes;
      lt.updated_at = now;
    }

    const rec = store.handovers.find(h => h.id === handoverId);
    if (rec) {
      rec.outgoing_status = 'ownership_transfer_confirmed';
      rec.updated_by_user_id = user.$id;
      rec.updated_by_name = staffName;
      rec.updated_at = now;
    }
    saveHandoverStore(store);

    try {
      await supabase
        .from('vehicle_logbook_transfers')
        .update({
          status: 'ownership_confirmed',
          ownership_confirmed_date: now,
          confirmed_by_user_id: user.$id,
          confirmed_by_name: staffName,
          notes: evidenceNotes ?? null,
        })
        .eq('id', transferId);

      await supabase
        .from('vehicle_handover_records')
        .update({
          outgoing_status: 'ownership_transfer_confirmed',
          updated_by_user_id: user.$id,
          updated_by_name: staffName,
        })
        .eq('id', handoverId);
    } catch {
      // Table fallback
    }

    await logHandoverAudit(supabase, {
      handoverId,
      vehicleId,
      eventType: 'ownership_transfer_confirmed',
      description: `Ownership transfer confirmed by ${staffName}.`,
      eventData: { confirmedBy: staffName },
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(vehicleId);
    return { success: true };
  } catch (err: any) {
    console.error('[confirmOwnershipTransfer]', err);
    return { success: false, error: err?.message || 'Failed to confirm ownership transfer.' };
  }
}

// ── RESOLVE DISCREPANCY ───────────────────────────────────────────────────────

export async function resolveDiscrepancy(
  discrepancyId: string,
  vehicleId: string,
  resolutionNotes: string
) {
  try {
    const user = await requireManagerRole();
    const supabase = createAdminClient();

    if (!resolutionNotes?.trim()) {
      return { success: false, error: 'Resolution notes are required.' };
    }

    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const store = getHandoverStore();
    const disc = store.discrepancies.find(d => d.id === discrepancyId);
    if (disc) {
      disc.status = 'resolved';
      disc.resolution_notes = resolutionNotes.trim();
      disc.resolved_by_user_id = user.$id;
      disc.resolved_by_name = staffName;
      disc.resolved_at = new Date().toISOString();
      disc.updated_at = new Date().toISOString();
      saveHandoverStore(store);
    }

    try {
      await supabase
        .from('vehicle_handover_discrepancies')
        .update({
          status: 'resolved',
          resolution_notes: resolutionNotes.trim(),
          resolved_by_user_id: user.$id,
          resolved_by_name: staffName,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', discrepancyId);
    } catch {
      // Table fallback
    }

    await logHandoverAudit(supabase, {
      handoverId: disc?.handover_id || '',
      vehicleId,
      eventType: 'discrepancy_resolved',
      description: `Discrepancy resolved by ${staffName}. Issue: "${disc?.description}". Resolution: "${resolutionNotes}".`,
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(vehicleId);
    return { success: true };
  } catch (err: any) {
    console.error('[resolveDiscrepancy]', err);
    return { success: false, error: err?.message || 'Failed to resolve discrepancy.' };
  }
}

// ── UPDATE HANDOVER DETAILS ───────────────────────────────────────────────────

export async function updateHandoverDetails(
  handoverId: string,
  vehicleId: string,
  updates: {
    handedOverBy?: string;
    odometer?: number;
    fuelLevel?: string;
    storageLocation?: string;
    previousOwner?: string;
    acquisitionDate?: string;
  }
) {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createAdminClient();
    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const store = getHandoverStore();
    const rec = store.handovers.find(h => h.id === handoverId);
    if (rec) {
      if (updates.handedOverBy !== undefined) rec.handed_over_by = updates.handedOverBy;
      if (updates.odometer !== undefined) rec.odometer_km = updates.odometer;
      if (updates.fuelLevel !== undefined) rec.fuel_level = updates.fuelLevel;
      if (updates.storageLocation !== undefined) rec.storage_location = updates.storageLocation;
      if (updates.previousOwner !== undefined) rec.previous_owner = updates.previousOwner;
      if (updates.acquisitionDate !== undefined) rec.acquisition_date = updates.acquisitionDate;
      rec.updated_by_user_id = user.$id;
      rec.updated_by_name = staffName;
      rec.updated_at = new Date().toISOString();
      saveHandoverStore(store);
    }

    try {
      const updatePayload: any = {
        updated_by_user_id: user.$id,
        updated_by_name: staffName,
      };
      if (updates.handedOverBy !== undefined) updatePayload.handed_over_by = updates.handedOverBy;
      if (updates.odometer !== undefined) updatePayload.odometer_km = updates.odometer;
      if (updates.fuelLevel !== undefined) updatePayload.fuel_level = updates.fuelLevel;
      if (updates.storageLocation !== undefined) updatePayload.storage_location = updates.storageLocation;
      if (updates.previousOwner !== undefined) updatePayload.previous_owner = updates.previousOwner;
      if (updates.acquisitionDate !== undefined) updatePayload.acquisition_date = updates.acquisitionDate;

      await supabase.from('vehicle_handover_records').update(updatePayload).eq('id', handoverId);
    } catch {
      // Table fallback
    }

    revalidateVehiclePaths(vehicleId);
    return { success: true };
  } catch (err: any) {
    console.error('[updateHandoverDetails]', err);
    return { success: false, error: err?.message || 'Failed to update handover details.' };
  }
}

// ── COMPLETE OUTGOING HANDOVER ────────────────────────────────────────────────

export async function completeOutgoingHandover(handoverId: string, vehicleId: string) {
  try {
    const user = await requireManagerRole();
    const supabase = createAdminClient();
    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const store = getHandoverStore();
    const rec = store.handovers.find(h => h.id === handoverId);
    if (rec) {
      rec.outgoing_status = 'completed';
      rec.completed_at = new Date().toISOString();
      rec.updated_by_user_id = user.$id;
      rec.updated_by_name = staffName;
      rec.updated_at = new Date().toISOString();
      saveHandoverStore(store);
    }

    try {
      await supabase
        .from('vehicle_handover_records')
        .update({
          outgoing_status: 'completed',
          completed_at: new Date().toISOString(),
          updated_by_user_id: user.$id,
          updated_by_name: staffName,
        })
        .eq('id', handoverId);
    } catch {
      // Table fallback
    }

    await logHandoverAudit(supabase, {
      handoverId,
      vehicleId,
      eventType: 'handover_completed',
      description: `Outgoing handover marked as completed by ${staffName}.`,
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(vehicleId);
    return { success: true };
  } catch (err: any) {
    console.error('[completeOutgoingHandover]', err);
    return { success: false, error: err?.message || 'Failed to complete handover.' };
  }
}

// ── CANCEL HANDOVER ───────────────────────────────────────────────────────────

export async function cancelHandover(
  handoverId: string,
  vehicleId: string,
  reason: string
) {
  try {
    const user = await requireManagerRole();
    const supabase = createAdminClient();

    if (!reason?.trim()) {
      return { success: false, error: 'Cancellation reason is required.' };
    }

    const staffName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    const store = getHandoverStore();
    const rec = store.handovers.find(h => h.id === handoverId);
    if (rec) {
      rec.is_cancelled = true;
      rec.cancelled_by = user.$id;
      rec.cancelled_at = new Date().toISOString();
      rec.cancellation_reason = reason.trim();
      rec.updated_by_user_id = user.$id;
      rec.updated_by_name = staffName;
      rec.updated_at = new Date().toISOString();
      saveHandoverStore(store);
    }

    try {
      await supabase
        .from('vehicle_handover_records')
        .update({
          is_cancelled: true,
          cancelled_by: user.$id,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason.trim(),
          updated_by_user_id: user.$id,
          updated_by_name: staffName,
        })
        .eq('id', handoverId);
    } catch {
      // Table fallback
    }

    await logHandoverAudit(supabase, {
      handoverId,
      vehicleId,
      eventType: 'handover_cancelled',
      description: `Handover cancelled by ${staffName}. Reason: ${reason}`,
      performedByUserId: user.$id,
      performedByName: staffName,
    });

    revalidateVehiclePaths(vehicleId);
    return { success: true };
  } catch (err: any) {
    console.error('[cancelHandover]', err);
    return { success: false, error: err?.message || 'Failed to cancel handover.' };
  }
}
