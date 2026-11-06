import { ACTION_PERMISSION_MAP, ROLE_PERMISSIONS } from './config';
import { SecurityPermission, SensitiveAction, UserRole } from './types';

/**
 * Checks if a given role has a specific permission
 */
export function hasPermission(role: UserRole | string | undefined, permission: SecurityPermission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Checks if a role is permitted to perform a sensitive action
 */
export function canPerformAction(role: UserRole | string | undefined, action: SensitiveAction): boolean {
  const requiredPermission = ACTION_PERMISSION_MAP[action];
  if (!requiredPermission) return false;
  return hasPermission(role, requiredPermission);
}

/**
 * Enforces permission check server-side. Throws Error if unauthorized.
 */
export function enforcePermission(
  user: { role?: string; email?: string } | null | undefined,
  permission: SecurityPermission
): void {
  if (!user) {
    throw new Error('UNAUTHORIZED: You must be logged in to perform this operation.');
  }
  if (!hasPermission(user.role, permission)) {
    throw new Error(
      `FORBIDDEN: Insufficient permissions. Action requires '${permission}', but user has role '${user.role || 'GUEST'}'.`
    );
  }
}

/**
 * Enforces sensitive action permission check server-side. Throws Error if unauthorized.
 */
export function enforceActionPermission(
  user: { role?: string; email?: string } | null | undefined,
  action: SensitiveAction
): void {
  const requiredPermission = ACTION_PERMISSION_MAP[action];
  if (!requiredPermission) {
    throw new Error(`CONFIGURATION ERROR: Unmapped sensitive action '${action}'.`);
  }
  enforcePermission(user, requiredPermission);
}
