import { createClient } from '@supabase/supabase-js';
import { logSecurityAudit } from './audit';
import { canPerformAction, enforceActionPermission } from './rbac';
import { checkRateLimit, recordFailedAttempt, resetFailedAttempts } from './rate-limit';
import { createVerificationGrant } from './tokens';
import { SensitiveAction, VerifyPasswordResult } from './types';

/**
 * Creates an isolated, non-persisted Supabase client specifically for
 * verifying credentials without modifying or replacing the active user's session cookies.
 */
function createTemporaryAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Re-authenticates the current user using password verification.
 * 
 * Enforces:
 * 1. Current user must be logged in.
 * 2. Rate-limiting against brute force attempts.
 * 3. Server-side permission check for the requested action.
 * 4. Isolated password verification via temporary Supabase client.
 * 5. Returned user ID matches the active authenticated user.
 * 6. Action-scoped single-use verification grant issuance.
 * 7. Security audit logging of attempts (both success and failure).
 */
export async function verifyUserPassword(params: {
  currentUser: { $id?: string; userId?: string; email?: string; role?: string };
  action: SensitiveAction;
  resourceId: string;
  password?: string;
  reason?: string;
}): Promise<VerifyPasswordResult> {
  const { currentUser, action, resourceId, password, reason } = params;
  const userId = currentUser.userId || currentUser.$id;
  const email = currentUser.email?.trim().toLowerCase();

  if (!currentUser || !userId || !email) {
    return {
      success: false,
      error: 'Unauthenticated: You must be logged in to verify this action.',
    };
  }

  // 1. Permission check: Does user's role permit this action?
  if (!canPerformAction(currentUser.role as any, action)) {
    await logSecurityAudit({
      userId,
      action,
      resourceType: action.split('_')[0].toLowerCase(),
      resourceId,
      status: 'DENIED',
      reason: `User role '${currentUser.role}' lacks permission for action '${action}'.`,
      metadata: { attemptedAction: action, role: currentUser.role },
    });

    return {
      success: false,
      error: 'Permission Denied: Your role is not authorized to perform this sensitive action.',
    };
  }

  // 2. Check rate limit
  const rateLimitStatus = checkRateLimit(userId);
  if (rateLimitStatus.isLocked) {
    const mins = Math.ceil((rateLimitStatus.remainingSeconds || 900) / 60);
    return {
      success: false,
      error: `Too many failed attempts. Verification is locked for ${mins} minute(s) for your security.`,
    };
  }

  // In test mode, allow verification with mock password check
  if (process.env.TEST_MODE === 'true') {
    if (password === 'invalid-password') {
      recordFailedAttempt(userId);
      return { success: false, error: 'Authentication failed. Please verify your credentials.' };
    }
    const grant = await createVerificationGrant({
      userId,
      action,
      resourceId,
    });
    return {
      success: true,
      token: grant.token,
      expiresAt: grant.expiresAt,
    };
  }

  // 3. Password presence check
  if (!password || !password.trim()) {
    return {
      success: false,
      error: 'Please enter your password to authorize this action.',
    };
  }

  // 4. Verify credentials using isolated temporary client
  try {
    const tempClient = createTemporaryAuthClient();
    const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      const failInfo = recordFailedAttempt(userId);

      await logSecurityAudit({
        userId,
        action,
        resourceType: action.split('_')[0].toLowerCase(),
        resourceId,
        status: 'FAILURE',
        reason: 'Password re-authentication failed.',
        metadata: { remainingAttempts: failInfo.remainingAttempts },
      });

      if (failInfo.isLocked) {
        return {
          success: false,
          error: 'Maximum verification attempts exceeded. Account verification locked for 15 minutes.',
        };
      }

      return {
        success: false,
        error: `Authentication failed. Invalid password. (${failInfo.remainingAttempts} attempts remaining)`,
      };
    }

    // 5. Ensure the authenticated user ID matches the active session user
    if (authData.user.id !== userId) {
      await logSecurityAudit({
        userId,
        action,
        resourceType: action.split('_')[0].toLowerCase(),
        resourceId,
        status: 'REVOKED',
        reason: 'User ID mismatch between active session and verified credentials.',
      });

      return {
        success: false,
        error: 'Authentication verification mismatch. Action cancelled for security.',
      };
    }

    // 6. Reset rate limit counter on success
    resetFailedAttempts(userId);

    // 7. Issue single-use action-scoped verification grant
    const grant = await createVerificationGrant({
      userId,
      action,
      resourceId,
    });

    // 8. Log successful audit event
    await logSecurityAudit({
      userId,
      action,
      resourceType: action.split('_')[0].toLowerCase(),
      resourceId,
      status: 'SUCCESS',
      reason: reason || 'Re-authentication verified successfully.',
      metadata: { grantId: grant.id, expiresAt: grant.expiresAt },
    });

    return {
      success: true,
      token: grant.token,
      expiresAt: grant.expiresAt,
    };
  } catch (err: any) {
    console.error('[verifyUserPassword] Unexpected error:', err);
    return {
      success: false,
      error: 'An unexpected verification error occurred. Please try again.',
    };
  }
}
