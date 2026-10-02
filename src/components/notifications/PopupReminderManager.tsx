'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Droplet,
  Calendar,
  Sparkles,
  Heart,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { PopupReminder } from '@/types';
import Link from 'next/link';

interface PopupReminderManagerProps {
  onOpenLog: () => void;
}

export function PopupReminderManager({ onOpenLog }: PopupReminderManagerProps) {
  const [activeReminders, setActiveReminders] = useState<PopupReminder[]>([]);
  const [currentPopup, setCurrentPopup] = useState<PopupReminder | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch active reminders on mount
  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/reminders');
      const json = await res.json();
      if (json.success && json.data.reminders) {
        setActiveReminders(json.data.reminders);
        // Show first high/medium priority reminder as an interactive pop-up if not dismissed
        if (json.data.reminders.length > 0 && !sessionStorage.getItem('sakhi_popup_shown')) {
          setCurrentPopup(json.data.reminders[0]);
          sessionStorage.setItem('sakhi_popup_shown', 'true');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReminders();

    // Listen for custom trigger event (e.g., from settings test button)
    const handleTriggerCustom = (e: any) => {
      if (e.detail?.reminder) {
        setCurrentPopup(e.detail.reminder);
        setActiveReminders((prev) => [e.detail.reminder, ...prev]);
      }
    };
    window.addEventListener('sakhi_show_reminder', handleTriggerCustom);
    return () => window.removeEventListener('sakhi_show_reminder', handleTriggerCustom);
  }, []);

  const handleDismiss = () => {
    setCurrentPopup(null);
  };

  const handleAction = (popup: PopupReminder) => {
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

  return (
    <>
      {/* Bell icon trigger button */}
      <div className="relative">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="relative w-9 h-9 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 transition-colors"
          title="Pop Reminders & Alerts"
        >
          <Bell className="w-4 h-4" />
          {activeReminders.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sakhi-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
              {activeReminders.length}
            </span>
          )}
        </button>
      </div>

      {/* Floating Pop-up Toast / Alert Modal */}
      {currentPopup && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-sakhi-200/80 shadow-elevated space-y-3">
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
                onClick={handleDismiss}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed pl-11">
              {currentPopup.message}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                Dismiss
              </button>
              {currentPopup.actionUrl?.includes('#log') ? (
                <button
                  onClick={() => handleAction(currentPopup)}
                  className="px-4 py-1.5 rounded-xl bg-sakhi-600 hover:bg-sakhi-700 text-white text-xs font-semibold shadow-xs"
                >
                  {currentPopup.actionText || 'Open Check-in'}
                </button>
              ) : currentPopup.actionUrl ? (
                <Link
                  href={currentPopup.actionUrl}
                  onClick={() => setCurrentPopup(null)}
                  className="px-4 py-1.5 rounded-xl bg-sakhi-600 hover:bg-sakhi-700 text-white text-xs font-semibold shadow-xs"
                >
                  {currentPopup.actionText || 'View'}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Reminders Panel / Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl p-5 flex flex-col space-y-4 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-sakhi-600" />
                <h3 className="font-bold text-base text-slate-800">Your Pop-up Reminders</h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {activeReminders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p>All caught up! No pending reminders right now.</p>
                </div>
              ) : (
                activeReminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-rose-200 transition-all space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getIcon(rem.type)}
                        <span className="font-bold text-xs text-slate-800">{rem.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{rem.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rem.message}</p>
                    {rem.actionUrl && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => {
                            setIsDrawerOpen(false);
                            handleAction(rem);
                          }}
                          className="text-xs font-bold text-sakhi-600 hover:text-sakhi-700 flex items-center gap-1"
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

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>Manage alerts in Settings</span>
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
    </>
  );
}
