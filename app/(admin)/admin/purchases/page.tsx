import { getAllVehiclePurchases } from '@/lib/actions/purchase.actions';
import PurchasesManager from '@/components/PurchasesManager';
import HeaderBox from '@/components/HeaderBox';
import Link from 'next/link';
import { ArrowUpRight, Activity, Wallet, AlertTriangle, CheckCircle2, FileText, Plus } from 'lucide-react';
import { formatAmount } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminPurchasesPage() {
  const purchases = (await getAllVehiclePurchases()) || [];

  // Calculate metrics
  const totalPurchases = purchases.length;
  const totalValue = purchases.reduce((acc, p) => acc + (Number(p.purchase_price) || 0), 0);
  const totalPaid = purchases.reduce((acc, p) => acc + (Number(p.amount_paid) || 0), 0);
  const totalBalance = purchases.reduce((acc, p) => acc + (Number(p.balance) || 0), 0);

  // Consider a purchase 'Completed' if balance <= 0, otherwise 'Active' (meaning we owe money)
  const activePurchases = purchases.filter(p => (Number(p.balance) || 0) > 0).length;
  const completedPurchases = purchases.filter(p => (Number(p.balance) || 0) <= 0).length;

  return (
    <section className="home-content">
      <header className="page-header">
        <HeaderBox
          title="Vendors & Purchases"
          subtext="Inventory acquisition purchase contracts and seller/vendor details."
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/vehicles/create"
            className="btn-primary"
          >
            <span>Record Vehicle Purchase</span>
            <Plus className="size-4 opacity-70" />
          </Link>
          <Link
            href="/admin/contracts"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm"
          >
            <FileText size={14} />
            <span>Sales Agreements</span>
          </Link>
        </div>
      </header>

      {/* Purchase Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-success-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Total Purchases</p>
            <div className="p-2 bg-success-50 rounded-lg text-success-600 ring-1 ring-success-100">
              <Activity className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">{totalPurchases}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-success">Volume</span>
              <p className="text-12 text-gray-500 font-medium">Recorded acquisitions</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Total Value</p>
            <div className="p-2 bg-sky-50 rounded-lg text-sky-600 ring-1 ring-sky-100">
              <Wallet className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">
              <span className="text-sm font-semibold text-gray-500 mr-1">KES</span>
              {formatAmount(totalValue)}
            </h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-completed">Invested</span>
              <p className="text-12 text-gray-500 font-medium">Cumulative cost</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Amount Paid</p>
            <div className="p-2 bg-warning-50 rounded-lg text-warning-600 ring-1 ring-warning-100">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">
              <span className="text-sm font-semibold text-gray-500 mr-1">KES</span>
              {formatAmount(totalPaid)}
            </h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-pending">Settled</span>
              <p className="text-12 text-gray-500 font-medium">To vendors</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-danger-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Payable Balance</p>
            <div className="p-2 bg-danger-50 rounded-lg text-danger-600 ring-1 ring-danger-100">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900 tabular-nums">
              <span className="text-sm font-semibold text-gray-500 mr-1">KES</span>
              {formatAmount(totalBalance)}
            </h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-error">Owed</span>
              <p className="text-12 text-gray-500 font-medium">Outstanding vendor debt</p>
            </div>
          </div>
        </div>
      </div>

      <PurchasesManager purchases={purchases} />
    </section>
  );
}
