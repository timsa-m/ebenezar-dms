import { NextResponse } from 'next/server';
import { createAdminClient } from '@/src/lib/supabase/admin';
import { getCachedVehiclesApi, setCachedVehiclesApi, invalidateVehiclesApiCache } from '@/lib/cache/vehicleApiCache';

export const dynamic = 'force-dynamic';
export { invalidateVehiclesApiCache };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const make = searchParams.get('make');
    const type = searchParams.get('category');
    const condition = searchParams.get('condition');
    const isNewArrival = searchParams.get('isNewArrival');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const cacheKey = `${make || ''}_${type || ''}_${condition || ''}_${isNewArrival || ''}_${limit}`;
    const cachedData = getCachedVehiclesApi(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'X-Cache': 'HIT',
        },
      });
    }

    const supabase = createAdminClient();
    let query = supabase
      .from('vehicles')
      .select('id, make_model, year, sale_price, hire_price, hire_price_weekly, fuel_type, mileage, transmission, engine_capacity, color, chassis_no, engine_no, type, condition, description, features, is_new_arrival, for_hire, status, images, slug, created_at')
      .eq('is_published', true);

    // Filter parameters
    if (make) query = query.ilike('make_model', `%${make}%`);
    if (type) query = query.eq('type', type);
    if (condition) query = query.eq('condition', condition);
    if (isNewArrival === 'true') query = query.eq('is_new_arrival', true);

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
      status: v.status || 'in_stock',
      isSold: ['sold', 'cash_sale', 'financed', 'credit', 'repossessed', 'deleted'].includes(String(v.status || '').toLowerCase()),
      images: v.images || [],
      slug: v.slug || v.id
    }));

    setCachedVehiclesApi(cacheKey, formattedData);

    return NextResponse.json(formattedData, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'X-Cache': 'MISS',
      },
    });
  } catch (err: any) {
    console.error("[Vehicles API] Internal server error:", err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

