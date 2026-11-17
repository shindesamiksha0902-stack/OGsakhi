'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, Droplet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const MOOD_OPTIONS = [
  { label: 'Low',       emoji: '😔', value: 'Low'       },
  { label: 'Irritated', emoji: '😤', value: 'Irritated' },
  { label: 'Neutral',   emoji: '😐', value: 'Neutral'   },
  { label: 'Calm',      emoji: '😊', value: 'Calm'      },
  { label: 'Happy',     emoji: '😄', value: 'Happy'     },
];

const ENERGY_OPTIONS = [
  { label: 'Very Low', emoji: '🪫', value: 'VERY_LOW' },
  { label: 'Low',      emoji: '😴', value: 'LOW'      },
  { label: 'Normal',   emoji: '⚡', value: 'NORMAL'   },
  { label: 'High',     emoji: '🔋', value: 'HIGH'     },
  { label: 'V. High',  emoji: '🚀', value: 'VERY_HIGH'},
];

const WATER_OPTIONS = [500, 1000, 1500, 2000, 2500];

export function QuickCheckIn({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth();
  const [expanded, setExpanded]       = useState(false);
  const [alreadyLogged, setAlreadyLogged] = useState(false);
  const [mood, setMood]               = useState<string | null>(null);
  const [energy, setEnergy]           = useState<string | null>(null);
  const [sleep, setSleep]             = useState<number>(7);
  const [water, setWater]             = useState<number>(2000);
  const [stress, setStress]           = useState<number>(2);
  const [isPeriodDay, setIsPeriodDay] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const checkTodayLog = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`/api/logs?email=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const hasToday = data.data.some((l: any) => l.date === today);
        setAlreadyLogged(hasToday);
      }
    } catch {}
  }, [user, today]);

  useEffect(() => {
    checkTodayLog();
  }, [checkTodayLog]);

  const handleSubmit = async () => {
    if (!mood || !energy) return;
    setSaving(true);
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          moodPrimary: mood,
          moodIntensity: 3,
          energyLevel: energy,
          sleepHours: sleep,
          sleepQuality: sleep >= 7 ? 4 : sleep >= 6 ? 3 : 2,
          waterIntakeMl: water,
          stressLevel: stress,
          isPeriodDay,
          flowIntensity: isPeriodDay ? 'MEDIUM' : null,
          symptoms: [],
          email: user?.email,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setExpanded(false);
        setAlreadyLogged(true);
        window.dispatchEvent(new CustomEvent('sakhi_log_saved'));
        onSaved?.();
      }
    } catch {}
    finally { setSaving(false); }
  };

  if (alreadyLogged && !saved) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
        Today's check-in is complete 🌸
      </div>
    );
  }

  if (saved) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
        Saved! Have a great day 🌸
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sakhi-500 to-peach-400 flex items-center justify-center text-white text-sm shadow-xs">
            🌸
          </div>
          <div>
            <span className="text-sm font-bold text-slate-800">Quick Check-in</span>
            <span className="hidden sm:inline text-xs text-slate-400 ml-2">· How are you feeling today?</span>
          </div>
        </div>
        {expanded
          ? <ChevronUp  className="w-4 h-4 text-slate-400" />
          : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-5 space-y-4 border-t border-slate-100 pt-4">

          {/* Mood */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              😊 Mood
            </label>
            <div className="flex gap-1.5">
              {MOOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setMood(opt.value)}
                  className={`flex-1 flex flex-col items-center py-2 rounded-xl border text-xs transition-all ${
                    mood === opt.value
                      ? 'bg-sakhi-50 border-sakhi-300 text-sakhi-700 font-semibold shadow-xs scale-105'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl leading-none">{opt.emoji}</span>
                  <span className="text-[10px] mt-1 leading-none">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Energy */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              ⚡ Energy
            </label>
            <div className="flex gap-1.5">
              {ENERGY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setEnergy(opt.value)}
                  className={`flex-1 flex flex-col items-center py-2 rounded-xl border text-xs transition-all ${
                    energy === opt.value
                      ? 'bg-amber-50 border-amber-300 text-amber-700 font-semibold shadow-xs scale-105'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl leading-none">{opt.emoji}</span>
                  <span className="text-[10px] mt-1 leading-none">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sleep + Stress */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                💤 Sleep (hrs)
              </label>
              <input
                type="number"
                min={0} max={12} step={0.5}
                value={sleep}
                onChange={(e) => setSleep(Number(e.target.value))}
                className="w-full text-center font-bold text-slate-800 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sakhi-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                🧠 Stress (1-5)
              </label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    onClick={() => setStress(n)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      stress === n
                        ? n >= 4
                          ? 'bg-rose-100 border-rose-300 text-rose-700'
                          : 'bg-indigo-100 border-indigo-300 text-indigo-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >{n}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Water */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              <Droplet className="w-3 h-3 inline mr-1 text-sky-500" />Water intake
            </label>
            <div className="flex gap-1.5">
              {WATER_OPTIONS.map(ml => (
                <button
                  key={ml}
                  onClick={() => setWater(ml)}
                  className={`flex-1 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
                    water === ml
                      ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-xs'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
                </button>
              ))}
            </div>
          </div>

          {/* Period toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-rose-100">
            <span className="text-xs font-semibold text-rose-800">🩸 Period day?</span>
            <button
              onClick={() => setIsPeriodDay(!isPeriodDay)}
              className={`w-11 h-6 rounded-full transition-colors relative ${isPeriodDay ? 'bg-rose-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isPeriodDay ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!mood || !energy || saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sakhi-500 to-sakhi-600 text-white font-semibold text-sm disabled:opacity-40 shadow-xs hover:shadow-card transition-all active:scale-95"
          >
            {saving ? 'Saving...' : '✓ Save Today\'s Check-in'}
          </button>

          <p className="text-center text-[11px] text-slate-400">
            For symptoms and detailed notes, use the full{' '}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('sakhi_open_log'))}
              className="text-sakhi-600 font-semibold underline-offset-2 underline"
            >
              Log Today
            </button>
            {' '}feature.
          </p>
        </div>
      )}
    </div>
  );
}
