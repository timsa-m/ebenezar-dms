// ============================================================================
// Handover System Types — Ebenezar Enterprises LTD
// ============================================================================

// ── Enum-like string unions mirroring database enums ─────────────────────────

export type IncomingHandoverStatus =
  | 'draft'
  | 'inspection_in_progress'
  | 'received_with_discrepancies'
  | 'received_and_verified'
  | 'under_management_review'
  | 'closed';

export type OutgoingHandoverStatus =
  | 'draft'
  | 'awaiting_financial_clearance'
  | 'awaiting_inspection'
  | 'awaiting_approval'
  | 'ready_for_handover'
  | 'vehicle_released'
  | 'logbook_transfer_pending'
  | 'ownership_transfer_confirmed'
  | 'completed'
  | 'cancelled';

export type HandoverType = 'incoming' | 'outgoing';

export type AccessoryStatus =
  | 'received_and_verified'
  | 'missing'
  | 'received_but_defective'
  | 'pending_verification'
  | 'not_applicable';

export type ConditionRating =
  | 'good'
  | 'fair'
  | 'poor'
  | 'defective'
  | 'not_inspected';

export type LogbookTransferStatus =
  | 'not_received'
  | 'received'
  | 'verified'
  | 'transfer_initiated'
  | 'documents_submitted'
  | 'transfer_pending'
  | 'ownership_confirmed'
  | 'document_released_to_client';

export type DiscrepancyStatus = 'open' | 'under_review' | 'resolved' | 'escalated';

// ── Accessory names ───────────────────────────────────────────────────────────
export type AccessoryName = 'spare_tire' | 'jack' | 'wheel_spanner' | 'logbook';

export const ACCESSORY_LABELS: Record<AccessoryName, string> = {
  spare_tire:    'Spare Tyre',
  jack:          'Jack',
  wheel_spanner: 'Wheel Spanner',
  logbook:       'Logbook / Registration Document',
};

// ── Inspection categories and items ──────────────────────────────────────────
export type InspectionCategory = 'exterior' | 'interior' | 'mechanical' | 'other';

export interface InspectionItemDef {
  key: string;
  label: string;
  category: InspectionCategory;
}

export const INSPECTION_ITEMS: InspectionItemDef[] = [
  // Exterior
  { category: 'exterior', key: 'front_bumper',    label: 'Front Bumper' },
  { category: 'exterior', key: 'rear_bumper',     label: 'Rear Bumper' },
  { category: 'exterior', key: 'bonnet',          label: 'Bonnet / Hood' },
  { category: 'exterior', key: 'roof',            label: 'Roof' },
  { category: 'exterior', key: 'doors_panels',    label: 'Doors & Side Panels' },
  { category: 'exterior', key: 'windscreen',      label: 'Windscreen & Windows' },
  { category: 'exterior', key: 'lights',          label: 'Headlights & Taillights' },
  { category: 'exterior', key: 'side_mirrors',    label: 'Side Mirrors' },
  { category: 'exterior', key: 'paintwork',       label: 'Paintwork, Scratches & Dents' },
  // Interior
  { category: 'interior', key: 'seats',           label: 'Seats & Upholstery' },
  { category: 'interior', key: 'dashboard',       label: 'Dashboard & Instrument Cluster' },
  { category: 'interior', key: 'air_conditioning', label: 'Air Conditioning' },
  { category: 'interior', key: 'interior_electronics', label: 'Interior Electronics' },
  { category: 'interior', key: 'door_locks',      label: 'Door Locks & Window Controls' },
  { category: 'interior', key: 'seat_belts',      label: 'Seat Belts' },
  { category: 'interior', key: 'cleanliness',     label: 'General Cleanliness' },
  // Mechanical
  { category: 'mechanical', key: 'engine',        label: 'Engine Condition' },
  { category: 'mechanical', key: 'transmission',  label: 'Transmission' },
  { category: 'mechanical', key: 'brakes',        label: 'Brakes' },
  { category: 'mechanical', key: 'suspension',    label: 'Suspension' },
  { category: 'mechanical', key: 'tyres',         label: 'Tyres' },
  { category: 'mechanical', key: 'battery',       label: 'Battery' },
  { category: 'mechanical', key: 'electrical',    label: 'Electrical Systems' },
  { category: 'mechanical', key: 'warning_lights', label: 'Warning Lights' },
  // Other
  { category: 'other', key: 'existing_damage',   label: 'Existing Damage' },
  { category: 'other', key: 'missing_components', label: 'Missing Components' },
  { category: 'other', key: 'additional_remarks', label: 'Additional Remarks' },
];

