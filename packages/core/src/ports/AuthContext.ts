/**
 * AuthContext port - interface for authentication context.
 * PURE TypeScript - no framework dependencies.
 */

import type { TenantId, UserId } from '../entities/types.js';

export interface AuthUser {
  readonly userId: UserId;
  readonly tenantId: TenantId;
  readonly email: string;
  readonly displayName: string | null;
  readonly avatarUrl: string | null;
  readonly roles: readonly string[];
  readonly metadata: Record<string, unknown>;
}

export interface AuthContext {
  /**
   * Returns the current authenticated user, or null if not authenticated.
   */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * Validates the current session.
   */
  validateSession(): Promise<boolean>;

  /**
   * Returns the tenant ID for the current context.
   */
  getTenantId(): TenantId;
}

/**
 * Creates an anonymous auth context for testing.
 */
export function createAnonymousAuthContext(tenantId: TenantId): AuthContext {
  return {
    getCurrentUser: async () => null,
    validateSession: async () => false,
    getTenantId: () => tenantId,
  };
}
