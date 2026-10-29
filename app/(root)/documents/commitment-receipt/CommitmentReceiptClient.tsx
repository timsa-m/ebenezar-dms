'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
  FileSpreadsheet,
  Printer,
  ArrowLeft,
  UserCheck,
  Car,
  Edit3,
  Banknote,
} from 'lucide-react';
import Link from 'next/link';
import ContractSearchSelect, { Agreement } from '@/components/ContractSearchSelect';
import VehicleSearchSelect, { Vehicle } from '@/components/VehicleSearchSelect';
import { formatCurrencyInWords } from '@/lib/number-to-words';

export interface AgreementSummary {
  id: string;
  contractNo: string;
  salePrice: number;
  depositPaid: number;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientIdNumber?: string;
  nationalId?: string;
  clientAddress?: string;
  vehicleReg: string;
  vehicleMakeModel: string;
  vehicleChassis: string;
  vehicleEngine: string;
  vehicleColor: string;
  vehicleYear?: string;
  vehicleEngineCapacity?: string;
  backHref?: string;
  allowEdit?: boolean;
}

const blank = (length = 34) => '_'.repeat(length);

function Field({
  label,
  value,
  editingValue,
  setValue,
  isEditing,
  mono = false,
  placeholder,
  className = '',
}: {
  label: string;
  value: string;
  editingValue: string;
  setValue: (value: string) => void;
  isEditing: boolean;
  mono?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`agreement-field ${className}`}>
      <span className="agreement-label">{label}</span>
      <span className="agreement-colon">:</span>
      {isEditing ? (
        <input
          value={editingValue}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder={placeholder}
          className={`agreement-input ${mono ? 'font-mono' : ''}`}
        />
      ) : (
        <span className={`${mono ? 'font-mono' : ''} agreement-value`}>
          {value || blank()}
        </span>
      )}
    </div>
  );
}

interface CommitmentReceiptClientProps {
  agreements: AgreementSummary[];
  backHref?: string;
  allowEdit?: boolean;
}

