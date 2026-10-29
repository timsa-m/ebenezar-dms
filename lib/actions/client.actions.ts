"use server";

import { createSupabaseAdminClient } from "../supabase";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import {
  uploadClientAsset,
  deleteClientAsset,
} from "../supabase-storage";
import { generateClientAssetPath } from "../storage-utils";
import { autoFlagOverdueLoans } from "./loan.actions";

/**
 * Upload a client profile photo from a base64 data URL.
 * Called from Client Components — receives serialisable data, runs on the server with admin privileges.
 */
export const uploadClientPhoto = async (
  clientId: string,
  formData: FormData,
  oldPath?: string
): Promise<{ path: string } | null> => {
  try {
    // 1. Delete old photo if exists (no orphaned files)
    if (oldPath) {
      await deleteClientAsset(oldPath);
    }

    // 2. Get file from FormData
    const file = formData.get("file") as File;
    if (!file) return null;

    const arrayBuffer = await file.arrayBuffer();

    // 3. Upload via admin client (bypasses RLS) — returns path only, never a public URL
    const path = generateClientAssetPath(clientId, "profile", file.name);
    const result = await uploadClientAsset(path, arrayBuffer, file.type);
    return result;
  } catch (err) {
    console.error("[uploadClientPhoto] error:", err);
    return null;
  }
};


function mapClientRow(row: any): LMSClient {
  const parts = row.full_name ? String(row.full_name).trim().split(' ') : [];
  const fName = parts.length > 0 ? parts[0] : 'Unknown';
  const lName = parts.length > 1 ? parts.slice(1).join(' ') : '';
  
  return {
    $id: row.id,
    firstName: fName.toUpperCase(),
    lastName: lName.toUpperCase(),
    nationalId: row.client_id_number,
    email: row.email,
    phone: row.phone,
    address: row.notes ? String(row.notes).toUpperCase() : '',
    totalBorrowed: 0,
    outstandingBalance: 0,
    profilePhotoUrl: null,
    profilePhotoPath: null,
    $createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as any;
}

export const createClient = async (clientData: any) => {
  try {
    const supabase = createSupabaseAdminClient();
    const fullName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim().toUpperCase();
    const { data, error } = await supabase
      .from("clients")
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
    revalidatePath("/clients");
    revalidatePath("/");
    return parseStringify(mapClientRow(data));
  } catch (error) {
    console.error("Error creating client", error);
    return null;
  }
};

export const getClients = async () => {
  try {
    const supabase = createSupabaseAdminClient();

    // Fetch clients + loans in parallel
    const [clientsResult, loansResult] = await Promise.all([
      supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("financing_agreements")
        .select("id, client_id, principal_amount, balance, status"),
    ]);

    if (clientsResult.error) throw clientsResult.error;
    if (loansResult.error) throw loansResult.error;

    const rawClients = clientsResult.data || [];
    const allLoans = loansResult.data || [];

    // Group non-denied loans by client_id
    const loansByClient = new Map<string, any[]>();
    for (const loan of allLoans) {
      if (loan.status === "Denied") continue;
      if (!loansByClient.has(loan.client_id)) {
        loansByClient.set(loan.client_id, []);
      }
      loansByClient.get(loan.client_id)!.push(loan);
    }

    return parseStringify(
      rawClients.map((row) => {
        const clientLoans = loansByClient.get(row.id) || [];
        const hasLoans = clientLoans.length > 0;

        // True financial aggregates from actual loans
        const liveTotalBorrowed = hasLoans
          ? clientLoans.reduce((sum, l) => sum + (Number(l.principal_amount) || 0), 0)
          : (Number(row.total_borrowed) || 0);

        const liveOutstandingBalance = hasLoans
          ? clientLoans.reduce((sum, l) => sum + (Number(l.balance) || 0), 0)
          : (Number(row.outstanding_balance) || 0);

        const hasOverdueLoans = clientLoans.some((l) =>
          ["Overdue", "Substandard", "Loss"].includes(l.status)
        );

        const base = mapClientRow(row);

        return {
          ...base,
          totalBorrowed: liveTotalBorrowed,
          outstandingBalance: liveOutstandingBalance,
          hasOverdueLoans,
          totalAgreements: clientLoans.length,
          totalLoans: clientLoans.length,
          hasAgreements: hasLoans,
          hasLoans,
        };
      })
    );
  } catch (error) {
    console.error("Error fetching clients", error);
    return null;
  }
};

export const getClientById = async (clientId: string) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (error) throw error;
    return parseStringify(mapClientRow(data));
  } catch (error) {
    console.error("Error fetching client by ID", error);
    return null;
  }
};

