'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FileText,
  Printer,
  ArrowLeft,
  UserCheck,
  Car,
  Edit3,
  Banknote,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import ContractSearchSelect, { Agreement } from '@/components/ContractSearchSelect';
import VehicleSearchSelect, { Vehicle } from '@/components/VehicleSearchSelect';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
import { cn } from '@/lib/utils';
import { numberToWords } from '@/lib/number-to-words';

const ORDINAL_DAYS: Record<number, string> = {
  1: 'First',
  2: 'Second',
  3: 'Third',
  4: 'Fourth',
  5: 'Fifth',
  6: 'Sixth',
  7: 'Seventh',
  8: 'Eighth',
  9: 'Ninth',
  10: 'Tenth',
  11: 'Eleventh',
  12: 'Twelfth',
  13: 'Thirteenth',
  14: 'Fourteenth',
  15: 'Fifteenth',
  16: 'Sixteenth',
  17: 'Seventeenth',
  18: 'Eighteenth',
  19: 'Nineteenth',
  20: 'Twentieth',
  21: 'Twenty-First',
  22: 'Twenty-Second',
  23: 'Twenty-Third',
  24: 'Twenty-Fourth',
  25: 'Twenty-Fifth',
  26: 'Twenty-Sixth',
  27: 'Twenty-Seventh',
  28: 'Twenty-Eighth',
  29: 'Twenty-Ninth',
  30: 'Thirtieth',
  31: 'Thirty-First',
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

export function convertYearToWords(year: number): string {
  const tens: Record<string, string> = {
    twenty: 'Twenty',
    thirty: 'Thirty',
    forty: 'Forty',
    fifty: 'Fifty',
    sixty: 'Sixty',
    seventy: 'Seventy',
    eighty: 'Eighty',
    ninety: 'Ninety',
  };
  const ones: Record<string, string> = {
    one: 'One',
    two: 'Two',
    three: 'Three',
    four: 'Four',
    five: 'Five',
    six: 'Six',
    seven: 'Seven',
    eight: 'Eight',
    nine: 'Nine',
  };

  const rawWords = numberToWords(year);
  const words = rawWords.toLowerCase().split(/\s+/);
  const formatted: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const curr = words[i];
    const next = words[i + 1];

    if (tens[curr] && ones[next]) {
      formatted.push(`${tens[curr]}-${ones[next]}`);
      i++;
    } else if (curr === 'and') {
      formatted.push('and');
    } else {
      formatted.push(curr.charAt(0).toUpperCase() + curr.slice(1));
    }
  }

  return formatted.join(' ');
}

export function formatDateToWords(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const day = date.getDate();
  const dayWord = ORDINAL_DAYS[day] || `${day}${getOrdinalSuffix(day)}`;
  const monthWord = MONTH_NAMES[date.getMonth()];
  const yearWord = convertYearToWords(date.getFullYear());
  return `${dayWord} day of ${monthWord}, ${yearWord}`;
}

export function formatDateToOrdinal(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = MONTH_NAMES[date.getMonth()];
  return `${day}${suffix} ${month}, ${date.getFullYear()}`;
}


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

export interface CancellationNoticeData {
  documentTitle?: string;
  noticeDate: string;
  clientFullName: string;
  clientIdNumber: string;
  clientAddress: string;
  contractNo: string;
  vehicleReg: string;
  vehicleMakeModel: string;
  vehicleChassis: string;
  vehicleEngine: string;
  vehicleColor: string;
  outstandingBalance: number;
  signatoryName: string;
  signatoryRole: string;
}