export default function CommitmentReceiptClient({
  agreements,
  backHref = '/documents',
  allowEdit = true,
}: CommitmentReceiptClientProps) {
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementSummary | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Form states for editable document
  const [receiptDate, setReceiptDate] = useState(today);
  const [receiptNo, setReceiptNo] = useState('');

  // Customer / Client state
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientIdNumber, setClientIdNumber] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Vehicle state
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [regNo, setRegNo] = useState('');
  const [fuel, setFuel] = useState('PETROL');
  const [chassisNo, setChassisNo] = useState('');
  const [color, setColor] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [year, setYear] = useState('');

  // Financial breakdown state
  const [salePrice, setSalePrice] = useState<number>(0);
  const [commitmentAmount, setCommitmentAmount] = useState<number>(0);
  const [customNotes, setCustomNotes] = useState('');

  // Sync form state when agreement is selected
  useEffect(() => {
    if (!selectedAgreement) return;

    const fullMakeModel = (selectedAgreement.vehicleMakeModel || '').trim();
    const parts = fullMakeModel.split(' ');
    setMake(parts[0] || 'Vehicle');
    setModel(parts.slice(1).join(' ') || '');
    setRegNo(selectedAgreement.vehicleReg || '');
    setChassisNo(selectedAgreement.vehicleChassis || '');
    setEngineNo(selectedAgreement.vehicleEngine || '');
    setColor(selectedAgreement.vehicleColor || '');
    setYear(selectedAgreement.vehicleYear || '');
    setFuel('PETROL');

    setClientName(selectedAgreement.clientName || '');
    setClientPhone(selectedAgreement.clientPhone || '');
    setClientIdNumber(
      selectedAgreement.clientIdNumber || selectedAgreement.nationalId || ''
    );
    setClientAddress(selectedAgreement.clientAddress || '');

    const priceVal = Number(selectedAgreement.salePrice) || 0;
    const depVal = Number(selectedAgreement.depositPaid) || 0;
    setSalePrice(priceVal);
    setCommitmentAmount(depVal);

    setReceiptNo(
      selectedAgreement.contractNo
        ? `CR-${selectedAgreement.contractNo.replace(/^AGR-/, '')}`
        : 'CR-DRAFT'
    );
    setReceiptDate(today);
  }, [selectedAgreement, today]);

  // Derived calculations
  const outstandingBalance = Math.max(0, salePrice - commitmentAmount);
  const money = (val: number) => (Number(val) || 0).toLocaleString('en-KE');

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
          sale_price: ag.salePrice,
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
      sale_price: selectedAgreement.salePrice,
    };
  }, [selectedAgreement]);

  // Handler when contract is chosen via ContractSearchSelect
  const handleSelectContract = (ag: Agreement | null) => {
    if (!ag) {
      setSelectedAgreement(null);
      return;
    }
    const targetId = ag.id ?? ag.$id;
    const fullAgreement = agreements.find((a) => a.id === targetId) ?? null;
    setSelectedAgreement(fullAgreement);
  };

  // Handler when vehicle is chosen via VehicleSearchSelect
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
                Commitment Receipt Generator
              </h1>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                Generate an acknowledgement of receipt of funds for reserving a vehicle.
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
                    {isEditing ? 'Preview Document' : 'Edit Receipt'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn btn-primary flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm text-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
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
                <div className="flex flex-col gap-2 pt-4 border-t border-neutral-100">
                  <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Banknote className="size-3.5" />
                    Commitment Deposit (KES)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      KES
                    </span>
                    <input
                      type="number"
                      value={commitmentAmount || ''}
                      onChange={(e) => setCommitmentAmount(Number(e.target.value) || 0)}
                      className="w-full pl-12 pr-4 py-2 border border-neutral-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 italic">
                    {commitmentAmount > 0
                      ? formatCurrencyInWords(commitmentAmount)
                      : 'Enter commitment deposit'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Commitment Receipt Document */}
        <div className="flex-1 flex justify-center print:block print:w-full print:h-full overflow-x-auto">
          {!selectedAgreement ? (
            <div className="w-full h-full min-h-[400px] border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center text-neutral-400 print:hidden">
              <FileSpreadsheet className="w-12 h-12 mb-4 text-neutral-300" />
              <p>Select a contract or vehicle to generate the commitment receipt.</p>
            </div>
          ) : (
            <div
              ref={printRef}
              className="commitment-document-container relative bg-white shadow-xl border border-neutral-200 print:shadow-none print:border-none print:m-0"
              style={{ width: '210mm', minHeight: '297mm', padding: '16mm 18mm' }}
            >
              {/* Watermark */}
              <div className="agreement-watermark" aria-hidden="true">
                <Image src="/icons/logo.png" alt="" fill className="object-contain" priority />
              </div>

              {/* Header Letterhead */}
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
                  <p>TEL: +254 722 263 192 / +254 700 000 000</p>
                  <h2>COMMITMENT RECEIPT</h2>
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

              {/* Receipt Meta Bar: Receipt No & Date */}
              <div className="invoice-meta-bar">
                <div className="meta-left">
                  <span className="meta-label">RECEIPT NO:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={receiptNo}
                      onChange={(e) => setReceiptNo(e.target.value.toUpperCase())}
                      className="agreement-input meta-input font-mono"
                    />
                  ) : (
                    <span className="meta-val font-mono">{receiptNo}</span>
                  )}
                </div>
                <div className="meta-right">
                  <span className="meta-label">DATE:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                      className="agreement-input meta-input"
                    />
                  ) : (
                    <span className="meta-val">{receiptDate}</span>
                  )}
                </div>
              </div>

              {/* Acknowledgment Statement Box */}
              <div className="statement-box">
                We, <strong>EBENEZAR ENTERPRISES LTD</strong>, hereby formally acknowledge receipt of the sum of{' '}
                <strong className="text-blue-900 font-bold">
                  KES {money(commitmentAmount)} ({commitmentAmount > 0 ? formatCurrencyInWords(commitmentAmount).toUpperCase() : 'ZERO'} ONLY)
                </strong>{' '}
                from the customer detailed below, being commitment/reservation deposit towards the purchase of the motor vehicle specified herein.
              </div>

              {/* Section 1: Customer Details */}
              <div className="agreement-section buyer-section">
                <h3>BILLED TO: (CUSTOMER DETAILS)</h3>
                <div className="buyer-grid">
                  <Field
                    isEditing={isEditing}
                    label="FULL NAME"
                    value={clientName}
                    editingValue={clientName}
                    setValue={setClientName}
                  />
                  <Field
                    isEditing={isEditing}
                    label="ID No."
                    value={clientIdNumber}
                    editingValue={clientIdNumber}
                    setValue={setClientIdNumber}
                    placeholder="OPTIONAL / N/A"
                  />
                  <Field
                    isEditing={isEditing}
                    label="PHONE NUMBER"
                    value={clientPhone}
                    editingValue={clientPhone}
                    setValue={setClientPhone}
                  />
                  <Field
                    isEditing={isEditing}
                    label="PHYSICAL ADDRESS"
                    value={clientAddress}
                    editingValue={clientAddress}
                    setValue={setClientAddress}
                  />
                </div>
              </div>

              {/* Section 2: Vehicle Details */}
              <div className="agreement-section vehicle-section">
                <h3>MOTOR VEHICLE DETAILS</h3>
                <div className="vehicle-grid">
                  <Field
                    isEditing={isEditing}
                    label="MAKE"
                    value={make}
                    editingValue={make}
                    setValue={setMake}
                  />
                  <Field
                    isEditing={isEditing}
                    label="MODEL"
                    value={model}
                    editingValue={model}
                    setValue={setModel}
                  />
                  <Field
                    isEditing={isEditing}
                    label="REG NO."
                    value={regNo}
                    editingValue={regNo}
                    setValue={setRegNo}
                  />
                  <Field
                    isEditing={isEditing}
                    label="FUEL TYPE"
                    value={fuel}
                    editingValue={fuel}
                    setValue={setFuel}
                  />
                  <Field
                    isEditing={isEditing}
                    label="CHASSIS NO."
                    value={chassisNo}
                    editingValue={chassisNo}
                    setValue={setChassisNo}
                  />
                  <Field
                    isEditing={isEditing}
                    label="COLOR"
                    value={color}
                    editingValue={color}
                    setValue={setColor}
                  />
                  <Field
                    isEditing={isEditing}
                    label="ENGINE NO."
                    value={engineNo}
                    editingValue={engineNo}
                    setValue={setEngineNo}
                  />
                  <Field
                    isEditing={isEditing}
                    label="YEAR"
                    value={year}
                    editingValue={year}
                    setValue={setYear}
                  />
                </div>
              </div>

              {/* Section 3: Financial & Payment Terms */}
              <div className="agreement-section payment-section">
                <h3>FINANCIAL & COMMITMENT BREAKDOWN</h3>
                <div className="payment-table">
                  <div className="payment-row">
                    <span className="payment-label">AGREED SALE PRICE</span>
                    <span className="payment-colon">:</span>
                    {isEditing ? (
                      <div className="payment-edit">
                        <span>KES</span>
                        <input
                          type="number"
                          value={salePrice || ''}
                          onChange={(e) => setSalePrice(Number(e.target.value) || 0)}
                          className="agreement-input payment-input"
                        />
                        <em>{formatCurrencyInWords(salePrice)}</em>
                      </div>
                    ) : (
                      <span>
                        KES {money(salePrice)} <em>{formatCurrencyInWords(salePrice)}</em>
                      </span>
                    )}
                  </div>

                  <div className="payment-row">
                    <span className="payment-label">COMMITMENT DEPOSIT</span>
                    <span className="payment-colon">:</span>
                    {isEditing ? (
                      <div className="payment-edit">
                        <span>KES</span>
                        <input
                          type="number"
                          value={commitmentAmount || ''}
                          onChange={(e) => setCommitmentAmount(Number(e.target.value) || 0)}
                          className="agreement-input payment-input"
                        />
                        <em>{commitmentAmount > 0 ? formatCurrencyInWords(commitmentAmount) : ''}</em>
                      </div>
                    ) : (
                      <span>
                        KES {money(commitmentAmount)}{' '}
                        <em>{commitmentAmount > 0 ? formatCurrencyInWords(commitmentAmount) : ''}</em>
                      </span>
                    )}
                  </div>

                  <div className="payment-row payment-total">
                    <span className="payment-label">OUTSTANDING BALANCE</span>
                    <span className="payment-colon">:</span>
                    <span>
                      KES {money(outstandingBalance)} <em>{formatCurrencyInWords(outstandingBalance)}</em>
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 4: Terms & Conditions of Commitment */}
              <div className="terms-section">
                <h3>TERMS & CONDITIONS OF COMMITMENT</h3>
                <ol>
                  <li>
                    The commitment fee paid herein is non-refundable. Should the buyer fail to clear the outstanding balance within the agreed timeframe, the vehicle may be offered to other interested parties and the commitment fee forfeited.
                  </li>
                  <li>
                    Ownership, possession, and title of the vehicle shall remain solely with Ebenezar Enterprises Limited until the full purchase price is paid and cleared in our bank accounts.
                  </li>
                  <li>
                    This receipt does not constitute a final bill of sale or ownership transfer. A formal Sale/Financing Agreement shall be executed upon full or structured completion of the payment as agreed.
                  </li>
                </ol>
              </div>

              {/* Section 5: Remarks (Optional) */}
              {(customNotes || isEditing) && (
                <div className="special-notes no-print-only-when-empty">
                  <h2>REMARKS / PAYMENT INSTRUCTIONS</h2>
                  {isEditing ? (
                    <textarea
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      rows={2}
                      placeholder="Enter special remarks, bank transfer details or receipt notes..."
                      className="agreement-textarea"
                    />
                  ) : (
                    <div className="notes-output">{customNotes}</div>
                  )}
                </div>
              )}

              {/* Section 6: Signatures */}
              <div className="signatures-section">
                <div className="signature-pair">
                  <div>
                    <div className="signature-line-dash"></div>
                    <p className="sig-title">RECEIVED BY (FOR EBENEZAR)</p>
                    <p className="sig-sub">Authorized Signatory &bull; Official Stamp</p>
                  </div>
                  <div>
                    <div className="signature-line-dash"></div>
                    <p className="sig-title">ACKNOWLEDGED BY (BUYER)</p>
                    <p className="sig-sub">{clientName || 'Buyer Signature'} &bull; Date: {receiptDate}</p>
                  </div>
                </div>
              </div>

              {/* Global Document Styles */}
              <style jsx global>{`
                .commitment-document-container {
                  font-family: 'Roboto', sans-serif;
                  color: #111;
                  font-size: 13.5px;
                  line-height: 1.25;
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
                .invoice-meta-bar {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 6px 12px;
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 6px;
                  margin-bottom: 0.14in;
                  font-size: 12.5px;
                  position: relative;
                  z-index: 1;
                }
                .meta-label {
                  font-weight: 800;
                  color: #334155;
                  margin-right: 6px;
                }
                .meta-val {
                  font-weight: 700;
                  color: #0f172a;
                }
                .meta-input {
                  width: 130px;
                  padding: 2px 6px;
                  font-size: 12px;
                }
                .statement-box {
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-left: 3.5px solid #1e3a8a;
                  padding: 8px 12px;
                  margin-bottom: 0.14in;
                  font-size: 11.5px;
                  line-height: 1.5;
                  color: #334155;
                  position: relative;
                  z-index: 1;
                }
                .agreement-section {
                  margin-bottom: 0.14in;
                  position: relative;
                  z-index: 1;
                }
                .agreement-section h3,
                .terms-section h3 {
                  margin: 0 0 6px;
                  font-size: 12px;
                  line-height: 1.5;
                  font-weight: 800;
                  text-transform: uppercase;
                  letter-spacing: 0.04em;
                  color: #1e3a8a;
                  border-bottom: 1.5px solid #1e3a8a;
                  padding-bottom: 3px;
                }
                .buyer-grid,
                .vehicle-grid {
                  display: grid;
                  font-weight: 600;
                  grid-template-columns: 1fr 1fr;
                  align-items: center;
                  justify-content: center;
                  column-gap: 0.25in;
                  border: 0px solid #e2e8f0;
                  background: #ffffff;
                }
                .agreement-field {
                  min-height: 0.3in;
                  display: grid;
                  grid-template-columns: 1.25in 0.15in 1fr;
                  align-items: center;
                  padding: 3px 8px;
                  border-bottom: 1px solid #f1f5f9;
                  font-size: 11.5px;
                  box-sizing: border-box;
                }
                .agreement-label {
                  font-weight: 700;
                  color: #475569;
                }
                .agreement-colon {
                  text-align: center;
                  color: #94a3b8;
                }
                .agreement-value {
                  font-weight: 600;
                  color: #0f172a;
                  overflow-wrap: anywhere;
                }
                .agreement-input {
                  width: 100%;
                  min-width: 0;
                  border: 1px solid #3b82f6;
                  border-radius: 4px;
                  padding: 2px 6px;
                  font: inherit;
                  font-size: 11.5px;
                  outline: none;
                  background: #eff6ff;
                }
                .payment-table {
                  border: 0px solid #e2e8f0;
                  border-radius: 4px;
                  overflow: hidden;
                }
                .payment-row {
                  min-height: 0.32in;
                  display: grid;
                  grid-template-columns: 1.45in 0.15in 1fr;
                  align-items: center;
                  padding: 5px 10px;
                  border-bottom: 0px solid #e2e8f0;
                  font-size: 12.5px;
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
                .payment-row > span:last-child {
                  font-weight: 700;
                  color: #0f172a;
                }
                .payment-row em {
                  font-weight: 500;
                  font-style: italic;
                  color: #64748b;
                  margin-left: 8px;
                  font-size: 11px;
                }
                .payment-total {
                  background: #f8fafc;
                  font-weight: 800;
                  border-top: 1.5px solid #cbd5e1;
                }
                .payment-total > span:last-child {
                  color: #1e3a8a;
                  font-size: 13.5px;
                }
                .payment-edit {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  flex-wrap: wrap;
                }
                .payment-input {
                  width: 1.3in;
                }
                .special-notes {
                  margin-top: 0.12in;
                  margin-bottom: 0.12in;
                  position: relative;
                  z-index: 1;
                }
                .special-notes h2 {
                  font-size: 11.5px;
                  font-weight: 800;
                  text-transform: uppercase;
                  letter-spacing: 0.03em;
                  color: #475569;
                  margin-bottom: 4px;
                }
                .agreement-textarea {
                  width: 100%;
                  border: 1px solid #3b82f6;
                  border-radius: 4px;
                  padding: 5px 8px;
                  font: inherit;
                  font-size: 11.5px;
                  font-weight: 600;
                  background: #eff6ff;
                  resize: vertical;
                  box-sizing: border-box;
                }
                .notes-output {
                  border: 1px solid #e2e8f0;
                  border-radius: 4px;
                  padding: 6px 10px;
                  white-space: pre-wrap;
                  font-size: 11.5px;
                  color: #334155;
                  background: #fafafa;
                }
                .terms-section {
                  margin-top: 0.12in;
                  position: relative;
                  z-index: 1;
                }
                .terms-section ol {
                  margin: 0;
                  padding-left: 18px;
                  font-size: 11.5px;
                  color: #475569;
                  line-height: 1.4;
                }
                .terms-section li {
                  margin-bottom: 3px;
                }
                .signatures-section {
                  margin-top: 0.28in;
                  position: relative;
                  z-index: 1;
                }
                .signature-pair {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 1.2in;
                }
                .signature-pair > div:last-child {
                  text-align: right;
                }
                .signature-line-dash {
                  border-bottom: 1.5px solid #64748b;
                  margin-bottom: 6px;
                  height: 20px;
                }
                .sig-title {
                  font-size: 11px;
                  font-weight: 800;
                  color: #1e293b;
                  margin: 0 0 2px;
                  letter-spacing: 0.02em;
                }
                .sig-sub {
                  font-size: 10px;
                  color: #64748b;
                  font-weight: 600;
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
                  .commitment-document-container {
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
          )}
        </div>
      </main>
    </div>
  );
}
