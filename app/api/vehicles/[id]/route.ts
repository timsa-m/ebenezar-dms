import { NextResponse } from 'next/server';
import { createAdminClient } from '@/src/lib/supabase/admin';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const supabase = createAdminClient();
  
  // The website sometimes passes slugs or mongo object IDs. In supabase we use UUIDs or slugs.
  // First try by ID (if it looks like a uuid) or fallback to slug.
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
  
  let query = supabase.from('vehicles').select('*');
  if (isUuid) {
    query = query.eq('id', id);
  } else {
    query = query.eq('slug', id);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }

  const v = data;
  const formattedData = {
    _id: v.id,
    name: v.make_model,
    brand: v.make_model?.split(' ')[0] || '',
    modelYear: v.year,
    price: v.sale_price,
    hirePrice: v.hire_price,
    hirePriceWeekly: v.hire_price_weekly,
    fuelType: v.fuel_type,
    mileage: v.mileage,
    transmission: v.transmission,
    engineCapacity: v.engine_capacity,
    color: v.color,
    chassisNo: v.chassis_no,
    engineNo: v.engine_no,
    category: v.type,
    condition: v.condition,
    description: v.description,
    features: v.features || [],
    isNewArrival: v.is_new_arrival,
    forHire: v.for_hire,
    isSold: v.status !== 'in_stock',
    images: v.images || [],
    slug: v.slug || v.id
  };

  return NextResponse.json(formattedData);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const { softDeleteVehicle } = await import('@/lib/actions/vehicle.actions');
    const result = await softDeleteVehicle(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to delete vehicle' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Vehicle soft-deleted successfully' });
  } catch (err: any) {
    console.error('[DELETE /api/vehicles/[id]] Error:', err);
    return NextResponse.json({ error: err.message || 'Unauthorized or server error' }, { status: 403 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const body = await request.json().catch(() => ({}));

    if (body.action === 'restore') {
      const { restoreVehicle } = await import('@/lib/actions/vehicle.actions');
      const result = await restoreVehicle(id);
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to restore vehicle' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Vehicle restored successfully', vehicle: result.vehicle });
    }

    const { updateVehicle } = await import('@/lib/actions/vehicle.actions');
    const result = await updateVehicle(id, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update vehicle' }, { status: 400 });
    }

    return NextResponse.json({ success: true, vehicle: result.vehicle });
  } catch (err: any) {
    console.error('[PATCH /api/vehicles/[id]] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

