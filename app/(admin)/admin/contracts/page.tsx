import { getFinancingAgreements } from '@/lib/actions/dms.actions';
import ContractsManager from '@/components/ContractsManager';

export const dynamic = 'force-dynamic';

export default async function AdminContractsPage() {
  const agreements = await getFinancingAgreements();

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-fade-in">
      <ContractsManager agreements={agreements} />
    </div>
  );
}
