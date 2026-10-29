'use client'

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, UsersRound, Phone, PlusCircle, Download, ListChecks, AlertTriangle, UserCog, Eye, ChevronUp, ChevronDown, Sparkles, CheckCircle2, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatAmount } from '@/lib/utils';
import { cn } from '@/lib/utils';
import ClientAvatar from '@/components/ClientAvatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { deleteClientAction } from '@/lib/actions/client.actions';
import { toast } from '@/lib/toast';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableResponsiveGrid,
  TableResponsiveCard,
  TableResponsiveCardHeader,
  TableResponsiveCardContent,
} from '@/components/ui/table';

interface Client {
  $id: string;
  firstName: string;
  lastName: string;
  email: string;
  nationalId: string;
  phone: string;
  totalBorrowed: number;
  outstandingBalance: number;
  profilePhotoUrl?: string | null;
  profilePhotoPath?: string | null;
  hasOverdueLoans?: boolean;
  totalAgreements?: number;
  totalLoans?: number;
  hasAgreements?: boolean;
  hasLoans?: boolean;
  agreementsCount?: number;
  loanCount?: number;
  agreements?: any[];
  loans?: any[];
  contracts?: any[];
}

type ClientStatus = 'New' | 'Active' | 'Arrears' | 'Cleared';

function getClientStatus(client: Client): ClientStatus {
  if (client.hasOverdueLoans) return 'Arrears';

  // Check whether the client has any contract or agreement (active, completed, or cash sale)
  const agreementCount =
    client.totalAgreements ??
    client.totalLoans ??
    client.agreementsCount ??
    client.loanCount ??
    (Array.isArray(client.agreements) ? client.agreements.length : undefined) ??
    (Array.isArray(client.loans) ? client.loans.length : undefined) ??
    (Array.isArray(client.contracts) ? client.contracts.length : undefined);

  const hasAgreements =
    client.hasAgreements ??
    client.hasLoans ??
    (agreementCount !== undefined ? agreementCount > 0 : undefined);

  // A client is only marked "New" if they have NO contracts or agreements.
  // Clients with cash sales have a contract/agreement (even with totalBorrowed = 0 and balance = 0)
  // and must NOT be marked as "New".
  const isNew = hasAgreements !== undefined
    ? (!hasAgreements && (client.totalBorrowed || 0) === 0)
    : ((client.totalBorrowed || 0) === 0 && (client.outstandingBalance || 0) <= 0);

  if (isNew) return 'New';
  if ((client.outstandingBalance || 0) <= 0) return 'Cleared';
  return 'Active';
}

function StatusBadge({ status }: { status: ClientStatus }) {
  if (status === 'Arrears') return <span className="badge badge-error">Arrears</span>;
  if (status === 'New') return <span className="badge badge-new">New</span>;
  if (status === 'Cleared') return <span className="badge badge-completed">Cleared</span>;
  return <span className="badge badge-success">Active</span>;
}

