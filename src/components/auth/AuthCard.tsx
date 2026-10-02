'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Droplet,
} from 'lucide-react';

interface AuthCardProps {
  onSuccess?: () => void;
  allowGuestBypass?: boolean;
  onContinueAsGuest?: () => void;
}

export function AuthCard({
  onSuccess,
  allowGuestBypass = true,
  onContinueAsGuest,
}: AuthCardProps) {
  const router = useRouter();
  const { user, signIn, signUp, signOut } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const res = await signIn(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg('Signed in successfully! Opening dashboard...');
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            } else {
              router.push('/');
            }
          }, 600);
        }
      } else {
        const res = await signUp(email, password, name);
        if (res.error) {
          setErrorMsg(res.error);
        } else if (res.needsEmailConfirmation) {
          setSuccessMsg(
            'Account created! Check your inbox to confirm your email, or sign in now.'
          );
          setMode('signin');
        } else {
          setSuccessMsg('Account created and signed in! Opening dashboard...');
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            } else {
              router.push('/');
            }
          }, 600);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If already logged in, show user profile state
  if (user) {
    return (
      <div className="max-w-md mx-auto pt-6 pb-12 space-y-5">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-rose-100/80 shadow-card text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sakhi-500 to-peach-400 text-white flex items-center justify-center mx-auto text-xl font-bold shadow-elevated">
            {user.user_metadata?.full_name
              ? user.user_metadata.full_name.charAt(0).toUpperCase()
              : user.email?.charAt(0).toUpperCase() || 'U'}
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {user.user_metadata?.full_name || 'Welcome Back!'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Connected to Supabase Cloud</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-left text-xs text-slate-600 space-y-1.5">
            <span className="font-semibold text-rose-800 block">Personal Data Sync</span>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Your menstrual cycle phases, symptoms, and blood pressure telemetry are automatically synchronized to your private cloud storage.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => {
                if (onSuccess) onSuccess();
                else router.push('/');
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-sakhi-500 to-sakhi-600 hover:from-sakhi-600 hover:to-sakhi-700 text-white text-xs font-semibold shadow-md hover:shadow-card transition-all"
            >
              Go to Dashboard
            </button>
            <button
              onClick={async () => {
                await signOut();
                router.refresh();
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-semibold transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pt-4 sm:pt-6 pb-12 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sakhi-500 to-peach-400 flex items-center justify-center text-white mx-auto shadow-card">
          <Droplet className="w-6 h-6 fill-white/80" />
        </div>
        <div className="flex items-center justify-center">
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-sakhi-700 via-sakhi-600 to-lavender-600 bg-clip-text text-transparent">
            OGsakhi
          </span>
        </div>
        <h1 className="text-lg font-bold text-slate-800">
          {mode === 'signin' ? 'Sign in to your account' : 'Create your private account'}
        </h1>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Private, continuous tracking for your cycle, blood pressure rhythms, and daily wellness.
        </p>
      </div>

      {/* Auth Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-rose-100/80 shadow-card space-y-5">
        {/* Mode Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/70 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === 'signin'
                ? 'bg-white text-sakhi-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === 'signup'
                ? 'bg-white text-sakhi-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Your Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Samiksha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sakhi-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sakhi-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sakhi-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sakhi-500 to-sakhi-600 hover:from-sakhi-600 hover:to-sakhi-700 text-white text-xs font-bold shadow-md hover:shadow-card active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Sparkles className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In to OGsakhi' : 'Create My Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {allowGuestBypass && (
          <>
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-3 text-[11px] text-slate-400 uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onContinueAsGuest) {
                  onContinueAsGuest();
                } else {
                  router.push('/');
                }
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-rose-50/60 border border-slate-200/80 hover:border-rose-200 text-slate-600 hover:text-sakhi-700 text-xs font-semibold flex items-center justify-center transition-colors text-center"
            >
              Continue in Guest / Demo Mode
            </button>
          </>
        )}
      </div>

      {/* Privacy Callout */}
      <div className="flex items-center justify-center gap-2 text-center text-slate-400 text-xs">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-[11px]">
          End-to-end user privacy. Your health data is never shared or sold.
        </span>
      </div>
    </div>
  );
}
