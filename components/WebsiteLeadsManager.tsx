'use client';

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from 'date-fns';
import {
  updateMessageStatus,
  updateHireRequestStatus,
  updateTradeInRequestStatus
} from '@/lib/actions/website.actions';
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

  const [activeTab, setActiveTab] = useState<'messages' | 'tradein'>('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
        setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
        if (selectedLead && selectedLead.type === 'message' && selectedLead.data.id === id) {
          setSelectedLead({
            type: 'message',
            data: { ...selectedLead.data, status }
          });
        }
        toast.success(status === 'read' ? 'Message marked as read' : 'Message marked as new');
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
        setTradeInRequests(prev => prev.map(t => t.id === id ? { ...t, status } : t));
        if (selectedLead && selectedLead.type === 'tradein' && selectedLead.data.id === id) {
          setSelectedLead({
            type: 'tradein',
            data: { ...selectedLead.data, status }
          });
        }
        toast.success(`Trade-in status updated to ${status}`);
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
    const res = await updateHireRequestStatus(id, status);
    if (res.success) {
      setHireRequests(prev => prev.map(h => h.id === id ? { ...h, status } : h));
      if (selectedLead && selectedLead.type === 'hire' && selectedLead.data.id === id) {
        setSelectedLead({
          type: 'hire',
          data: { ...selectedLead.data, status }
        });
      }
      toast.success(`Hire request updated to ${status}`);
    } else {
      toast.error('Failed to update status');
    }
    setIsUpdating(false);
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
    <div>
      {/* ========================================================= */}
      {/* 1. Header & Title Section */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-5 pb-6 md:flex-row md:items-end md:justify-between relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent dark:from-indigo-900/20 blur-3xl"></div>
        <div className="space-y-3 z-10">
          <div className="flex items-center gap-x-4 gap-y-2">
            <br />
            <br />
            <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 sm:text-3xl">
              Leads Center
            </h1>
            {metrics.totalNew > 0 && (
              <span className="badge badge-danger inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-sm animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2"></span>
                {metrics.totalNew} Action(s) Needed
              </span>
            )}
          </div>
          <p className="max-w-2xl left-3 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Messages from the Website, Customer inquiries and Vehicle trade-in requests.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <div className="badge badge-primary flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-sm font-semibold shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Live Inbound Channel
          </div>
        </div>
      </div>
      <br />
      <br />

      {/* ========================================================= */}
      {/* 2. Executive KPI Summary Cards */}
      {/* ========================================================= */}

      {/* 2. KPI Summary Cards — 4 equal columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

        {/* Total Leads */}
        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Total Leads</p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600 ring-1 ring-orange-100">
              <Inbox className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{metrics.totalLeads}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-error">Messages + Trade-ins</span>
            </div>
          </div>
        </div>

        {/* Awaiting Action */}
        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-success-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Awaiting Action</p>
            </div>
            <div className="p-2 bg-success-50 rounded-lg text-success-600 ring-1 ring-success-100">
              <AlertCircle className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{metrics.totalNew}</h2>
            <div className="mt-3 flex items-center gap-2">
              {metrics.totalNew > 0 &&
                <span className="badge badge-success">NEW</span>
              }
              {metrics.totalNew === 0 &&
                <span className="badge badge-success">NO ISSUE</span>
              }
              <p className="text-12 text-gray-500 font-medium">Pending initial response</p>
            </div>
          </div>
        </div>

        {/* Trade-In Requests */}
        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Trade-In Requests</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 ring-1 ring-amber-100">
              <Replace className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{tradeInRequests.length}</h2>
            <div className="mt-3 flex items-center gap-2">
              {metrics.newTradeIns > 0 &&
                <span className="badge badge-warning">NEW</span>
              }
              {metrics.newTradeIns === 0 &&
                <span className="badge badge-success">NO ISSUE</span>
              }
              <p className="text-12 text-gray-500 font-medium">Appraisal requests</p>
            </div>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Resolution Rate</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600 ring-1 ring-red-100">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{metrics.resolutionRate}%</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-success">Processed or contacted</span>
            </div>
          </div>
        </div>

      </div>
      <br />

      {/* ========================================================= */}
      {/* 3. Main Card with Tabs & Live Controls */}
      {/* ========================================================= */}
      <div className="overflow-hidden rounded-xl border border-white/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl shadow-2xl relative top-3 min-h-[calc(100vh-200px)] z-10">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as 'messages' | 'tradein')}
          className="w-full"
        >
          {/* Top Control Bar: Tabs + Search + Filter */}
          <div className="space-y-5 border-b border-white/40 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 p-6 lg:p-8 backdrop-blur-md">
            <div className="flex flex-col md:flex-row md:items-center relative justify-between gap-5">
              {/* Segmented Control Pill Tabs */}
              <TabsList className="inline-flex h-9 self-start relative top-3 left-3 rounded-2xl bg-slate-200/50 dark:bg-slate-950/50 p-1 md:self-auto backdrop-blur-sm border border-white/20 dark:border-slate-800">
                <TabsTrigger
                  value="messages"
                  className="badge badge-primary flex h-9.5 items-center gap-2.5 rounded-xl px-5 text-sm font-bold text-slate-600 dark:text-slate-400 transition-all data-[state=active]:bg-purple-50 data-[state=active]:dark:bg-slate-800 data-[state=active]:text-indigo-600 data-[state=active]:dark:text-indigo-400 data-[state=active]:shadow-md"
                >
                  <Mail className="h-4 w-4" />
                  <span>General Messages</span>
                  <span className={`badge badge-primary text-[10px] font-black px-2 py-0.5 rounded-xl shadow-sm ${metrics.newMessages > 0
                    ? 'bg-rose-500 text-white'
                    : 'bg-purple-100 text-purple-600 dark:text-purple-300'
                    }`}>
                    {metrics.newMessages > 0 ? metrics.newMessages : messages.length}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="tradein"
                  className="badge badge-primary flex h-9.5 items-center gap-2.5 rounded-xl px-5 text-sm font-bold text-slate-600 dark:text-slate-400 transition-all data-[state=active]:bg-amber-50 data-[state=active]:dark:bg-amber-800 data-[state=active]:text-amber-600 data-[state=active]:dark:text-amber-400 data-[state=active]:shadow-md"
                >
                  <Replace className="h-4 w-4" />
                  <span>Vehicle Trade-Ins</span>
                  <span className={`badge badge-primary text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm ${metrics.newTradeIns > 0
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-200 dark:bg-amber-700 text-amber-600 dark:text-amber-300'
                    }`}>
                    {metrics.newTradeIns > 0 ? metrics.newTradeIns : tradeInRequests.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* Search & Status Filter cluster */}
              <div className="flex gap-3 relative start-end top-3 right-3">
                {/* Search Bar */}
                <div className="flex items-center gap-3">
                  <div className="search-box">
                    <Search className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>

                {/* Status Dropdown Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[150px] rounded-xl justify-center gap-2 border-white/50 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-sm font-semibold shadow-sm backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-indigo-500/50">
                    <div className="flex items-center gap-1 truncate">
                      <SlidersHorizontal className="h-4 w-4 text-slate-500 shrink-0" />
                      <SelectValue placeholder="All Statuses" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-slate-200 dark:border-slate-800 font-semibold">
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

                {/* Reset Filters Button */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    onClick={resetFilters}
                    className="badge badge-primary h-9 px-4 rounded-xl text-sm font-bold text-red-500 bg-red-100 hover:bg-red-200 dark:hover:bg-red-800 hover:text-red-800 dark:hover:text-red-200 transition-all"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Active Filter Indicators Bar */}
            <div className="flex items-center justify-between relative top-7 left-6 right-3 max-w-[95%] gap-3 text-xs font-semibold text-slate-500">
              <div>
                {activeTab === 'messages' ? (
                  <span>
                    Showing <strong className="text-indigo-600 dark:text-indigo-400 text-sm">{filteredMessages.length}</strong> of {messages.length} messages
                  </span>
                ) : (
                  <span>
                    Showing <strong className="text-indigo-600 dark:text-indigo-400 text-sm">{filteredTradeIns.length}</strong> of {tradeInRequests.length} trade-in inquiries
                  </span>
                )}
              </div>
              {hasActiveFilters && (
                <span className="badge badge-primary rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 shadow-sm">
                  Filters Active
                </span>
              )}
            </div>
          </div>
          <br />

          {/* ======================================================= */}
          {/* TAB 1: MESSAGES STREAM / CARDS */}
          {/* ======================================================= */}
          <div className="max-w-[95%] left-[2.5%] top-5 relative mt-100">
            <TabsContent value="messages" className="m-9 focus-visible:outline-none p-4 lg:p-6 bg-white/20 dark:bg-slate-950/20 mt-6 mb-6 top-10 left-5">
              {filteredMessages.length === 0 ? (
                <div className="px-4 py-20 text-center flex flex-col items-center justify-center mb-6 mt-6">
                  <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800 shadow-inner">
                    <Inbox className="h-7 w-7 text-slate-400" />
                  </div>
                  <h3 className="text-l font-bold text-slate-800 dark:text-slate-200">
                    {hasActiveFilters ? 'No matching messages found' : 'Inbox Zero!'}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">
                    {hasActiveFilters
                      ? 'Try adjusting your search criteria or clearing active filters to find what you are looking for.'
                      : 'Customer inquiries submitted via the website contact form will appear here in real time.'}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      onClick={resetFilters}
                      className="badge badge-primary mt-6 font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30"
                    >
                      Clear Search & Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
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
                        className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl ${isUnread
                          ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/50 shadow-md dark:shadow-none'
                          : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 shadow-sm'
                          }`}
                      >
                        {isUnread && (
                          <div className="absolute left-3 top-0 bottom-0 w-1.5"></div>
                        )}
                        <CardContent className="flex flex-col justify-between gap-6 p-5 sm:p-6 md:flex-row md:items-center relative z-10">
                          {/* Left: Contact Info & Message Preview */}
                          <div
                            className="flex items-start gap-5 flex-1 min-w-0 cursor-pointer"
                            onClick={() => setSelectedLead({ type: 'message', data: msg })}
                          >
                            {/* Avatar */}
                            <div className={`absolute left-3 top-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold shadow-sm ${isUnread
                              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                              }`}>
                              {initials}
                            </div>

                            {/* Content */}
                            <div className="min-w-0 flex-1 space-y-2 translate-x-18">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-base font-bold text-slate-900 dark:text-white transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {msg.name}
                                </span>
                                {getStatusBadge(msg.status)}
                                <span className="text-xs font-semibold text-slate-400">
                                  • {formatRelativeTime(msg.created_at)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                                <span className="truncate">{msg.email}</span>
                              </div>

                              {/* Truncated message text */}
                              <p className="line-clamp-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                {msg.message}
                              </p>
                            </div>
                          </div>

                          {/* Right: Actions Cluster */}
                          <div className="flex items-center gap-3 self-end absolute right-3 md:self-center shrink-0 pt-2 md:pt-0">
                            {/* Toggle Read/New */}
                            <Button
                              variant="ghost"
                              disabled={isUpdating}
                              onClick={() => handleMessageStatus(msg.id, isUnread ? 'read' : 'new')}
                              className="badge badge-primary h-10 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
                              title={isUnread ? 'Mark as Read' : 'Mark as New'}
                            >
                              {isUnread ? (
                                <>
                                  <Check className="h-4 w-4 mr-2 text-emerald-500" />
                                  Mark Read
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-2 text-slate-400" />
                                  Mark New
                                </>
                              )}
                            </Button>

                            {/* Quick Mailto */}
                            <a
                              href={`mailto:${msg.email}?subject=Ebenezar Motors - In Response to your inquiry`}
                              className="badge badge-primary inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 text-sm font-bold text-white dark:text-slate-900 transition-all hover:scale-105 hover:shadow-lg shadow-sm"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Reply
                            </a>

                            {/* Full View Drawer Trigger */}
                            <Button
                              variant="outline"
                              onClick={() => setSelectedLead({ type: 'message', data: msg })}
                              className="badge badge-primary h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 px-4 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-all backdrop-blur-sm"
                            >
                              <Eye className="h-4 w-4 mr-2" />
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
            <TabsContent value="tradein" className="m-0 focus-visible:outline-none p-4 lg:p-6 bg-white/20 dark:bg-slate-950/20">
              {filteredTradeIns.length === 0 ? (
                <div className="px-4 py-20 text-center flex flex-col items-center justify-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 shadow-inner">
                    <Replace className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {hasActiveFilters ? 'No matching trade-in requests found' : 'No vehicle trade-in requests'}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">
                    {hasActiveFilters
                      ? 'Try adjusting your vehicle model or status filter.'
                      : 'Customer vehicle trade-in submissions and valuation requests will be cataloged here.'}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      onClick={resetFilters}
                      className="badge badge-danger mt-6 font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 cursor-pointer"
                    >
                      Clear Search & Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredTradeIns.map((req) => {
                    const isNew = req.status === 'new';

                    return (
                      <div
                        key={req.id}
                        className={`group relative overflow-hidden flex flex-col justify-between gap-6 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:scale-[1.005] sm:p-6 lg:flex-row lg:items-center ${isNew
                          ? 'bg-white dark:bg-slate-900 shadow-md shadow-indigo-100/50 dark:shadow-none'
                          : 'bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800 shadow-sm'
                          }`}
                      >
                        {isNew && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 "></div>
                        )}
                        {/* Left: Vehicle Specs & Details */}
                        <div
                          className="flex items-start gap-5 flex-1 min-w-0 cursor-pointer relative z-10"
                          onClick={() => setSelectedLead({ type: 'tradein', data: req })}
                        >
                          {/* Vehicle Icon Badge */}
                          <div className={`flex h-10 w-10 absolute top-3 left-3 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-all duration-300 ${isNew
                            ? 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/40 dark:to-blue-900/40 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                            }`}>
                            <CarFront className="h-7 w-7" />
                          </div>

                          {/* Vehicle Details */}
                          <div className="space-y-2 min-w-0 flex-1 translate-x-18">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-lg font-bold text-slate-900 dark:text-white transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {req.make_model}
                              </span>
                              {req.year > 0 && (
                                <span className="rounded-lg px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                                  {req.year}
                                </span>
                              )}
                              {getStatusBadge(req.status)}
                            </div>

                            {/* Quick Specs Chips */}
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
                              {req.mileage > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold">
                                  <Gauge className="h-3.5 w-3.5 text-slate-400" />
                                  {req.mileage.toLocaleString()} km
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1.5 font-bold">
                                {getConditionBadge(req.condition)}
                              </span>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <span className="text-xs font-semibold text-slate-400">
                                {formatRelativeTime(req.created_at)}
                              </span>
                            </div>

                            {/* Customer Contact Subline */}
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm font-bold text-slate-600 dark:text-slate-400">
                              <span className="flex items-center gap-1.5">
                                <User className="h-4 w-4 text-slate-400" />
                                {req.name}
                              </span>
                              <span className="text-slate-300 dark:text-slate-600">|</span>
                              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                <Phone className="h-4 w-4" />
                                {req.phone}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Action Dropdown & Buttons */}
                        <div className="flex items-center gap-3 self-end lg:self-center right-3 shrink-0 pt-2 lg:pt-0 relative z-10">
                          {/* Status Select */}
                          <Select
                            value={req.status}
                            onValueChange={(val: string) => handleTradeInStatus(req.id, val as any)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="badge badge-primary h-10 w-[140px] rounded-xl justify-center gap-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-sm font-bold shadow-sm backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-indigo-500/50">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl font-bold shadow-xl border-slate-200 dark:border-slate-800">
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
                            className="badge badge-primary inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 hover:shadow-emerald-500/40"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircleCheck className="h-4 w-4 mr-2 scale-x-[-1]" />
                            WhatsApp
                          </a>

                          {/* Call trigger */}
                          <a
                            href={`tel:${req.phone}`}
                            className="badge badge-primary inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 transition-all hover:scale-105 hover:shadow-md shadow-sm backdrop-blur-sm"
                            title="Call client"
                          >
                            <Phone className="h-4 w-4" />
                          </a>

                          {/* Appraisal Drawer Trigger */}
                          <Button
                            variant="outline"
                            onClick={() => setSelectedLead({ type: 'tradein', data: req })}
                            className="badge badge-primary h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white/50 bg-gradient-to-r from-blue-500 to-blue-400 dark:bg-slate-800/50 px-4 text-sm font-bold text-white hover:bg-blue-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-all shadow-sm backdrop-blur-sm"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </div>
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
            <div className="flex items-center justify-between pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {selectedLead.type === 'message' ? (
                  <span className="badge badge-primary inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-11 font-bold uppercase tracking-wider">
                    <Mail className="size-3" />
                    Website Inquiry
                  </span>
                ) : (
                  <span className="badge badge-primary inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-11 font-bold uppercase tracking-wider">
                    <Car className="size-3" />
                    Trade-In Request
                  </span>
                )}
                {getStatusBadge(selectedLead.data.status)}
              </div>
              <span className="text-12 font-medium text-gray-500">
                {selectedLead.data.created_at
                  ? format(new Date(selectedLead.data.created_at), 'MMMM dd, yyyy · hh:mm a')
                  : 'N/A'}
              </span>
            </div>

            {/* Buyer & Vehicle Deal Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Contact Card */}
              <div className="p-3.5 rounded-xl bg-gray-50/60 flex flex-col gap-1.5">
                <span className="text-10 font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <User className="size-3" />
                  Contact Details
                </span>
                <p className="text-13 font-bold text-gray-900">{selectedLead.data.name}</p>
                <div className="text-11 text-gray-600 flex flex-col gap-0.5">
                  {'email' in selectedLead.data && selectedLead.data.email && (
                    <p className="flex items-center justify-between gap-1">
                      <span className="text-gray-400">Email:</span>
                      <span className="font-medium font-roboto max-w-[170px]">{selectedLead.data.email}</span>
                      <button
                        onClick={() => copyToClipboard((selectedLead.data as { email: string }).email, 'Email')}
                        className="text-gray-400 hover:text-indigo-600 transition-colors shrink-0"
                        title="Copy email"
                      >
                        <Copy className="size-3" />
                      </button>
                    </p>
                  )}
                  {'phone' in selectedLead.data && selectedLead.data.phone && (
                    <p className="flex justify-between gap-1">
                      <span className="text-gray-400">Phone: </span>
                      <span className="font-medium font-roboto">{selectedLead.data.phone}</span>
                      <button
                        onClick={() => copyToClipboard((selectedLead.data as { phone: string }).phone, 'Phone number')}
                        className="text-gray-400 hover:text-indigo-600 transition-colors shrink-0"
                        title="Copy phone"
                      >
                        <Copy className="size-3" />
                      </button>
                    </p>
                  )}
                </div>
              </div>

              {/* Vehicle / Submission info card */}
              <div className="p-3.5 rounded-xl bg-gray-50/60 flex  flex-col gap-1.5">
                {selectedLead.type === 'tradein' ? (
                  <>
                    <span className="text-10 font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                      <CarFront className="size-3" />
                      Vehicle & Appraisal Info
                    </span>
                    <p className="text-13 relative left-2 font-bold text-gray-900 truncate">
                      {(selectedLead.data as TradeInRequest).make_model}
                    </p>
                    <div className="text-11 text-gray-600 flex flex-col relative left-2 gap-0.5">
                      <p>
                        <span className="text-gray-400">Year: </span>
                        <span className="font-bold font-roboto text-gray-800">{(selectedLead.data as TradeInRequest).year || 'N/A'}</span>
                      </p>
                      <p>
                        <span className="text-gray-400">Mileage: </span>
                        <span className="font-medium font-roboto">{(selectedLead.data as TradeInRequest).mileage ? (selectedLead.data as TradeInRequest).mileage.toLocaleString() + ' km' : 'Not stated'}</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <span className="text-gray-400">Condition: </span>
                        {getConditionBadge((selectedLead.data as TradeInRequest).condition)}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-10 font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                      <Inbox className="size-3" />
                      Submission Info
                    </span>
                    <p className="text-13 font-bold text-gray-900">Website Contact Form</p>
                    <div className="text-11 text-gray-600 flex flex-col gap-0.5">
                      <p>
                        <span className="text-gray-400">Channel: </span>
                        <span className="font-medium">Direct Inbound Lead</span>
                      </p>
                      <p>
                        <span className="text-gray-400">Status: </span>
                        <span className="font-medium capitalize">{selectedLead.data.status}</span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Contact Actions */}
            <div className="flex flex-wrap gap-2">
              {'email' in selectedLead.data && selectedLead.data.email && (
                <a
                  href={`mailto:${selectedLead.data.email}?subject=Ebenezar Motors - Follow-up on your website submission`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-12 font-bold bg-white border border-gray-200 text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                >
                  <Mail className="size-3.5 text-indigo-500" />
                  Send Email
                </a>
              )}
              {'phone' in selectedLead.data && selectedLead.data.phone && (
                <>
                  <a
                    href={`tel:${selectedLead.data.phone}`}
                    className="flex-1 inline-flex items-center justify-center bg-blue-100 hover:bg-blue-200 gap-1.5 px-3 py-2 rounded-xl text-12 font-bold  border border-blue-400 text-blue-700 hover:bg-blue-50 transition-all shadow-sm"
                  >
                    <Phone className="size-3.5 text-blue-500" />
                    Call Client
                  </a>
                  <a
                    href={getWhatsAppUrl(selectedLead.data.phone, 'Hello ' + selectedLead.data.name + ', this is Ebenezar Motors regarding your inquiry:')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-12 font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm"
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
                <span className="text-10.5 font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                  <FileText className="text-blue-600 size-3.5" />
                  {selectedLead.type === 'message' ? 'Interaction info & Notes' : 'Appraisal Details & Notes'}
                </span>
                <button
                  onClick={() =>
                    handleCopyNotes(
                      selectedLead.type === 'message'
                        ? (selectedLead.data.message || '')
                        : 'Vehicle: ' + (selectedLead.data as TradeInRequest).make_model + ' (' + ((selectedLead.data as TradeInRequest).year || 'N/A') + ')\nMileage: ' + ((selectedLead.data as TradeInRequest).mileage ? String((selectedLead.data as TradeInRequest).mileage.toLocaleString()) + ' km' : 'Not stated') + '\nCondition: ' + ((selectedLead.data as TradeInRequest).condition || 'N/A') + '\nCustomer: ' + selectedLead.data.name + '\nPhone: ' + (selectedLead.data as TradeInRequest).phone
                    )
                  }
                  className="badge badge-primary text-11 font-semibold text-black hover:text-gray-900 flex items-center gap-1 px-2 py-0.5 rounded border border-gray-200 bg-white cursor-pointer"
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

              <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/70 left-3 text-13 font-medium text-gray-800 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                <span className="text-black font-sans relative left-3"> {selectedLead.type === 'message'
                  ? (selectedLead.data.message || '(No message notes recorded)')
                  : ('Vehicle: ' + (selectedLead.data as TradeInRequest).make_model + ' (' + ((selectedLead.data as TradeInRequest).year || 'N/A') + ')\nMileage: ' + ((selectedLead.data as TradeInRequest).mileage ? String((selectedLead.data as TradeInRequest).mileage.toLocaleString()) + ' km' : 'Not stated') + '\nCondition: ' + ((selectedLead.data as TradeInRequest).condition || 'N/A') + '\nCustomer: ' + selectedLead.data.name + '\nPhone: ' + (selectedLead.data as TradeInRequest).phone)}

                </span>
              </div>
            </div>

            {/* Pipeline Status Workflow */}
            <div className="flex flex-col gap-2">
              <span className="text-10.5 font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5 text-indigo-500" />
                Pipeline Status
              </span>
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <span className="relative left-3 text-12 font-bold text-gray-700">   Update Status:</span>
                {selectedLead.type === 'message' ? (
                  <Select
                    modal={false}
                    value={selectedLead.data.status}
                    onValueChange={(val: string) => handleMessageStatus(selectedLead.data.id, val as any)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="badge badge-primary items-center justify-center gap-2 h-7 w-[160px] rounded-xl border-indigo-200 bg-white text-12 font-bold shadow-sm cursor-pointer">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl font-bold text-12 z-[99999]">
                      <SelectItem value="new">New (Unread)</SelectItem>
                      <SelectItem value="read">Mark as Read</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    modal={false}
                    value={selectedLead.data.status}
                    onValueChange={(val: string) => handleTradeInStatus(selectedLead.data.id, val as any)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="badge badge-primary items-center justify-center gap-2 h-7 w-[160px] rounded-xl border-indigo-200 bg-white text-12 font-bold shadow-sm cursor-pointer">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl font-bold text-12 z-[99999]">
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
            <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-11 text-gray-400 font-google-sans">
              <span>Lead ID: {selectedLead.data.id}</span>
              <span>
                Received:{' '}
                {selectedLead.data.created_at
                  ? format(new Date(selectedLead.data.created_at), 'MMMM dd, yyyy · hh:mm a')
                  : 'N/A'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedLead(null)}
                className="badge badge-destructive px-4 py-2 rounded-xl border border-red-200 text-13 font-bold bg-red-50 text-red-700 hover:bg-red-200 transition-all cursor-pointer"
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
