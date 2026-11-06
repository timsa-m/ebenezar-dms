'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { logSecurityAudit } from './audit';
import { SECURITY_CONFIG } from './config';
import { canPerformAction } from './rbac';
import { verifyUserPassword } from './reauth';
import { SensitiveAction, VerifyPasswordResult } from './types';

/**
 * Server Action: Verifies password for a sensitive action and returns a single-use token
 */
export async function verifyActionCredentials(params: {
  action: SensitiveAction;
  resourceId: string;
  password?: string;
  reason?: string;
}): Promise<VerifyPasswordResult> {
  const currentUser = await getLoggedInUser();
  if (!currentUser) {
    return { success: false, error: 'You must be logged in to perform this verification.' };
  }

  return verifyUserPassword({
    currentUser,
    action: params.action,
    resourceId: params.resourceId,
    password: params.password,
    reason: params.reason,
  });
}

/**
 * Generates an HMAC-signed financial session token
 */
function createFinancialSessionToken(userId: string, expiresAt: number): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'ebenezar-secret-salt-2026';
  const payload = `${userId}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}:${hmac}`;
}

/**
 * Validates an HMAC-signed financial session token
 */
function validateFinancialSessionToken(token: string, userId: string): boolean {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return false;
    const [tUserId, tExpiresAtStr, tHmac] = parts;
    const expiresAt = parseInt(tExpiresAtStr, 10);

    if (tUserId !== userId) return false;
    if (isNaN(expiresAt) || expiresAt < Date.now()) return false;

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'ebenezar-secret-salt-2026';
    const expectedPayload = `${tUserId}:${tExpiresAtStr}`;
    const expectedHmac = crypto.createHmac('sha256', secret).update(expectedPayload).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(tHmac), Buffer.from(expectedHmac));
  } catch {
    return false;
  }
}

/**
 * Server Action: Authorizes financial report access by verifying password
 * and setting a short-lived HTTP-only cookie.
 */
export async function authorizeFinancialAccess(password: string): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getLoggedInUser();
  if (!currentUser) {
    return { success: false, error: 'Unauthorized: Please sign in first.' };
  }

  if (!canPerformAction(currentUser.role as any, 'FINANCIAL_REPORTS_VIEW')) {
    await logSecurityAudit({
      userId: currentUser.userId || currentUser.$id,
      action: 'FINANCIAL_REPORTS_VIEW',
      resourceType: 'report',
      resourceId: 'all',
      status: 'DENIED',
      reason: 'Role does not permit viewing financial reports.',
    });
    return { success: false, error: 'Permission Denied: Only Admins and Managers can access financial reports.' };
  }

  const result = await verifyUserPassword({
    currentUser,
    action: 'FINANCIAL_REPORTS_VIEW',
    resourceId: 'reports-scope',
    password,
    reason: 'Financial reports module unlock request',
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Password verification failed.' };
  }

  // Issue scoped session cookie
  try {
    const cookieStore = await cookies();
    const expiresAt = Date.now() + SECURITY_CONFIG.FINANCIAL_SESSION_EXPIRY_SECONDS * 1000;
    const userId = currentUser.userId || currentUser.$id || '';
    const token = createFinancialSessionToken(userId, expiresAt);

    cookieStore.set(SECURITY_CONFIG.FINANCIAL_ACCESS_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SECURITY_CONFIG.FINANCIAL_SESSION_EXPIRY_SECONDS,
      path: '/',
    });

    await logSecurityAudit({
      userId,
      action: 'FINANCIAL_REPORTS_VIEW',
      resourceType: 'financial_session',
      resourceId: 'reports',
      status: 'SUCCESS',
      reason: 'Granted 10-minute scoped financial session authorization.',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to establish financial access session.' };
  }
}

/**
 * Checks if the current request carries a valid financial access session cookie
 */
export async function checkFinancialAccess(): Promise<boolean> {
  const currentUser = await getLoggedInUser();
  if (!currentUser) return false;

  if (process.env.TEST_MODE === 'true') {
    return canPerformAction(currentUser.role as any, 'FINANCIAL_REPORTS_VIEW');
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SECURITY_CONFIG.FINANCIAL_ACCESS_COOKIE);
    if (!cookie?.value) return false;

    const userId = currentUser.userId || currentUser.$id || '';
    return validateFinancialSessionToken(cookie.value, userId);
  } catch {
    return false;
  }
}

/**
 * Revokes active financial access session cookie immediately
 */
export async function revokeFinancialAccess(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SECURITY_CONFIG.FINANCIAL_ACCESS_COOKIE);
  } catch {
    // Ignore cookie deletion errors
  }
}
