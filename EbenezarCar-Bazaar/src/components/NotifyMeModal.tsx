import React, { useState, useEffect } from 'react';
import { FilterState, VehicleAlert } from '../types';
import {
  X,
  Bell,
  CheckCircle2,
  Mail,
  MessageSquare,
  Sparkles,
  Trash2,
  ShieldCheck,
  Send,
  Sliders,
  Filter,
} from 'lucide-react';

interface NotifyMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  existingAlerts: VehicleAlert[];
  onSaveAlert: (alert: Omit<VehicleAlert, 'id' | 'createdAt'>) => void;
  onDeleteAlert: (id: string) => void;
  onTriggerTestSimulation?: (alert: VehicleAlert) => void;
}

export const NotifyMeModal: React.FC<NotifyMeModalProps> = ({
  isOpen,
  onClose,
  filters,
  existingAlerts,
  onSaveAlert,
  onDeleteAlert,
  onTriggerTestSimulation,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
  const [frequency, setFrequency] = useState<'instant' | 'daily'>('instant');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Generate criteria description
  const buildSummary = () => {
    const parts: string[] = [];
    if (filters.make) parts.push(filters.make);
    if (filters.model) parts.push(filters.model);
    if (!filters.make && !filters.model) parts.push('Any Vehicle');
    if (filters.bodyType) parts.push(`(${filters.bodyType})`);
    if (filters.maxPrice < 100000) parts.push(`Under $${filters.maxPrice.toLocaleString()}`);
    if (filters.location) parts.push(`in ${filters.location}`);
    if (filters.searchQuery) parts.push(`matching "${filters.searchQuery}"`);
    return parts.join(' ');
  };

  const currentSummary = buildSummary();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    onSaveAlert({
      email: email.trim(),
      phone: phone.trim() || undefined,
      notifyWhatsapp,
      frequency,
      criteria: {
        query: filters.searchQuery || undefined,
        make: filters.make || undefined,
        model: filters.model || undefined,
        bodyType: filters.bodyType || undefined,
        maxPrice: filters.maxPrice < 100000 ? filters.maxPrice : undefined,
        location: filters.location || undefined,
      },
      summary: currentSummary,
    });

    setSubmitted(true);
    setTimeout(() => {
      // Keep open so they can see confirmation or test it
    }, 1500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-sm">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Inventory Stock Alert
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Get notified as soon as a matching unit arrives at Mombasa Port or Nairobi Depot
              </p>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/60">
            <button
              onClick={() => {
                setActiveTab('create');
                setSubmitted(false);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'create'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              New Search Alert
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'manage'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>Saved Alerts</span>
              {existingAlerts.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">
                  {existingAlerts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {activeTab === 'create' ? (
            submitted ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Stock Alert Active!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1">
                    We will send an immediate notification to <strong className="text-slate-900">{email}</strong> whenever a vehicle matching your search is cataloged.
                  </p>
                </div>

                {/* Subscribed Snapshot Pill */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-left max-w-sm mx-auto space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Monitored Criteria
                  </span>
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" /> {currentSummary}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Frequency: {frequency === 'instant' ? 'Instant real-time alert' : 'Daily summary'}
                    {notifyWhatsapp && phone ? ` • WhatsApp (${phone})` : ''}
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      onClose();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    Done & Return to Inventory
                  </button>
                  <button
                    onClick={() => setActiveTab('manage')}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    View All Active Alerts
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Active Filter Criteria Preview */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Current Search Filter Criteria
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                    {filters.make ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-bold uppercase">
                        Make: {filters.make}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-200/60 text-slate-700">
                        All Makes
                      </span>
                    )}

                    {filters.model && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-bold uppercase">
                        Model: {filters.model}
                      </span>
                    )}

                    {filters.bodyType && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700">
                        {filters.bodyType}
                      </span>
                    )}

                    {filters.maxPrice < 100000 && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700">
                        Under ${filters.maxPrice.toLocaleString()}
                      </span>
                    )}

                    {filters.location && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700">
                        {filters.location}
                      </span>
                    )}

                    {filters.searchQuery && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700">
                        "{filters.searchQuery}"
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium">
                    You'll receive an alert the moment any unit matching these specs is imported or added to the yard.
                  </p>
                </div>

                {/* Email Address (Primary required) */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
                    <span>Email Address <strong className="text-rose-500">*</strong></span>
                    <span className="text-[10px] font-normal text-slate-400">Zero spam guarantee</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* WhatsApp Checkbox & Phone */}
                <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-3.5 space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={notifyWhatsapp}
                      onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#1fa357]" />
                      Also receive instant WhatsApp notifications
                    </span>
                  </label>

                  {notifyWhatsapp && (
                    <div className="pt-1">
                      <input
                        type="tel"
                        placeholder="WhatsApp Phone Number (+254 7...)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      />
                    </div>
                  )}
                </div>

                {/* Alert Frequency */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Notification Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFrequency('instant')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        frequency === 'instant'
                          ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 font-bold shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1">
                        <span>⚡ Instant Alert</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Immediately upon stock arrival
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFrequency('daily')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        frequency === 'daily'
                          ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 font-bold shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1">
                        <span>📅 Daily Summary</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Consolidated 8:00 AM digest
                      </div>
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Create Stock Alert</span>
                  </button>
                </div>
              </form>
            )
          ) : (
            /* Manage Saved Alerts Tab */
            <div className="space-y-3">
              {existingAlerts.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <Bell className="w-10 h-10 mx-auto stroke-1" />
                  <p className="text-xs font-bold text-slate-700">
                    No active stock alerts
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Subscribe with your email to track custom vehicle makes, models, and price brackets.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg"
                  >
                    Create First Alert
                  </button>
                </div>
              ) : (
                existingAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Filter className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{alert.summary}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Sent to: <strong className="text-slate-700">{alert.email}</strong>
                          {alert.phone ? ` • WhatsApp: ${alert.phone}` : ''}
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Delete alert"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
                      <span>Created {new Date(alert.createdAt).toLocaleDateString()}</span>
                      {onTriggerTestSimulation && (
                        <button
                          type="button"
                          onClick={() => onTriggerTestSimulation(alert)}
                          className="text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Test Alert Simulation
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Unsubscribe anytime in 1 click
          </span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
