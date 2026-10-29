"use server";

import { createAdminClient } from '@/src/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// Messages
export async function getWebsiteMessages() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('website_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getWebsiteMessages] Error:', error);
    return [];
  }
  return data || [];
}

export async function updateMessageStatus(id: string, status: 'new' | 'read') {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('website_messages')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('[updateMessageStatus] Error:', error);
    return { success: false, error: error.message };
  }
  revalidatePath('/website-leads');
  return { success: true };
}

// Hire Requests
export async function getHireRequests() {
  const supabase = createAdminClient();
  const { data, error } = await (supabase as any)
    .from('hire_requests')
    .select(`
      *,
      vehicles (
        registration_no,
        make_model
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getHireRequests] Error:', error);
    return [];
  }
  return data || [];
}

export async function updateHireRequestStatus(id: string, status: 'new' | 'contacted' | 'completed' | 'cancelled') {
  const supabase = createAdminClient();
  const { error } = await (supabase as any)
    .from('hire_requests')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('[updateHireRequestStatus] Error:', error);
    return { success: false, error: error.message };
  }
  revalidatePath('/website-leads');
  return { success: true };
}

// Trade-in Requests
export async function getTradeInRequests() {
  const supabase = createAdminClient();
  const { data, error } = await (supabase as any)
    .from('trade_in_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getTradeInRequests] Error:', error);
    return [];
  }
  return data || [];
}

export async function updateTradeInRequestStatus(id: string, status: 'new' | 'contacted' | 'completed' | 'cancelled') {
  const supabase = createAdminClient();
  const { error } = await (supabase as any)
    .from('trade_in_requests')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('[updateTradeInRequestStatus] Error:', error);
    return { success: false, error: error.message };
  }
  revalidatePath('/website-leads');
  return { success: true };
}
