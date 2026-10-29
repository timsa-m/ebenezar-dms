'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Gavel,
  Printer,
  ArrowLeft,
  UserCheck,
  Car,
  Edit3,
  Banknote,
  Clock,
  Calendar,
  Mail,
  FileText,
} from 'lucide-react';
import ContractSearchSelect, { Agreement } from '@/components/ContractSearchSelect';
import VehicleSearchSelect, { Vehicle } from '@/components/VehicleSearchSelect';
import { formatCurrencyInWords, numberToWords } from '@/lib/number-to-words';

export interface AgreementSummary {
  id: string;
  contractNo: string;
  balance?: number;
  salePrice?: number;
  depositPaid?: number;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientIdNumber?: string;
  nationalId?: string;
  clientAddress?: string;
  vehicleReg: string;
  vehicleMakeModel: string;
  vehicleChassis?: string;
  vehicleEngine?: string;
  vehicleColor?: string;
  vehicleYear?: string;
  backHref?: string;
  allowEdit?: boolean;
}

export interface DemandLetterData {
  documentTitle?: string;
  letterDate: string;
  clientFullName: string;
  clientSalutationName: string;
  vehicleReg: string;
  outstandingBalance: number;
  noticePeriodDays: string; // e.g. "SEVEN (7) DAYS"
  responsePeriodDays: string; // e.g. "five (5) days"
  contactEmail: string;
  signatory1Name: string;
  signatory1Role: string;
  signatory2Role: string;
  useFullLetterhead: boolean;
}

interface DemandLetterProps {
  data: DemandLetterData;
  isEditing: boolean;
  onChange: (data: Partial<DemandLetterData>) => void;
  onPrint?: () => void;
}

function HeaderLetterhead({
  title,
  isEditing,
  onTitleChange,
}: {
  title: string;
  isEditing: boolean;
  onTitleChange: (title: string) => void;
}) {
  return (
    <header className="agreement-header">
      <Image
        src="/icons/logo.png"
        alt="Ebenezar Car Bazaar"
        width={110}
        height={110}
        className="agreement-header-logo"
        priority
      />
      <div className="agreement-header-center">
        <h1>EBENEZAR ENTERPRISES LTD</h1>
        <p className="company-sub">CAR BAZAAR</p>
        <p>P.O. BOX 3547 - 40100, KISUMU | PATEL’S, ONDIEK HIGHWAY</p>
        <p>TEL: +254 722 263 192</p>
        {isEditing ? (
          <div className="mt-1 flex justify-center">
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value.toUpperCase())}
              className="agreement-inline-input font-bold text-center text-[15px] uppercase"
              style={{ width: '280px' }}
            />
          </div>
        ) : (
          <h2>{title}</h2>
        )}
      </div>
      <Image
        src="/icons/logo.png"
        alt="Ebenezar Car Bazaar"
        width={110}
        height={110}
        className="agreement-header-logo"
        priority
      />
    </header>
  );
}

