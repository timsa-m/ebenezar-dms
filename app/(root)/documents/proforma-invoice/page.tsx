import React from 'react';
import { createAdminClient } from '@/src/lib/supabase/admin';
import ProformaInvoiceClient from './ProformaInvoiceClient';

export default async function ProformaInvoicePage() {
  const supabase = createAdminClient();

  const { data: agreements, error } = await supabase
    .from('financing_agreements')
    .select(`
      id,
      contract_no,
      balance,
      sale_price,
      deposit_paid,
      client:clients(id, full_name, phone, email, client_id_number, notes),
      vehicle:vehicles(id, registration_no, make_model, chassis_no, engine_no, color, year, engine_capacity)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching agreements for proforma invoice:', error);
  }

  const formattedAgreements = (agreements || []).map((ag: any) => ({
    id: ag.id,
    contractNo: ag.contract_no,
    salePrice: ag.sale_price,
    depositPaid: ag.deposit_paid,
    clientName: ag.client?.full_name || 'Unknown Client',
    clientPhone: ag.client?.phone || '',
    clientEmail: ag.client?.email || '',
    clientAddress: ag.client?.notes || '',
    clientIdNumber: ag.client?.client_id_number || '',
    nationalId: ag.client?.client_id_number || '',
    vehicleReg: ag.vehicle?.registration_no || 'Unknown Vehicle',
    vehicleMakeModel: ag.vehicle?.make_model || '',
    vehicleChassis: ag.vehicle?.chassis_no || '',
    vehicleEngine: ag.vehicle?.engine_no || '',
    vehicleColor: ag.vehicle?.color || '',
    vehicleYear: ag.vehicle?.year || '',
    vehicleEngineCapacity: ag.vehicle?.engine_capacity || '',
  }));

  return (
    <div className="flex flex-col w-full h-full bg-neutral-50/50">
      <ProformaInvoiceClient agreements={formattedAgreements} allowEdit={true} />
    </div>
  );
}
