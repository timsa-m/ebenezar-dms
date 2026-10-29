'use client';

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Download,
  Calendar,
  User,
  Car,
  Building2,
  FileText,
  ExternalLink,
  Copy,
  RotateCcw,
  Smartphone,
  Eye,
  ChevronDown,
  Check,
  AlertCircle,
  X
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import CustomModal from "@/components/ui/CustomModal";
import { toast } from "@/lib/toast";

interface CommunicationsTableProps {
  notifications: any[];
}

function extractTextFromHtml(htmlString: string): string {
  if (!htmlString) return '';

  if (!htmlString.includes('<html') && !htmlString.includes('<body') && !htmlString.includes('<p') && !htmlString.includes('<div')) {
    return htmlString;
  }

  try {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  } catch {
    return htmlString.replace(/<[^>]+>/g, ' ').trim();
  }
}


// Dealership category definitions
type QuickFilterTab = 'ALL' | 'CALLS_VISITS' | 'REMINDERS' | 'ARREARS' | 'MESSAGING';

export default function CommunicationsTable({ notifications }: CommunicationsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("ALL");
  const [selectedChannel, setSelectedChannel] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [activeTab, setActiveTab] = useState<QuickFilterTab>('ALL');

  // Modal inspection state
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper to extract clean client name
  const getClientName = (n: any): string => {
    if (n.clients?.full_name) return n.clients.full_name;
    if (n.clients?.first_name || n.clients?.last_name) {
      return `${n.clients?.first_name || ''} ${n.clients?.last_name || ''}`.trim();
    }
    return '';
  };

  // Helper to extract vehicle string
  const getVehicleInfo = (n: any): { makeModel: string; regNo: string; contractNo: string; agreementId: string | null } => {
    const ag = n.agreement;
    const v = ag?.vehicles;
    return {
      makeModel: v?.make_model || '',
      regNo: v?.registration_no || '',
      contractNo: ag?.contract_no || (n.loan_id ? `CONTRACT-${n.loan_id.slice(0, 8).toUpperCase()}` : ''),
      agreementId: ag?.id || n.loan_id || null,
    };
  };

  // Unique clients for filter dropdown
  const uniqueClients = useMemo(() => {
    const clientsMap = new Map<string, string>();
    notifications.forEach(n => {
      if (n.client_id) {
        const name = getClientName(n) || n.recipient || 'Unknown Buyer';
        clientsMap.set(n.client_id, name);
      }
    });
    return Array.from(clientsMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [notifications]);

  // Unique months for filter dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    notifications.forEach(n => {
      if (n.created_at) {
        const date = new Date(n.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(key);
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const clientName = getClientName(n);
      const vehicle = getVehicleInfo(n);
      const messageText = extractTextFromHtml(n.message_body || '');
      const subjectText = n.error_message && !n.error_message.includes('Error') ? n.error_message : '';

      // 1. Search Query
      const matchesSearch = [
        clientName,
        n.recipient,
        n.channel,
        n.template_type,
        n.status,
        vehicle.makeModel,
        vehicle.regNo,
        vehicle.contractNo,
        messageText,
        subjectText,
      ].join(" ").toLowerCase().includes(searchQuery.toLowerCase().trim());

      // 2. Client Filter
      const matchesClient = selectedClientId === "ALL" || n.client_id === selectedClientId;

      // 3. Channel Filter
      const matchesChannel = selectedChannel === "ALL" || n.channel === selectedChannel;

      // 4. Status Filter
      const matchesStatus = selectedStatus === "ALL" || n.status === selectedStatus;

      // 5. Month Filter
      let matchesMonth = true;
      if (selectedMonth !== "ALL" && n.created_at) {
        const date = new Date(n.created_at);
        const notifMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        matchesMonth = notifMonth === selectedMonth;
      }

      // 6. Type / Purpose Filter
      let matchesType = true;
      if (selectedType !== "ALL") {
        if (selectedType === 'CALL_LOGS') {
          matchesType = n.template_type === 'MANUAL_LOG' || n.channel === 'CALL';
        } else if (selectedType === 'REMINDERS') {
          matchesType = ['PAYMENT_REMINDER', 'INSTALLMENT_DUE'].includes(n.template_type);
        } else if (selectedType === 'ARREARS') {
          matchesType = ['OVERDUE_ALERT', 'DEMAND_LETTER', 'DEFAULT_ALERT', 'REPOSSESSION_NOTICE'].includes(n.template_type);
        } else if (selectedType === 'OUTREACH') {
          matchesType = n.template_type === 'MANUAL_MESSAGE';
        }
      }

      // 7. Quick Filter Tab
      let matchesTab = true;
      if (activeTab === 'CALLS_VISITS') {
        matchesTab = n.channel === 'CALL' || n.channel === 'IN_PERSON' || n.template_type === 'MANUAL_LOG';
      } else if (activeTab === 'REMINDERS') {
        matchesTab = ['PAYMENT_REMINDER', 'INSTALLMENT_DUE'].includes(n.template_type);
      } else if (activeTab === 'ARREARS') {
        matchesTab = ['OVERDUE_ALERT', 'DEMAND_LETTER', 'DEFAULT_ALERT', 'REPOSSESSION_NOTICE'].includes(n.template_type);
      } else if (activeTab === 'MESSAGING') {
        matchesTab = n.channel === 'SMS' || n.channel === 'WHATSAPP';
      }

      return (
        matchesSearch &&
        matchesClient &&
        matchesChannel &&
        matchesStatus &&
        matchesMonth &&
        matchesType &&
        matchesTab
      );
    });
  }, [
    notifications,
    searchQuery,
    selectedClientId,
    selectedChannel,
    selectedStatus,
    selectedMonth,
    selectedType,
    activeTab,
  ]);

  // Tab counts for quick metrics
  const tabCounts = useMemo(() => {
    return {
      all: notifications.length,
      callsVisits: notifications.filter(n => n.channel === 'CALL' || n.channel === 'IN_PERSON' || n.template_type === 'MANUAL_LOG').length,
      reminders: notifications.filter(n => ['PAYMENT_REMINDER', 'INSTALLMENT_DUE'].includes(n.template_type)).length,
      arrears: notifications.filter(n => ['OVERDUE_ALERT', 'DEMAND_LETTER', 'DEFAULT_ALERT', 'REPOSSESSION_NOTICE'].includes(n.template_type)).length,
      messaging: notifications.filter(n => n.channel === 'SMS' || n.channel === 'WHATSAPP').length,
    };
  }, [notifications]);

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedClientId !== "ALL" ||
    selectedChannel !== "ALL" ||
    selectedType !== "ALL" ||
    selectedStatus !== "ALL" ||
    selectedMonth !== "ALL" ||
    activeTab !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedClientId("ALL");
    setSelectedChannel("ALL");
    setSelectedType("ALL");
    setSelectedStatus("ALL");
    setSelectedMonth("ALL");
    setActiveTab("ALL");
  };

  // Dealership CSV Export
  const exportToCSV = () => {
    if (filteredNotifications.length === 0) {
      toast.info("No communications logs to export.");
      return;
    }

    const headers = [
      'Log ID',
      'Date',
      'Time',
      'Buyer Name',
      'National ID',
      'Recipient (Phone/Email)',
      'Vehicle Make & Model',
      'Registration Plate',
      'Contract Ref',
      'Channel',
      'Interaction Purpose',
      'Delivery Status',
      'Notes / Content',
    ];

    const rows = filteredNotifications.map(n => {
      const clientName = getClientName(n) || 'Unknown Buyer';
      const natId = n.clients?.client_id_number || 'N/A';
      const vehicle = getVehicleInfo(n);
      const date = n.created_at ? new Date(n.created_at) : null;
      const formattedDate = date ? format(date, 'yyyy-MM-dd') : 'N/A';
      const formattedTime = date ? format(date, 'HH:mm:ss') : 'N/A';
      const messageClean = extractTextFromHtml(n.message_body || '').replace(/"/g, '""');

      return [
        `"${n.id}"`,
        `"${formattedDate}"`,
        `"${formattedTime}"`,
        `"${clientName}"`,
        `"${natId}"`,
        `"${n.recipient || ''}"`,
        `"${vehicle.makeModel || 'N/A'}"`,
        `"${vehicle.regNo || 'N/A'}"`,
        `"${vehicle.contractNo || 'N/A'}"`,
        `"${n.channel || 'N/A'}"`,
        `"${(n.template_type || 'MANUAL_LOG').replace(/_/g, ' ')}"`,
        `"${n.status || 'LOGGED'}"`,
        `"${messageClean}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dealership_communications_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Dealership communications log exported successfully!");
  };

  // Copy log body to clipboard
  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Interaction notes copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Channel UI helper
  const renderChannelBadge = (channel: string) => {
    switch (channel) {
      case 'CALL':
        return (
          <span className="badge badge-primary inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-11 font-semibold bg-sky-50 text-sky-700 border border-sky-200/70">
            <Phone className="size-3 text-sky-600" />
            Voice Call
          </span>
        );
      case 'IN_PERSON':
        return (
          <span className="badge badge-primary inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-11 font-semibold bg-purple-50 text-purple-700 border border-purple-200/70">
            <Building2 className="size-3 text-purple-600" />
            Yard Visit
          </span>
        );
      case 'WHATSAPP':
        return (
          <span className="badge badge-primary inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-11 font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            <MessageSquare className="size-3 text-emerald-600" />
            WhatsApp
          </span>
        );
      case 'SMS':
        return (
          <span className="badge badge-primary inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-11 font-semibold bg-amber-50 text-amber-700 border border-amber-200/70">
            <Smartphone className="size-3 text-amber-600" />
            SMS
          </span>
        );
      case 'EMAIL':
        return (
          <span className="badge badge-primaryinline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-11 font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
            <Mail className="size-3 text-indigo-600" />
            Email
          </span>
        );
      default:
        return (
          <span className="badge badge-primary inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-11 font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <MessageSquare className="size-3 text-gray-500" />
            {channel || 'Direct'}
          </span>
        );
    }
  };

  // Purpose / Template badge helper
  const renderPurposeBadge = (templateType: string, channel: string) => {
    switch (templateType) {
      case 'MANUAL_LOG':
        return (
          <Badge variant="outline" className="badge badge-primary text-10 font-bold bg-slate-100 text-slate-700 border-slate-200 uppercase tracking-tight">
            {channel === 'CALL' ? 'Agent Call Log' : channel === 'IN_PERSON' ? 'Visit Note' : 'Staff Record'}
          </Badge>
        );
      case 'PAYMENT_REMINDER':
      case 'INSTALLMENT_DUE':
        return (
          <Badge variant="outline" className="badge badge-primary text-10 font-bold bg-amber-50 text-amber-700 border-amber-200 uppercase tracking-tight">
            Installment Due
          </Badge>
        );
      case 'OVERDUE_ALERT':
      case 'ARREARS_NOTICE':
        return (
          <Badge variant="outline" className="badge badge-primary text-10 font-bold bg-rose-50 text-rose-700 border-rose-200 uppercase tracking-tight">
            Arrears Alert
          </Badge>
        );
      case 'DEMAND_LETTER':
      case 'DEFAULT_ALERT':
        return (
          <Badge variant="outline" className="badge badge-primary text-10 font-bold bg-red-100 text-red-800 border-red-300 uppercase tracking-tight">
            Demand Notice
          </Badge>
        );
      case 'REPOSSESSION_NOTICE':
        return (
          <Badge variant="outline" className="badge badge-primary text-10 font-bold bg-red-600 text-white border-transparent uppercase tracking-tight">
            Repossession Alert
          </Badge>
        );
      case 'LOAN_DISBURSEMENT':
      case 'AGREEMENT_ACTIVATED':
        return (
          <Badge variant="outline" className="badge badge-primary text-10 font-bold bg-emerald-50 text-emerald-700 border-emerald-200 uppercase tracking-tight">
            Deal Activated
          </Badge>
        );
      case 'SETTLEMENT_CONFIRMATION':
        return (
          <Badge variant="outline" className="badge badge-primary text-10 font-bold bg-teal-50 text-teal-700 border-teal-200 uppercase tracking-tight">
            Contract Cleared
          </Badge>
        );
      case 'MANUAL_MESSAGE':
        return (
          <Badge variant="outline" className="badge badge-primary text-10 font-bold bg-blue-50 text-blue-700 border-blue-200 uppercase tracking-tight">
            Direct Outreach
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="badge badge-primary text-10 font-bold bg-gray-50 text-gray-600 border-gray-200 uppercase tracking-tight">
            {(templateType || 'COMMUNICATION').replace(/_/g, ' ')}
          </Badge>
        );
    }
  };

  // Status badge helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return (
          <div className="badge badge-primary flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-11 font-bold tracking-tight">
            <CheckCircle className="size-3 text-emerald-600" />
            <span>Delivered</span>
          </div>
        );
      case 'LOGGED':
        return (
          <div className="badge badge-primary flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70 text-11 font-bold tracking-tight">
            <Check className="size-3 text-blue-600" />
            <span>Logged</span>
          </div>
        );
      case 'FAILED':
        return (
          <div className="badge badge-primary flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/70 text-11 font-bold tracking-tight">
            <XCircle className="size-3 text-rose-600" />
            <span>Failed</span>
          </div>
        );
      default:
        return (
          <div className="badge badge-primary flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70 text-11 font-bold tracking-tight">
            <Clock className="size-3 text-amber-600" />
            <span>{status || 'Pending'}</span>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── Dealership Quick Filter Tabs ── */}
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={cn(
            "badge badge-pilled px-3.5 py-1.5 rounded-xl text-12 font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'ALL'
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          )}
        >
          All Logs
          <span className={cn(
            "badge badge-pilled px-1.5 py-0.2 rounded-md text-10 font-bold",
            activeTab === 'ALL' ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-600"
          )}>
            {tabCounts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('CALLS_VISITS')}
          className={cn(
            "badge badge-pilled px-3.5 py-1.5 rounded-xl text-12 font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'CALLS_VISITS'
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          )}
        >
          <Phone className="size-3.5" />
          Calls & Visits
          <span className={cn(
            "badge badge-pilled px-1.5 py-0.2 rounded-md text-10 font-bold",
            activeTab === 'CALLS_VISITS' ? "bg-sky-700 text-white" : "bg-sky-50 text-sky-700"
          )}>
            {tabCounts.callsVisits}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('REMINDERS')}
          className={cn(
            "badge badge-pilled px-3.5 py-1.5 rounded-xl text-12 font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'REMINDERS'
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          )}
        >
          <Clock className="size-3.5 text-amber-600" />
          Installment Reminders
          <span className={cn(
            "badge badge-pilled px-1.5 py-0.2 rounded-md text-10 font-bold",
            activeTab === 'REMINDERS' ? "bg-amber-700 text-white" : "bg-amber-50 text-amber-700"
          )}>
            {tabCounts.reminders}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ARREARS')}
          className={cn(
            "badge badge-pilled px-3.5 py-1.5 rounded-xl text-12 font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'ARREARS'
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          )}
        >
          <AlertCircle className="size-3.5 text-rose-600" />
          Arrears & Legal
          <span className={cn(
            "badge badge-pilled px-1.5 py-0.2 rounded-md text-10 font-bold",
            activeTab === 'ARREARS' ? "bg-rose-700 text-white" : "bg-rose-50 text-rose-700"
          )}>
            {tabCounts.arrears}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('MESSAGING')}
          className={cn(
            "badge badge-pilled px-3.5 py-1.5 rounded-xl text-12 font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'MESSAGING'
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          )}
        >
          <MessageSquare className="size-3.5" />
          SMS
          <span className={cn(
            "badge badge-pilled px-1.5 py-0.2 rounded-md text-10 font-bold",
            activeTab === 'MESSAGING' ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700"
          )}>
            {tabCounts.messaging}
          </span>
        </button>
      </div>

      {/* ── Minimal Multi-filter Control Bar ── */}
      <div className="p-3.5 sm:p-4 rounded-xl flex flex-col gap-3">
        {/* Primary Row: Universal Search + Your Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Universal Search */}
          <div className="relative min-w-80 sm:min-w-110 flex-1 rounded-xl border border-slate-200/90 bg-slate-50/60 shadow-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by buyer, phone, vehicle, reg plate, agreement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="translate-x-10 pl-10 pr-9 h-9 w-full rounded-lg text-[13px] font-medium text-slate-800 transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>


          {/* Quick Actions (Reset & Export) */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="btn-secondary inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200/90 bg-red-100 px-3.5 text-xs font-semibold text-red-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-red-300 focus:outline-red focus:ring-2 focus:ring-slate-200 cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={exportToCSV}
              className="btn-secondary inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
            >
              <Download className="size-3.5 text-slate-500" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Secondary Row: Structured Filter Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3">
          {/* Client / Buyer Selector */}
          <div className="relative group w-full">
            <User
              className={cn(
                "pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 z-10 transition-colors",
                selectedClientId !== 'ALL' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"
              )}
            />
            <Select value={selectedClientId} onValueChange={(val) => setSelectedClientId(val)}>
              <SelectTrigger
                className={cn(
                  "h-9 w-full rounded-lg border pl-10 justify-center gap-4 text-[13px] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/15 cursor-pointer",
                  selectedClientId !== 'ALL'
                    ? "border-indigo-200 bg-indigo-50/50 text-indigo-950 focus:border-indigo-500"
                    : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 focus:border-indigo-500"
                )}
              >
                <SelectValue placeholder="All Buyers / Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Buyers / Clients</SelectItem>
                {uniqueClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Channel Selector */}
          <div className="relative group w-full">
            <Phone
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 z-10 transition-colors",
                selectedChannel !== 'ALL' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"
              )}
            />
            <Select value={selectedChannel} onValueChange={(val) => setSelectedChannel(val)}>
              <SelectTrigger
                className={cn(
                  "h-9 w-full rounded-lg border pl-6 justify-center gap-4 pr-8 text-[13px] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/15 cursor-pointer",
                  selectedChannel !== 'ALL'
                    ? "border-indigo-200 bg-indigo-50/50 text-indigo-950 focus:border-indigo-500"
                    : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 focus:border-indigo-500"
                )}
              >
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Channels</SelectItem>
                <SelectItem value="CALL">Voice Calls</SelectItem>
                <SelectItem value="IN_PERSON">Yard / In-Person</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="SMS">SMS Notifications</SelectItem>
                <SelectItem value="EMAIL">Email Notices</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Selector */}
          <div className="relative group w-full">
            <CheckCircle
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 z-10 transition-colors",
                selectedStatus !== 'ALL' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"
              )}
            />
            <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val)}>
              <SelectTrigger
                className={cn(
                  "h-9 w-full rounded-lg border pl-9 justify-center gap-4 pr-8 text-[13px] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/15 cursor-pointer",
                  selectedStatus !== 'ALL'
                    ? "border-indigo-200 bg-indigo-50/50 text-indigo-950 focus:border-indigo-500"
                    : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 focus:border-indigo-500"
                )}
              >
                <SelectValue placeholder="All Delivery Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DELIVERED">Delivered / Sent</SelectItem>
                <SelectItem value="LOGGED">Logged (Agent Notes)</SelectItem>
                <SelectItem value="FAILED">Delivery Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Month Selector */}
          <div className="relative group w-full">
            <Calendar
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 z-10 transition-colors",
                selectedMonth !== 'ALL' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"
              )}
            />
            <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val)}>
              <SelectTrigger
                className={cn(
                  "h-9 w-full rounded-lg justify-center gap-4 border left-6 pr-8 text-[13px] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/15 cursor-pointer",
                  selectedMonth !== 'ALL'
                    ? "border-indigo-200 bg-indigo-50/50 text-indigo-950 focus:border-indigo-500"
                    : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 focus:border-indigo-500"
                )}
              >
                <SelectValue

                  placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Time</SelectItem>
                {availableMonths.map((m) => {
                  const [year, month] = m.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1);
                  return (
                    <SelectItem key={m} value={m}>
                      {date.toLocaleString('default', { month: 'short', year: 'numeric' })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="card-premium overflow-hidden border border-gray-200/70 shadow-sm bg-white rounded-2xl">
        <Table>
          <TableHeader className="bg-slate-50/70 ">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-11 font-bold text-gray-500 uppercase tracking-wider py-4 pl-6">
                Client
              </TableHead>
              <TableHead className="text-11 font-bold text-gray-500 uppercase tracking-wider py-4">
                Vehicle
              </TableHead>
              <TableHead className="text-11 font-bold text-gray-500 uppercase tracking-wider py-4">
                Channel
              </TableHead>
              <TableHead className="text-11 font-bold text-gray-500 uppercase tracking-wider py-4">
                Purpose
              </TableHead>
              <TableHead className="text-11 font-bold text-gray-500 uppercase tracking-wider py-4">
                Notes
              </TableHead>
              <TableHead className="text-11 font-bold text-gray-500 uppercase tracking-wider py-4">
                Outcome
              </TableHead>
              <TableHead className="text-11 font-bold text-gray-500 uppercase tracking-wider py-4">
                Logged At
              </TableHead>
              <TableHead className="text-11 font-bold text-gray-500 uppercase tracking-wider py-4 pr-6 text-right">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNotifications.map((notif) => {
              const clientName = getClientName(notif) || notif.recipient || 'Unknown Buyer';
              const natId = notif.clients?.client_id_number;
              const vehicle = getVehicleInfo(notif);
              const messageText = extractTextFromHtml(notif.message_body || '');
              const subjectText = notif.error_message && !notif.error_message.includes('Error') ? notif.error_message : '';

              return (
                <TableRow
                  key={notif.id}
                  className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group cursor-pointer mt-4"
                  onClick={() => setSelectedNotification(notif)}
                >
                  {/* Buyer / Client */}
                  <TableCell className="py-4 pl-6 mt-4">
                    <div className="flex flex-col gap-0.5 mt-4">
                      <div className="flex items-center gap-1.5 mt-4">
                        <span className="text-14 font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {clientName}
                        </span>
                        {natId && (
                          <span className="badge badge-info text-10 font-roboto font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 translate-y-1/2">
                            ID: {natId}
                          </span>
                        )}
                      </div>
                      <span className="text-12 text-gray-500 font-medium tracking-tight">
                        {notif.recipient || 'No contact specified'}
                      </span>
                      {notif.client_id && (
                        <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>

                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Vehicle Deal & Contract */}
                  <TableCell className="py-4">
                    {vehicle.makeModel || vehicle.regNo || vehicle.contractNo ? (
                      <div className="flex flex-col gap-1 max-w-[200px]">
                        {vehicle.makeModel && (
                          <div className="flex items-center gap-1.5 font-bold text-12 text-gray-800 uppercase tracking-tight truncate">

                            <span className="truncate" title={vehicle.makeModel}>{vehicle.makeModel}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {vehicle.regNo && (
                            <span className="badge badge-info px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-roboto font-bold text-11 uppercase">
                              <Link
                                href={`/loans/${vehicle.agreementId}`}
                                className="text-11 font-roboto text-amber-800 hover:blink font-semibold"
                                title="Open Financing Contract"
                              >
                                {vehicle.regNo}

                              </Link>

                            </span>


                          )}

                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <Building2 className="size-3.5 text-gray-400" />
                        <span className="text-11 font-medium italic">Dealership Direct</span>
                      </div>
                    )}
                  </TableCell>

                  {/* Channel */}
                  <TableCell className="py-4">
                    {renderChannelBadge(notif.channel)}
                  </TableCell>

                  {/* Purpose / Template */}
                  <TableCell className="py-4">
                    {renderPurposeBadge(notif.template_type, notif.channel)}
                  </TableCell>

                  {/* Interaction Notes */}
                  <TableCell className="py-4 max-w-[260px]">
                    <div className="flex flex-col gap-0.5">
                      {subjectText && (
                        <p className="text-12 font-bold text-gray-800 truncate" title={subjectText}>
                          {subjectText}
                        </p>
                      )}
                      <p className="text-12 text-gray-600 truncate" title={messageText}>
                        {messageText || '(Empty message body)'}
                      </p>
                    </div>
                  </TableCell>

                  {/* Outcome / Status */}
                  <TableCell className="py-4">
                    {renderStatusBadge(notif.status)}
                  </TableCell>

                  {/* Date & Time */}
                  <TableCell className="py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-12 font-semibold text-gray-800">
                        {notif.created_at ? format(new Date(notif.created_at), 'MMM dd, yyyy') : 'N/A'}
                      </span>
                      <span className="text-11 text-gray-400 font-medium">
                        {notif.created_at ? format(new Date(notif.created_at), 'hh:mm a') : 'N/A'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Action */}
                  <TableCell className="py-4 pr-6 text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedNotification(notif)}
                      className="badge badge-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-gray-50 text-blue-700 text-11 font-bold shadow-2xs transition-all cursor-pointer"
                    >
                      <Eye className="size-3 text-blue-500" />
                      View
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredNotifications.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 p-4 mx-auto">
                    <div className="size-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mt-5">
                      <MessageSquare className="size-6" />
                    </div>
                    <p className="text-14 font-bold text-gray-800">No matching communications found</p>
                    <p className="text-12 text-gray-500">
                      {hasActiveFilters
                        ? "Try clearing some filters or refining your search term."
                        : "No dealership communication logs recorded yet. Use 'New Message / Log' above to record buyer calls or outreach."}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="mt-2 text-12 font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Reset all filters
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Dealership Log Inspection Modal ── */}
      {
        selectedNotification && (
          <CustomModal
            isOpen={!!selectedNotification}
            onClose={() => setSelectedNotification(null)}
            title="Dealership Communication Log"
            width={640}
          >
            <div className="flex flex-col gap-4 text-left">
              {/* Top Status & Date Banner */}
              <div className="flex items-center justify-between pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {renderChannelBadge(selectedNotification.channel)}
                  {renderPurposeBadge(selectedNotification.template_type, selectedNotification.channel)}
                  {renderStatusBadge(selectedNotification.status)}
                </div>
                <span className="text-12 font-medium text-gray-500">
                  {selectedNotification.created_at
                    ? format(new Date(selectedNotification.created_at), 'MMMM dd, yyyy · hh:mm a')
                    : 'N/A'}
                </span>
              </div>

              {/* Buyer & Vehicle Deal Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Buyer Card */}
                <div className="p-3.5 rounded-xl bg-gray-50/60 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-10 font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                      <User className="size-3" />
                      Buyer Details
                    </span>
                    {selectedNotification.client_id && (
                      <Link
                        href={`/clients/${selectedNotification.client_id}`}
                        className="btn btn-sm btn-primary text-11 font-semibold text-blue-600 hover:underline flex items-center gap-0.3"
                        target="_blank"
                        title="View buyer profile"
                      >
                        Profile
                      </Link>
                    )}
                  </div>
                  <p className="text-13 font-bold text-gray-900">
                    {getClientName(selectedNotification) || 'Unknown Buyer'}
                  </p>
                  <div className="text-11 text-gray-600 flex flex-col gap-0.5">
                    <p>
                      <span className="text-gray-400">Phone: </span>
                      <span className="font-medium font-mono">{selectedNotification.recipient || 'N/A'}</span>
                    </p>
                    {selectedNotification.clients?.client_id_number && (
                      <p>
                        <span className="text-gray-400">National ID: </span>
                        <span className="font-medium font-mono">{selectedNotification.clients.client_id_number}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Vehicle & Contract Card */}
                <div className="p-3.5 rounded-xl bg-gray-50/60 flex flex-col gap-1.5">
                  {(() => {
                    const v = getVehicleInfo(selectedNotification);
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-10 font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                            <Car className="size-3" />
                            Vehicle & Contract
                          </span>
                          {v.agreementId && (
                            <Link
                              href={`/loans/${v.agreementId}`}
                              className="btn btn-primary text-11 font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
                              target="_blank"
                            >
                              Contract

                            </Link>
                          )}
                        </div>
                        <p className="text-13 font-bold text-gray-900 truncate">
                          {v.makeModel || 'General Buyer Deal'}
                        </p>
                        <div className="text-11 text-gray-600 flex flex-col gap-0.5">
                          {v.regNo && (
                            <p>
                              <span className="text-gray-400">Reg Plate: </span>
                              <span className="font-bold font-roboto text-gray-800">{v.regNo}</span>
                            </p>
                          )}
                          {v.contractNo && (
                            <p>
                              <span className="text-gray-400">Contract #: </span>
                              <span className="font-medium font-roboto text-blue-600">{v.contractNo}</span>
                            </p>
                          )}
                          {!v.regNo && !v.contractNo && (
                            <p className="italic text-gray-400">No vehicle attached to this direct log.</p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Interaction Notes & Transcript */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-10.5 font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="text-blue-600 size-3.5" />
                    Interaction info & Notes
                  </span>
                  <button
                    onClick={() =>
                      handleCopyMessage(
                        extractTextFromHtml(selectedNotification.message_body || ''),
                        selectedNotification.id
                      )
                    }
                    className="badge badge-primary text-11 font-semibold text-black hover:text-gray-900 flex items-center gap-1 px-2 py-0.5 rounded border border-gray-200 bg-white cursor-pointer"
                  >
                    {copiedId === selectedNotification.id ? (
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

                {selectedNotification.error_message && !selectedNotification.error_message.includes('Error') && (
                  <div className="px-3 py-2 rounded-lg bg-blue-50/60 border border-blue-100 text-12 font-semibold text-blue-800">
                    Subject / Outcome: {selectedNotification.error_message}
                  </div>
                )}

                <div className="p-4 rounded-xl border border-gray-200 bg-slate-50/70 text-13 font-medium text-gray-800 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {extractTextFromHtml(selectedNotification.message_body || '') || '(No message notes recorded)'}
                </div>
              </div>

              {/* Delivery Metadata & Diagnostics */}
              <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-11 text-gray-400 font-mono">
                <span>Log ID: {selectedNotification.id}</span>
                {selectedNotification.retry_count > 0 && (
                  <span>Retries: {selectedNotification.retry_count}</span>
                )}
                {selectedNotification.sent_at && (
                  <span>Sent: {format(new Date(selectedNotification.sent_at), 'hh:mm:ss a')}</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="badge badge-destructive  px-4 py-2 rounded-xl border border-red-200 text-13 font-bold bg-red-50 text-red-700 hover:bg-red-200 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </CustomModal>
        )
      }
    </div >
  );
}
