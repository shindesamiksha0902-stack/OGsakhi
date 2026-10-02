'use client';

import React from 'react';
import { CycleStats, FuturePeriodPrediction } from '@/types';
import { formatShortDate } from '@/lib/date-utils';
import {
  Calendar,
  Sparkles,
  Droplet,
  Heart,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface ForecastTimelineProps {
  stats: CycleStats;
  onOpenLog?: () => void;
}

export function ForecastTimeline({ stats, onOpenLog }: ForecastTimelineProps) {
  const hasCycles = stats.totalCyclesTracked > 0;
  const forecasts = stats.forecasts || [];
  const isDelayed = hasCycles && stats.daysUntilNextPeriod < 0;
  const delayedDays = isDelayed ? Math.abs(stats.daysUntilNextPeriod) : 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-card space-y-4">
      {/* Forecast Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-sakhi-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Future Period Predictions & Date Forecast
            </h3>
            <p className="text-[11px] text-slate-400">
              {hasCycles
                ? `AI & statistical forecast based on your ${stats.averageCycleLength}-day cycle rhythm`
                : 'Awaiting your first period log to calculate personalized forecast dates'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isDelayed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800 border border-red-300 animate-pulse shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span>{delayedDays} Days Delayed</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {hasCycles ? `${stats.confidenceScore}% Prediction Confidence` : 'Calibrating Rhythm'}
            </span>
          )}
        </div>
      </div>

      {/* Immediate Cycle Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Next Period Date - High Visibility Red Alert if Delayed */}
        {isDelayed ? (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-red-50 via-rose-50 to-white border-2 border-red-300 space-y-1 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-red-700 uppercase tracking-wider block">
                🚨 Next Period
              </span>
              <span className="text-[9px] font-extrabold uppercase bg-red-600 text-white px-1.5 py-0.5 rounded-md">
                {delayedDays}d Late
              </span>
            </div>
            <span className="text-sm font-black text-red-950 block">
              {formatShortDate(stats.estimatedNextPeriodDate)}
            </span>
            <span className="text-[10px] font-bold text-red-700 block">
              {delayedDays} day{delayedDays === 1 ? '' : 's'} past expected date
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/60 space-y-1">
            <span className="text-[10px] font-bold text-sakhi-700 uppercase tracking-wider block">
              Next Period Starts
            </span>
            <span className="text-sm font-extrabold text-slate-800 block">
              {hasCycles ? formatShortDate(stats.estimatedNextPeriodDate) : 'Awaiting Log'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {hasCycles
                ? stats.daysUntilNextPeriod > 0
                  ? `In ~${stats.daysUntilNextPeriod} days`
                  : 'Expected today'
                : 'Log your last period'}
            </span>
          </div>
        )}

        {/* Estimated Ovulation */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            Ovulation Day
          </span>
          <span className="text-sm font-extrabold text-slate-800 block">
            {hasCycles ? formatShortDate(stats.ovulationDate) : 'Awaiting Log'}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {hasCycles ? 'Peak energy window' : 'Calibrates with logs'}
          </span>
        </div>

        {/* Fertile Window */}
        <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/60 space-y-1">
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
            Fertile Window
          </span>
          <span className="text-xs font-bold text-slate-800 block">
            {hasCycles
              ? `${formatShortDate(stats.fertileWindow.start)} – ${formatShortDate(stats.fertileWindow.end)}`
              : 'Awaiting Log'}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {hasCycles ? '6-day biological span' : 'Calculates automatically'}
          </span>
        </div>

        {/* Cycle Length Baseline */}
        <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/60 space-y-1">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
            Cycle Regularity
          </span>
          <span className="text-sm font-extrabold text-slate-800 block">
            {stats.averageCycleLength} days
          </span>
          <span className="text-[10px] text-slate-500 block">
            {hasCycles ? `±${stats.cycleVariationDays} days variation` : 'Initial baseline'}
          </span>
        </div>
      </div>

      {/* DEDICATED RED ALERT & RESTORATIVE CARE BANNER (Appears when period is delayed) */}
      {isDelayed && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-red-50/95 via-rose-50/70 to-white border-2 border-red-200/90 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Headline & Explanation */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 border border-red-300 flex items-center justify-center text-red-600 shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-black text-red-950">
                  Cycle Alert: Period is {delayedDays} Day{delayedDays === 1 ? '' : 's'} Late
                </h4>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                  Red Alert
                </span>
              </div>
              <p className="text-xs text-red-900/85 leading-relaxed">
                Short delays of 2–8 days are very normal and are commonly triggered by stress, sleep changes, recent travel, or natural ovulation timing shifts. Here is what to consider and how to support your body today:
              </p>
            </div>
          </div>

          {/* Common Reasons Pills */}
          <div className="space-y-1.5 bg-white/70 p-3 rounded-2xl border border-red-100/90">
            <span className="text-[10px] font-extrabold text-red-900/70 uppercase tracking-wider block">
              Why periods get delayed:
            </span>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-700">
              <span className="px-2.5 py-1 rounded-xl bg-white border border-rose-200 shadow-2xs">
                🧘 Elevated Stress & Cortisol
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white border border-rose-200 shadow-2xs">
                ✈️ Travel or Routine Shifts
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white border border-rose-200 shadow-2xs">
                🌙 Delayed / Anovulatory Cycle
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white border border-rose-200 shadow-2xs">
                🌸 Hormonal Fluctuation / PCOS
              </span>
            </div>
          </div>

          {/* Actionable Restorative Suggestions Grid */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
              Suggestions & Restorative Steps:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-white border border-red-100 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span>🍵</span>
                  <span>Warmth & Pelvic Relaxation</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Apply a gentle heating pad to your lower abdomen and drink warm ginger or chamomile tea to release pelvic constriction.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-red-100 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span>🧘‍♀️</span>
                  <span>Lower Cortisol (Nervous System)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  High stress hormones inhibit progesterone balance. Take 10 minutes for slow diaphragmatic breathing or a restful pause.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-red-100 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span>🩸</span>
                  <span>Watch for Premenstrual Spotting</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Check for light pink/brown spotting or subtle cramps, which indicate bleeding will likely commence within 24–48 hours.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-red-100 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <span>🩺</span>
                  <span>When to Seek Clinical Guidance</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  If sexually active, take a pregnancy test if &gt;5–7 days late. Consult a doctor if delayed &gt;14–21 days or experiencing severe pelvic pain.
                </p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-red-200/80">
            {onOpenLog && (
              <button
                type="button"
                onClick={onOpenLog}
                className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 border border-red-200 text-xs font-bold text-red-700 shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <span>+ Log Today's Symptoms</span>
              </button>
            )}
            <Link
              href={`/assistant?q=My period is ${delayedDays} days delayed (expected on ${formatShortDate(stats.estimatedNextPeriodDate)}). What could be causing this delay and what suggestions do you have for me right now?`}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-sakhi-600 hover:from-red-700 hover:to-sakhi-700 text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask OGsakhi AI for Advice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 2 Upcoming Predicted Cycles Timeline */}
      <div className="pt-2 space-y-2">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Next 2 Cycles Outlook
        </span>

        {!hasCycles ? (
          <div className="p-6 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 text-center space-y-1.5">
            <p className="text-xs font-semibold text-slate-600">No upcoming cycle forecasts yet</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Your future 2-month period and fertile window forecast will automatically generate as soon as you record your first period.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {forecasts.slice(0, 2).map((f, idx) => (
              <div
                key={f.cycleNumber}
                className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 hover:border-rose-200 hover:bg-white transition-all space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {idx === 0 ? 'Next Cycle' : 'Following Cycle (+2)'}
                  </span>
                  <span className="text-[10px] font-semibold text-sakhi-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    {f.confidence}% conf.
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-700">
                    <Droplet className="w-3.5 h-3.5 text-sakhi-500 fill-sakhi-100 shrink-0" />
                    <span className="font-semibold">Period:</span>
                    <span>
                      {formatShortDate(f.startDate)} – {formatShortDate(f.endDate)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Ovulation:</span>
                    <span className="font-medium text-slate-800">
                      {formatShortDate(f.ovulationDate)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 text-[11px]">
                    <Heart className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>PMS prep:</span>
                    <span>
                      {formatShortDate(f.pmsWindow.start)} – {formatShortDate(f.pmsWindow.end)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
