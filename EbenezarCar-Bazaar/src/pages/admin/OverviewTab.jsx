import React, { useEffect, useState } from "react";
import { Car, MessageSquare, RefreshCw, CalendarClock } from "lucide-react";
import { getVehicles } from "../../services/vehicleApi";
import { fetchContacts, fetchTradeIns, fetchHireRequests } from "../../services/adminApi";

const OverviewTab = () => {
  const [metrics, setMetrics] = useState({
    vehicles: 0,
    contacts: 0,
    tradeIns: 0,
    hireRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadMetrics = async () => {
      try {
        const [vehRes, conRes, tradeRes, hireRes] = await Promise.all([
          getVehicles({ limit: 1 }),
          fetchContacts({ limit: 1 }),
          fetchTradeIns({ limit: 1 }),
          fetchHireRequests({ limit: 1 })
        ]);
        if (isMounted) {
          setMetrics({
            vehicles: vehRes.totalCount || 0,
            contacts: conRes.totalCount || 0,
            tradeIns: tradeRes.totalCount || 0,
            hireRequests: hireRes.totalCount || 0,
          });
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load metrics", error);
        if (isMounted) setLoading(false);
      }
    };
    loadMetrics();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-brand-muted/60 shadow-sm">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 border-3 border-brand-accent border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const cards = [
    { title: "Total Inventory", value: metrics.vehicles, Icon: Car, color: "bg-blue-50 text-blue-600 border-blue-100", iconBg: "bg-blue-100" },
    { title: "Contact Messages", value: metrics.contacts, Icon: MessageSquare, color: "bg-purple-50 text-purple-600 border-purple-100", iconBg: "bg-purple-100" },
    { title: "Trade-In Inquiries", value: metrics.tradeIns, Icon: RefreshCw, color: "bg-emerald-50 text-emerald-600 border-emerald-100", iconBg: "bg-emerald-100" },
    { title: "Hire Requests", value: metrics.hireRequests, Icon: CalendarClock, color: "bg-orange-50 text-orange-600 border-orange-100", iconBg: "bg-orange-100" }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-muted/60">
        <h2 className="text-lg font-semibold text-brand-primary mb-6">Dashboard Overview</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card, idx) => (
            <div key={idx} className={`p-6 rounded-2xl border ${card.color} transition-transform hover:scale-105 duration-200`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <card.Icon size={20} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Total</span>
              </div>
              <div>
                <p className="text-4xl font-bold mb-1">{card.value}</p>
                <p className="text-sm font-medium opacity-80">{card.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-muted/60">
        <h3 className="text-lg font-heading font-semibold text-brand-primary mb-4">Quick Actions</h3>
        <p className="text-slate-500 text-sm mb-6">Need to update inventory or respond to customers? Use the sidebar to navigate to specific management sections.</p>
        <div className="flex flex-wrap gap-4">
          <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
            <strong>Tip:</strong> You can now search vehicles by chassis number.
          </div>
          <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
            <strong>Tip:</strong> Drag and drop images directly into the vehicle form to upload instantly.
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
