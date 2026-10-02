'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Droplet,
  Heart,
  Zap,
  Moon,
  Coffee,
  Activity,
  Smile,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  ENERGY_OPTIONS,
  SYMPTOM_OPTIONS,
} from '@/lib/constants';
import { DailyLogData, FlowIntensity, EnergyLevel, MoodPrimary } from '@/types';
import { formatFriendlyDate } from '@/lib/date-utils';
import { useAuth } from '@/context/AuthContext';

interface DailyLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onSaved?: () => void;
}

export function DailyLogDrawer({ isOpen, onClose, date, onSaved }: DailyLogDrawerProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form State
  const [isPeriodDay, setIsPeriodDay] = useState(false);
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity | null>(null);
  const [crampSeverity, setCrampSeverity] = useState<number>(0);

  const [moodPrimary, setMoodPrimary] = useState<MoodPrimary | null>(null);
  const [moodIntensity, setMoodIntensity] = useState<number>(3);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>('NORMAL');

  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [sleepQuality, setSleepQuality] = useState<number>(4);

  const [selectedSymptoms, setSelectedSymptoms] = useState<
    { symptomName: string; severity: number }[]
  >([]);
  const [customSymptomInput, setCustomSymptomInput] = useState('');

  const [waterIntakeMl, setWaterIntakeMl] = useState<number>(2000);
  const [exerciseMinutes, setExerciseMinutes] = useState<number>(30);
  const [exerciseType, setExerciseType] = useState<string>('Walking');
  const [caffeineCups, setCaffeineCups] = useState<number>(1);
  const [stressLevel, setStressLevel] = useState<number>(2);
  const [mealsStatus, setMealsStatus] = useState<'ON_TIME' | 'SKIPPED' | 'DELAYED' | null>('ON_TIME');
  const [notes, setNotes] = useState<string>('');

  // Fetch existing day log
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSavedSuccess(false);

    let localFound = false;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ogsakhi_daily_logs');
        if (stored) {
          const allLogs = JSON.parse(stored);
          const localLog = allLogs[date];
          if (localLog) {
            setIsPeriodDay(!!localLog.isPeriodDay);
            setFlowIntensity(localLog.flowIntensity || null);
            setCrampSeverity(localLog.crampSeverity || 0);
            setMoodPrimary(localLog.moodPrimary || null);
            setMoodIntensity(localLog.moodIntensity || 3);
            setEnergyLevel(localLog.energyLevel || 'NORMAL');
            setSleepHours(localLog.sleepHours ?? 7.5);
            setSleepQuality(localLog.sleepQuality ?? 4);
            setSelectedSymptoms(localLog.symptoms || []);
            setWaterIntakeMl(localLog.waterIntakeMl ?? 2000);
            setExerciseMinutes(localLog.exerciseMinutes ?? 30);
            setExerciseType(localLog.exerciseType || 'Walking');
            setCaffeineCups(localLog.caffeineCups ?? 1);
            setStressLevel(localLog.stressLevel ?? 2);
            setMealsStatus(localLog.mealsStatus || 'ON_TIME');
            setNotes(localLog.notes || '');
            localFound = true;
          }
        }
      } catch {}
    }

    const emailQuery = user?.email ? `&email=${encodeURIComponent(user.email)}` : '';
    fetch(`/api/logs?date=${date}${emailQuery}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const log: DailyLogData = json.data;
          setIsPeriodDay(!!log.isPeriodDay);
          setFlowIntensity(log.flowIntensity || null);
          setCrampSeverity(log.crampSeverity || 0);
          setMoodPrimary(log.moodPrimary || null);
          setMoodIntensity(log.moodIntensity || 3);
          setEnergyLevel(log.energyLevel || 'NORMAL');
          setSleepHours(log.sleepHours ?? 7.5);
          setSleepQuality(log.sleepQuality ?? 4);
          setSelectedSymptoms(log.symptoms || []);
          setWaterIntakeMl(log.waterIntakeMl ?? 2000);
          setExerciseMinutes(log.exerciseMinutes ?? 30);
          setExerciseType(log.exerciseType || 'Walking');
          setCaffeineCups(log.caffeineCups ?? 1);
          setStressLevel(log.stressLevel ?? 2);
          setMealsStatus(log.mealsStatus || 'ON_TIME');
          setNotes(log.notes || '');
        } else if (!localFound) {
          // Reset default values for fresh day
          setIsPeriodDay(false);
          setFlowIntensity(null);
          setCrampSeverity(0);
          setMoodPrimary('Calm');
          setMoodIntensity(3);
          setEnergyLevel('NORMAL');
          setSleepHours(7.5);
          setSleepQuality(4);
          setSelectedSymptoms([]);
          setWaterIntakeMl(2000);
          setExerciseMinutes(30);
          setExerciseType('Walking');
          setCaffeineCups(1);
          setStressLevel(2);
          setMealsStatus('ON_TIME');
          setNotes('');
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [isOpen, date, user]);

  const handleToggleSymptom = (symptomName: string) => {
    const exists = selectedSymptoms.some(
      (s) => s.symptomName.toLowerCase() === symptomName.toLowerCase()
    );
    if (exists) {
      setSelectedSymptoms(
        selectedSymptoms.filter((s) => s.symptomName.toLowerCase() !== symptomName.toLowerCase())
      );
    } else {
      setSelectedSymptoms([...selectedSymptoms, { symptomName, severity: 2 }]);
    }
  };

  const handleAddCustomSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSymptomInput.trim()) return;
    const clean = customSymptomInput.trim();
    if (!selectedSymptoms.some((s) => s.symptomName.toLowerCase() === clean.toLowerCase())) {
      setSelectedSymptoms([...selectedSymptoms, { symptomName: clean, severity: 2 }]);
    }
    setCustomSymptomInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: DailyLogData = {
      date,
      isPeriodDay: isPeriodDay || !!flowIntensity,
      flowIntensity: isPeriodDay ? flowIntensity || 'MEDIUM' : null,
      crampSeverity,
      moodPrimary,
      moodIntensity,
      energyLevel,
      sleepHours,
      sleepQuality,
      waterIntakeMl,
      exerciseMinutes,
      exerciseType,
      caffeineCups,
      stressLevel,
      mealsStatus,
      notes,
      symptoms: selectedSymptoms,
    };

    // Save to local backup immediately
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ogsakhi_daily_logs');
        const allLogs = stored ? JSON.parse(stored) : {};
        allLogs[date] = payload;
        localStorage.setItem('ogsakhi_daily_logs', JSON.stringify(allLogs));
      } catch {}
    }

    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          email: user?.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        if (onSaved) onSaved();
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-elevated flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Daily Wellness Check-in</h2>
            <p className="text-xs text-slate-500">{formatFriendlyDate(date)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Period & Flow */}
          <div className="bg-rose-50/60 border border-rose-100/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-sakhi-600 fill-sakhi-100" />
                <span className="font-semibold text-sm text-slate-800">Menstrual Flow</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPeriodDay}
                  onChange={(e) => {
                    setIsPeriodDay(e.target.checked);
                    if (e.target.checked && !flowIntensity) setFlowIntensity('MEDIUM');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sakhi-500"></div>
                <span className="ml-2 text-xs font-medium text-slate-600">
                  {isPeriodDay ? 'Period Day' : 'No flow'}
                </span>
              </label>
            </div>

            {isPeriodDay && (
              <div className="pt-2 border-t border-rose-200/50 space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {FLOW_OPTIONS.map((f) => (
                    <button
                      key={f.level}
                      type="button"
                      onClick={() => setFlowIntensity(f.level as FlowIntensity)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        flowIntensity === f.level
                          ? 'bg-sakhi-600 text-white border-sakhi-600 shadow-xs'
                          : 'bg-white text-slate-700 border-rose-200 hover:border-rose-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Cramps intensity</span>
                    <span className="font-semibold text-sakhi-600">{crampSeverity}/5</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={crampSeverity}
                    onChange={(e) => setCrampSeverity(Number(e.target.value))}
                    className="w-full accent-sakhi-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Mood */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Smile className="w-4 h-4 text-amber-500" />
              <span>Mood</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => setMoodPrimary(m.label as MoodPrimary)}
                  className={`flex flex-col items-center p-2 rounded-xl border text-xs font-medium transition-all ${
                    moodPrimary === m.label
                      ? 'bg-sakhi-50 border-sakhi-400 text-sakhi-700 shadow-xs font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl mb-1">{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Energy */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-500" />
              <span>Energy Level</span>
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {ENERGY_OPTIONS.map((e) => (
                <button
                  key={e.level}
                  type="button"
                  onClick={() => setEnergyLevel(e.level as EnergyLevel)}
                  className={`py-2 px-1 rounded-xl border text-[11px] font-medium text-center transition-all ${
                    energyLevel === e.level
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="text-base mb-0.5">{e.icon}</div>
                  <div>{e.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Sleep */}
          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <Moon className="w-4 h-4 text-indigo-500" />
                <span>Sleep Duration</span>
              </div>
              <span className="text-sm font-bold text-indigo-600">{sleepHours} hrs</span>
            </div>
            <input
              type="range"
              min="3"
              max="12"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">Sleep Quality</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSleepQuality(star)}
                    className={`text-lg transition-transform active:scale-125 ${
                      star <= sleepQuality ? 'text-amber-400' : 'text-slate-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Physical Symptoms */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-rose-500" />
                Physical Symptoms
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                {selectedSymptoms.length} selected
              </span>
            </label>

            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_OPTIONS.map((sym) => {
                const isSelected = selectedSymptoms.some(
                  (s) => s.symptomName.toLowerCase() === sym.label.toLowerCase()
                );
                return (
                  <button
                    key={sym.id}
                    type="button"
                    onClick={() => handleToggleSymptom(sym.label)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-sakhi-500 text-white border-sakhi-500 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{sym.icon}</span>
                    <span>{sym.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom symptom input */}
            <form onSubmit={handleAddCustomSymptom} className="flex gap-2 pt-1">
              <input
                type="text"
                value={customSymptomInput}
                onChange={(e) => setCustomSymptomInput(e.target.value)}
                placeholder="Add other symptom (e.g. sore throat)..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-sakhi-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* 6. Lifestyle & Hydration */}
          <div className="grid grid-cols-2 gap-3">
            {/* Water */}
            <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span className="flex items-center gap-1 text-sky-700">
                  <Droplet className="w-3.5 h-3.5" /> Hydration
                </span>
                <span className="font-bold text-sky-800">{waterIntakeMl} ml</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setWaterIntakeMl((prev) => Math.max(0, prev - 250))}
                  className="flex-1 py-1 bg-white border border-sky-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-sky-50"
                >
                  -250ml
                </button>
                <button
                  type="button"
                  onClick={() => setWaterIntakeMl((prev) => prev + 250)}
                  className="flex-1 py-1 bg-sky-500 text-white rounded-lg text-xs font-semibold hover:bg-sky-600"
                >
                  +250ml
                </button>
              </div>
            </div>

            {/* Exercise */}
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span className="flex items-center gap-1 text-emerald-700">
                  <Activity className="w-3.5 h-3.5" /> Activity
                </span>
                <span className="font-bold text-emerald-800">{exerciseMinutes} min</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setExerciseMinutes((prev) => Math.max(0, prev - 15))}
                  className="flex-1 py-1 bg-white border border-emerald-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-emerald-50"
                >
                  -15m
                </button>
                <button
                  type="button"
                  onClick={() => setExerciseMinutes((prev) => prev + 15)}
                  className="flex-1 py-1 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600"
                >
                  +15m
                </button>
              </div>
            </div>
          </div>

          {/* 7. Meal Timing Schedule */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Meals Schedule Today
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ON_TIME', label: '🥗 On Time', desc: 'Ate as planned' },
                { id: 'DELAYED', label: '⏰ Delayed', desc: 'Late by 1h+' },
                { id: 'SKIPPED', label: '❌ Skipped', desc: 'Missed a meal' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMealsStatus(m.id as any)}
                  className={`p-2.5 rounded-2xl border text-center transition-all ${
                    mealsStatus === m.id
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold">{m.label}</div>
                  <div className="text-[10px] text-slate-400">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 8. Journal & Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Daily Reflection / Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How are you feeling today? Any thoughts or observations..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sakhi-400 resize-none"
            />
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-sakhi-500 to-sakhi-600 text-white text-xs font-bold shadow-md hover:shadow-card active:scale-95 disabled:opacity-50 flex items-center gap-1.5 transition-all"
          >
            {saving ? (
              <span>Saving...</span>
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Check-in</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
