import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminRole } from '@/lib/actions/user.actions';

export async function GET(request: Request) {
  try {
    await requireAdminRole();
  } catch (err: any) {
    return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const contractNo = searchParams.get('contract') || 'AGR-KBP115P-0002';

  const supabase = createAdminClient();

  const { data: agreement, error } = await supabase
    .from('financing_agreements')
    .select('*')
    .eq('contract_no', contractNo)
    .single();

  if (error || !agreement) {
    return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
  }

  // Check if installments already exist
  const { count } = await supabase
    .from('financing_installments')
    .select('*', { count: 'exact', head: true })
    .eq('agreement_id', agreement.id);

  if (count && count > 0) {
    return NextResponse.json({ message: 'Installments already exist.' });
  }

  const durationMonths = agreement.duration_months || 12;
  const principalAmount = agreement.principal_amount;
  const interestRate = agreement.interest_rate || 15;
  const startDate = new Date(agreement.start_date);

  const installments = [];
  const principalPerMonth = principalAmount / durationMonths;
  const interestAmount = (principalAmount * interestRate) / 100;
  const interestPerMonth = interestAmount / durationMonths;

  for (let i = 1; i <= durationMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + i);

    let p_due = Math.round(principalPerMonth * 100) / 100;
    let i_due = Math.round(interestPerMonth * 100) / 100;

    if (i === durationMonths) {
      p_due = principalAmount - (Math.round(principalPerMonth * 100) / 100 * (i - 1));
      i_due = interestAmount - (Math.round(interestPerMonth * 100) / 100 * (i - 1));
    }

    installments.push({
      agreement_id: agreement.id,
      client_id: agreement.client_id,
      installment_number: i,
      due_date: dueDate.toISOString(),
      principal_due: p_due,
      interest_due: i_due,
      fees_due: 0,
      penalties_due: 0,
      status: "Pending"
    });
  }

  const { error: insErr } = await supabase.from('financing_installments').insert(installments);
  if (insErr) {
    return NextResponse.json({ error: insErr }, { status: 500 });
  }

  return NextResponse.json({ message: 'Success', count: installments.length });
}
