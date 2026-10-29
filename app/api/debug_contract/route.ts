import { NextResponse } from 'next/server';
import { createAdminClient } from '@/src/lib/supabase/admin';
import { requireAdminRole } from '@/lib/actions/user.actions';

export async function GET(req: Request) {
  try {
    await requireAdminRole();
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const contractNo = searchParams.get('contract_no');
  const agreementId = searchParams.get('id');

  const supabase = createAdminClient();

  let ag: any = null;
  let agError: any = null;

  if (agreementId) {
    const { data, error } = await supabase
      .from('financing_agreements')
      .select('*')
      .eq('id', agreementId)
      .single();
    ag = data; agError = error;
  } else if (contractNo) {
    const { data, error } = await supabase
      .from('financing_agreements')
      .select('*')
      .eq('contract_no', contractNo)
      .single();
    ag = data; agError = error;
  } else {
    return NextResponse.json({ error: 'Pass ?id=<uuid> or ?contract_no=<no>' }, { status: 400 });
  }

  if (agError || !ag) {
    return NextResponse.json({ error: agError?.message || 'Not found' }, { status: 404 });
  }

  const { data: inst } = await supabase.from('financing_installments').select('*').eq('agreement_id', ag.id).order('installment_number');
  const { data: rep }  = await supabase.from('repayments').select('*').eq('agreement_id', ag.id).order('payment_date');
  const { data: pen }  = await supabase.from('penalties').select('*').eq('agreement_id', ag.id);

  const instSummary = (inst || []).map((i: any) => ({
    no: i.installment_number,
    due: i.due_date?.slice(0, 10),
    principal_due: i.principal_due,
    principal_paid: i.principal_paid,
    penalties_due: i.penalties_due,
    penalties_paid: i.penalties_paid,
    is_settled: i.is_settled,
    status: i.status,
  }));

  return NextResponse.json({
    agreement: {
      id: ag.id, contract_no: ag.contract_no, status: ag.status,
      balance: ag.balance, total_penalties: ag.total_penalties,
      sale_price: ag.sale_price, deposit_paid: ag.deposit_paid,
    },
    installments_summary: instSummary,
    repayments: (rep || []).map((r: any) => ({
      id: r.id, amount_paid: r.amount_paid, payment_method: r.payment_method,
      payment_date: r.payment_date?.slice(0, 10),
      allocated_principal: r.allocated_principal,
      allocated_penalties: r.allocated_penalties,
    })),
    penalties: (pen || []).map((p: any) => ({
      id: p.id, amount: p.amount, status: p.status, date_applied: p.date_applied?.slice(0, 10),
    })),
  });
}

