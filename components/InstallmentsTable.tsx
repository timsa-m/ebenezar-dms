'use client';

import { useState, useTransition } from 'react';
import { formatAmount, cn } from '@/lib/utils';
import { CalendarDays, CheckCircle2, Clock, AlertCircle, RefreshCw, Pencil, Save, X, Loader2, Percent } from 'lucide-react';
import { updateInstallmentsBulk, createInstallmentsBulk } from '@/lib/actions/dms.actions';

interface Props {
  installments: LoanInstallment[];
  loan?: any;
  repayments?: any[];
  totalWaived?: number;
}

function getInstallmentStatus(inst: LoanInstallment) {
  if (inst.status === 'Rolled Over') return 'Rolled Over';
  if (inst.status === 'Waived' || inst.status === 'waived') return 'Waived';
  if (inst.status === 'Waived (Partial)') return 'Waived (Partial)';
  if (inst.isSettled) return 'Paid';
  if (inst.amountPaid > 0) return 'Partial';
  
  const isPastDue = new Date(inst.dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
  if (isPastDue) return 'Overdue';
  
  return inst.status || 'Pending';
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    Paid: { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
    Waived: { background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' },
    'Waived (Partial)': { background: '#FFFDF5', color: '#B45309', border: '1px solid #FDE68A' },
    'Rolled Over': { background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' },
    Overdue: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' },
    Partial: { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' },
    Pending: { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' },
  };
  const icons: Record<string, React.ReactNode> = {
    Paid: <CheckCircle2 size={10} />,
    Waived: <Percent size={10} />,
    'Waived (Partial)': <Percent size={10} />,
    'Rolled Over': <RefreshCw size={10} />,
    Overdue: <AlertCircle size={10} />,
    Partial: <Clock size={10} />,
    Pending: <Clock size={10} />,
  };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem',
      borderRadius: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
      ...(styles[status] ?? styles.Pending),
    }}>
      {icons[status]}
      {status}
    </span>
  );
}

export default function InstallmentsTable({ installments, loan, repayments, totalWaived: propTotalWaived }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, startTransition] = useTransition();
  const [editDrafts, setEditDrafts] = useState<Record<string, { dueDate: string; principalDue: number }>>({});

  const totalWaived = propTotalWaived !== undefined
    ? Number(propTotalWaived)
    : (repayments || []).filter((r: any) =>
        (r.paymentMethod || r.payment_method || '').toLowerCase() === 'waiver' ||
        (r.type || '').toLowerCase() === 'waiver' ||
        (r.comment || r.notes || '').toUpperCase().includes('[WAIVER')
      ).reduce((sum: number, r: any) => sum + (Number(r.amount || r.amount_paid) || 0), 0)
      || Number(loan?.totalWaived || 0);

  let displayInstallments = installments;

  if (displayInstallments.length === 0) {
    if (loan && loan.durationInMonths) {
      // Generate a projected schedule
      const tenure = loan.durationInMonths;
      const totalPrincipal = loan.salePrice - (loan.depositPaid || 0);
      const principalPerMonth = Math.round((totalPrincipal / tenure) * 100) / 100;
      const startDate = new Date(loan.startDate || Date.now());

      displayInstallments = Array.from({ length: tenure }).map((_, i) => {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i + 1);

        let p_due = principalPerMonth;
        if (i === tenure - 1) {
          p_due = totalPrincipal - (principalPerMonth * (tenure - 1));
        }

        return {
          $id: `proj-${i}`,
          installmentNumber: i + 1,
          dueDate: dueDate.toISOString(),
          principalDue: p_due,
          interestDue: 0,
          feesDue: 0,
          penaltiesDue: 0,
          principalPaid: 0,
          interestPaid: 0,
          feesPaid: 0,
          penaltiesPaid: 0,
          amountPaid: 0,
          isSettled: false,
          status: 'Pending',
        } as any;
      });
    } else {
      return (
        <div className="data-empty" style={{ padding: '3rem 1rem' }}>
          <CalendarDays size={32} style={{ color: '#D1D5DB', marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#6B7280' }}>No installments generated yet</p>
          <p style={{ fontSize: '0.8125rem', color: '#D1D5DB', marginTop: '0.25rem' }}>
            The repayment schedule will appear here once the contract is approved.
          </p>
        </div>
      );
    }
  }

  // Check how much waiver has already been explicitly attributed in the installment rows
  const alreadyWaivedInRows = displayInstallments.reduce((sum, inst) => {
    if (inst.status === 'Waived' || inst.status === 'waived' || inst.status === 'Waived (Partial)') {
      return sum + (inst.principalPaid || inst.principalDue || 0);
    }
    return sum;
  }, 0);

  const unallocatedWaived = Math.max(0, totalWaived - alreadyWaivedInRows);

  // If there is unallocated waiver (e.g. from historical waiver transactions,
  // or projected schedule when no rows existed in DB), waterfall it across the schedule
  if (unallocatedWaived > 0 && !isEditing) {
    let remW = unallocatedWaived;
    displayInstallments = displayInstallments.map((inst) => {
      if (remW <= 0) return inst;

      const computedDue = (inst.principalDue ?? 0) + (inst.interestDue ?? 0) + (inst.feesDue ?? 0) + (inst.penaltiesDue ?? 0);
      const computedPaid = (inst.principalPaid ?? 0) + (inst.interestPaid ?? 0) + (inst.feesPaid ?? 0) + (inst.penaltiesPaid ?? 0);
      const unpaid = Math.max(0, computedDue - computedPaid);

      if (unpaid <= 0) return inst;

      const alloc = Math.min(remW, unpaid);
      remW -= alloc;

      const newPaid = computedPaid + alloc;
      const isNowSettled = newPaid >= computedDue;

      return {
        ...inst,
        principalPaid: (inst.principalPaid ?? 0) + alloc,
        amountPaid: newPaid,
        isSettled: isNowSettled,
        status: isNowSettled ? 'Waived' : 'Waived (Partial)',
      };
    });
  }

  // Recompute from component fields — amountDue/amountPaid in the DB can be
  // stale after rollovers or restructures and may not equal the sum of components.
  const totals = displayInstallments.reduce(
    (acc, inst) => {
      const computedDue = (inst.principalDue ?? 0) + (inst.interestDue ?? 0) + (inst.feesDue ?? 0) + (inst.penaltiesDue ?? 0);
      const computedPaid = (inst.principalPaid ?? 0) + (inst.interestPaid ?? 0) + (inst.feesPaid ?? 0) + (inst.penaltiesPaid ?? 0);
      return { due: acc.due + computedDue, paid: acc.paid + computedPaid };
    },
    { due: 0, paid: 0 }
  );

  const hasPenalties = displayInstallments.some(inst => (inst.penaltiesDue ?? 0) > 0 || (inst.penaltiesPaid ?? 0) > 0);

  // For edit mode logic
  const handleEditChange = (id: string, field: 'dueDate' | 'principalDue', value: any) => {
    setEditDrafts(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {
          dueDate: displayInstallments.find(i => i.$id === id)?.dueDate || '',
          principalDue: displayInstallments.find(i => i.$id === id)?.principalDue || 0
        }),
        [field]: value
      }
    }));
  };

  const handleSaveSchedule = () => {
    startTransition(async () => {
      if (installments.length === 0 && loan) {
        // Creating entirely new schedule from projection
        const newRows = displayInstallments.map((inst, i) => {
          const draft = editDrafts[inst.$id];
          return {
            agreement_id: loan.$id,
            client_id: loan.clientId,
            installment_number: i + 1,
            due_date: draft?.dueDate || inst.dueDate,
            principal_due: draft ? Number(draft.principalDue) : (inst.principalDue ?? 0),
            interest_due: inst.interestDue ?? 0,
            fees_due: 0,
            penalties_due: 0,
            status: "Pending"
          };
        });

        const res = await createInstallmentsBulk(newRows);
        if (res.success) {
          setIsEditing(false);
          setEditDrafts({});
        } else {
          alert('Failed to save new schedule: ' + res.error);
        }
      } else {
        // Updating existing rows
        const updates = Object.entries(editDrafts).map(([id, draft]) => ({
          id,
          principalDue: Number(draft.principalDue),
          dueDate: draft.dueDate
        }));
        if (updates.length > 0) {
          const res = await updateInstallmentsBulk(updates);
          if (res.success) {
            setIsEditing(false);
            setEditDrafts({});
          } else {
            alert('Failed to save schedule: ' + res.error);
          }
        } else {
          setIsEditing(false);
        }
      }
    });
  };

  const currentPrincipalSum = isEditing ? displayInstallments.reduce((sum, inst) => {
    const draft = editDrafts[inst.$id];
    return sum + (draft ? Number(draft.principalDue) : (inst.principalDue ?? 0));
  }, 0) : totals.due;

  return (
    <div>
      {/* Summary strip */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          flex: 1
        }}>
          {[
            { label: 'Total Installments', value: String(displayInstallments.length), color: '#111113' },
            { label: 'Settled', value: String(displayInstallments.filter(i => (i.isSettled || i.status === 'Waived') && i.status !== 'Rolled Over').length), color: '#047857' },
            ...(displayInstallments.some(i => getInstallmentStatus(i).startsWith('Waived')) || totalWaived > 0 ? [
              { label: 'Waived', value: String(displayInstallments.filter(i => getInstallmentStatus(i).startsWith('Waived')).length), color: '#D97706' }
            ] : []),
            { label: 'Overdue', value: String(displayInstallments.filter(i => getInstallmentStatus(i) === 'Overdue').length), color: '#B91C1C' },
            { label: 'Total Scheduled', value: formatAmount(currentPrincipalSum), color: isEditing && Math.abs(currentPrincipalSum - totals.due) > 0.01 ? '#D97706' : '#111113' },
            ...(totalWaived > 0 ? [
              { label: 'Total Waived', value: formatAmount(totalWaived), color: '#D97706' }
            ] : []),
            { label: 'Outstanding', value: formatAmount(Math.max(0, totals.due - totals.paid)), color: totals.due - totals.paid > 0 ? '#B91C1C' : '#047857' },
          ].map(card => (
            <div key={card.label} style={{
              padding: '0.75rem 1rem',
              background: '#F9FAFB',
              borderRadius: '0.625rem',
              border: '1px solid #F3F4F6',
            }}>
              <span style={{ display: 'block', fontSize: '0.6875rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                {card.label}
              </span>
              <span style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 800, color: card.color, fontVariantNumeric: 'tabular-nums' }}>
                {card.value}
              </span>
            </div>
          ))}
        </div>

        {displayInstallments.length > 0 && (
          <div style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem' }}>
            {isEditing ? (
              <>
                <button
                  onClick={() => { setIsEditing(false); setEditDrafts({}); }}
                  disabled={isSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={handleSaveSchedule}
                  disabled={isSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, color: '#FFF', background: '#1D4ED8', border: '1px solid #1D4ED8', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Schedule
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                <Pencil size={14} /> Edit Schedule
              </button>
            )}
          </div>
        )}
      </div>

      {isEditing && Math.abs(currentPrincipalSum - totals.due) > 0.01 && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} color="#D97706" />
          <span style={{ fontSize: '0.8125rem', color: '#92400E', fontWeight: 500 }}>
            Warning: The custom schedule sum ({formatAmount(currentPrincipalSum)}) differs from the original required balance ({formatAmount(totals.due)}).
          </span>
        </div>
      )}

      {/* Table */}
      <div className="data-table-wrap">
        <div className="data-table-scroll">
          <table className="data-table" style={{ minWidth: '600px' }}>
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              {hasPenalties && <col style={{ width: '15%' }} />}
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr className="data-table-head-row">
                <th className="data-th text-center">#</th>
                <th className="data-th text-left">Due Date</th>
                <th className="data-th text-right">Amount Due</th>
                {hasPenalties && <th className="data-th text-right">Penalties</th>}
                <th className="data-th text-right">Total Due</th>
                <th className="data-th text-right">Total Paid</th>
                <th className="data-th text-right">Balance</th>
                <th className="data-th text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayInstallments.map((inst) => {
                const status = getInstallmentStatus(inst);
                const isOverdue = status === 'Overdue';
                const isPaid = status === 'Paid';
                const isWaived = status === 'Waived' || status === 'Waived (Partial)';

                const draft = editDrafts[inst.$id];
                const currentDueDate = isEditing && draft ? draft.dueDate : inst.dueDate;
                const currentPrincipalDue = isEditing && draft ? draft.principalDue : (inst.principalDue ?? 0);

                const computedDue = Number(currentPrincipalDue) + (inst.interestDue ?? 0) + (inst.feesDue ?? 0) + (inst.penaltiesDue ?? 0);
                const rawPaid = (inst.principalPaid ?? 0) + (inst.interestPaid ?? 0) + (inst.feesPaid ?? 0) + (inst.penaltiesPaid ?? 0);
                const computedPaid = (inst.isSettled && rawPaid === 0) ? computedDue : rawPaid;
                const remaining = inst.isSettled ? 0 : Math.max(0, computedDue - computedPaid);

                return (
                  <tr
                    key={inst.$id}
                    className="data-table-row"
                    style={{
                      background: isOverdue ? '#FFF8F8' : isPaid ? '#F0FDF4' : isWaived ? '#FFFDF5' : 'transparent',
                      opacity: (isPaid || isWaived) ? 0.85 : 1,
                    }}
                  >
                    <td className="data-td" style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8125rem', color: '#9CA3AF' }}>
                      {inst.installmentNumber}
                    </td>
                    <td className="data-td" style={{ fontSize: '0.8125rem', color: isOverdue ? '#B91C1C' : '#374151', fontWeight: isOverdue ? 600 : 500 }}>
                      {isEditing && !isPaid ? (
                        <input
                          type="date"
                          value={currentDueDate ? new Date(currentDueDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleEditChange(inst.$id, 'dueDate', new Date(e.target.value).toISOString())}
                          style={{ width: '100%', padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.25rem' }}
                        />
                      ) : (
                        new Date(currentDueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                      )}
                    </td>
                    <td className="data-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem', color: '#374151' }}>
                      {isEditing && !isPaid ? (
                        <input
                          type="number"
                          step="0.01"
                          value={currentPrincipalDue}
                          onChange={(e) => handleEditChange(inst.$id, 'principalDue', e.target.value)}
                          style={{ width: '100%', textAlign: 'right', padding: '0.25rem', fontSize: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.25rem' }}
                        />
                      ) : (
                        formatAmount(currentPrincipalDue)
                      )}
                    </td>
                    {hasPenalties && (
                      <td className="data-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem', color: inst.penaltiesDue > 0 ? '#B91C1C' : '#9CA3AF' }}>
                        {inst.penaltiesDue > 0 ? formatAmount(inst.penaltiesDue) : '—'}
                      </td>
                    )}
                    <td className="data-td" style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem', color: '#111113' }}>
                      {formatAmount(computedDue)}
                    </td>
                    <td className="data-td" style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.875rem', color: isWaived ? '#D97706' : '#047857' }}>
                      {computedPaid > 0 ? formatAmount(computedPaid) : '—'}
                    </td>
                    <td className="data-td" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem', fontWeight: 600, color: remaining > 0 ? '#B91C1C' : '#047857' }}>
                      {remaining > 0 ? formatAmount(remaining) : '✓'}
                    </td>
                    <td className="data-td" style={{ textAlign: 'right' }}>
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer totals row */}
            <tfoot>
              <tr style={{ background: '#F9FAFB', borderTop: '2px solid #E5E7EB' }}>
                <td colSpan={hasPenalties ? 4 : 3} style={{ padding: '0.75rem 0.875rem', fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>
                  Totals
                </td>
                <td style={{ padding: '0.75rem 0.875rem', textAlign: 'right', fontWeight: 800, fontSize: '0.875rem', color: '#111113', fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(totals.due)}
                </td>
                <td style={{ padding: '0.75rem 0.875rem', textAlign: 'right', fontWeight: 800, fontSize: '0.875rem', color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(totals.paid)}
                </td>
                <td style={{ padding: '0.75rem 0.875rem', textAlign: 'right', fontWeight: 800, fontSize: '0.875rem', color: totals.due - totals.paid > 0 ? '#B91C1C' : '#047857', fontVariantNumeric: 'tabular-nums' }}>
                  {totals.due - totals.paid > 0 ? formatAmount(totals.due - totals.paid) : '✓'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {totalWaived > 0 && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.625rem 0.875rem',
          background: '#FFFDF5',
          border: '1px solid #FDE68A',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: '#92400E',
          fontWeight: 500,
        }}>
          <Percent size={14} style={{ color: '#D97706', flexShrink: 0 }} />
          <span>
            Includes <strong>{formatAmount(totalWaived)}</strong> in approved credit waiver relief applied towards settling installment balances.
          </span>
        </div>
      )}
    </div>
  );
}
