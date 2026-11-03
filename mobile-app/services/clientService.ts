import { supabase } from './supabase';

/**
 * Upload a client asset using React Native's FormData approach.
 * @param path - The storage path (e.g., clients/{clientId}/profile/{filename})
 * @param uri - The local file URI from expo-image-picker or expo-document-picker
 * @param mimeType - The mime type of the file
 */
export const uploadClientAsset = async (
  path: string,
  uri: string,
  mimeType: string
): Promise<{ path: string } | null> => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: path.split('/').pop() || 'upload',
      type: mimeType,
    } as any);

    const { data, error } = await supabase.storage
      .from('client-assets')
      .upload(path, formData, {
        upsert: true,
      });

    if (error) throw error;
    return { path: data.path };
  } catch (err) {
    console.error('[clientService] Error uploading asset:', err);
    return null;
  }
};

/**
 * Delete a client asset from Supabase Storage.
 */
export const deleteClientAsset = async (path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage.from('client-assets').remove([path]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[clientService] Error deleting asset:', err);
    return false;
  }
};

function mapClientRow(row: any) {
  const parts = row.full_name ? String(row.full_name).trim().split(' ') : [];
  const fName = parts.length > 0 ? parts[0] : (row.first_name || 'Unknown');
  const lName = parts.length > 1 ? parts.slice(1).join(' ') : (row.last_name || '');

  return {
    $id: row.id,
    firstName: fName,
    lastName: lName,
    nationalId: row.client_id_number ?? row.national_id,
    email: row.email,
    phone: row.phone,
    address: row.notes ?? row.address ?? '',
    totalBorrowed: row.total_borrowed ?? 0,
    outstandingBalance: row.outstanding_balance ?? 0,
    profilePhotoUrl: row.profile_photo_url ?? null,
    profilePhotoPath: row.profile_photo_path ?? null,
    $createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const createClient = async (clientData: any) => {
  try {
    const fullName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim().toUpperCase();
    const { data, error } = await supabase
      .from('clients')
      .insert({
        full_name: fullName,
        client_id_number: clientData.nationalId ? String(clientData.nationalId).trim() : null,
        email: clientData.email ? String(clientData.email).trim() : null,
        phone: clientData.phone ? String(clientData.phone).trim() : null,
        notes: clientData.address ? String(clientData.address).trim().toUpperCase() : null,
      })
      .select()
      .single();

    if (error) throw error;
    return mapClientRow(data);
  } catch (error) {
    console.error('[clientService] Error creating client:', error);
    return null;
  }
};

export const getClients = async () => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: overdueLoans } = await supabase
      .from('loans')
      .select('client_id')
      .eq('status', 'Overdue');

    const overdueClientIds = new Set(overdueLoans?.map((l) => l.client_id) || []);

    return data.map((row) => ({
      ...mapClientRow(row),
      hasOverdueLoans: overdueClientIds.has(row.id),
    }));
  } catch (error) {
    console.error('[clientService] Error fetching clients:', error);
    return null;
  }
};

export const getClientById = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) throw error;
    return mapClientRow(data);
  } catch (error) {
    console.error('[clientService] Error fetching client by ID:', error);
    return null;
  }
};

export const getClientFullProfile = async (clientId: string) => {
  try {
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) throw clientError;

    const [loansRes, repaymentsRes, penaltiesRes, auditRes, notificationsRes, documentsRes] = await Promise.all([
      supabase.from('loans').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('loan_transactions').select('*').eq('client_id', clientId).eq('type', 'Repayment').order('date', { ascending: false }),
      supabase.from('loan_transactions').select('*').eq('client_id', clientId).in('type', ['Manual Penalty', 'Automatic Penalty']).order('date', { ascending: false }),
      supabase.from('audit_logs').select('*').eq('client_id', clientId).order('timestamp', { ascending: false }).limit(20),
      supabase.from('notifications').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from('client_documents').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    ]);

    return {
      client: mapClientRow(client),
      loans: loansRes.data || [],
      repayments: repaymentsRes.data || [],
      penalties: (penaltiesRes.data || []).map((p: any) => ({
        ...p,
        date_applied: p.date,
        penalty_type: p.payment_method,
      })),
      auditLogs: auditRes.data || [],
      notifications: notificationsRes.data || [],
      documents: documentsRes.data || [],
    };
  } catch (error) {
    console.error('[clientService] Error fetching full client profile:', error);
    return null;
  }
};

export const updateClient = async (clientId: string, clientData: any) => {
  try {
    const payload: Record<string, any> = {};

    if (clientData.fullName !== undefined) {
      payload.full_name = clientData.fullName ? String(clientData.fullName).trim().toUpperCase() : '';
    } else if (clientData.firstName !== undefined || clientData.lastName !== undefined) {
      if (clientData.firstName !== undefined && clientData.lastName !== undefined) {
        payload.full_name = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim().toUpperCase();
      } else {
        const { data: currentClient } = await supabase
          .from('clients')
          .select('full_name')
          .eq('id', clientId)
          .single();
        const parts = currentClient?.full_name ? String(currentClient.full_name).trim().split(' ') : [];
        const currentFirst = parts[0] || '';
        const currentLast = parts.slice(1).join(' ') || '';
        const fName = clientData.firstName !== undefined ? clientData.firstName : currentFirst;
        const lName = clientData.lastName !== undefined ? clientData.lastName : currentLast;
        payload.full_name = `${fName || ''} ${lName || ''}`.trim().toUpperCase();
      }
    }

    if (clientData.nationalId !== undefined) {
      payload.client_id_number = clientData.nationalId ? String(clientData.nationalId).trim() : null;
    } else if (clientData.clientIdNumber !== undefined) {
      payload.client_id_number = clientData.clientIdNumber ? String(clientData.clientIdNumber).trim() : null;
    }

    if (clientData.email !== undefined) {
      payload.email = clientData.email ? String(clientData.email).trim() : null;
    }

    if (clientData.phone !== undefined) {
      payload.phone = clientData.phone ? String(clientData.phone).trim() : null;
    }

    if (clientData.address !== undefined) {
      payload.notes = clientData.address ? String(clientData.address).trim().toUpperCase() : null;
    } else if (clientData.notes !== undefined) {
      payload.notes = clientData.notes ? String(clientData.notes).trim() : null;
    }

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', clientId)
      .select()
      .single();

    if (error) throw error;
    return mapClientRow(data);
  } catch (error) {
    console.error('[clientService] Error updating client:', error);
    return null;
  }
};
