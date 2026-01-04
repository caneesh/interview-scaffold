import type { AuthContext, AuthContextProvider } from '@scaffold/core/ports';
import type { TenantId } from '@scaffold/core/entities';

/**
 * Creates a demo auth context provider for development
 */
export function createDemoAuthProvider(
  tenantId: TenantId,
  userId: string
): AuthContextProvider {
  const context: AuthContext = {
    tenantId,
    userId,
    roles: ['user'],
  };

  return {
    async getContext(): Promise<AuthContext> {
      return context;
    },
    async requireContext(): Promise<AuthContext> {
      return context;
    },
  };
}

/**
 * Creates an auth context from request headers
 * This is a placeholder - implement actual auth logic (JWT, session, etc.)
 */
export function createAuthContextFromHeaders(
  headers: { get(name: string): string | null }
): AuthContextProvider {
  const tenantId = headers.get('x-tenant-id') ?? 'default';
  const userId = headers.get('x-user-id') ?? 'anonymous';

  const context: AuthContext = {
    tenantId,
    userId,
    roles: ['user'],
  };

  return {
    async getContext(): Promise<AuthContext> {
      return context;
    },
    async requireContext(): Promise<AuthContext> {
      if (userId === 'anonymous') {
        throw new Error('Authentication required');
      }
      return context;
    },
  };
}

export type { AuthContext, AuthContextProvider };
