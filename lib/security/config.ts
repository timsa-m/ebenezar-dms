import { SecurityPermission, SensitiveAction, UserRole } from './types';

/**
 * Default Security Policies & Role Permissions
 */

export const SECURITY_CONFIG = {
  // Validity windows (seconds)
  MUTATION_TOKEN_EXPIRY_SECONDS: 5 * 60,       // 5 minutes for single-use destructive action
  FINANCIAL_SESSION_EXPIRY_SECONDS: 10 * 60,    // 10 minutes for financial report access window
  
  // Rate limiting thresholds
  MAX_FAILED_VERIFICATIONS: 5,                  // max failed password attempts
  LOCKOUT_DURATION_SECONDS: 15 * 60,            // 15-minute lock on exceeding threshold
  
  // Cookie names
  FINANCIAL_ACCESS_COOKIE: 'ebenezar_fin_access_v1',
};

/**
 * Mapping of system roles to granular security permissions
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly SecurityPermission[]> = {
  ADMIN: [
    'financial.reports.view',
    'financial.reports.export',
    'vehicles.delete',
    'clients.delete',
    'loans.delete',
    'loans.write_off',
    'loans.adjust_balance',
    'payments.reverse',
    'payments.delete',
    'expenses.delete',
    'users.manage_roles',
    'security.manage',
  ],
  MANAGER: [
    'financial.reports.view',
    'financial.reports.export',
    'vehicles.delete',
    'loans.adjust_balance',
    'payments.reverse',
  ],
  STAFF: [],
};

/**
 * Mapping sensitive actions to their required security permission
 */
export const ACTION_PERMISSION_MAP: Record<SensitiveAction, SecurityPermission> = {
  VEHICLE_DELETE: 'vehicles.delete',
  CLIENT_DELETE: 'clients.delete',
  CONTRACT_DELETE: 'loans.delete',
  CONTRACT_WRITE_OFF: 'loans.write_off',
  BALANCE_WAIVER: 'loans.adjust_balance',
  PAYMENT_REVERSE: 'payments.reverse',
  PAYMENT_DELETE: 'payments.delete',
  PENALTY_REVERSE: 'payments.reverse',
  EXPENSE_DELETE: 'expenses.delete',
  FINANCIAL_REPORTS_VIEW: 'financial.reports.view',
  FINANCIAL_REPORTS_EXPORT: 'financial.reports.export',
  USER_ROLE_CHANGE: 'users.manage_roles',
  USER_STATUS_CHANGE: 'users.manage_roles',
  SECURITY_POLICY_UPDATE: 'security.manage',
};
