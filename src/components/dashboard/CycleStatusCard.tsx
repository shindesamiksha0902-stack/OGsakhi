'use client';

import React, { useState } from 'react';
import { CycleStats, DailyRhythmGoal } from '@/types';
import { PHASE_INFO } from '@/lib/constants';
import { CheckCircle2, Circle, Target } from 'lucide-react';

interface CycleStatusCardProps {
  stats: CycleStats;
  dailyGoals?: DailyRhythmGoal[];
  onOpenLog: () => void;
}

export function CycleStatusCard({ stats, dailyGoals = [], onOpenLog }: CycleStatusCardProps) {
  const phaseMeta = PHASE_INFO[stats.currentPhase] || PHASE_INFO.Menstrual;
  const [userToggledIds, setUserToggledIds] = useState<Record<string, boolean>>({});

  // Percentage around average cycle length
  const progressPercent = Math.min(
    100,
    Math.round((stats.currentCycleDay / stats.averageCycleLength) * 100)
  );

  const isGoalDone = (goal: DailyRhythmGoal) => {
    if (userToggledIds[goal.id] !== undefined) {
      return userToggledIds[goal.id];
    }
    return Boolean(goal.completed);
  };

  const toggleGoal = (goal: DailyRhythmGoal) => {
    const current = isGoalDone(goal);
    setUserToggledIds((prev) => ({
      ...prev,
      [goal.id]: !current,
    }));
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-rose-50/30 to-purple-50/40 border border-rose-100/70 p-6 sm:p-7 shadow-card space-y-5">
      {/* Top Row: Dial + Status + Log Today */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        {/* Left: Cycle Day Dial / Hero */}
        <div className="flex items-center gap-5 sm:gap-6">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center shrink-0">
            {/* Circular SVG Ring */}
            <svg className="w-full h-full transform -rotate-90 drop-shadow-xs" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="48"
                className="stroke-rose-100/70"
                strokeWidth="8"
                fill="white"
              />
              <circle
                cx="60"
                cy="60"
                r="48"
                className="stroke-sakhi-500 transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeDasharray={301.6}
                strokeDashoffset={301.6 - (301.6 * progressPercent) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="text-[9px] uppercase font-bold text-sakhi-600 bg-rose-50/90 px-2 py-0.5 rounded-full border border-rose-100 tracking-wider">
                Cycle
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight my-0.5">
                Day {stats.currentCycleDay}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                of {stats.averageCycleLength}d
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${phaseMeta.badge}`}
              >
                {phaseMeta.name}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              {stats.daysUntilNextPeriod > 0
                ? `Period expected in ~${stats.daysUntilNextPeriod} days`
                : stats.daysUntilNextPeriod === 0
                ? 'Period expected today'
                : `Period is ${Math.abs(stats.daysUntilNextPeriod)} days past estimated date`}
            </h3>

            <p className="text-xs text-slate-500 max-w-sm">{phaseMeta.description}</p>
          </div>
        </div>

        {/* Right Action: Quick Check-in Button */}
        <div className="flex sm:flex-col items-center sm:items-end justify-center gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenLog}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sakhi-500 to-sakhi-600 text-white font-semibold text-xs shadow-md hover:shadow-card active:scale-95 transition-all text-center"
          >
            + Log Today
          </button>
        </div>
      </div>

      {/* Suggested Daily Goals (Studied from recent logs) */}
      <div className="pt-4 border-t border-rose-100/60 space-y-3">

        {/* Suggested Daily Goals (Studied from recent logs) */}
        {dailyGoals.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-sakhi-600" />
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Today's Suggested Goals (Studied from Recent Check-ins)
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {dailyGoals.filter((g) => isGoalDone(g)).length} of {dailyGoals.length} completed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dailyGoals.map((goal) => {
                const isCompleted = isGoalDone(goal);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                      isCompleted
                        ? 'bg-emerald-50/70 border-emerald-200 text-slate-500'
                        : 'bg-white hover:bg-rose-50/40 border-slate-200/80 shadow-2xs'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 hover:text-sakhi-500" />
                      )}
                    </div>

                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{goal.icon}</span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md ${
                            goal.category === 'meals'
                              ? 'bg-amber-100 text-amber-800'
                              : goal.category === 'mood'
                              ? 'bg-purple-100 text-purple-800'
                              : goal.category === 'movement'
                              ? 'bg-sky-100 text-sky-800'
                              : goal.category === 'hydration'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {goal.tag}
                        </span>
                      </div>

                      <div
                        className={`text-xs font-bold leading-tight ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {goal.title}
                      </div>

                      <p className="text-[11px] text-slate-500 leading-snug">{goal.reason}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
