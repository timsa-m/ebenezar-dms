import HeaderBox from "@/components/HeaderBox";
import { getVehicleWithCosts } from "@/lib/actions/vehicle.actions";
import VehicleEditForm from "@/components/VehicleEditForm";
import { notFound } from "next/navigation";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { vehicle } = await getVehicleWithCosts(id);

  if (!vehicle) {
    notFound();
  }

  return (
    <section className="home-content">
      <header className="mb-6">
        <HeaderBox 
          title="Edit Vehicle"
          subtext={`Updating particulars for ${vehicle.registration_no} (${vehicle.make_model})`}
        />
      </header>

      <section className="flex-1">
        <VehicleEditForm vehicle={vehicle} />
      </section>
    </section>
  )
}

