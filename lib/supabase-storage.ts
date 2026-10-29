"use server";

import { createSupabaseAdminClient } from "./supabase";

const BUCKET = "client-assets";
const LOAN_DOC_BUCKET = "loan-documents";

/**
 * Upload a file buffer to Supabase Storage using the service-role admin client.
 * Bypasses RLS — safe for server actions only.
 *
 * Storage structure:
 *   client-assets/
 *     clients/{clientId}/profile/
 *     clients/{clientId}/documents/
 *     clients/{clientId}/signatures/
 *
 * ⚠️ IMPORTANT: The bucket MUST be set to PRIVATE in Supabase Dashboard.
 * We never return a public URL — only the storage path is stored in the DB.
 * Signed URLs are generated on-demand via /api/storage/signed-url.
 */
export async function uploadClientAsset(
  path: string,
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<{ path: string } | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, fileBuffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    // Return only the path — NEVER return a public URL.
    // Callers should use generateSignedUrl() to get a time-limited link.
    return { path: data.path };
  } catch (err) {
    console.error("[StorageService] upload error:", err);
    return null;
  }
}

/**
 * Upload a loan document to the loan-documents bucket.
 * Returns the storage path (not a public URL).
 */
export async function uploadLoanDocument(
  path: string,
  file: File
): Promise<{ path: string } | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(LOAN_DOC_BUCKET)
      .upload(path, file, { upsert: true });

    if (error) throw error;
    return { path: data.path };
  } catch (err) {
    console.error("[StorageService] loan doc upload error:", err);
    return null;
  }
}

/**
 * Generate a short-lived signed URL for a private file.
 * Used server-side only — never call this from the client directly.
 *
 * @param bucket - The Supabase storage bucket name
 * @param path   - The file path within the bucket
 * @param expiresInSeconds - TTL for the URL (default: 60 seconds)
 */
export async function generateSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 60
): Promise<string | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  } catch (err) {
    console.error("[StorageService] signed URL error:", err);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage using the service-role admin client.
 */
export async function deleteClientAsset(path: string): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[StorageService] delete error:", err);
    return false;
  }
}
