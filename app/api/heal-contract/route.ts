import { NextResponse } from 'next/server';
import { healLoanLedger } from '@/lib/actions/loan.actions';
import { requireAdminRole } from '@/lib/actions/user.actions';

export async function GET(req: Request) {
  try {
    await requireAdminRole();
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }
  
  try {
    await healLoanLedger(id);
    return NextResponse.json({ success: true, message: `Ledger for ${id} healed successfully.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