export default function ClientsTable({ clients, userRole }: { clients: Client[], userRole?: string }) {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'arrears' | 'cleared' | 'new'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const filtered = useMemo(() => {
    let result = clients;

    // Tab filtering
    if (activeTab === 'active') {
      result = clients.filter(c => getClientStatus(c) === 'Active');
    } else if (activeTab === 'arrears') {
      result = clients.filter(c => getClientStatus(c) === 'Arrears');
    } else if (activeTab === 'cleared') {
      result = clients.filter(c => getClientStatus(c) === 'Cleared');
    } else if (activeTab === 'new') {
      result = clients.filter(c => getClientStatus(c) === 'New');
    }

    // Search query filtering
    if (!query.trim()) return result;
    const q = query.toLowerCase();
    return result.filter((c) =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.nationalId?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  }, [clients, query, activeTab]);

  const exportToCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'National ID', 'Phone', 'Status', 'Total Borrowed', 'Outstanding Balance'];
    const rows = filtered.map(c => [
      c.firstName,
      c.lastName,
      c.email,
      c.nationalId,
      c.phone,
      getClientStatus(c),
      c.totalBorrowed,
      c.outstandingBalance
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClient = async (clientId: string) => {
    setIsDeleting(true);
    setOpenMenuId(null);
    try {
      const res = await deleteClientAction(clientId);
      if (res?.success) {
        toast.success('Client deleted successfully.');
      } else {
        toast.error(res?.error || 'Failed to delete client.');
      }
    } catch (err) {
      toast.error('An error occurred.');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 mt-6">
      {/* Table Toolbar Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Tabs */}
        <div className="status-filter-group w-fit">
          <Button
            onClick={() => setActiveTab('all')}
            className={cn('status-filter-pill', activeTab === 'all' && 'status-filter-pill-active')}
          >
            <div className="flex items-center gap-2">
              <UsersRound className="size-3.5" />
              <span>All Clients</span>
            </div>
          </Button>
          <Button
            onClick={() => setActiveTab('active')}
            className={cn('status-filter-pill', activeTab === 'active' && 'status-filter-pill-active')}
          >
            <div className="flex items-center gap-2">
              <ListChecks className="size-3.5" />
              <span>Active</span>
            </div>
          </Button>
          <Button
            onClick={() => setActiveTab('arrears')}
            className={cn('status-filter-pill', activeTab === 'arrears' && 'status-filter-pill-active')}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              <span>In Arrears</span>
            </div>
          </Button>
          <Button
            onClick={() => setActiveTab('cleared')}
            className={cn('status-filter-pill', activeTab === 'cleared' && 'status-filter-pill-active')}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5" />
              <span>Cleared</span>
            </div>
          </Button>
          <Button
            onClick={() => setActiveTab('new')}
            className={cn('status-filter-pill', activeTab === 'new' && 'status-filter-pill-active')}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5" />
              <span>New</span>
            </div>
          </Button>
        </div>

        {/* Right Side: Search & Export */}
        <div className="flex items-center gap-3">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Search clients..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <button onClick={exportToCSV} className="btn-secondary px-3 py-2 h-auto" title="Export to CSV">
            <Download className="size-4" />
          </button>
        </div>
      </div>
      <div className="data-table-wrap lg:block hidden">
        <div className="data-table-scroll">
          <Table className="data-table">
            <colgroup>
              <col style={{ width: '32%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <TableHeader>
              <TableRow className="data-table-head-row">
                <TableHead className="data-th text-left">Client</TableHead>
                <TableHead className="data-th text-left">ID / Phone</TableHead>
                <TableHead className="data-th text-left">Status</TableHead>
                <TableHead className="data-th text-right">Vehicle Loan</TableHead>
                <TableHead className="data-th text-right">Balance</TableHead>
                <TableHead className="data-th text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => {
                const status = getClientStatus(client);
                const whatsappUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}`;

                return (
                  <TableRow key={client.$id} className="data-table-row group/row">
                    <TableCell className="data-td">
                      <div className="flex items-center gap-3">
                        <ClientAvatar
                          firstName={client.firstName}
                          lastName={client.lastName}
                          photoUrl={client.profilePhotoUrl}
                          photoPath={client.profilePhotoPath}
                          size="md"
                        />
                        <div className="flex flex-col min-w-0">
                          <Link
                            href={`/clients/${client.$id}`}
                            className="client-name hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {client.firstName} {client.lastName}
                          </Link>
                          <span className="client-email">{client.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="data-td">
                      <div className="flex flex-col gap-1">
                        <span className="mono-pill">{client.nationalId}</span>
                        <span className="text-12 text-gray-500">{client.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell className="data-td">
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell className="data-td text-right">
                      <span className="amount-text">{formatAmount(client.totalBorrowed || 0)}</span>
                    </TableCell>
                    <TableCell className="data-td text-right">
                      <span className={cn('amount-text', status === 'Arrears' ? 'text-red-600' : 'text-gray-900')}>
                        {formatAmount(client.outstandingBalance || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="data-td text-right">
                      <div className="relative flex justify-end" ref={openMenuId === client.$id ? menuRef : undefined}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === client.$id ? null : client.$id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-500 hover:text-gray-800 transition-all shadow-sm"
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>

                        {openMenuId === client.$id && (
                          <div className="absolute right-0 top-9 z-50 h-auto w-42 rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden py-8">
                            <Link
                              href={`/clients/${client.$id}`}
                              onClick={() => setOpenMenuId(null)}
                              className="flex items-center gap-3 px-4 py-3 text-13 font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors translate-x-4"
                            >
                              <Eye className="size-4 shrink-0" />
                              View Profile
                            </Link>
                            <a
                              href={`tel:${client.phone}`}
                              onClick={() => setOpenMenuId(null)}
                              className="flex items-center gap-3 px-4 py-3 text-13 font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors translate-x-4"
                            >
                              <Phone className="size-4 shrink-0" />
                              Call Client
                            </a>
                            <Link
                              href={`/loans/create?clientId=${client.$id}`}
                              onClick={() => setOpenMenuId(null)}
                              className="flex items-center gap-3 px-4 py-3 text-13 font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors translate-x-4"
                            >
                              <PlusCircle className="size-4 shrink-0" />
                              New Agreement
                            </Link>
                            <div className="" />
                            <Link
                              href={`/clients/${client.$id}/edit`}
                              onClick={() => setOpenMenuId(null)}
                              className="flex items-center gap-3 px-4 py-3 text-13 font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors translate-x-4"
                            >
                              <UserCog className="size-4 shrink-0" />
                              Edit Profile
                            </Link>
                            {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                              <>
                                <div className="" />
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setDeleteTarget({ id: client.$id, name: `${client.firstName} ${client.lastName}` });
                                  }}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-13 font-medium text-red-600 hover:bg-red-50 transition-colors translate-x-4"
                                >
                                  <Trash2 className="size-4 shrink-0" />
                                  Delete Client
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="data-empty-cell">
                    <div className="data-empty">
                      <UsersRound className="size-8 text-gray-300" />
                      <p className="text-14 text-gray-600 font-medium mt-2">
                        {query ? `No clients match "${query}"` : 'No borrower records found'}
                      </p>
                      <p className="text-12 text-gray-400">
                        {query ? 'Try a different search term or check filters.' : 'Add clients to see them in the registry.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile + Tablet Responsive Cards (Visible on md/sm, hidden on lg) */}
      <TableResponsiveGrid
        className="
          lg:hidden
          mt-8
          mb-10
          gap-5
          p-6
        "
      >
        {filtered.map((client) => {
          const isOpen = expandedId === client.$id;
          const status = getClientStatus(client);

          return (
            <TableResponsiveCard
              key={client.$id}
              className="
                overflow-hidden
                rounded-3xl
                border border-slate-200/70
                bg-white
                shadow-sm
                transition-all duration-300
                hover:shadow-lg
                hover:shadow-slate-200/50
                p-5
                cursor-pointer
              "
            >
              {/* Header */}
              <TableResponsiveCardHeader
                onClick={() => setExpandedId(isOpen ? null : client.$id)}
                className="
                  p-5
                  cursor-pointer
                  flex
                  items-center
                  justify-between
                  gap-4
                "
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar */}
                  <div className="shrink-0">
                    <ClientAvatar
                      firstName={client.firstName}
                      lastName={client.lastName}
                      photoUrl={client.profilePhotoUrl}
                      photoPath={client.profilePhotoPath}
                      size="md"
                    />
                  </div>

                  {/* Client Info */}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[15px] text-slate-900 truncate">
                      {client.firstName} {client.lastName}
                    </h3>

                    <p className="text-sm text-slate-500 truncate mt-0.5">
                      {client.email || "No email provided"}
                    </p>

                    <div className="mt-2.5">
                      <StatusBadge status={status} />
                    </div>
                  </div>
                </div>

                {/* Expand Icon */}
                <div className="shrink-0 text-slate-400">
                  {isOpen ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </div>
              </TableResponsiveCardHeader>

              {/* Expandable Content */}
              <TableResponsiveCardContent isOpen={isOpen}>
                <div className="w-full space-y-4 px-4">
                  {/* Summary Box */}
                  <div
                    className="
                      rounded-2xl
                      bg-slate-50
                      p-4
                      grid
                      gap-4
                      translate-y-2
                    "
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">
                        National ID
                      </span>
                      <span
                        className="
                          badge
                          rounded-lg
                          bg-slate-100
                          px-2.5
                          py-1
                          text-xs
                          font-mono
                          border
                          text-slate-700
                        "
                      >
                        {client.nationalId}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">
                        Phone
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {client.phone}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">
                        Total Disbursed
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatAmount(client.totalBorrowed || 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">
                        Outstanding Balance
                      </span>
                      <span className={cn("font-semibold", status === 'Arrears' ? "text-red-600" : "text-slate-900")}>
                        {formatAmount(client.outstandingBalance || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button
                      asChild
                      variant="outline"
                      className="
                        rounded-xl
                        h-10
                        text-xs
                        font-medium
                        border-slate-200
                        hover:bg-slate-50
                        flex
                        items-center
                        justify-center
                        gap-1.5
                      "
                    >
                      <Link href={`/clients/${client.$id}`}>
                        <Eye className="size-3.5 text-gray-500" />
                        <span>Profile</span>
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="
                        rounded-xl
                        h-10
                        text-xs
                        font-medium
                        border-slate-200
                        hover:bg-slate-50
                        flex
                        items-center
                        justify-center
                        gap-1.5
                      "
                    >
                      <a href={`tel:${client.phone}`}>
                        <Phone className="size-3.5 text-gray-500" />
                        <span>Call</span>
                      </a>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      className="
                        rounded-xl
                        h-10
                        text-xs
                        font-medium
                        border-slate-200
                        hover:bg-slate-50
                        flex
                        items-center
                        justify-center
                        gap-1.5
                      "
                    >
                      <Link href={`/clients/${client.$id}/edit`}>
                        <UserCog className="size-3.5 text-gray-500" />
                        <span>Edit</span>
                      </Link>
                    </Button>

                    <Button
                      asChild
                      className="
                        rounded-xl
                        h-10
                        text-xs
                        font-semibold
                        bg-slate-900
                        hover:bg-slate-800
                        text-white
                        flex
                        items-center
                        justify-center
                        gap-1.5
                      "
                    >
                      <Link href={`/loans/create?clientId=${client.$id}`}>
                        <PlusCircle className="size-3.5" />
                        <span>New Loan</span>
                      </Link>
                    </Button>
                  </div>

                  {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                    <Button
                      variant="outline"
                      onClick={() => setDeleteTarget({ id: client.$id, name: `${client.firstName} ${client.lastName}` })}
                      className="
                        mt-2
                        w-full
                        rounded-xl
                        h-10
                        text-xs
                        font-medium
                        text-red-600
                        border-red-100
                        bg-red-50
                        hover:bg-red-100
                        hover:text-red-700
                        flex
                        items-center
                        justify-center
                        gap-1.5
                      "
                    >
                      <Trash2 className="size-3.5" />
                      <span>Delete Client</span>
                    </Button>
                  )}
                </div>
              </TableResponsiveCardContent>
            </TableResponsiveCard>
          );
        })}

        {filtered.length === 0 && (
          <div
            className="
              rounded-3xl
              border
              border-slate-200
              bg-white
              p-10
              text-center
              shadow-sm
              mx-auto
              mt-10
              w-full
            "
          >
            <UsersRound className="size-6 mx-auto mb-3 text-slate-300" />

            <h3 className="font-semibold text-slate-700">
              {query ? "No clients match your search" : "No Clients Found"}
            </h3>

            <p className="text-sm text-slate-400 mt-1">
              {query ? "Try adjusting your search or filter." : "Add clients to see them in the registry."}
            </p>
            <br />
          </div>
        )}
      </TableResponsiveGrid>


      {/* Custom Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDeleteClient(deleteTarget.id)}
        isPending={isDeleting}
        title="Delete Client"
        description="This will permanently remove the client and all associated data. This action cannot be undone."
        confirmLabel="Delete Client"
        itemName={deleteTarget?.name}
      />
    </div>
  );
}


