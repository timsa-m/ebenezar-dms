import { getClientFullProfile } from "@/lib/actions/client.actions";
import { calculateClientMetrics } from "@/lib/metrics";
import ClientDetailsHeader from "@/components/details/ClientDetailsHeader";
import ClientTabs from "@/components/details/ClientTabs";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function ClientDetailsPage({ params }: SearchParamProps) {
  const { id } = await params;
  const profile = await getClientFullProfile(id);
  const clientMetrics = await calculateClientMetrics(id);

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
        <div className="p-4 bg-red-50 rounded-full mb-4">
          <AlertCircle className="size-10 text-red-500" />
        </div>
        <h1 className="text-24 font-bold text-gray-900 tracking-tight">Client Not Found</h1>
        <p className="text-gray-500 mt-2 max-w-md">
          The client profile you are looking for (ID: <span className="font-mono text-gray-700 bg-gray-100 px-1 py-0.5 rounded">{id}</span>) could not be loaded. It may have been deleted, or the ID might be incorrect.
        </p>
        <Link href="/clients" className="btn-primary mt-6">
          <ArrowLeft className="size-4" />
          <span>Return to Client List</span>
        </Link>
      </div>
    );
  }

  const { client, loans, repayments, penalties, auditLogs, notifications, documents } = profile;

  return (
    <section className="home-content">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 text-14 font-medium text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          Back to Client List
        </Link>
      </div>

      <div className="flex flex-col gap-10">
        {/* Header Section */}
        <ClientDetailsHeader client={client} penalties={penalties} loans={loans} />

        {/* Tabbed Content */}
        <div className="mt-4">
          <ClientTabs
            client={client}
            loans={loans}
            repayments={repayments}
            penalties={penalties}
            auditLogs={auditLogs}
            notifications={notifications}
            documents={documents}
            clientMetrics={clientMetrics}
          />
        </div>
      </div>
    </section>
  );
}
