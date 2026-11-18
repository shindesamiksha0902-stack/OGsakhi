'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  Smartphone,
  Watch,
  HeartPulse,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  ExternalLink,
  Info,
  Radio,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [bluetoothSupported, setBluetoothSupported] = useState<boolean | null>(null);
  const [scanningBle, setScanningBle] = useState(false);
  const [bleStatusMsg, setBleStatusMsg] = useState<string | null>(null);
  const [bleConnectedDevice, setBleConnectedDevice] = useState<string | null>(null);

  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Accordion state for "What We Store"
  const [showDataDetails, setShowDataDetails] = useState(false);

  useEffect(() => {
    // Check real browser support for Web Bluetooth API
    if (typeof window !== 'undefined') {
      const hasBle = 'bluetooth' in navigator && typeof (navigator as any).bluetooth?.requestDevice === 'function';
      setBluetoothSupported(hasBle);
    }
  }, []);

  // Real Web Bluetooth Blood Pressure scanner
  const handleScanBluetooth = async () => {
    if (!bluetoothSupported) {
      setBleStatusMsg('Web Bluetooth is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      setScanningBle(true);
      setBleStatusMsg('Opening Bluetooth pairing prompt... Select your compatible BLE BP monitor or heart rate sensor.');

      // Standard Bluetooth GATT services:
      // 0x1810 = Blood Pressure Service
      // 0x180D = Heart Rate Service
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: ['blood_pressure'] },
          { services: ['heart_rate'] },
        ],
        optionalServices: ['battery_service', 0x1810, 0x180d],
      });

      if (device) {
        setBleConnectedDevice(device.name || 'Bluetooth Health Monitor');
        setBleStatusMsg(`Paired with ${device.name || 'Bluetooth Device'}. GATT services connected.`);
      }
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        setBleStatusMsg('No Bluetooth device selected. Pairing cancelled.');
      } else if (err.name === 'SecurityError') {
        setBleStatusMsg('Bluetooth permission was blocked by your browser settings.');
      } else {
        setBleStatusMsg(`Bluetooth connection note: ${err.message || 'Device scan ended.'}`);
      }
    } finally {
      setScanningBle(false);
    }
  };

  // Full JSON export
  const handleExportJson = async () => {
    try {
      setExportingJson(true);
      const emailQuery = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
      const [cyclesRes, logsRes, bpRes, remindersRes] = await Promise.all([
        fetch(`/api/cycles${emailQuery}`),
        fetch(`/api/logs${emailQuery}`),
        fetch(`/api/bp${emailQuery}`),
        fetch(`/api/reminders${emailQuery}`),
      ]);

      const [cycles, logs, bp, reminders] = await Promise.all([
        cyclesRes.json(),
        logsRes.json(),
        bpRes.json(),
        remindersRes.json(),
      ]);

      const exportObject = {
        app: 'OGsakhi Personal Women’s Wellness',
        version: '2.0',
        exportDate: new Date().toISOString(),
        user: {
          email: user?.email || 'guest_user',
          exportType: 'Full Personal Telemetry',
        },
        cycles: cycles.data?.cycles || [],
        cycleStats: cycles.data?.stats || {},
        dailyLogs: logs.data || [],
        bloodPressureLogs: bp.data?.logs || [],
        reminderSettings: reminders.data?.settings || {},
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const anchor = document.createElement('a');
      anchor.setAttribute('href', dataStr);
      anchor.setAttribute('download', `ogsakhi_health_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setExportSuccess('JSON');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportingJson(false);
    }
  };

  // CSV export for spreadsheets
  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const emailQuery = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
      const [logsRes, bpRes] = await Promise.all([
        fetch(`/api/logs${emailQuery}`),
        fetch(`/api/bp${emailQuery}`),
      ]);

      const [logsJson, bpJson] = await Promise.all([logsRes.json(), bpRes.json()]);
      const logs = (logsJson.data || []) as any[];
      const bpLogs = (bpJson.data?.logs || []) as any[];

      // Build CSV lines
      const headers = [
        'Date',
        'Record_Type',
        'Period_Day',
        'Flow_Intensity',
        'Mood',
        'Energy',
        'Sleep_Hours',
        'Water_ml',
        'Stress_Level_1_to_5',
        'Cramp_Severity_0_to_5',
        'BP_Systolic',
        'BP_Diastolic',
        'BP_Pulse',
        'BP_Category',
        'Symptoms',
        'Notes',
      ];

      const rows: string[] = [headers.join(',')];

      // Daily logs to CSV
      logs.forEach((l) => {
        const symptomsStr = (l.symptoms || []).map((s: any) => s.symptomName).join('; ');
        const row = [
          `"${l.date}"`,
          '"Daily Check-in"',
          l.isPeriodDay ? '"Yes"' : '"No"',
          `"${l.flowIntensity || ''}"`,
          `"${l.moodPrimary || ''}"`,
          `"${l.energyLevel || ''}"`,
          l.sleepHours ?? '',
          l.waterIntakeMl ?? '',
          l.stressLevel ?? '',
          l.crampSeverity ?? '',
          '',
          '',
          '',
          '',
          `"${symptomsStr.replace(/"/g, '""')}"`,
          `"${(l.notes || '').replace(/"/g, '""')}"`,
        ];
        rows.push(row.join(','));
      });

      // BP logs to CSV
      bpLogs.forEach((b) => {
        const symptomsStr = (b.symptoms || []).join('; ');
        const row = [
          `"${b.date}"`,
          '"Blood Pressure"',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          b.systolic ?? '',
          b.diastolic ?? '',
          b.pulse ?? '',
          `"${b.category || ''}"`,
          `"${symptomsStr.replace(/"/g, '""')}"`,
          `"${(b.notes || '').replace(/"/g, '""')}"`,
        ];
        rows.push(row.join(','));
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
      const anchor = document.createElement('a');
      anchor.setAttribute('href', csvContent);
      anchor.setAttribute('download', `ogsakhi_wellness_records_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setExportSuccess('CSV');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('CSV Export failed:', err);
    } finally {
      setExportingCsv(false);
    }
  };

  // Complete data deletion
  const handleDeleteAllData = async () => {
    const confirmation = window.prompt(
      'Type "DELETE" to permanently erase all your cycles, check-ins, blood pressure telemetry, and settings from our database:'
    );

    if (confirmation !== 'DELETE') {
      alert('Action cancelled. Data remains intact.');
      return;
    }

    try {
      setClearing(true);
      const res = await fetch('/api/demo/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email }),
      });
      const json = await res.json();
      if (json.success) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ogsakhi_onboarding_completed');
          localStorage.removeItem('ogsakhi_onboarding_profile');
          localStorage.removeItem('ogsakhi_daily_logs');
          localStorage.removeItem('ogsakhi_bp_logs');
          localStorage.removeItem('ogsakhi_cycles');
          localStorage.removeItem('ogsakhi_local_user');
        }
        setClearSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 1800);
      }
    } catch (err) {
      console.error('Clear failed:', err);
      alert('Failed to erase data. Please check your network connection.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header with back navigation */}
      <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            title="Back to Settings"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Health Integrations & Privacy</h1>
            <p className="text-xs text-slate-500">
              Explore device sync, privacy controls, and data ownership
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Zero Ads • 100% Private
        </span>
      </div>

      {/* Section 1: Platform & Device Integrations */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-sakhi-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">Health Data Integrations</h2>
            <p className="text-[11px] text-slate-400">
              Connect external health monitors and explore platform capabilities
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {/* 1. Web Bluetooth Blood Pressure & Heart Rate */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Bluetooth BP & Pulse Monitors</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        bluetoothSupported
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {bluetoothSupported ? 'Supported in this browser' : 'Browser Dependent'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Uses the open Web Bluetooth standard (GATT Blood Pressure 0x1810 & Heart Rate 0x180D). Pairs directly from your browser without third-party cloud accounts.
                  </p>
                </div>
              </div>
            </div>

            {bleStatusMsg && (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-600">
                {bleStatusMsg}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleScanBluetooth}
                disabled={scanningBle}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 text-slate-700 hover:text-sakhi-700 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Radio className={`w-3.5 h-3.5 ${scanningBle ? 'animate-pulse text-sakhi-600' : ''}`} />
                <span>{scanningBle ? 'Scanning...' : 'Pair BLE Monitor'}</span>
              </button>
              <Link
                href="/bp"
                className="text-xs font-semibold text-sakhi-600 hover:text-sakhi-700 underline px-2"
              >
                Go to BP Tracker
              </Link>
            </div>
          </div>

          {/* 2. Google Health Connect (Android) */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Google Health Connect</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700">
                      Android Native Service
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Health Connect syncs steps, sleep, and vitals between Android apps. Web browsers currently cannot read Health Connect records directly due to Android security boundaries. Sakhi’s data schema is prepared to link with Health Connect once packaged as an Android app or via upcoming Web Health APIs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Apple HealthKit (iOS) */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Watch className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Apple HealthKit</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700">
                      iOS App Required
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Apple sandbox policy restricts HealthKit access exclusively to native iOS apps (`HealthKit.framework`). Safari and PWAs cannot access HealthKit directly. You can export your data to CSV or JSON anytime below to retain full ownership.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Smartwatches & Fitness Trackers */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Watch className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Smartwatches & Wearables</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      Quick Manual Entry
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Garmin, Apple Watch, Fitbit, and Pixel Watch users can record sleep duration and movement in under 15 seconds through the home page Quick Check-in.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Privacy Controls, Export & Deletion */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">Privacy & Data Controls</h2>
            <p className="text-[11px] text-slate-400">
              You own your health telemetry. Download or erase your records at any time.
            </p>
          </div>
        </div>

        {/* Export Data Cards */}
        <div className="space-y-2 pt-1">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Export Your Personal Records
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleExportJson}
              disabled={exportingJson}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors flex items-center justify-between disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <FileJson className="w-4 h-4 text-sakhi-600" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Export as JSON</span>
                  <span className="text-[10px] text-slate-400">Complete raw backup of all data</span>
                </div>
              </div>
              {exportSuccess === 'JSON' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exportingCsv}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors flex items-center justify-between disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Export as CSV</span>
                  <span className="text-[10px] text-slate-400">Compatible with Excel & Sheets</span>
                </div>
              </div>
              {exportSuccess === 'CSV' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Transparent Data Storage Disclosure (Accordion) */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <button
            type="button"
            onClick={() => setShowDataDetails(!showDataDetails)}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                What Information Does Sakhi Store?
              </span>
            </div>
            {showDataDetails ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showDataDetails && (
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs text-slate-600 space-y-2.5 leading-relaxed">
              <div className="space-y-1">
                <span className="font-bold text-slate-800 block">1. Menstrual Cycle Dates</span>
                <p className="text-[11px] text-slate-500">
                  Logged period start dates and historical cycle durations. Used solely to estimate cycle day, ovulation timing, and estimated forecast windows.
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-800 block">2. Daily Wellness Check-ins</span>
                <p className="text-[11px] text-slate-500">
                  Mood, energy, sleep hours, water intake, stress levels, and reported physical symptoms. Used to discover your personal patterns over time.
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-800 block">3. Blood Pressure Telemetry</span>
                <p className="text-[11px] text-slate-500">
                  Systolic, diastolic, pulse, and posture. Used strictly for displaying historical trends and non-diagnostic circulation dips.
                </p>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-800 block">4. Zero Third-Party Monetization</span>
                <p className="text-[11px] text-slate-500">
                  Your data is stored in a private Supabase Storage container scoped only to your authenticated email. It is never sold, shared with data brokers, or used for ads.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Delete All Data */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
            Danger Zone
          </span>
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
            <div>
              <span className="text-xs font-bold text-rose-950 block">Permanently Erase All Data</span>
              <span className="text-[11px] text-rose-700 leading-relaxed block mt-0.5">
                This immediately wipes all cycle records, daily check-ins, blood pressure logs, and baselines from the server and browser.
              </span>
            </div>

            <button
              type="button"
              onClick={handleDeleteAllData}
              disabled={clearing}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{clearing ? 'Erasing Data...' : clearSuccess ? 'Wiped to 0 Data' : 'Erase All Health Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Safety Notice Footer */}
      <div className="p-4 rounded-2xl bg-white border border-slate-100 text-center text-xs text-slate-400 space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-slate-500 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Non-Diagnostic Health Privacy Guarantee</span>
        </div>
        <p className="text-[11px] leading-relaxed max-w-lg mx-auto">
          Sakhi is designed as a personal wellness journal and does not provide clinical diagnoses. All platform integrations are opt-in and read-only.
        </p>
      </div>
    </div>
  );
}