// ── Database Row Types ────────────────────────────────────────────────────────

export interface VehicleHandoverRecord {
  id:                         string;
  vehicle_id:                 string;
  acquisition_ref:            string | null;
  sale_ref:                   string | null;
  client_id:                  string | null;
  handover_type:              HandoverType;
  incoming_status:            IncomingHandoverStatus | null;
  outgoing_status:            OutgoingHandoverStatus | null;
  acquisition_date:           string | null;
  previous_owner:             string | null;
  received_by_user_id:        string | null;
  received_by_name:           string | null;
  handed_over_by:             string | null;
  odometer_km:                number | null;
  fuel_level:                 string | null;
  storage_location:           string | null;
  collection_date:            string | null;
  releasing_user_id:          string | null;
  releasing_user_name:        string | null;
  authorized_recipient:       string | null;
  customer_acknowledged:      boolean;
  acknowledgment_notes:       string | null;
  financial_clearance_status: string;
  exception_approved_by:      string | null;
  exception_approved_by_name: string | null;
  exception_reason:           string | null;
  exception_approved_at:      string | null;
  overall_condition:          string | null;
  outstanding_issues:         string | null;
  workflow_step:              number;
  submitted_at:               string | null;
  completed_at:               string | null;
  is_cancelled:               boolean;
  cancelled_by:               string | null;
  cancelled_at:               string | null;
  cancellation_reason:        string | null;
  created_by_user_id:         string | null;
  created_by_name:            string | null;
  updated_by_user_id:         string | null;
  updated_by_name:            string | null;
  created_at:                 string;
  updated_at:                 string;
}

export interface VehicleAccessoryRecord {
  id:                     string;
  handover_id:            string;
  vehicle_id:             string;
  handover_type:          HandoverType;
  accessory_name:         AccessoryName;
  accessory_label:        string;
  status:                 AccessoryStatus;
  condition_notes:        string | null;
  reason_if_missing:      string | null;
  is_original_document:   boolean | null;
  document_verified:      boolean;
  received_from_name:     string | null;
  ownership_discrepancy:  string | null;
  photo_urls:             string[] | null;
  recorded_by_user_id:    string | null;
  recorded_by_name:       string | null;
  recorded_at:            string;
  updated_at:             string;
}

export interface VehicleConditionInspection {
  id:                     string;
  handover_id:            string;
  vehicle_id:             string;
  handover_type:          HandoverType;
  category:               InspectionCategory;
  item_key:               string;
  item_label:             string;
  rating:                 ConditionRating;
  notes:                  string | null;
  photo_urls:             string[] | null;
  inspected_by_user_id:   string | null;
  inspected_by_name:      string | null;
  inspected_at:           string;
  updated_at:             string;
}

export interface VehicleLogbookTransfer {
  id:                             string;
  handover_id:                    string;
  vehicle_id:                     string;
  current_registered_owner:       string | null;
  intended_new_owner:             string | null;
  document_reference:             string | null;
  status:                         LogbookTransferStatus;
  transfer_initiated_date:        string | null;
  transfer_reference_no:          string | null;
  handling_user_id:               string | null;
  handling_user_name:             string | null;
  supporting_doc_urls:            string[] | null;
  notes:                          string | null;
  delay_reason:                   string | null;
  ownership_confirmed_date:       string | null;
  confirmed_by_user_id:           string | null;
  confirmed_by_name:              string | null;
  document_released_to_client_date: string | null;
  releasing_user_id:              string | null;
  releasing_user_name:            string | null;
  created_at:                     string;
  updated_at:                     string;
}

export interface VehicleHandoverDiscrepancy {
  id:                   string;
  handover_id:          string;
  vehicle_id:           string;
  discrepancy_type:     string;
  item_reference:       string | null;
  description:          string;
  severity:             string;
  status:               DiscrepancyStatus;
  resolution_notes:     string | null;
  resolved_by_user_id:  string | null;
  resolved_by_name:     string | null;
  resolved_at:          string | null;
  supporting_doc_urls:  string[] | null;
  raised_by_user_id:    string | null;
  raised_by_name:       string | null;
  raised_at:            string;
  updated_at:           string;
}

