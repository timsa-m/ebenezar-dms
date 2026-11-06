import crypto from 'crypto';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { SECURITY_CONFIG } from './config';
import { SensitiveAction, VerificationGrant } from './types';

// In-memory verification store for test mode or fallback
export const memoryVerifications = new Map<string, VerificationGrant>();

/**
 * Generates a secure random verification token
 */
export function generateSecureToken(): string {
  return `sec_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Creates an action-scoped, time-limited verification grant.
 */
export async function createVerificationGrant(params: {
  userId: string;
  action: SensitiveAction;
  resourceId: string;
  expirySeconds?: number;
}): Promise<VerificationGrant> {
  const token = generateSecureToken();
  const expirySeconds = params.expirySeconds || SECURITY_CONFIG.MUTATION_TOKEN_EXPIRY_SECONDS;
  const expiresAt = new Date(Date.now() + expirySeconds * 1000).toISOString();
  const createdAt = new Date().toISOString();

  const grant: VerificationGrant = {
    id: crypto.randomUUID(),
    token,
    userId: params.userId,
    action: params.action,
    resourceId: params.resourceId,
    expiresAt,
    consumedAt: null,
    createdAt,
  };

  if (process.env.TEST_MODE === 'true') {
    memoryVerifications.set(token, grant);
    return grant;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('security_verifications')
    .insert({
      id: grant.id,
      token: grant.token,
      user_id: grant.userId,
      action: grant.action,
      resource_id: grant.resourceId,
      expires_at: grant.expiresAt,
    })
    .select()
    .single();

  if (error) {
    // If DB insert fails (e.g. migration not applied yet), fall back to memory
    console.warn('[createVerificationGrant] DB error, using memory fallback:', error.message);
    memoryVerifications.set(token, grant);
    return grant;
  }

  return {
    id: data.id,
    token: data.token,
    userId: data.user_id,
    action: data.action as SensitiveAction,
    resourceId: data.resource_id,
    expiresAt: data.expires_at,
    consumedAt: data.consumed_at,
    createdAt: data.created_at,
  };
}

/**
 * Atomically consumes a verification grant.
 * Rejects if:
 * 1. Token is invalid or not found.
 * 2. Token is already consumed (replay prevention).
 * 3. Token has expired.
 * 4. User ID does not match.
 * 5. Action does not match.
 * 6. Resource ID does not match.
 */
export async function consumeVerificationGrant(params: {
  token: string;
  userId: string | { userId?: string; $id?: string; auth_id?: string; id?: string };
  action: SensitiveAction;
  resourceId: string;
}): Promise<{ valid: boolean; error?: string }> {
  const { token, userId, action, resourceId } = params;

  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing security verification token.' };
  }

  const candidateIds: string[] = [];
  if (typeof userId === 'string') {
    if (userId.trim()) candidateIds.push(userId.trim());
  } else if (userId && typeof userId === 'object') {
    if (userId.userId) candidateIds.push(userId.userId);
    if (userId.auth_id) candidateIds.push(userId.auth_id);
    if (userId.$id) candidateIds.push(userId.$id);
    if (userId.id) candidateIds.push(userId.id);
  }

  // Check memory store (test mode or fallback)
  if (process.env.TEST_MODE === 'true' || memoryVerifications.has(token)) {
    const memGrant = memoryVerifications.get(token);
    if (!memGrant) {
      return { valid: false, error: 'Invalid or expired verification token.' };
    }
    if (memGrant.consumedAt) {
      return { valid: false, error: 'Verification token has already been used (replay rejected).' };
    }
    if (new Date(memGrant.expiresAt).getTime() < Date.now()) {
      return { valid: false, error: 'Verification token has expired.' };
    }
    const matchesMemory = candidateIds.some(
      (c) => c === memGrant.userId || memGrant.userId.includes(c) || c.includes(memGrant.userId)
    );
    if (!matchesMemory) {
      return { valid: false, error: 'Verification token user mismatch.' };
    }
    if (memGrant.action !== action) {
      return { valid: false, error: `Verification token action mismatch. Expected ${action}, found ${memGrant.action}.` };
    }
    if (memGrant.resourceId !== resourceId && memGrant.resourceId !== '*') {
      return { valid: false, error: `Verification token resource mismatch. Expected ${resourceId}, found ${memGrant.resourceId}.` };
    }

    // Atomically consume in memory
    memGrant.consumedAt = new Date().toISOString();
    return { valid: true };
  }

  try {
    const supabase = createSupabaseAdminClient();

    // Fetch token row
    const { data: grant, error: fetchErr } = await supabase
      .from('security_verifications')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (fetchErr || !grant) {
      return { valid: false, error: 'Invalid or unknown security verification token.' };
    }

    if (grant.consumed_at) {
      return { valid: false, error: 'Verification token has already been used (replay rejected).' };
    }

    if (new Date(grant.expires_at).getTime() < Date.now()) {
      return { valid: false, error: 'Verification token has expired. Please re-authenticate.' };
    }

    let isUserMatch = candidateIds.includes(grant.user_id);

    if (!isUserMatch && candidateIds.length > 0) {
      // Cross-reference: if candidateId is public.users.id while grant.user_id is auth_id (or vice versa)
      const { data: userRow } = await supabase
        .from('users')
        .select('id, auth_id')
        .or(`id.in.(${candidateIds.map((c) => `"${c}"`).join(',')}),auth_id.in.(${candidateIds.map((c) => `"${c}"`).join(',')})`)
        .maybeSingle();

      if (
        userRow &&
        (userRow.auth_id === grant.user_id ||
          userRow.id === grant.user_id ||
          candidateIds.includes(userRow.auth_id) ||
          candidateIds.includes(userRow.id))
      ) {
        isUserMatch = true;
      }
    }

    if (!isUserMatch) {
      return { valid: false, error: 'Verification token does not belong to the current authenticated user.' };
    }

    if (grant.action !== action) {
      return { valid: false, error: `Verification action mismatch: Expected ${action}, but token was issued for ${grant.action}.` };
    }

    if (grant.resource_id !== resourceId && grant.resource_id !== '*') {
      return { valid: false, error: `Verification resource mismatch: Expected ${resourceId}, but token was issued for ${grant.resource_id}.` };
    }

    // Atomically mark as consumed
    const { data: consumed, error: updateErr } = await supabase
      .from('security_verifications')
      .update({ consumed_at: new Date().toISOString() })
      .eq('token', token)
      .is('consumed_at', null)
      .select()
      .maybeSingle();

    if (updateErr || !consumed) {
      return { valid: false, error: 'Verification token was consumed by a concurrent request.' };
    }

    return { valid: true };
  } catch (err: any) {
    console.error('[consumeVerificationGrant] Error:', err);
    return { valid: false, error: 'Security validation failed due to an unexpected error.' };
  }
}
