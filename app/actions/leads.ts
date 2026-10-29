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
  nationalId?: string;
  interestType?: LeadInterestType;
  proposedDeposit?: number;
  monthlyBudget?: number;
  notes?: string;
}

/**
 * Server Action: Public Finance Inquiry Handler
 * Inserts customer lead into crm_leads with phone normalization and validation.
 */
export async function submitFinanceInquiry(params: SubmitLeadParams) {
  try {
    const {
      vehicleId,
      fullName,
      phone,
      email,
      nationalId,
      interestType = 'hire_purchase',
      proposedDeposit,
      monthlyBudget,
      notes,
    } = params;

    if (!fullName || !fullName.trim()) {
      return { success: false, error: 'Full name is required.' };
    }

    if (!phone || !phone.trim()) {
      return { success: false, error: 'Kenyan phone number is required.' };
    }

    if (!isValidKenyanPhone(phone)) {
      return {
        success: false,
        error: 'Please enter a valid Kenyan phone number (e.g. 0712345678 or +254712345678).',
      };
    }

    const normalizedPhone = normalizeKenyanPhone(phone);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('crm_leads')
      .insert({
        vehicle_id: vehicleId || null,
        full_name: fullName.trim(),
        phone: normalizedPhone,
        email: email ? email.trim() : null,
        national_id: nationalId ? nationalId.trim() : null,
        interest_type: interestType,
        proposed_deposit: proposedDeposit ? Number(proposedDeposit) : null,
        monthly_budget: monthlyBudget ? Number(monthlyBudget) : null,
        status: 'new',
        notes: notes ? notes.trim() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('[submitFinanceInquiry] Supabase error:', error);
      throw error;
    }

    revalidatePath('/inventory');
    if (vehicleId) {
      revalidatePath(`/inventory/${vehicleId}`);
    }

    return { success: true, leadId: data.id };
  } catch (err: any) {
    console.error('[submitFinanceInquiry] Exception:', err);
    return {
      success: false,
      error: err?.message || 'Failed to submit inquiry. Please contact Ebenezar support.',
    };
  }
}
