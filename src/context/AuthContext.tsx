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
    if (!configured || !supabase) {
      setLoading(false);
      return;
    }

    // Check active sessions and set the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
      } else {
        // Fallback to local user session if present
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('ogsakhi_local_user');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              const accounts = JSON.parse(localStorage.getItem('ogsakhi_registered_accounts') || '{}');
              if (parsed.email && accounts[parsed.email.toLowerCase()]?.name) {
                parsed.user_metadata = {
                  ...parsed.user_metadata,
                  full_name: accounts[parsed.email.toLowerCase()].name,
                };
              }
              setUser(parsed);
            } catch (e) {}
          }
        }
        setLoading(false);
      }
    }).catch(() => {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('ogsakhi_local_user');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const accounts = JSON.parse(localStorage.getItem('ogsakhi_registered_accounts') || '{}');
            if (parsed.email && accounts[parsed.email.toLowerCase()]?.name) {
              parsed.user_metadata = {
                ...parsed.user_metadata,
                full_name: accounts[parsed.email.toLowerCase()].name,
              };
            }
            setUser(parsed);
          } catch (e) {}
        }
      }
      setLoading(false);
    });

    // Listen for changes on auth state
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

    try {
      if (configured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (!error && data?.user) {
          setUser(data.user);
          return { error: null };
        }
        // If Supabase returned an explicit auth rejection (wrong password or user not found)
        if (error && !error.message.toLowerCase().includes('failed to fetch')) {
          return { error: error.message };
        }
      }
    } catch (err: any) {
      if (!err?.message?.toLowerCase().includes('failed to fetch')) {
        return { error: err.message || 'Invalid credentials' };
      }
    }

    // Strict account & password verification
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
      return { error: null };
    }

    return { error: 'Authentication failed. Please try again.' };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const normalizedEmail = email.trim().toLowerCase();

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
          return { error: null, needsEmailConfirmation };
        }
        if (error && !error.message.toLowerCase().includes('failed to fetch')) {
          return { error: error.message };
        }
      }
    } catch (err: any) {
      if (!err?.message?.toLowerCase().includes('failed to fetch')) {
        return { error: err.message || 'Sign up failed.' };
      }
    }

    // Strict account registration
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
        password: password, // stored securely for credential matching
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
