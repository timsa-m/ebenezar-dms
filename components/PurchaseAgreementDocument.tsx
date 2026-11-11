'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { numberToWords } from '@/lib/number-to-words';
import { updatePurchaseContractDetails } from '@/lib/actions/purchase.actions';
import { PURCHASE_TERMS_AND_CONDITIONS, type PurchaseContractData } from '@/lib/contract-utils';
import { Printer, Edit3, Check, Save, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { Button } from './ui/button';

interface PurchaseAgreementDocumentProps {
  contract: PurchaseContractData;
  backHref?: string;
  allowEdit?: boolean;
}

export default function PurchaseAgreementDocument({
  contract,
  backHref = '/vehicles',
  allowEdit = true,
}: PurchaseAgreementDocumentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Vehicle Details state
  const [make, setMake] = useState(contract.vehicle?.make || '');
  const [model, setModel] = useState(contract.vehicle?.model || '');
  const [regNo, setRegNo] = useState(contract.vehicle?.registrationNo || '');
  const [fuel, setFuel] = useState(contract.vehicle?.fuel || 'PETROL');
  const [chassisNo, setChassisNo] = useState(contract.vehicle?.chassisNo || '');
  const [color, setColor] = useState(contract.vehicle?.color || '');
  const [engineNo, setEngineNo] = useState(contract.vehicle?.engineNo || '');
  const [ratingCC, setRatingCC] = useState(contract.vehicle?.ratingCC || '');

  // Seller (Vendor) Details state
  const [sellerName, setSellerName] = useState(contract.seller?.fullName || '');
  const [sellerId, setSellerId] = useState(contract.seller?.idNumber || '');
  const [sellerPhone, setSellerPhone] = useState(contract.seller?.phoneNumber || '');
  const [sellerPoBox, setSellerPoBox] = useState(contract.seller?.poBox || '');
  const [sellerAddress, setSellerAddress] = useState(contract.seller?.physicalAddress || '');
  const [sellerOccupation, setSellerOccupation] = useState(contract.seller?.occupation || 'BUSINESS');

  // Purchaser Details state (Ebenezar / George Dola Andere)
  const [buyerName, setBuyerName] = useState(
    contract.purchaser?.representativeName || contract.signatures?.purchaserRepresentative || 'GEORGE DOLA ANDERE'
  );
  const [buyerPhone, setBuyerPhone] = useState(
    contract.purchaser?.phone || contract.signatures?.purchaserPhone || '0722263192'
  );

  // Purchase payment states
  const [purchasePrice, setPurchasePrice] = useState(contract.payment?.purchasePrice || 0);
  const [amountPaid, setAmountPaid] = useState(contract.payment?.amountPaid || 0);
  const [balance, setBalance] = useState(contract.payment?.balance || 0);

  // Notes & Dates
  const [customNotes, setCustomNotes] = useState(contract.specialNotes || '');
  const [agreementDate, setAgreementDate] = useState(contract.agreementDate || '');

  // Witness states
  const [sellerWitnessName, setSellerWitnessName] = useState(contract.signatures?.sellerWitnessName || '');
  const [sellerWitnessId, setSellerWitnessId] = useState(contract.signatures?.sellerWitnessId || '');
  const [sellerWitnessPhone, setSellerWitnessPhone] = useState(contract.signatures?.sellerWitnessPhone || '');
  const [buyerWitnessName, setBuyerWitnessName] = useState(
    contract.signatures?.buyerWitnessName || 'GEORGE DOLA ANDERE'
  );
  const [buyerWitnessId, setBuyerWitnessId] = useState(
    contract.signatures?.buyerWitnessId || '0722263192'
  );
  const [buyerWitnessPhone, setBuyerWitnessPhone] = useState(
    contract.signatures?.buyerWitnessPhone || '+254722263192'
  );

  // Currency formatters matching PDF specification
  const moneyWithDecimals = (val: number) => {
    return (val || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const moneyInWords = (val: number) => {
    const words = numberToWords(val);
    return `(${words} KENYAN SHILLINGS ONLY)`;
  };

  const formatContractDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parsed = Date.parse(dateStr);
    if (isNaN(parsed)) return dateStr;
    try {
      return new Date(parsed).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handlePriceChange = (val: number) => {
    setPurchasePrice(val);
    setBalance(Math.max(0, val - amountPaid));
  };

  const handleAmountPaidChange = (val: number) => {
    setAmountPaid(val);
    setBalance(Math.max(0, purchasePrice - val));
  };

  const handlePrint = () => window.print();

  const handleSaveToDatabase = () => {
    startTransition(async () => {
      const res = await updatePurchaseContractDetails({
        vehicleId: contract.vehicle?.id || contract.id,
        purchaseId: contract.id !== contract.vehicle?.id ? contract.id : undefined,
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

  const termsList = contract.termsAndConditions?.length
    ? contract.termsAndConditions
    : PURCHASE_TERMS_AND_CONDITIONS;

  return (
    <div className="sale-agreement-wrapper min-h-screen bg-[#f1f1f1] py-8 px-4 print:p-0 print:bg-white select-text">
      {/* Application controls - never printed */}
      <div className="no-print max-w-[210mm] mx-auto mb-6">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3.5 shadow-sm">
          {/* Left: identity */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href={backHref} className="btn-secondary shadow-sm shrink-0" aria-label="Back">
              <ArrowLeft size={15} />
              Back
            </Link>
            <div className="hidden sm:flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {make} {model} &mdash; {regNo || 'No Reg'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Purchase Agreement
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Chassis&nbsp;<span className="text-slate-600 dark:text-slate-300">{chassisNo || '—'}</span>
                &ensp;&middot;&ensp;
                Vendor&nbsp;<span className="font-semibold text-slate-700 dark:text-slate-200">{sellerName || '—'}</span>
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

      {/* ========================================================
          PAGE 1: VEHICLE, SELLER, PAYMENT & NOTES
          ======================================================== */}
      <section className="agreement-page agreement-page-1">
        {/* Faint Background Logo Watermark */}
        <div className="agreement-watermark" aria-hidden="true">
          <Image
            src="/icons/logo.png"
            alt=""
            width={450}
            height={320}
            className="object-contain"
            priority
          />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-between">
          <div>
            {/* HEADER: Matching PDF exact Times New Roman typography */}
            <header className="agreement-header">
              <div className="agreement-logo-wrap border-0 outline-none shadow-none bg-transparent">
                <Image
                  src="/icons/logo.png"
                  alt="Ebenezar Car Bazaar"
                  width={150}
                  height={150}
                  className="object-contain border-0 outline-none shadow-none ring-0 rounded-none bg-transparent select-none"
                  priority
                />
              </div>

              <div className="agreement-header-center">
                <h1>EBENEZAR ENT. CAR BAZAAR</h1>
                <p>P.O. BOX 3547 - 40100</p>
                <p>PATEL’S, ONDIEK HIGHWAY, KISUMU</p>
                <h2>PURCHASE AGREEMENT</h2>
              </div>

              <div className="agreement-logo-wrap text-right flex justify-end border-0 outline-none shadow-none bg-transparent">
                <Image
                  src="/icons/logo.png"
                  alt="Ebenezar Car Bazaar"
                  width={150}
                  height={150}
                  className="object-contain border-0 outline-none shadow-none ring-0 rounded-none bg-transparent select-none"
                  priority
                />
              </div>
            </header>

            {/* 1. VEHICLE DETAILS */}
            <div className="agreement-section">
              <h3 className="section-title">VEHICLE DETAILS</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
                {/* Row 1 */}
                <PdfField
                  label="MAKE"
                  value={make}
                  isEditing={isEditing}
                  onChange={setMake}
                  labelWidth="w-28"
                />
                <PdfField
                  label="MODEL"
                  value={model}
                  isEditing={isEditing}
                  onChange={setModel}
                  labelWidth="w-24"
                />

                {/* Row 2 */}
                <PdfField
                  label="REG NO."
                  value={regNo}
                  isEditing={isEditing}
                  onChange={setRegNo}
                  labelWidth="w-28"
                />
                <PdfField
                  label="FUEL"
                  value={fuel || 'PETROL'}
                  isEditing={isEditing}
                  onChange={setFuel}
                  labelWidth="w-24"
                />

                {/* Row 3 */}
                <PdfField
                  label="CHASSIS NO."
                  value={chassisNo}
                  isEditing={isEditing}
                  onChange={setChassisNo}
                  labelWidth="w-28"

                />
                <PdfField
                  label="COLOR"
                  value={color}
                  isEditing={isEditing}
                  onChange={setColor}
                  labelWidth="w-24"
                />

                {/* Row 4 */}
                <PdfField
                  label="ENGINE NO."
                  value={engineNo}
                  isEditing={isEditing}
                  onChange={setEngineNo}
                  labelWidth="w-28"

                />
                <PdfField
                  label="RATING, cc"
                  value={ratingCC}
                  isEditing={isEditing}
                  onChange={setRatingCC}
                  labelWidth="w-24"
                  lowerCase
                />
              </div>
            </div>

            {/* 2. SELLER DETAILS */}
            <div className="agreement-section">
              <h3 className="section-title">SELLER DETAILS</h3>
              <div className="space-y-2 text-[13px]">
                <PdfField
                  label="FULL NAME"
                  value={sellerName}
                  isEditing={isEditing}
                  onChange={setSellerName}
                  labelWidth="w-36"
                />
                <PdfField
                  label="ID NUMBER"
                  value={sellerId}
                  isEditing={isEditing}
                  onChange={setSellerId}
                  labelWidth="w-36"
                />
                <PdfField
                  label="PHONE NUMBER"
                  value={sellerPhone}
                  isEditing={isEditing}
                  onChange={setSellerPhone}
                  labelWidth="w-36"
                />
                <PdfField
                  label="P.O. BOX"
                  value={sellerPoBox}
                  isEditing={isEditing}
                  onChange={setSellerPoBox}
                  labelWidth="w-36"
                />
                <PdfField
                  label="PHYSICAL ADDRESS"
                  value={sellerAddress}
                  isEditing={isEditing}
                  onChange={setSellerAddress}
                  labelWidth="w-36"
                />
                <PdfField
                  label="OCCUPATION"
                  value={sellerOccupation}
                  isEditing={isEditing}
                  onChange={setSellerOccupation}
                  labelWidth="w-36"
                />
              </div>
            </div>

            {/* 3. PAYMENT CONDITIONS */}
            <div className="agreement-section">
              <h3 className="section-title">PAYMENT CONDITIONS</h3>
              <div className="space-y-2.5 text-[13px]">
                {/* Vehicle Price */}
                <div className="flex items-baseline min-w-0">
                  <span className="font-bold text-black shrink-0 w-36">VEHICLE PRICE</span>
                  <span className="font-bold text-black mx-1">:</span>
                  <div className="flex-1 min-w-0 pl-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold">KSH</span>
                        <input
                          type="number"
                          value={purchasePrice}
                          onChange={(e) => handlePriceChange(Number(e.target.value) || 0)}
                          className="w-32 border border-blue-500 rounded px-1.5 py-0.5 text-xs font-bold"
                        />
                      </div>
                    ) : (
                      <span className="font-bold text-black">
                        KSH {moneyWithDecimals(purchasePrice)}{' '}
                        <span className="font-normal italic uppercase">
                          {moneyInWords(purchasePrice)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Deposit / Amount Paid */}
                <div className="flex items-baseline min-w-0">
                  <span className="font-bold text-black shrink-0 w-36">DEPOSIT</span>
                  <span className="font-bold text-black mx-1">:</span>
                  <div className="flex-1 min-w-0 pl-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold">KSH</span>
                        <input
                          type="number"
                          value={amountPaid}
                          onChange={(e) => handleAmountPaidChange(Number(e.target.value) || 0)}
                          className="w-32 border border-blue-500 rounded px-1.5 py-0.5 text-xs font-bold"
                        />
                      </div>
                    ) : (
                      <span className="font-bold text-black">
                        KSH {moneyWithDecimals(amountPaid)}{' '}
                        <span className="font-normal italic uppercase">
                          {moneyInWords(amountPaid)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Balance */}
                <div className="flex items-baseline min-w-0">
                  <span className="font-bold text-black shrink-0 w-36">BALANCE</span>
                  <span className="font-bold text-black mx-1">:</span>
                  <div className="flex-1 min-w-0 pl-1">
                    <span className="font-bold text-black">
                      KSH {moneyWithDecimals(balance)}{' '}
                      <span className="font-normal italic uppercase">
                        {moneyInWords(balance)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. SPECIAL NOTES (optional if notes exist or editing) */}
            {(customNotes || isEditing) && (
              <div className="agreement-section no-print-only-when-empty">
                <h3 className="section-title">NOTES</h3>
                {isEditing ? (
                  <textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    rows={3}
                    className="w-full text-xs border border-blue-500 p-2 outline-none font-sans"
                    placeholder="Enter special notes, outstanding payments, logbook collection timeline, or tracking remarks..."
                  />
                ) : (
                  <div className="text-[12.5px] leading-relaxed text-black whitespace-pre-wrap pl-1 border-l-2 border-black/30">
                    {customNotes}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Signature Pair */}
          <div className="pt-2 avoid-break">
            <SignaturePair isPurchase />
          </div>
        </div>
      </section>

      {/* ========================================================
          PAGE 2: TERMS & CONDITIONS, SIGNATURES & VERIFICATION
          ======================================================== */}
      <section className="agreement-page agreement-page-2">
        {/* Faint Background Logo Watermark */}
        <div className="agreement-watermark" aria-hidden="true">
          <Image
            src="/icons/logo.png"
            alt=""
            width={450}
            height={320}
            className="object-contain"
            priority
          />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-between">
          <div>
            {/* TERMS & CONDITIONS: Exact Purchase Clauses */}
            <h3 className="section-title mb-2.5">TERMS &amp; CONDITIONS</h3>
            <ol className="list-decimal pl-6 space-y-1.5 text-black text-justify text-[12.5px] leading-snug">
              {termsList.map((term, index) => (
                <li key={index} className="pl-1">
                  <span>{term}</span>
                </li>
              ))}
            </ol>

            {/* SIGNATURES SECTION */}
            <div className="mt-5">
              <h3 className="section-title mb-2">SIGNATURES</h3>

              <p className="text-[13px] text-black mb-3">
                In witness where of both parties have set this date:{' '}
                {isEditing ? (
                  <input
                    value={agreementDate}
                    onChange={(e) => setAgreementDate(e.target.value)}
                    className="border-b border-blue-500 font-bold px-1 w-32"
                  />
                ) : (
                  <span className="font-bold">{formatContractDate(agreementDate)}</span>
                )}{' '}
                , signed and sealed by:
              </p>

              {/* Signature Lines matching PDF with ample signing room */}
              <div className="space-y-4 sm:space-y-5 text-[13px]">
                {/* Buyer signature (Ebenezar / George Dola Andere) */}
                <div className="flex items-end gap-2">
                  <span className="font-normal shrink-0 pb-1">Buyer’s signature:</span>
                  <div className="flex-1 border-b border-black pb-1 min-h-[44px] flex items-end font-bold">
                    {isEditing ? (
                      <div className="inline-flex items-center gap-2 pb-0.5">
                        <input
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value.toUpperCase())}
                          className="border-b border-blue-500 font-bold px-1 text-xs"
                          placeholder="BUYER NAME"
                        />
                        <input
                          value={buyerPhone}
                          onChange={(e) => setBuyerPhone(e.target.value)}
                          className="border-b border-blue-500 font-normal italic px-1 text-xs w-28"
                          placeholder="PHONE"
                        />
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2 pb-0.5">
                        <span>{buyerName}</span>{' '}
                        <span className="font-normal italic">
                          ({buyerPhone})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Seller section (Vendor) */}
                <div className="space-y-2">
                  {/* Seller row 1 */}
                  <div className="grid grid-cols-[auto_1fr_auto_1.2fr] items-end gap-x-2">
                    <span className="shrink-0 pb-1">Seller:</span>
                    {isEditing ? (
                      <div className="border-b border-black pb-1 min-h-[44px] flex items-end pl-1">
                        <input
                          value={sellerName}
                          onChange={(e) => setSellerName(e.target.value.toUpperCase())}
                          className="border-b border-blue-500 font-bold px-1 w-full text-xs"
                        />
                      </div>
                    ) : (
                      <span className="border-b border-black pb-1 font-bold truncate pl-1 min-h-[44px] flex items-end">
                        {sellerName || ''}
                      </span>
                    )}
                    <span className="shrink-0 pl-2 pb-1">Signature:</span>
                    <span className="border-b border-black pb-1 min-h-[44px] flex items-end"></span>
                  </div>

                  {/* Seller subline (ID & Phone) */}
                  <div className="grid grid-cols-[auto_1fr_auto_1.2fr] items-end gap-x-2 pl-8 pt-0.5">
                    <span className="shrink-0 pb-1">ID No.</span>
                    {isEditing ? (
                      <div className="border-b border-black pb-1 min-h-[28px] flex items-end pl-1">
                        <input
                          value={sellerId}
                          onChange={(e) => setSellerId(e.target.value)}
                          className="border-b border-blue-500 font-bold px-1 w-full"
                        />
                      </div>
                    ) : (
                      <span className="border-b border-black pb-1 font-bold pl-1 min-h-[28px] flex items-end">
                        {sellerId || ''}
                      </span>
                    )}
                    <span className="shrink-0 pl-2 pb-1">Phone No.</span>
                    {isEditing ? (
                      <div className="border-b border-black pb-1 min-h-[28px] flex items-end pl-1">
                        <input
                          value={sellerPhone}
                          onChange={(e) => setSellerPhone(e.target.value)}
                          className="border-b border-blue-500 font-bold px-1 w-full"
                        />
                      </div>
                    ) : (
                      <span className="border-b border-black pb-1 font-bold pl-1 min-h-[28px] flex items-end">
                        {sellerPhone || ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Buyer Witness section */}
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr_auto_1.2fr] items-end gap-x-2">
                    <span className="shrink-0 pb-1">Buyer’s Witness:</span>
                    {isEditing ? (
                      <div className="border-b border-black pb-1 min-h-[44px] flex items-end pl-1">
                        <input
                          value={buyerWitnessName}
                          onChange={(e) => setBuyerWitnessName(e.target.value.toUpperCase())}
                          className="border-b border-blue-500 font-bold px-1 w-full"
                        />
                      </div>
                    ) : (
                      <span className="border-b border-black pb-1 font-bold truncate pl-1 min-h-[44px] flex items-end">
                        {buyerWitnessName || 'TIMOTHY SAMUEL'}
                      </span>
                    )}
                    <span className="shrink-0 pl-2 pb-1">Signature:</span>
                    <span className="border-b border-black pb-1 min-h-[44px] flex items-end"></span>
                  </div>

                  {/* Buyer Witness subline */}
                  <div className="grid grid-cols-[auto_1fr_auto_1.2fr] items-end gap-x-2 pl-8 pt-0.5">
                    <span className="shrink-0 pb-1">ID No.</span>
                    {isEditing ? (
                      <div className="border-b border-black pb-1 min-h-[28px] flex items-end pl-1">
                        <input
                          value={buyerWitnessId}
                          onChange={(e) => setBuyerWitnessId(e.target.value)}
                          className="border-b border-blue-500 font-bold px-1 w-full"
                        />
                      </div>
                    ) : (
                      <span className="border-b border-black pb-1 font-bold pl-1 min-h-[28px] flex items-end">
                        {buyerWitnessId || '39711161'}
                      </span>
                    )}
                    <span className="shrink-0 pl-2 pb-1">Phone No.</span>
                    {isEditing ? (
                      <div className="border-b border-black pb-1 min-h-[28px] flex items-end pl-1">
                        <input
                          value={buyerWitnessPhone}
                          onChange={(e) => setBuyerWitnessPhone(e.target.value)}
                          className="border-b border-blue-500 font-bold px-1 w-full"
                        />
                      </div>
                    ) : (
                      <span className="border-b border-black pb-1 font-bold pl-1 min-h-[28px] flex items-end">
                        {buyerWitnessPhone || ' 0742581522'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Seller Witness section */}
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr_auto_1.2fr] items-end gap-x-2">
                    <span className="shrink-0 pb-1">Seller’s Witness:</span>
                    {isEditing ? (
                      <div className="border-b border-black pb-1 min-h-[44px] flex items-end pl-1">
                        <input
                          value={sellerWitnessName}
                          onChange={(e) => setSellerWitnessName(e.target.value.toUpperCase())}
                          className="border-b border-blue-500 font-bold px-1 w-full"
                        />
                      </div>
                    ) : (
                      <span className="border-b border-black pb-1 font-bold truncate pl-1 min-h-[44px] flex items-end">
                        {sellerWitnessName || ''}
                      </span>
                    )}
                    <span className="shrink-0 pl-2 pb-1">Signature:</span>
                    <span className="border-b border-black pb-1 min-h-[44px] flex items-end"></span>
                  </div>

                  {/* Seller Witness subline */}
                  <div className="grid grid-cols-[auto_1fr_auto_1.2fr] items-end gap-x-2 pl-8 pt-0.5">
                    <span className="shrink-0 pb-1">ID No.</span>
                    {isEditing ? (
                      <div className="border-b border-black pb-1 min-h-[28px] flex items-end pl-1">
                        <input
                          value={sellerWitnessId}
                          onChange={(e) => setSellerWitnessId(e.target.value)}
                          className="border-b border-blue-500 font-bold px-1 w-full"
                        />
                      </div>
                    ) : (
                      <span className="border-b border-black pb-1 font-bold pl-1 min-h-[28px] flex items-end">
                        {sellerWitnessId || ''}
                      </span>
                    )}
                    <span className="shrink-0 pl-2 pb-1">Phone No.</span>
                    {isEditing ? (
                      <div className="border-b border-black pb-1 min-h-[28px] flex items-end pl-1">
                        <input
                          value={sellerWitnessPhone}
                          onChange={(e) => setSellerWitnessPhone(e.target.value)}
                          className="border-b border-blue-500 font-bold px-1 w-full"
                        />
                      </div>
                    ) : (
                      <span className="border-b border-black pb-1 font-bold pl-1 min-h-[28px] flex items-end">
                        {sellerWitnessPhone || ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VERIFICATION BLOCK: Pinned to bottom of Page 2 */}
          <div className="mt-auto pt-4 avoid-break">
            <p className="font-bold text-[12.5px] text-black uppercase leading-tight mb-3">
              BY SIGNING ABOVE INDICATES THE BUYER &amp; THE SELLER HAVE VERIFIED THAT THE
              CHASSIS AND ENGINE NUMBER ARE CORRECT ON THE LOGBOOK AND THE VEHICLE.
            </p>

            <div className="grid grid-cols-2 gap-8 text-[13px] font-bold">
              <div className="flex items-baseline">
                <span className="w-28 shrink-0">CHASSIS NO.</span>
                <span className="mx-1">:</span>
                <span className="flex-1 uppercase font-bold pl-1">
                  {chassisNo || ''}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="w-28 shrink-0">ENGINE NO.</span>
                <span className="mx-1">:</span>
                <span className="flex-1 uppercase font-bold pl-1">
                  {engineNo || ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global & Print CSS matching the Sale Agreement output precisely */}
      <style jsx global>{`
        /* Remove sidebar navigation from browser view on contract document page */
        body:has(.sale-agreement-wrapper) aside.sidebar,
        body:has(.sale-agreement-wrapper) aside[aria-label="Main sidebar navigation"],
        body:has(.sale-agreement-wrapper) button[aria-label="Open Navigation Menu"] {
          display: none !important;
        }

        body:has(.sale-agreement-wrapper) main > div {
          padding: 0 !important;
        }

        /* Complete theme isolation: prevent dark mode or graphite themes from altering document preview */
        body:has(.sale-agreement-wrapper) #main-scroll-canvas {
          background-color: #eef1f5 !important;
        }

        body:has(.sale-agreement-wrapper) .bg-mesh-gradient {
          display: none !important;
        }

        .sale-agreement-wrapper {
          background-color: #eef1f5 !important;
          color: #000000 !important;
          color-scheme: light !important;
          font-family: 'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Prevent dark or graphite mode from inverting document paper or text */
        .sale-agreement-wrapper .agreement-page,
        .sale-agreement-wrapper .agreement-page * {
          color: #000000 !important;
          color-scheme: light !important;
          -webkit-text-fill-color: #000000;
        }

        .sale-agreement-wrapper .agreement-page {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 28px;
          box-sizing: border-box;
          overflow: hidden;
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          padding: 15mm 16mm;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12) !important;
          border: 1px solid #d1d5db !important;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* Force pure black borders for table and lines */
        .sale-agreement-wrapper .agreement-page table,
        .sale-agreement-wrapper .agreement-page thead,
        .sale-agreement-wrapper .agreement-page tbody,
        .sale-agreement-wrapper .agreement-page tr,
        .sale-agreement-wrapper .agreement-page th,
        .sale-agreement-wrapper .agreement-page td {
          border-color: #000000 !important;
          color: #000000 !important;
          background-color: transparent !important;
          background: transparent !important;
        }

        .sale-agreement-wrapper .agreement-page .border-b,
        .sale-agreement-wrapper .agreement-page .border-t,
        .sale-agreement-wrapper .agreement-page .border-r,
        .sale-agreement-wrapper .agreement-page .border-l,
        .sale-agreement-wrapper .agreement-page .border-black {
          border-color: #000000 !important;
        }

        .sale-agreement-wrapper .agreement-page input,
        .sale-agreement-wrapper .agreement-page textarea {
          background-color: #ffffff !important;
          color: #000000 !important;
          border-color: #3b82f6 !important;
          -webkit-text-fill-color: #000000 !important;
        }

        .sale-agreement-wrapper .agreement-page .agreement-watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.045 !important;
          pointer-events: none !important;
          z-index: 0;
          overflow: hidden;
          background: transparent !important;
          background-color: transparent !important;
        }

        .agreement-header {
          display: grid;
          grid-template-columns: 95px 1fr 95px;
          align-items: start;
          column-gap: 12px;
          margin-bottom: 20px;
        }

        .agreement-logo-wrap {
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
          background-color: transparent !important;
        }

        .agreement-header .agreement-logo-wrap,
        .agreement-header .agreement-logo-wrap *,
        .agreement-header .agreement-logo-wrap img,
        .agreement-header img {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          -webkit-box-shadow: none !important;
          filter: none !important;
          -webkit-filter: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
        }

        .agreement-logo-wrap img {
          display: block;
          object-fit: contain;
        }

        .agreement-header-center {
          text-align: center;
          font-family: 'Times New Roman', Times, serif;
        }

        .agreement-header-center h1 {
          margin: 0 0 2px;
          font-size: 19px;
          font-weight: 700;
          color: #000000 !important;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .agreement-header-center p {
          margin: 0 0 2px;
          font-size: 14px;
          font-weight: 700;
          color: #000000 !important;
        }

        .agreement-header-center h2 {
          margin: 8px 0 0;
          font-size: 18px;
          font-weight: 700;
          color: #000000 !important;
          text-transform: uppercase;
          text-decoration: underline;
          text-underline-offset: 4px;
          letter-spacing: 0.04em;
        }

        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #000000 !important;
          text-transform: uppercase;
          text-decoration: underline;
          text-underline-offset: 4px;
          margin-bottom: 8px;
        }

        .agreement-section {
          margin-bottom: 16px;
        }

        @media (max-width: 900px) {
          .agreement-page {
            width: 100%;
            min-height: auto;
            padding: 24px 18px;
          }
          .agreement-header {
            grid-template-columns: 70px 1fr 70px;
          }
          .agreement-logo-wrap {
            width: 65px;
            height: 65px;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
          }
          .agreement-header-center h1 {
            font-size: 15px;
          }
          .agreement-header-center p {
            font-size: 12px;
          }
          .agreement-header-center h2 {
            font-size: 15px;
          }
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
            background: #ffffff !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Reset all app shells so they don't offset or clip the document */
          body > div,
          div:has(> #main-scroll-canvas),
          main,
          #main-scroll-canvas,
          main > div,
          #main-scroll-canvas > div {
            display: block !important;
            height: auto !important;
            min-height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            position: static !important;
            overflow: visible !important;
            background: transparent !important;
          }

          /* Hide sidebar, navigation, controls, headers, floating buttons */
          aside,
          aside *,
          .sidebar,
          .sidebar *,
          nav,
          nav *,
          [role="dialog"],
          button[aria-label="Open Navigation Menu"],
          .bg-mesh-gradient,
          .print\:hidden,
          .no-print {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            max-height: 0 !important;
            width: 0 !important;
            max-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            outline: none !important;
            position: absolute !important;
            left: -99999px !important;
            top: -99999px !important;
            overflow: hidden !important;
            pointer-events: none !important;
            opacity: 0 !important;
          }

          .sale-agreement-wrapper {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
          }

          .agreement-page {
            box-sizing: border-box !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 auto !important;
            padding: 14mm 16mm !important;
            box-shadow: none !important;
            border: none !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }

          .agreement-page:last-of-type {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .no-print-only-when-empty {
            break-inside: avoid;
          }

          input,
          textarea {
            color: #000000 !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Reusable field matching the exact typography and colon alignment in the PDF.
 */
function PdfField({
  label,
  value,
  isEditing = false,
  onChange,
  labelWidth = 'w-28',
  mono = false,
  lowerCase = false,
}: {
  label: string;
  value: string;
  isEditing?: boolean;
  onChange?: (v: string) => void;
  labelWidth?: string;
  mono?: boolean;
  lowerCase?: boolean;
}) {
  return (
    <div className="flex items-baseline min-w-0">
      <span className={`font-bold text-black shrink-0 ${labelWidth}`}>
        {label}
      </span>
      <span className="font-bold text-black mx-1">:</span>
      {isEditing ? (
        <input
          value={value || ''}
          onChange={(e) => onChange && onChange(lowerCase ? e.target.value : e.target.value.toUpperCase())}
          className={`flex-1 min-w-0 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-black font-bold outline-none ${lowerCase ? '' : 'uppercase'
            }`}
        />
      ) : (
        <span
          className={`flex-1 min-w-0 font-bold text-black pl-1 ${mono ? '' : ''} ${lowerCase ? '' : 'uppercase'
            }`}
        >
          {value || ''}
        </span>
      )}
    </div>
  );
}

/**
 * Bottom signature pair matching the PDF template on Page 1
 */
function SignaturePair({ isPurchase = false }: { isPurchase?: boolean }) {
  return (
    <div className="flex items-center justify-between font-bold text-[13px] text-black uppercase tracking-wide pt-4 pb-1">
      <div>{isPurchase ? 'SIGNATURE OF THE BUYER' : 'SIGNATURE OF THE SELLER'}</div>
      <div>{isPurchase ? 'SIGNATURE OF THE SELLER' : 'SIGNATURE OF THE BUYER'}</div>
    </div>
  );
}
