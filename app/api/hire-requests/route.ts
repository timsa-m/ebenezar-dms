import { NextResponse } from 'next/server';
import { createAdminClient } from '@/src/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicleId, name, phone, email, startDate, endDate, notes } = body;

    if (!vehicleId || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('hire_requests').insert({
      vehicle_id: vehicleId,
      name,
      phone,
      email,
      start_date: startDate || null,
      end_date: endDate || null,
      notes,
      status: 'new'
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Hire request submitted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
