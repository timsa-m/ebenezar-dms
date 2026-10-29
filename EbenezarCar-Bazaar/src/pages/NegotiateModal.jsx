import React, { useState, useEffect } from 'react';
import {
  X,
  Tag,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MessageCircle,
  AlertCircle,
  Send,
  Car,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { submitNegotiationRequest } from '../services/publicApi';

export const NegotiateModal = ({ vehicle, isOpen, onClose }) => {
  if (!isOpen || !vehicle) return null;

  const askingPrice = Number(vehicle.price) || 0;
  const [offerPrice, setOfferPrice] = useState(askingPrice ? Math.round(askingPrice * 0.95) : '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [terms, setTerms] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const numOffer = Number(offerPrice) || 0;
  const diff = askingPrice - numOffer;
  const diffPct = askingPrice > 0 ? ((diff / askingPrice) * 100).toFixed(1) : 0;

  const formatKsh = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 'Ksh 0';
    return `Ksh ${Number(num).toLocaleString()}`;
  };

  const handleWhatsAppSend = () => {
    const text = encodeURIComponent(
      `Hello Ebenezar Car Bazaar, I would like to make an offer on:\n` +
      `🚗 ${vehicle.title || vehicle.name} (${vehicle.year || vehicle.modelYear || ''})\n` +
      `🏷️ Listed Asking Price: ${formatKsh(askingPrice)}\n` +
      `🤝 My Cash Offer: ${formatKsh(numOffer)}\n` +
      (terms ? `📝 Terms/Notes: ${terms}\n` : '') +
      `\nFrom: ${name || 'Prospective Buyer'}${phone ? ` (${phone})` : ''}`
    );
    window.open(`https://wa.me/254704287382?text=${text}`, '_blank');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim() || !numOffer) {
      setStatus({
        state: 'error',
        message: 'Please provide your offer price, full name, phone number, and email.'
      });
      return;
    }

    try {
      setStatus({ state: 'loading', message: '' });

      const structuredMessage = [
        `[PRICE NEGOTIATION OFFER]`,
        `Vehicle: ${vehicle.title || vehicle.name} (${vehicle.year || vehicle.modelYear || ''})`,
        `Asking Price: ${formatKsh(askingPrice)}`,
        `Stock ID: ${vehicle.stockId || vehicle.id || vehicle._id || 'N/A'}`,
        ``,
        `--- OFFER DETAILS ---`,
        `Buyer Offer Price: ${formatKsh(numOffer)}`,
        `Proposed Discount: ${formatKsh(diff)} (${diffPct}% below asking)`,
        ``,
        `--- BUYER DETAILS ---`,
        `Name: ${name}`,
        `Phone: ${phone}`,
        `Email: ${email}`,
        `Proposed Terms / Notes: ${terms || 'Cash purchase, ready to close'}`
      ].join('\n');

      await submitNegotiationRequest({
        name: name.trim(),
        email: email.trim(),
        message: structuredMessage
      });

      setStatus({
        state: 'success',
        message: 'Your offer has been submitted! Our sales manager will review your proposal and get in touch with you shortly.'
      });
    } catch (err) {
      setStatus({
        state: 'error',
        message: err.message || 'Unable to submit your offer right now. Please try again or chat with us on WhatsApp.'
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
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200"
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
        <div className="bg-gradient-to-r from-slate-900 to-emerald-800 text-white p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
              <Tag className="w-3.5 h-3.5 text-emerald-300" />
              Direct Price Negotiation
            </span>
            <span className="text-xs text-emerald-200 font-semibold hidden sm:inline">
              Fast Response Guaranteed
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Make Your Best Offer
          </h2>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-emerald-200" />
              <span className="font-bold text-white truncate max-w-[260px]">
                {vehicle.title || vehicle.name} ({vehicle.year || vehicle.modelYear || ''})
              </span>
            </div>
            <div className="text-right">
              <span className="text-emerald-200 font-medium">Asking Price: </span>
              <span className="font-extrabold text-white text-sm">{formatKsh(askingPrice)}</span>
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
              <h3 className="text-xl font-extrabold text-emerald-950">Offer Submitted!</h3>
              <p className="text-sm text-emerald-800 leading-relaxed max-w-md mx-auto">
                {status.message}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleWhatsAppSend}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Follow Up on WhatsApp
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
            <form onSubmit={handleSubmit} className="space-y-5">
              {status.state === 'error' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{status.message}</span>
                </div>
              )}

              {/* Offer Amount Input */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Your Offer Amount (Ksh) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-base">
                    Ksh
                  </span>
                  <input
                    type="number"
                    required
                    min="100000"
                    step="10000"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="w-full pl-14 pr-4 py-3 text-lg font-extrabold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    placeholder="Enter offer in Ksh..."
                  />
                </div>

                {/* Offer Comparison Indicator */}
                {numOffer > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <span className="text-slate-500">
                      {diff > 0 ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5" />
                          {formatKsh(diff)} ({diffPct}%) below asking price
                        </span>
                      ) : diff === 0 ? (
                        <span className="text-slate-600 font-semibold">At full asking price</span>
                      ) : (
                        <span className="text-blue-700 font-semibold">
                          {formatKsh(Math.abs(diff))} above asking price
                        </span>
                      )}
                    </span>
                    <span className="font-bold text-slate-700">
                      Asking: {formatKsh(askingPrice)}
                    </span>
                  </div>
                )}
              </div>

              {/* Contact Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Your Contact Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Samuel Mutua"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number (WhatsApp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0722 123 456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
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
                    placeholder="e.g. samuel@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Proposed Terms or Conditions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Ready to pay cash and complete logbook transfer within 2 days..."
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={status.state === 'loading'}
                  className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {status.state === 'loading' ? 'Submitting Offer...' : 'Submit Cash Offer'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppSend}
                  className="w-full sm:w-auto py-3 px-5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Negotiate on WhatsApp</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                All submitted offers are reviewed by management. You will receive a counter-offer or approval call/message.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
