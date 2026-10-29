import React, { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MessageCircle,
  AlertCircle,
  Clock,
  Coins,
  Send,
  Car
} from 'lucide-react';
import { submitFinanceRequest } from '../services/publicApi';

export const FinanceModal = ({ vehicle, isOpen, onClose }) => {
  if (!isOpen || !vehicle) return null;

  const askingPrice = Number(vehicle.price) || 0;
  const minDepositAmount = Math.round(askingPrice * 0.70);

  const [depositPct, setDepositPct] = useState(70);
  const [tenureMonths, setTenureMonths] = useState(12); // 1 to 24 months cap
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Financial calculations
  // Least deposit should be at least 70%
  const depositAmount = Math.round((askingPrice * depositPct) / 100);
  const loanPrincipal = Math.max(0, askingPrice - depositAmount);
  
  // Calculator adds Ksh 10,000 per month
  const monthlyPrincipal = tenureMonths > 0 ? Math.round(loanPrincipal / tenureMonths) : 0;
  const monthlyFee = 10000;
  const estimatedMonthlyInstallment = monthlyPrincipal + monthlyFee;
  const totalLoanRepayment = estimatedMonthlyInstallment * tenureMonths;
  const totalPayableOverall = depositAmount + totalLoanRepayment;

  const formatKsh = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 'Ksh 0';
    return `Ksh ${Number(num).toLocaleString()}`;
  };

  const handleDepositChange = (e) => {
    const val = Number(e.target.value);
    // Enforce minimum 70% deposit
    setDepositPct(Math.max(70, Math.min(val, 95)));
  };

  const handleTenureChange = (e) => {
    const val = Number(e.target.value);
    // Enforce 1 to 24 months cap
    setTenureMonths(Math.max(1, Math.min(val, 24)));
  };

  const handleWhatsAppSend = () => {
    const text = encodeURIComponent(
      `Hello Ebenezar Car Bazaar, I would like to apply for a Vehicle Loan on:\n` +
      `🚗 ${vehicle.title || vehicle.name} (${vehicle.year || vehicle.modelYear || ''})\n` +
      `💰 Asking Price: ${formatKsh(askingPrice)}\n` +
      `💳 Deposit: ${formatKsh(depositAmount)} (${depositPct}%)\n` +
      `⏳ Tenure: ${tenureMonths} Months\n` +
      `💵 Est. Monthly Repayment: ${formatKsh(estimatedMonthlyInstallment)}/mo (incl. Ksh 10,000/mo fee)\n\n` +
      `My Name: ${name || 'Customer'}\n` +
      `My Phone: ${phone || 'Not provided'}`
    );
    window.open(`https://wa.me/254704287382?text=${text}`, '_blank');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setStatus({ state: 'error', message: 'Please provide your full name, phone number, and email.' });
      return;
    }

    try {
      setStatus({ state: 'loading', message: '' });

      const structuredMessage = [
        `[VEHICLE LOAN APPLICATION]`,
        `Vehicle: ${vehicle.title || vehicle.name} (${vehicle.year || vehicle.modelYear || ''})`,
        `Asking Price: ${formatKsh(askingPrice)}`,
        `Stock ID: ${vehicle.stockId || vehicle.id || vehicle._id || 'N/A'}`,
        ``,
        `--- LOAN TERMS & CALCULATIONS ---`,
        `Deposit / Down Payment: ${formatKsh(depositAmount)} (${depositPct}%) [Minimum 70% requirement fulfilled]`,
        `Loan Principal Amount: ${formatKsh(loanPrincipal)}`,
        `Loan Tenure: ${tenureMonths} Months (1 - 24 Months Cap)`,
        `Monthly Processing / Facility Fee: Ksh 10,000 / month`,
        `Estimated Monthly Repayment: ${formatKsh(estimatedMonthlyInstallment)} / month`,
        `Total Loan Repayment: ${formatKsh(totalLoanRepayment)}`,
        `Total Vehicle Cost: ${formatKsh(totalPayableOverall)}`,
        ``,
        `--- APPLICANT INFORMATION ---`,
        `Full Name: ${name}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Applicant Notes / Preferences: ${notes || 'None provided'}`
      ].join('\n');

      await submitFinanceRequest({
        name: name.trim(),
        email: email.trim(),
        message: structuredMessage
      });

      setStatus({
        state: 'success',
        message: 'Your vehicle loan application has been received! Our loan officer will contact you shortly to review and finalize pre-approval.'
      });
    } catch (err) {
      setStatus({
        state: 'error',
        message: err.message || 'Unable to submit loan application. Please try again or chat with us on WhatsApp.'
      });
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-[#0B4DB7] text-white p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              Ebenezar Vehicle Loan
            </span>
            <span className="text-xs text-blue-200 font-semibold hidden sm:inline">
              Min. 70% Deposit · 1 to 24 Months
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Vehicle Loan Calculator & Pre-Approval
          </h2>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-200" />
              <span className="font-bold text-white truncate max-w-[280px]">
                {vehicle.title || vehicle.name} ({vehicle.year || vehicle.modelYear || ''})
              </span>
            </div>
            <div className="text-right">
              <span className="text-blue-200 font-medium">Asking Price: </span>
              <span className="font-extrabold text-amber-300 text-sm">{formatKsh(askingPrice)}</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Feedback */}
          {status.state === 'success' ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-emerald-950">Loan Application Submitted!</h3>
              <p className="text-sm text-emerald-800 leading-relaxed max-w-md mx-auto">
                {status.message}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleWhatsAppSend}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat with Loan Officer on WhatsApp
                </button>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {status.state === 'error' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{status.message}</span>
                </div>
              )}

              {/* SECTION 1: INTERACTIVE LOAN CALCULATOR */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-[#0B4DB7]" />
                    Interactive Loan Calculator
                  </h3>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                    + Ksh 10,000 / month fee
                  </span>
                </div>

                {/* Slider 1: Deposit (Min 70%) */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <label htmlFor="deposit-slider" className="text-slate-700 flex items-center gap-1.5">
                      <span>Deposit (Minimum 70% Required):</span>
                      <span className="text-[#0B4DB7] font-black">{depositPct}%</span>
                    </label>
                    <span className="text-slate-900 font-extrabold">
                      {formatKsh(depositAmount)}
                    </span>
                  </div>
                  <input
                    id="deposit-slider"
                    type="range"
                    min="70"
                    max="95"
                    step="1"
                    value={depositPct}
                    onChange={handleDepositChange}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0B4DB7]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold mt-1">
                    <span>Min 70% ({formatKsh(minDepositAmount)})</span>
                    <span>80%</span>
                    <span>90%</span>
                    <span>Max 95%</span>
                  </div>
                </div>

                {/* Slider 2: Loan Period (1 to 24 Months Cap) */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <label htmlFor="tenure-slider" className="text-slate-700 flex items-center gap-1.5">
                      <span>Repayment Period (1 - 24 Months):</span>
                      <span className="text-[#0B4DB7] font-black">{tenureMonths} Months</span>
                    </label>
                    <span className="text-slate-500 text-[11px] font-semibold">
                      {tenureMonths <= 12 ? `${tenureMonths} mo` : `${(tenureMonths / 12).toFixed(1)} yrs`}
                    </span>
                  </div>
                  <input
                    id="tenure-slider"
                    type="range"
                    min="1"
                    max="24"
                    step="1"
                    value={tenureMonths}
                    onChange={handleTenureChange}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0B4DB7]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold mt-1">
                    <span>1 Month</span>
                    <span>6 Months</span>
                    <span>12 Months</span>
                    <span>18 Months</span>
                    <span>24 Months Cap</span>
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60">
                    <span className="text-[11px] font-semibold text-slate-500">Quick select:</span>
                    {[3, 6, 12, 18, 24].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setTenureMonths(m)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                          tenureMonths === m
                            ? 'bg-[#0B4DB7] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {m} mo
                      </button>
                    ))}
                  </div>
                </div>

                {/* Repayment Breakdown Summary Card */}
                <div className="rounded-xl bg-blue-50/80 border border-blue-200/80 p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Loan Principal Balance:</span>
                    <span className="font-extrabold text-slate-900">{formatKsh(loanPrincipal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Monthly Facility / Admin Fee:</span>
                    <span className="font-extrabold text-slate-900">+ Ksh 10,000 / mo</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                    <span className="text-sm font-extrabold text-[#0B4DB7]">
                      Estimated Monthly Installment:
                    </span>
                    <span className="text-base font-black text-[#0B4DB7]">
                      {formatKsh(estimatedMonthlyInstallment)} / mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Total Loan Repaid ({tenureMonths} mos): {formatKsh(totalLoanRepayment)}</span>
                    <span>Total Vehicle Cost: {formatKsh(totalPayableOverall)}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: APPLICANT DETAILS */}
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Your Contact Details for Pre-Approval
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Ochieng"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0B4DB7] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number (WhatsApp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0B4DB7] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0B4DB7] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Additional Notes or Preferred Viewing Date (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Planning to visit Kisumu branch this Friday; deposit ready via bank transfer..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0B4DB7] transition-all"
                  />
                </div>
              </div>

              {/* CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={status.state === 'loading'}
                  className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-[#0B4DB7] hover:bg-blue-800 text-white font-extrabold text-sm transition-all shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {status.state === 'loading' ? 'Submitting Application...' : 'Submit Loan Application'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppSend}
                  className="w-full sm:w-auto py-3 px-5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat on WhatsApp</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                By submitting, you agree to have an Ebenezar loan specialist contact you to verify documentation. Financing approval is subject to vehicle inspection and KYC compliance.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
