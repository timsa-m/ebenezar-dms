import { getAllVehicles } from '@/lib/actions/vehicle.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import YardInventoryManager from '@/components/YardInventoryManager';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  const [vehicles, currentUser] = await Promise.all([
    getAllVehicles(),
    getLoggedInUser(),
  ]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in">
      <YardInventoryManager vehicles={vehicles} currentUser={currentUser} />
    </div>
  );
}
