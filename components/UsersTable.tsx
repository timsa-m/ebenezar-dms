'use client';

import { useState, useTransition } from 'react';
import { approveUser, rejectUser } from '@/lib/actions/user.actions';
import { CheckCircle, XCircle, Clock, UserCheck, UserX, Shield, Mail, Calendar } from 'lucide-react';
import SecureActionModal from '@/components/security/SecureActionModal';
import { cn } from '@/lib/utils';

type UserRow = {
  $id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  userStatus: string;
};

type Props = {
  users: UserRow[];
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', className: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40', icon: Clock },
  active: { label: 'Active', className: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40', icon: CheckCircle },
  rejected: { label: 'Rejected', className: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/40', icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['pending'];
  const Icon = cfg.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
      cfg.className
    )}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

export default function UsersTable({ users }: Props) {
  const [isPending, startTransition] = useTransition();
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<UserRow | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const handleApprove = (id: string) => {
    setActionUserId(id);
    setFeedback(null);
    startTransition(async () => {
      const result = await approveUser(id);
      setFeedback({ id, msg: result.success ? 'User approved.' : result.error ?? 'Failed.', ok: result.success });
      setActionUserId(null);
    });
  };

  const handleReject = (userRow: UserRow) => {
    setRejectTarget(userRow);
  };

  const handleConfirmReject = (verificationToken: string) => {
    if (!rejectTarget) return;
    const id = rejectTarget.$id;
    setActionUserId(id);
    setFeedback(null);
    startTransition(async () => {
      const result = await rejectUser(id, verificationToken);
      setFeedback({ id, msg: result.success ? 'User rejected.' : result.error ?? 'Failed.', ok: result.success });
      setActionUserId(null);
      setRejectTarget(null);
    });
  };

  if (users.length === 0) {
    return (
      <div className="p-12 text-center text-gray-400 dark:text-[#A1ADA4] bg-white dark:bg-[#151D17] rounded-xl border border-gray-100 dark:border-[#29352D]">
        <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
        <p className="m-0 text-sm font-medium text-gray-500 dark:text-[#A1ADA4]">No users found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50/75 dark:bg-[#101612] border-b border-gray-200 dark:border-[#29352D]">
            {['User', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
              <th
                key={h}
                className="px-4 py-3.5 text-left font-bold text-gray-500 dark:text-[#A1ADA4] text-xs uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-[#29352D]">
          {users.map((user) => {
            const isActing = actionUserId === user.$id && isPending;
            const fb = feedback?.id === user.$id ? feedback : null;
            return (
              <tr
                key={user.$id}
                className="hover:bg-gray-50/50 dark:hover:bg-[#18221A] transition-colors"
              >
                {/* User */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(user.firstName?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-[#F4F7F4] text-sm">
                        {user.name}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3.5 text-gray-500 dark:text-[#A1ADA4] text-sm">
                  <div className="flex items-center gap-1.5">
                    <Mail size={13} className="shrink-0" />
                    {user.email}
                  </div>
                </td>

                {/* Role */}
                <td className="px-4 py-3.5">
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold border",
                    user.role === 'ADMIN'
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40"
                      : "bg-gray-50 dark:bg-[#18221A] text-gray-700 dark:text-[#C1CBC3] border-gray-200 dark:border-[#29352D]"
                  )}>
                    <Shield size={11} />
                    {user.role}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <StatusBadge status={user.userStatus} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  {fb ? (
                    <span className={cn(
                      "text-xs font-semibold",
                      fb.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {fb.msg}
                    </span>
                  ) : user.userStatus === 'pending' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(user.$id)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-60 transition-colors"
                      >
                        <UserCheck size={13} />
                        {isActing ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(user)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 text-xs font-semibold cursor-pointer disabled:opacity-60 transition-colors"
                      >
                        <UserX size={13} />
                        Reject
                      </button>
                    </div>
                  ) : user.userStatus === 'active' ? (
                    <button
                      onClick={() => handleReject(user)}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 text-xs font-semibold cursor-pointer disabled:opacity-60 transition-colors"
                    >
                      <UserX size={13} />
                      Revoke
                    </button>
                  ) : user.userStatus === 'rejected' ? (
                    <button
                      onClick={() => handleApprove(user.$id)}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-60 transition-colors"
                    >
                      <UserCheck size={13} />
                      Restore
                    </button>
                  ) : (
                    <span className="text-gray-400 dark:text-[#A1ADA4] text-xs">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Security Re-Authentication Modal for User Rejection / Revocation */}
      <SecureActionModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onAuthorized={handleConfirmReject}
        action="USER_STATUS_CHANGE"
        resourceId={rejectTarget?.$id || ''}
        title="Revoke User Access"
        description="Enter your administrator password to confirm revoking this user's active status and blocking them from system access."
        confirmLabel="Confirm Revoke Access"
        severity="danger"
        summaryItems={[
          { label: 'User Name', value: rejectTarget?.name || '' },
          { label: 'Email', value: rejectTarget?.email || '' },
          { label: 'Assigned Role', value: rejectTarget?.role || '' },
        ]}
      />
    </div>
  );
}
