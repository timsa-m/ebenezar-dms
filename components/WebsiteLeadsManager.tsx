'use client';

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from 'date-fns';
import {
  updateMessageStatus,
  updateHireRequestStatus,
  updateTradeInRequestStatus
} from '@/lib/actions/website.actions';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import { toast } from '@/lib/toast';
import {
  Mail,
  Car,
  Replace,
  Inbox,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Phone,
  Search,
  Eye,
  Send,
  MessageSquare,
  Sparkles,
  Check,
  X,
  Copy,
  RotateCcw,
  Gauge,
  SlidersHorizontal,
  CarFront,
  MessageCircleCheck,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import CustomModal from '@/components/ui/CustomModal';

export interface WebsiteMessage {
  id: string;
  created_at: string;
  name: string;
  email: string;
  message: string;
  status: 'new' | 'read';
}

export interface TradeInRequest {
  id: string;
  created_at: string;
  make_model: string;
  year: number;
  mileage: number;
  condition: string;
  name: string;
  phone: string;
  status: 'new' | 'contacted' | 'completed' | 'cancelled';
}

export interface HireRequest {
  id: string;
  created_at: string;
  vehicle_id?: string;
  vehicle_type?: string;
  vehicles?: { registration_no?: string; make_model?: string };
  name: string;
  phone: string;
  email?: string;
  duration_days?: number;
  intended_use?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  status: 'new' | 'contacted' | 'completed' | 'cancelled';
}

interface WebsiteLeadsManagerProps {
  messages: WebsiteMessage[];
  tradeInRequests: TradeInRequest[];
  hireRequests: HireRequest[];
}

type SelectedLead =
  | { type: 'message'; data: WebsiteMessage }
  | { type: 'tradein'; data: TradeInRequest }
  | { type: 'hire'; data: HireRequest };

export default function WebsiteLeadsManager({
  messages: initialMessages,
  tradeInRequests: initialTradeIn,
  hireRequests: initialHire
}: WebsiteLeadsManagerProps) {
  const [messages, setMessages] = useState<WebsiteMessage[]>(initialMessages || []);
  const [tradeInRequests, setTradeInRequests] = useState<TradeInRequest[]>(initialTradeIn || []);
  const [hireRequests, setHireRequests] = useState<HireRequest[]>(initialHire || []);

  const [activeTab, setActiveTab] = usePersistedState<'messages' | 'tradein'>('dms_leads_tab', 'messages');
  const [searchQuery, setSearchQuery] = usePersistedState('dms_leads_search', '');
  const [statusFilter, setStatusFilter] = usePersistedState<string>('dms_leads_status', 'all');
  const [isUpdating, setIsUpdating] = useState(false);

  // Selected lead for the Slide-Over Sheet Drawer
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null);
  const [copiedNotes, setCopiedNotes] = useState(false);

  const handleCopyNotes = (text: string) => {
    copyToClipboard(text, 'Notes');
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 2000);
  };

  // ---------------------------------------------------------
  // Handlers for updating lead statuses
  // ---------------------------------------------------------
  const handleMessageStatus = async (id: string, status: 'new' | 'read') => {
    setIsUpdating(true);
    try {
      const res = await updateMessageStatus(id, status);
      if (res.success) {
        const nextMessages = messages.map(m => m.id === id ? { ...m, status } : m);
        setMessages(nextMessages);
        if (selectedLead && selectedLead.type === 'message' && selectedLead.data.id === id) {
          setSelectedLead({
            type: 'message',
            data: { ...selectedLead.data, status }
          });
        }
        toast.success(status === 'read' ? 'Message marked as read' : 'Message marked as new');
        if (typeof window !== 'undefined') {
          const newMsg = nextMessages.filter(m => m.status === 'new').length;
          const newTrade = tradeInRequests.filter(t => t.status === 'new').length;
          const newHire = hireRequests.filter(h => h.status === 'new').length;
          const totalNew = newMsg + newTrade + newHire;
          const totalAll = nextMessages.length + tradeInRequests.length + hireRequests.length;
          const displayCount = totalNew > 0 ? totalNew : totalAll;
          window.dispatchEvent(new CustomEvent('website-messages-updated', { detail: { count: displayCount, totalNew, totalAll } }));
        }
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTradeInStatus = async (id: string, status: 'new' | 'contacted' | 'completed' | 'cancelled') => {
    setIsUpdating(true);
    try {
      const res = await updateTradeInRequestStatus(id, status);
      if (res.success) {
        const nextTradeIns = tradeInRequests.map(t => t.id === id ? { ...t, status } : t);
        setTradeInRequests(nextTradeIns);
        if (selectedLead && selectedLead.type === 'tradein' && selectedLead.data.id === id) {
          setSelectedLead({
            type: 'tradein',
            data: { ...selectedLead.data, status }
          });
        }
        toast.success(`Trade-in status updated to ${status}`);
        if (typeof window !== 'undefined') {
          const newMsg = messages.filter(m => m.status === 'new').length;
          const newTrade = nextTradeIns.filter(t => t.status === 'new').length;
          const newHire = hireRequests.filter(h => h.status === 'new').length;
          const totalNew = newMsg + newTrade + newHire;
          const totalAll = messages.length + nextTradeIns.length + hireRequests.length;
          const displayCount = totalNew > 0 ? totalNew : totalAll;
          window.dispatchEvent(new CustomEvent('website-messages-updated', { detail: { count: displayCount, totalNew, totalAll } }));
        }
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleHireStatus = async (id: string, status: 'new' | 'contacted' | 'completed' | 'cancelled') => {
    setIsUpdating(true);
    try {
      const res = await updateHireRequestStatus(id, status);
      if (res.success) {
        const nextHires = hireRequests.map(h => h.id === id ? { ...h, status } : h);
        setHireRequests(nextHires);
        if (selectedLead && selectedLead.type === 'hire' && selectedLead.data.id === id) {
          setSelectedLead({
            type: 'hire',
            data: { ...selectedLead.data, status }
          });
        }
        toast.success(`Hire request updated to ${status}`);
        if (typeof window !== 'undefined') {
          const newMsg = messages.filter(m => m.status === 'new').length;
          const newTrade = tradeInRequests.filter(t => t.status === 'new').length;
          const newHire = nextHires.filter(h => h.status === 'new').length;
          const totalNew = newMsg + newTrade + newHire;
          const totalAll = messages.length + tradeInRequests.length + nextHires.length;
          const displayCount = totalNew > 0 ? totalNew : totalAll;
          window.dispatchEvent(new CustomEvent('website-messages-updated', { detail: { count: displayCount, totalNew, totalAll } }));
        }
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  // ---------------------------------------------------------
  // Helpers & Formatters
  // ---------------------------------------------------------
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getWhatsAppUrl = (phone: string, text?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formatted = cleanPhone.startsWith('0') ? '254' + cleanPhone.substring(1) : cleanPhone;
    const encodedText = encodeURIComponent(text || 'Hello! Thank you for contacting Ebenezar Motors.');
    return `https://wa.me/${formatted}?text=${encodedText}`;
  };

  const formatDateSafe = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '-';
      return format(d, 'dd MMM yyyy, HH:mm');
    } catch {
      return dateString;
    }
  };

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <Badge className="badge badge-danger bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 shadow-none font-bold px-3 py-1 gap-1.5 transition-colors rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            New
          </Badge>
        );
      case 'read':
        return (
          <Badge variant="outline" className="badge badge-primary bg-slate-100/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 shadow-none font-bold px-3 py-1 rounded-full">
            Read
          </Badge>
        );
      case 'contacted':
        return (
          <Badge className="badge badge-warning bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 shadow-none font-bold px-3 py-1 gap-1.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            Contacted
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="badge badge-success bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 shadow-none font-bold px-3 py-1 gap-1.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="badge badge-destructive bg-slate-500/10 text-slate-500 border border-slate-500/20 hover:bg-slate-500/20 shadow-none font-bold px-3 py-1 rounded-full">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline" className="badge badge-primary px-3 py-1 capitalize font-bold rounded-full">{status}</Badge>;
    }
  };

  const getConditionBadge = (condition: string) => {
    const cond = (condition || '').toLowerCase();
    if (cond.includes('excellent') || cond.includes('mint')) {
      return <span className="badge badge-success inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">{condition}</span>;
    }
    if (cond.includes('good')) {
      return <span className="badge badge-success inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">{condition}</span>;
    }
    if (cond.includes('fair')) {
      return <span className="badge badge-warning inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{condition}</span>;
    }
    return <span className="badge badge-secondary inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{condition || 'Standard'}</span>;
  };

  // ---------------------------------------------------------
  // Metrics calculation
  // ---------------------------------------------------------
  const metrics = useMemo(() => {
    const newMessages = messages.filter(m => m.status === 'new').length;
    const newTradeIns = tradeInRequests.filter(t => t.status === 'new').length;
    const totalNew = newMessages + newTradeIns;
    const totalLeads = messages.length + tradeInRequests.length;
    const completedOrContacted = tradeInRequests.filter(t => t.status === 'contacted' || t.status === 'completed').length + messages.filter(m => m.status === 'read').length;
    const resolutionRate = totalLeads > 0 ? Math.round((completedOrContacted / totalLeads) * 100) : 100;

    return {
      newMessages,
      newTradeIns,
      totalNew,
      totalLeads,
      resolutionRate
    };
  }, [messages, tradeInRequests]);

  // ---------------------------------------------------------
  // Filtering logic
  // ---------------------------------------------------------
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      const matchesSearch =
        searchQuery === '' ||
        msg.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.message?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'new' && msg.status === 'new') ||
        (statusFilter === 'read' && msg.status === 'read') ||
        (statusFilter === 'action' && msg.status === 'new');

      return matchesSearch && matchesStatus;
    });
  }, [messages, searchQuery, statusFilter]);

  const filteredTradeIns = useMemo(() => {
    return tradeInRequests.filter(req => {
      const matchesSearch =
        searchQuery === '' ||
        req.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.make_model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.condition?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.year?.toString().includes(searchQuery);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'new' && req.status === 'new') ||
        (statusFilter === 'action' && req.status === 'new') ||
        req.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tradeInRequests, searchQuery, statusFilter]);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. Header & Title Section */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-4 sm:gap-5 pb-1 md:flex-row md:items-end md:justify-between relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent dark:from-indigo-950/20 blur-3xl"></div>
        <div className="space-y-2 z-10">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              Leads Center
            </h1>
            {metrics.totalNew > 0 && (
              <span className="badge badge-danger inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-xs animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                {metrics.totalNew} Action(s) Needed
              </span>
            )}
          </div>
          <p className="max-w-2xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Messages from the website, customer inquiries, and vehicle trade-in requests.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <div className="badge badge-primary flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/70 dark:bg-[#151D17]/80 backdrop-blur-md border border-slate-200/60 dark:border-[#29352D] text-slate-700 dark:text-[#C1CBC3] text-xs sm:text-sm font-semibold shadow-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Live Inbound Channel
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Executive KPI Summary Cards */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Leads */}
        <div className="card-premium bg-white dark:bg-[#151D17] border border-gray-200/70 dark:border-[#29352D] flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 dark:bg-orange-950/20 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div>
              <p className="text-12 font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-widest">Total Leads</p>
            </div>
            <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-orange-600 dark:text-orange-400 ring-1 ring-orange-100 dark:ring-orange-900/30">
              <Inbox className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-32 sm:text-36 font-bold text-gray-900 dark:text-[#F4F7F4] tabular-nums">{metrics.totalLeads}</h2>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="badge badge-error">Messages + Trade-ins</span>
            </div>
          </div>
        </div>

        {/* Awaiting Action */}
        <div className="card-premium bg-white dark:bg-[#151D17] border border-gray-200/70 dark:border-[#29352D] flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-success-50 dark:bg-emerald-950/20 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div>
              <p className="text-12 font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-widest">Awaiting Action</p>
            </div>
            <div className="p-2 bg-success-50 dark:bg-emerald-950/30 rounded-lg text-success-600 dark:text-emerald-400 ring-1 ring-success-100 dark:ring-emerald-900/30">
              <AlertCircle className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-32 sm:text-36 font-bold text-gray-900 dark:text-[#F4F7F4] tabular-nums">{metrics.totalNew}</h2>
            <div className="mt-2.5 flex items-center gap-2">
              {metrics.totalNew > 0 ? (
                <span className="badge badge-success">NEW</span>
              ) : (
                <span className="badge badge-success">NO ISSUE</span>
              )}
              <p className="text-12 text-gray-500 dark:text-[#A1ADA4] font-medium">Pending initial response</p>
            </div>
          </div>
        </div>

        {/* Trade-In Requests */}
        <div className="card-premium bg-white dark:bg-[#151D17] border border-gray-200/70 dark:border-[#29352D] flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 dark:bg-amber-950/20 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div>
              <p className="text-12 font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-widest">Trade-In Requests</p>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-amber-600 dark:text-amber-400 ring-1 ring-amber-100 dark:ring-amber-900/30">
              <Replace className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-32 sm:text-36 font-bold text-gray-900 dark:text-[#F4F7F4] tabular-nums">{tradeInRequests.length}</h2>
            <div className="mt-2.5 flex items-center gap-2">
              {metrics.newTradeIns > 0 ? (
                <span className="badge badge-warning">NEW</span>
              ) : (
                <span className="badge badge-success">NO ISSUE</span>
              )}
              <p className="text-12 text-gray-500 dark:text-[#A1ADA4] font-medium">Appraisal requests</p>
            </div>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="card-premium bg-white dark:bg-[#151D17] border border-gray-200/70 dark:border-[#29352D] flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-rose-950/20 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div>
              <p className="text-12 font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-widest">Resolution Rate</p>
            </div>
            <div className="p-2 bg-red-50 dark:bg-rose-950/30 rounded-lg text-red-600 dark:text-rose-400 ring-1 ring-red-100 dark:ring-rose-900/30">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-32 sm:text-36 font-bold text-gray-900 dark:text-[#F4F7F4] tabular-nums">{metrics.resolutionRate}%</h2>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="badge badge-success">Processed or contacted</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. Main Card with Tabs & Live Controls */}
      {/* ========================================================= */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#29352D] bg-white dark:bg-[#151D17] shadow-sm">
        <Tabs
          value={activeTab}
          onValueChange={(val: string) => setActiveTab(val as 'messages' | 'tradein')}
          className="w-full"
        >
          {/* Top Control Bar: Tabs + Search + Filter */}
          <div className="border-b border-slate-200/70 dark:border-[#29352D] bg-slate-50/60 dark:bg-[#101612]/60 p-3 sm:p-4 lg:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
              {/* Segmented Control Pill Tabs */}
              <TabsList className="inline-flex h-11 w-full sm:w-auto items-center rounded-xl bg-slate-200/60 dark:bg-[#101612] p-1 border border-slate-200 dark:border-[#29352D]">
                <TabsTrigger
                  value="messages"
                  className="flex-1 sm:flex-initial flex h-9 items-center justify-center gap-2 rounded-lg px-3 sm:px-4 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#1D2920] data-[state=active]:text-indigo-600 dark:data-[state=active]:text-[#B7FF3C] data-[state=active]:shadow-xs"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  <span>General Messages</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs shrink-0 ${
                    metrics.newMessages > 0
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-200 dark:bg-[#101612] text-slate-700 dark:text-[#A1ADA4]'
                  }`}>
                    {metrics.newMessages > 0 ? metrics.newMessages : messages.length}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="tradein"
                  className="flex-1 sm:flex-initial flex h-9 items-center justify-center gap-2 rounded-lg px-3 sm:px-4 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#1D2920] data-[state=active]:text-amber-600 dark:data-[state=active]:text-[#B7FF3C] data-[state=active]:shadow-xs"
                >
                  <Replace className="h-4 w-4 shrink-0" />
                  <span>Vehicle Trade-Ins</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs shrink-0 ${
                    metrics.newTradeIns > 0
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 dark:bg-[#101612] text-slate-700 dark:text-[#A1ADA4]'
                  }`}>
                    {metrics.newTradeIns > 0 ? metrics.newTradeIns : tradeInRequests.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* Search & Status Filter cluster */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
                <div className="search-box w-full sm:w-64 md:w-72">
                  <Search className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input w-full"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-full sm:w-40 rounded-xl justify-between gap-2 border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#101612] text-slate-800 dark:text-[#F4F7F4] text-xs sm:text-sm font-semibold shadow-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <SelectValue placeholder="All Statuses" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#151D17] text-slate-800 dark:text-[#F4F7F4] font-semibold text-xs sm:text-sm">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New Only</SelectItem>
                    {activeTab === 'messages' ? (
                      <SelectItem value="read">Read Only</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    onClick={resetFilters}
                    className="h-10 px-3.5 rounded-xl text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-all shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Active Filter Indicators Bar */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/50 dark:border-[#29352D]/60 text-xs font-semibold text-slate-500 dark:text-[#A1ADA4]">
              <div>
                {activeTab === 'messages' ? (
                  <span>
                    Showing <strong className="text-indigo-600 dark:text-[#B7FF3C] text-xs sm:text-sm">{filteredMessages.length}</strong> of {messages.length} messages
                  </span>
                ) : (
                  <span>
                    Showing <strong className="text-indigo-600 dark:text-[#B7FF3C] text-xs sm:text-sm">{filteredTradeIns.length}</strong> of {tradeInRequests.length} trade-in inquiries
                  </span>
                )}
              </div>
              {hasActiveFilters && (
                <span className="badge badge-primary rounded-full border border-indigo-500/30 bg-indigo-500/10 dark:bg-indigo-950/40 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                  Filters Active
                </span>
              )}
            </div>
          </div>

          {/* ======================================================= */}
          {/* TAB 1: MESSAGES STREAM / CARDS */}
          {/* ======================================================= */}
          <TabsContent value="messages" className="m-0 focus-visible:outline-none p-4 sm:p-5 lg:p-6 bg-slate-50/20 dark:bg-transparent">
            {filteredMessages.length === 0 ? (
              <div className="px-4 py-16 sm:py-20 text-center flex flex-col items-center justify-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#1D2920] shadow-inner text-slate-400">
                  <Inbox className="h-6 w-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-[#F4F7F4]">
                  {hasActiveFilters ? 'No matching messages found' : 'Inbox Zero!'}
                </h3>
                <p className="mt-1.5 max-w-sm text-xs sm:text-sm font-medium text-slate-500 dark:text-[#A1ADA4]">
                  {hasActiveFilters
                    ? 'Try adjusting your search criteria or clearing active filters to find what you are looking for.'
                    : 'Customer inquiries submitted via the website contact form will appear here in real time.'}
                </p>
                {hasActiveFilters && (
                  <Button
                    onClick={resetFilters}
                    className="mt-5 font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-[#B7FF3C] dark:hover:bg-[#a3e635] text-white dark:text-[#090C0A] shadow-md shadow-indigo-500/20 text-xs sm:text-sm cursor-pointer"
                  >
                    Clear Search & Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 sm:gap-4">
                {filteredMessages.map((msg) => {
                  const isUnread = msg.status === 'new';
                  const initials = (msg.name || 'User')
                    .split(' ')
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <Card
                      key={msg.id}
                      className={`group relative overflow-hidden rounded-2xl transition-all duration-200 border ${
                        isUnread
                          ? 'bg-white dark:bg-[#151D17] border-indigo-200 dark:border-indigo-900/60 shadow-xs'
                          : 'bg-white dark:bg-[#151D17] border-slate-200/80 dark:border-[#29352D] hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {isUnread && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 dark:bg-[#B7FF3C]" />
                      )}
                      <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Contact Info & Message Preview */}
                        <div
                          className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0 cursor-pointer"
                          onClick={() => setSelectedLead({ type: 'message', data: msg })}
                        >
                          {/* Avatar */}
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs sm:text-sm font-bold shadow-xs ${
                              isUnread
                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                                : 'bg-slate-100 dark:bg-[#1D2920] text-slate-600 dark:text-[#C1CBC3] border border-slate-200 dark:border-[#29352D]'
                            }`}
                          >
                            {initials}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#F4F7F4] group-hover:text-indigo-600 dark:group-hover:text-[#B7FF3C] transition-colors truncate">
                                {msg.name}
                              </span>
                              {getStatusBadge(msg.status)}
                              <span className="text-xs font-medium text-slate-400 dark:text-[#A1ADA4]">
                                • {formatRelativeTime(msg.created_at)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 dark:text-[#A1ADA4]">
                              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{msg.email}</span>
                            </div>

                            <p className="line-clamp-2 text-xs sm:text-sm font-normal leading-relaxed text-slate-600 dark:text-[#C1CBC3]">
                              {msg.message}
                            </p>
                          </div>
                        </div>

                        {/* Right: Actions Cluster */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-3 lg:pt-0 border-t border-slate-100 dark:border-slate-800 lg:border-t-0 shrink-0">
                          {/* Toggle Read/New */}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleMessageStatus(msg.id, isUnread ? 'read' : 'new')}
                            className="h-9 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-[#C1CBC3] hover:bg-slate-100 dark:hover:bg-[#1D2920] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                            title={isUnread ? 'Mark as Read' : 'Mark as New'}
                          >
                            {isUnread ? (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                                Mark Read
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                                Mark New
                              </>
                            )}
                          </Button>

                          {/* Quick Mailto */}
                          <a
                            href={`mailto:${msg.email}?subject=Ebenezar Motors - In Response to your inquiry`}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-[#B7FF3C] dark:hover:bg-[#a3e635] px-3.5 text-xs font-bold text-white dark:text-[#090C0A] transition-all shadow-xs cursor-pointer"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Reply
                          </a>

                          {/* Full View Drawer Trigger */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLead({ type: 'message', data: msg })}
                            className="h-9 px-3.5 rounded-xl border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#101612] text-xs font-bold text-slate-700 dark:text-[#F4F7F4] hover:bg-slate-50 dark:hover:bg-[#1D2920] hover:text-indigo-600 dark:hover:text-[#B7FF3C] transition-all cursor-pointer shadow-xs"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ======================================================= */}
          {/* TAB 2: TRADE-IN REQUESTS STREAM / CARDS */}
          {/* ======================================================= */}
          <TabsContent value="tradein" className="m-0 focus-visible:outline-none p-4 sm:p-5 lg:p-6 bg-slate-50/20 dark:bg-transparent">
            {filteredTradeIns.length === 0 ? (
              <div className="px-4 py-16 sm:py-20 text-center flex flex-col items-center justify-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#1D2920] shadow-inner text-slate-400">
                  <Replace className="h-6 w-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-[#F4F7F4]">
                  {hasActiveFilters ? 'No matching trade-in requests found' : 'No vehicle trade-in requests'}
                </h3>
                <p className="mt-1.5 max-w-sm text-xs sm:text-sm font-medium text-slate-500 dark:text-[#A1ADA4]">
                  {hasActiveFilters
                    ? 'Try adjusting your vehicle model or status filter.'
                    : 'Customer vehicle trade-in submissions and valuation requests will be cataloged here.'}
                </p>
                {hasActiveFilters && (
                  <Button
                    onClick={resetFilters}
                    className="mt-5 font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-[#B7FF3C] dark:hover:bg-[#a3e635] text-white dark:text-[#090C0A] shadow-md shadow-indigo-500/20 text-xs sm:text-sm cursor-pointer"
                  >
                    Clear Search & Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 sm:gap-4">
                {filteredTradeIns.map((req) => {
                  const isNew = req.status === 'new';

                  return (
                    <div
                      key={req.id}
                      className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all duration-200 border ${
                        isNew
                          ? 'bg-white dark:bg-[#151D17] border-amber-200 dark:border-amber-900/60 shadow-xs'
                          : 'bg-white dark:bg-[#151D17] border-slate-200/80 dark:border-[#29352D] hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {isNew && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                      )}

                      {/* Left: Vehicle Specs & Details */}
                      <div
                        className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedLead({ type: 'tradein', data: req })}
                      >
                        {/* Vehicle Icon Badge */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs transition-all ${
                            isNew
                              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400'
                              : 'bg-slate-100 dark:bg-[#1D2920] border-slate-200 dark:border-[#29352D] text-slate-400 dark:text-[#A1ADA4]'
                          }`}
                        >
                          <CarFront className="h-5 w-5" />
                        </div>

                        {/* Vehicle Details */}
                        <div className="space-y-1.5 sm:space-y-2 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#F4F7F4] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                              {req.make_model}
                            </span>
                            {req.year > 0 && (
                              <span className="rounded-md px-2 py-0.5 text-xs font-bold bg-slate-100 dark:bg-[#1D2920] text-slate-600 dark:text-[#C1CBC3] border border-slate-200/60 dark:border-[#29352D]">
                                {req.year}
                              </span>
                            )}
                            {getStatusBadge(req.status)}
                          </div>

                          {/* Quick Specs Chips */}
                          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-slate-500 dark:text-[#A1ADA4]">
                            {req.mileage > 0 && (
                              <span className="inline-flex items-center gap-1 font-semibold">
                                <Gauge className="h-3.5 w-3.5 text-slate-400" />
                                {req.mileage.toLocaleString()} km
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 font-bold">
                              {getConditionBadge(req.condition)}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-xs text-slate-400 dark:text-[#A1ADA4]">
                              {formatRelativeTime(req.created_at)}
                            </span>
                          </div>

                          {/* Customer Contact Subline */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm font-semibold text-slate-600 dark:text-[#C1CBC3]">
                            <span className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              {req.name}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                              <Phone className="h-3.5 w-3.5" />
                              {req.phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Dropdown & Buttons */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-3 lg:pt-0 border-t border-slate-100 dark:border-slate-800 lg:border-t-0 shrink-0">
                        {/* Status Select */}
                        <Select
                          value={req.status}
                          onValueChange={(val: string) => handleTradeInStatus(req.id, val as any)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="h-9 w-full sm:w-[130px] rounded-xl justify-between gap-1.5 border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#101612] text-xs font-bold shadow-xs">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl font-bold shadow-xl border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#151D17] text-xs">
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Direct WhatsApp trigger */}
                        <a
                          href={getWhatsAppUrl(req.phone, `Hello ${req.name}, regarding your trade-in appraisal for the ${req.make_model} on Ebenezar Motors:`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 px-3.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircleCheck className="h-3.5 w-3.5 scale-x-[-1]" />
                          WhatsApp
                        </a>

                        {/* Call trigger */}
                        <a
                          href={`tel:${req.phone}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#101612] text-slate-700 dark:text-[#C1CBC3] hover:bg-slate-100 dark:hover:bg-[#1D2920] transition-all shadow-xs cursor-pointer"
                          title="Call client"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>

                        {/* Appraisal Details Trigger */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLead({ type: 'tradein', data: req })}
                          className="h-9 px-3.5 rounded-xl border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#101612] text-xs font-bold text-slate-700 dark:text-[#F4F7F4] hover:bg-slate-50 dark:hover:bg-[#1D2920] hover:text-amber-600 dark:hover:text-[#B7FF3C] transition-all cursor-pointer shadow-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ========================================================= */}
      {/* 4. Lead Details Custom Modal                             */}
      {/* ========================================================= */}
      {selectedLead && (
        <CustomModal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          title={
            selectedLead.type === 'message'
              ? 'Lead Inquiry — ' + selectedLead.data.name
              : 'Trade-In Request — ' + (selectedLead.data as TradeInRequest).make_model
          }
          width={640}
        >
          <div className="flex flex-col gap-4 text-left">
            {/* Top Status & Date Banner */}
            <div className="flex items-center justify-between pb-3 flex-wrap gap-2 border-b border-slate-100 dark:border-[#29352D]">
              <div className="flex items-center gap-2">
                {selectedLead.type === 'message' ? (
                  <span className="badge badge-primary inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-11 font-bold uppercase tracking-wider">
                    <Mail className="size-3" />
                    Website Inquiry
                  </span>
                ) : (
                  <span className="badge badge-primary inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-11 font-bold uppercase tracking-wider">
                    <Car className="size-3" />
                    Trade-In Request
                  </span>
                )}
                {getStatusBadge(selectedLead.data.status)}
              </div>
              <span className="text-12 font-medium text-gray-500 dark:text-[#A1ADA4]">
                {selectedLead.data.created_at
                  ? format(new Date(selectedLead.data.created_at), 'MMMM dd, yyyy · hh:mm a')
                  : 'N/A'}
              </span>
            </div>

            {/* Buyer & Vehicle Deal Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              {/* Contact Card */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#101612] border border-slate-200/70 dark:border-[#29352D] flex flex-col gap-1.5">
                <span className="text-10 font-bold uppercase tracking-wider text-gray-400 dark:text-[#A1ADA4] flex items-center gap-1">
                  <User className="size-3" />
                  Contact Details
                </span>
                <p className="text-13 sm:text-14 font-bold text-gray-900 dark:text-[#F4F7F4]">{selectedLead.data.name}</p>
                <div className="text-11 sm:text-12 text-gray-600 dark:text-[#C1CBC3] flex flex-col gap-1">
                  {'email' in selectedLead.data && selectedLead.data.email && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 dark:text-[#A1ADA4] shrink-0">Email:</span>
                      <span className="font-medium font-roboto truncate flex-1 text-right">{selectedLead.data.email}</span>
                      <button
                        onClick={() => copyToClipboard((selectedLead.data as { email: string }).email, 'Email')}
                        className="text-gray-400 hover:text-indigo-600 dark:hover:text-[#B7FF3C] transition-colors shrink-0 p-0.5 cursor-pointer"
                        title="Copy email"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                  )}
                  {'phone' in selectedLead.data && selectedLead.data.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-gray-400 dark:text-[#A1ADA4] shrink-0">Phone:</span>
                      <span className="font-medium font-roboto text-right">{selectedLead.data.phone}</span>
                      <button
                        onClick={() => copyToClipboard((selectedLead.data as { phone: string }).phone, 'Phone number')}
                        className="text-gray-400 hover:text-indigo-600 dark:hover:text-[#B7FF3C] transition-colors shrink-0 p-0.5 cursor-pointer"
                        title="Copy phone"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle / Submission info card */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#101612] border border-slate-200/70 dark:border-[#29352D] flex flex-col gap-1.5">
                {selectedLead.type === 'tradein' ? (
                  <>
                    <span className="text-10 font-bold uppercase tracking-wider text-gray-400 dark:text-[#A1ADA4] flex items-center gap-1">
                      <CarFront className="size-3" />
                      Vehicle & Appraisal Info
                    </span>
                    <p className="text-13 sm:text-14 font-bold text-gray-900 dark:text-[#F4F7F4] truncate">
                      {(selectedLead.data as TradeInRequest).make_model}
                    </p>
                    <div className="text-11 sm:text-12 text-gray-600 dark:text-[#C1CBC3] flex flex-col gap-1">
                      <p>
                        <span className="text-gray-400 dark:text-[#A1ADA4]">Year: </span>
                        <span className="font-bold font-roboto text-gray-800 dark:text-[#F4F7F4]">{(selectedLead.data as TradeInRequest).year || 'N/A'}</span>
                      </p>
                      <p>
                        <span className="text-gray-400 dark:text-[#A1ADA4]">Mileage: </span>
                        <span className="font-medium font-roboto">{(selectedLead.data as TradeInRequest).mileage ? (selectedLead.data as TradeInRequest).mileage.toLocaleString() + ' km' : 'Not stated'}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="text-gray-400 dark:text-[#A1ADA4]">Condition: </span>
                        {getConditionBadge((selectedLead.data as TradeInRequest).condition)}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-10 font-bold uppercase tracking-wider text-gray-400 dark:text-[#A1ADA4] flex items-center gap-1">
                      <Inbox className="size-3" />
                      Submission Info
                    </span>
                    <p className="text-13 sm:text-14 font-bold text-gray-900 dark:text-[#F4F7F4]">Website Contact Form</p>
                    <div className="text-11 sm:text-12 text-gray-600 dark:text-[#C1CBC3] flex flex-col gap-1">
                      <p>
                        <span className="text-gray-400 dark:text-[#A1ADA4]">Channel: </span>
                        <span className="font-medium">Direct Inbound Lead</span>
                      </p>
                      <p>
                        <span className="text-gray-400 dark:text-[#A1ADA4]">Status: </span>
                        <span className="font-medium capitalize">{selectedLead.data.status}</span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Contact Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {'email' in selectedLead.data && selectedLead.data.email && (
                <a
                  href={`mailto:${selectedLead.data.email}?subject=Ebenezar Motors - Follow-up on your website submission`}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-12 font-bold bg-white dark:bg-[#151D17] border border-gray-200 dark:border-[#29352D] text-gray-700 dark:text-[#C1CBC3] hover:text-indigo-600 dark:hover:text-[#B7FF3C] hover:bg-indigo-50 dark:hover:bg-[#1D2920] transition-all shadow-xs cursor-pointer"
                >
                  <Mail className="size-3.5 text-indigo-500" />
                  Send Email
                </a>
              )}
              {'phone' in selectedLead.data && selectedLead.data.phone && (
                <>
                  <a
                    href={`tel:${selectedLead.data.phone}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-12 font-bold bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all shadow-xs cursor-pointer"
                  >
                    <Phone className="size-3.5 text-blue-500" />
                    Call Client
                  </a>
                  <a
                    href={getWhatsAppUrl(selectedLead.data.phone, 'Hello ' + selectedLead.data.name + ', this is Ebenezar Motors regarding your inquiry:')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-12 font-bold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all shadow-xs cursor-pointer"
                  >
                    <MessageCircleCheck className="size-3.5 text-emerald-600 scale-x-[-1]" />
                    WhatsApp
                  </a>
                </>
              )}
            </div>

            {/* Interaction Notes & Transcript */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-10.5 font-bold text-gray-500 dark:text-[#A1ADA4] tracking-wider flex items-center gap-1.5 uppercase">
                  <FileText className="text-blue-600 dark:text-blue-400 size-3.5" />
                  {selectedLead.type === 'message' ? 'Interaction Info & Notes' : 'Appraisal Details & Notes'}
                </span>
                <button
                  onClick={() =>
                    handleCopyNotes(
                      selectedLead.type === 'message'
                        ? (selectedLead.data.message || '')
                        : 'Vehicle: ' + (selectedLead.data as TradeInRequest).make_model + ' (' + ((selectedLead.data as TradeInRequest).year || 'N/A') + ')\nMileage: ' + ((selectedLead.data as TradeInRequest).mileage ? String((selectedLead.data as TradeInRequest).mileage.toLocaleString()) + ' km' : 'Not stated') + '\nCondition: ' + ((selectedLead.data as TradeInRequest).condition || 'N/A') + '\nCustomer: ' + selectedLead.data.name + '\nPhone: ' + (selectedLead.data as TradeInRequest).phone
                    )
                  }
                  className="badge badge-primary text-11 font-semibold text-slate-700 dark:text-[#C1CBC3] hover:text-slate-900 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-[#29352D] bg-white dark:bg-[#151D17] cursor-pointer"
                >
                  {copiedNotes ? (
                    <>
                      <Check className="size-3 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      Copy Notes
                    </>
                  )}
                </button>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200 dark:border-[#29352D] bg-slate-50/70 dark:bg-[#101612] text-xs sm:text-13 font-medium text-gray-800 dark:text-[#C1CBC3] leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto">
                {selectedLead.type === 'message'
                  ? (selectedLead.data.message || '(No message notes recorded)')
                  : ('Vehicle: ' + (selectedLead.data as TradeInRequest).make_model + ' (' + ((selectedLead.data as TradeInRequest).year || 'N/A') + ')\nMileage: ' + ((selectedLead.data as TradeInRequest).mileage ? String((selectedLead.data as TradeInRequest).mileage.toLocaleString()) + ' km' : 'Not stated') + '\nCondition: ' + ((selectedLead.data as TradeInRequest).condition || 'N/A') + '\nCustomer: ' + selectedLead.data.name + '\nPhone: ' + (selectedLead.data as TradeInRequest).phone)}
              </div>
            </div>

            {/* Pipeline Status Workflow */}
            <div className="flex flex-col gap-2">
              <span className="text-10.5 font-bold text-gray-500 dark:text-[#A1ADA4] uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5 text-indigo-500" />
                Pipeline Status
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-12 font-bold text-gray-700 dark:text-[#F4F7F4]">Update Status:</span>
                {selectedLead.type === 'message' ? (
                  <Select
                    value={selectedLead.data.status}
                    onValueChange={(val: string) => { void handleMessageStatus(selectedLead.data.id, val as any) }}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="h-9 w-full sm:w-[170px] rounded-xl border-indigo-200 dark:border-indigo-900/50 bg-white dark:bg-[#101612] text-slate-800 dark:text-[#F4F7F4] text-12 font-bold shadow-xs cursor-pointer">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl font-bold text-12 border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#151D17] z-[99999]">
                      <SelectItem value="new">New (Unread)</SelectItem>
                      <SelectItem value="read">Mark as Read</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={selectedLead.data.status}
                    onValueChange={(val: string) => { void handleTradeInStatus(selectedLead.data.id, val as any) }}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="h-9 w-full sm:w-[170px] rounded-xl border-indigo-200 dark:border-indigo-900/50 bg-white dark:bg-[#101612] text-slate-800 dark:text-[#F4F7F4] text-12 font-bold shadow-xs cursor-pointer">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl font-bold text-12 border-slate-200 dark:border-[#29352D] bg-white dark:bg-[#151D17] z-[99999]">
                      <SelectItem value="new">New Lead</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Delivery Metadata & Diagnostics */}
            <div className="pt-2.5 border-t border-gray-100 dark:border-[#29352D] flex flex-wrap items-center justify-between gap-2 text-11 text-gray-400 dark:text-[#A1ADA4] font-google-sans">
              <span>Lead ID: {selectedLead.data.id}</span>
              <span>
                Received:{' '}
                {selectedLead.data.created_at
                  ? format(new Date(selectedLead.data.created_at), 'MMMM dd, yyyy · hh:mm a')
                  : 'N/A'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 rounded-xl border border-red-200 dark:border-rose-900/40 text-13 font-bold bg-red-50 dark:bg-rose-950/20 text-red-700 dark:text-rose-400 hover:bg-red-100 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </CustomModal>
      )}
    </div>
  );
}
