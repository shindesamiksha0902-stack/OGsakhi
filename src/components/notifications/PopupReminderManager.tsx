'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  X,
  Droplet,
  Sparkles,
  Heart,
  ChevronRight,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { PopupReminder } from '@/types';
import Link from 'next/link';

interface PopupReminderManagerProps {
  onOpenLog: () => void;
}

const DISMISSED_STORAGE_KEY = 'ogsakhi_dismissed_notifications';

export function PopupReminderManager({ onOpenLog }: PopupReminderManagerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeReminders, setActiveReminders] = useState<PopupReminder[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [currentPopup, setCurrentPopup] = useState<PopupReminder | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load dismissed reminder IDs from localStorage
    try {
      const saved = localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (saved) {
        setDismissedIds(JSON.parse(saved));
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  // Fetch active reminders on mount
  const fetchReminders = async () => {
    try {
      // Get email from localStorage so the server can load cycle data
      let emailQuery = '';
      try {
        const cached = localStorage.getItem('ogsakhi_local_user');
        if (cached) {
          const u = JSON.parse(cached);
          if (u?.email) emailQuery = `?email=${encodeURIComponent(u.email)}`;
        }
      } catch {}

      const res = await fetch(`/api/reminders${emailQuery}`);
      const json = await res.json();
      if (json.success && json.data.reminders) {
        setActiveReminders(json.data.reminders);

        // Filter against dismissed
        let currentDismissed: string[] = [];
        try {
          const saved = localStorage.getItem(DISMISSED_STORAGE_KEY);
          if (saved) currentDismissed = JSON.parse(saved);
        } catch {}

        const unread = json.data.reminders.filter(
          (r: PopupReminder) => !currentDismissed.includes(r.id)
        );

        // Show first high/medium priority reminder as an interactive pop-up if not dismissed
        if (unread.length > 0 && !sessionStorage.getItem('sakhi_popup_shown')) {
          setCurrentPopup(unread[0]);
          sessionStorage.setItem('sakhi_popup_shown', 'true');
        }
      }
    } catch (err) {
      console.error('Failed to load reminders:', err);
    }
  };


  useEffect(() => {
    fetchReminders();

    // Listen for custom trigger event (e.g., from settings test button)
    const handleTriggerCustom = (e: any) => {
      if (e.detail?.reminder) {
        const newRem = e.detail.reminder;
        setCurrentPopup(newRem);
        setActiveReminders((prev) => [newRem, ...prev.filter((r) => r.id !== newRem.id)]);
        // Un-dismiss if tested
        setDismissedIds((prev) => prev.filter((id) => id !== newRem.id));
      }
    };
    window.addEventListener('sakhi_show_reminder', handleTriggerCustom);
    return () => window.removeEventListener('sakhi_show_reminder', handleTriggerCustom);
  }, []);

  const saveDismissed = (newDismissed: string[]) => {
    setDismissedIds(newDismissed);
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(newDismissed));
    } catch {}
  };

  const handleDismissSingle = (id: string) => {
    const updated = Array.from(new Set([...dismissedIds, id]));
    saveDismissed(updated);
    if (currentPopup?.id === id) {
      setCurrentPopup(null);
    }
  };

  const handleClearAll = () => {
    const allIds = activeReminders.map((r) => r.id);
    const updated = Array.from(new Set([...dismissedIds, ...allIds]));
    saveDismissed(updated);
    setCurrentPopup(null);
  };

  const handlePopupDismiss = () => {
    if (currentPopup) {
      handleDismissSingle(currentPopup.id);
    }
    setCurrentPopup(null);
  };

  const handleAction = (popup: PopupReminder) => {
    handleDismissSingle(popup.id);
    setCurrentPopup(null);
    if (popup.actionUrl?.includes('#log')) {
      onOpenLog();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'period':
        return <Droplet className="w-5 h-5 text-sakhi-600 fill-sakhi-100" />;
      case 'hydration':
        return <Droplet className="w-5 h-5 text-sky-500 fill-sky-100" />;
      case 'ovulation':
        return <Sparkles className="w-5 h-5 text-amber-500" />;
      default:
        return <Heart className="w-5 h-5 text-rose-500" />;
    }
  };

  // Only consider reminders that have not been dismissed by the user
  const unreadReminders = activeReminders.filter((r) => !dismissedIds.includes(r.id));
  const unreadCount = unreadReminders.length;

  return (
    <>
      {/* Bell icon trigger button inside Header */}
      <div className="relative">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="relative w-9 h-9 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 transition-colors"
          title="Notifications & Alerts"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sakhi-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Render Modals and Drawers via React Portal into document.body to avoid stacking context traps */}
      {mounted &&
        createPortal(
          <>
            {/* Floating Pop-up Toast / Alert Modal */}
            {currentPopup && !dismissedIds.includes(currentPopup.id) && (
              <div className="fixed top-20 right-4 sm:right-8 z-[100] max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-rose-200 shadow-2xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                        {getIcon(currentPopup.type)}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-sakhi-600 tracking-wider">
                          Pop-up Reminder
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 leading-tight">
                          {currentPopup.title}
                        </h4>
                      </div>
                    </div>

                    <button
                      onClick={handlePopupDismiss}
                      className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pl-11">
                    {currentPopup.message}
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={handlePopupDismiss}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      Dismiss
                    </button>
                    {currentPopup.actionUrl?.includes('#log') ? (
                      <button
                        onClick={() => handleAction(currentPopup)}
                        className="px-4 py-1.5 rounded-xl bg-sakhi-600 hover:bg-sakhi-700 text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        {currentPopup.actionText || 'Open Check-in'}
                      </button>
                    ) : currentPopup.actionUrl ? (
                      <Link
                        href={currentPopup.actionUrl}
                        onClick={() => handleAction(currentPopup)}
                        className="px-4 py-1.5 rounded-xl bg-sakhi-600 hover:bg-sakhi-700 text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        {currentPopup.actionText || 'View'}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Slide-out Notifications & Reminders Drawer */}
            {isDrawerOpen && (
              <div className="fixed inset-0 z-[100] flex justify-end">
                {/* Backdrop */}
                <div
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity animate-in fade-in"
                  onClick={() => setIsDrawerOpen(false)}
                />

                {/* Drawer Body */}
                <div className="relative z-10 w-full max-w-sm sm:max-w-md bg-white h-screen shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                  {/* Drawer Header */}
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-sakhi-600">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-800 leading-tight">
                          Notifications & Alerts
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {unreadCount === 0
                            ? 'All caught up'
                            : `${unreadCount} active reminder${unreadCount === 1 ? '' : 's'}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={handleClearAll}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Clear all notifications"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear All</span>
                        </button>
                      )}
                      <button
                        onClick={() => setIsDrawerOpen(false)}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Drawer Content */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {unreadCount === 0 ? (
                      <div className="py-16 text-center space-y-3">
                        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                          <CheckCircle className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-800">
                            You're all caught up!
                          </h4>
                          <p className="text-xs text-slate-500 max-w-xs mx-auto">
                            No active notifications or pending reminders right now.
                          </p>
                        </div>
                      </div>
                    ) : (
                      unreadReminders.map((rem) => (
                        <div
                          key={rem.id}
                          className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-rose-200 transition-all space-y-2.5 shadow-2xs group relative"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {getIcon(rem.type)}
                              <span className="font-bold text-xs text-slate-800">
                                {rem.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-medium">
                                {rem.timestamp}
                              </span>
                              <button
                                onClick={() => handleDismissSingle(rem.id)}
                                className="w-5 h-5 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                                title="Dismiss notification"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {rem.message}
                          </p>

                          {rem.actionUrl && (
                            <div className="pt-1 flex justify-end">
                              <button
                                onClick={() => {
                                  setIsDrawerOpen(false);
                                  handleAction(rem);
                                }}
                                className="text-xs font-bold text-sakhi-600 hover:text-sakhi-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                              >
                                <span>{rem.actionText || 'Take Action'}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Drawer Footer */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500">
                    <span>Manage alerts & frequencies</span>
                    <Link
                      href="/settings"
                      onClick={() => setIsDrawerOpen(false)}
                      className="font-bold text-sakhi-600 hover:underline"
                    >
                      Settings
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>,
          document.body
        )}
    </>
  );
}
