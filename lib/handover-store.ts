import fs from 'fs';
import path from 'path';
import type {
  VehicleHandoverRecord,
  VehicleAccessoryRecord,
  VehicleConditionInspection,
  VehicleLogbookTransfer,
  VehicleHandoverDiscrepancy,
  VehicleHandoverAuditLog,
} from '@/src/types/handover.types';

export interface HandoverStoreSchema {
  handovers: VehicleHandoverRecord[];
  accessories: VehicleAccessoryRecord[];
  inspections: VehicleConditionInspection[];
  logbookTransfers: VehicleLogbookTransfer[];
  discrepancies: VehicleHandoverDiscrepancy[];
  auditLogs: VehicleHandoverAuditLog[];
}

const STORE_PATH = path.join(process.cwd(), 'scratch', 'handover_store.json');

export function getHandoverStore(): HandoverStoreSchema {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      const defaultStore: HandoverStoreSchema = {
        handovers: [],
        accessories: [],
        inspections: [],
        logbookTransfers: [],
        discrepancies: [],
        auditLogs: [],
      };
      const dir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify(defaultStore, null, 2), 'utf8');
      return defaultStore;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[HandoverStore] Error reading store, resetting:', err);
    return {
      handovers: [],
      accessories: [],
      inspections: [],
      logbookTransfers: [],
      discrepancies: [],
      auditLogs: [],
    };
  }
}

export function saveHandoverStore(store: HandoverStoreSchema): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[HandoverStore] Error saving store:', err);
  }
}
