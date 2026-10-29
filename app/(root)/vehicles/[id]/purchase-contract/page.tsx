export const dynamic = 'force-dynamic';

import { getPurchaseContractData } from "@/lib/actions/purchase.actions";
import PurchaseAgreementDocument from "@/components/PurchaseAgreementDocument";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export default async function VehiclePurchaseContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await getPurchaseContractData(id);

  if (!contract) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Purchase Contract Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">
            The requested motor vehicle purchase agreement or vehicle profile could not be loaded.
          </p>
          <Link
            href="/vehicles"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 px-5 py-2.5 rounded-xl transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PurchaseAgreementDocument
      contract={contract}
      backHref={`/vehicles/${id}`}
      allowEdit={true}
    />
  );
}
