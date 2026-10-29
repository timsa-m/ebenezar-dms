import { NextResponse } from 'next/server';
import { createAdminClient } from '@/src/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      carMake, 
      carModel, 
      carYear, 
      carMileage, 
      carCondition, 
      name, 
      phone 
    } = body;

    if (!carMake || !carYear || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('trade_in_requests').insert({
      make_model: `${carMake} ${carModel || ''}`.trim(),
      year: parseInt(carYear, 10) || 0,
      mileage: parseInt(carMileage, 10) || 0,
      condition: carCondition || 'Unknown',
      name,
      phone,
      status: 'new'
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Trade-in request submitted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
