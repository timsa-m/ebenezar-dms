"use server";

import { createAdminClient } from '@/src/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { requireManagerRole } from './user.actions';
import type { Vehicle, VehicleCost, VehicleStatus, VehicleCostType } from '@/src/types/database.types';

export async function getAllVehicles(): Promise<Vehicle[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getAllVehicles] Error:', error);
    return [];
  }
  return (data || []) as Vehicle[];
}

export async function getVehicleWithCosts(vehicleId: string): Promise<{
  vehicle: Vehicle | null;
  costs: VehicleCost[];
  totalCostBasis: number;
}> {
  const supabase = createAdminClient();

  const [{ data: vehicle, error: vErr }, { data: costs, error: cErr }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('id', vehicleId).maybeSingle(),
    supabase.from('vehicle_costs').select('*').eq('vehicle_id', vehicleId).order('incurred_date', { ascending: false }),
  ]);

  if (vErr || !vehicle) {
    return { vehicle: null, costs: [], totalCostBasis: 0 };
  }

  const costList = (costs || []) as VehicleCost[];
  const preSaleExpenses = costList.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalCostBasis = (Number(vehicle.purchase_price) || 0) + preSaleExpenses;

  return {
    vehicle: vehicle as Vehicle,
    costs: costList,
    totalCostBasis,
  };
}

export interface AddVehicleParams {
  registrationNo: string;
  makeModel: string;
  type?: string;
  year?: number;
  color?: string;
  mileage?: number;
  engineCapacity?: string;
  chassisNo?: string;
  chassis_no?: string;
  engineNo?: string;
  engine_no?: string;
  transmission?: string;
  fuelType?: string;
  purchasePrice: number;
  basePrice?: number;
  salePrice: number;
  isPublished?: boolean;
  images?: string[];
  features?: string[];
  description?: string;
  condition?: string;
  for_hire?: boolean;
  forHire?: boolean;
  is_new_arrival?: boolean;
  isNewArrival?: boolean;
  hire_price?: number;
  hirePrice?: number;
  hire_price_weekly?: number;
  hirePriceWeekly?: number;
  // Seller & Purchase Agreement Details
  sellerName?: string;
  sellerIdNumber?: string;
  sellerPhone?: string;
  sellerAddress?: string;
  sellerPoBox?: string;
  sellerOccupation?: string;
  amountPaid?: number;
  balance?: number;
  paymentMethod?: string;
  sellerWitnessName?: string;
  sellerWitnessId?: string;
  sellerWitnessPhone?: string;
  buyerWitnessName?: string;
  buyerWitnessId?: string;
  buyerWitnessPhone?: string;
  specialNotes?: string;
  purchaseDate?: string;
}

