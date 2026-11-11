export const dynamic = 'force-dynamic';

import HeaderBox from "@/components/HeaderBox";
import { getAllVehicles } from "@/lib/actions/vehicle.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import YardInventoryManager from "@/components/YardInventoryManager";

export default async function VehiclesPage() {
  const [vehiclesData, currentUser] = await Promise.all([
    getAllVehicles(),
    getLoggedInUser(),
  ]);
  const vehicles = vehiclesData || [];

  return (
    <section className="home-content">
      <header className="page-header">
        <HeaderBox
          title="Yard Inventory "
          subtext="Comprehensive stock monitoring, valuation, and yard operations."
        />

      </header>

      <YardInventoryManager vehicles={vehicles} currentUser={currentUser} />
    </section>
  );
}

