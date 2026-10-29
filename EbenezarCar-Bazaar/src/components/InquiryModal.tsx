import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import {
  X,
  MessageSquare,
  Phone,
  Send,
  CheckCircle2,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

interface InquiryModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

export const InquiryModal: React.FC<InquiryModalProps> = ({ vehicle, onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!vehicle) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [vehicle, onClose]);

  useEffect(() => {
    if (vehicle) {
      setCustomMessage(
        `Hello Apex Motors, I would like to inquire about Stock ID: ${vehicle.stockId} - ${vehicle.make} ${vehicle.model} (${vehicle.year}) in ${vehicle.location}. Is it currently available for viewing?`
      );
      setSubmitted(false);
    }
  }, [vehicle?.id]);

  if (!vehicle) return null;

  const handleWhatsAppSend = () => {
    const encoded = encodeURIComponent(
      `${customMessage}\n\nFrom: ${name || 'Customer'}${phone ? ` (${phone})` : ''}`
    );
    const cleanPhone = vehicle.dealerPhone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      // Auto close after brief display
    }, 3000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Stock #{vehicle.stockId} • {vehicle.location} Showroom
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase">
            {vehicle.make} {vehicle.model} {vehicle.year}
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            {vehicle.transmission} • {vehicle.fuel} • {vehicle.engineCapacity} •{' '}
            {vehicle.color}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {submitted ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Inquiry Received!
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Our sales team at the {vehicle.location} branch has received your request regarding Stock #{vehicle.stockId}. We will get back to you shortly.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleWhatsAppSend}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1fa357] hover:bg-[#188c49] text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  <span>Also Open in WhatsApp Now</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* WhatsApp Quick Action Banner */}
              <div className="bg-[#f0fdf4] border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1fa357] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <MessageSquare className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Fastest: Chat on WhatsApp
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Direct connection with {vehicle.location} showroom representative
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleWhatsAppSend}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#1fa357] hover:bg-[#188c49] text-white font-bold text-xs rounded-xl shadow-sm transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
                >
                  <span>WhatsApp</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Or Submit Callback Form */}
              <form onSubmit={handleFormSubmit} className="space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <div className="h-px bg-slate-200 flex-1" />
                  <span>Or Request a Call Back</span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+254 7..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Message
                  </label>
                  <textarea
                    rows={3}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow"
                >
                  Send Inquiry to {vehicle.location} Branch
                </button>
              </form>
            </>
          )}

          {/* Showroom Direct Info Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {vehicle.location} Depot
            </span>
            <a
              href={`tel:${vehicle.dealerPhone}`}
              className="font-bold text-emerald-700 flex items-center gap-1 hover:underline"
            >
              <Phone className="w-3.5 h-3.5" /> {vehicle.dealerPhone}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
