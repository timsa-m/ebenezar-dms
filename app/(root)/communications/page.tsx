import HeaderBox from "@/components/HeaderBox";
import { getNotifications } from "@/lib/actions/collections.actions";
import { getClients } from "@/lib/actions/client.actions";
import CommunicationsTable from "@/components/CommunicationsTable";
import CommunicationStats from "@/components/details/CommunicationStats";
import CommunicationManager from "@/components/CommunicationManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";


export const dynamic = 'force-dynamic';

export default async function CommunicationsPage() {
  // Fetch all notifications (no filters)
  const notifications = await getNotifications({});

  // Calculate global stats
  const stats = {
    totalSent: notifications.length,
    delivered: notifications.filter(n => n.status === 'SENT' || n.status === 'DELIVERED').length,
    failed: notifications.filter(n => n.status === 'FAILED').length,
    byChannel: {
      SMS: notifications.filter(n => n.channel === 'SMS').length,
      WHATSAPP: notifications.filter(n => n.channel === 'WHATSAPP').length,
      EMAIL: notifications.filter(n => n.channel === 'EMAIL').length,
    }
  };

  // Fetch clients for the manual logger dropdown
  const allClients = await getClients() || [];
  const clientOptions = allClients.map((c: any) => ({
    id: c.$id,
    firstName: c.firstName,
    lastName: c.lastName,
    nationalId: c.nationalId || '',
    phone: c.phone,
    email: c.email
  }));

  return (
    <section className="home-content">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <header className="page-header">
          <HeaderBox
            title="Communication Logs"
            subtext="Logs of all client messages and delivery status."
          />
        </header>

        {/* The functional New Message / Log Button Component */}
        <div className="mt-4 md:mt-0">
          <CommunicationManager clients={clientOptions} />
        </div>
      </div>


      <div className="animate-fade-in space-y-12">
        {/* Global Analytics Section */}
        <CommunicationStats stats={stats} />
        <div className="h-4" />

        <div className="">
          {/* Global Message Log */}
          <div className="space-y-4">

            {/* Messages Log Header */}
            <section className="my-8">
              <div className="flex items-center justify-between">
                <h2 className="text-18 font-bold text-gray-900">
                  Message Audit Trail
                </h2>

                <span className="badge badge-primary border-slate-100 text-12 rounded-full border bg-white px-3 py-1 font-medium uppercase tracking-widest text-black shadow-sm">
                  Total Logs: {notifications.length}
                </span>
              </div>
            </section>
            <div className="h-4" />

            {/* Data Table */}
            <CommunicationsTable notifications={notifications} />

          </div>
        </div>
      </div>
    </section>
  );
}
