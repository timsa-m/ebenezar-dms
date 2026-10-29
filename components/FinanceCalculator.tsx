'use client';

import React, { useState } from 'react';
import { formatKES, calculateHirePurchase, isValidKenyanPhone } from '@/src/lib/financial-engine';
import { submitFinanceInquiry } from '@/app/actions/leads';
import {
  Calculator,
  ShieldCheck,
  Send,
  Loader2,
  CheckCircle2,
  DollarSign,
  Calendar,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import { toast } from '@/lib/toast';

export interface FinanceCalculatorProps {
  initialSalePrice?: number;
  vehicleId?: string;
  vehicleTitle?: string;
  vehicleRegistration?: string;
  showLeadForm?: boolean;
  className?: string;
}

export default function FinanceCalculator({
  initialSalePrice = 1500000,
  vehicleId,
  vehicleTitle,
  vehicleRegistration,
  showLeadForm = true,
  className = '',
}: FinanceCalculatorProps) {
  const [salePrice, setSalePrice] = useState<number>(initialSalePrice);
  const [depositPercent, setDepositPercent] = useState<number>(30); // 30% default deposit
  const [durationMonths, setDurationMonths] = useState<number>(12); // 12 months default tenure
  const [annualInterestRate, setAnnualInterestRate] = useState<number>(15); // 15% standard p.a.

  // Customer Inquiry Form State
  const [isOpenInquiry, setIsOpenInquiry] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Financial Engine Computation
  const depositAmount = Math.round((salePrice * depositPercent) / 100);
  const hpCalculation = calculateHirePurchase({
    salePrice,
    depositAmount,
    durationMonths,
    annualInterestRate,
  });

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim()) {
      toast.error('Please enter your full name and phone number.');
      return;
    }

    if (!isValidKenyanPhone(phone)) {
      toast.error('Please enter a valid Kenyan phone number (e.g. 0712345678 or +254712345678).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitFinanceInquiry({
        vehicleId,
        fullName,
        phone,
        email: email || undefined,
        interestType: 'hire_purchase',
        proposedDeposit: depositAmount,
        monthlyBudget: hpCalculation.monthlyInstallment,
        notes: notes
          ? `${notes} | Calculated Quote: ${depositPercent}% deposit (${formatKES(depositAmount)}), ${durationMonths} mos @ ${formatKES(hpCalculation.monthlyInstallment)}/mo`
          : `Interested in quote: ${vehicleTitle || 'Vehicle'} (${vehicleRegistration || 'Yard Stock'}). Deposit: ${depositPercent}% (${formatKES(depositAmount)}), ${durationMonths} mos tenure.`,
      });

      if (res.success) {
        toast.success('Inquiry received! An Ebenezar F&I specialist will contact you shortly.');
        setIsSubmitted(true);
      } else {
        toast.error(res.error || 'Failed to submit inquiry.');
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again or call our yard.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden ${className}`}
    >
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-7 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur">
              <Sparkles size={12} className="text-emerald-400" />
              Interactive F&amp;I Quote
            </span>
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-400" /> 15% Fixed Annual Rate
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight">
            Hire-Purchase Finance Calculator
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Customize your down payment and loan tenure to calculate your exact monthly installment.
          </p>
        </div>
      </div>

      <div className="p-6 sm:p-7 space-y-6">
        {/* Vehicle Price Input (Editable if standalone) */}
        {!vehicleId && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <label htmlFor="vehicle-price-input">Vehicle Cash Price (KES)</label>
              <span className="text-blue-950 text-sm font-black">{formatKES(salePrice)}</span>
            </div>
            <input
              id="vehicle-price-input"
              type="number"
              min="200000"
              max="20000000"
              step="50000"
              value={salePrice}
              onChange={(e) => setSalePrice(Math.max(100000, Number(e.target.value)))}
              className="w-full text-sm font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>
        )}

        {/* Deposit Slider */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-baseline text-xs">
            <span className="font-bold text-slate-700">
              Down Payment / Deposit: <span className="text-blue-900 font-black">{depositPercent}%</span>
            </span>
            <span className="text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
              {formatKES(depositAmount)}
            </span>
          </div>
          <input
            type="range"
            min="20"
            max="70"
            step="5"
            value={depositPercent}
            onChange={(e) => setDepositPercent(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
          />
          <div className="flex justify-between text-[11px] font-semibold text-slate-400 px-0.5">
            <span>20% (Minimum)</span>
            <span>35%</span>
            <span>50%</span>
            <span>70% (Maximum)</span>
          </div>
        </div>

        {/* Loan Term Selection Tabs */}
        <div className="space-y-2.5">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Repayment Tenure</span>
            <span className="text-blue-900 font-black">{durationMonths} Months</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[6, 12, 24, 36].map((months) => {
              const active = durationMonths === months;
              return (
                <button
                  key={months}
                  type="button"
                  onClick={() => setDurationMonths(months)}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center border ${
                    active
                      ? 'bg-blue-900 text-white border-blue-900 shadow-md scale-102'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{months} Mo</span>
                  <span className={`text-[10px] font-medium ${active ? 'text-blue-200' : 'text-slate-400'}`}>
                    {months / 12 >= 1 ? `${months / 12} yr` : '6 mos'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Calculation Output Card */}
        <div className="bg-slate-950 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Estimated Monthly Due
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                  {formatKES(hpCalculation.monthlyInstallment)}
                </span>
                <span className="text-[11px] text-slate-400 ml-1">/ month</span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
                  Initial Deposit
                </span>
                <span className="text-base font-extrabold text-white">
                  {formatKES(depositAmount)}
                </span>
              </div>
            </div>

            {/* Detailed Cost Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Principal Financed</span>
                <span className="font-bold text-white text-sm">
                  {formatKES(hpCalculation.financedAmount)}
                </span>
              </div>
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Total Accrued Interest</span>
                <span className="font-bold text-white text-sm">
                  {formatKES(hpCalculation.totalInterest)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/60 text-slate-300">
              <span className="font-medium">Total Hire-Purchase Cost:</span>
              <span className="font-black text-white text-sm">
                {formatKES(hpCalculation.totalPayable)}
              </span>
            </div>
          </div>
        </div>

        {/* Lead Capture Section */}
        {showLeadForm && (
          <div className="pt-2">
            {!isOpenInquiry && !isSubmitted ? (
              <button
                type="button"
                onClick={() => setIsOpenInquiry(true)}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>Apply with this Quote</span>
                <ChevronRight size={16} />
              </button>
            ) : isSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-2 animate-in fade-in">
                <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                <h4 className="font-bold text-sm text-emerald-950">Inquiry Received!</h4>
                <p className="text-xs text-emerald-800 leading-relaxed max-w-sm mx-auto">
                  Thank you, <strong>{fullName}</strong>. An Ebenezar loan officer will contact you at <strong>{phone}</strong> to verify documents and confirm yard availability.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmitInquiry}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3.5 text-xs animate-in fade-in"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Submit Finance Application
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsOpenInquiry(false)}
                    className="text-slate-400 hover:text-slate-600 font-semibold text-[11px]"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Ochieng"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Kenyan Mobile Number (M-Pesa) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="07XXXXXXXX or +254..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Notes or Preferred Yard Visit Date
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Interested in inspection this Saturday..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Submitting Application...
                    </>
                  ) : (
                    <>
                      <Send size={15} /> Confirm &amp; Submit Application
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
