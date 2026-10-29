"use server";

import { createSupabaseAdminClient } from "@/lib/supabase";
import { uploadClientAsset } from "@/lib/supabase-storage";
import { TERMS_VERSION } from "@/constants/terms";

export interface LoanAgreement {
  id: string;
  loan_id: string;
  client_id: string;
  terms_version: string;
  signature_url: string;
  signature_path: string;
  signed_by_name: string;
  signed_at: string;
  created_at: string;
}

/**
 * Fetch the signed agreement for a given loan (if it exists).
 */
export async function getLoanAgreement(loanId: string): Promise<LoanAgreement | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("loan_agreements")
      .select("*")
      .eq("loan_id", loanId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  } catch (err) {
    console.error("[getLoanAgreement] Error:", err);
    return null;
  }
}

interface SaveAgreementParams {
  loanId: string;
  clientId: string;
  clientName: string;
  /** Base64 PNG data URL from the canvas, e.g. "data:image/png;base64,..." */
  signatureBase64: string;
}

/**
 * Upload the signature image and save the agreement record.
 * Returns the created agreement or null on failure.
 */
export async function saveSignedAgreement(
  params: SaveAgreementParams
): Promise<LoanAgreement | null> {
  try {
    const { loanId, clientId, clientName, signatureBase64 } = params;

    // 1. Decode base64 → ArrayBuffer
    const base64Data = signatureBase64.replace(/^data:image\/png;base64,/, "");
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // 2. Build a unique storage path
    const timestamp = Date.now();
    const path = `clients/${clientId}/signatures/agreement-${loanId}-${timestamp}.png`;

    // 3. Upload to Supabase Storage
    const uploaded = await uploadClientAsset(path, bytes.buffer, "image/png");
    if (!uploaded) throw new Error("Signature upload failed");

    // 4. Insert agreement record
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("loan_agreements")
      .insert({
        loan_id: loanId,
        client_id: clientId,
        terms_version: TERMS_VERSION,
        signature_url: uploaded.path,   // Stores the storage PATH — signed URLs are generated on-demand
        signature_path: uploaded.path,
        signed_by_name: clientName,
        signed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("[saveSignedAgreement] Error:", err);
    return null;
  }
}
