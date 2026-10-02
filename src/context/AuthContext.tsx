'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isConfigured: false,
  signIn: async () => ({ error: 'Auth not initialized' }),
  signUp: async () => ({ error: 'Auth not initialized' }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    // 1. Restore local user immediately
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('ogsakhi_local_user');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.email) {
            const accounts = JSON.parse(localStorage.getItem('ogsakhi_registered_accounts') || '{}');
            if (accounts[parsed.email.toLowerCase()]?.name) {
              parsed.user_metadata = {
                ...parsed.user_metadata,
                full_name: accounts[parsed.email.toLowerCase()].name,
              };
            }
            setUser(parsed);

            // Two-way server sync
            fetch(`/api/user/sync?email=${encodeURIComponent(parsed.email)}`)
              .then((r) => r.json())
              .then((json) => {
                if (json.success && json.data?.user?.onboardingProfile) {
                  localStorage.setItem('ogsakhi_onboarding_completed', 'true');
                  localStorage.setItem(
                    'ogsakhi_onboarding_profile',
                    JSON.stringify(json.data.user.onboardingProfile)
                  );
                } else if (localStorage.getItem('ogsakhi_onboarding_profile')) {
                  // Push local profile to server
                  const localProfile = JSON.parse(localStorage.getItem('ogsakhi_onboarding_profile') || '{}');
                  fetch('/api/user/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'sync',
                      email: parsed.email,
                      name: parsed.user_metadata?.full_name,
                      onboardingProfile: localProfile,
                    }),
                  }).catch(() => {});
                }
              })
              .catch(() => {});
          }
        } catch (e) {}
      }
    }

    if (!configured || !supabase) {
      setLoading(false);
      return;
    }

    // Check active Supabase sessions if configured
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Try Supabase if configured and reachable
    try {
      if (configured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (!error && data?.user) {
          setUser(data.user);
          fetch(`/api/user/sync?email=${encodeURIComponent(normalizedEmail)}`).catch(() => {});
          return { error: null };
        }
      }
    } catch (err: any) {}

    // 2. Query multi-device ServerStorage backend
    try {
      const syncRes = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: normalizedEmail,
          password,
        }),
      });

      const syncJson = await syncRes.json();
      if (syncJson.success && syncJson.data?.user) {
        const serverUser = syncJson.data.user;
        const localUser: any = {
          id: serverUser.id,
          email: serverUser.email,
          user_metadata: {
            full_name: serverUser.name || serverUser.email.split('@')[0],
          },
        };

        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('ogsakhi_registered_accounts');
          const accounts = stored ? JSON.parse(stored) : {};
          accounts[normalizedEmail] = {
            id: serverUser.id,
            email: serverUser.email,
            name: serverUser.name,
            password: password,
            createdAt: serverUser.createdAt,
          };
          localStorage.setItem('ogsakhi_registered_accounts', JSON.stringify(accounts));
          localStorage.setItem('ogsakhi_local_user', JSON.stringify(localUser));

          if (serverUser.onboardingProfile) {
            localStorage.setItem('ogsakhi_onboarding_completed', 'true');
            localStorage.setItem('ogsakhi_onboarding_profile', JSON.stringify(serverUser.onboardingProfile));
          }
        }

        setUser(localUser);
        return { error: null };
      } else if (syncJson.error && syncJson.error === 'Incorrect password') {
        return { error: 'Incorrect password. Please check your password and try again.' };
      }
    } catch (e) {}

    // 3. Fallback to device localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ogsakhi_registered_accounts');
      const accounts = stored ? JSON.parse(stored) : {};
      const account = accounts[normalizedEmail];

      if (!account) {
        return {
          error: 'No account found with this email. Please click "Create Account" first.',
        };
      }

      if (account.password !== password) {
        return {
          error: 'Incorrect password. Please check your password and try again.',
        };
      }

      const localUser: any = {
        id: account.id,
        email: normalizedEmail,
        user_metadata: {
          full_name: account.name || normalizedEmail.split('@')[0],
        },
      };

      localStorage.setItem('ogsakhi_local_user', JSON.stringify(localUser));
      setUser(localUser);

      // Background push to server
      const savedProfile = localStorage.getItem('ogsakhi_onboarding_profile');
      fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          email: normalizedEmail,
          password: password,
          name: account.name,
          onboardingProfile: savedProfile ? JSON.parse(savedProfile) : undefined,
        }),
      }).catch(() => {});

      return { error: null };
    }

    return { error: 'Authentication failed. Please try again.' };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Try Supabase if configured
    try {
      if (configured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: name || '',
            },
          },
        });
        if (!error && data?.user) {
          setUser(data.user);
          const needsEmailConfirmation = !data.session;
          fetch('/api/user/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'register',
              email: normalizedEmail,
              password,
              name: name || normalizedEmail.split('@')[0],
            }),
          }).catch(() => {});
          return { error: null, needsEmailConfirmation };
        }
      }
    } catch (err: any) {}

    // 2. Register with ServerStorage for multi-device sync
    try {
      const regRes = await fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          email: normalizedEmail,
          password,
          name: name || normalizedEmail.split('@')[0],
        }),
      });

      const regJson = await regRes.json();
      if (!regJson.success && regJson.error?.includes('already exists')) {
        return {
          error: 'An account with this email already exists. Please switch to Sign In.',
        };
      }

      if (regJson.success && regJson.data?.user) {
        const serverUser = regJson.data.user;
        const localUser: any = {
          id: serverUser.id,
          email: serverUser.email,
          user_metadata: {
            full_name: serverUser.name || serverUser.email.split('@')[0],
          },
        };

        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('ogsakhi_registered_accounts');
          const accounts = stored ? JSON.parse(stored) : {};
          accounts[normalizedEmail] = {
            id: serverUser.id,
            email: serverUser.email,
            name: serverUser.name,
            password: password,
            createdAt: serverUser.createdAt,
          };
          localStorage.setItem('ogsakhi_registered_accounts', JSON.stringify(accounts));
          localStorage.setItem('ogsakhi_local_user', JSON.stringify(localUser));
        }

        setUser(localUser);
        return { error: null };
      }
    } catch (e) {}

    // 3. Fallback to localStorage registration
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ogsakhi_registered_accounts');
      const accounts = stored ? JSON.parse(stored) : {};

      if (accounts[normalizedEmail]) {
        return {
          error: 'An account with this email already exists. Please switch to Sign In.',
        };
      }

      const newId = 'usr_' + Math.abs(normalizedEmail.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
      const newAccount = {
        id: newId,
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        password: password,
        createdAt: new Date().toISOString(),
      };

      accounts[normalizedEmail] = newAccount;
      localStorage.setItem('ogsakhi_registered_accounts', JSON.stringify(accounts));

      const localUser: any = {
        id: newId,
        email: normalizedEmail,
        user_metadata: {
          full_name: newAccount.name,
        },
      };

      localStorage.setItem('ogsakhi_local_user', JSON.stringify(localUser));
      setUser(localUser);
      return { error: null };
    }

    return { error: 'Registration failed. Please try again.' };
  };

  const signOut = async () => {
    try {
      if (configured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ogsakhi_local_user');
      localStorage.removeItem('ogsakhi_onboarding_completed');
      localStorage.removeItem('ogsakhi_onboarding_profile');
      sessionStorage.removeItem('ogsakhi_guest');
    }
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: configured,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
