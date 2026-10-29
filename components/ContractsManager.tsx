'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AgreementWithDetails } from '@/lib/actions/dms.actions';
import { formatKES, maskPhone, maskNationalId } from '@/src/lib/financial-engine';
import PaymentModal from '@/components/PaymentModal';
import {
  FileText,
  CreditCard,
  Plus,
  Receipt,
  X,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Download,
  Calendar,
  User,
  Car,
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface ContractsManagerProps {
  agreements: AgreementWithDetails[];
}

export default function ContractsManager({ agreements }: ContractsManagerProps) {
  const [agreementList, setAgreementList] = useState<AgreementWithDetails[]>(agreements);

  // Modals
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedAgreementForReceipt, setSelectedAgreementForReceipt] = useState<AgreementWithDetails | null>(null);

  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [selectedAgreementForStatement, setSelectedAgreementForStatement] = useState<AgreementWithDetails | null>(null);

  const handleOpenReceipt = (agreement: AgreementWithDetails) => {
    setSelectedAgreementForReceipt(agreement);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase bg-blue-100 text-blue-800">
              Contract &amp; F&amp;I Ledger
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Agreements &amp; Contracts
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-xl">
            Official motor vehicle sales agreements (Hire-Purchase / Cash) and inventory acquisition purchase contracts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/vehicles/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>Record Vehicle Purchase</span>
          </Link>
          <Link
            href="/admin/purchases"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <User size={14} />
            <span>Vendors &amp; Purchases</span>
          </Link>
          <Link
            href="/loans/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-900 text-white hover:bg-blue-800 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>New Sale Agreement</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Contract</th>
                  <th className="py-3.5 px-6">Client</th>
                  <th className="py-3.5 px-6">Vehicle</th>
                  <th className="py-3.5 px-6 text-right">Sale Price</th>
                  <th className="py-3.5 px-6 text-right">Monthly</th>
                  <th className="py-3.5 px-6 text-right">Balance</th>
                  <th className="py-3.5 px-6 text-center">Aging</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agreementList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400 text-sm">
                      No financing agreements recorded yet.
                    </td>
                  </tr>
                ) : (
                  agreementList.map((a) => {
                    const isRepossessionRisk = a.aging_bucket === '90+ Days';

                    return (
                      <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs font-medium text-slate-700">
                          <Link
                            href={`/loans/${a.id}/contract`}
                            className="hover:underline text-blue-600 hover:text-blue-800 font-bold"
                            title="View Sale Agreement Contract"
                          >
                            {a.contract_no}
                          </Link>
                        </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-slate-900 block">
                          {a.client?.full_name || 'Client'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {maskPhone(a.client?.phone)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                          {a.vehicle?.registration_no || 'Vehicle'}
                        </span>
                        <span className="text-xs text-slate-400 block mt-1 max-w-[120px] truncate">
                          {a.vehicle?.make_model}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right text-sm text-slate-600">
                        {formatKES(a.sale_price)}
                      </td>
                      <td className="py-4 px-6 text-right text-sm font-medium text-slate-800">
                        {formatKES(a.monthly_due)}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-900">
                        {formatKES(a.balance)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                            a.aging_bucket === '0-30 Days'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.aging_bucket === '31-60 Days'
                              ? 'bg-amber-100 text-amber-800'
                              : a.aging_bucket === '61-90 Days'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isRepossessionRisk && <ShieldAlert size={10} />}
                          {a.aging_bucket}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase ${
                            a.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : a.status === 'active'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/loans/${a.id}/contract`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                            title="Generate and print official Sale Agreement"
                          >
                            <FileText size={12} />
                            Contract
                          </Link>
                          <button
                            onClick={() => handleOpenReceipt(a)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                          >
                            <Receipt size={12} />
                            Log Receipt
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAgreementForStatement(a);
                              setIsStatementModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <FileText size={12} />
                            Statement
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Receipt Modal with Payment Waterfall Preview */}
      <PaymentModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        agreement={
          selectedAgreementForReceipt
            ? {
                id: selectedAgreementForReceipt.id,
                contract_no: selectedAgreementForReceipt.contract_no,
                client_name: selectedAgreementForReceipt.client?.full_name,
                vehicle_reg: selectedAgreementForReceipt.vehicle?.registration_no,
                balance: selectedAgreementForReceipt.balance,
                total_penalties: selectedAgreementForReceipt.total_penalties,
                monthly_due: selectedAgreementForReceipt.monthly_due,
              }
            : null
        }
        onPaymentRecorded={(receipt) => {
          setAgreementList((prev) =>
            prev.map((a) => {
              if (a.id === selectedAgreementForReceipt?.id) {
                const newBal = Math.max(0, a.balance - receipt.amount_paid);
                return {
                  ...a,
                  balance: newBal,
                  status: newBal <= 0 ? 'completed' : a.status,
                };
              }
              return a;
            })
          );
        }}
      />

      {/* Statement Generator Modal */}
      {isStatementModalOpen && selectedAgreementForStatement && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
              <div>
                <span className="text-xs font-bold text-blue-900 uppercase tracking-widest block">
                  Ebenezar Enterprises Car Bazaar
                </span>
                <h2 className="text-xl font-extrabold text-slate-950 mt-1">
                  Hire-Purchase Statement of Account
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  Contract: {selectedAgreementForStatement.contract_no}
                </span>
              </div>
              <button onClick={() => setIsStatementModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Client & Asset Meta */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl mb-6 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Borrower</span>
                <span className="font-bold text-slate-900 block text-sm">
                  {selectedAgreementForStatement.client?.full_name}
                </span>
                <span className="text-slate-600">
                  ID: {maskNationalId(selectedAgreementForStatement.client?.client_id_number)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Financed Asset</span>
                <span className="font-bold text-slate-900 block text-sm">
                  {selectedAgreementForStatement.vehicle?.registration_no}
                </span>
                <span className="text-slate-600 truncate block">
                  {selectedAgreementForStatement.vehicle?.make_model}
                </span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6 text-center text-xs">
              <div className="p-4 bg-slate-100 rounded-xl">
                <span className="text-slate-500 block mb-1">Contract Sale Price</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatKES(selectedAgreementForStatement.sale_price)}
                </span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-emerald-700 block mb-1">Total Paid to Date</span>
                <span className="font-bold text-emerald-900 text-sm">
                  {formatKES(selectedAgreementForStatement.sale_price - selectedAgreementForStatement.balance)}
                </span>
              </div>
              <div className="p-4 bg-slate-900 text-white rounded-xl">
                <span className="text-slate-400 block mb-1">Current Balance</span>
                <span className="font-extrabold text-white text-sm">
                  {formatKES(selectedAgreementForStatement.balance)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1 mb-6">
              <span className="font-bold block">Account Standing &amp; Aging:</span>
              <p>
                Status: <strong className="capitalize">{selectedAgreementForStatement.status}</strong> • Current Aging Bucket: <strong>{selectedAgreementForStatement.aging_bucket}</strong> ({selectedAgreementForStatement.days_overdue} days past due).
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
              >
                <Download size={14} /> Print Statement
              </button>
              <button
                type="button"
                onClick={() => setIsStatementModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
