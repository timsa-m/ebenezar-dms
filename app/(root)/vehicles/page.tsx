export const dynamic = 'force-dynamic';

import HeaderBox from "@/components/HeaderBox";
import { getAllVehicles } from "@/lib/actions/vehicle.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { formatAmount } from "@/lib/utils";
import Link from "next/link";
import { PlusCircle, Car, TrendingDown, AlertTriangle } from "lucide-react";
import YardInventoryManager from "@/components/YardInventoryManager";

export default async function VehiclesPage() {
  const [vehiclesData, currentUser] = await Promise.all([
    getAllVehicles(),
    getLoggedInUser(),
  ]);
  const vehicles = vehiclesData || [];
  const activeVehicles = vehicles.filter((v: any) => v.status !== 'deleted');
  const vehiclesInStockList = activeVehicles.filter((v: any) => v.status === 'in_stock');
  const vehiclesInStock = vehiclesInStockList.length;
  // Inventory Value should only count vehicles currently in stock, using base_price (which includes landed costs) or purchase_price.
  const totalInventoryValue = vehiclesInStockList.reduce((acc: number, v: any) => acc + (Number(v.base_price) || Number(v.purchase_price) || 0), 0);

  return (
    <section className="home-content">
      <header className="page-header">
        <HeaderBox
          title="Vehicle Inventory"
          subtext="Manage and track all vehicles on loan and in the yard."
        />
        <Link href="/vehicles/create" className="btn-primary">
          <span>Add New Vehicle</span>
          <PlusCircle className="size-4 opacity-70" />
        </Link>
      </header>

      {/* Vehicle Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-premium flex flex-col justify-between group overflow-hidden relative hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full -z-10" style={{ backgroundColor: 'rgba(17,17,19,0.03)' }}></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Total Vehicles</p>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-700" style={{ outline: '1px solid rgba(229,231,235,0.5)' }}>
              <Car className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900">{vehicles.length}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-success">Registered</span>
              <p className="text-12 text-gray-500 font-medium">Total vehicles in system</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-danger-50 rounded-bl-full -z-10"></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">Total Inventory Value</p>
            <div className="p-2 bg-danger-50 rounded-lg text-danger-600" style={{ outline: '1px solid rgba(254,226,226,1)' }}>
              <TrendingDown className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900">{formatAmount(totalInventoryValue)}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-error">Value</span>
              <p className="text-12 text-gray-500 font-medium">Total purchase value</p>
            </div>
          </div>
        </div>

        <div className="card-premium flex flex-col justify-between group overflow-hidden relative border-l-4 border-l-warning-500 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning-50 rounded-bl-full -z-10"></div>
          <div className="flex justify-between items-start mb-6">
            <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">In Stock</p>
            <div className="p-2 bg-warning-50 rounded-lg text-warning-700" style={{ outline: '1px solid rgba(254,243,199,1)' }}>
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div>
            <h2 className="text-36 font-bold text-gray-900">{vehiclesInStock}</h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="badge badge-warning">Available</span>
              <p className="text-12 text-gray-500 font-medium">Vehicles ready for sale</p>
            </div>
          </div>
        </div>
      </div>

      <YardInventoryManager vehicles={vehicles} currentUser={currentUser} />
    </section>
  )
}

