'use client';

import { Send, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

interface Stats {
  totalSent: number;
  delivered: number;
  failed: number;
  byChannel: {
    SMS: number;
    WHATSAPP: number;
    EMAIL: number;
  };
}

export default function CommunicationStats({ stats }: { stats: Stats | null }) {
  if (!stats) return null;

  const deliveryRate = stats.totalSent > 0
    ? Math.round((stats.delivered / stats.totalSent) * 100)
    : 0;

  const cards = [
    {
      label: "Total Sent",
      value: stats.totalSent,
      icon: <Send className="size-4" />,
      color: "text-blue-600 dark:text-[#65C8F2]",
      bg: "bg-blue-50 dark:bg-blue-950/40 border border-blue-200/40 dark:border-blue-900/40"
    },
    {
      label: "Delivery Rate",
      value: `${deliveryRate}%`,
      icon: <CheckCircle className="size-4" />,
      color: "text-emerald-600 dark:text-[#B7FF3C]",
      bg: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/40 dark:border-emerald-900/40"
    },
    {
      label: "Failed Sends",
      value: stats.failed,
      icon: <XCircle className="size-4" />,
      color: "text-red-600 dark:text-[#FF626D]",
      bg: "bg-red-50 dark:bg-red-950/40 border border-red-200/40 dark:border-red-900/40"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
      {cards.map((card, idx) => (
        <div key={idx} className="card-premium dark:bg-[#151D17] dark:border-[#29352D] p-4 flex items-center justify-between">
          <div>
            <p className="text-11 font-bold text-gray-400 dark:text-[#A1ADA4] uppercase tracking-widest">{card.label}</p>
            <h4 className="text-20 font-bold text-gray-900 dark:text-[#F4F7F4] mt-1">{card.value}</h4>
          </div>
          <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
