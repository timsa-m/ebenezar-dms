import { NextResponse } from 'next/server';
import { createAdminClient } from '@/src/lib/supabase/admin';
import { requireAdminRole } from '@/lib/actions/user.actions';

export async function GET() {
  try {
    await requireAdminRole();
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('financing_agreements')
    .select('*')
    .eq('contract_no', 'AGR-KBP115P-0680')
    .single();

  if (error) {
    return NextResponse.json({ error });
  }
  return NextResponse.json({ data });
}