export const DemandLetter: React.FC<DemandLetterProps> = ({
  data,
  isEditing,
  onChange,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Format currency with decimals e.g., "200,000.00"
  const formattedBalance = (Number(data.outstandingBalance) || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Uppercase currency words like "TWO HUNDRED THOUSAND KENYAN SHILLINGS ONLY"
  const wordsUpper = `${numberToWords(data.outstandingBalance)} KENYAN SHILLINGS ONLY`.toUpperCase();

  return (
    <div
      ref={printRef}
      className="demand-document-container relative bg-white shadow-xl border border-neutral-200 print:shadow-none print:border-none print:m-0"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '16mm 18mm',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: '#1a1a1a',
        fontSize: '12.5px',
        lineHeight: 1.55,
      }}
    >
      {/* Centered Watermark */}
      <div
        className="demand-watermark pointer-events-none select-none"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 0,
          opacity: 0.05,
          width: '5.5in',
          height: '5.5in',
        }}
      >
        <Image
          src="/icons/logo.png"
          alt=""
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Header Letterhead */}
      <HeaderLetterhead
        title={data.documentTitle || 'DEMAND LETTER'}
        isEditing={isEditing}
        onTitleChange={(title) => onChange({ documentTitle: title })}
      />

      {/* Recipient & Date Header Block */}
      <div className="relative z-10 mt-4 mb-5 text-[13px] leading-relaxed flex justify-between items-start">
        <div>
          <span className="text-[11px] font-bold text-neutral-500 block uppercase mb-1">TO:</span>
          {isEditing ? (
            <input
              type="text"
              value={data.clientFullName}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                const first = val.split(' ')[0] || '';
                const properFirst = first.charAt(0) + first.slice(1).toLowerCase();
                onChange({
                  clientFullName: val,
                  clientSalutationName: data.clientSalutationName || properFirst,
                });
              }}
              className="agreement-inline-input font-bold"
              style={{ width: '240px' }}
              placeholder="JOHN DOE OTIENO"
            />
          ) : (
            <p className="font-bold tracking-wide text-neutral-950 uppercase text-[13.5px]">
              {data.clientFullName}
            </p>
          )}
        </div>

        <div className="text-right">
          <span className="text-[11px] font-bold text-neutral-500 block uppercase mb-1">DATE:</span>
          {isEditing ? (
            <input
              type="text"
              value={data.letterDate}
              onChange={(e) => onChange({ letterDate: e.target.value })}
              className="agreement-inline-input text-right font-medium"
              style={{ width: '130px' }}
            />
          ) : (
            <span className="font-semibold text-neutral-800 text-[13px]">{data.letterDate}</span>
          )}
        </div>
      </div>
      <br />

      {/* Salutation */}
      <div className="relative z-10 mb-3.5">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-900 font-semibold text-[13px]">Dear</span>
            <input
              type="text"
              value={data.clientSalutationName}
              onChange={(e) => onChange({ clientSalutationName: e.target.value })}
              className="agreement-inline-input font-semibold"
              style={{ width: '130px' }}
              placeholder="John"
            />
            <span className="text-neutral-900 font-semibold text-[13px]">,</span>
          </div>
        ) : (
          <p className="text-[13px] font-medium text-neutral-900">
            Dear {data.clientSalutationName},
          </p>
        )}
      </div>

      {/* RE: Subject Line */}
      <div className="relative z-10 mb-4 pb-1">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[13px] text-neutral-950">RE: Demand for Outstanding Balance and Default for Motor Vehicle</span>
            <input
              type="text"
              value={data.vehicleReg}
              onChange={(e) => onChange({ vehicleReg: e.target.value.toUpperCase() })}
              className="agreement-inline-input font-bold tracking-wider"
              style={{ width: '110px' }}
              placeholder="KAA 123Z"
            />
          </div>
        ) : (
          <p style={{ marginBottom: '7px' }}
            className="text-[13px] font-bold text-neutral-950 underline underline-offset-3">
            RE: Demand for Outstanding Balance and Default for Motor Vehicle {data.vehicleReg}
          </p>
        )}
      </div>


      {/* Body Paragraphs */}
      <div className="relative z-10 space-y-3.5 text-[12.5px] leading-[1.65] text-neutral-900 text-justify">
        {/* Paragraph 1 */}
        <p>
          We hope this letter finds you well. We are writing to bring to your attention the outstanding
          balance of{' '}
          {isEditing ? (
            <span className="inline-flex items-center gap-1">
              <span className="font-bold">KES.</span>
              <input
                type="number"
                value={data.outstandingBalance || ''}
                onChange={(e) => onChange({ outstandingBalance: Number(e.target.value) || 0 })}
                className="agreement-inline-input font-bold"
                style={{ width: '110px' }}
              />
            </span>
          ) : (
            <strong className="font-bold text-neutral-950">
              Ksh. {formattedBalance}
            </strong>
          )}{' '}
          <strong className="font-bold text-neutral-950">
            ({wordsUpper})
          </strong>{' '}
          regarding your vehicle payment plan with Ebenezar Enterprises Limited. We kindly request that you settle
          this amount within{' '}
          {isEditing ? (
            <input
              type="text"
              value={data.noticePeriodDays}
              onChange={(e) => onChange({ noticePeriodDays: e.target.value })}
              className="agreement-inline-input font-bold"
              style={{ width: '120px' }}
              placeholder="SEVEN (7) DAYS"
            />
          ) : (
            <strong className="font-bold text-neutral-950">{data.noticePeriodDays}</strong>
          )}{' '}
          from the date of this notice or reach out to us so we can work together on a solution.
        </p>


        {/* Paragraph 2 */}
        <p style={{ marginTop: '7px', }}>
          This balance relates to the vehicle loan extended to you for Motor Vehicle{' '}
          {isEditing ? (
            <input
              type="text"
              value={data.vehicleReg}
              onChange={(e) => onChange({ vehicleReg: e.target.value.toUpperCase() })}
              className="agreement-inline-input font-bold"
              style={{ width: '100px' }}
            />
          ) : (
            <strong className="font-bold text-neutral-950">{data.vehicleReg}</strong>
          )}{' '}
          under our installment agreement.
        </p>


        {/* Options introduction */}
        <p>To help you get back on track, we offer the following helpful options:</p>

        {/* Numbered Options */}
        <ol className="relative list-decimal pl-6 space-y-2 text-neutral-900 font-medium left-5">
          <li>
            Settle the current outstanding balance within{' '}
            <strong className="font-bold text-neutral-950">{data.noticePeriodDays}</strong> to keep
            your account current; OR
          </li>
          <li>
            Report to the office for a restructure — our team will be glad to review options for
            restructuring your plan upon review by Ebenezar Enterprises Limited.
          </li>
        </ol>

        {/* Response instruction & email */}
        <p>
          Please get in touch with us within{' '}
          {isEditing ? (
            <input
              type="text"
              value={data.responsePeriodDays}
              onChange={(e) => onChange({ responsePeriodDays: e.target.value })}
              className="agreement-inline-input font-bold"
              style={{ width: '100px' }}
              placeholder="five (5) days"
            />
          ) : (
            <strong className="font-bold text-neutral-950">{data.responsePeriodDays}</strong>
          )}{' '}
          to let us know your preferred option. You may also reply in writing via e-mail to{' '}
          {isEditing ? (
            <input
              type="email"
              value={data.contactEmail}
              onChange={(e) => onChange({ contactEmail: e.target.value })}
              className="agreement-inline-input font-semibold text-blue-700"
              style={{ width: '200px' }}
            />
          ) : (
            <a
              href={`mailto:${data.contactEmail}`}
              className="text-blue-700 underline font-medium hover:text-blue-900"
            >
              {data.contactEmail}
            </a>
          )}
          .
        </p>

        {/* Paragraph 5 */}
        <p style={{ marginTop: '7px' }}>
          If you are currently experiencing financial difficulties, we encourage you to contact our
          office as soon as possible so we can discuss manageable payment arrangements. Open communication
          allows us to support you while keeping your vehicle loan active and in good standing.
        </p>

        {/* Paragraph 6 */}
        <p style={{ marginBottom: '7px', marginTop: '7px' }}>
          Please note that maintaining regular updates and payments helps prevent further administrative
          steps or account escalation. We appreciate your prompt attention to this matter and look forward
          to assisting you.
        </p>
      </div>

      {/* Sign-off & Signatures */}
      <div className="relative z-10 mt-8 pt-2">
        <p style={{ marginBottom: '7px' }}
          className="text-[12.5px] font-medium text-neutral-900 mb-1">Yours faithfully,</p>
        <p className="text-[13px] font-bold text-neutral-950 mb-9">For: Ebenezar Enterprises Limited;</p>
        <br />
        <div className="grid grid-cols-2 gap-12 items-end pt-4">
          {/* Signatory 1: Director */}
          <div>
            <div className="w-52 border-b-[1.5px] border-neutral-700 mb-2 h-8"></div>
            {isEditing ? (
              <div className="flex flex-col gap-1 w-52">
                <input
                  type="text"
                  value={data.signatory1Name}
                  onChange={(e) => onChange({ signatory1Name: e.target.value })}
                  className="agreement-inline-input font-bold text-xs"
                />
                <input
                  type="text"
                  value={data.signatory1Role}
                  onChange={(e) => onChange({ signatory1Role: e.target.value })}
                  className="agreement-inline-input text-xs"
                />
              </div>
            ) : (
              <div>
                <p className="font-bold text-[13px] text-neutral-950">{data.signatory1Name}</p>
                <p className="text-[12px] text-neutral-800 font-medium">{data.signatory1Role}</p>
              </div>
            )}
          </div>

          {/* Signatory 2: Legal Officer */}
          <div>
            <div className="w-52 border-b-[1.5px] border-neutral-700 mb-2 h-8"></div>
            {isEditing ? (
              <input
                type="text"
                value={data.signatory2Role}
                onChange={(e) => onChange({ signatory2Role: e.target.value })}
                className="agreement-inline-input font-semibold text-xs w-52"
              />
            ) : (
              <p className="font-bold text-[13px] text-neutral-950">{data.signatory2Role}</p>
            )}
          </div>
        </div>
      </div>

      {/* Global Document Styles */}
      <style jsx global>{`
        .demand-document-container {
          box-sizing: border-box;
        }
        .agreement-header {
          display: grid;
          grid-template-columns: 1.15in 1fr 1.15in;
          align-items: center;
          column-gap: 0.15in;
          margin-bottom: 0.2in;
          position: relative;
          z-index: 1;
        }
        .agreement-header-logo {
          object-fit: contain;
        }
        .agreement-header-logo:last-child {
          justify-self: end;
        }
        .agreement-header-center {
          text-align: center;
          font-family: 'Times New Roman', Times, serif;
        }
        .agreement-header-center h1 {
          margin: 0 0 3px;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: 0.02em;
          color: #1e3a8a;
        }
        .agreement-header-center .company-sub {
          font-size: 10.5px;
          font-weight: 700;
          color: #4b5563;
          margin: 0 0 3px;
          letter-spacing: 0.05em;
        }
        .agreement-header-center p {
          margin: 0 0 2px;
          font-size: 11.5px;
          font-weight: 600;
          color: #374151;
        }
        .agreement-header-center h2 {
          margin: 6px 0 0;
          font-size: 17px;
          font-weight: 800;
          text-decoration: underline;
          text-underline-offset: 3px;
          letter-spacing: 0.08em;
          color: #111827;
        }
        .agreement-inline-input {
          border: 1px solid #3b82f6;
          border-radius: 4px;
          padding: 1px 5px;
          font: inherit;
          outline: none;
          background: #eff6ff;
          display: inline-block;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            height: auto !important;
            overflow: visible !important;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print,
          .print\\:hidden,
          .home-content,
          header.page-header,
          aside,
          .sidebar,
          [role="status"] {
            display: none !important;
          }
          .demand-document-container {
            width: 100% !important;
            min-height: 100vh !important;
            padding: 16mm 20mm !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

interface DemandLetterClientProps {
  agreements: AgreementSummary[];
  backHref?: string;
  allowEdit?: boolean;
}

export default function DemandLetterClient({
  agreements = [],
  backHref = '/documents',
  allowEdit = true,
}: DemandLetterClientProps) {
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementSummary | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const today = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const [data, setData] = useState<DemandLetterData>({
    documentTitle: 'DEMAND LETTER',
    letterDate: today,
    clientFullName: '',
    clientSalutationName: '',
    vehicleReg: '',
    outstandingBalance: 0,
    noticePeriodDays: 'SEVEN (7) DAYS',
    responsePeriodDays: 'five (5) days',
    contactEmail: 'ebenezarent@gmail.com',
    signatory1Name: 'George Dola Andere',
    signatory1Role: 'Director',
    signatory2Role: 'Legal Officer',
    useFullLetterhead: true,
  });

  // Sync state when selected agreement changes
  useEffect(() => {
    if (!selectedAgreement) return;

    const balanceNum = Number(selectedAgreement.balance) || 0;
    const clientUpper = (selectedAgreement.clientName || '').trim().toUpperCase();
    const firstWord = clientUpper.split(' ')[0] || '';
    const properFirst = firstWord ? firstWord.charAt(0) + firstWord.slice(1).toLowerCase() : 'Client';

    setData((prev) => ({
      ...prev,
      letterDate: today,
      clientFullName: clientUpper,
      clientSalutationName: properFirst,
      vehicleReg: (selectedAgreement.vehicleReg || '').trim().toUpperCase(),
      outstandingBalance: balanceNum,
    }));
  }, [selectedAgreement, today]);

  const handleDataChange = (partial: Partial<DemandLetterData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const cursorPosition = input.selectionStart ?? rawValue.length;

    // Count how many numeric digits were before the cursor
    const digitsBeforeCursor = rawValue.slice(0, cursorPosition).replace(/\D/g, '').length;

    // Extract pure numbers
    const cleanDigits = rawValue.replace(/\D/g, '');
    const numValue = cleanDigits ? parseInt(cleanDigits, 10) : 0;

    handleDataChange({ outstandingBalance: numValue });

    // Restore cursor position smoothly after comma separators are formatted
    requestAnimationFrame(() => {
      const formatted = numValue ? numValue.toLocaleString('en-US') : '';
      let newCursor = 0;
      let digitCount = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitCount++;
        }
        if (digitCount === digitsBeforeCursor) {
          newCursor = i + 1;
          break;
        }
      }
      if (digitCount < digitsBeforeCursor) {
        newCursor = formatted.length;
      }
      input.setSelectionRange(newCursor, newCursor);
    });
  };

  // Derive unique vehicles from agreements list
  const vehicles: Vehicle[] = useMemo(() => {
    const list: Vehicle[] = [];
    const seen = new Set<string>();

    for (const ag of agreements) {
      if (ag.vehicleReg && !seen.has(ag.vehicleReg)) {
        seen.add(ag.vehicleReg);
        list.push({
          id: ag.id,
          registration_no: ag.vehicleReg,
          make_model: ag.vehicleMakeModel || 'Vehicle',
          sale_price: ag.salePrice ?? ag.balance,
        });
      }
    }
    return list;
  }, [agreements]);

  // Derived active vehicle for selected agreement
  const selectedVehicle: Vehicle | null = useMemo(() => {
    if (!selectedAgreement) return null;
    return {
      id: selectedAgreement.id,
      registration_no: selectedAgreement.vehicleReg,
      make_model: selectedAgreement.vehicleMakeModel || 'Vehicle',
      sale_price: selectedAgreement.salePrice ?? selectedAgreement.balance,
    };
  }, [selectedAgreement]);

  const handleSelectContract = (ag: Agreement | null) => {
    if (!ag) {
      setSelectedAgreement(null);
      return;
    }
    const targetId = ag.id ?? ag.$id;
    const fullAgreement = agreements.find((a) => a.id === targetId) ?? null;
    setSelectedAgreement(fullAgreement);
  };

  const handleSelectVehicle = (veh: Vehicle | null) => {
    if (!veh) {
      setSelectedAgreement(null);
      return;
    }
    const matchingAgreement = agreements.find(
      (a) => a.id === veh.id || a.vehicleReg.toLowerCase() === veh.registration_no.toLowerCase()
    );
    setSelectedAgreement(matchingAgreement ?? null);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print:p-0 print:m-0 print:w-full print:max-w-none">
      {/* Top Header Navigation */}
      <section className="home-content animate-fade-in no-print print:!hidden print:hidden">
        <header className="page-header no-print print:!hidden print:hidden">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.25rem',
                }}
              >
                <Link
                  href={backHref}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.75rem',
                    color: '#9CA3AF',
                    textDecoration: 'none',
                  }}
                >
                  <ArrowLeft size={13} /> Documents
                </Link>
              </div>
              <h1
                style={{
                  fontSize: '1.375rem',
                  fontWeight: 800,
                  color: '#111113',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                Demand Letter Generator
              </h1>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                Generate a formal demand letter for outstanding balances and notice of default.
              </p>
            </div>

            {selectedAgreement && (
              <div className="flex items-center gap-3">
                {allowEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="badge badge-primary h-10 w-36 shadow-sm flex items-center justify-center gap-2 px-4 py-2 border border-neutral-300 bg-white text-neutral-800 rounded-lg font-medium hover:bg-neutral-50 transition-colors shadow-sm text-sm"
                  >
                    <Edit3 className="w-4 h-4 text-neutral-600" />
                    {isEditing ? 'Preview Document' : 'Edit Letter'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn btn-primary flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm text-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print Letter
                </button>
              </div>
            )}
          </div>
        </header>
      </section>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 sm:p-8 flex flex-col lg:flex-row gap-8 print:p-0 print:m-0 print:w-full print:max-w-none">
        {/* Left Sidebar: Controls & Selection */}
        <div className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-6 no-print print:hidden">
          <div className="card-premium p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <UserCheck className="size-3.5" />
                  Select Contract
                </label>
                <ContractSearchSelect
                  key={selectedAgreement?.id || 'select-contract'}
                  agreements={agreements}
                  selectedAgreement={selectedAgreement}
                  onSelect={handleSelectContract}
                  placeholder="Search contract, client or plate…"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Car className="size-3.5" />
                  Vehicle Selection
                </label>
                <VehicleSearchSelect
                  key={selectedVehicle?.id || 'select-vehicle'}
                  vehicles={vehicles}
                  selectedVehicle={selectedVehicle}
                  onSelect={handleSelectVehicle}
                  placeholder="Search registration or make/model…"
                />
              </div>

              {selectedAgreement && (
                <>
                  <div className="border-t border-neutral-100 -my-1" />

                  {/* Outstanding Balance with Thousand Separator Formatting */}
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Banknote className="size-3.5" />
                      Outstanding Balance (KSH)
                    </label>
                    <label className="flex items-center h-11 w-full rounded-xl border border-neutral-200 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all cursor-text pl-3 pr-4">
                      <span className="text-xs relative left-5 font-bold text-neutral-500 select-none flex-shrink-0">
                        Ksh
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={data.outstandingBalance ? data.outstandingBalance.toLocaleString('en-US') : ''}
                        onChange={handleBalanceChange}
                        className="w-full relative left-10 h-full bg-transparent text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none pl-12"
                        placeholder="0"
                      />
                    </label>
                    {data.outstandingBalance > 0 && (
                      <p className="text-[11px] text-neutral-400 italic">
                        {numberToWords(data.outstandingBalance)} Kenyan Shillings Only
                      </p>
                    )}
                  </div>

                  {/* Notice Period */}
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="size-3.5" />
                      Settlement Notice Period
                    </label>
                    <label className="flex items-center h-11 w-full rounded-xl border border-neutral-200 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all cursor-text pl-3 pr-4">
                      <input
                        type="text"
                        value={data.noticePeriodDays}
                        onChange={(e) => handleDataChange({ noticePeriodDays: e.target.value })}
                        className="relative w-full left-5 h-11 px-4 pl-12 pr-4 bg-transparent text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all"
                        placeholder="e.g. SEVEN (7) DAYS"
                      />
                    </label>
                  </div>

                  {/* Response Timeframe */}
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="size-3.5" />
                      Response Timeframe
                    </label>
                    <label className="flex items-center h-11 w-full rounded-xl border border-neutral-200 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all cursor-text pl-3 pr-4">
                      <input
                        type="text"
                        value={data.responsePeriodDays}
                        onChange={(e) => handleDataChange({ responsePeriodDays: e.target.value })}
                        className="relative w-full left-5 h-11 px-4 pl-12 pr-4 bg-transparent text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all"
                        placeholder="e.g. five (5) days"
                      />
                    </label>
                  </div>

                  {/* Contact Email */}
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Mail className="size-3.5" />
                      Official Contact Email
                    </label>
                    <label className="flex items-center h-11 w-full rounded-xl border border-neutral-200 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all cursor-text pl-3 pr-4">
                      <input
                        type="email"
                        value={data.contactEmail}
                        onChange={(e) => handleDataChange({ contactEmail: e.target.value })}
                        className="relative w-full left-5 h-11 px-4 pl-12 pr-4 bg-transparent text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all"
                        placeholder="ebenezarent@gmail.com"
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Document Canvas */}
        <div className="flex-1 flex justify-center print:block print:w-full print:h-full overflow-x-auto">
          {!selectedAgreement ? (
            <div className="w-full h-full min-h-[400px] border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center text-neutral-400 print:hidden">
              <Gavel className="w-12 h-12 mb-4 text-neutral-300" />
              <p>Select a contract or vehicle to generate the demand letter.</p>
            </div>
          ) : (
            <DemandLetter
              data={data}
              isEditing={isEditing}
              onChange={handleDataChange}
            />
          )}
        </div>
      </main>
    </div>
  );
}
