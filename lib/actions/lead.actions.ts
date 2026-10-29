"use server";

import { createAdminClient } from '@/src/lib/supabase/admin';
import { normalizeKenyanPhone, isValidKenyanPhone } from '@/src/lib/financial-engine';
import { revalidatePath } from 'next/cache';
import type { LeadInterestType } from '@/src/types/database.types';

export interface SubmitLeadParams {
  vehicleId?: string;
  fullName: string;
  phone: string;
  email?: string;
  interestType?: LeadInterestType;
  proposedDeposit?: number;
  monthlyBudget?: number;
  notes?: string;
}

export async function submitShowroomInquiry(params: SubmitLeadParams) {
  try {
    const { vehicleId, fullName, phone, email, interestType = 'hire_purchase', proposedDeposit, monthlyBudget, notes } = params;

    if (!fullName || !phone) {
      return { success: false, error: 'Full name and phone number are required.' };
    }

    const normalizedPhone = normalizeKenyanPhone(phone);
    if (!isValidKenyanPhone(phone)) {
      return { success: false, error: 'Please enter a valid Kenyan phone number (e.g. 0712345678).' };
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('crm_leads')
      .insert({
        vehicle_id: vehicleId || null,
        full_name: fullName.trim(),
        phone: normalizedPhone,
        email: email ? email.trim() : null,
        interest_type: interestType,
        proposed_deposit: proposedDeposit ? Number(proposedDeposit) : null,
        monthly_budget: monthlyBudget ? Number(monthlyBudget) : null,
        status: 'new',
        notes: notes ? notes.trim() : null,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/inventory');
    return { success: true, leadId: data.id };
  } catch (err: any) {
    console.error('[submitShowroomInquiry] Error:', err);
    return { success: false, error: err?.message || 'Failed to submit inquiry.' };
  }
}
