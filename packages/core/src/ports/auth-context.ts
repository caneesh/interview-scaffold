import type { TenantId } from '../entities/tenant.js';

/**
 * AuthContext - port for authentication context
 */
export interface AuthContext {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly roles: readonly string[];
}

export interface AuthContextProvider {
  getContext(): Promise<AuthContext>;
  requireContext(): Promise<AuthContext>;
}
