import { headers } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { SecurityAuditEntry } from './types';

/**
 * Safely extracts client IP and User-Agent from incoming Next.js request headers.
 */
export async function getClientRequestMetadata(): Promise<{ ipAddress: string; userAgent: string }> {
  let ipAddress = 'unknown';
  let userAgent = 'unknown';

  try {
    const h = await headers();
    const forwardedFor = h.get('x-forwarded-for');
    if (forwardedFor) {
      ipAddress = forwardedFor.split(',')[0].trim();
    } else {
      ipAddress = h.get('x-real-ip') || '127.0.0.1';
    }
    userAgent = h.get('user-agent') || 'unknown';
  } catch {
    // Outside active request context (e.g. background job, test, or pre-render)
  }

  return { ipAddress, userAgent };
}

/**
 * Sanitizes metadata to strictly ensure passwords, secrets, or raw authorization tokens
 * are NEVER stored in security audit records.
 */
function sanitizeAuditMetadata(meta?: Record<string, any>): Record<string, any> {
  if (!meta) return {};
  const sanitized: Record<string, any> = {};

  const forbiddenKeys = ['password', 'token', 'secret', 'key', 'auth', 'cookie'];

  for (const [k, v] of Object.entries(meta)) {
    const lowerKey = k.toLowerCase();
    if (forbiddenKeys.some((f) => lowerKey.includes(f))) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      sanitized[k] = sanitizeAuditMetadata(v);
    } else {
      sanitized[k] = v;
    }
  }

  return sanitized;
}

/**
 * In-memory fallback log for tests or offline local simulation
 */
export const memoryAuditLogs: SecurityAuditEntry[] = [];

/**
 * Logs an append-only security audit entry to the database.
 */
export async function logSecurityAudit(entry: SecurityAuditEntry): Promise<void> {
  try {
    const { ipAddress, userAgent } = await getClientRequestMetadata();
    const sanitizedMeta = sanitizeAuditMetadata(entry.metadata);

    const auditRow = {
      user_id: entry.userId || null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId || null,
      status: entry.status,
      reason: entry.reason || null,
      metadata: sanitizedMeta,
      ip_address: entry.ipAddress || ipAddress,
      user_agent: entry.userAgent || userAgent,
    };

    if (process.env.TEST_MODE === 'true') {
      memoryAuditLogs.push({
        ...entry,
        metadata: sanitizedMeta,
        ipAddress: auditRow.ip_address,
        userAgent: auditRow.user_agent,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('security_audit_logs').insert(auditRow);

    if (error) {
      if (error.code === '23503') {
        // user_id FK did not resolve in auth.users, retry safely with null user_id to preserve the audit record
        await supabase.from('security_audit_logs').insert({ ...auditRow, user_id: null });
      } else {
        console.warn('[logSecurityAudit] DB insert error (non-fatal):', error.message);
      }
    }
  } catch (err: any) {
    console.warn('[logSecurityAudit] Unexpected error:', err?.message || err);
  }
}
