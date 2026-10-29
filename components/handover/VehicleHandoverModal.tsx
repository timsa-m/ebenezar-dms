'use client';

import React, { useState, useEffect, useTransition } from 'react';
import CustomModal from '@/components/ui/CustomModal';
import UnsavedChangesModal from '@/components/ui/UnsavedChangesModal';
import {
  Car,
  ShieldCheck,
  ClipboardList,
  KeyRound,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Fuel,
  Gauge,
  MapPin,
  User,
  History,
  X,
  ChevronRight,
  ChevronLeft,
  Save,
  Loader2,
  AlertOctagon,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import type { Vehicle } from '@/src/types/database.types';
import type {
  VehicleHandoverData,
  HandoverType,
  AccessoryFormItem,
  ConditionInspectionFormItem,
  AccessoryName,
} from '@/src/types/handover.types';
import {
  INSPECTION_ITEMS,
  ACCESSORY_LABELS,
  INCOMING_STATUS_LABELS,
  OUTGOING_STATUS_LABELS,
} from '@/src/types/handover.types';
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
  updateHandoverDetails,
} from '@/lib/actions/handover.actions';

import AccessoryChecklist from './AccessoryChecklist';
import ConditionInspectionForm from './ConditionInspectionForm';
import FinancialClearanceCard from './FinancialClearanceCard';
import LogbookTransferTracker from './LogbookTransferTracker';
import DiscrepancyManager from './DiscrepancyManager';
import HandoverAuditTrail from './HandoverAuditTrail';

interface VehicleHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle;
  currentUser?: any;
}

const DEFAULT_ACCESSORIES: AccessoryFormItem[] = [
  {
    accessory_name: 'spare_tire',
    accessory_label: 'Spare Tyre',
    status: 'pending_verification',
    condition_notes: '',
    reason_if_missing: '',
    is_original_document: null,
    document_verified: false,
    received_from_name: '',
    ownership_discrepancy: '',
  },
  {
    accessory_name: 'jack',
    accessory_label: 'Jack',
    status: 'pending_verification',
    condition_notes: '',
    reason_if_missing: '',
    is_original_document: null,
    document_verified: false,
    received_from_name: '',
    ownership_discrepancy: '',
  },
  {
    accessory_name: 'wheel_spanner',
    accessory_label: 'Wheel Spanner',
    status: 'pending_verification',
    condition_notes: '',
    reason_if_missing: '',
    is_original_document: null,
    document_verified: false,
    received_from_name: '',
    ownership_discrepancy: '',
  },
  {
    accessory_name: 'logbook',
    accessory_label: 'Logbook / Registration Document',
    status: 'pending_verification',
    condition_notes: '',
    reason_if_missing: '',
    is_original_document: true,
    document_verified: false,
    received_from_name: '',
    ownership_discrepancy: '',
  },
];

const DEFAULT_INSPECTIONS: ConditionInspectionFormItem[] = INSPECTION_ITEMS.map(def => ({
  item_key: def.key,
  item_label: def.label,
  category: def.category,
  rating: 'not_inspected',
  notes: '',
}));

