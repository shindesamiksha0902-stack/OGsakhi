'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Download,
  RotateCcw,
  Sparkles,
  Lock,
  User,
  Bell,
  Trash2,
  Check,
  Heart,
  Droplet,
  Volume2,
} from 'lucide-react';
import { ReminderSettings } from '@/types';

export default function SettingsPage() {
  const [cycleLength, setCycleLength] = useState(29);
  const [periodLength, setPeriodLength] = useState(5);
  const [enableAi, setEnableAi] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Pop-up Reminders state
  const [reminders, setReminders] = useState<ReminderSettings>({
    enablePeriodAlert: true,
    periodAlertDaysBefore: 3,
    enableOvulationAlert: true,
    enableHydrationNudge: true,
    enableDailyCheckin: true,
    dailyCheckinTime: '20:00',
  });
  const [remindersSaved, setRemindersSaved] = useState(false);

  useEffect(() => {
    fetch('/api/reminders')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data.settings) {
          setReminders(json.data.settings);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleUpdateReminder = async (updated: Partial<ReminderSettings>) => {
    const next = { ...reminders, ...updated };
    setReminders(next);
    try {
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: next }),
      });
      setRemindersSaved(true);
      setTimeout(() => setRemindersSaved(false), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerTestReminder = async (type: 'period' | 'hydration' | 'ovulation' | 'checkin') => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_test', type }),
      });
      const json = await res.json();
      if (json.success && json.data.reminder) {
        window.dispatchEvent(
          new CustomEvent('sakhi_show_reminder', { detail: { reminder: json.data.reminder } })
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDemoData = async () => {
    try {
      setResetting(true);
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Clear all data to a clean slate (0 data)? You will start tracking fresh from Day 1.')) return;
    try {
      setClearing(true);
      const res = await fetch('/api/demo/clear', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setClearSuccess(true);
        setTimeout(() => setClearSuccess(false), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClearing(false);
    }
  };

  const handleExportData = async () => {
    try {
      const [cyclesRes, logsRes] = await Promise.all([
        fetch('/api/cycles'),
        fetch('/api/logs'),
      ]);
      const cycles = await cyclesRes.json();
      const logs = await logsRes.json();

      const exportObject = {
        appName: 'OGsakhi Wellness',
        exportDate: new Date().toISOString(),
        cycleHistory: cycles.data?.cycles || [],
        dailyLogs: logs.data || [],
        cycleStats: cycles.data?.stats || {},
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `ogsakhi_wellness_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Title */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
        <h1 className="text-xl font-bold text-slate-800">Settings & Preferences</h1>
        <p className="text-xs text-slate-500">
          Manage your cycle forecasting baselines, smart pop-up reminders, and privacy
        </p>
      </div>

      {/* Pop-up Reminders & Alerts Section */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-sakhi-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-800">Smart Pop-up Reminders</h2>
              <p className="text-[11px] text-slate-400">
                Gentle, contextual alerts for upcoming periods, fertile window, and self-care
              </p>
            </div>
          </div>
          {remindersSaved && (
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>

        <div className="space-y-3 pt-2">
          {/* 1. Period approaching reminder */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Period Approaching Reminder
              </span>
              <span className="text-[11px] text-slate-500">
                Receive a pop-up alert {reminders.periodAlertDaysBefore} days before your estimated period
              </span>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={reminders.periodAlertDaysBefore}
                onChange={(e) =>
                  handleUpdateReminder({ periodAlertDaysBefore: Number(e.target.value) })
                }
                className="text-xs px-2 py-1 rounded-xl bg-white border border-slate-200 text-slate-700"
              >
                <option value={1}>1 day before</option>
                <option value={2}>2 days before</option>
                <option value={3}>3 days before</option>
                <option value={5}>5 days before</option>
              </select>
              <input
                type="checkbox"
                checked={reminders.enablePeriodAlert}
                onChange={(e) => handleUpdateReminder({ enablePeriodAlert: e.target.checked })}
                className="w-4 h-4 accent-sakhi-600 rounded"
              />
            </div>
          </div>

          {/* 2. Ovulation & Fertile window reminder */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Ovulation Window Pop-up
              </span>
              <span className="text-[11px] text-slate-500">
                Notifies you during peak vibrancy and estimated fertile days
              </span>
            </div>
            <input
              type="checkbox"
              checked={reminders.enableOvulationAlert}
              onChange={(e) => handleUpdateReminder({ enableOvulationAlert: e.target.checked })}
              className="w-4 h-4 accent-sakhi-600 rounded"
            />
          </div>

          {/* 3. Hydration reminder */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Afternoon Hydration Nudge
              </span>
              <span className="text-[11px] text-slate-500">
                Gentle pop-up if logged water intake is under 1500 ml to prevent tension headaches
              </span>
            </div>
            <input
              type="checkbox"
              checked={reminders.enableHydrationNudge}
              onChange={(e) => handleUpdateReminder({ enableHydrationNudge: e.target.checked })}
              className="w-4 h-4 accent-sakhi-600 rounded"
            />
          </div>

          {/* 4. Evening Check-in reminder */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Daily Evening Check-in Reminder
              </span>
              <span className="text-[11px] text-slate-500">
                Reminder at {reminders.dailyCheckinTime} to record daily wellness
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={reminders.dailyCheckinTime}
                onChange={(e) => handleUpdateReminder({ dailyCheckinTime: e.target.value })}
                className="text-xs px-2 py-1 rounded-xl bg-white border border-slate-200 text-slate-700"
              />
              <input
                type="checkbox"
                checked={reminders.enableDailyCheckin}
                onChange={(e) => handleUpdateReminder({ enableDailyCheckin: e.target.checked })}
                className="w-4 h-4 accent-sakhi-600 rounded"
              />
            </div>
          </div>
        </div>

        {/* Live Test Reminders */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Test Live Pop-up Reminders
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTriggerTestReminder('period')}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-sakhi-700 text-xs font-medium transition-colors"
            >
              Test Period Pop-up
            </button>
            <button
              onClick={() => handleTriggerTestReminder('hydration')}
              className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-medium transition-colors"
            >
              Test Hydration Pop-up
            </button>
            <button
              onClick={() => handleTriggerTestReminder('ovulation')}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium transition-colors"
            >
              Test Ovulation Pop-up
            </button>
          </div>
        </div>
      </div>

      {/* Cycle Baselines */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Droplet className="w-4 h-4 text-sakhi-600" />
          <h2 className="text-sm font-bold text-slate-800">Cycle Baseline Configuration</h2>
        </div>

        <div className="space-y-4 pt-1">
          <div>
            <div className="flex justify-between text-xs text-slate-700 mb-1.5 font-medium">
              <span>Typical Cycle Length</span>
              <span className="font-bold text-sakhi-600">{cycleLength} days</span>
            </div>
            <input
              type="range"
              min="21"
              max="45"
              value={cycleLength}
              onChange={(e) => setCycleLength(Number(e.target.value))}
              className="w-full accent-sakhi-500"
            />
            <span className="text-[11px] text-slate-400">
              Predictions automatically adapt and learn as you log more completed cycles.
            </span>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-700 mb-1.5 font-medium">
              <span>Typical Period Bleeding Duration</span>
              <span className="font-bold text-sakhi-600">{periodLength} days</span>
            </div>
            <input
              type="range"
              min="2"
              max="10"
              value={periodLength}
              onChange={(e) => setPeriodLength(Number(e.target.value))}
              className="w-full accent-sakhi-500"
            />
          </div>
        </div>
      </div>

      {/* AI & Insights Preferences */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sakhi-600" />
          <h2 className="text-sm font-bold text-slate-800">AI & Personalization</h2>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-slate-50">
          <div>
            <span className="text-xs font-semibold text-slate-800 block">
              Enable Contextual AI Insights
            </span>
            <span className="text-[11px] text-slate-400 block">
              Allows OGsakhi to summarize patterns and correlate phase with energy and symptoms.
            </span>
          </div>
          <input
            type="checkbox"
            checked={enableAi}
            onChange={(e) => setEnableAi(e.target.checked)}
            className="w-4 h-4 accent-sakhi-600 rounded"
          />
        </div>
      </div>

      {/* Privacy & Health Data Ownership */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-800">Privacy & Data Protection</h2>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs text-slate-600 space-y-2 leading-relaxed">
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Strict Health Privacy Policy</span>
          </div>
          <p>
            Your menstrual and health telemetry is private to you. OGsakhi does not sell personal health information, does not show advertisements, and adheres to non-diagnostic safety guidelines.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExportData}
            className="flex-1 py-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            {exportSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Downloaded JSON Export!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export My Data (JSON)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Data Slate Management (0 Data vs Demo Mode) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-rose-100 shadow-card space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Data State & Storage</h2>
          <p className="text-xs text-slate-400">
            Switch between a clean slate (0 data) for real daily tracking or load sample cycles
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleClearData}
            disabled={clearing}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span>{clearSuccess ? '✓ Cleared to 0 Data!' : 'Start Fresh (0 Data / Clean Slate)'}</span>
          </button>

          <button
            onClick={handleResetDemoData}
            disabled={resetting}
            className="w-full sm:w-auto py-2.5 px-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetSuccess ? '✓ Loaded Demo!' : 'Reload Sample Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
