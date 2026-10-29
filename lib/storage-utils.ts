/**
 * Pure utility helpers for Supabase Storage paths and URLs.
 * No "use server" — safe to import from both server and client code.
 */

/**
 * Generate a unique, collision-safe storage path for a client asset.
 * Storage structure:
 *   client-assets/
 *     clients/{clientId}/profile/
 *     clients/{clientId}/documents/
 *     clients/{clientId}/signatures/
 */
export function generateClientAssetPath(
  clientId: string,
  type: "profile" | "documents" | "signatures",
  fileName: string
): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  return `clients/${clientId}/${type}/${type}-${timestamp}.${ext}`;
}

/**
 * Build the public URL for a stored asset without hitting the network.
 */
export function getClientAssetPublicUrl(path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${url}/storage/v1/object/public/client-assets/${path}`;
}

/**
 * Generate a unique, collision-safe storage path for a vehicle asset.
 */
export function generateVehicleAssetPath(
  vehicleId: string,
  fileName: string
): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  return `vehicles/${vehicleId}/photo-${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
}

/**
 * Generate a path for a vehicle document, categorizing by type.
 */
export function generateVehicleDocumentPath(
  vehicleId: string,
  documentType: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `vehicles/${vehicleId}/documents/${documentType}_${timestamp}_${safeName}`;
}

/**
 * Build the public URL for a stored vehicle asset without hitting the network.
 */
export function getVehicleAssetPublicUrl(path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${url}/storage/v1/object/public/vehicle-assets/${path}`;
}