export async function addVehicle(params: AddVehicleParams) {
  try {
    await requireManagerRole();
    const supabase = createAdminClient();
    const regNo = params.registrationNo.trim().toUpperCase();

    const insertPayload: any = {
      registration_no: regNo,
      make_model: params.makeModel.trim(),
      type: params.type || null,
      year: params.year ? Number(params.year) : null,
      color: params.color || null,
      mileage: params.mileage ? Number(params.mileage) : null,
      engine_capacity: params.engineCapacity || null,
      chassis_no: (params.chassisNo ?? params.chassis_no)?.trim().toUpperCase() || null,
      engine_no: (params.engineNo ?? params.engine_no)?.trim().toUpperCase() || null,
      transmission: params.transmission || 'Automatic',
      fuel_type: params.fuelType || 'Petrol',
      purchase_price: Number(params.purchasePrice) || 0,
      base_price: Number(params.basePrice) || Number(params.purchasePrice) || 0,
      sale_price: Number(params.salePrice) || 0,
      status: 'in_stock',
      is_published: params.isPublished ?? true,
      images: params.images || null,
      features: params.features || null,
      description: params.description?.trim() || null,
      condition: params.condition || null,
      for_hire: Boolean(params.for_hire ?? params.forHire),
      is_new_arrival: Boolean(params.is_new_arrival ?? params.isNewArrival),
      hire_price: (params.hire_price ?? params.hirePrice) ? Number(params.hire_price ?? params.hirePrice) : null,
      hire_price_weekly: (params.hire_price_weekly ?? params.hirePriceWeekly) ? Number(params.hire_price_weekly ?? params.hirePriceWeekly) : null,
      date_purchased: params.purchaseDate || new Date().toISOString().split('T')[0],
    };

    if (params.sellerName) {
      insertPayload.seller_name = params.sellerName.trim().toUpperCase();
      insertPayload.seller_id_number = params.sellerIdNumber?.trim().toUpperCase() || null;
      insertPayload.seller_phone = params.sellerPhone?.trim() || null;
      insertPayload.seller_address = params.sellerAddress?.trim().toUpperCase() || null;
      insertPayload.seller_po_box = params.sellerPoBox?.trim().toUpperCase() || null;
    }

    const { data, error } = await supabase
      .from('vehicles')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    // If seller details provided, also record in vehicle_purchases table for contract generation
    let purchaseId: string | null = null;
    if (params.sellerName && data?.id) {
      try {
        const { recordVehiclePurchase } = await import('@/lib/actions/purchase.actions');
        const purchaseRes = await recordVehiclePurchase({
          vehicleId: data.id,
          sellerName: params.sellerName,
          sellerIdNumber: params.sellerIdNumber || 'N/A',
          sellerPhone: params.sellerPhone || 'N/A',
          sellerAddress: params.sellerAddress,
          sellerPoBox: params.sellerPoBox,
          sellerOccupation: params.sellerOccupation,
          purchasePrice: Number(params.purchasePrice) || 0,
          amountPaid: params.amountPaid ?? Number(params.purchasePrice),
          balance: params.balance ?? 0,
          paymentMethod: params.paymentMethod || 'Bank Transfer',
          sellerWitnessName: params.sellerWitnessName,
          sellerWitnessId: params.sellerWitnessId,
          sellerWitnessPhone: params.sellerWitnessPhone,
          buyerWitnessName: params.buyerWitnessName,
          buyerWitnessId: params.buyerWitnessId,
          buyerWitnessPhone: params.buyerWitnessPhone,
          specialNotes: params.specialNotes,
          purchaseDate: params.purchaseDate,
        });
        if (purchaseRes.success) {
          purchaseId = purchaseRes.purchaseId || null;
        }
      } catch (purchaseErr) {
        console.warn('[addVehicle] Purchase agreement record warning:', purchaseErr);
      }
    }

    revalidatePath('/admin/inventory');
    revalidatePath('/inventory');
    revalidatePath('/vehicles');
    return { success: true, vehicle: data, purchaseId };
  } catch (err: any) {
    console.error('[addVehicle] Error:', err);
    return { success: false, error: err?.message || 'Failed to add vehicle.' };
  }
}


export async function updateVehicle(id: string, params: Partial<AddVehicleParams> & { [key: string]: any }) {
  try {
    await requireManagerRole();
    const supabase = createAdminClient();
    const updateData: any = {};
    
    if (params.registrationNo) updateData.registration_no = params.registrationNo.trim().toUpperCase();
    if (params.makeModel) updateData.make_model = params.makeModel.trim();
    if (params.type !== undefined) updateData.type = params.type || null;
    if (params.year !== undefined) updateData.year = params.year ? Number(params.year) : null;
    if (params.color !== undefined) updateData.color = params.color?.trim() || null;
    if (params.mileage !== undefined) updateData.mileage = params.mileage ? Number(params.mileage) : null;
    if (params.engineCapacity !== undefined) updateData.engine_capacity = params.engineCapacity?.trim() || null;
    
    const chassis = params.chassisNo ?? params.chassis_no;
    if (chassis !== undefined) updateData.chassis_no = chassis?.trim().toUpperCase() || null;
    
    const engine = params.engineNo ?? params.engine_no;
    if (engine !== undefined) updateData.engine_no = engine?.trim().toUpperCase() || null;
    
    if (params.transmission !== undefined) updateData.transmission = params.transmission || 'Automatic';
    if (params.fuelType !== undefined) updateData.fuel_type = params.fuelType || 'Petrol';
    if (params.purchasePrice !== undefined) updateData.purchase_price = Number(params.purchasePrice) || 0;
    if (params.basePrice !== undefined) updateData.base_price = Number(params.basePrice) || 0;
    if (params.salePrice !== undefined) updateData.sale_price = Number(params.salePrice) || 0;
    if (params.isPublished !== undefined) updateData.is_published = Boolean(params.isPublished);
    if (params.images !== undefined) updateData.images = params.images || null;
    if (params.features !== undefined) updateData.features = params.features || null;
    if (params.description !== undefined) updateData.description = params.description?.trim() || null;
    if (params.condition !== undefined) updateData.condition = params.condition || null;
    
    const isNew = params.is_new_arrival ?? params.isNewArrival;
    if (isNew !== undefined) updateData.is_new_arrival = Boolean(isNew);
    
    const hire = params.for_hire ?? params.forHire;
    if (hire !== undefined) updateData.for_hire = Boolean(hire);
    
    const hPrice = params.hire_price ?? params.hirePrice;
    if (hPrice !== undefined) updateData.hire_price = hPrice ? Number(hPrice) : null;
    
    const hPriceWeekly = params.hire_price_weekly ?? params.hirePriceWeekly;
    if (hPriceWeekly !== undefined) updateData.hire_price_weekly = hPriceWeekly ? Number(hPriceWeekly) : null;
    
    if (params.purchaseDate !== undefined || (params as any).date_purchased !== undefined) {
      updateData.date_purchased = params.purchaseDate ?? (params as any).date_purchased ?? null;
    }
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('vehicles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (params.purchaseDate !== undefined) {
      await (supabase.from('vehicle_purchases' as any) as any)
        .update({ purchase_date: params.purchaseDate })
        .eq('vehicle_id', id);
    }

    revalidatePath('/admin/inventory');
    revalidatePath('/inventory');
    revalidatePath(`/vehicles/${id}`);
    revalidatePath('/vehicles');
    revalidatePath('/', 'layout'); // Revalidate all pages to ensure contracts/loans pick up vehicle updates
    
    return { success: true, vehicle: data };
  } catch (err: any) {
    console.error('[updateVehicle] Error:', err);
    return { success: false, error: err?.message || 'Failed to update vehicle.' };
  }
}

