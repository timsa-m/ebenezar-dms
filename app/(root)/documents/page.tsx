import React from 'react';
import HeaderBox from '@/components/HeaderBox';
import Link from 'next/link';
import {
  FileText,
  Gavel,
  FileSpreadsheet,
  ArrowRight,
  type LucideIcon
} from 'lucide-react';

interface DocumentCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "danger" | "warning" | "success";
}

const badgeStyles = {
  default: "badge badge-pending",
  danger:  "badge badge-error",
  warning: "bg-amber-100 text-amber-700 text-10 font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
  success: "badge badge-success",
};

function DocumentCard({
  title,
  description,
  href,
  icon: Icon,
  badge,
  badgeVariant = "default",
}: DocumentCardProps) {
  return (
    <Link
      href={href}
      className="card-premium group flex flex-col gap-4 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="p-2.5 bg-primary/5 rounded-xl text-primary group-hover:bg-primary/10 transition-colors">
          <Icon className="size-5" />
        </div>
        {badge && (
          <span className={badgeStyles[badgeVariant]}>{badge}</span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="text-15 font-semibold text-gray-900 tracking-tight">{title}</h3>
        <p className="text-13 text-gray-500 mt-1 leading-relaxed">{description}</p>
      </div>

      <div className="flex items-center gap-1.5 text-primary text-12 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Generate Document</span>
        <ArrowRight className="size-3.5" />
      </div>
    </Link>
  );
}

const PRE_SALE_DOCS: DocumentCardProps[] = [
  {
    title: 'Proforma Invoice',
    description: 'Generate a preliminary bill of sale sent to buyers in advance of a vehicle delivery.',
    icon: FileSpreadsheet,
    href: '/documents/proforma-invoice'
  },
  {
    title: 'Commitment Receipt',
    description: 'Generate an acknowledgement of receipt of funds for a commitment/reservation of a vehicle.',
    icon: FileSpreadsheet,
    href: '/documents/commitment-receipt'
  }
];

const COMPLIANCE_DOCS: DocumentCardProps[] = [
  {
    title: 'Letter of Undertaking',
    description: 'Generate a legally binding promise by the client committing to specific payment or compliance terms.',
    icon: FileText,
    href: '/documents/undertaking'
  },
  {
    title: 'Demand Letter',
    description: 'Generate a formal notice for outstanding balances and default for a specific vehicle contract.',
    icon: Gavel,
    href: '/documents/demand-letter',
    badge: 'Warning',
    badgeVariant: 'warning'
  },
  {
    title: 'Agreement Cancellation',
    description: 'Generate a formal notice terminating a financing or purchase agreement due to breach or mutual consent.',
    icon: FileText,
    href: '/documents/cancellation',
    badge: 'Critical',
    badgeVariant: 'danger'
  },
  {
    title: 'Auctioneer Notice',
    description: 'Generate an official notice instructing auctioneers for asset recovery due to severe default.',
    icon: FileText,
    href: '/documents/auctioneer-notice',
    badge: 'Critical',
    badgeVariant: 'danger'
  }
];

export default function DocumentsPage() {
  return (
    <section className="home-content animate-fade-in">
      <header className="page-header">
        <HeaderBox
          title="Legal Documents"
          subtext="Generate formal and legal documents for your clients and contracts."
        />
      </header>

      {/* Pre-Sale & Agreements */}
      <div className="mb-8">
        <h2 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Pre-Sale &amp; Agreements
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRE_SALE_DOCS.map((doc) => (
            <DocumentCard key={doc.href} {...doc} />
          ))}
        </div>
      </div>

      {/* Compliance & Enforcement */}
      <div>
        <h2 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Compliance &amp; Enforcement
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMPLIANCE_DOCS.map((doc) => (
            <DocumentCard key={doc.href} {...doc} />
          ))}
        </div>
      </div>
    </section>
  );
}
