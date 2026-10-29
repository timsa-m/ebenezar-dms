import type { AgingBucket } from '@/src/types/database.types';

/**
 * Monetary Decimal rounding to 2 places (avoids floating point drift).
 */
export function roundCurrency(amount: number): number {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

/**
 * Format monetary amount into Kenyan Shillings (KES / KSh).
 */
export function formatKES(amount: number | null | undefined): string {
  const safeAmount = roundCurrency(Number(amount) || 0);
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

/**
 * Hire-Purchase Auto Financing Invariant:
 * Outstanding Balance = Sale Price - Total Paid - Total Waived
 */
export function calculateBalance(salePrice: number, totalPaid: number, totalWaived: number = 0): number {
  const balance = (Number(salePrice) || 0) - (Number(totalPaid) || 0) - (Number(totalWaived) || 0);
  return roundCurrency(Math.max(0, balance));
}

export interface PaymentWaterfallInput {
  paymentAmount: number;
  outstandingPenalties: number;
  overdueInterest: number;
  currentPrincipalBalance: number;
}

export interface PaymentWaterfallResult {
  allocatedPenalties: number;
  allocatedOverdueInterest: number;
  allocatedPrincipal: number;
  remainingOverpayment: number;
  newPenaltiesBalance: number;
  newOverdueInterestBalance: number;
  newPrincipalBalance: number;
  totalAllocated: number;
}

/**
 * Payment Allocation Waterfall:
 * Payment -> Outstanding Penalties -> Overdue Interest -> Principal Balance
 */
export function allocateRepayment(input: PaymentWaterfallInput): PaymentWaterfallResult {
  let unallocated = roundCurrency(Math.max(0, input.paymentAmount));

  // 1. Allocate to Outstanding Penalties
  const penaltiesDue = roundCurrency(Math.max(0, input.outstandingPenalties));
  const allocatedPenalties = Math.min(unallocated, penaltiesDue);
  unallocated = roundCurrency(unallocated - allocatedPenalties);
  const newPenaltiesBalance = roundCurrency(penaltiesDue - allocatedPenalties);

  // 2. Allocate to Overdue Interest
  const interestDue = roundCurrency(Math.max(0, input.overdueInterest));
  const allocatedOverdueInterest = Math.min(unallocated, interestDue);
  unallocated = roundCurrency(unallocated - allocatedOverdueInterest);
  const newOverdueInterestBalance = roundCurrency(interestDue - allocatedOverdueInterest);

  // 3. Allocate to Principal Balance
  const principalDue = roundCurrency(Math.max(0, input.currentPrincipalBalance));
  const allocatedPrincipal = Math.min(unallocated, principalDue);
  unallocated = roundCurrency(unallocated - allocatedPrincipal);
  const newPrincipalBalance = roundCurrency(principalDue - allocatedPrincipal);

  return {
    allocatedPenalties,
    allocatedOverdueInterest,
    allocatedPrincipal,
    remainingOverpayment: unallocated, // Excess payment if any
    newPenaltiesBalance,
    newOverdueInterestBalance,
    newPrincipalBalance,
    totalAllocated: roundCurrency(allocatedPenalties + allocatedOverdueInterest + allocatedPrincipal),
  };
}

export interface DelinquencyClassification {
  bucket: AgingBucket;
  statusLabel: string;
  badgeVariant: 'success' | 'info' | 'warning' | 'destructive';
  isRepossessionCandidate: boolean;
  description: string;
}

/**
 * Delinquency Classification Helpers:
 * - 0–7 Days: Performing (Standard grace period)
 * - 7–30 Days: Overdue
 * - 31–60 Days: Early-stage delinquency (Substandard)
 * - 60–90 Days: Defaulting
 * - >90 Days: Loss (Critical default / Repossession candidate — NOT written off)
 */
export function classifyDelinquency(daysOverdue: number): DelinquencyClassification {
  const days = Math.max(0, Math.floor(Number(daysOverdue) || 0));

  if (days < 7) {
    return {
      bucket: '0-30 Days',
      statusLabel: 'Performing',
      badgeVariant: 'success',
      isRepossessionCandidate: false,
      description: 'Account is healthy and up to date within the 7-day grace period.',
    };
  }

  if (days <= 30) {
    return {
      bucket: '0-30 Days',
      statusLabel: 'Overdue (7–30 Days)',
      badgeVariant: 'warning',
      isRepossessionCandidate: false,
      description: 'Account is overdue (7 to 30 days past due). Automated payment reminders active.',
    };
  }

  if (days < 60) {
    return {
      bucket: '31-60 Days',
      statusLabel: 'Early-stage Delinquency',
      badgeVariant: 'warning',
      isRepossessionCandidate: false,
      description: 'Early-stage delinquency (31 to 60 days past due). First missed installment cycle.',
    };
  }

  if (days <= 90) {
    return {
      bucket: '61-90 Days',
      statusLabel: 'Defaulting (60–90 Days)',
      badgeVariant: 'destructive',
      isRepossessionCandidate: true,
      description: 'Defaulting (60 to 90 days past due). Pre-repossession warning triggered.',
    };
  }

  return {
    bucket: '90+ Days',
    statusLabel: 'Loss (>90 Days — Not Written Off)',
    badgeVariant: 'destructive',
    isRepossessionCandidate: true,
    description: 'Loss classification (>90 days past due). Critical default subject to asset repossession and recovery. Not written off.',
  };
}

/**
 * Kenyan Phone Number Normalization to E.164:
 * Handles:
 * - 07XXXXXXXX -> +2547XXXXXXXX
 * - 01XXXXXXXX -> +2541XXXXXXXX
 * - 254XXXXXXXXX -> +254XXXXXXXXX
 * - +254XXXXXXXXX -> +254XXXXXXXXX
 */
export function normalizeKenyanPhone(phone: string | null | undefined): string {
  if (!phone) return '';

  let cleaned = String(phone).replace(/[^0-9+]/g, '').trim();

  // If starts with 07 or 01, replace leading 0 with +254
  if (/^0[71]\d{8}$/.test(cleaned)) {
    return `+254${cleaned.substring(1)}`;
  }

  // If starts with 254
  if (/^254[71]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // If already +254
  if (/^\+254[71]\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  // Fallback for general valid phone format
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('254')) return `+${cleaned}`;
  return cleaned ? `+254${cleaned.replace(/^0+/, '')}` : '';
}

/**
 * Validates whether a phone number is a valid Kenyan mobile line.
 */
export function isValidKenyanPhone(phone: string): boolean {
  const normalized = normalizeKenyanPhone(phone);
  return /^\+254[71]\d{8}$/.test(normalized);
}

/**
 * PII Masking:
 * Masks Kenyan National ID (e.g. "12345678" -> "12****78").
 */
export function maskNationalId(id: string | null | undefined): string {
  if (!id) return '—';
  const str = String(id).trim();
  if (str.length <= 4) return '****';
  const prefix = str.substring(0, 2);
  const suffix = str.substring(str.length - 2);
  const stars = '*'.repeat(Math.max(4, str.length - 4));
  return `${prefix}${stars}${suffix}`;
}

/**
 * PII Masking:
 * Masks Phone number (e.g. "+254712345678" -> "+254 7****5678").
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const normalized = normalizeKenyanPhone(phone);
  if (normalized.length < 9) return '****';
  return `${normalized.substring(0, 7)}****${normalized.substring(normalized.length - 3)}`;
}

/**
 * Hire-Purchase Calculator:
 * Calculates monthly installment and breakdown given vehicle price, deposit, term, and annual interest rate.
 */
export interface HirePurchaseEstimate {
  salePrice: number;
  depositAmount: number;
  depositPercentage: number;
  financedAmount: number;
  durationMonths: number;
  annualInterestRate: number;
  totalInterest: number;
  totalPayable: number;
  monthlyInstallment: number;
}

export function calculateHirePurchase({
  salePrice,
  depositAmount,
  durationMonths = 12,
  annualInterestRate = 15,
}: {
  salePrice: number;
  depositAmount: number;
  durationMonths?: number;
  annualInterestRate?: number;
}): HirePurchaseEstimate {
  const price = Math.max(0, Number(salePrice) || 0);
  const deposit = Math.min(price, Math.max(0, Number(depositAmount) || 0));
  const financed = price - deposit;
  const months = Math.max(1, Number(durationMonths) || 12);
  const rate = Number(annualInterestRate) || 15;

  // Simple Flat hire-purchase interest over term: financed * (rate / 100) * (months / 12)
  const totalInterest = roundCurrency(financed * (rate / 100) * (months / 12));
  const totalFinancedWithInterest = roundCurrency(financed + totalInterest);
  const monthlyInstallment = roundCurrency(totalFinancedWithInterest / months);
  const totalPayable = roundCurrency(deposit + totalFinancedWithInterest);
  const depositPercentage = price > 0 ? Math.round((deposit / price) * 100) : 0;

  return {
    salePrice: price,
    depositAmount: deposit,
    depositPercentage,
    financedAmount: financed,
    durationMonths: months,
    annualInterestRate: rate,
    totalInterest,
    totalPayable,
    monthlyInstallment,
  };
}
