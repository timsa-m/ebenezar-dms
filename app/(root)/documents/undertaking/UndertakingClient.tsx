'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
  FileText,
  Search,
  Printer,
  ArrowLeft,
  Building2,
  UserCheck,
  Car,
  Edit3,
  ChevronDown,
  Banknote,
} from 'lucide-react';
import Link from 'next/link';
import ContractSearchSelect, { Agreement } from '@/components/ContractSearchSelect';
import VehicleSearchSelect, { Vehicle } from '@/components/VehicleSearchSelect';
import { formatCurrencyInWords } from '@/lib/number-to-words';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FinancierPreset {
  id: string;
  shortName: string;
  name: string;
  poBox: string;
  city: string;
  jointParty: string;
}

export const PRESET_FINANCIERS: FinancierPreset[] = [
  {
    id: 'momentum',
    shortName: 'Momentum Credit',
    name: 'MOMENTUM CREDIT LIMITED',
    poBox: 'P.O BOX 29175-00100',
    city: 'NAIROBI',
    jointParty: 'Momentum Credit Limited',
  },
  {
    id: 'progressive',
    shortName: 'Progressive Credit',
    name: 'PROGRESSIVE CREDIT LIMITED',
    poBox: 'P.O BOX 6290-00100',
    city: 'NAIROBI',
    jointParty: 'Progressive Credit Limited',
  },
  {
    id: 'platinum',
    shortName: 'Platinum Credit',
    name: 'PLATINUM CREDIT LIMITED',
    poBox: 'P.O BOX 47683-00100',
    city: 'NAIROBI',
    jointParty: 'Platinum Credit Limited',
  },
  {
    id: 'mogo',
    shortName: 'Mogo Kenya',
    name: 'MOGO AUTO LIMITED',
    poBox: 'P.O BOX 41657-00100',
    city: 'NAIROBI',
    jointParty: 'Mogo Kenya Limited',
  },
  {
    id: 'watu',
    shortName: 'Watu Credit',
    name: 'WATU CREDIT LIMITED',
    poBox: 'P.O BOX 1032-00100',
    city: 'MOMBASA',
    jointParty: 'Watu Credit Limited',
  },
];

