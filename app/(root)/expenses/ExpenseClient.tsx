'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import HeaderBox from '@/components/HeaderBox';
import { createExpense } from '@/lib/actions/expense.actions';
import { toast } from '@/lib/toast';
import { PlusCircle, DollarSign, Calendar, Tag, FileText, CreditCard, X, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAmount } from '@/lib/utils';

const EXPENSE_CATEGORIES = [
  'Reconditioning/Repairs',
  'Marketing & Ads',
  'Salaries & Wages',
  'Rent & Lease',
  'Utilities',
  'Office Supplies',
  'Transport/Fuel',
  'Taxes & Licenses',
  'Other'
];

export default function ExpenseClient({ initialExpenses, currentUser }: { initialExpenses: any[], currentUser: any }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    if (!showForm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowForm(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showForm) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [showForm]);

  const [formData, setFormData] = useState({
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    description: '',
    expense_date: new Date().toISOString().split('T')[0]
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    startTransition(async () => {
      const result = await createExpense({
        amount: Number(formData.amount),
        category: formData.category,
        description: formData.description,
        expense_date: new Date(formData.expense_date).toISOString()
      });

      if (result.success) {
        toast.success('Expense recorded successfully');
        setShowForm(false);
        // Optimistic update for UI simplicity, though revalidatePath will refresh data soon
        setExpenses([{
          id: Math.random().toString(),
          amount: Number(formData.amount),
          category: formData.category,
          description: formData.description,
          expense_date: new Date(formData.expense_date).toISOString(),
          created_by: currentUser.name || currentUser.email,
          created_at: new Date().toISOString()
        }, ...expenses]);
        setFormData({ ...formData, amount: '', description: '' });
      } else {
        toast.error(result.error || 'Failed to record expense');
      }
    });
  };

  return (
    <div className="w-full animate-fade-in">
      <header className="page-header flex flex-col md:flex-row md:items-center md:justify-between">
        <HeaderBox
          title="Expenses Tracking"
          subtext="Log and track business expenses and overheads."
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-submit flex items-center justify-center gap-2 mt-4 md:mt-0"
        >
          <PlusCircle className="size-5" />
          {showForm ? 'Cancel' : 'Record Expense'}
        </button>
      </header>

      {showForm && mounted && createPortal(
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            padding: '1rem',
            animation: 'none',
          }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div
            className="modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-modal-title"
            style={{
              maxWidth: '580px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >

            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{
                  width: '2rem', height: '2rem', borderRadius: '0.5rem',
                  background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CreditCard size={15} style={{ color: '#1D4ED8' }} />
                </div>
                <h2 className="modal-title" id="expense-modal-title">Record New Expense</h2>
              </div>
              <button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close">
                <X size={14} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Amount */}
                  <div className="form-field mb-0">
                    <label className="form-label" htmlFor="expense-amount">Amount (KES)</label>
                    <input
                      id="expense-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      name="amount"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={handleChange}
                      className="form-input"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Date */}
                  <div className="form-field mb-0">
                    <label className="form-label" htmlFor="expense-date">
                      <Calendar size={11} style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'text-top' }} />
                      Date
                    </label>
                    <input
                      id="expense-date"
                      type="date"
                      name="expense_date"
                      value={formData.expense_date}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Category */}
                  <div className="form-field mb-0">
                    <label className="form-label" htmlFor="expense-category">Category</label>
                    <select
                      id="expense-category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="form-select"
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="form-field mb-0">
                    <label className="form-label" htmlFor="expense-desc">
                      Description{' '}
                      <span className="form-hint" style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                    </label>
                    <input
                      id="expense-desc"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Details about this expense..."
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button
                  type="submit"
                  disabled={isPending}
                  className="action-btn action-btn-primary"
                  style={{
                    opacity: isPending ? 0.6 : 1,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isPending ? (
                    <><Loader2 size={15} className="auth-spinner" /><span>Saving…</span></>
                  ) : (
                    <><DollarSign size={15} /><span>Save Expense</span></>
                  )}
                </button>
                <button
                  type="button"
                  className="action-btn action-btn-outline"
                  onClick={() => setShowForm(false)}
                  disabled={isPending}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <div className="data-table-wrap lg:block hidden">
        <div className="data-table-scroll">
          <Table className="data-table">
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="data-table-head-row">
                <TableHead className="data-th text-left">Date</TableHead>
                <TableHead className="data-th text-left">Category</TableHead>
                <TableHead className="data-th text-left">Description</TableHead>
                <TableHead className="data-th text-left">Logged By</TableHead>
                <TableHead className="data-th text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="data-empty-cell">
                    <div className="data-empty">
                      <CreditCard className="size-8 text-gray-300" />
                      <p className="text-14 text-gray-600 font-medium mt-2">
                        No expenses recorded yet.
                      </p>
                      <p className="text-12 text-gray-400">
                        Create a new expense and it will appear here.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id} className="data-table-row hover:bg-gray-50/80 transition-colors">
                    <TableCell className="data-td">
                      <span className="mono-pill">{new Date(expense.expense_date).toLocaleDateString()}</span>
                    </TableCell>
                    <TableCell className="data-td">
                      <span className="badge badge-pending">
                        {expense.category}
                      </span>
                    </TableCell>
                    <TableCell className="data-td">
                      <span className="text-14 text-gray-600 font-medium truncate max-w-xs inline-block">
                        {expense.description || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="data-td">
                      <span className="client-name">
                        {expense.created_by}
                      </span>
                    </TableCell>
                    <TableCell className="data-td text-right">
                      <span className="amount-text">
                        Ksh {Number(expense.amount).toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
