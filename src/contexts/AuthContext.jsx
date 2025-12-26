import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  isConfigured: false,
  signIn: async () => {},
  signUp: async () => {},
  signInWithOAuth: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Authentication not configured' } };
    }
    return await supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUp = useCallback(async (email, password, displayName = null) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Authentication not configured' } };
    }
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: displayName || email.split('@')[0] }
      }
    });
  }, []);

  const signInWithOAuth = useCallback(async (provider) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Authentication not configured' } };
    }
    const redirectTo = `${window.location.origin}`;
    return await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return { error: null };
    }
    return await supabase.auth.signOut();
  }, []);

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    isConfigured: isSupabaseConfigured(),
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
