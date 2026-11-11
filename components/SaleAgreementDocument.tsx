'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { numberToWords } from '@/lib/number-to-words';
import { updateVehicleContractDetails } from '@/lib/actions/contract.actions';
import { CONTRACT_TERMS_AND_CONDITIONS, type ContractData } from '@/lib/contract-utils';
import { Printer, Edit3, Check, Save, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { Button } from './ui/button';

interface SaleAgreementDocumentProps {
  contract: ContractData;
  backHref?: string;
  allowEdit?: boolean;
}

export default function SaleAgreementDocument({
  contract,
  backHref = '/loans',
  allowEdit = true,
}: SaleAgreementDocumentProps) {
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

  // Buyer Details state
  const [buyerName, setBuyerName] = useState(contract.buyer?.fullName || '');
  const [idNumber, setIdNumber] = useState(contract.buyer?.idNumber || '');
  const [phoneNumber, setPhoneNumber] = useState(contract.buyer?.phoneNumber || '');
  const [poBox, setPoBox] = useState(contract.buyer?.poBox || '');
  const [physicalAddress, setPhysicalAddress] = useState(contract.buyer?.physicalAddress || '');
  const [occupation, setOccupation] = useState(contract.buyer?.occupation || 'BUSINESS');

  // Payment Conditions state
  const [vehiclePrice, setVehiclePrice] = useState(contract.payment?.vehiclePrice || 0);
  const [deposit, setDeposit] = useState(contract.payment?.deposit || 0);
  const [balance, setBalance] = useState(contract.payment?.balance || 0);

  // Notes & Dates
  const [customNotes, setCustomNotes] = useState('');
  const [agreementDate, setAgreementDate] = useState(contract.agreementDate || '');

  // Witnesses state
  const [sellerWitnessName, setSellerWitnessName] = useState(contract.signatures?.sellerWitnessName || '');
  const [sellerWitnessId, setSellerWitnessId] = useState(contract.signatures?.sellerWitnessId || '');
  const [sellerWitnessPhone, setSellerWitnessPhone] = useState(contract.signatures?.sellerWitnessPhone || '');
  const [buyerWitnessName, setBuyerWitnessName] = useState(contract.signatures?.buyerWitnessName || '');
  const [buyerWitnessId, setBuyerWitnessId] = useState(contract.signatures?.buyerWitnessId || '');
  const [buyerWitnessPhone, setBuyerWitnessPhone] = useState(contract.signatures?.buyerWitnessPhone || '');

  // Seller details state
  const rawSellerName = contract.signatures?.sellerName;
  const initialSellerName =
    rawSellerName && !rawSellerName.toUpperCase().includes('EBENEZAR')
      ? rawSellerName
      : 'GEORGE DOLA ANDERE';
  const initialSellerPhone = contract.signatures?.sellerPhone || '0722263192';

  const [sellerName, setSellerName] = useState(initialSellerName);
  const [sellerPhone, setSellerPhone] = useState(initialSellerPhone);

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
    setVehiclePrice(val);
    setBalance(Math.max(0, val - deposit));
  };

  const handleDepositChange = (val: number) => {
    setDeposit(val);
    setBalance(Math.max(0, vehiclePrice - val));
  };

  const handlePrint = () => window.print();

  const handleSaveToDatabase = () => {
    startTransition(async () => {
      const res = await updateVehicleContractDetails({
        vehicleId: contract.vehicle?.id || '',
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

  const hasInstallments = balance > 0;
  const installmentList = contract.installments || [];
  const minTableRows = Math.max(19, installmentList.length);
  const tableRows = Array.from({ length: minTableRows }).map((_, idx) => installmentList[idx] || null);

  const useTwoCols = installmentList.length > 19;
  const midPoint = Math.ceil(installmentList.length / 2);
  const col1 = useTwoCols ? installmentList.slice(0, midPoint) : installmentList;
  const col2 = useTwoCols ? installmentList.slice(midPoint) : [];

  const termsList = contract.termsAndConditions?.length
    ? contract.termsAndConditions
    : CONTRACT_TERMS_AND_CONDITIONS;

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
              <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                {make} {model} &mdash; {regNo || 'No Reg'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Chassis&nbsp;<span className="font-mono text-slate-600 dark:text-slate-300">{chassisNo || '—'}</span>
                &ensp;&middot;&ensp;
                Engine&nbsp;<span className="font-mono text-slate-600 dark:text-slate-300">{engineNo || '—'}</span>
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
          PAGE 1: VEHICLE, BUYER, PAYMENT & NOTES
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
                <h2>SALE AGREEMENT</h2>
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

            {/* 2. BUYER DETAILS */}
            <div className="agreement-section">
              <h3 className="section-title">BUYER DETAILS</h3>
              <div className="space-y-2 text-[13px]">
                <PdfField
                  label="FULL NAME"
                  value={buyerName}
                  isEditing={isEditing}
                  onChange={setBuyerName}
                  labelWidth="w-36"
                />
                <PdfField
                  label="ID NUMBER"
                  value={idNumber}
                  isEditing={isEditing}
                  onChange={setIdNumber}
                  labelWidth="w-36"
                />
                <PdfField
                  label="PHONE NUMBER"
                  value={phoneNumber}
                  isEditing={isEditing}
                  onChange={setPhoneNumber}
                  labelWidth="w-36"
                />
                <PdfField
                  label="P.O. BOX"
                  value={poBox}
                  isEditing={isEditing}
                  onChange={setPoBox}
                  labelWidth="w-36"
                />
                <PdfField
                  label="PHYSICAL ADDRESS"
                  value={physicalAddress}
                  isEditing={isEditing}
                  onChange={setPhysicalAddress}
                  labelWidth="w-36"
                />
                <PdfField
                  label="OCCUPATION"
                  value={occupation}
                  isEditing={isEditing}
                  onChange={setOccupation}
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
                          value={vehiclePrice}
                          onChange={(e) => handlePriceChange(Number(e.target.value) || 0)}
                          className="w-32 border border-blue-500 rounded px-1.5 py-0.5 text-xs font-bold"
                        />
                      </div>
                    ) : (
                      <span className="font-bold text-black">
                        KSH {moneyWithDecimals(vehiclePrice)}{' '}
                        <span className="font-normal italic uppercase">
                          {moneyInWords(vehiclePrice)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Deposit */}
                <div className="flex items-baseline min-w-0">
                  <span className="font-bold text-black shrink-0 w-36">DEPOSIT</span>
                  <span className="font-bold text-black mx-1">:</span>
                  <div className="flex-1 min-w-0 pl-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold">KSH</span>
                        <input
                          type="number"
                          value={deposit}
                          onChange={(e) => handleDepositChange(Number(e.target.value) || 0)}
                          className="w-32 border border-blue-500 rounded px-1.5 py-0.5 text-xs font-bold"
                        />
                      </div>
                    ) : (
                      <span className="font-bold text-black">
                        KSH {moneyWithDecimals(deposit)}{' '}
                        <span className="font-normal italic uppercase">
                          {moneyInWords(deposit)}
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
                    placeholder="Enter special notes, warranties, handover accessories, or tracker clauses..."
                  />
                ) : (
                  <div className="text-[12.5px] leading-relaxed text-black whitespace-pre-wrap pl-1 border-l-2 border-black/30">
                    {customNotes}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PAGE 1 FOOTER: Matching PDF bottom signatures */}
          <div className="mt-auto pt-6 pb-9 w-full avoid-break">
            <SignaturePair />
          </div>
        </div>
      </section>

      {/* ========================================================
          PAGE 2: INSTALLMENT SCHEDULE (If balance > 0)
          ======================================================== */}
      {hasInstallments && (
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
              {/* Installment Intro Statement */}
              <p className="font-bold text-[13.5px] text-black leading-snug uppercase mb-5 tracking-tight">
                THE BALANCE ABOVE SHALL BE LIQUIDATION OF THE OUTSTANDING BALANCE BY THE
                PURCHASE THROUGH THE PAYMENT OF THE MONTHLY INSTALMENT OF THE AMOUNT AS
                SHOWN HEREUNDER
              </p>

              {/* Installment Table: 19 rows matching PDF template */}
              <div className="w-full flex justify-center mb-6">
                {useTwoCols ? (
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <PdfInstallmentSubTable installments={col1} money={moneyWithDecimals} />
                    <PdfInstallmentSubTable installments={col2} money={moneyWithDecimals} />
                  </div>
                ) : (
                  <div className="w-[5.3in] mx-auto">
                    <table className="w-full border-collapse border border-black text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-black">
                          <th className="border-r border-black p-1 text-center w-12 font-normal">
                            No
                          </th>
                          <th className="border-r border-black p-1 px-3 font-normal">
                            DATE
                          </th>
                          <th className="p-1 px-3 font-normal">
                            AMOUNT (in KSH)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row, idx) => (
                          <tr key={idx} className="border-b border-black h-[21px]">
                            <td className="border-r border-black p-0.5 text-center font-normal">
                              {idx + 1}
                            </td>
                            <td className="border-r border-black p-0.5 px-3">
                              {row ? row.date : ''}
                            </td>
                            <td className="p-0.5 px-3">
                              {row ? `KSH ${moneyWithDecimals(row.amount)}` : ''}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold border-t border-black h-[23px]">
                          <td className="border-r border-black" />
                          <td className="border-r border-black p-0.5 px-3 text-right">
                            TOTAL
                          </td>
                          <td className="p-0.5 px-3">
                            KSH {moneyWithDecimals(contract.totalInstallmentsAmount || balance)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* PAGE 2 FOOTER: Matching PDF bottom signatures */}
            <div className="mt-auto pt-6 pb-9 w-full avoid-break">
              <SignaturePair />
            </div>
          </div>
        </section>
      )}

      {/* ========================================================
          PAGE 3: TERMS & CONDITIONS, SIGNATURES & VERIFICATION
          ======================================================== */}
      <section className="agreement-page agreement-page-3">
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
            {/* TERMS & CONDITIONS: Exact 9 clauses */}
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
                {/* Seller signature */}
                <div className="flex items-end gap-2">
                  <span className="font-normal shrink-0 pb-1">Seller’s signature:</span>
                  <div className="flex-1 border-b border-black pb-1 min-h-[44px] flex items-end font-bold">
                    {isEditing ? (
                      <div className="inline-flex items-center gap-2 pb-0.5">
                        <input
                          value={sellerName}
                          onChange={(e) => setSellerName(e.target.value.toUpperCase())}
                          className="border-b border-blue-500 font-bold px-1 text-xs"
                          placeholder="SELLER NAME"
                        />
                        <input
                          value={sellerPhone}
                          onChange={(e) => setSellerPhone(e.target.value)}
                          className="border-b border-blue-500 font-normal italic px-1 text-xs w-28"
                          placeholder="PHONE"
                        />
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2 pb-0.5">
                        <span>{sellerName}</span>{' '}
                        <span className="font-normal italic">
                          ({sellerPhone})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buyer section */}
                <div className="space-y-2">
                  {/* Buyer row 1 */}
                  <div className="grid grid-cols-[auto_1fr_auto_1.2fr] items-end gap-x-2">
                    <span className="shrink-0 pb-1">Buyer’s Name:</span>
                    <span className="border-b border-black pb-1 font-bold truncate pl-1 min-h-[44px] flex items-end">
                      {buyerName || ''}
                    </span>
                    <span className="shrink-0 pl-2 pb-1">Signature:</span>
                    <span className="border-b border-black pb-1 min-h-[44px] flex items-end"></span>
                  </div>

                  {/* Buyer subline (ID & Phone) */}
                  <div className="grid grid-cols-[auto_1fr_auto_1.2fr] items-end gap-x-2 pl-8 pt-0.5">
                    <span className="shrink-0 pb-1">ID No.</span>
                    <span className="border-b border-black pb-1 font-bold pl-1 min-h-[28px] flex items-end">
                      {idNumber || ''}
                    </span>
                    <span className="shrink-0 pl-2 pb-1">Phone No.</span>
                    <span className="border-b border-black pb-1 font-bold pl-1 min-h-[28px] flex items-end">
                      {phoneNumber || ''}
                    </span>
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

                {/* Buyer Witness section */}
                <div className="space-y-2">
                  <div className="grid grid-cols-[auto_1fr_auto_1.2fr] items-end gap-x-2">
                    <span className="shrink-0 pb-1">Buyer Witness:</span>
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
                        {buyerWitnessName || ''}
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
                        {buyerWitnessId || ''}
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
                        {buyerWitnessPhone || ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VERIFICATION BLOCK: Pinned to bottom of Page 3 */}
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

      {/* Global & Print CSS matching the PDF output precisely */}
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
            width: 90px;
            height: 90px;
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
          className={`flex-1 min-w-0 font-bold text-black pl-1 ${mono ? 'font-mono' : ''} ${lowerCase ? '' : 'uppercase'
            }`}
        >
          {value || ''}
        </span>
      )}
    </div>
  );
}

/**
 * Sub-table for 2-column installment layouts (if installments exceed 19)
 */
function PdfInstallmentSubTable({
  installments,
  money,
}: {
  installments: Array<{ number: number; date: string; amount: number }>;
  money: (n: number) => string;
}) {
  return (
    <table className="w-full border-collapse border border-black text-left text-[12px]">
      <thead>
        <tr className="border-b border-black">
          <th className="border-r border-black p-1 text-center w-10 font-normal">
            No
          </th>
          <th className="border-r border-black p-1 px-2 font-normal">
            DATE
          </th>
          <th className="p-1 px-2 font-normal">
            AMOUNT (in KSH)
          </th>
        </tr>
      </thead>
      <tbody>
        {installments.map((inst) => (
          <tr key={inst.number} className="border-b border-black h-[20px]">
            <td className="border-r border-black p-0.5 text-center font-normal">
              {inst.number}
            </td>
            <td className="border-r border-black p-0.5 px-2">
              {inst.date}
            </td>
            <td className="p-0.5 px-2">
              KSH {money(inst.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Bottom signature pair matching the PDF template on Page 1 and Page 2
 */
function SignaturePair() {
  return (
    <div className="flex items-center justify-between font-bold text-[13px] text-black uppercase tracking-wide pt-4 pb-1">
      <div>SIGNATURE OF THE SELLER</div>
      <div>SIGNATURE OF THE BUYER</div>
    </div>
  );
}
