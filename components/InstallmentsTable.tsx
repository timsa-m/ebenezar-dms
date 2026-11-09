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
  const styles: Record<string, string> = {
    Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40',
    Waived: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/40',
    'Waived (Partial)': 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
    'Rolled Over': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/40',
    Overdue: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/40',
    Partial: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/40',
    Pending: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-[#18221A] dark:text-[#A1ADA4] dark:border-[#29352D]',
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

  const badgeClass = styles[status] ?? styles.Pending;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider whitespace-nowrap border",
      badgeClass
    )}>
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
        <div className="data-empty p-12 text-center">
          <CalendarDays size={32} className="text-gray-400 dark:text-[#A1ADA4] mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700 dark:text-[#F4F7F4]">No installments generated yet</p>
          <p className="text-xs text-gray-500 dark:text-[#A1ADA4] mt-1">
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 flex-1 w-full">
          {[
            { label: 'Total Installments', value: String(displayInstallments.length), colorClass: 'text-gray-900 dark:text-[#F4F7F4]' },
            { label: 'Settled', value: String(displayInstallments.filter(i => (i.isSettled || i.status === 'Waived') && i.status !== 'Rolled Over').length), colorClass: 'text-emerald-600 dark:text-emerald-400' },
            ...(displayInstallments.some(i => getInstallmentStatus(i).startsWith('Waived')) || totalWaived > 0 ? [
              { label: 'Waived', value: String(displayInstallments.filter(i => getInstallmentStatus(i).startsWith('Waived')).length), colorClass: 'text-amber-600 dark:text-amber-400' }
            ] : []),
            { label: 'Overdue', value: String(displayInstallments.filter(i => getInstallmentStatus(i) === 'Overdue').length), colorClass: 'text-red-600 dark:text-red-400' },
            { label: 'Total Scheduled', value: formatAmount(currentPrincipalSum), colorClass: isEditing && Math.abs(currentPrincipalSum - totals.due) > 0.01 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-[#F4F7F4]' },
            ...(totalWaived > 0 ? [
              { label: 'Total Waived', value: formatAmount(totalWaived), colorClass: 'text-amber-600 dark:text-amber-400' }
            ] : []),
            { label: 'Outstanding', value: formatAmount(Math.max(0, totals.due - totals.paid)), colorClass: totals.due - totals.paid > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400' },
          ].map(card => (
            <div key={card.label} className="p-3 bg-gray-50 dark:bg-[#18221A] border border-gray-100 dark:border-[#29352D] rounded-xl">
              <span className="block text-[11px] text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider mb-1">
                {card.label}
              </span>
              <span className={cn("block text-sm font-extrabold tabular-nums", card.colorClass)}>
                {card.value}
              </span>
            </div>
          ))}
        </div>

        {displayInstallments.length > 0 && (
          <div className="flex gap-2 shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={() => { setIsEditing(false); setEditDrafts({}); }}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-[#F4F7F4] bg-white dark:bg-[#1D2920] border border-gray-200 dark:border-[#29352D] rounded-lg hover:bg-gray-50 dark:hover:bg-[#222E25] transition-colors cursor-pointer"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={handleSaveSchedule}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors cursor-pointer"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Schedule
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-[#F4F7F4] bg-white dark:bg-[#1D2920] border border-gray-200 dark:border-[#29352D] rounded-lg hover:bg-gray-50 dark:hover:bg-[#222E25] transition-colors cursor-pointer"
              >
                <Pencil size={14} /> Edit Schedule
              </button>
            )}
          </div>
        )}
      </div>

      {isEditing && Math.abs(currentPrincipalSum - totals.due) > 0.01 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
          <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Warning: The custom schedule sum ({formatAmount(currentPrincipalSum)}) differs from the original required balance ({formatAmount(totals.due)}).
          </span>
        </div>
      )}

      {/* Table */}
      <div className="data-table-wrap bg-white dark:bg-[#151D17] border border-gray-200/70 dark:border-[#29352D]">
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
                    className={cn(
                      "data-table-row transition-colors",
                      isOverdue && "bg-red-50/40 dark:bg-red-950/20",
                      isPaid && "bg-emerald-50/40 dark:bg-emerald-950/20",
                      isWaived && "bg-amber-50/40 dark:bg-amber-950/20"
                    )}
                    style={{
                      opacity: (isPaid || isWaived) ? 0.85 : 1,
                    }}
                  >
                    <td className="data-td text-center font-bold text-xs text-gray-400 dark:text-[#A1ADA4]">
                      {inst.installmentNumber}
                    </td>
                    <td className={cn("data-td text-xs font-medium", isOverdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-700 dark:text-[#C1CBC3]")}>
                      {isEditing && !isPaid ? (
                        <input
                          type="date"
                          value={currentDueDate ? new Date(currentDueDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleEditChange(inst.$id, 'dueDate', new Date(e.target.value).toISOString())}
                          className="w-full p-1 text-xs border border-gray-300 dark:border-[#29352D] rounded bg-white dark:bg-[#18221A] text-gray-900 dark:text-[#F4F7F4]"
                        />
                      ) : (
                        new Date(currentDueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                      )}
                    </td>
                    <td className="data-td text-right tabular-nums text-xs text-gray-700 dark:text-[#C1CBC3]">
                      {isEditing && !isPaid ? (
                        <input
                          type="number"
                          step="0.01"
                          value={currentPrincipalDue}
                          onChange={(e) => handleEditChange(inst.$id, 'principalDue', e.target.value)}
                          className="w-full text-right p-1 text-xs border border-gray-300 dark:border-[#29352D] rounded bg-white dark:bg-[#18221A] text-gray-900 dark:text-[#F4F7F4]"
                        />
                      ) : (
                        formatAmount(currentPrincipalDue)
                      )}
                    </td>
                    {hasPenalties && (
                      <td className={cn("data-td text-right tabular-nums text-xs", inst.penaltiesDue > 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-400 dark:text-[#A1ADA4]")}>
                        {inst.penaltiesDue > 0 ? formatAmount(inst.penaltiesDue) : '—'}
                      </td>
                    )}
                    <td className="data-td text-right font-bold tabular-nums text-sm text-gray-900 dark:text-[#F4F7F4]">
                      {formatAmount(computedDue)}
                    </td>
                    <td className={cn("data-td text-right font-bold tabular-nums text-sm", isWaived ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                      {computedPaid > 0 ? formatAmount(computedPaid) : '—'}
                    </td>
                    <td className={cn("data-td text-right tabular-nums text-xs font-semibold", remaining > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                      {remaining > 0 ? formatAmount(remaining) : '✓'}
                    </td>
                    <td className="data-td text-right">
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer totals row */}
            <tfoot>
              <tr className="bg-gray-50 dark:bg-[#18221A] border-t-2 border-gray-200 dark:border-[#29352D]">
                <td colSpan={hasPenalties ? 4 : 3} className="p-3 text-xs font-bold text-gray-700 dark:text-[#C1CBC3]">
                  Totals
                </td>
                <td className="p-3 text-right font-extrabold text-sm text-gray-900 dark:text-[#F4F7F4] tabular-nums">
                  {formatAmount(totals.due)}
                </td>
                <td className="p-3 text-right font-extrabold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatAmount(totals.paid)}
                </td>
                <td className={cn("p-3 text-right font-extrabold text-sm tabular-nums", totals.due - totals.paid > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                  {totals.due - totals.paid > 0 ? formatAmount(totals.due - totals.paid) : '✓'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {totalWaived > 0 && (
        <div className="mt-3 p-2.5 sm:p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
          <Percent size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Includes <strong>{formatAmount(totalWaived)}</strong> in approved credit waiver relief applied towards settling installment balances.
          </span>
        </div>
      )}
    </div>
  );
}
