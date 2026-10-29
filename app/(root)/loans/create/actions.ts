'use server';

import { createFinancingAgreement } from "@/lib/actions/dms.actions";
import { redirect } from "next/navigation";

export async function handleCreateAgreement(formData: FormData) {
  const clientId = formData.get("clientId") as string;
  const vehicleId = formData.get("vehicleId") as string;
  const salePrice = parseFloat(formData.get("salePrice") as string);
  const depositPaid = parseFloat(formData.get("depositPaid") as string);
  const monthlyDue = parseFloat(formData.get("monthlyDue") as string);
  const durationMonths = parseInt(formData.get("durationMonths") as string, 10);
  const startDate = formData.get("startDate") as string;

  const baseComment = formData.get("comment") as string;
  const guarantorName = formData.get("guarantorName") as string;
  const guarantorPhone = formData.get("guarantorPhone") as string;
  const guarantorId = formData.get("guarantorId") as string;

  // === DIAGNOSTIC LOGGING ===
  console.log('[CreateLoan] FormData received:', {
    clientId: clientId || '⚠️ MISSING',
    vehicleId: vehicleId || '⚠️ MISSING',
    salePrice: isNaN(salePrice) ? '⚠️ NaN' : salePrice,
    depositPaid: isNaN(depositPaid) ? '⚠️ NaN' : depositPaid,
    monthlyDue: isNaN(monthlyDue) ? '⚠️ NaN' : monthlyDue,
    durationMonths: isNaN(durationMonths) ? '⚠️ NaN' : durationMonths,
    startDate: startDate || '⚠️ MISSING',
  });

  if (!clientId) {
    redirect(`/loans/create?error=${encodeURIComponent('Client is required. Please search and select a borrower.')}`);
  }
  if (!vehicleId) {
    redirect(`/loans/create?error=${encodeURIComponent('Vehicle is required. Please search and select a vehicle.')}`);
  }
  if (isNaN(salePrice) || salePrice <= 0) {
    redirect(`/loans/create?error=${encodeURIComponent('Sale price is required and must be a positive number.')}`);
  }
  const isCashSale = salePrice > 0 && depositPaid === salePrice;

  if (!isCashSale && (isNaN(monthlyDue) || monthlyDue <= 0)) {
    redirect(`/loans/create?error=${encodeURIComponent('Monthly instalment is required and must be a positive number.')}`);
  }
  if (!isCashSale && (isNaN(durationMonths) || durationMonths <= 0)) {
    redirect(`/loans/create?error=${encodeURIComponent('Duration in months is required.')}`);
  }

  let comment = baseComment ? baseComment.trim().toUpperCase() : '';
  if (guarantorName) {
    comment += `\nGUARANTOR: ${guarantorName.toUpperCase()}`;
    if (guarantorPhone) comment += ` | PHONE: ${guarantorPhone}`;
    if (guarantorId) comment += ` | ID: ${guarantorId}`;
  }

  const result = await createFinancingAgreement({
    clientId,
    vehicleId,
    salePrice,
    depositPaid: isNaN(depositPaid) ? 0 : depositPaid,
    monthlyDue: isCashSale ? 0 : monthlyDue,
    durationMonths: isCashSale ? 0 : durationMonths,
    startDate: startDate || undefined,
    comment: comment || undefined,
  });

  console.log('[CreateLoan] Result:', JSON.stringify(result));

  if (result && result.success && result.agreement) {
    redirect(`/loans/${result.agreement.id}/contract`);
  }

  const errMsg = result?.error || 'Unknown error occurred';
  redirect(`/loans/create?error=${encodeURIComponent(errMsg)}`);
}
