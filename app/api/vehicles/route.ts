import { NextResponse } from 'next/server';
import { createAdminClient } from '@/src/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const make = searchParams.get('make');
    const type = searchParams.get('category');
    const condition = searchParams.get('condition');
    const isNewArrival = searchParams.get('isNewArrival');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = createAdminClient();
    let query = supabase.from('vehicles').select('*').eq('is_published', true);

    // Map old website params to Supabase column names
    if (make) query = query.ilike('make_model', `%${make}%`);
    if (type) query = query.eq('type', type);

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error("[Vehicles API] Supabase query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map Supabase fields to what the Vite frontend expects (camelCase)
    const formattedData = (data || []).map(v => ({
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
    }));

    return NextResponse.json(formattedData);
  } catch (err: any) {
    console.error("[Vehicles API] Internal server error:", err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
