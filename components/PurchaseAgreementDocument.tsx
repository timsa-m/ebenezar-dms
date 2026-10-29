'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { formatCurrencyInWords } from '@/lib/number-to-words';
import { updatePurchaseContractDetails } from '@/lib/actions/purchase.actions';
import type { PurchaseContractData } from '@/lib/contract-utils';
import { Printer, Edit3, Check, Save, ArrowLeft, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { Button } from './ui/button';

interface PurchaseAgreementDocumentProps {
  contract: PurchaseContractData;
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

export default function PurchaseAgreementDocument({
  contract,
  backHref = '/vehicles',
  allowEdit = true,
}: PurchaseAgreementDocumentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Vehicle states
  const [make, setMake] = useState(contract.vehicle.make);
  const [model, setModel] = useState(contract.vehicle.model);
  const [regNo, setRegNo] = useState(contract.vehicle.registrationNo);
  const [fuel, setFuel] = useState(contract.vehicle.fuel);
  const [chassisNo, setChassisNo] = useState(contract.vehicle.chassisNo);
  const [color, setColor] = useState(contract.vehicle.color);
  const [engineNo, setEngineNo] = useState(contract.vehicle.engineNo);
  const [ratingCC, setRatingCC] = useState(contract.vehicle.ratingCC);

  // Seller (Vendor) states
  const [sellerName, setSellerName] = useState(contract.seller.fullName);
  const [sellerId, setSellerId] = useState(contract.seller.idNumber);
  const [sellerPhone, setSellerPhone] = useState(contract.seller.phoneNumber);
  const [sellerPoBox, setSellerPoBox] = useState(contract.seller.poBox);
  const [sellerAddress, setSellerAddress] = useState(contract.seller.physicalAddress);
  const [sellerOccupation, setSellerOccupation] = useState(contract.seller.occupation || 'BUSINESS');

  // Purchase payment states
  const [purchasePrice, setPurchasePrice] = useState(contract.payment.purchasePrice);
  const [amountPaid, setAmountPaid] = useState(contract.payment.amountPaid);
  const [balance, setBalance] = useState(contract.payment.balance);
  const [paymentMethod, setPaymentMethod] = useState(contract.payment.paymentMethod || 'Bank Transfer');

  // Notes & Dates
  const [customNotes, setCustomNotes] = useState(contract.specialNotes || '');
  const [agreementDate, setAgreementDate] = useState(contract.agreementDate);

  // Witness states
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
      const res = await updatePurchaseContractDetails({
        vehicleId: contract.vehicle.id,
        purchaseId: contract.id !== contract.vehicle.id ? contract.id : undefined,
        makeModel: `${make} ${model}`.trim(),
        chassisNo,
        engineNo,
        color,
        fuelType: fuel,
        engineCapacity: ratingCC,
        sellerName,
        sellerIdNumber: sellerId,
        sellerPhone,
        sellerAddress,
        sellerPoBox,
        sellerOccupation,
        purchasePrice,
        amountPaid,
        balance,
        specialNotes: customNotes,
        sellerWitnessName,
        sellerWitnessId,
        sellerWitnessPhone,
        buyerWitnessName,
        buyerWitnessId,
        buyerWitnessPhone,
      });

      if (res.success) {
        toast.success('Purchase Agreement and vehicle details updated successfully!');
        setIsEditing(false);
      } else {
        toast.error(res.error || 'Failed to update purchase details');
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
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-slate-800 truncate">
                  {make} {model} &mdash; {regNo || 'No Reg'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Purchase Agreement
                </span>
              </div>
              <span className="text-[11px] text-slate-400 truncate">
                Chassis&nbsp;<span className="font-mono text-slate-600">{chassisNo || '—'}</span>
                &ensp;&middot;&ensp;
                Vendor&nbsp;<span className="font-semibold text-slate-700">{sellerName || '—'}</span>
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
          <Image src="/icons/logo.png" alt="Ebenezar Car Bazaar" width={125} height={120} className="agreement-header-logo" priority />
          <div className="agreement-header-center">
            <h1>EBENEZAR ENT. CAR BAZAAR</h1>
            <p>P.O. BOX 3547 - 40100</p>
            <p>PATEL’S, ONDIEK HIGHWAY, KISUMU</p>
            <h2>PURCHASE AGREEMENT</h2>
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
          <h3>SELLER DETAILS</h3>
          <div className="buyer-grid">
            <Field isEditing={isEditing} label="FULL NAME" value={sellerName} editingValue={sellerName} setValue={setSellerName} />
            <Field isEditing={isEditing} label="ID NUMBER" value={sellerId} editingValue={sellerId} setValue={setSellerId} />
            <Field isEditing={isEditing} label="PHONE NUMBER" value={sellerPhone} editingValue={sellerPhone} setValue={setSellerPhone} />
            <Field isEditing={isEditing} label="P.O. BOX" value={sellerPoBox} editingValue={sellerPoBox} setValue={setSellerPoBox} />
            <Field isEditing={isEditing} label="PHYSICAL ADDRESS" value={sellerAddress} editingValue={sellerAddress} setValue={setSellerAddress} />
            <Field isEditing={isEditing} label="OCCUPATION" value={sellerOccupation} editingValue={sellerOccupation} setValue={setSellerOccupation} />
          </div>
        </div>
        {/* 
        <div className="agreement-section buyer-section">
          <h3>PURCHASER (BUYER) DETAILS</h3>
          <div className="buyer-grid">
            <Field isEditing={false} label="ENTITY NAME" value="EBENEZAR ENTERPRISES CAR BAZAAR" editingValue="" setValue={() => { }} />
            <Field isEditing={false} label="REPRESENTED BY" value="GEORGE DOLA ANDERE" editingValue="" setValue={() => { }} />
            <Field isEditing={false} label="PHONE NUMBER" value="0722263192" editingValue="" setValue={() => { }} />
            <Field isEditing={false} label="P.O. BOX" value="P.O. BOX 3547 - 40100" editingValue="" setValue={() => { }} />
            <Field isEditing={false} label="PHYSICAL ADDRESS" value="PATEL’S, ONDIEK HIGHWAY, KISUMU" editingValue="" setValue={() => { }} />
            <Field isEditing={false} label="LOCATION" value="KISUMU, KENYA" editingValue="" setValue={() => { }} />
          </div>
        </div>
*/}

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
                    value={purchasePrice}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setPurchasePrice(val);
                      setBalance(Math.max(0, val - amountPaid));
                    }}
                  />
                  <em>{formatCurrencyInWords(purchasePrice)}</em>
                </div>
              ) : (
                <span>KSH {money(purchasePrice)} <em>{formatCurrencyInWords(purchasePrice)}</em></span>
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
                    value={amountPaid}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setAmountPaid(val);
                      setBalance(Math.max(0, purchasePrice - val));
                    }}
                  />
                  <em>{formatCurrencyInWords(amountPaid)}</em>
                </div>
              ) : (
                <span>KSH {money(amountPaid)} <em>{formatCurrencyInWords(amountPaid)}</em></span>
              )}
            </div>
            <div className="payment-row payment-total">
              <span className="payment-label">BALANCE</span>
              <span className="payment-colon">:</span>
              <span>KSH {money(balance)} <em>{formatCurrencyInWords(balance)}</em></span>
            </div>
            {(customNotes || isEditing) && (
              <div className="special-notes no-print-only-when-empty">
                <h2>NOTE</h2>
                {isEditing ? (
                  <textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    rows={3}
                    placeholder="Enter special notes, outstanding payments, logbook collection timeline, or tracking remarks..."
                  />
                ) : (
                  <div className="notes-output">{customNotes}</div>
                )}
              </div>
            )}
          </div>

        </div>


        <SignaturePair />
      </section>

      {/* PAGE 2 */}
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
            <span>Buyer’s signature:  <strong>GEORGE DOLA ANDERE   <em>(0722263192)</em></strong></span>
          </div>

          <div className="signature-line two">
            <span>Seller:</span><i> <strong>{sellerName}</strong></i>
            <span>Signature:</span><i></i>
          </div>
          <div className="signature-line two subline">
            <span>ID No.:</span><i> <strong>{sellerId}</strong></i>
            <span>Phone No.</span><i> <strong>{sellerPhone}</strong></i>
          </div>

          <div className="signature-line two">
            <span>Buyer's Witness:</span>
            {isEditing ? <input value={buyerWitnessName} onChange={(e) => setBuyerWitnessName(e.target.value.toUpperCase())} /> : <i><strong>{buyerWitnessName || 'GEORGE DOLA ANDERE'}</strong></i>}
            <span>Signature:</span><i />
          </div>
          <div className="signature-line two subline">
            <span>ID No.</span>
            {isEditing ? <input value={buyerWitnessId} onChange={(e) => setBuyerWitnessId(e.target.value)} /> : <i><strong>{buyerWitnessId || '0722263192'}</strong></i>}
            <span>Phone No.</span>
            {isEditing ? <input value={buyerWitnessPhone} onChange={(e) => setBuyerWitnessPhone(e.target.value)} /> : <i><strong>{buyerWitnessPhone || '+254722263192'}</strong></i>}
          </div>

          <div className="signature-line two">
            <span>Seller's Witness:</span>
            {isEditing ? <input value={sellerWitnessName} onChange={(e) => setSellerWitnessName(e.target.value.toUpperCase())} /> : <i><strong>{sellerWitnessName}</strong></i>}
            <span>Signature:</span><i />
          </div>
          <div className="signature-line two subline">
            <span>ID No.</span>
            {isEditing ? <input value={sellerWitnessId} onChange={(e) => setSellerWitnessId(e.target.value)} /> : <i><strong>{sellerWitnessId}</strong></i>}
            <span>Phone No.</span>
            {isEditing ? <input value={sellerWitnessPhone} onChange={(e) => setSellerWitnessPhone(e.target.value)} /> : <i><strong>{sellerWitnessPhone}</strong></i>}
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
          font-size: 14px;
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
        
        .agreement-page-3 { padding-top: .72in; }
        .terms-section ol { margin: 0; padding-left: .48in; font-size: 16px; list-style-type: decimal; }
        .terms-section li { padding-left: .05in; margin-bottom: .06in; line-height: 1.23; }

        .special-notes { margin-top: .2in; }
        .special-notes h2 { font-size: 16px; text-decoration: underline; margin-bottom: .08in; }
        .special-notes textarea { width: 100%; border: 1px solid #4b8cff; padding: 7px; font: inherit; font-weight: 900; resize: vertical; }
        .notes-output { border: 1px solid var(--doc-border); padding: 8px; white-space: pre-wrap; }

        .signatures-section { margin-top: .3in; }
        .signatures-section > p { font-size: 15px; margin: 0 0 .26in; }
        .signatures-section > p input { border: 0; border-bottom: 0px solid var(--doc-border); justify-content: center; font: inherit; width: 1.35in; }
        .signature-line { display: grid; align-items: end; justify-content: center; font-size: 15px; min-height: .38in; margin-bottom: .08in; }
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
          .terms-section ol, .signatures-section > p, .signature-line, .verification-block > p, .verification-grid > div { font-size: 16px; }
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
      <div>SIGNATURE OF THE BUYER</div>
      <div>SIGNATURE OF THE SELLER</div>
    </div>
  );
}
