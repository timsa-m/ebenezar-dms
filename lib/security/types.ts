/**
 * Enterprise Security and Sensitive Action Protection Module
 * Types & Domain Definitions
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export type SensitiveAction =
  | 'VEHICLE_DELETE'
  | 'CLIENT_DELETE'
  | 'CONTRACT_DELETE'
  | 'CONTRACT_WRITE_OFF'
  | 'BALANCE_WAIVER'
  | 'PAYMENT_REVERSE'
  | 'PAYMENT_DELETE'
  | 'PENALTY_REVERSE'
  | 'EXPENSE_DELETE'
  | 'FINANCIAL_REPORTS_VIEW'
  | 'FINANCIAL_REPORTS_EXPORT'
  | 'USER_ROLE_CHANGE'
  | 'USER_STATUS_CHANGE'
  | 'SECURITY_POLICY_UPDATE';

export type SecurityPermission =
  | 'financial.reports.view'
  | 'financial.reports.export'
  | 'vehicles.delete'
  | 'clients.delete'
  | 'loans.delete'
  | 'loans.write_off'
  | 'loans.adjust_balance'
  | 'payments.reverse'
  | 'payments.delete'
  | 'expenses.delete'
  | 'users.manage_roles'
  | 'security.manage';

export type AuditLogStatus = 'SUCCESS' | 'FAILURE' | 'DENIED' | 'REVOKED';

export interface SecurityAuditEntry {
  id?: string;
  userId?: string | null;
  action: SensitiveAction | string;
  resourceType: string;
  resourceId?: string | null;
  status: AuditLogStatus;
  reason?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: string;
}

export interface VerificationGrant {
  id: string;
  token: string;
  userId: string;
  action: SensitiveAction;
  resourceId: string;
  expiresAt: string;
  consumedAt?: string | null;
  createdAt: string;
}

export interface SecurityPolicy {
  key: string;
  value: any;
  updatedAt?: string;
  updatedBy?: string;
}

export interface VerifyPasswordResult {
  success: boolean;
  token?: string;
  expiresAt?: string;
  error?: string;
  lockedUntil?: string;
}
