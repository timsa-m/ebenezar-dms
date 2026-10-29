'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getLoggedInUser } from './user.actions';
import { revalidatePath } from 'next/cache';

export async function createExpense(data: { amount: number; category: string; description?: string; expense_date: string }) {
  try {
    const user = await getLoggedInUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = createAdminClient();
    const { error } = await supabase.from('expenses').insert([{
      amount: data.amount,
      category: data.category,
      description: data.description,
      expense_date: data.expense_date,
      created_by: user.name || user.email,
    }]);

    if (error) throw error;

    revalidatePath('/expenses');
    return { success: true };
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return { success: false, error: error.message };
  }
}

export async function getExpenses() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
}