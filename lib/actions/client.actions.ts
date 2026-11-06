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
import { getLoggedInUser } from "./user.actions";
import { logSecurityAudit } from "@/lib/security/audit";
import { enforceActionPermission } from "@/lib/security/rbac";
import { consumeVerificationGrant } from "@/lib/security/tokens";

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

    // 1. Full Name
    if (clientData.fullName !== undefined) {
      payload.full_name = clientData.fullName ? String(clientData.fullName).trim().toUpperCase() : "";
    } else if (clientData.firstName !== undefined || clientData.lastName !== undefined) {
      if (clientData.firstName !== undefined && clientData.lastName !== undefined) {
        payload.full_name = `${clientData.firstName || ""} ${clientData.lastName || ""}`.trim().toUpperCase();
      } else {
        const { data: currentClient } = await supabase
          .from("clients")
          .select("full_name")
          .eq("id", clientId)
          .single();
        const parts = currentClient?.full_name ? String(currentClient.full_name).trim().split(" ") : [];
        const currentFirst = parts[0] || "";
        const currentLast = parts.slice(1).join(" ") || "";
        const fName = clientData.firstName !== undefined ? clientData.firstName : currentFirst;
        const lName = clientData.lastName !== undefined ? clientData.lastName : currentLast;
        payload.full_name = `${fName || ""} ${lName || ""}`.trim().toUpperCase();
      }
    }

    // 2. National ID / Client ID number
    if (clientData.nationalId !== undefined) {
      payload.client_id_number = clientData.nationalId ? String(clientData.nationalId).trim() : null;
    } else if (clientData.clientIdNumber !== undefined) {
      payload.client_id_number = clientData.clientIdNumber ? String(clientData.clientIdNumber).trim() : null;
    } else if (clientData.client_id_number !== undefined) {
      payload.client_id_number = clientData.client_id_number ? String(clientData.client_id_number).trim() : null;
    }

    // 3. Email
    if (clientData.email !== undefined) {
      payload.email = clientData.email ? String(clientData.email).trim() : null;
    }

    // 4. Phone
    if (clientData.phone !== undefined) {
      payload.phone = clientData.phone ? String(clientData.phone).trim() : null;
    }

    // 5. Physical Address / Notes
    if (clientData.address !== undefined) {
      payload.notes = clientData.address ? String(clientData.address).trim().toUpperCase() : null;
    } else if (clientData.notes !== undefined) {
      payload.notes = clientData.notes ? String(clientData.notes).trim() : null;
    }

    // 6. Conflict flag (if specified)
    if (clientData.conflictFlag !== undefined) {
      payload.conflict_flag = Boolean(clientData.conflictFlag);
    } else if (clientData.conflict_flag !== undefined) {
      payload.conflict_flag = Boolean(clientData.conflict_flag);
    }

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", clientId)
      .select()
      .single();

    if (error) throw error;
    try {
      revalidatePath("/clients");
      revalidatePath(`/clients/${clientId}`);
      revalidatePath("/");
    } catch {
      // Ignored outside Next.js server request context
    }
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

export const deleteClientAction = async (clientId: string, verificationToken?: string) => {
  try {
    const currentUser = await getLoggedInUser();
    enforceActionPermission(currentUser, 'CLIENT_DELETE');

    if (verificationToken) {
      const consumeRes = await consumeVerificationGrant({
        token: verificationToken,
        userId: currentUser!.userId || currentUser!.$id || '',
        action: 'CLIENT_DELETE',
        resourceId: clientId,
      });
      if (!consumeRes.valid) {
        throw new Error(`Security Verification Failed: ${consumeRes.error}`);
      }
    }

    const supabase = createSupabaseAdminClient();

    // Fetch client to record metadata before deletion
    const { data: client } = await supabase
      .from('clients')
      .select('id, full_name, client_id_number, phone')
      .eq('id', clientId)
      .maybeSingle();
    
    // Attempt to delete the client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);
      
    if (error) {
      if (error.code === '23503') {
        return { success: false, error: 'Cannot delete client with existing contracts or financial history.' };
      }
      throw error;
    }

    await logSecurityAudit({
      userId: currentUser!.userId || currentUser!.$id || null,
      action: 'CLIENT_DELETE',
      resourceType: 'client',
      resourceId: clientId,
      status: 'SUCCESS',
      reason: 'Client record deleted by administrator.',
      metadata: {
        fullName: client?.full_name,
        idNumber: client?.client_id_number,
      },
    });
    
    revalidatePath('/clients');
    return { success: true };
  } catch (err: any) {
    console.error('deleteClient error:', err);
    return { success: false, error: err.message || 'Failed to delete client.' };
  }
};

