import { getVehicleWithCosts, getVehicleDocuments } from "@/lib/actions/vehicle.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import VehicleDetailsHeader from "@/components/details/VehicleDetailsHeader";
import VehicleTabs from "@/components/details/VehicleTabs";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function VehicleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ vehicle, costs, totalCostBasis }, documents, currentUser] = await Promise.all([
    getVehicleWithCosts(id),
    getVehicleDocuments(id),
    getLoggedInUser(),
  ]);

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
        <div className="p-4 bg-red-50 rounded-full mb-4">
          <AlertCircle className="size-10 text-red-500" />
        </div>
        <h1 className="text-24 font-bold text-gray-900 tracking-tight">Vehicle Not Found</h1>
        <p className="text-gray-500 mt-2 max-w-md">
          The vehicle profile you are looking for (ID: <span className="font-mono text-gray-700 bg-gray-100 px-1 py-0.5 rounded">{id}</span>) could not be loaded. It may have been deleted, or the ID might be incorrect.
        </p>
        <Link href="/vehicles" className="btn-primary mt-6">
          <ArrowLeft className="size-4" />
          <span>Return to Inventory</span>
        </Link>
      </div>
    );
  }

  return (
    <section className="home-content">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/vehicles"
          className="inline-flex items-center gap-2 text-14 font-medium text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          Back to Inventory
        </Link>
      </div>

      <div className="flex flex-col gap-10">
        {/* Header Section */}
        <VehicleDetailsHeader vehicle={vehicle} totalCostBasis={totalCostBasis} currentUser={currentUser} />

        {/* Tabbed Content */}
        <div className="mt-4">
          <VehicleTabs
            vehicle={vehicle}
            costs={costs}
            documents={documents}
          />
        </div>
      </div>
    </section>
  );
}