interface CancellationNoticeProps {
  data: CancellationNoticeData;
  isEditing: boolean;
  onChange: (data: Partial<CancellationNoticeData>) => void;
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
              style={{ width: '380px' }}
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

export const CancellationNotice: React.FC<CancellationNoticeProps> = ({
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
      className="cancellation-document-container relative bg-white shadow-xl border border-neutral-200 print:shadow-none print:border-none print:m-0"
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
        className="cancellation-watermark pointer-events-none select-none"
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
        title={data.documentTitle || 'NOTICE OF AGREEMENT CANCELLATION'}
        isEditing={isEditing}
        onTitleChange={(title) => onChange({ documentTitle: title })}
      />

      {/* Recipient & Date Header Block */}
      <div className="relative z-10 mt-4 mb-4 text-[13px] leading-relaxed flex justify-between items-start">
        <div>
          <span className="text-[11px] font-bold text-neutral-500 block uppercase mb-1">TO:</span>
          {isEditing ? (
            <div className="space-y-1">
              <input
                type="text"
                value={data.clientFullName}
                onChange={(e) => onChange({ clientFullName: e.target.value.toUpperCase() })}
                className="agreement-inline-input font-bold"
                style={{ width: '240px' }}
                placeholder="CLIENT FULL NAME"
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-500 font-semibold">ID No:</span>
                <input
                  type="text"
                  value={data.clientIdNumber}
                  onChange={(e) => onChange({ clientIdNumber: e.target.value })}
                  className="agreement-inline-input text-xs font-medium"
                  style={{ width: '150px' }}
                  placeholder="ID NUMBER"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-500 font-semibold">Address:</span>
                <input
                  type="text"
                  value={data.clientAddress}
                  onChange={(e) => onChange({ clientAddress: e.target.value })}
                  className="agreement-inline-input text-xs font-medium"
                  style={{ width: '180px' }}
                  placeholder="Client Address"
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="font-bold tracking-wide text-neutral-950 uppercase text-[13.5px]">
                {data.clientFullName || 'N/A'}
              </p>
              <p className="text-xs text-neutral-700">
                <strong>ID No:</strong> {data.clientIdNumber || 'N/A'}
              </p>
              {data.clientAddress && (
                <p className="text-xs text-neutral-600">
                  {data.clientAddress}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="text-right">
          <span className="text-[11px] font-bold text-neutral-500 block uppercase mb-1">DATE:</span>
          {isEditing ? (
            <input
              type="text"
              value={data.noticeDate}
              onChange={(e) => onChange({ noticeDate: e.target.value })}
              className="agreement-inline-input text-right font-medium"
              style={{ width: '320px' }}
            />
          ) : (
            <span className="font-semibold text-neutral-800 text-[13px]">{data.noticeDate}</span>
          )}
          <div className="mt-2 text-xs text-neutral-600 text-right">
            <p className="font-bold text-neutral-900">Ebenezar Enterprises Limited</p>
            <p>P.O. BOX 3547 - 40100, Kisumu</p>
            <p>Tel: +254 722 263 192</p>
          </div>
        </div>
      </div>

      {/* RE: Subject Line */}
      <div className="relative z-10 mb-4 pb-1">
        {isEditing ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="font-bold text-neutral-950">RE: CANCELLATION OF AGREEMENT</span>

            <span className="font-bold text-neutral-950">FOR MOTOR VEHICLE REG NO.</span>
            <input
              type="text"
              value={data.vehicleReg}
              onChange={(e) => onChange({ vehicleReg: e.target.value.toUpperCase() })}
              className="agreement-inline-input font-bold tracking-wider uppercase"
              style={{ width: '110px' }}
              placeholder="REG NO"
            />
          </div>
        ) : (
          <p
            style={{ marginBottom: '7px' }}
            className="text-[13px] font-bold text-neutral-950 underline underline-offset-3 uppercase"
          >
            RE: CANCELLATION OF AGREEMENT FOR MOTOR VEHICLE REG NO. {data.vehicleReg}
          </p>
        )}
      </div>

      {/* Body Paragraphs */}
      <div className="relative z-10 space-y-3.5 text-[12.5px] leading-[1.65] text-neutral-900 text-justify">
        <p style={{ marginBottom: '5px' }}>
          We write to formally notify you of the cancellation of the Agreement entered into between
          yourself and Ebenezar Enterprises Limited concerning the motor vehicle described below:
        </p>

        {/* Vehicle Details Box / Specs */}
        <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-lg p-4 text-[12.5px]">
          <div className="grid grid-cols-2 gap-x-6 p-4 relative left-3 gap-y-1.5">
            <div>
              <span className="font-semibold text-neutral-700">Registration No: </span>
              {isEditing ? (
                <input
                  type="text"
                  value={data.vehicleReg}
                  onChange={(e) => onChange({ vehicleReg: e.target.value.toUpperCase() })}
                  className="agreement-inline-input font-bold"
                  style={{ width: '110px' }}
                />
              ) : (
                <strong className="font-bold text-neutral-950">{data.vehicleReg}</strong>
              )}
            </div>
            <div>
              <span className="font-semibold text-neutral-700">Make & Model: </span>
              {isEditing ? (
                <input
                  type="text"
                  value={data.vehicleMakeModel}
                  onChange={(e) => onChange({ vehicleMakeModel: e.target.value })}
                  className="agreement-inline-input font-bold"
                  style={{ width: '140px' }}
                />
              ) : (
                <span className="font-bold text-neutral-900">{data.vehicleMakeModel}</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-neutral-700">Chassis No: </span>
              {isEditing ? (
                <input
                  type="text"
                  value={data.vehicleChassis}
                  onChange={(e) => onChange({ vehicleChassis: e.target.value.toUpperCase() })}
                  className="agreement-inline-input font-bold text-xs"
                  style={{ width: '150px' }}
                />
              ) : (
                <span className="font-bold text-xs text-neutral-900">{data.vehicleChassis || 'N/A'}</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-neutral-700">Engine No: </span>
              {isEditing ? (
                <input
                  type="text"
                  value={data.vehicleEngine}
                  onChange={(e) => onChange({ vehicleEngine: e.target.value.toUpperCase() })}
                  className="agreement-inline-input font-bold text-xs"
                  style={{ width: '140px' }}
                />
              ) : (
                <span className="font-bold text-xs text-neutral-900">{data.vehicleEngine || 'N/A'}</span>
              )}
            </div>
          </div>
        </div>

        <p style={{ marginTop: '7px' }} >
          This cancellation is executed pursuant to the fundamental breach of the terms and conditions outlined in the
          aforementioned agreement, specifically due to your failure to adhere to the agreed payment schedule.
        </p>

        <p style={{ marginBottom: '7px' }} >
          As of <strong>{data.noticeDate}</strong>, your outstanding arrears and balance amount to{' '}
          {isEditing ? (
            <span className="inline-flex items-center gap-1">
              <span className="font-bold">Ksh</span>
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
              Ksh {formattedBalance}
            </strong>
          )}{' '}
          <strong className="font-bold text-neutral-950">
            ({wordsUpper})
          </strong>. Despite our previous demands and notices, the breach has not been remedied.
        </p>

        <p>
          Consequently, Ebenezar Enterprises Limited hereby exercises its right to:
        </p>
        <ol className="relative list-decimal pl-6 space-y-1.5 text-neutral-900 font-medium left-5">
          <li>Terminate the said Agreement with immediate effect.</li>
          <li>Reclaim and repossess the motor vehicle without further reference to you.</li>
          <li>
            Forfeit the deposit and any installments paid as liquidated damages and administrative costs incurred due to
            your default, as provided under the agreement.
          </li>
        </ol>

        <p style={{ marginBottom: '7px', marginTop: '7px' }} >
          You are required to immediately surrender the vehicle (if not already repossessed), its keys, and all related
          documentation to our offices. Please be advised that any further use or retention of the vehicle by you will
          be considered unlawful and may result in legal proceedings.
        </p>

        <p
          style={{ marginBottom: '7px', marginTop: '7px' }}
          className="font-semibold text-neutral-950">
          This notice is final and takes effect immediately.
        </p>
      </div>

      {/* Sign-off & Signatures */}
      <div className="relative z-10 mt-8 pt-2">
        <p style={{ marginBottom: '7px' }} className="text-[12.5px] font-medium text-neutral-900 mb-1">
          Yours faithfully,
        </p>

        <br />
        <div className="grid grid-cols-2 gap-12 items-end pt-4">
          {/* Signatory: Authorized Signatory */}
          <div>
            <div className="w-52 border-b-[1.5px] border-neutral-700 mb-2 h-8"></div>
            {isEditing ? (
              <div className="flex flex-col gap-1 w-52">
                <input
                  type="text"
                  value={data.signatoryName}
                  onChange={(e) => onChange({ signatoryName: e.target.value })}
                  className="agreement-inline-input font-bold text-xs"
                />
                <input
                  type="text"
                  value={data.signatoryRole}
                  onChange={(e) => onChange({ signatoryRole: e.target.value })}
                  className="agreement-inline-input text-xs"
                />
              </div>
            ) : (
              <div>
                <p className="font-bold text-[13px] text-neutral-950">{data.signatoryName}</p>
                <p className="text-[12px] text-neutral-800 font-medium">{data.signatoryRole}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Document Styles */}
      <style jsx global>{`
        .cancellation-document-container {
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
          .cancellation-document-container {
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

interface CancellationClientProps {
  agreements?: AgreementSummary[];
  backHref?: string;
  allowEdit?: boolean;
}

export default function CancellationClient({
  agreements = [],
  backHref = '/documents',
  allowEdit = true,
}: CancellationClientProps) {
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementSummary | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedNoticeDate, setSelectedNoticeDate] = useState<Date | null>(() => new Date());
  const [dateFormatMode, setDateFormatMode] = useState<'words' | 'ordinal'>('ordinal');

  const today = useMemo(() => {
    return formatDateToOrdinal(new Date());
  }, []);

  const [data, setData] = useState<CancellationNoticeData>({
    documentTitle: 'NOTICE OF AGREEMENT CANCELLATION',
    noticeDate: today,
    clientFullName: '',
    clientIdNumber: '',
    clientAddress: '',
    contractNo: '',
    vehicleReg: '',
    vehicleMakeModel: '',
    vehicleChassis: '',
    vehicleEngine: '',
    vehicleColor: '',
    outstandingBalance: 0,
    signatoryName: 'Authorized Signatory',
    signatoryRole: 'For: Ebenezar Enterprises Limited',
  });

  // Sync state when selected agreement changes
  useEffect(() => {
    if (!selectedAgreement) return;

    const balanceNum = Number(selectedAgreement.balance) || 0;
    const clientUpper = (selectedAgreement.clientName || '').trim().toUpperCase();

    setData((prev) => ({
      ...prev,
      noticeDate: prev.noticeDate || today,
      clientFullName: clientUpper,
      clientIdNumber: selectedAgreement.clientIdNumber || '',
      clientAddress: selectedAgreement.clientAddress || '',
      contractNo: (selectedAgreement.contractNo || '').trim().toUpperCase(),
      vehicleReg: (selectedAgreement.vehicleReg || '').trim().toUpperCase(),
      vehicleMakeModel: selectedAgreement.vehicleMakeModel || '',
      vehicleChassis: selectedAgreement.vehicleChassis || '',
      vehicleEngine: selectedAgreement.vehicleEngine || '',
      vehicleColor: selectedAgreement.vehicleColor || '',
      outstandingBalance: balanceNum,
    }));
  }, [selectedAgreement, today]);

  const handleDataChange = (partial: Partial<CancellationNoticeData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const handleDateChange = (date: Date) => {
    setSelectedNoticeDate(date);
    if (!date) {
      handleDataChange({ noticeDate: '' });
      return;
    }
    const formatted = dateFormatMode === 'words' ? formatDateToWords(date) : formatDateToOrdinal(date);
    handleDataChange({ noticeDate: formatted });
  };

  const handleFormatModeChange = (mode: 'words' | 'ordinal') => {
    setDateFormatMode(mode);
    if (selectedNoticeDate) {
      const formatted = mode === 'words' ? formatDateToWords(selectedNoticeDate) : formatDateToOrdinal(selectedNoticeDate);
      handleDataChange({ noticeDate: formatted });
    }
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
                Agreement Cancellation Notice
              </h1>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                Generate a formal notice terminating a financing or purchase agreement.
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
                    {isEditing ? 'Preview Document' : 'Edit Notice'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn btn-primary flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm text-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print Notice
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
                      Outstanding Arrears / Balance (KSH)
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

                  {/* Notice Date */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="size-3.5" />
                        Notice Effective Date
                      </label>
                      <div className="flex items-center gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleFormatModeChange('words')}
                          className={cn(
                            "badge badge-primary px-2 py-0.5 rounded transition-all font-semibold cursor-pointer",
                            dateFormatMode === 'words'
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-neutral-500 hover:text-neutral-800 bg-neutral-100"
                          )}
                        >
                          Words
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFormatModeChange('ordinal')}
                          className={cn(
                            "badge badge-primary px-2 py-0.5 rounded transition-all font-semibold cursor-pointer",
                            dateFormatMode === 'ordinal'
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-neutral-500 hover:text-neutral-800 bg-neutral-100"
                          )}
                        >
                          Ordinal
                        </button>
                      </div>
                    </div>

                    <CustomDatePicker
                      selectedDate={selectedNoticeDate}
                      onChange={handleDateChange}
                      placeholder="Select effective date…"
                      formatDate={(d) => formatDateToOrdinal(d)}
                    />

                    {data.noticeDate && (
                      <p className="text-[11px] text-neutral-400 italic">
                        {data.noticeDate}
                      </p>
                    )}
                  </div>

                  {/* Signatory Name */}
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="size-3.5" />
                      Authorized Signatory
                    </label>
                    <label className="flex items-center h-11 w-full rounded-xl border border-neutral-200 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all cursor-text pl-3 pr-4">
                      <input
                        type="text"
                        value={data.signatoryName}
                        onChange={(e) => handleDataChange({ signatoryName: e.target.value })}
                        className="relative w-full left-5 h-11 px-4 pl-12 pr-4 bg-transparent text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-all"
                        placeholder="Authorized Signatory"
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
              <FileText className="w-12 h-12 mb-4 text-neutral-300" />
              <p>Select a contract or vehicle to generate the cancellation notice.</p>
            </div>
          ) : (
            <CancellationNotice
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
