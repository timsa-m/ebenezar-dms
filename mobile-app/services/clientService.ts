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
  return {
    $id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    nationalId: row.national_id,
    email: row.email,
    phone: row.phone,
    address: row.address,
    totalBorrowed: row.total_borrowed ?? 0,
    outstandingBalance: row.outstanding_balance ?? 0,
    profilePhotoUrl: row.profile_photo_url,
    profilePhotoPath: row.profile_photo_path,
    $createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const createClient = async (clientData: any) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        first_name: clientData.firstName,
        last_name: clientData.lastName,
        national_id: clientData.nationalId,
        email: clientData.email,
        phone: clientData.phone,
        address: clientData.address,
        total_borrowed: 0,
        outstanding_balance: 0,
        profile_photo_url: clientData.profilePhotoUrl,
        profile_photo_path: clientData.profilePhotoPath,
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
    if (clientData.firstName !== undefined) payload.first_name = clientData.firstName;
    if (clientData.lastName !== undefined) payload.last_name = clientData.lastName;
    if (clientData.nationalId !== undefined) payload.national_id = clientData.nationalId;
    if (clientData.email !== undefined) payload.email = clientData.email;
    if (clientData.phone !== undefined) payload.phone = clientData.phone;
    if (clientData.address !== undefined) payload.address = clientData.address;
    if (clientData.totalBorrowed !== undefined) payload.total_borrowed = clientData.totalBorrowed;
    if (clientData.outstandingBalance !== undefined) payload.outstanding_balance = clientData.outstandingBalance;
    if (clientData.profilePhotoUrl !== undefined) payload.profile_photo_url = clientData.profilePhotoUrl;
    if (clientData.profilePhotoPath !== undefined) payload.profile_photo_path = clientData.profilePhotoPath;

    const { data, error } = await supabase
      .from('clients')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
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
