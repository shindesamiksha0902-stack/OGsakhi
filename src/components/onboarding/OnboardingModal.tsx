'use client';

import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  HeartPulse,
  Droplet,
  ChevronRight,
  ChevronLeft,
  Check,
  ShieldCheck,
  Zap,
  Activity,
  Smile,
} from 'lucide-react';
import { toISODate } from '@/lib/date-utils';
import { UserOnboardingProfile } from '@/types';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (profile: UserOnboardingProfile) => void;
  userFirstName?: string;
}

export function OnboardingModal({ isOpen, onComplete, userFirstName }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Form states
  const todayStr = toISODate(new Date());
  const [lastPeriodDate, setLastPeriodDate] = useState<string>(todayStr);
  const [isCurrentlyBleeding, setIsCurrentlyBleeding] = useState(false);
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [periodLength, setPeriodLength] = useState<number>(5);
  const [cycleRegularity, setCycleRegularity] = useState<UserOnboardingProfile['cycleRegularity']>('REGULAR');
  const [primaryGoals, setPrimaryGoals] = useState<string[]>([
    'period_prediction',
    'symptoms',
    'bp_dizziness',
  ]);
  const [dizzinessHistory, setDizzinessHistory] = useState<UserOnboardingProfile['dizzinessOrBpHistory']>('OCCASIONALLY');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleGoal = (goalKey: string) => {
    setPrimaryGoals((prev) =>
      prev.includes(goalKey) ? prev.filter((g) => g !== goalKey) : [...prev, goalKey]
    );
  };

  const handleQuickPeriodDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setLastPeriodDate(toISODate(d));
  };

  const handleFinish = async () => {
    try {
      setSubmitting(true);
      const payload: UserOnboardingProfile = {
        completed: true,
        lastPeriodStartDate: lastPeriodDate,
        typicalCycleLength: cycleLength,
        typicalPeriodLength: periodLength,
        cycleRegularity,
        primaryGoals,
        dizzinessOrBpHistory: dizzinessHistory,
        completedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('ogsakhi_onboarding_completed', 'true');
          localStorage.setItem('ogsakhi_onboarding_profile', JSON.stringify(payload));
        }
        onComplete(payload);
      }
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-rose-100 flex flex-col max-h-[92vh]">
        {/* Header / Progress bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-rose-50 via-peach-50/50 to-white border-b border-rose-100/70">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sakhi-500 to-peach-400 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800 tracking-tight">
                  Welcome to OGsakhi{userFirstName ? `, ${userFirstName}` : ''}!
                </h2>
                <p className="text-[11px] font-medium text-slate-500">
                  Step {step} of {totalSteps} • Personalizing your rhythm
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-sakhi-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
              {Math.round((step / totalSteps) * 100)}%
            </span>
          </div>

          {/* Stepper bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-sakhi-500 to-peach-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Modal Body / Steps */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: Last Period Date */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sakhi-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  Anchor Date
                </span>
                <h3 className="text-lg font-bold text-slate-800">
                  When did your last period start?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This anchor allows OGsakhi to calculate your live cycle day, current phase, ovulation, and future period dates.
                </p>
              </div>

              {/* Date Input */}
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Start Date of Last Period
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={lastPeriodDate}
                    onChange={(e) => setLastPeriodDate(e.target.value)}
                    max={todayStr}
                    className="w-full p-3.5 pr-10 rounded-xl bg-white border border-rose-200 text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-sakhi-400 shadow-2xs"
                  />
                  <CalendarIcon className="w-5 h-5 text-sakhi-500 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>

                {/* Quick Selection Shortcuts */}
                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    Quick shortcuts:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickPeriodDate(0)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        lastPeriodDate === todayStr
                          ? 'bg-sakhi-500 text-white border-sakhi-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-sakhi-300'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPeriodDate(7)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white text-slate-600 border border-slate-200 hover:border-sakhi-300 font-medium transition-all"
                    >
                      1 week ago
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPeriodDate(14)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white text-slate-600 border border-slate-200 hover:border-sakhi-300 font-medium transition-all"
                    >
                      2 weeks ago
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPeriodDate(28)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white text-slate-600 border border-slate-200 hover:border-sakhi-300 font-medium transition-all"
                    >
                      ~4 weeks ago
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Typical Cycle & Period Duration */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sakhi-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  Cycle Lengths
                </span>
                <h3 className="text-lg font-bold text-slate-800">
                  How long is your cycle and bleeding?
                </h3>
                <p className="text-xs text-slate-500">
                  Cycle length is counted from the 1st day of bleeding to the day before your next period.
                </p>
              </div>

              {/* Cycle Length Selector */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Average Cycle Length</span>
                  <span className="text-sm font-black text-sakhi-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                    {cycleLength} days
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[26, 27, 28, 29, 30, 31, 32, 35].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setCycleLength(days)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                        cycleLength === days
                          ? 'bg-sakhi-500 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-rose-50'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min="21"
                  max="45"
                  value={cycleLength}
                  onChange={(e) => setCycleLength(Number(e.target.value))}
                  className="w-full accent-sakhi-500 cursor-pointer"
                />
              </div>

              {/* Period Bleeding Length Selector */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Bleeding Duration</span>
                  <span className="text-sm font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                    {periodLength} days
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[3, 4, 5, 6, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setPeriodLength(days)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all text-center ${
                        periodLength === days
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-rose-50'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Cycle Rhythm & Regularity */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sakhi-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  Rhythm Profile
                </span>
                <h3 className="text-lg font-bold text-slate-800">
                  How would you describe your cycle rhythm?
                </h3>
                <p className="text-xs text-slate-500">
                  Helps our AI assistant calibrate whether to predict strict dates or adapt dynamically.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    key: 'REGULAR',
                    icon: '🟢',
                    title: 'Regular & Predictable',
                    desc: 'Arrives almost the same day every month (±1–3 days variation).',
                  },
                  {
                    key: 'SOMEWHAT_IRREGULAR',
                    icon: '🟡',
                    title: 'Somewhat Variable',
                    desc: 'Shifts around depending on stress, work, sleep, or travel.',
                  },
                  {
                    key: 'IRREGULAR_PCOS',
                    icon: '🟣',
                    title: 'Irregular / PCOS / Hormonal Condition',
                    desc: 'Often skips, prolonged, or unpredictable. AI will prioritize symptom telemetry.',
                  },
                  {
                    key: 'BIRTH_CONTROL_POSTPARTUM',
                    icon: '⚪',
                    title: 'Birth Control / Postpartum Transition',
                    desc: 'Hormones are readjusting or cycle is pharmaceutically managed.',
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCycleRegularity(item.key as any)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      cycleRegularity === item.key
                        ? 'bg-rose-50/70 border-sakhi-400 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-rose-200'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{item.title}</span>
                        {cycleRegularity === item.key && (
                          <Check className="w-4 h-4 text-sakhi-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Primary Goals with OGsakhi */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sakhi-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                  Personal Focus
                </span>
                <h3 className="text-lg font-bold text-slate-800">
                  What would you like OGsakhi to help you with?
                </h3>
                <p className="text-xs text-slate-500">
                  Select all that matter to you. The AI model will keep these top of mind.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    key: 'period_prediction',
                    icon: '🌸',
                    title: 'Predict Next Periods',
                    desc: 'Accurate calendar & period alert notifications',
                  },
                  {
                    key: 'ovulation',
                    icon: '🌿',
                    title: 'Track Ovulation & Fertility',
                    desc: 'Identify your 6-day fertile window and peak energy',
                  },
                  {
                    key: 'symptoms',
                    icon: '⚡',
                    title: 'Mood & Cramp Patterns',
                    desc: 'Understand PMS mood swings, cramps & energy dips',
                  },
                  {
                    key: 'bp_dizziness',
                    icon: '🩺',
                    title: 'Blood Pressure & Dizziness',
                    desc: 'Monitor orthostatic dips & circulation warnings',
                  },
                  {
                    key: 'daily_rhythm',
                    icon: '🧘‍♀️',
                    title: 'Daily Wellness Rhythms',
                    desc: 'Gentle hydration nudges and restorative sleep goals',
                  },
                ].map((g) => {
                  const isChecked = primaryGoals.includes(g.key);
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => toggleGoal(g.key)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? 'bg-rose-50/80 border-sakhi-400 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-base">{g.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{g.title}</span>
                          {isChecked && <Check className="w-3.5 h-3.5 text-sakhi-600 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{g.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Vitals & Circulation Pre-screening */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  AI Vitals Pre-screening
                </span>
                <h3 className="text-lg font-bold text-slate-800">
                  Do you ever feel dizziness or low BP around your cycle?
                </h3>
                <p className="text-xs text-slate-500">
                  Hormones trigger blood vessel vasodilation during menstruation and late luteal days.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    key: 'OFTEN',
                    icon: '⚠️',
                    title: 'Yes, frequently noticeable',
                    desc: 'I often feel dizzy when standing, cold extremities, or sudden fatigue dips.',
                  },
                  {
                    key: 'OCCASIONALLY',
                    icon: '🟡',
                    title: 'Occasionally',
                    desc: 'Sometimes on heavy flow days, stressful weeks, or when skipping meals.',
                  },
                  {
                    key: 'RARELY_NEVER',
                    icon: '🟢',
                    title: 'Rarely or Never',
                    desc: 'My circulation and blood pressure remain steady throughout my cycle.',
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setDizzinessHistory(item.key as any)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      dizzinessHistory === item.key
                        ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{item.title}</span>
                        {dizzinessHistory === item.key && (
                          <Check className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All answers are private, stored on your device, and calibrated for AI wellness guidance.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Buttons */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-sakhi-500 to-sakhi-600 text-white text-xs font-bold shadow-md hover:shadow-card active:scale-95 transition-all ml-auto"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-7 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-extrabold shadow-md hover:shadow-card active:scale-95 transition-all ml-auto disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? 'Calibrating Rhythm...' : 'Complete & Calculate Cycle'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
