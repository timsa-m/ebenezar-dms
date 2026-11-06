"use server";

import { createSupabaseAdminClient } from "./supabase";

export interface ClientMetrics {
  totalBorrowed: number;
  totalOutstanding: number;
  totalExpectedDebt: number;
  totalRepaid: number;
  repaymentRate: number;
  activeLoansCount: number;
  healthStatus: string;
  healthMessage: string;
  healthColor: string;
  healthBg: string;
  healthIconBg: string;
  healthBarBg: string;
  healthBarContainer: string;
  lastPaymentDate: string | null;
  nextDueDate: string | null;
  maxDaysPastDue: number;
}

export async function calculateClientMetrics(clientId: string): Promise<ClientMetrics> {
  const supabase = createSupabaseAdminClient();

  const [loansRes, repaymentsRes, penaltiesRes, installmentsRes] = await Promise.all([
    supabase.from("financing_agreements").select("*").eq("client_id", clientId),
    supabase.from("repayments").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("penalties").select("*").eq("client_id", clientId),
    supabase.from("financing_installments").select("*").eq("client_id", clientId).order("due_date", { ascending: true })
  ]);

  const loans = loansRes.data || [];
  const repayments = repaymentsRes.data || [];
  const penalties = penaltiesRes.data || [];
  const installments = installmentsRes.data || [];

  const activeLoans = loans.filter(l => ["active", "Active", "Overdue", "Substandard", "Loss"].includes(l.status));
  const activeLoansCount = activeLoans.length;

  const totalBorrowed = loans.filter(l => l.status !== 'Denied' && l.status !== 'Pending').reduce((sum, l) => sum + (l.sale_price || 0), 0);
  const totalRepaid = repayments.reduce((sum, r) => sum + (r.amount_paid || 0), 0);
  
  const unpaidInstallments = installments.filter(i => i.status === "Pending" || i.status === "Overdue");
  const totalPenaltiesDebt = penalties.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Outstanding is calculated directly from the balance column
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.balance || 0), 0);
  const totalExpectedDebt = totalOutstanding;

  const totalExpectedToDate = installments.reduce((sum, i) => sum + (i.amount_due || 0), 0) + totalPenaltiesDebt;
  const repaymentRate = totalExpectedToDate > 0 ? Math.min(100, Math.round((totalRepaid / totalExpectedToDate) * 100)) : 100;

  // Next due date
  const pendingOrOverdue = unpaidInstallments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const nextDueDate = pendingOrOverdue.length > 0 ? pendingOrOverdue[0].due_date : null;
  const lastPaymentDate = repayments.length > 0 ? repayments[0].created_at : null;

  // Health Status
  const hasOverdue = installments.some(i => i.status === "Overdue");
  
  let healthStatus = "Good";
  let healthMessage = "Your repayment rate is excellent!";
  let healthColor = "text-emerald-600 dark:text-[#B7FF3C]";
  let healthBg = "bg-emerald-200 dark:bg-emerald-950/40";
  let healthIconBg = "bg-emerald-50 dark:bg-emerald-950/40";
  let healthBarBg = "bg-emerald-500 dark:bg-[#B7FF3C]";
  let healthBarContainer = "bg-emerald-100 dark:bg-[#101612]";

  if (activeLoansCount === 0) {
    healthStatus = "No active loans";
    healthMessage = "You have no active loans.";
    healthColor = "text-gray-600 dark:text-[#A1ADA4]";
    healthBg = "bg-gray-200 dark:bg-[#1D2920]";
    healthIconBg = "bg-gray-50 dark:bg-[#101612]";
    healthBarBg = "bg-gray-500 dark:bg-[#29352D]";
    healthBarContainer = "bg-gray-100 dark:bg-[#101612]";
  } else if (hasOverdue) {
    healthStatus = 'Overdue';
    healthMessage = 'You have an overdue payment that needs immediate attention!';
    healthColor = 'text-red-600 dark:text-rose-400';
    healthBg = 'bg-red-200 dark:bg-rose-950/40';
    healthIconBg = 'bg-red-50 dark:bg-rose-950/40';
    healthBarBg = 'bg-red-500 dark:bg-rose-500';
    healthBarContainer = 'bg-red-100 dark:bg-[#101612]';
  } else {
    if (repaymentRate >= 90) {
      healthStatus = 'Good';
      healthMessage = 'Your repayment rate is excellent!';
    } else if (repaymentRate >= 75) {
      healthStatus = 'On Track';
      healthMessage = 'You are on track with your repayments.';
      healthColor = 'text-blue-600 dark:text-blue-400';
      healthBg = 'bg-blue-200 dark:bg-blue-950/40';
      healthIconBg = 'bg-blue-50 dark:bg-blue-950/40';
      healthBarBg = 'bg-blue-500 dark:bg-blue-400';
      healthBarContainer = 'bg-blue-100 dark:bg-[#101612]';
    } else if (repaymentRate >= 50) {
      healthStatus = 'Average';
      healthMessage = 'Your repayment rate is average.';
      healthColor = 'text-amber-600 dark:text-amber-400';
      healthBg = 'bg-amber-200 dark:bg-amber-950/40';
      healthIconBg = 'bg-amber-50 dark:bg-amber-950/40';
      healthBarBg = 'bg-amber-500 dark:bg-amber-400';
      healthBarContainer = 'bg-amber-100 dark:bg-[#101612]';
    } else if (repaymentRate >= 20) {
      healthStatus = 'Needs Improvement';
      healthMessage = 'Your repayment rate needs improvement.';
      healthColor = 'text-orange-600 dark:text-orange-400';
      healthBg = 'bg-orange-200 dark:bg-orange-950/40';
      healthIconBg = 'bg-orange-50 dark:bg-orange-950/40';
      healthBarBg = 'bg-orange-500 dark:bg-orange-400';
      healthBarContainer = 'bg-orange-100 dark:bg-[#101612]';
    } else {
      healthStatus = 'Bad';
      healthMessage = 'Your repayment rate is poor, please repay your loans in time!';
      healthColor = 'text-red-600 dark:text-rose-400';
      healthBg = 'bg-red-200 dark:bg-rose-950/40';
      healthIconBg = 'bg-red-50 dark:bg-rose-950/40';
      healthBarBg = 'bg-red-500 dark:bg-rose-500';
      healthBarContainer = 'bg-red-100 dark:bg-[#101612]';
    }
  }

  const maxDaysPastDue = activeLoans.reduce((max, l) => Math.max(max, l.days_overdue || 0), 0);

  return {
    totalBorrowed,
    totalOutstanding,
    totalExpectedDebt,
    totalRepaid,
    repaymentRate,
    activeLoansCount,
    healthStatus,
    healthMessage,
    healthColor,
    healthBg,
    healthIconBg,
    healthBarBg,
    healthBarContainer,
    lastPaymentDate,
    nextDueDate,
    maxDaysPastDue
  };
}
