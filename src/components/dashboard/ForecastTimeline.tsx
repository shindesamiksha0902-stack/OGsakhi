'use client';

import React from 'react';
import { CycleStats, FuturePeriodPrediction } from '@/types';
import { formatShortDate } from '@/lib/date-utils';
import { Calendar, Sparkles, Droplet, Heart, CheckCircle2 } from 'lucide-react';

interface ForecastTimelineProps {
  stats: CycleStats;
}

export function ForecastTimeline({ stats }: ForecastTimelineProps) {
  const hasCycles = stats.totalCyclesTracked > 0;
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
              {hasCycles
                ? `AI & statistical forecast based on your ${stats.averageCycleLength}-day cycle rhythm`
                : 'Awaiting your first period log to calculate personalized forecast dates'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {hasCycles ? `${stats.confidenceScore}% Prediction Confidence` : 'Calibrating Rhythm'}
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
            {hasCycles ? formatShortDate(stats.estimatedNextPeriodDate) : 'Awaiting Log'}
          </span>
          <span className="text-[10px] text-slate-500">
            {hasCycles
              ? stats.daysUntilNextPeriod > 0
                ? `In ~${stats.daysUntilNextPeriod} days`
                : 'Expected today'
              : 'Log your last period'}
          </span>
        </div>

        {/* Estimated Ovulation */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 space-y-1">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            Ovulation Day
          </span>
          <span className="text-sm font-extrabold text-slate-800 block">
            {hasCycles ? formatShortDate(stats.ovulationDate) : 'Awaiting Log'}
          </span>
          <span className="text-[10px] text-slate-500">
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
          <span className="text-[10px] text-slate-500">
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
          <span className="text-[10px] text-slate-500">
            {hasCycles ? `±${stats.cycleVariationDays} days variation` : 'Initial baseline'}
          </span>
        </div>
      </div>

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
