'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { FileSpreadsheet, Search, Printer, ArrowLeft, UserCheck, Car, Edit3 } from 'lucide-react';
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
  clientEmail: string;
  clientAddress: string;
  clientIdNumber?: string;
  nationalId?: string;
  vehicleReg: string;
  vehicleMakeModel: string;
  vehicleChassis: string;
  vehicleEngine: string;
  vehicleColor: string;
  vehicleYear: string;
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

interface ProformaInvoiceClientProps {
  agreements: AgreementSummary[];
  backHref?: string;
  allowEdit?: boolean;
}

export default function ProformaInvoiceClient({
  agreements,
  backHref = '/documents',
  allowEdit = true,
}: ProformaInvoiceClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
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
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [invoiceNo, setInvoiceNo] = useState('');

  // Customer / Client state
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientIdNumber, setClientIdNumber] = useState('');

  // Vehicle state
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [regNo, setRegNo] = useState('');
  const [fuel, setFuel] = useState('PETROL');
  const [chassisNo, setChassisNo] = useState('');
  const [color, setColor] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [year, setYear] = useState('');
  const [ratingCC, setRatingCC] = useState('');

  // Pricing & payment state
  const [price, setPrice] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [customNotes, setCustomNotes] = useState(
    ' Bank Name: KCB \n Branch: U-MALL \n Account No. :1290149755 \n Account Name: EBENEZAR ENTERPRISES LTD. '
  );

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
    setRatingCC(
      selectedAgreement.vehicleEngineCapacity
        ? String(selectedAgreement.vehicleEngineCapacity).toUpperCase()
        : ''
    );

    setClientName(selectedAgreement.clientName || '');
    setClientPhone(selectedAgreement.clientPhone || '');
    setClientEmail(selectedAgreement.clientEmail || '');
    setClientAddress(selectedAgreement.clientAddress || '');
    setClientIdNumber(
      selectedAgreement.clientIdNumber || selectedAgreement.nationalId || ''
    );

    setPrice(Number(selectedAgreement.salePrice) || 0);
    setDeposit(Number(selectedAgreement.depositPaid) || 0);
    setInvoiceNo(
      selectedAgreement.contractNo
        ? `PI-${selectedAgreement.contractNo.replace(/^AGR-/, '')}`
        : 'PI-DRAFT'
    );
    setInvoiceDate(today);
  }, [selectedAgreement, today]);

  // Derived balance
  const balance = Math.max(0, price - deposit);
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
    <div className=' print:p-0 print:m-0 print:w-full print:max-w-none'>
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
                Proforma Invoice Generator
              </h1>
              <p style={{ fontSize: '0.8125rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                Generate a formal, drafted proforma invoice for a pending or completed sale.
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
                    {isEditing ? 'Preview Document' : 'Edit Invoice'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn btn-primary flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm text-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print Invoice
                </button>
              </div>
            )}
          </div>
        </header>
      </section>

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 sm:p-8 flex flex-col lg:flex-row gap-8 print:p-0 print:m-0 print:w-full print:max-w-none">
        {/* Left Sidebar: Controls & Selection */}
        <div className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-6 no-print print:hidden">
          {/* Client & Product Section */}
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
            </div>
          </div>
        </div>

        {/* Right Section: Proforma Invoice Document */}
        <div className="flex-1 flex justify-center print:block print:w-full print:h-full overflow-x-auto">
          {!selectedAgreement ? (
            <div className="w-full h-full min-h-[400px] border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center text-neutral-400 print:hidden">
              <FileSpreadsheet className="w-12 h-12 mb-4 text-neutral-300" />
              <p>Select a contract or vehicle to generate the proforma invoice.</p>
            </div>
          ) : (
            <div
              ref={printRef}
              className="proforma-document-container relative bg-white shadow-xl border border-neutral-200 print:shadow-none print:border-none print:m-0"
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
                  <h2>PROFORMA INVOICE</h2>
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

              {/* Invoice Meta Bar: Invoice No & Date */}
              <div className="invoice-meta-bar">
                {/*<div className="meta-left">
                  <span className="meta-label">INVOICE NO:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value.toUpperCase())}
                      className="agreement-input meta-input"
                    />
                  ) : (
                    <span className="meta-val font-mono">{invoiceNo}</span>
                  )}
                </div>*/}
                <div className="meta-right">
                  <span className="meta-label">DATE:</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="agreement-input meta-input"
                    />
                  ) : (
                    <span className="meta-val">{invoiceDate}</span>
                  )}
                </div>
              </div>

              {/* Section 1: Customer Details (Billed To) */}
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
                  {/*}
                  <Field
                    isEditing={isEditing}
                    label="EMAIL"
                    value={clientEmail}
                    editingValue={clientEmail}
                    setValue={setClientEmail}
                  />
                  */}
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
                  <Field
                    isEditing={isEditing}
                    label="RATING, CC"
                    value={ratingCC}
                    editingValue={ratingCC}
                    setValue={setRatingCC}
                  />
                </div>
              </div>

              {/* Section 3: Pricing & Payment Breakdown */}
              <div className="agreement-section payment-section">
                <h3>PRICING & PAYMENT TERMS</h3>
                <div className="payment-table">
                  <div className="payment-row">
                    <span className="payment-label">VEHICLE PRICE</span>
                    <span className="payment-colon">:</span>
                    {isEditing ? (
                      <div className="payment-edit">
                        <span>KES</span>
                        <input
                          type="number"
                          value={price || ''}
                          onChange={(e) => setPrice(Number(e.target.value) || 0)}
                          className="agreement-input payment-input"
                        />
                        <em>{formatCurrencyInWords(price)}</em>
                      </div>
                    ) : (
                      <span>
                        KES {money(price)} <em>{formatCurrencyInWords(price)}</em>
                      </span>
                    )}
                  </div>

                  {(Number(deposit) > 0 || isEditing) && (
                    <>
                      <div className="payment-row">
                        <span className="payment-label">DEPOSIT PAID</span>
                        <span className="payment-colon">:</span>
                        {isEditing ? (
                          <div className="payment-edit">
                            <span>KES</span>
                            <input
                              type="number"
                              value={deposit || ''}
                              onChange={(e) => setDeposit(Number(e.target.value) || 0)}
                              className="agreement-input payment-input"
                              placeholder="0"
                            />
                            <em>{deposit > 0 ? formatCurrencyInWords(deposit) : ''}</em>
                          </div>
                        ) : (
                          <span>
                            KES {money(deposit)} <em>{formatCurrencyInWords(deposit)}</em>
                          </span>
                        )}
                      </div>

                      <div className="payment-row payment-total">
                        <span className="payment-label">BALANCE DUE</span>
                        <span className="payment-colon">:</span>
                        <span>
                          KES {money(balance)} <em>{formatCurrencyInWords(balance)}</em>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Section 4: Special Remarks & Payment Instructions */}
              {(customNotes || isEditing) && (
                <div className="special-notes no-print-only-when-empty">
                  <h2>REMARKS & PAYMENT INSTRUCTIONS</h2>
                  {isEditing ? (
                    <textarea
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      rows={2}
                      placeholder="Enter special remarks, bank transfer details or paybill..."
                      className="agreement-textarea"
                    />
                  ) : (
                    <div className="notes-output">{customNotes}</div>
                  )}
                </div>
              )}

              {/* Section 5: Terms & Conditions */}
              <div className="terms-section">

                <ol>
                  <li>Do not hesitate to contact the undersigned for additional information or clarification..</li>
                  <li>
                    <strong>GEORGE DOLA ANDERE</strong>
                  </li>
                  <li>
                    <strong>EBENEZAR ENTERPRISES LTD </strong>
                  </li>
                  <li>
                    <strong>KISUMU</strong>
                  </li>
                  <li>
                    <strong>0722-263-192</strong>
                  </li>
                </ol>
              </div>

              {/* Section 6: Signatures */}
              <div className="signatures-section">
                <div className="signature-pair">
                  <div>
                    <div className="signature-line-dash"></div>
                    <p className="sig-title">AUTHORIZED SIGNATURE</p>
                    <p className="sig-sub">For: Ebenezar Enterprises Limited</p>
                  </div>
                  <div>
                    <div className="signature-line-dash"></div>
                    <p className="sig-title">CUSTOMER ACCEPTANCE</p>
                    <p className="sig-sub">Client Signature / Date</p>
                  </div>
                </div>
              </div>

              {/* Global Document Styles */}
              <style jsx global>{`
                .proforma-document-container {
                  font-family: 'Roboto';
                  color: #111;
                  font-size: 13.5px;
                  line-height: 1.2;
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
                  margin-bottom: 0.16in;
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
                .agreement-section {
                  margin-bottom: 0.16in;
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
                  grid-template-columns: 1.35in 0.15in 1fr;
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
                  font-size: 12px;
                  color: #475569;
                  line-height: 1.35;
                }
                .terms-section li {
                  margin-bottom: 2px;
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
                  .proforma-document-container {
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
