/**
 * Supabase implementation of AuthContext.
 */

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AuthContext, AuthUser, TenantId, UserId } from '@learning/core';

export interface SupabaseAuthConfig {
  defaultTenantId: TenantId;
}

export class SupabaseAuthContext implements AuthContext {
  constructor(
    private readonly client: SupabaseClient,
    private readonly config: SupabaseAuthConfig
  ) {}

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user }, error } = await this.client.auth.getUser();

    if (error || !user) return null;

    return this.mapUser(user);
  }

  async validateSession(): Promise<boolean> {
    const { data: { session }, error } = await this.client.auth.getSession();
    return !error && session !== null;
  }

  getTenantId(): TenantId {
    return this.config.defaultTenantId;
  }

  // Helper to sign in
  async signIn(email: string, password: string): Promise<AuthUser | null> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) return null;
    return this.mapUser(data.user);
  }

  // Helper to sign up
  async signUp(email: string, password: string, displayName?: string): Promise<AuthUser | null> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error || !data.user) return null;
    return this.mapUser(data.user);
  }

  // Helper to sign in with OAuth
  async signInWithOAuth(provider: 'google' | 'github'): Promise<void> {
    await this.client.auth.signInWithOAuth({
      provider,
    });
  }

  // Helper to sign out
  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  // Helper to get access token
  async getAccessToken(): Promise<string | null> {
    const { data: { session } } = await this.client.auth.getSession();
    return session?.access_token ?? null;
  }

  private mapUser(user: User): AuthUser {
    const tenantId = (user.user_metadata?.['tenant_id'] as TenantId) ?? this.config.defaultTenantId;

    return {
      userId: user.id as UserId,
      tenantId,
      email: user.email ?? '',
      displayName: (user.user_metadata?.['display_name'] as string) ?? null,
      avatarUrl: (user.user_metadata?.['avatar_url'] as string) ?? null,
      roles: (user.user_metadata?.['roles'] as string[]) ?? ['user'],
      metadata: user.user_metadata ?? {},
    };
  }
}

/**
 * Creates a test auth context with a fixed user.
 */
export function createTestAuthContext(
  user: AuthUser | null,
  tenantId: TenantId
): AuthContext {
  return {
    getCurrentUser: async () => user,
    validateSession: async () => user !== null,
    getTenantId: () => tenantId,
  };
}