export default function VehicleHandoverModal({
  isOpen,
  onClose,
  vehicle,
  currentUser,
}: VehicleHandoverModalProps) {
  const router = useRouter();
  const isManager = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  // Master handover data loaded from server
  const [loading, setLoading] = useState(true);
  const [handoverData, setHandoverData] = useState<VehicleHandoverData | null>(null);

  // Active workflow mode
  const isSold = ['sold', 'financed', 'credit', 'cash_sale'].includes(vehicle.status);
  const [activeWorkflow, setActiveWorkflow] = useState<'incoming' | 'outgoing' | 'history'>('incoming');

  // Step tracker
  const [incomingStep, setIncomingStep] = useState(1);
  const [outgoingStep, setOutgoingStep] = useState(1);

  // Incoming Form State
  const [handedOverBy, setHandedOverBy] = useState('');
  const [odometerKm, setOdometerKm] = useState<number | ''>(vehicle.mileage || '');
  const [fuelLevel, setFuelLevel] = useState('Half');
  const [storageLocation, setStorageLocation] = useState('Main Yard');
  const [previousOwner, setPreviousOwner] = useState(vehicle.seller_name || '');
  const [acquisitionDate, setAcquisitionDate] = useState(
    vehicle.date_purchased
      ? vehicle.date_purchased.split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [incomingAccessories, setIncomingAccessories] = useState<AccessoryFormItem[]>(DEFAULT_ACCESSORIES);
  const [incomingInspections, setIncomingInspections] = useState<ConditionInspectionFormItem[]>(DEFAULT_INSPECTIONS);
  const [incomingOverallCondition, setIncomingOverallCondition] = useState('');
  const [incomingOutstandingIssues, setIncomingOutstandingIssues] = useState('');
  const [staffConfirmed, setStaffConfirmed] = useState(false);

  // Outgoing Form State
  const [outgoingAccessories, setOutgoingAccessories] = useState<AccessoryFormItem[]>(DEFAULT_ACCESSORIES);
  const [outgoingInspections, setOutgoingInspections] = useState<ConditionInspectionFormItem[]>(DEFAULT_INSPECTIONS);
  const [outgoingOverallCondition, setOutgoingOverallCondition] = useState('');
  const [outgoingOutstandingIssues, setOutgoingOutstandingIssues] = useState('');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [authorizedRecipient, setAuthorizedRecipient] = useState('');
  const [customerAcknowledged, setCustomerAcknowledged] = useState(false);
  const [acknowledgmentNotes, setAcknowledgmentNotes] = useState('');

  // Unsaved changes tracking & custom confirmation modal
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isSavingAndExiting, setIsSavingAndExiting] = useState(false);

  // Load server data when modal opens
  const refreshData = async () => {
    try {
      setLoading(true);
      const data = await getVehicleHandoverData(vehicle.id);
      setHandoverData(data);

      // Hydrate incoming state
      if (data.incoming) {
        setHandedOverBy(data.incoming.handed_over_by || '');
        setOdometerKm(data.incoming.odometer_km || vehicle.mileage || '');
        setFuelLevel(data.incoming.fuel_level || 'Half');
        setStorageLocation(data.incoming.storage_location || 'Main Yard');
        setPreviousOwner(data.incoming.previous_owner || vehicle.seller_name || '');
        if (data.incoming.acquisition_date) {
          setAcquisitionDate(data.incoming.acquisition_date.split('T')[0]);
        }
        setIncomingOverallCondition(data.incoming.overall_condition || '');
        setIncomingOutstandingIssues(data.incoming.outstanding_issues || '');
      }

      if (data.incomingAccessories.length > 0) {
        setIncomingAccessories(
          data.incomingAccessories.map(a => ({
            accessory_name: a.accessory_name,
            accessory_label: a.accessory_label,
            status: a.status,
            condition_notes: a.condition_notes || '',
            reason_if_missing: a.reason_if_missing || '',
            is_original_document: a.is_original_document,
            document_verified: a.document_verified,
            received_from_name: a.received_from_name || '',
            ownership_discrepancy: a.ownership_discrepancy || '',
          }))
        );
      }

      if (data.incomingInspections.length > 0) {
        setIncomingInspections(
          data.incomingInspections.map(i => ({
            item_key: i.item_key,
            item_label: i.item_label,
            category: i.category,
            rating: i.rating,
            notes: i.notes || '',
          }))
        );
      }

      // Hydrate outgoing state
      if (data.outgoing) {
        if (data.outgoing.collection_date) {
          setCollectionDate(data.outgoing.collection_date.split('T')[0]);
        }
        setAuthorizedRecipient(data.outgoing.authorized_recipient || '');
        setCustomerAcknowledged(data.outgoing.customer_acknowledged || false);
        setAcknowledgmentNotes(data.outgoing.acknowledgment_notes || '');
        setOutgoingOverallCondition(data.outgoing.overall_condition || '');
        setOutgoingOutstandingIssues(data.outgoing.outstanding_issues || '');
      }

      if (data.outgoingAccessories.length > 0) {
        setOutgoingAccessories(
          data.outgoingAccessories.map(a => ({
            accessory_name: a.accessory_name,
            accessory_label: a.accessory_label,
            status: a.status,
            condition_notes: a.condition_notes || '',
            reason_if_missing: a.reason_if_missing || '',
            is_original_document: a.is_original_document,
            document_verified: a.document_verified,
            received_from_name: a.received_from_name || '',
            ownership_discrepancy: a.ownership_discrepancy || '',
          }))
        );
      } else if (data.incomingAccessories.length > 0) {
        // Pre-populate outgoing checklist with incoming baseline values
        setOutgoingAccessories(
          data.incomingAccessories.map(a => ({
            accessory_name: a.accessory_name,
            accessory_label: a.accessory_label,
            status: a.status,
            condition_notes: a.condition_notes || '',
            reason_if_missing: '',
            is_original_document: a.is_original_document,
            document_verified: a.document_verified,
            received_from_name: a.received_from_name || '',
            ownership_discrepancy: a.ownership_discrepancy || '',
          }))
        );
      }

      if (data.outgoingInspections.length > 0) {
        setOutgoingInspections(
          data.outgoingInspections.map(i => ({
            item_key: i.item_key,
            item_label: i.item_label,
            category: i.category,
            rating: i.rating,
            notes: i.notes || '',
          }))
        );
      } else if (data.incomingInspections.length > 0) {
        // Pre-populate with incoming baseline
        setOutgoingInspections(
          data.incomingInspections.map(i => ({
            item_key: i.item_key,
            item_label: i.item_label,
            category: i.category,
            rating: i.rating,
            notes: i.notes || '',
          }))
        );
      }

      // Default active workflow recommendation:
      if (isSold && data.incoming && data.incoming.incoming_status !== 'draft') {
        setActiveWorkflow('outgoing');
      } else {
        setActiveWorkflow('incoming');
      }
    } catch (err: any) {
      console.error('Failed to load handover data:', err);
      toast.error('Failed to load vehicle handover records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      setIsDirty(false);
    }
  }, [isOpen, vehicle.id]);

  // Catch native window reload/close events when form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const requestClose = () => {
    if (isDirty) {
      setPendingAction(() => () => {
        setIsDirty(false);
        onClose();
      });
      setShowUnsavedModal(true);
      return;
    }
    onClose();
  };

  const requestWorkflowSwitch = (newWorkflow: 'incoming' | 'outgoing' | 'history') => {
    if (newWorkflow === activeWorkflow) return;
    if (isDirty) {
      setPendingAction(() => () => {
        setIsDirty(false);
        setActiveWorkflow(newWorkflow);
      });
      setShowUnsavedModal(true);
      return;
    }
    setActiveWorkflow(newWorkflow);
  };

  const handleConfirmLeave = () => {
    setShowUnsavedModal(false);
    setIsDirty(false);
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      action();
    }
  };

  const handleSaveAndExit = async () => {
    setIsSavingAndExiting(true);
    try {
      if (activeWorkflow === 'incoming') {
        await handleSaveIncomingDraft();
      } else if (activeWorkflow === 'outgoing') {
        await handleSaveOutgoingDraft();
      }
      setShowUnsavedModal(false);
      setIsDirty(false);
      if (pendingAction) {
        const action = pendingAction;
        setPendingAction(null);
        action();
      }
    } catch (err: any) {
      console.error('Failed to save before exiting:', err);
      toast.error(err?.message || 'Failed to save changes before exiting.');
    } finally {
      setIsSavingAndExiting(false);
    }
  };

  // ── INCOMING HANDOVER ACTIONS ──────────────────────────────────────────────

  const handleSaveIncomingDraft = async () => {
    setIsSubmitting(true);
    try {
      let handoverId = handoverData?.incoming?.id;

      if (!handoverId) {
        const createRes = await createIncomingHandover({
          vehicleId: vehicle.id,
          handedOverBy,
          odometer: typeof odometerKm === 'number' ? odometerKm : undefined,
          fuelLevel,
          storageLocation,
          previousOwner,
          acquisitionDate: acquisitionDate ? new Date(acquisitionDate).toISOString() : undefined,
        });

        if (!createRes.success) {
          toast.error(createRes.error || 'Failed to create incoming handover record.');
          return;
        }
        handoverId = createRes.handoverId!;
      } else {
        await updateHandoverDetails(handoverId, vehicle.id, {
          handedOverBy,
          odometer: typeof odometerKm === 'number' ? odometerKm : undefined,
          fuelLevel,
          storageLocation,
          previousOwner,
          acquisitionDate: acquisitionDate ? new Date(acquisitionDate).toISOString() : undefined,
        });
      }

      // Save accessories & inspections
      await saveAccessoryRecords(handoverId, vehicle.id, 'incoming', incomingAccessories);
      await saveConditionInspections(
        handoverId,
        vehicle.id,
        'incoming',
        incomingInspections,
        incomingOverallCondition,
        incomingOutstandingIssues
      );

      toast.success('Incoming handover draft saved successfully.');
      setIsDirty(false);
      await refreshData();
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save incoming draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitIncomingHandover = async () => {
    if (!staffConfirmed) {
      toast.error('Please check the confirmation declaration before submitting.');
      return;
    }

    // Validate that missing accessories have mandatory reasons
    const missingWithoutReason = incomingAccessories.find(
      a =>
        (a.status === 'missing' || a.status === 'received_but_defective') &&
        !a.reason_if_missing.trim()
    );

    if (missingWithoutReason) {
      toast.error(
        `Please provide an explanatory reason for ${missingWithoutReason.accessory_label}.`
      );
      setIncomingStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      let handoverId = handoverData?.incoming?.id;

      if (!handoverId) {
        const createRes = await createIncomingHandover({
          vehicleId: vehicle.id,
          handedOverBy,
          odometer: typeof odometerKm === 'number' ? odometerKm : undefined,
          fuelLevel,
          storageLocation,
          previousOwner,
          acquisitionDate: acquisitionDate ? new Date(acquisitionDate).toISOString() : undefined,
        });
        if (!createRes.success) {
          toast.error(createRes.error || 'Failed to initialize handover.');
          return;
        }
        handoverId = createRes.handoverId!;
      }

      await saveAccessoryRecords(handoverId, vehicle.id, 'incoming', incomingAccessories);
      await saveConditionInspections(
        handoverId,
        vehicle.id,
        'incoming',
        incomingInspections,
        incomingOverallCondition,
        incomingOutstandingIssues
      );

      const hasDiscrepancies = incomingAccessories.some(
        a => a.status === 'missing' || a.status === 'received_but_defective'
      );

      const submitRes = await submitIncomingHandover(handoverId, vehicle.id, hasDiscrepancies);

      if (submitRes.success) {
        toast.success(
          hasDiscrepancies
            ? 'Incoming handover completed with recorded discrepancies.'
            : 'Incoming vehicle handover verified and completed successfully!'
        );
        setIsDirty(false);
        await refreshData();
        router.refresh();
      } else {
        toast.error(submitRes.error || 'Failed to submit handover.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit incoming handover.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── OUTGOING HANDOVER ACTIONS ──────────────────────────────────────────────

  const handleStartOutgoingHandover = async () => {
    setIsSubmitting(true);
    try {
      const res = await createOutgoingHandover(vehicle.id);
      if (res.success) {
        toast.success('Outgoing handover record initialized.');
        await refreshData();
      } else {
        toast.error(res.error || 'Failed to start outgoing handover.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start outgoing handover.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveException = async (reason: string): Promise<boolean> => {
    if (!handoverData?.outgoing?.id) {
      // Create outgoing handover first if it doesn't exist
      const createRes = await createOutgoingHandover(vehicle.id);
      if (!createRes.success) {
        toast.error(createRes.error || 'Failed to initialize outgoing handover.');
        return false;
      }
      const res = await approveFinancialException(createRes.handoverId!, vehicle.id, reason);
      if (res.success) {
        toast.success('Manager exception approved and logged in immutable audit.');
        await refreshData();
        router.refresh();
        return true;
      }
      toast.error(res.error || 'Failed to approve exception.');
      return false;
    }

    const res = await approveFinancialException(handoverData.outgoing.id, vehicle.id, reason);
    if (res.success) {
      toast.success('Manager exception approved and logged in immutable audit.');
      await refreshData();
      router.refresh();
      return true;
    }
    toast.error(res.error || 'Failed to approve exception.');
    return false;
  };

  const handleSaveOutgoingDraft = async () => {
    if (!handoverData?.outgoing?.id) {
      const createRes = await createOutgoingHandover(vehicle.id);
      if (!createRes.success) {
        toast.error(createRes.error || 'Failed to initialize outgoing handover.');
        return;
      }
      await refreshData();
    }

    const handoverId = handoverData?.outgoing?.id;
    if (!handoverId) return;

    setIsSubmitting(true);
    try {
      await saveAccessoryRecords(handoverId, vehicle.id, 'outgoing', outgoingAccessories);
      await saveConditionInspections(
        handoverId,
        vehicle.id,
        'outgoing',
        outgoingInspections,
        outgoingOverallCondition,
        outgoingOutstandingIssues
      );
      await saveClientHandoverDetails({
        handoverId,
        vehicleId: vehicle.id,
        collectionDate: new Date(collectionDate).toISOString(),
        authorizedRecipient,
        customerAcknowledged,
        acknowledgmentNotes,
      });

      toast.success('Outgoing handover draft saved.');
      setIsDirty(false);
      await refreshData();
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save outgoing draft.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReleaseVehicle = async () => {
    const handoverId = handoverData?.outgoing?.id;
    if (!handoverId) {
      toast.error('Please save outgoing handover draft before releasing.');
      return;
    }

    if (!customerAcknowledged) {
      toast.error('Customer acknowledgment must be confirmed before releasing vehicle.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save client details first
      await saveClientHandoverDetails({
        handoverId,
        vehicleId: vehicle.id,
        collectionDate: new Date(collectionDate).toISOString(),
        authorizedRecipient,
        customerAcknowledged,
        acknowledgmentNotes,
      });

      const res = await releaseVehicle(handoverId, vehicle.id);
      if (res.success) {
        toast.success(`Vehicle ${vehicle.registration_no} successfully released to client!`);
        setIsDirty(false);
        await refreshData();
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to release vehicle.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to release vehicle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveLogbookTransfer = async (params: any): Promise<boolean> => {
    let handoverId = handoverData?.outgoing?.id;
    if (!handoverId) {
      const createRes = await createOutgoingHandover(vehicle.id);
      if (!createRes.success) {
        toast.error(createRes.error || 'Failed to create handover record.');
        return false;
      }
      handoverId = createRes.handoverId!;
    }

    try {
      const res = await saveLogbookTransfer({
        ...params,
        handoverId,
        vehicleId: vehicle.id,
      });

      if (res.success) {
        toast.success('Logbook transfer record updated.');
        await refreshData();
        router.refresh();
        return true;
      }
      toast.error(res.error || 'Failed to update transfer.');
      return false;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save logbook transfer.');
      return false;
    }
  };

  const handleConfirmOwnership = async (evidenceNotes: string): Promise<boolean> => {
    const handoverId = handoverData?.outgoing?.id;
    const transferId = handoverData?.logbookTransfer?.id;

    if (!handoverId || !transferId) {
      toast.error('Please save logbook transfer record before confirming ownership.');
      return false;
    }

    try {
      const res = await confirmOwnershipTransfer(handoverId, vehicle.id, transferId, evidenceNotes);
      if (res.success) {
        toast.success('Legal ownership transfer confirmed & recorded in audit trail!');
        await refreshData();
        router.refresh();
        return true;
      }
      toast.error(res.error || 'Failed to confirm ownership transfer.');
      return false;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to confirm ownership transfer.');
      return false;
    }
  };

  const handleResolveDiscrepancy = async (
    discrepancyId: string,
    notes: string
  ): Promise<boolean> => {
    try {
      const res = await resolveDiscrepancy(discrepancyId, vehicle.id, notes);
      if (res.success) {
        toast.success('Discrepancy resolved and appended to audit log.');
        await refreshData();
        router.refresh();
        return true;
      }
      toast.error(res.error || 'Failed to resolve discrepancy.');
      return false;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resolve discrepancy.');
      return false;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onClose={requestClose}
        width={1060}
        hideCloseButton={true}
        disableBackdropClose={true}
        className="p-0 overflow-hidden rounded-2xl border border-slate-200"
      >
        <div className="flex flex-col max-h-[92vh] bg-slate-50/50">

          {/* ================================================== */}
          {/* COMPACT VEHICLE IDENTITY HEADER                     */}
          {/* ================================================== */}
          <div className="bg-white px-6 py-4.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                  <Car className="size-6" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-950 tracking-tight">
                      {vehicle.registration_no}
                    </h2>
                    <span className="text-xs badge badge-primary font-semibold px-2.5 py-0.5 rounded-full capitalize bg-blue-50 text-blue-700 border border-blue-200">
                      {vehicle.status.replace(/_/g, ' ')}
                    </span>
                    {handoverData?.incoming?.incoming_status && (
                      <span className="text-[11px] badge badge-primary font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        In: {INCOMING_STATUS_LABELS[handoverData.incoming.incoming_status]}
                      </span>
                    )}
                    {handoverData?.outgoing?.outgoing_status && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Out: {OUTGOING_STATUS_LABELS[handoverData.outgoing.outgoing_status]}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                    <span className="font-medium text-slate-800">{vehicle.make_model}</span>
                    {vehicle.year && <span>• {vehicle.year}</span>}
                    {vehicle.chassis_no && (
                      <span className="text-[11px] text-slate-400">
                        VIN: {vehicle.chassis_no}
                      </span>
                    )}
                    {vehicle.seller_name && (
                      <span className="text-slate-600">Seller: {vehicle.seller_name}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={requestClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition self-start md:self-center cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Workflow Tabs Switcher */}
            <div className="flex items-center relative top-2 gap-2 mt-4 pt-3.5  overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => requestWorkflowSwitch('incoming')}
                className={cn(
                  'flex items-center badge badge-primary gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0',
                  activeWorkflow === 'incoming'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                )}
              >
                <ClipboardList className="size-3.5" />
                <span>Incoming Handover (Received by Dealership)</span>
              </button>

              <button
                type="button"
                onClick={() => requestWorkflowSwitch('outgoing')}
                className={cn(
                  'flex items-center badge badge-primary gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0',
                  activeWorkflow === 'outgoing'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                )}
              >
                <KeyRound className="size-3.5" />
                <span>Outgoing Handover (Released to Client)</span>
              </button>

              <button
                type="button"
                onClick={() => requestWorkflowSwitch('history')}
                className={cn(
                  'flex items-center badge badge-primary gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0',
                  activeWorkflow === 'history'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                )}
              >
                <History className="size-3.5" />
                <span>Discrepancies & Audit Trail</span>
                {handoverData?.discrepancies && handoverData.discrepancies.filter(d => d.status === 'open').length > 0 && (
                  <span className="size-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>
            </div>
          </div>
          <br />

          {/* ================================================== */}
          {/* MODAL MAIN CONTENT SCROLL AREA                     */}
          {/* ================================================== */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-[max-content]">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="size-8 animate-spin text-blue-600" />
                <p className="text-xs font-medium text-slate-500">
                  Loading vehicle handover & clearance history...
                </p>
              </div>
            ) : (
              <>
                {/* ================================================== */}
                {/* WORKFLOW A: INCOMING HANDOVER                      */}
                {/* ================================================== */}
                {activeWorkflow === 'incoming' && (
                  <div className="space-y-6 relative top-1 pb-2 mb-2">
                    {/* Step Stepper Header */}
                    <div className="flex items-center justify-between relative bottom-1 border-b border-padding-bottom-4 border-slate-200 pb-3">
                      <div className="flex items-center gap-2 text-xs">
                        {[
                          { step: 1, label: 'Acquisition Details' },
                          { step: 2, label: 'Accessories & Logbook' },
                          { step: 3, label: 'Condition Inspection' },
                          { step: 4, label: 'Review & Confirm' },
                        ].map((s, idx) => (
                          <button
                            key={s.step}
                            type="button"
                            onClick={() => setIncomingStep(s.step)}
                            className={cn(
                              'flex items-center badge badge-primary gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer',
                              incomingStep === s.step
                                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                                : 'text-slate-500 hover:text-slate-900'
                            )}
                          >
                            <span
                              className={cn(
                                'size-4.5 rounded-full badge badge-primary flex items-center justify-center text-[10px] font-bold',
                                incomingStep === s.step
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200 text-slate-600'
                              )}
                            >
                              {s.step}
                            </span>
                            <span>{s.label}</span>
                            {idx < 3 && <ChevronRight className="size-3 text-blue-600 ml-1" />}
                          </button>
                        ))}
                      </div>

                      {handoverData?.incoming && (
                        <span className="text-[11px] font-semibold text-slate-500">
                          Status: <strong className="text-blue-700">{INCOMING_STATUS_LABELS[handoverData.incoming.incoming_status || 'draft']}</strong>
                        </span>
                      )}
                    </div>

                    {/* Step 1: Acquisition Details */}
                    {incomingStep === 1 && (
                      <div className="space-y-4">
                        <div className="relative top-1 rounded-xl bg-white p-5 space-y-4 shadow-xs">
                          <h4 className="text-xs relative top-p font-bold uppercase tracking-wider text-slate-500">
                            1. Vehicle Acquisition & Receiving Custody Details
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Acquisition Date
                              </label>
                              <input
                                type="date"
                                value={acquisitionDate}
                                onChange={e => {
                                  setAcquisitionDate(e.target.value);
                                  setIsDirty(true);
                                }}
                                className="input-class h-9 text-xs w-full bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Previous Owner / Seller
                              </label>
                              <input
                                type="text"
                                value={previousOwner}
                                onChange={e => {
                                  setPreviousOwner(e.target.value);
                                  setIsDirty(true);
                                }}
                                placeholder="Seller full name..."
                                className="input-class h-9 text-xs w-full"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Delivered / Handed Over By
                              </label>
                              <input
                                type="text"
                                value={handedOverBy}
                                onChange={e => {
                                  setHandedOverBy(e.target.value);
                                  setIsDirty(true);
                                }}
                                placeholder="Name of person delivering vehicle..."
                                className="input-class h-9 text-xs w-full"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Odometer Reading (KM)
                              </label>
                              <input
                                type="number"
                                value={odometerKm}
                                onChange={e => {
                                  setOdometerKm(e.target.value ? Number(e.target.value) : '');
                                  setIsDirty(true);
                                }}
                                placeholder="e.g. 84200"
                                className="input-class h-9 text-xs w-full font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Fuel Level on Delivery
                              </label>
                              <select
                                value={fuelLevel}
                                onChange={e => {
                                  setFuelLevel(e.target.value);
                                  setIsDirty(true);
                                }}
                                className="input-class h-9 text-xs w-full bg-white"
                              >
                                <option value="Empty">Empty / Reserve</option>
                                <option value="1/4">1/4 Tank</option>
                                <option value="Half">Half Tank</option>
                                <option value="3/4">3/4 Tank</option>
                                <option value="Full">Full Tank</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Yard / Location
                              </label>
                              <input
                                type="text"
                                value={storageLocation}
                                onChange={e => {
                                  setStorageLocation(e.target.value);
                                  setIsDirty(true);
                                }}
                                placeholder="e.g. Main Yard - Bay 4"
                                className="input-class h-9 text-xs w-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Accessories Checklist */}
                    {incomingStep === 2 && (
                      <AccessoryChecklist
                        handoverType="incoming"
                        accessories={incomingAccessories}
                        onChange={accs => {
                          setIncomingAccessories(accs);
                          setIsDirty(true);
                        }}
                      />
                    )}

                    {/* Step 3: Condition Inspection */}
                    {incomingStep === 3 && (
                      <ConditionInspectionForm
                        handoverType="incoming"
                        items={incomingInspections}
                        onChange={items => {
                          setIncomingInspections(items);
                          setIsDirty(true);
                        }}
                        overallCondition={incomingOverallCondition}
                        onOverallConditionChange={val => {
                          setIncomingOverallCondition(val);
                          setIsDirty(true);
                        }}
                        outstandingIssues={incomingOutstandingIssues}
                        onOutstandingIssuesChange={val => {
                          setIncomingOutstandingIssues(val);
                          setIsDirty(true);
                        }}
                      />
                    )}

                    {/* Step 4: Review & Confirm */}
                    {incomingStep === 4 && (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Incoming Handover Summary Review
                          </h4>

                          {/* Accessories summary chips */}
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-700 block">
                              Mandatory Equipment & Document Status:
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {incomingAccessories.map(acc => (
                                <div
                                  key={acc.accessory_name}
                                  className={cn(
                                    'flex items-center justify-between p-2.5 rounded-lg border text-xs',
                                    acc.status === 'received_and_verified'
                                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                      : 'bg-red-50/70 border-red-200 text-red-900'
                                  )}
                                >
                                  <span className="font-medium">{acc.accessory_label}</span>
                                  <span className="font-bold capitalize">{acc.status.replace(/_/g, ' ')}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Condition highlights */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                              <span className="font-semibold text-slate-800 block">
                                Overall Condition Summary:
                              </span>
                              <p className="text-slate-600 mt-1 italic">
                                {incomingOverallCondition || 'No overall condition notes entered.'}
                              </p>
                            </div>

                            <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 text-xs">
                              <span className="font-semibold text-amber-900 block">
                                Disclosed Outstanding Issues:
                              </span>
                              <p className="text-amber-800 mt-1 italic">
                                {incomingOutstandingIssues || 'None documented.'}
                              </p>
                            </div>
                          </div>

                          {/* Staff Confirmation Declaration */}
                          <div className="mt-4 pt-4 border-t border-slate-200 flex items-start gap-3 bg-blue-50/40 p-3.5 rounded-xl border-blue-200">
                            <input
                              type="checkbox"
                              id="incoming-confirm"
                              checked={staffConfirmed}
                              onChange={e => setStaffConfirmed(e.target.checked)}
                              className="size-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                            />
                            <label htmlFor="incoming-confirm" className="text-xs text-slate-700 cursor-pointer">
                              <span className="font-semibold text-slate-900 block">
                                Receiving Staff Officer Physical Inspection Declaration
                              </span>
                              <span className="text-slate-500 text-[11px] block mt-0.5">
                                I confirm that I have physically inspected this motor vehicle ({vehicle.registration_no}) and that the accessories, logbook custody, odometer reading, and condition assessments recorded above are truthful, accurate, and accounted for in the dealership register.
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Incoming Workflow Step Buttons */}
                    <div className="flex items-center justify-between h-12 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        disabled={incomingStep === 1}
                        onClick={() => setIncomingStep(s => Math.max(1, s - 1))}
                        className="btn-primary h-9 px-4 text-xs flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <ChevronLeft className="size-3.5" />
                        <span>Previous Step</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleSaveIncomingDraft}
                          className="btn-primary h-9 px-4 text-xs flex items-center gap-1.5 hover:bg-slate-100"
                        >
                          {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                          <span>Save Draft</span>
                        </button>

                        {incomingStep < 4 ? (
                          <button
                            type="button"
                            onClick={() => setIncomingStep(s => Math.min(4, s + 1))}
                            className="btn-primary h-9 px-5 text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <span>Continue</span>
                            <ChevronRight className="size-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isSubmitting || !staffConfirmed}
                            onClick={handleSubmitIncomingHandover}
                            className="btn-primary h-9 px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                          >
                            {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                            <CheckCircle2 className="size-3.5" />
                            <span>Submit & Complete Handover</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ================================================== */}
                {/* WORKFLOW B: OUTGOING HANDOVER AFTER SALE           */}
                {/* ================================================== */}
                {activeWorkflow === 'outgoing' && (
                  <div className="space-y-6">
                    {/* Validation notice if vehicle is not yet sold */}
                    {!isSold && (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
                        <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold block">Vehicle Status Note:</strong>
                          This vehicle is currently marked as <span className="capitalize font-semibold">{vehicle.status.replace(/_/g, ' ')}</span>. Outgoing handover is typically performed after a vehicle has been sold or financed. You may still proceed with pre-release verification drafts.
                        </div>
                      </div>
                    )}

                    {/* Outgoing Stepper Navigation */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar">
                        {[
                          { step: 1, label: '1. Financial Clearance' },
                          { step: 2, label: '2. Pre-Release Accessories' },
                          { step: 3, label: '3. Final Inspection' },
                          { step: 4, label: '4. Client Release' },
                          { step: 5, label: '5. Logbook Transfer' },
                        ].map((s) => (
                          <button
                            key={s.step}
                            type="button"
                            onClick={() => setOutgoingStep(s.step)}
                            className={cn(
                              'flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer shrink-0',
                              outgoingStep === s.step
                                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                                : 'text-slate-500 hover:text-slate-900'
                            )}
                          >
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>

                      {handoverData?.outgoing && (
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                          Status: <strong className="text-blue-700">{OUTGOING_STATUS_LABELS[handoverData.outgoing.outgoing_status || 'draft']}</strong>
                        </span>
                      )}
                    </div>

                    {/* Step 1: Financial Clearance */}
                    {outgoingStep === 1 && (
                      <FinancialClearanceCard
                        financialSummary={handoverData?.financialSummary || null}
                        clearanceStatus={handoverData?.outgoing?.financial_clearance_status || (handoverData?.financialSummary?.isFinanciallyCleared ? 'cleared' : 'uncleared')}
                        exceptionReason={handoverData?.outgoing?.exception_reason}
                        exceptionApprovedBy={handoverData?.outgoing?.exception_approved_by_name}
                        exceptionApprovedAt={handoverData?.outgoing?.exception_approved_at}
                        isManager={isManager}
                        onApproveException={handleApproveException}
                      />
                    )}

                    {/* Step 2: Pre-Release Accessories Comparison */}
                    {outgoingStep === 2 && (
                      <div className="space-y-4">
                        {!handoverData?.incoming && (
                          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-center gap-2">
                            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                            <span>
                              No incoming handover baseline record exists for this vehicle. Equipment is being assessed without historical baseline comparison.
                            </span>
                          </div>
                        )}

                        <AccessoryChecklist
                          handoverType="outgoing"
                          accessories={outgoingAccessories}
                          onChange={accs => {
                            setOutgoingAccessories(accs);
                            setIsDirty(true);
                          }}
                          incomingBaseline={handoverData?.incomingAccessories || []}
                        />
                      </div>
                    )}

                    {/* Step 3: Final Condition Inspection */}
                    {outgoingStep === 3 && (
                      <ConditionInspectionForm
                        handoverType="outgoing"
                        items={outgoingInspections}
                        onChange={items => {
                          setOutgoingInspections(items);
                          setIsDirty(true);
                        }}
                        overallCondition={outgoingOverallCondition}
                        onOverallConditionChange={val => {
                          setOutgoingOverallCondition(val);
                          setIsDirty(true);
                        }}
                        outstandingIssues={outgoingOutstandingIssues}
                        onOutstandingIssuesChange={val => {
                          setOutgoingOutstandingIssues(val);
                          setIsDirty(true);
                        }}
                        incomingBaseline={handoverData?.incomingInspections || []}
                      />
                    )}

                    {/* Step 4: Client Handover Details & Physical Release */}
                    {outgoingStep === 4 && (
                      <div className="space-y-5">
                        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Client Collection & Handover Acknowledgment
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Receiving Customer Full Name
                              </label>
                              <input
                                type="text"
                                disabled
                                value={handoverData?.financialSummary?.clientName || 'Cash Sale Buyer'}
                                className="input-class h-9 text-xs w-full bg-slate-100"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Collection Date & Time
                              </label>
                              <input
                                type="date"
                                value={collectionDate}
                                onChange={e => {
                                  setCollectionDate(e.target.value);
                                  setIsDirty(true);
                                }}
                                className="input-class h-9 text-xs w-full bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Authorized Representative (if collected on buyer's behalf)
                              </label>
                              <input
                                type="text"
                                value={authorizedRecipient}
                                onChange={e => {
                                  setAuthorizedRecipient(e.target.value);
                                  setIsDirty(true);
                                }}
                                placeholder="Name & National ID of authorized collector..."
                                className="input-class h-9 text-xs w-full"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Disclosed Remarks & Client Notes
                            </label>
                            <textarea
                              rows={2}
                              value={acknowledgmentNotes}
                              onChange={e => {
                                setAcknowledgmentNotes(e.target.value);
                                setIsDirty(true);
                              }}
                              placeholder="Any accessories, spare keys, or condition defects verbally disclosed and accepted by the client..."
                              className="input-class text-xs w-full p-2.5"
                            />
                          </div>

                          {/* Customer Acknowledgment Checkbox */}
                          <div className="pt-3 border-t border-slate-200 flex items-start gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                            <input
                              type="checkbox"
                              id="customer-ack"
                              checked={customerAcknowledged}
                              onChange={e => setCustomerAcknowledged(e.target.checked)}
                              className="size-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                            />
                            <label htmlFor="customer-ack" className="text-xs text-slate-800 cursor-pointer">
                              <span className="font-bold text-slate-900 block">
                                Client Handover & Physical Inspection Acceptance
                              </span>
                              <span className="text-slate-600 text-[11px] block mt-0.5">
                                I confirm that the customer (or authorized recipient) has physically examined vehicle {vehicle.registration_no}, verified the presence of the spare tyre, jack, wheel spanner, and logbook status, and acknowledged receipt in the documented condition.
                              </span>
                            </label>
                          </div>

                          {/* Release Vehicle Action */}
                          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">
                                Physical Vehicle Handover Release
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Releasing the vehicle marks physical custody transfer to the client. Ownership transfer remains a separate pipeline.
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={isSubmitting || !customerAcknowledged || (!handoverData?.financialSummary?.isFinanciallyCleared && handoverData?.outgoing?.financial_clearance_status !== 'exception_approved')}
                              onClick={handleReleaseVehicle}
                              className="btn-primary h-9 px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs shrink-0"
                            >
                              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
                              <span>Release Vehicle to Client</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Logbook Transfer Tracking */}
                    {outgoingStep === 5 && (
                      <LogbookTransferTracker
                        logbookTransfer={handoverData?.logbookTransfer || null}
                        onSaveTransfer={handleSaveLogbookTransfer}
                        onConfirmOwnership={handleConfirmOwnership}
                        isManager={isManager}
                        defaultNewOwner={handoverData?.financialSummary?.clientName || ''}
                      />
                    )}

                    {/* Outgoing Workflow Stepper Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        disabled={outgoingStep === 1}
                        onClick={() => setOutgoingStep(s => Math.max(1, s - 1))}
                        className="btn-secondary h-9 px-4 text-xs flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <ChevronLeft className="size-3.5" />
                        <span>Previous Step</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleSaveOutgoingDraft}
                          className="btn-secondary h-9 px-4 text-xs flex items-center gap-1.5 hover:bg-slate-100"
                        >
                          {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                          <span>Save Draft</span>
                        </button>

                        {outgoingStep < 5 && (
                          <button
                            type="button"
                            onClick={() => setOutgoingStep(s => Math.min(5, s + 1))}
                            className="btn-primary h-9 px-5 text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <span>Next Step</span>
                            <ChevronRight className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ================================================== */}
                {/* TAB 3: DISCREPANCIES & AUDIT TRAIL                 */}
                {/* ================================================== */}
                {activeWorkflow === 'history' && (
                  <div className="space-y-6">
                    <DiscrepancyManager
                      discrepancies={handoverData?.discrepancies || []}
                      onResolveDiscrepancy={handleResolveDiscrepancy}
                      isManager={isManager}
                    />

                    <HandoverAuditTrail
                      auditLogs={handoverData?.auditLogs || []}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modal Bottom Status Bar */}
          <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Ebenezar Enterprises LTD • Vehicle Handover, Inspection & Clearance System
            </span>
            <button
              type="button"
              onClick={requestClose}
              className="btn-secondary h-8 px-4 text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </CustomModal>

      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onClose={() => {
          setShowUnsavedModal(false);
          setPendingAction(null);
        }}
        onConfirm={handleConfirmLeave}
        onSaveAndExit={
          activeWorkflow === 'incoming' || activeWorkflow === 'outgoing'
            ? handleSaveAndExit
            : undefined
        }
        title="Discard Unsaved Changes?"
        description="You have unsaved changes in this handover record. Leaving now will discard all unsaved edits to accessories, condition assessments, and details."
        itemName={vehicle.registration_no}
        confirmLabel="Discard & Leave"
        cancelLabel="Keep Editing"
        saveLabel="Save Draft & Exit"
        isSaving={isSavingAndExiting}
      />
    </>
  );
}
