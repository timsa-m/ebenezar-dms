'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getLoggedInUser, requireAdminRole } from './user.actions';
import { revalidatePath } from 'next/cache';
import { logSecurityAudit } from '@/lib/security/audit';

export async function createExpense(data: {
  amount: number;
  category: string;
  description?: string;
  expense_date: string;
  vendor_name?: string;
}) {
  try {
    const user = await getLoggedInUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const supabase = createAdminClient();

    // If vendor_name is provided, attempt inserting with vendor_name column
    if (data.vendor_name && data.vendor_name.trim()) {
      const cleanVendor = data.vendor_name.trim().toUpperCase();
      const { error: colErr } = await supabase.from('expenses').insert([{
        amount: data.amount,
        category: data.category,
        description: data.description?.trim() || null,
        vendor_name: cleanVendor,
        expense_date: data.expense_date,
        created_by: user.name || user.email,
      }]);

      if (!colErr) {
        revalidatePath('/expenses');
        return { success: true };
      }
    }

    // Fallback: embed vendor_name into description if column doesn't exist yet
    const cleanVendor = data.vendor_name?.trim().toUpperCase();
    const finalDescription = cleanVendor
      ? (data.description?.trim()
          ? `${data.description.trim()} • Vendor: ${cleanVendor}`
          : `Vendor: ${cleanVendor}`)
      : (data.description?.trim() || null);

    const { error } = await supabase.from('expenses').insert([{
      amount: data.amount,
      category: data.category,
      description: finalDescription,
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

/**
 * Permanently deletes one or more expenses by ID.
 * Strictly restricted to users with ADMIN role (not Manager nor Staff).
 */
export async function deleteExpenses(expenseIds: string[]): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const user = await requireAdminRole();
    if (!user || user.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Only administrators can delete expenses.' };
    }

    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
      return { success: false, error: 'No expenses selected for deletion.' };
    }

    const supabase = createAdminClient();

    // Fetch before deleting to capture metrics for the security audit log
    const { data: toDelete } = await supabase
      .from('expenses')
      .select('id, amount, category, description, vendor_name')
      .in('id', expenseIds);

    const totalAmount = (toDelete || []).reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

    const { error: delErr, count } = await supabase
      .from('expenses')
      .delete({ count: 'exact' })
      .in('id', expenseIds);

    if (delErr) {
      console.error('[deleteExpenses] Supabase delete error:', delErr);
      throw new Error(delErr.message || 'Failed to delete expenses from database.');
    }

    // Log enterprise security audit event
    const adminIdentifier = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    try {
      await logSecurityAudit({
        userId: user.userId || user.$id || user.id || null,
        action: 'EXPENSE_DELETE',
        resourceType: 'expenses',
        resourceId: expenseIds.length === 1 ? expenseIds[0] : `bulk:${expenseIds.length}`,
        status: 'SUCCESS',
        metadata: {
          deletedCount: expenseIds.length,
          totalAmount,
          expenseIds,
          deletedBy: adminIdentifier,
        },
      });
    } catch (auditErr) {
      console.warn('[deleteExpenses] Audit log warning (non-fatal):', auditErr);
    }

    revalidatePath('/expenses');
    return { success: true, count: count ?? expenseIds.length };
  } catch (error: any) {
    console.error('Error deleting expenses:', error);
    return { success: false, error: error.message || 'Failed to delete expenses.' };
  }
}

/**
 * Helper to delete a single expense by ID.
 * Strictly restricted to ADMIN role.
 */
export async function deleteExpense(id: string) {
  return deleteExpenses([id]);
}