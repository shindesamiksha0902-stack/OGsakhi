'use client';

import React from 'react';
import { CycleStats, FuturePeriodPrediction } from '@/types';
import { formatShortDate } from '@/lib/date-utils';
import { Calendar, Sparkles, Droplet, Heart, CheckCircle2 } from 'lucide-react';

interface ForecastTimelineProps {
  stats: CycleStats;
}

export function ForecastTimeline({ stats }: ForecastTimelineProps) {
  const forecasts = stats.forecasts || [];

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
              AI & statistical forecast based on your {stats.averageCycleLength}-day cycle rhythm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {stats.confidenceScore}% Prediction Confidence
          </span>
        </div>
      </div>

      {/* Immediate Cycle Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Next Period Date */}
        <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/60 space-y-1">
          <span className="text-[10px] font-bold text-sakhi-700 uppercase tracking-wider block">
            Next Period Starts
          </span>
          <span className="text-sm font-extrabold text-slate-800 block">
            {formatShortDate(stats.estimatedNextPeriodDate)}
          </span>
          <span className="text-[10px] text-slate-500">
            {stats.daysUntilNextPeriod > 0
              ? `In ~${stats.daysUntilNextPeriod} days`
              : 'Expected today'}
          </span>
        </div>

        {/* Estimated Ovulation */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            Ovulation Day
          </span>
          <span className="text-sm font-extrabold text-slate-800 block">
            {formatShortDate(stats.ovulationDate)}
          </span>
          <span className="text-[10px] text-slate-500">Peak energy window</span>
        </div>

        {/* Fertile Window */}
        <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/60 space-y-1">
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
            Fertile Window
          </span>
          <span className="text-xs font-bold text-slate-800 block">
            {formatShortDate(stats.fertileWindow.start)} – {formatShortDate(stats.fertileWindow.end)}
          </span>
          <span className="text-[10px] text-slate-500">6-day biological span</span>
        </div>

        {/* Cycle Length Baseline */}
        <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/60 space-y-1">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
            Cycle Regularity
          </span>
          <span className="text-sm font-extrabold text-slate-800 block">
            {stats.averageCycleLength} days
          </span>
          <span className="text-[10px] text-slate-500">±{stats.cycleVariationDays} days variation</span>
        </div>
      </div>

      {/* 2 Upcoming Predicted Cycles Timeline */}
      <div className="pt-2 space-y-2">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Next 2 Cycles Outlook
        </span>

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
      </div>
    </div>
  );
}