export async function updateVehicleFormData(formData: FormData) {
  try {
    const id = formData.get('id') as string;
    const dataStr = formData.get('data') as string;
    const parsedData = JSON.parse(dataStr);
    
    const images: string[] = parsedData.existingImages || [];
    let i = 0;
    while (formData.has(`image_${i}`)) {
      images.push(formData.get(`image_${i}`) as string);
      i++;
    }

    parsedData.images = images;
    delete parsedData.existingImages;

    return await updateVehicle(id, parsedData);
  } catch (err: any) {
    console.error('[updateVehicleFormData] Error:', err);
    return { success: false, error: err?.message || 'Failed to update vehicle from form data.' };
  }
}

export interface AddVehicleCostParams {
  vehicleId: string;
  costType: VehicleCostType;
  amount: number;
  description: string;
  vendorName?: string;
  receiptUrl?: string;
}

export async function addVehicleCost(params: AddVehicleCostParams) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('vehicle_costs')
      .insert({
        vehicle_id: params.vehicleId,
        cost_type: params.costType,
        amount: Number(params.amount) || 0,
        description: params.description.trim(),
        vendor_name: params.vendorName ? params.vendorName.trim() : null,
        receipt_url: params.receiptUrl || null,
        incurred_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/inventory');
    return { success: true, cost: data };
  } catch (err: any) {
    console.error('[addVehicleCost] Error:', err);
    return { success: false, error: err?.message || 'Failed to record vehicle cost.' };
  }
}

export async function updateVehicleStatusAction(vehicleId: string, status: VehicleStatus) {
  try {
    await requireManagerRole();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('vehicles')
      .update({
        status,
        date_sold: ['financed', 'cash_sale'].includes(status) ? new Date().toISOString().split('T')[0] : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehicleId);

    if (error) throw error;

    revalidatePath('/admin/inventory');
    revalidatePath('/inventory');
    return { success: true };
  } catch (err: any) {
    console.error('[updateVehicleStatusAction] Error:', err);
    return { success: false, error: err?.message || 'Failed to update vehicle status.' };
  }
}

export async function uploadVehicleDocument(vehicleId: string, formData: FormData) {
  try {
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string;
    const documentName = formData.get("documentName") as string;

    if (!file || !documentType) throw new Error("Missing required fields");

    const arrayBuffer = await file.arrayBuffer();
    const { generateVehicleDocumentPath } = await import('@/lib/storage-utils');
    const path = generateVehicleDocumentPath(vehicleId, documentType, documentName || file.name);

    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from("vehicle-assets")
      .upload(path, arrayBuffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;
    
    revalidatePath(`/vehicles/${vehicleId}`);
    return { success: true, path: data.path };
  } catch (err: any) {
    console.error('[uploadVehicleDocument] Error:', err);
    return { success: false, error: err?.message || 'Failed to upload document.' };
  }
}

export async function getVehicleDocuments(vehicleId: string) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from("vehicle-assets")
      .list(`vehicles/${vehicleId}/documents`);
    
    if (error) throw error;
    
    const { getVehicleAssetPublicUrl } = await import('@/lib/storage-utils');
    
    return (data || []).filter(f => f.name !== '.emptyFolderPlaceholder').map(file => {
      const parts = file.name.split('_');
      const type = parts[0] || 'OTHER';
      const documentName = parts.slice(2).join('_') || file.name;
      const url = getVehicleAssetPublicUrl(`vehicles/${vehicleId}/documents/${file.name}`);
      
      return {
        type,
        documentName,
        createdAt: file.created_at,
        url
      };
    }).sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
  } catch (err) {
    console.error('[getVehicleDocuments] Error:', err);
    return [];
  }
}

