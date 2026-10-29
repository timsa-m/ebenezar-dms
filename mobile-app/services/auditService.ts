import { supabase } from './supabase';

export const logAuditEvent = async ({
  loanId,
  clientId,
  entityType,
  action,
  description,
  previousValue,
  newValue,
}: {
  loanId?: string;
  clientId?: string;
  entityType: string;
  action: string;
  description: string;
  previousValue?: string;
  newValue?: string;
}) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Not authenticated');

    const { data, error } = await supabase.from('audit_logs').insert({
      loan_id: loanId,
      client_id: clientId,
      entity_type: entityType,
      action,
      user_id: user.id,
      performed_by: user.email || 'System',
      description,
      previous_value: previousValue,
      new_value: newValue,
    }).select().single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[auditService] Error logging audit event:', error);
    return null;
  }
};

export const getAuditLogs = async (limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[auditService] Error fetching audit logs:', error);
    return [];
  }
};
