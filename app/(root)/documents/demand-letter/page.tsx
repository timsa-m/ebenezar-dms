import React from 'react';
import { createAdminClient } from '@/src/lib/supabase/admin';
import DemandLetterClient from './DemandLetterClient';

export default async function DemandLetterPage() {
  const supabase = createAdminClient();

  // Fetch all financing agreements to populate the dropdown
  // We only need basic details like ID, contract no, client name, and vehicle registration.
  const { data: agreements, error } = await supabase
    .from('financing_agreements')
    .select(`
      id,
      contract_no,
      balance,
      client:clients(id, full_name),
      vehicle:vehicles(id, registration_no, make_model)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching agreements for demand letter:', error);
  }

  // Format the data for the dropdown
  const formattedAgreements = (agreements || []).map((ag: any) => ({
    id: ag.id,
    contractNo: ag.contract_no,
    balance: ag.balance,
    clientName: ag.client?.full_name || 'Unknown Client',
    vehicleReg: ag.vehicle?.registration_no || 'Unknown Vehicle',
    vehicleMakeModel: ag.vehicle?.make_model || ''
  }));

  return (
    <div className="flex flex-col w-full h-full bg-neutral-50/50">
      <DemandLetterClient agreements={formattedAgreements} />
    </div>
  );
}