/**
 * Soft-delete a vehicle: restricted to MANAGER and ADMIN roles only.
 * Marks status as 'deleted', is_published as false, and stores deletion metadata.
 * Can be reverted at any time by a manager/admin.
 */
export async function softDeleteVehicle(id: string): Promise<{ success: boolean; error?: string; vehicle?: Vehicle }> {
  try {
    const currentUser = await requireManagerRole();
    const supabase = createAdminClient();

    const { data: vehicle, error: fetchErr } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !vehicle) {
      throw new Error('Vehicle not found.');
    }

    if (vehicle.status === 'deleted') {
      return { success: true, vehicle: vehicle as Vehicle };
    }

    const deletionMeta = {
      deletedAt: new Date().toISOString(),
      deletedBy: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || 'Manager',
      deletedById: currentUser.$id || currentUser.userId || '',
      previousStatus: vehicle.status || 'in_stock',
    };

    const cleanDesc = (vehicle.description || '').replace(/\[DELETED:.*?\]/g, '').trim();
    const updatedDesc = `[DELETED:${JSON.stringify(deletionMeta)}] ${cleanDesc}`.trim();

    const { data: updated, error: updateErr } = await supabase
      .from('vehicles')
      .update({
        status: 'deleted',
        is_published: false,
        description: updatedDesc,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    revalidatePath('/vehicles');
    revalidatePath('/admin/inventory');
    revalidatePath(`/vehicles/${id}`);
    revalidatePath('/inventory');
    revalidatePath('/', 'layout');

    return { success: true, vehicle: updated as Vehicle };
  } catch (err: any) {
    console.error('[softDeleteVehicle] Error:', err);
    return { success: false, error: err?.message || 'Failed to delete vehicle.' };
  }
}

// Alias for convenience
export async function deleteVehicle(id: string) {
  return softDeleteVehicle(id);
}

/**
 * Revert / Restore a mistakenly deleted vehicle back to active inventory.
 * Restricted to MANAGER and ADMIN roles only.
 */
export async function restoreVehicle(id: string): Promise<{ success: boolean; error?: string; vehicle?: Vehicle }> {
  try {
    await requireManagerRole();
    const supabase = createAdminClient();

    const { data: vehicle, error: fetchErr } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !vehicle) {
      throw new Error('Vehicle not found.');
    }

    let previousStatus: VehicleStatus = 'in_stock';
    let cleanDesc = vehicle.description || '';
    const match = vehicle.description?.match(/\[DELETED:(.*?)\]/);
    if (match) {
      try {
        const meta = JSON.parse(match[1]);
        if (meta.previousStatus && meta.previousStatus !== 'deleted') {
          previousStatus = meta.previousStatus as VehicleStatus;
        }
      } catch (e) {}
      cleanDesc = cleanDesc.replace(match[0], '').trim();
    }

    const { data: restored, error: updateErr } = await supabase
      .from('vehicles')
      .update({
        status: previousStatus,
        is_published: true,
        description: cleanDesc || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    revalidatePath('/vehicles');
    revalidatePath('/admin/inventory');
    revalidatePath(`/vehicles/${id}`);
    revalidatePath('/inventory');
    revalidatePath('/', 'layout');

    return { success: true, vehicle: restored as Vehicle };
  } catch (err: any) {
    console.error('[restoreVehicle] Error:', err);
    return { success: false, error: err?.message || 'Failed to restore vehicle.' };
  }
}

