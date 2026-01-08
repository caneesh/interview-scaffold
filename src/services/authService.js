import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Sign up with email and password
 */
export async function signUp(email, password, displayName = null) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Authentication not configured' } };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: displayName || email.split('@')[0]
      }
    }
  });

  return { data, error };
}

/**
 * Sign in with email and password
 */
export async function signIn(email, password) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Authentication not configured' } };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  return { data, error };
}

/**
 * Sign in with OAuth provider (Google, GitHub)
 */
export async function signInWithOAuth(provider) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Authentication not configured' } };
  }

  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : undefined;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo
    }
  });

  return { data, error };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Authentication not configured' } };
  }

  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/reset`
    : undefined;

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  return { data, error };
}

/**
 * Update user password (when user is logged in)
 */
export async function updatePassword(newPassword) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Authentication not configured' } };
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  return { data, error };
}

/**
 * Get current session
 */
export async function getSession() {
  if (!isSupabaseConfigured()) {
    return { data: { session: null }, error: null };
  }

  return await supabase.auth.getSession();
}

/**
 * Get current user
 */
export async function getUser() {
  if (!isSupabaseConfigured()) {
    return { data: { user: null }, error: null };
  }

  return await supabase.auth.getUser();
}