export interface AgreementSummary {
  id: string;
  contractNo: string;
  balance?: number;
  salePrice?: number;
  depositPaid?: number;
  clientName: string;
  clientPhone: string;
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

export interface LetterOfUndertakingData {
  documentTitle: string;
  referenceNo?: string;
  recipientCompany: string;
  recipientBox: string;
  recipientCity: string;
  letterDate: string;
  salutation: string;
  refSubject: string;
  incomingLetterDate: string;
  vehicleReg: string;
  vehicleMakeModel?: string;
  clientName: string;
  clientPrefix: string;
  jointParty: string;
  loanAmount: number;
  paymentDueDate: string;
  payableTo: string;
  // Bank details
  bankName: string;
  bankBranch: string;
  accountNo: string;
  accountName: string;
  // Signatory
  closingRemarks: string;
  signatoryName: string;
  signatoryCompany: string;
  signatoryAddress: string;
  signatoryCity: string;
  signatoryMobile: string;
}

interface LetterOfUndertakingProps {
  data: LetterOfUndertakingData;
  isEditing: boolean;
  onChange: (data: Partial<LetterOfUndertakingData>) => void;
  onPrint?: () => void;
}

function Watermark() {
  return (
    <div className="agreement-watermark" aria-hidden="true">
      <Image src="/icons/logo.png" alt="" fill className="object-contain" priority />
    </div>
  );
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

export const LetterOfUndertaking: React.FC<LetterOfUndertakingProps> = ({
  data,
  isEditing,
  onChange,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const money = (val: number) => (Number(val) || 0).toLocaleString('en-KE');
  const amountWords = formatCurrencyInWords(data.loanAmount);

  const handleFinancierSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const found = PRESET_FINANCIERS.find((f) => f.id === selectedId);
    if (found) {
      onChange({
        recipientCompany: found.name,
        recipientBox: found.poBox,
        recipientCity: found.city,
        jointParty: found.jointParty,
      });
    }
  };

  return (
    <div
      ref={printRef}
      className="undertaking-document-container relative bg-white shadow-xl border border-neutral-200 print:shadow-none print:border-none print:m-0"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '16mm 18mm',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Watermark */}
      <Watermark />

      {/* Header Letterhead */}
      <HeaderLetterhead
        title={data.documentTitle}
        isEditing={isEditing}
        onTitleChange={(title) => onChange({ documentTitle: title })}
      />

      {/* Recipient & Date Header Block */}
      <div className="relative z-10 mt-4 mb-5 text-[13px] leading-relaxed">
        <div className="flex justify-between items-start">
          <div className="text-neutral-900 font-semibold uppercase tracking-wide">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-neutral-500">TO:</span>
              {isEditing && (
                <div className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs text-blue-900 normal-case font-normal no-print">
                  <Building2 className="w-3 h-3 text-blue-700" />
                  <span className="text-[10px] font-semibold">Preset:</span>
                  <select
                    onChange={handleFinancierSelect}
                    className="bg-transparent text-[11px] font-bold text-blue-950 outline-none cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>Choose financier...</option>
                    {PRESET_FINANCIERS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.shortName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-1.5 w-72">
                <input
                  type="text"
                  value={data.recipientCompany}
                  onChange={(e) => onChange({ recipientCompany: e.target.value.toUpperCase() })}
                  className="agreement-inline-input font-bold"
                  placeholder="MOMENTUM CREDIT LIMITED"
                />
                <input
                  type="text"
                  value={data.recipientBox}
                  onChange={(e) => onChange({ recipientBox: e.target.value.toUpperCase() })}
                  className="agreement-inline-input"
                  placeholder="P.O BOX 29175-00100"
                />
                <input
                  type="text"
                  value={data.recipientCity}
                  onChange={(e) => onChange({ recipientCity: e.target.value.toUpperCase() })}
                  className="agreement-inline-input"
                  placeholder="NAIROBI"
                />
              </div>
            ) : (
              <div>
                <p className="font-bold text-[13.5px] text-neutral-950">{data.recipientCompany}</p>
                <p>{data.recipientBox}</p>
                <p>{data.recipientCity}</p>
              </div>
            )}
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-neutral-500 block uppercase">Date:</span>
            {isEditing ? (
              <input
                type="text"
                value={data.letterDate}
                onChange={(e) => onChange({ letterDate: e.target.value })}
                className="agreement-inline-input text-right font-medium"
              />
            ) : (
              <span className="font-semibold text-neutral-800 text-[13px]">{data.letterDate}</span>
            )}
          </div>
        </div>
      </div>
      <br />

      {/* Salutation */}
      <div className="relative z-10 mb-3 text-[13.5px]">
        {isEditing ? (
          <input
            type="text"
            value={data.salutation}
            onChange={(e) => onChange({ salutation: e.target.value })}
            className="agreement-inline-input w-48 font-medium"
          />
        ) : (
          <p className="font-medium text-neutral-800">{data.salutation}</p>
        )}
      </div>

      {/* Reference Line */}
      <div className="relative z-10 mb-4 pb-1">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-900 text-sm">REF:</span>
            <input
              type="text"
              value={data.refSubject}
              onChange={(e) => onChange({ refSubject: e.target.value.toUpperCase() })}
              className="agreement-inline-input flex-1 font-bold text-blue-950 uppercase"
              placeholder="Loan for client."
            />
          </div>
        ) : (
          <h3 className="text-[13.5px] font-black uppercase tracking-wide text-neutral-900 underline underline-offset-4 decoration-neutral-800 m-0">
            {data.refSubject.startsWith('REF:') ? data.refSubject : `REF: ${data.refSubject}`}
          </h3>
        )}
      </div>

      {/* Body Content */}
      <div className="relative z-10 space-y-3.5 text-[13px] leading-[1.65] text-neutral-800 text-justify">
        {/* Paragraph 1 */}
        <p style={{ marginBottom: '1rem' }}>
          Following your letter dated{' '}
          {isEditing ? (
            <input
              type="text"
              value={data.incomingLetterDate}
              onChange={(e) => onChange({ incomingLetterDate: e.target.value })}
              className="agreement-inline-input font-bold"
              style={{ width: '150px' }}
            />
          ) : (
            <strong className="font-bold text-neutral-950">{data.incomingLetterDate}</strong>
          )}
          , we hereby acknowledge and assure you that we have with us the original logbook for motor
          vehicle registration number{' '}
          {isEditing ? (
            <input
              type="text"
              value={data.vehicleReg}
              onChange={(e) => onChange({ vehicleReg: e.target.value.toUpperCase() })}
              className="agreement-inline-input font-bold tracking-wider"
              style={{ width: '110px' }}
            />
          ) : (
            <strong className="font-bold text-neutral-950 tracking-wide">{data.vehicleReg}</strong>
          )}
          {data.vehicleMakeModel && <span> {data.vehicleMakeModel}</span>}.
        </p>

        {/* Paragraph 2 */}
        <p style={{ marginBottom: '1rem' }}>
          Kindly be informed that we undertake to release to you the original logbook and initiate the
          online transfer to{' '}
          {isEditing ? (
            <span className="inline-flex items-center gap-1">
              <input
                type="text"
                value={data.clientPrefix}
                onChange={(e) => onChange({ clientPrefix: e.target.value })}
                className="agreement-inline-input w-14 font-bold"
                placeholder="MRS."
              />
              <input
                type="text"
                value={data.clientName}
                onChange={(e) => onChange({ clientName: e.target.value.toUpperCase() })}
                className="agreement-inline-input font-bold"
                style={{ width: '210px' }}
                placeholder="PAMELA AKINYI NYAMOLO"
              />
            </span>
          ) : (
            <strong className="font-bold text-neutral-950">
              {data.clientPrefix ? `${data.clientPrefix} ` : ''}{data.clientName}
            </strong>
          )}{' '}
          and{' '}
          {isEditing ? (
            <input
              type="text"
              value={data.jointParty}
              onChange={(e) => onChange({ jointParty: e.target.value })}
              className="agreement-inline-input font-bold"
              style={{ width: '190px' }}
              placeholder="Momentum Credit Limited"
            />
          ) : (
            <strong className="font-bold text-neutral-950">{data.jointParty}</strong>
          )}
          . Only on condition that we receive the outstanding loan balance of{' '}
          {isEditing ? (
            <div className="my-1.5 p-2 bg-blue-50/70 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-600">KES:</span>
                <input
                  type="number"
                  value={data.loanAmount || ''}
                  onChange={(e) => onChange({ loanAmount: Number(e.target.value) || 0 })}
                  className="agreement-inline-input font-bold"
                  style={{ width: '140px' }}
                />
              </div>
              <div className="text-xs italic text-blue-900 mt-1 font-medium">
                Words: {amountWords ? `{${amountWords}}` : ''}
              </div>
            </div>
          ) : (
            <>
              <strong className="font-bold text-neutral-950">
                Ksh {money(data.loanAmount)}/=
              </strong>{' '}
              <span className="font-medium text-neutral-900">
                {`${amountWords}`}
              </span>
            </>
          )}
        </p>

        {/* Paragraph 3 */}
        <p>
          The loan is supposed to be paid on or before{' '}
          {isEditing ? (
            <input
              type="text"
              value={data.paymentDueDate}
              onChange={(e) => onChange({ paymentDueDate: e.target.value })}
              className="agreement-inline-input font-bold"
              style={{ width: '170px' }}
            />
          ) : (
            <strong className="font-bold text-neutral-950">{data.paymentDueDate}</strong>
          )}
          , Please try to pay not later than{' '}
          {isEditing ? (
            <input
              type="text"
              value={data.paymentDueDate}
              onChange={(e) => onChange({ paymentDueDate: e.target.value })}
              className="agreement-inline-input font-bold"
              style={{ width: '170px' }}
            />
          ) : (
            <strong className="font-bold text-neutral-950">{data.paymentDueDate}</strong>
          )}{' '}
          to avoid any penalty that may arise and ensure that the settlement is made in favor of{' '}
          {isEditing ? (
            <input
              type="text"
              value={data.payableTo}
              onChange={(e) => onChange({ payableTo: e.target.value.toUpperCase() })}
              className="agreement-inline-input font-bold"
              style={{ width: '220px' }}
            />
          ) : (
            <strong className="font-bold text-neutral-950">{data.payableTo}</strong>
          )}
          .
        </p>
      </div>
      <br />

      {/* Section: Structured Bank Details */}
      <div className="agreement-section mt-5 mb-4 relative z-10">
        <h3 className="text-[12px] font-black uppercase text-black pb-1 mb-2 tracking-wider">
          BANK DETAILS
        </h3>
        <div className="payment-table border border-slate-200 rounded">
          <div className="payment-row">
            <span className="payment-label font-bold text-neutral-700">BANK</span>
            <span className="payment-colon text-neutral-400">:</span>
            {isEditing ? (
              <input
                type="text"
                value={data.bankName}
                onChange={(e) => onChange({ bankName: e.target.value.toUpperCase() })}
                className="agreement-input"
              />
            ) : (
              <span className="font-bold text-neutral-950">{data.bankName}</span>
            )}
          </div>

          <div className="payment-row">
            <span className="payment-label font-bold text-neutral-700">BRANCH</span>
            <span className="payment-colon text-neutral-400">:</span>
            {isEditing ? (
              <input
                type="text"
                value={data.bankBranch}
                onChange={(e) => onChange({ bankBranch: e.target.value.toUpperCase() })}
                className="agreement-input"
              />
            ) : (
              <span className="font-bold text-neutral-950">{data.bankBranch}</span>
            )}
          </div>

          <div className="payment-row">
            <span className="payment-label font-bold text-neutral-700">ACCOUNT NO.</span>
            <span className="payment-colon text-neutral-400">:</span>
            {isEditing ? (
              <input
                type="text"
                value={data.accountNo}
                onChange={(e) => onChange({ accountNo: e.target.value })}
                className="agreement-input font-roboto font-bold"
              />
            ) : (
              <span className="font-bold font-mono tracking-wider text-neutral-950">
                {data.accountNo}
              </span>
            )}
          </div>

          <div className="payment-row bg-slate-50/70">
            <span className="payment-label font-bold text-neutral-700">ACCOUNT NAME</span>
            <span className="payment-colon text-neutral-400">:</span>
            {isEditing ? (
              <input
                type="text"
                value={data.accountName}
                onChange={(e) => onChange({ accountName: e.target.value.toUpperCase() })}
                className="agreement-input font-bold"
              />
            ) : (
              <span className="font-bold text-blue-900">{data.accountName}</span>
            )}
          </div>
        </div>
      </div>

      {/* Closing Courtesy Line */}
      <div className="relative z-10 my-4 text-[13px] text-neutral-800">
        {isEditing ? (
          <input
            type="text"
            value={data.closingRemarks}
            onChange={(e) => onChange({ closingRemarks: e.target.value })}
            className="agreement-input"
          />
        ) : (
          <p className="italic text-neutral-800">{data.closingRemarks}</p>
        )}
      </div>

      {/* Signatory & Authorization Section */}
      <div className="signatures-section relative z-10 mt-7 pt-2">
        <div className="flex justify-between items-end gap-12">
          {/* Signatory Details (George Dola Andere) */}
          <div className="flex-1">
            <div className="w-56 border-b-[1.5px] border-slate-700 mb-2 h-10"></div>
            {isEditing ? (
              <div className="flex flex-col gap-1 w-64 text-xs">
                <input
                  type="text"
                  value={data.signatoryName}
                  onChange={(e) => onChange({ signatoryName: e.target.value.toUpperCase() })}
                  className="agreement-inline-input font-bold"
                  placeholder="GEORGE DOLA ANDERE"
                />
                <input
                  type="text"
                  value={data.signatoryCompany}
                  onChange={(e) => onChange({ signatoryCompany: e.target.value.toUpperCase() })}
                  className="agreement-inline-input font-semibold"
                  placeholder="EBENEZAR ENTERPRISES LTD."
                />
                <input
                  type="text"
                  value={data.signatoryAddress}
                  onChange={(e) => onChange({ signatoryAddress: e.target.value.toUpperCase() })}
                  className="agreement-inline-input"
                  placeholder="P.O BOX 3547-40100"
                />
                <input
                  type="text"
                  value={data.signatoryCity}
                  onChange={(e) => onChange({ signatoryCity: e.target.value.toUpperCase() })}
                  className="agreement-inline-input"
                  placeholder="KISUMU"
                />
                <input
                  type="text"
                  value={data.signatoryMobile}
                  onChange={(e) => onChange({ signatoryMobile: e.target.value })}
                  className="agreement-inline-input font-roboto"
                  placeholder="MOBILE 0722-263-192"
                />
              </div>
            ) : (
              <div className="text-[12.5px] leading-snug text-neutral-900 font-semibold uppercase">
                <p className="font-extrabold text-[13px] text-neutral-950">{data.signatoryName}</p>
                <p className="font-bold text-blue-900">{data.signatoryCompany}</p>
                <p>{data.signatoryAddress}</p>
                <p>{data.signatoryCity}</p>
                <p className="font-roboto text-neutral-800 tracking-wide font-bold">
                  {data.signatoryMobile.startsWith('MOBILE') ? data.signatoryMobile : `MOBILE ${data.signatoryMobile}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Document Styles */}
      <style jsx global>{`
        .undertaking-document-container {
          font-family: 'Roboto', sans-serif;
          color: #111;
          font-size: 13px;
          line-height: 1.5;
          box-sizing: border-box;
        }
        .agreement-watermark {
          position: absolute;
          z-index: 0;
          width: 5in;
          height: 4in;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.04;
          pointer-events: none;
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
        .agreement-input {
          width: 100%;
          border: 1px solid #3b82f6;
          border-radius: 4px;
          padding: 2px 6px;
          font: inherit;
          font-size: 11.5px;
          outline: none;
          background: #eff6ff;
        }
        .payment-table {
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        .payment-row {
          min-height: 0.28in;
          display: grid;
          grid-template-columns: 1.4in 0.15in 1fr;
          align-items: center;
          padding: 4px 10px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 12px;
        }
        .payment-row:last-child {
          border-bottom: 0;
        }
        .payment-label {
          font-weight: 700;
          color: #334155;
        }
        .payment-colon {
          text-align: center;
          color: #94a3b8;
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
          .undertaking-document-container {
            width: 100% !important;
            min-height: 100vh !important;
            padding: 12mm 16mm !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

interface UndertakingClientProps {
  agreements: AgreementSummary[];
  backHref?: string;
  allowEdit?: boolean;
}

export default function UndertakingClient({
  agreements,
  backHref = '/documents',
  allowEdit = true,
}: UndertakingClientProps) {
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementSummary | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const today = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const [data, setData] = useState<LetterOfUndertakingData>({
    documentTitle: 'LETTER OF UNDERTAKING',
    recipientCompany: 'MOMENTUM CREDIT LIMITED',
    recipientBox: 'P.O BOX 29175-00100',
    recipientCity: 'NAIROBI',
    letterDate: today,
    salutation: 'Dear Sir/Madam,',
    refSubject: 'LOAN FOR CLIENT.',
    incomingLetterDate: today,
    vehicleReg: '',
    vehicleMakeModel: '',
    clientName: '',
    clientPrefix: '',
    jointParty: 'Momentum Credit Limited',
    loanAmount: 0,
    paymentDueDate: today,
    payableTo: 'EBENEZAR ENTERPRISES LTD',
    bankName: 'KCB',
    bankBranch: 'U-MALL',
    accountNo: '1290149755',
    accountName: 'EBENEZAR ENTERPRISES LTD.',
    closingRemarks: 'Thank you in advance for your continued cooperation.',
    signatoryName: 'GEORGE DOLA ANDERE',
    signatoryCompany: 'EBENEZAR ENTERPRISES LTD.',
    signatoryAddress: 'P.O BOX 3547-40100',
    signatoryCity: 'KISUMU',
    signatoryMobile: '0722-263-192',
  });

  // Sync state when selected agreement changes
  useEffect(() => {
    if (!selectedAgreement) return;

    const fullMakeModel = (selectedAgreement.vehicleMakeModel || '').trim();
    const balanceNum = Number(selectedAgreement.balance) || 0;
    const clientUpper = (selectedAgreement.clientName || '').trim().toUpperCase();

    setData((prev) => ({
      ...prev,
      letterDate: today,
      incomingLetterDate: today,
      paymentDueDate: today,
      vehicleReg: selectedAgreement.vehicleReg || '',
      vehicleMakeModel: fullMakeModel,
      clientName: clientUpper,
      refSubject: `LOAN FOR ${clientUpper || 'CLIENT'}.`,
      loanAmount: balanceNum,
    }));
  }, [selectedAgreement, today]);

  const handleDataChange = (partial: Partial<LetterOfUndertakingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const handleLoanAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const cursorPosition = input.selectionStart ?? rawValue.length;

    // Count how many numeric digits were before the cursor
    const digitsBeforeCursor = rawValue.slice(0, cursorPosition).replace(/\D/g, '').length;

    // Extract pure numbers
    const cleanDigits = rawValue.replace(/\D/g, '');
    const numValue = cleanDigits ? parseInt(cleanDigits, 10) : 0;

    handleDataChange({ loanAmount: numValue });

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

  const selectedFinancier = useMemo(() => {
    const found = PRESET_FINANCIERS.find(
      (f) => f.name.toUpperCase() === (data.recipientCompany || '').toUpperCase()
    );
    return found ? found.id : '';
  }, [data.recipientCompany]);

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
                Letter of Undertaking Generator
              </h1>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                Generate a formal undertaking to release the original logbook to financiers upon loan settlement.
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

                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Building2 className="size-3.5" />
                      Select Financier
                    </label>
                    <div className="relative group w-full">
                      <Building2
                        className={cn(
                          "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 z-10 transition-colors",
                          selectedFinancier ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"
                        )}
                      />
                      <Select
                        value={selectedFinancier || undefined}
                        onValueChange={(val) => {
                          const found = PRESET_FINANCIERS.find((f) => f.id === val);
                          if (found) {
                            handleDataChange({
                              recipientCompany: found.name,
                              recipientBox: found.poBox,
                              recipientCity: found.city,
                              jointParty: found.jointParty,
                            });
                          }
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "items-center justify-center flex gap-10 h-11 w-full rounded-xl border pl-10 pr-8 text-sm font-semibold transition-all focus:outline-none focus:ring-2 cursor-pointer shadow-sm",
                            selectedFinancier
                              ? "border-indigo-200 bg-indigo-50/50 text-indigo-950 focus:border-indigo-500 focus:ring-indigo-500/15"
                              : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/15"
                          )}
                        >
                          <SelectValue placeholder="Choose financier preset..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PRESET_FINANCIERS.map((f) => (
                            <SelectItem key={f.id} value={f.id} className="cursor-pointer text-sm font-medium">
                              {f.shortName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <Banknote className="size-3.5" />
                      Outstanding Loan (KSH)
                    </label>
                    <label className="relative left-3 flex items-center gap-3 h-11 w-full rounded-xl border border-neutral-200 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all cursor-text">
                      <span className="pl-3 text-xs left-5 relative font-bold text-neutral-500 select-none flex-shrink-0">
                        Ksh
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={data.loanAmount ? data.loanAmount.toLocaleString('en-US') : ''}
                        onChange={handleLoanAmountChange}
                        className="w-full h-full relative left-10 bg-transparent text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none pl-12"
                        placeholder="0"
                      />
                    </label>
                    {data.loanAmount > 0 && (
                      <p className="text-[11px] text-neutral-400 italic">
                        {formatCurrencyInWords(data.loanAmount)}
                      </p>
                    )}
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
              <p>Select a contract or vehicle to generate the letter of undertaking.</p>
            </div>
          ) : (
            <LetterOfUndertaking
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