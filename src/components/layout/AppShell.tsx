'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  PlusCircle,
  BarChart2,
  Sparkles,
  Settings,
  ShieldCheck,
  Heart,
  Droplet,
  HeartPulse,
  User,
} from 'lucide-react';
import { DailyLogDrawer } from '../logging/DailyLogDrawer';
import { PopupReminderManager } from '../notifications/PopupReminderManager';
import { InstallPwaButton } from '../navigation/InstallPwaButton';
import { MEDICAL_SAFETY_DISCLAIMER } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('ogsakhi_guest') === 'true') {
      setIsGuest(true);
    }
  }, []);

  const navItems = [
    { label: 'Today', href: '/', icon: Home },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'BP Tracker', href: '/bp', icon: HeartPulse },
    { label: 'Insights', href: '/insights', icon: BarChart2 },
    { label: 'OGsakhi AI', href: '/assistant', icon: Sparkles },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleOpenLog = (dateStr?: string) => {
    if (dateStr) {
      setSelectedLogDate(dateStr);
    } else {
      setSelectedLogDate(new Date().toISOString().split('T')[0]);
    }
    setIsLogOpen(true);
  };

  const isAuthPage = pathname === '/auth' || pathname === '/login';
  const isUnauthenticatedHome = pathname === '/' && !user && !isGuest;
  const hideNavigation = isAuthPage || isUnauthenticatedHome;

  if (hideNavigation) {
    return (
      <div className="min-h-screen flex flex-col justify-center bg-[#faf8f5] text-slate-800 antialiased p-4">
        {children}
      </div>
    );
  }

  const displayName = (() => {
    if (!user) return '';
    if (typeof window !== 'undefined' && user.email) {
      try {
        const stored = localStorage.getItem('ogsakhi_registered_accounts');
        if (stored) {
          const accounts = JSON.parse(stored);
          const acc = accounts[user.email.toLowerCase()];
          if (acc?.name && acc.name.trim()) {
            return acc.name;
          }
        }
      } catch (e) {}
    }
    const metaName = user.user_metadata?.full_name || (user as any)?.name;
    if (metaName && metaName.trim() && !metaName.includes('@')) {
      return metaName;
    }
    return user.email?.split('@')[0] || 'User';
  })();

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5] text-slate-800 antialiased selection:bg-sakhi-100 selection:text-sakhi-700">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/70 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sakhi-500 to-peach-400 flex items-center justify-center text-white shadow-card group-hover:scale-105 transition-transform duration-200">
              <Droplet className="w-5 h-5 fill-white/80" />
            </div>
            <div className="flex items-center">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-sakhi-700 via-sakhi-600 to-lavender-600 bg-clip-text text-transparent">
                OGsakhi
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 text-xs font-semibold shadow-2xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-white text-sakhi-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <InstallPwaButton />
            <PopupReminderManager onOpenLog={() => handleOpenLog()} />
            <Link
              href="/settings"
              className={`w-9 h-9 rounded-2xl border flex items-center justify-center transition-all ${
                pathname === '/settings'
                  ? 'bg-rose-50 border-rose-200 text-sakhi-600 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-600 hover:text-slate-900'
              }`}
              title="Settings & Alerts"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={() => handleOpenLog()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-sakhi-500 to-sakhi-600 text-white shadow-xs hover:shadow-card hover:from-sakhi-600 hover:to-sakhi-700 transition-all duration-200 active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Today</span>
              <span className="sm:hidden">Log</span>
            </button>
            {user ? (
              <Link
                href="/auth"
                className="flex items-center gap-2 p-0.5 sm:px-2 sm:py-1 rounded-full bg-white hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 transition-all shadow-2xs group"
                title={`Signed in as ${displayName} (${user.email})`}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sakhi-500 to-peach-400 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden xl:inline text-xs font-semibold text-slate-700 max-w-[85px] truncate">
                  {displayName}
                </span>
              </Link>
            ) : (
              <Link
                href="/auth"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-white hover:bg-rose-50 text-slate-700 hover:text-sakhi-700 border border-slate-200 transition-colors shadow-2xs"
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-12">
        {children}
      </main>

      {/* Safety Disclaimer Footer for Desktop & Mobile */}
      <footer className="border-t border-slate-200/60 bg-white/50 backdrop-blur-xs py-4 px-4 text-center text-xs text-slate-400 mb-16 md:mb-0">
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            {MEDICAL_SAFETY_DISCLAIMER}
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-100 shadow-lg px-2 py-2">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-medium transition-colors ${
              pathname === '/' ? 'text-sakhi-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className={`w-5 h-5 ${pathname === '/' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span>Today</span>
          </Link>

          <Link
            href="/calendar"
            className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-medium transition-colors ${
              pathname === '/calendar' ? 'text-sakhi-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Calendar className={`w-5 h-5 ${pathname === '/calendar' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span>Calendar</span>
          </Link>

          {/* Prominent Center Check-in Button */}
          <button
            onClick={() => handleOpenLog()}
            className="flex flex-col items-center -mt-6 group focus:outline-none"
            title="Quick Log"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sakhi-500 to-sakhi-600 flex items-center justify-center text-white shadow-elevated group-hover:scale-105 active:scale-95 transition-transform duration-200">
              <PlusCircle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-semibold text-sakhi-600 mt-1">Log</span>
          </button>

          <Link
            href="/bp"
            className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-medium transition-colors ${
              pathname === '/bp' ? 'text-sakhi-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <HeartPulse className={`w-5 h-5 ${pathname === '/bp' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span>BP</span>
          </Link>

          <Link
            href="/assistant"
            className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-medium transition-colors ${
              pathname === '/assistant' ? 'text-sakhi-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sparkles className={`w-5 h-5 ${pathname === '/assistant' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span>AI</span>
          </Link>
        </div>
      </nav>

      {/* Comprehensive Daily Log Drawer / Modal */}
      <DailyLogDrawer
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        date={selectedLogDate}
      />
    </div>
  );
}
