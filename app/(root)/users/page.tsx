import { getLoggedInUser, getPendingUsers } from '@/lib/actions/user.actions';
import { redirect } from 'next/navigation';
import { Users, ShieldAlert, CheckCircle, Clock, XCircle } from 'lucide-react';
import UsersTable from '@/components/UsersTable';
import InviteUserModal from '@/components/InviteUserModal';

export const metadata = {
  title: 'User Management | Ebenezar',
  description: 'Admin panel to approve or reject user access requests.',
};

export default async function UsersPage() {
  const loggedIn = await getLoggedInUser();

  // Only ADMINs can access this page
  if (!loggedIn || loggedIn.role !== 'ADMIN') {
    redirect('/');
  }

  const allUsers = await getPendingUsers();

  const pending  = allUsers.filter((u: any) => u.userStatus === 'pending');
  const active   = allUsers.filter((u: any) => u.userStatus === 'active');
  const rejected = allUsers.filter((u: any) => u.userStatus === 'rejected');

  const stats = [
    { label: 'Total Users', value: allUsers.length, icon: Users, colorClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-50 dark:bg-blue-950/40' },
    { label: 'Active', value: active.length, icon: CheckCircle, colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Pending Approval', value: pending.length, icon: Clock, colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-950/40' },
    { label: 'Rejected', value: rejected.length, icon: XCircle, colorClass: 'text-red-600 dark:text-red-400', bgClass: 'bg-red-50 dark:bg-red-950/40' },
  ];

  return (
    <div className="py-8 px-4 sm:px-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center text-white shrink-0">
              <ShieldAlert size={20} />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-[#F4F7F4] tracking-tight m-0">
              User Management
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-[#A1ADA4] m-0">
            Review and approve access requests for new users.
          </p>
        </div>
        <InviteUserModal />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, colorClass, bgClass }) => (
          <div
            key={label}
            className="bg-white dark:bg-[#151D17] border border-gray-100 dark:border-[#29352D] rounded-xl p-4 sm:p-5 flex items-center gap-3.5 shadow-sm"
          >
            <div className={`w-11 h-11 rounded-lg ${bgClass} flex items-center justify-center shrink-0`}>
              <Icon size={20} className={colorClass} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-[#F4F7F4] leading-none tabular-nums">
                {value}
              </div>
              <div className="text-xs text-gray-500 dark:text-[#A1ADA4] mt-1 font-medium">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending section */}
      {pending.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-[#F4F7F4] m-0 flex items-center">
              Pending Approval
              <span className="ml-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {pending.length}
              </span>
            </h2>
          </div>
          <div className="bg-white dark:bg-[#151D17] border border-amber-200 dark:border-amber-900/40 rounded-xl overflow-hidden shadow-sm">
            <UsersTable users={pending} />
          </div>
        </section>
      )}

      {/* All users section */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-base font-bold text-gray-900 dark:text-[#F4F7F4] m-0">
            All Users
          </h2>
        </div>
        <div className="bg-white dark:bg-[#151D17] border border-gray-100 dark:border-[#29352D] rounded-xl overflow-hidden shadow-sm">
          <UsersTable users={allUsers} />
        </div>
      </section>
    </div>
  );
}
