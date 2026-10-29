'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getLoggedInUser } from './user.actions'
import { revalidatePath } from 'next/cache'

export async function getCompanySettings() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single()

    // PGRST116 is "Results contain 0 rows"
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching company settings:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getCompanySettings:', error)
    return null
  }
}

export async function updateCompanySettings(formData: any) {
  try {
    const user = await getLoggedInUser()
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = createAdminClient()

    // We fetch the existing row to get the ID, since there should only be one
    const { data: existing } = await supabase.from('company_settings').select('id').limit(1).single()

    const updatePayload = {
      company_name: formData.company_name,
      kra_pin: formData.kra_pin,
      physical_address: formData.physical_address,
      primary_phone: formData.primary_phone,
      email_address: formData.email_address,
      mpesa_paybill: formData.mpesa_paybill,
      mpesa_account: formData.mpesa_account,
      bank_name: formData.bank_name,
      bank_account: formData.bank_account,
      minimum_deposit_percentage: formData.minimum_deposit_percentage,
      late_payment_penalty_percentage: formData.late_payment_penalty_percentage,
      grace_period_days: formData.grace_period_days,
    }

    if (existing) {
      const { error } = await supabase
        .from('company_settings')
        .update(updatePayload)
        .eq('id', existing.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('company_settings')
        .insert([updatePayload])
        
      if (error) throw error
    }

    revalidatePath('/settings')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating company settings:', error)
    return { success: false, error: error.message }
  }
}