export interface VehicleHandoverAuditLog {
  id:                     string;
  handover_id:            string;
  vehicle_id:             string;
  event_type:             string;
  event_data:             Record<string, any> | null;
  description:            string;
  performed_by_user_id:   string | null;
  performed_by_name:      string | null;
  performed_at:           string;
}

// ── Aggregated Handover Data (loaded by server action) ────────────────────────

export interface VehicleHandoverData {
  incoming: VehicleHandoverRecord | null;
  outgoing: VehicleHandoverRecord | null;
  incomingAccessories: VehicleAccessoryRecord[];
  outgoingAccessories: VehicleAccessoryRecord[];
  incomingInspections: VehicleConditionInspection[];
  outgoingInspections: VehicleConditionInspection[];
  logbookTransfer: VehicleLogbookTransfer | null;
  discrepancies: VehicleHandoverDiscrepancy[];
  auditLogs: VehicleHandoverAuditLog[];
  // Financial summary (from financing_agreements / repayments)
  financialSummary: HandoverFinancialSummary | null;
}

export interface HandoverFinancialSummary {
  agreementId:            string | null;
  contractNo:             string | null;
  saleType:               'cash_sale' | 'financed' | 'unknown';
  salePrice:              number;
  depositPaid:            number;
  totalPaid:              number;
  outstandingBalance:     number;
  outstandingPenalties:   number;
  totalOutstanding:       number;
  agreementStatus:        string;
  daysOverdue:            number;
  isFinanciallyCleared:   boolean;
  clientName:             string | null;
  clientPhone:            string | null;
  clientIdNumber:         string | null;
}

// ── UI Form State Types ───────────────────────────────────────────────────────

export interface AccessoryFormItem {
  accessory_name:       AccessoryName;
  accessory_label:      string;
  status:               AccessoryStatus;
  condition_notes:      string;
  reason_if_missing:    string;
  is_original_document: boolean | null;
  document_verified:    boolean;
  received_from_name:   string;
  ownership_discrepancy: string;
}

export interface ConditionInspectionFormItem {
  item_key:   string;
  item_label: string;
  category:   InspectionCategory;
  rating:     ConditionRating;
  notes:      string;
}

// ── Label helpers ─────────────────────────────────────────────────────────────

export const INCOMING_STATUS_LABELS: Record<IncomingHandoverStatus, string> = {
  draft:                      'Draft',
  inspection_in_progress:     'Inspection In Progress',
  received_with_discrepancies: 'Received with Discrepancies',
  received_and_verified:      'Received & Verified',
  under_management_review:    'Under Management Review',
  closed:                     'Closed',
};

export const OUTGOING_STATUS_LABELS: Record<OutgoingHandoverStatus, string> = {
  draft:                        'Draft',
  awaiting_financial_clearance: 'Awaiting Financial Clearance',
  awaiting_inspection:          'Awaiting Inspection',
  awaiting_approval:            'Awaiting Approval',
  ready_for_handover:           'Ready for Handover',
  vehicle_released:             'Vehicle Released',
  logbook_transfer_pending:     'Logbook Transfer Pending',
  ownership_transfer_confirmed: 'Ownership Transfer Confirmed',
  completed:                    'Completed',
  cancelled:                    'Cancelled',
};

export const CONDITION_RATING_LABELS: Record<ConditionRating, string> = {
  good:          'Good',
  fair:          'Fair',
  poor:          'Poor',
  defective:     'Defective',
  not_inspected: 'Not Inspected',
};

export const ACCESSORY_STATUS_LABELS: Record<AccessoryStatus, string> = {
  received_and_verified:  'Received & Verified',
  missing:                'Missing',
  received_but_defective: 'Received but Defective',
  pending_verification:   'Pending Verification',
  not_applicable:         'N/A',
};

export const LOGBOOK_STATUS_LABELS: Record<LogbookTransferStatus, string> = {
  not_received:               'Not Received',
  received:                   'Received',
  verified:                   'Verified',
  transfer_initiated:         'Transfer Initiated',
  documents_submitted:        'Documents Submitted',
  transfer_pending:           'Transfer Pending',
  ownership_confirmed:        'Ownership Confirmed',
  document_released_to_client: 'Document Released to Client',
};
