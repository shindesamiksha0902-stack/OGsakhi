'use client';

import React from 'react';
import { DailyLogData } from '@/types';
import { Droplet, Smile, Zap, Moon, Activity, Plus } from 'lucide-react';
import { MOOD_OPTIONS, ENERGY_OPTIONS } from '@/lib/constants';

interface MetricCardsProps {
  todayLog: DailyLogData | null;
  onOpenLog: () => void;
}

export function MetricCards({ todayLog, onOpenLog }: MetricCardsProps) {
  const moodMeta = MOOD_OPTIONS.find((m) => m.label === todayLog?.moodPrimary);
  const energyMeta = ENERGY_OPTIONS.find((e) => e.level === todayLog?.energyLevel);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {/* 1. Cycle / Flow */}
      <button
        onClick={onOpenLog}
        className="flex flex-col text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-rose-200 transition-all shadow-xs group"
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs font-semibold text-slate-500">Flow</span>
          <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Droplet className="w-4 h-4 fill-rose-100" />
          </div>
        </div>
        <span className="text-sm font-bold text-slate-800">
          {todayLog?.isPeriodDay ? todayLog.flowIntensity || 'Period Day' : 'No bleeding'}
        </span>
        <span className="text-[11px] text-slate-400 mt-0.5">
          {todayLog?.crampSeverity ? `Cramps: ${todayLog.crampSeverity}/5` : 'No cramps logged'}
        </span>
      </button>

      {/* 2. Mood */}
      <button
        onClick={onOpenLog}
        className="flex flex-col text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-amber-200 transition-all shadow-xs group"
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs font-semibold text-slate-500">Mood</span>
          <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Smile className="w-4 h-4" />
          </div>
        </div>
        <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          {moodMeta ? `${moodMeta.emoji} ${moodMeta.label}` : 'Not logged'}
        </span>
        <span className="text-[11px] text-slate-400 mt-0.5">
          {todayLog?.moodIntensity ? `Intensity: ${todayLog.moodIntensity}/5` : 'Tap to record'}
        </span>
      </button>

      {/* 3. Energy */}
      <button
        onClick={onOpenLog}
        className="flex flex-col text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-emerald-200 transition-all shadow-xs group"
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs font-semibold text-slate-500">Energy</span>
          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          {energyMeta ? `${energyMeta.icon} ${energyMeta.label}` : 'Not logged'}
        </span>
        <span className="text-[11px] text-slate-400 mt-0.5">
          {todayLog?.exerciseMinutes ? `${todayLog.exerciseMinutes}m exercise` : 'Daily stamina'}
        </span>
      </button>

      {/* 4. Sleep */}
      <button
        onClick={onOpenLog}
        className="flex flex-col text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 transition-all shadow-xs group"
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs font-semibold text-slate-500">Sleep</span>
          <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Moon className="w-4 h-4" />
          </div>
        </div>
        <span className="text-sm font-bold text-slate-800">
          {todayLog?.sleepHours ? `${todayLog.sleepHours} hrs` : 'Not logged'}
        </span>
        <span className="text-[11px] text-slate-400 mt-0.5">
          {todayLog?.sleepQuality ? `${todayLog.sleepQuality}/5 stars quality` : 'Rest & recovery'}
        </span>
      </button>

      {/* 5. Hydration */}
      <button
        onClick={onOpenLog}
        className="flex flex-col text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-sky-200 transition-all shadow-xs group"
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs font-semibold text-slate-500">Hydration</span>
          <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Droplet className="w-4 h-4" />
          </div>
        </div>
        <span className="text-sm font-bold text-slate-800">
          {todayLog?.waterIntakeMl ? `${todayLog.waterIntakeMl} ml` : '0 ml'}
        </span>
        <span className="text-[11px] text-slate-400 mt-0.5">
          {todayLog?.waterIntakeMl && todayLog.waterIntakeMl >= 2000
            ? '✓ Goal achieved'
            : 'Goal: 2000 ml'}
        </span>
      </button>

      {/* 6. Physical Symptoms */}
      <button
        onClick={onOpenLog}
        className="flex flex-col text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-rose-200 transition-all shadow-xs group"
      >
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-xs font-semibold text-slate-500">Symptoms</span>
          <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <span className="text-sm font-bold text-slate-800 truncate max-w-full">
          {todayLog?.symptoms && todayLog.symptoms.length > 0
            ? todayLog.symptoms.map((s) => s.symptomName).join(', ')
            : 'None logged'}
        </span>
        <span className="text-[11px] text-slate-400 mt-0.5">
          {todayLog?.symptoms?.length ? `${todayLog.symptoms.length} symptoms active` : 'Body comfort'}
        </span>
      </button>
    </div>
  );
}
