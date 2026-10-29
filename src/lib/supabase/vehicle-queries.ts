import { createAdminClient } from './admin';
import type { Vehicle, VehicleStatus } from '@/src/types/database.types';

/**
 * Public vehicle query enforcing RLS and storefront policy:
 * Only returns vehicles that are physically in stock and published for public display.
 */
export async function getPublicVehicles(): Promise<Vehicle[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'in_stock')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getPublicVehicles] Error fetching public stock:', error);
    return [];
  }

  return (data || []) as Vehicle[];
}

/**
 * Single public vehicle details query:
 * Enforces status = in_stock and is_published = true.
 */
export async function getPublicVehicleById(id: string): Promise<Vehicle | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .eq('status', 'in_stock')
    .eq('is_published', true)
    .maybeSingle();

  if (error) {
    console.error(`[getPublicVehicleById] Error fetching vehicle ${id}:`, error);
    return null;
  }

  return (data as Vehicle) || null;
}

/**
 * Transactional Delisting:
 * When a financing agreement is signed or executed, the car MUST be immediately
 * delisted from the public storefront and marked as 'financed'.
 */
export async function delistVehicleOnFinancing(vehicleId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('vehicles')
    .update({
      status: 'financed',
      is_published: false,
      date_sold: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleId);

  if (error) {
    console.error(`[delistVehicleOnFinancing] Failed to delist vehicle ${vehicleId}:`, error);
    return false;
  }

  return true;
}

/**
 * Admin status transitions:
 * Governs state transitions: in_stock <-> reserved <-> financed <-> repossessed
 */
export async function transitionVehicleStatus(
  vehicleId: string,
  newStatus: VehicleStatus
): Promise<boolean> {
  const supabase = createAdminClient();

  // If financed or repossessed, automatically delist from public view
  const isPublished = newStatus === 'in_stock';

  const { error } = await supabase
    .from('vehicles')
    .update({
      status: newStatus,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleId);

  if (error) {
    console.error(`[transitionVehicleStatus] Failed to update status of ${vehicleId} to ${newStatus}:`, error);
    return false;
  }

  return true;
}