export const getClientFullProfile = async (clientId: string) => {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientError) throw clientError;

    // Fetch related data in parallel
    const [loansRes, repaymentsRes, penaltiesRes, auditRes, notificationsRes, documentsRes] = await Promise.all([
      supabase.from("financing_agreements").select("*, vehicles(make_model, registration_no)").eq("client_id", clientId).order("start_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
      supabase.from("repayments").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("penalties").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("audit_logs").select("*").eq("client_id", clientId).order("timestamp", { ascending: false }).limit(20),
      supabase.from("notifications").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("client_documents").select("*").eq("client_id", clientId).order("created_at", { ascending: false })
    ]);

    const loansData = loansRes.data || [];
    return parseStringify({
      client: {
        ...mapClientRow(client),
        totalAgreements: loansData.length,
        totalLoans: loansData.length,
        hasAgreements: loansData.length > 0,
        hasLoans: loansData.length > 0,
      },
      loans: (loansRes.data || []).map((a: any) => ({
        ...a,
        loan_type: "Vehicle Sale",
        vehicle_name: a.vehicles ? `${a.vehicles.make_model} (${a.vehicles.registration_no})` : "—",
        vehicle_price: a.sale_price,
        end_date: a.end_date,
        status: a.status === 'active' ? 'Active' : (a.status === 'completed' ? 'Completed' : (a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : 'Pending'))
      })),
      repayments: (repaymentsRes.data || []).map((r: any) => ({
        ...r,
        date: r.created_at,
        loan_id: r.agreement_id,
        amount: r.amount_paid,
        payment_method: r.payment_method || 'M-PESA',
        reference_id: r.reference_no
      })),
      penalties: (penaltiesRes.data || []).map((p: any) => ({
        ...p,
        date_applied: p.created_at,
        penalty_type: 'Manual Penalty'
      })),
      auditLogs: auditRes.data || [],
      notifications: notificationsRes.data || [],
      documents: documentsRes.data || [],
    });
  } catch (error) {
    console.error("Error fetching full client profile", error);
    return null;
  }
};

export const updateClient = async (clientId: string, clientData: any) => {
  try {
    const supabase = createSupabaseAdminClient();
    const payload: Record<string, any> = {};
    if (clientData.firstName !== undefined) payload.first_name = clientData.firstName ? String(clientData.firstName).trim().toUpperCase() : "";
    if (clientData.lastName !== undefined) payload.last_name = clientData.lastName ? String(clientData.lastName).trim().toUpperCase() : "";
    if (clientData.nationalId !== undefined) payload.national_id = clientData.nationalId ? String(clientData.nationalId).trim() : null;
    if (clientData.email !== undefined) payload.email = clientData.email ? String(clientData.email).trim() : null;
    if (clientData.phone !== undefined) payload.phone = clientData.phone ? String(clientData.phone).trim() : null;
    if (clientData.address !== undefined) payload.address = clientData.address ? String(clientData.address).trim().toUpperCase() : null;
    if (clientData.totalBorrowed !== undefined) payload.total_borrowed = clientData.totalBorrowed;
    if (clientData.outstandingBalance !== undefined) payload.outstanding_balance = clientData.outstandingBalance;
    if (clientData.profilePhotoUrl !== undefined) payload.profile_photo_url = clientData.profilePhotoUrl;
    if (clientData.profilePhotoPath !== undefined) payload.profile_photo_path = clientData.profilePhotoPath;

    const { data, error } = await supabase
      .from("clients")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/");
    return parseStringify(mapClientRow(data));
  } catch (error) {
    console.error("Error updating client", error);
    return null;
  }
};

export const uploadClientDocument = async (clientId: string, formData: FormData) => {
  try {
    const file = formData.get("file") as File;
    const documentType = formData.get("documentType") as string;
    const documentName = formData.get("documentName") as string;
    const uploadedBy = formData.get("uploadedBy") as string;

    if (!file || !documentType || !documentName) return null;

    // 1. Convert to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // 2. Upload to Storage
    const path = generateClientAssetPath(clientId, "documents", file.name);
    const uploadResult = await uploadClientAsset(path, arrayBuffer, file.type);
    
    if (!uploadResult) throw new Error("Failed to upload document to storage");

    // 3. Insert into Database — store path only, never a public URL
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("client_documents")
      .insert({
        client_id: clientId,
        document_type: documentType,
        document_name: documentName,
        file_path: uploadResult.path,
        file_url: null,   // Removed: no public URLs stored — use /api/storage/signed-url
        uploaded_by: uploadedBy || "System",
      })
      .select()
      .single();

    if (error) {
      // Rollback storage upload if DB insert fails
      await deleteClientAsset(uploadResult.path);
      throw error;
    }

    revalidatePath(`/clients/${clientId}`);
    return parseStringify(data);
  } catch (error) {
    console.error("Error uploading client document:", error);
    return null;
  }
};

export const deleteClientAction = async (clientId: string) => {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Attempt to delete the client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);
      
    if (error) {
      if (error.code === '23503') {
        return { success: false, error: 'Cannot delete client with existing contracts or history.' };
      }
      throw error;
    }
    
    revalidatePath('/clients');
    return { success: true };
  } catch (err: any) {
    console.error('deleteClient error:', err);
    return { success: false, error: err.message || 'Failed to delete client.' };
  }
};

