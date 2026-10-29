'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { formatCurrencyInWords } from '@/lib/number-to-words';
import { updateVehicleContractDetails } from '@/lib/actions/contract.actions';
import type { ContractData } from '@/lib/contract-utils';
import { Printer, Edit3, Check, Save, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { Button } from './ui/button';

interface SaleAgreementDocumentProps {
  contract: ContractData;
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

export default function SaleAgreementDocument({
  contract,
  backHref = '/loans',
  allowEdit = true,
}: SaleAgreementDocumentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [make, setMake] = useState(contract.vehicle.make);
  const [model, setModel] = useState(contract.vehicle.model);
  const [regNo, setRegNo] = useState(contract.vehicle.registrationNo);
  const [fuel, setFuel] = useState(contract.vehicle.fuel);
  const [chassisNo, setChassisNo] = useState(contract.vehicle.chassisNo);
  const [color, setColor] = useState(contract.vehicle.color);
  const [engineNo, setEngineNo] = useState(contract.vehicle.engineNo);
  const [ratingCC, setRatingCC] = useState(contract.vehicle.ratingCC);

  const [buyerName, setBuyerName] = useState(contract.buyer.fullName);
  const [idNumber, setIdNumber] = useState(contract.buyer.idNumber);
  const [phoneNumber, setPhoneNumber] = useState(contract.buyer.phoneNumber);
  const [poBox, setPoBox] = useState(contract.buyer.poBox);
  const [physicalAddress, setPhysicalAddress] = useState(contract.buyer.physicalAddress);
  const [occupation, setOccupation] = useState(contract.buyer.occupation || 'BUSINESS');

  const [vehiclePrice, setVehiclePrice] = useState(contract.payment.vehiclePrice);
  const [deposit, setDeposit] = useState(contract.payment.deposit);
  const [balance, setBalance] = useState(contract.payment.balance);

  const [customNotes, setCustomNotes] = useState('');
  const [agreementDate, setAgreementDate] = useState(contract.agreementDate);

  const [sellerWitnessName, setSellerWitnessName] = useState(contract.signatures.sellerWitnessName);
  const [sellerWitnessId, setSellerWitnessId] = useState(contract.signatures.sellerWitnessId);
  const [sellerWitnessPhone, setSellerWitnessPhone] = useState(contract.signatures.sellerWitnessPhone);
  const [buyerWitnessName, setBuyerWitnessName] = useState(contract.signatures.buyerWitnessName);
  const [buyerWitnessId, setBuyerWitnessId] = useState(contract.signatures.buyerWitnessId);
  const [buyerWitnessPhone, setBuyerWitnessPhone] = useState(contract.signatures.buyerWitnessPhone);

  const money = (value: number) => value.toLocaleString('en-KE');

  const handlePrint = () => window.print();

  const handleSaveToDatabase = () => {
    startTransition(async () => {
      const res = await updateVehicleContractDetails({
        vehicleId: contract.vehicle.id,
        makeModel: `${make} ${model}`.trim(),
        chassisNo,
        engineNo,
        color,
        fuelType: fuel,
        engineCapacity: ratingCC,
      });

      if (res.success) {
        toast.success('Vehicle details updated in database successfully!');
        setIsEditing(false);
      } else {
        toast.error(res.error || 'Failed to update vehicle details');
      }
    });
  };

  return (
    <div className="sale-agreement-wrapper min-h-screen bg-[#f1f1f1] py-8 px-4 print:p-0 print:bg-white">
      {/* Application controls - never printed */}
      <div className="no-print max-w-[900px] mx-auto mb-6">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">

          {/* Left: identity */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href={backHref} className="btn-secondary shadow-sm shrink-0" aria-label="Back">
              <ArrowLeft size={15} />
              Back
            </Link>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="text-[13px] font-semibold text-slate-800 truncate">
                {make} {model} &mdash; {regNo || 'No Reg'}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                Chassis&nbsp;<span className="font-mono text-slate-600">{chassisNo || '—'}</span>
                &ensp;&middot;&ensp;
                Engine&nbsp;<span className="font-mono text-slate-600">{engineNo || '—'}</span>
              </span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            {allowEdit && (
              isEditing ? (
                <>
                  <Button
                    onClick={handleSaveToDatabase}
                    disabled={isPending}
                    className="btn-primary shadow-sm"
                  >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary shadow-sm"
                  >
                    <Check size={14} />
                    Done
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary shadow-sm"
                >
                  <Edit3 size={14} />
                  Edit
                </Button>
              )
            )}
            <Button onClick={handlePrint} className="btn-primary shadow-sm">
              <Printer size={15} />
              Print / PDF
            </Button>
          </div>

        </div>
      </div>

      {/* PAGE 1 */}
      <section className="agreement-page agreement-page-1">
        <div className="agreement-watermark" aria-hidden="true">
          <Image src="/icons/logo.png" alt="" fill className="object-contain" />
        </div>

        <header className="agreement-header">
          <Image src="/icons/logo.png" alt="Ebenezar Car Bazaar" width={125} height={100} className="agreement-header-logo" priority />
          <div className="agreement-header-center">
            <h1>EBENEZAR ENT. CAR BAZAAR</h1>
            <p>P.O. BOX 3547 - 40100</p>
            <p>PATEL’S, ONDIEK HIGHWAY, KISUMU</p>
            <h2>SALE AGREEMENT</h2>
          </div>
          <Image src="/icons/logo.png" alt="Ebenezar Car Bazaar" width={125} height={100} className="agreement-header-logo" priority />
        </header>

        <div className="agreement-section vehicle-section">
          <h3>VEHICLE DETAILS</h3>
          <div className="vehicle-grid">
            <Field isEditing={isEditing} label="MAKE" value={make} editingValue={make} setValue={setMake} />
            <Field isEditing={isEditing} label="MODEL" value={model} editingValue={model} setValue={setModel} />
            <Field isEditing={isEditing} label="REG NO." value={regNo} editingValue={regNo} setValue={setRegNo} />
            <Field isEditing={isEditing} label="FUEL" value={fuel || 'PETROL'} editingValue={fuel} setValue={setFuel} />
            <Field isEditing={isEditing} label="CHASSIS NO." value={chassisNo} editingValue={chassisNo} setValue={setChassisNo} />
            <Field isEditing={isEditing} label="COLOR" value={color} editingValue={color} setValue={setColor} />
            <Field isEditing={isEditing} label="ENGINE NO." value={engineNo} editingValue={engineNo} setValue={setEngineNo} />
            <Field isEditing={isEditing} label="RATING, CC" value={ratingCC} editingValue={ratingCC} setValue={setRatingCC} />
          </div>
        </div>

        <div className="agreement-section buyer-section">
          <h3>BUYER DETAILS</h3>
          <div className="buyer-grid">
            <Field isEditing={isEditing} label="FULL NAME" value={buyerName} editingValue={buyerName} setValue={setBuyerName} />
            <Field isEditing={isEditing} label="ID NUMBER" value={idNumber} editingValue={idNumber} setValue={setIdNumber} />
            <Field isEditing={isEditing} label="PHONE NUMBER" value={phoneNumber} editingValue={phoneNumber} setValue={setPhoneNumber} />
            <Field isEditing={isEditing} label="P.O. BOX" value={poBox} editingValue={poBox} setValue={setPoBox} />
            <Field isEditing={isEditing} label="PHYSICAL ADDRESS" value={physicalAddress} editingValue={physicalAddress} setValue={setPhysicalAddress} />
            <Field isEditing={isEditing} label="OCCUPATION" value={occupation} editingValue={occupation} setValue={setOccupation} />
          </div>
        </div>

        <div className="agreement-section payment-section">
          <h3>PAYMENT CONDITIONS</h3>
          <div className="payment-table">
            <div className="payment-row">
              <span className="payment-label">VEHICLE PRICE</span>
              <span className="payment-colon">:</span>
              {isEditing ? (
                <div className="payment-edit">
                  <span>KSH</span>
                  <input
                    type="number"
                    value={vehiclePrice}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0;
                      setVehiclePrice(value);
                      setBalance(Math.max(0, value - deposit));
                    }}
                  />
                  <em>{formatCurrencyInWords(vehiclePrice)}</em>
                </div>
              ) : (
                <span>KSH {money(vehiclePrice)} <em>{formatCurrencyInWords(vehiclePrice)}</em></span>
              )}
            </div>
            <div className="payment-row">
              <span className="payment-label">DEPOSIT</span>
              <span className="payment-colon">:</span>
              {isEditing ? (
                <div className="payment-edit">
                  <span>KSH</span>
                  <input
                    type="number"
                    value={deposit}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0;
                      setDeposit(value);
                      setBalance(Math.max(0, vehiclePrice - value));
                    }}
                  />
                  <em>{formatCurrencyInWords(deposit)}</em>
                </div>
              ) : (
                <span>KSH {money(deposit)} <em>{formatCurrencyInWords(deposit)}</em></span>
              )}
            </div>
            <div className="payment-row payment-total">
              <span className="payment-label">BALANCE</span>
              <span className="payment-colon">:</span>
              <span>KSH {money(balance)} <em>{formatCurrencyInWords(balance)}</em></span>
            </div>
          </div>
        </div>

        <SignaturePair />
      </section>

      {/* PAGE 2 */}
      {balance > 0 && (
        <section className="agreement-page agreement-page-2">
        <div className="agreement-watermark" aria-hidden="true">
          <Image src="/icons/logo.png" alt="" fill className="object-contain" />
        </div>

        <p className="installment-intro">
          THE BALANCE ABOVE SHALL BE LIQUIDATION OF THE OUTSTANDING BALANCE BY THE PURCHASE THROUGH THE PAYMENT OF THE MONTHLY INSTALMENT OF THE AMOUNT AS SHOWN HEREUNDER
        </p>

        <div className="installment-table-wrap">
          <table className="installment-table">
            <thead>
              <tr>
                <th>No</th>
                <th>DATE</th>
                <th>AMOUNT (in KSH)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(19, contract.installments.length) }).map((_, index) => {
                const inst = contract.installments[index];
                return (
                  <tr key={inst?.number ?? index + 1}>
                    <td>{inst?.number ?? index + 1}</td>
                    <td>{inst?.date ?? ''}</td>
                    <td>{inst ? `KSH ${money(inst.amount)}` : ''}</td>
                  </tr>
                );
              })}
              <tr className="installment-total">
                <td />
                <td>TOTAL</td>
                <td>KSH {money(contract.totalInstallmentsAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <SignaturePair />
        </section>
      )}

      {/* PAGE 3 */}
      <section className="agreement-page agreement-page-3">
        <div className="agreement-watermark" aria-hidden="true">
          <Image src="/icons/logo.png" alt="" fill className="object-contain" />
        </div>

        <div className="terms-section">
          <h3>TERMS &amp; CONDITIONS</h3>
          <ol>
            {contract.termsAndConditions.map((term, index) => (
              <li key={index}>{term}</li>
            ))}
          </ol>
        </div>

        {(customNotes || isEditing) && (
          <div className="special-notes no-print-only-when-empty">
            <h3>SPECIAL NOTES &amp; ADDITIONAL AGREEMENTS</h3>
            {isEditing ? (
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                rows={4}
                placeholder="Enter special notes, warranties, trade-in arrangements, handover terms, tracker details, or custom clauses..."
              />
            ) : (
              <div className="notes-output">{customNotes}</div>
            )}
          </div>
        )}

        <div className="signatures-section">
          <h3>SIGNATURES</h3>
          <p>
            In witness where of both parties have set this date:{' '}
            {isEditing ? (
              <input value={agreementDate} onChange={(e) => setAgreementDate(e.target.value)} />
            ) : (
              <strong>{agreementDate}</strong>
            )}, signed and sealed by:
          </p>

          <div className="signature-line single">
            <span>Seller’s signature:  <strong>GEORGE DOLA ANDERE   <em>(0722263192)</em></strong></span>
          </div>

          <div className="signature-line two">
            <span>Buyer’s Name:</span><i> <strong>{buyerName}</strong></i>
            <span>Signature:</span><i></i>
          </div>
          <div className="signature-line two subline">
            <span>ID No.</span><i> <strong>{idNumber}</strong></i>
            <span>Phone No.</span><i> <strong>{phoneNumber}</strong></i>
          </div>

          <div className="signature-line two">
            <span>Seller’s Witness:</span>
            {isEditing ? <input value={sellerWitnessName} onChange={(e) => setSellerWitnessName(e.target.value.toUpperCase())} /> : <i><strong>{sellerWitnessName}</strong></i>}
            <span>Signature:</span><i />
          </div>
          <div className="signature-line two subline">
            <span>ID No.</span>
            {isEditing ? <input value={sellerWitnessId} onChange={(e) => setSellerWitnessId(e.target.value)} /> : <i><strong>{sellerWitnessId}</strong></i>}
            <span>Phone No.</span>
            {isEditing ? <input value={sellerWitnessPhone} onChange={(e) => setSellerWitnessPhone(e.target.value)} /> : <i><strong>{sellerWitnessPhone}</strong></i>}
          </div>

          <div className="signature-line two">
            <span>Buyer Witness:</span>
            {isEditing ? <input value={buyerWitnessName} onChange={(e) => setBuyerWitnessName(e.target.value.toUpperCase())} /> : <i><strong>{buyerWitnessName}</strong></i>}
            <span>Signature:</span><i />
          </div>
          <div className="signature-line two subline">
            <span>ID No.</span>
            {isEditing ? <input value={buyerWitnessId} onChange={(e) => setBuyerWitnessId(e.target.value)} /> : <i><strong>{buyerWitnessId}</strong></i>}
            <span>Phone No.</span>
            {isEditing ? <input value={buyerWitnessPhone} onChange={(e) => setBuyerWitnessPhone(e.target.value)} /> : <i><strong>{buyerWitnessPhone}</strong></i>}
          </div>
        </div>

        <div className="verification-block">
          <p>
            BY SIGNING ABOVE INDICATES THE BUYER &amp; THE SELLER HAVE VERIFIED THAT THE CHASSIS AND ENGINE NUMBER ARE CORRECT ON THE LOGBOOK AND THE VEHICLE.
          </p>
          <div className="verification-grid">
            <div><strong>CHASSIS NO.</strong><span> :</span><b>{chassisNo || blank(20)}</b></div>
            <div><strong>ENGINE NO.</strong><span> :</span><b>{engineNo || blank(20)}</b></div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        :root { --doc-black: #111; --doc-border: #1d1d1d; }

        .agreement-page {
          position: relative;
          width: 8.5in;
          min-height: 11in;
          margin: 0 auto 24px;
          box-sizing: border-box;
          overflow: hidden;
          background: #fff;
          color: var(--doc-black);
          font-family: 'Roboto', 'Roboto Sans', sans-serif;
          font-size: 16px;
          line-height: 1.15;
          padding: 0.72in 0.75in;
          box-shadow: 0 10px 35px rgba(0, 0, 0, .10);
        }

        .agreement-page::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          border: 1px solid transparent;
        }

        .agreement-watermark {
          position: absolute;
          z-index: 0;
          width: 5.3in;
          height: 3.4in;
          left: 50%;
          top: 53%;
          transform: translate(-50%, -50%);
          opacity: .055;
          pointer-events: none;
        }

        .agreement-page > *:not(.agreement-watermark) { position: relative; z-index: 1; }

        .agreement-header {
          display: grid;
          grid-template-columns: 1.35in 1fr 1.35in;
          align-items: start;
          column-gap: .1in;
          margin-bottom: .36in;
        }

        .agreement-header-logo { width: 1.18in; height: 1.18in; object-fit: contain; }
        .agreement-header-logo:last-child { justify-self: end; }

        .agreement-header-center { text-align: center; font-family: 'Times New Roman', Times, serif; }
        .agreement-header-center h1 { margin: .02in 0 .14in; font-size: 15px; font-weight: 700; }
        .agreement-header-center p { margin: 0 0 .12in; font-size: 15px; font-weight: 700; }
        .agreement-header-center h2 { margin: .18in 0 0; font-size: 19px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }

        .agreement-section { margin-bottom: .13in; }
        .agreement-section h3,
        .terms-section h3,
        .signatures-section h3 {
          margin: 0 0 .12in;
          font-size: 16px;
          line-height: 1;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .vehicle-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .agreement-field {
          min-height: .43in;
          display: grid;
          grid-template-columns: 1.18in .18in 1fr;
          align-items: center;
          padding: .05in .08in;
          box-sizing: border-box;
        }
        .agreement-label { font-weight: 700; }
        .agreement-colon { text-align: center; }
        .agreement-value { font-weight: 600; min-width: 0; overflow-wrap: anywhere; }
        .agreement-input { width: 100%; min-width: 0; border: 1px solid #4b8cff; padding: 2px 4px; font: inherit; text-transform: uppercase; outline: none; }

        .buyer-grid { border: 0px solid var(--doc-border); }
        .buyer-grid .agreement-field { grid-template-columns: 1.55in .18in 1fr; border-right: 0; border-bottom: 0px solid var(--doc-border); }
        .buyer-grid .agreement-field:last-child { border-bottom: 0; }

        .payment-table { border: 0px solid }
        .payment-row { min-height: .46in; display: grid; grid-template-columns: 1.55in .18in 1fr; align-items: center; padding: .04in .08in; border-bottom: 0px solid }
        .payment-row:last-child { border-bottom: 0; }
        .payment-label { font-weight: 700; }
        .payment-colon { text-align: center; }
        .payment-row > span:last-child { font-weight: 600; }
        .payment-row em { font-weight: 400; font-style: italic; }
        .payment-total > span:last-child { font-weight: 700; }
        .payment-edit { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .payment-edit input { width: 1.4in; border: 1px solid #4b8cff; padding: 2px 4px; font: inherit; }

        .signature-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1.15in; margin: .35in 0 0; }
        .signature-pair > div { font-weight: 700; }
        .signature-pair > div:last-child { text-align: right; }

        .agreement-page-2 { padding-top: .74in; }
        .installment-intro { margin: 0 0 .18in; font-size: 15px; font-weight: 700; line-height: 1.3; text-transform: uppercase; }
        .installment-table-wrap { width: 4.85in; margin: 0 auto; }
        .installment-table { width: 100%; border-collapse: collapse; table-layout: auto; font-size: 16px; }
        .installment-table th, .installment-table td { border: 1px solid var(--doc-border); height: .25in; padding: 3px 7px; }
        .installment-table th { font-weight: 600; text-align: left; height: .27in; }
        .installment-table th:first-child, .installment-table td:first-child { width: .48in; text-align: center; }
        .installment-table th:nth-child(2), .installment-table td:nth-child(2) { width: 1.95in; }
        .installment-table td:last-child { text-align: left; }
        .installment-total td { font-weight: 700; }
        .installment-total td:nth-child(2) { text-align: right; }
        .agreement-page-2 .signature-pair { margin-top: .95in; }

        .agreement-page-3 { padding-top: .72in; }
        .terms-section ol { margin: 0; padding-left: .48in; font-size: 16px; list-style-type: decimal; }
        .terms-section li { padding-left: .05in; margin-bottom: .06in; line-height: 1.23; }

        .special-notes { margin-top: .2in; }
        .special-notes h3 { font-size: 15px; text-decoration: underline; margin-bottom: .08in; }
        .special-notes textarea { width: 100%; border: 1px solid #4b8cff; padding: 7px; font: inherit; resize: vertical; }
        .notes-output { border: 1px solid var(--doc-border); padding: 8px; white-space: pre-wrap; }

        .signatures-section { margin-top: .3in; }
        .signatures-section > p { font-size: 15px; margin: 0 0 .26in; }
        .signatures-section > p input { border: 0; border-bottom: 0px solid var(--doc-border); justify-content: center; font: inherit; width: 1.35in; }
        .signature-line { display: grid; align-items: end; justify-content: center; font-size: 16px; min-height: .38in; margin-bottom: .08in; }
        .signature-line.single { grid-template-columns: auto 1fr; gap: 4px; }
        .signature-line.two { grid-template-columns: auto 1fr auto 1fr; gap: 5px 7px; }
        .signature-line.subline { padding-left: 1.02in; color: #111; }
        .signature-line i { min-width: 0; min-height: .18in; justify-content: center; border-bottom: 1px solid var(--doc-border); font-style: normal; }
        .signature-line input { min-width: 0; border: 0; border-bottom: 1px solid #4b8cff; outline: none; font: inherit; text-transform: uppercase; }

        .verification-block { margin-top: .20in; border-top: 0px solid var(--doc-border); padding-top: .18in; }
        .verification-block > p { margin: 0 0 .2in; font-size: 15px; font-weight: 700; line-height: 1.3; }
        .verification-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .65in; }
        .verification-grid > div { display: grid; grid-template-columns: auto .25in 1fr; align-items: end; font-size: 15px; }
        .verification-grid b { min-width: 0; border-bottom: 0px solid var(--doc-border); font-weight: 400; overflow: hidden; }

        @media (max-width: 900px) {
          .agreement-page { width: 100%; min-height: auto; padding: 32px 28px; }
          .agreement-header { grid-template-columns: 75px 1fr 75px; margin-bottom: 24px; }
          .agreement-header-logo { width: 72px; height: 72px; }
          .agreement-header-center h1 { font-size: 14px; }
          .agreement-header-center p { font-size: 13px; }
          .agreement-header-center h2 { font-size: 15px; }
          .agreement-section h3, .terms-section h3, .signatures-section h3 { font-size: 16px; }
          .terms-section ol, .installment-intro, .installment-table, .signatures-section > p, .signature-line, .verification-block > p, .verification-grid > div { font-size: 16px; }
          .installment-table-wrap { width: 70%; }
        }

        @media print {
          @page { size: Letter portrait; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .sale-agreement-wrapper { padding: 0 !important; margin: 0 !important; background: #fff !important; }
          .agreement-page {
            width: 8.5in !important;
            height: 11in !important;
            min-height: 11in !important;
            margin: 0 !important;
            padding: .72in .75in !important;
            box-shadow: none !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .agreement-page:last-of-type { page-break-after: auto !important; break-after: auto !important; }
          .no-print-only-when-empty { break-inside: avoid; }
          input, textarea { color: #111 !important; }
        }
      `}</style>
    </div>
  );
}

function SignaturePair() {
  return (
    <div className="signature-pair">
      <div>SIGNATURE OF THE SELLER</div>
      <div>SIGNATURE OF THE BUYER</div>
    </div>
  );
}
