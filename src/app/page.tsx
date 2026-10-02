'use client';

import React, { useState, useEffect } from 'react';
import { CycleStatusCard } from '@/components/dashboard/CycleStatusCard';
import { ForecastTimeline } from '@/components/dashboard/ForecastTimeline';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { InsightHighlights } from '@/components/dashboard/InsightHighlights';
import { QuickAskAi } from '@/components/dashboard/QuickAskAi';
import { DailyLogDrawer } from '@/components/logging/DailyLogDrawer';
import { CycleStats, DailyLogData, DetectedPatternItem, DeviationSeverity } from '@/types';
import { toISODate } from '@/lib/date-utils';
import { RefreshCw, HeartPulse, ChevronRight, AlertTriangle, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CycleStats | null>(null);
  const [dailyGoals, setDailyGoals] = useState<any[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLogData | null>(null);
  const [patterns, setPatterns] = useState<DetectedPatternItem[]>([]);
  const [overallSeverity, setOverallSeverity] = useState<DeviationSeverity>('NORMAL');
  const [bpData, setBpData] = useState<any>(null);
  const [isLogOpen, setIsLogOpen] = useState(false);

  const todayStr = toISODate(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch cycle stats
      const cycleRes = await fetch('/api/cycles');
      const cycleJson = await cycleRes.json();
      if (cycleJson.success) {
        setStats(cycleJson.data.stats);
        if (cycleJson.data.dailyGoals) {
          setDailyGoals(cycleJson.data.dailyGoals);
        }
      }

      // Fetch today's log
      const logRes = await fetch(`/api/logs?date=${todayStr}`);
      const logJson = await logRes.json();
      if (logJson.success) {
        setTodayLog(logJson.data);
      }

      // Fetch patterns
      const patRes = await fetch('/api/analytics/patterns');
      const patJson = await patRes.json();
      if (patJson.success) {
        setPatterns(patJson.data.patterns);
        setOverallSeverity(patJson.data.overallSeverity);
      }

      // Fetch BP telemetry
      const bpRes = await fetch('/api/bp');
      const bpJson = await bpRes.json();
      if (bpJson.success) {
        setBpData(bpJson.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const latestBp = bpData?.logs?.[0];
  const bpPrediction = bpData?.analysis?.prediction;

  return (
    <div className="space-y-6">
      {/* 1. Cycle Hero Status Card */}
      {stats && (
        <>
          <CycleStatusCard
            stats={stats}
            dailyGoals={dailyGoals}
            onOpenLog={() => setIsLogOpen(true)}
          />
          <ForecastTimeline stats={stats} />
        </>
      )}

      {/* 2. Blood Pressure & Circulation Quick Card */}
      <Link
        href="/bp"
        className="block group bg-gradient-to-r from-rose-50/70 via-indigo-50/40 to-white p-4 sm:p-5 rounded-3xl border border-rose-100/80 shadow-2xs hover:shadow-card hover:border-rose-200 transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Blood Pressure & Circulation
                </span>
                {latestBp && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                      latestBp.category.includes('Low')
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : latestBp.category.includes('High')
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {latestBp.systolic}/{latestBp.diastolic} mmHg
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {bpPrediction?.headline || 'Track daily readings, dizziness & hormonal warnings'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform shrink-0">
            <span className="hidden sm:inline">Track BP</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </Link>

      {/* 3. Today's Telemetry Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Today's Wellness Status
          </h2>
          <span className="text-[11px] text-slate-400">Tap any card to edit</span>
        </div>
        <MetricCards
          todayLog={todayLog}
          onOpenLog={() => setIsLogOpen(true)}
        />
      </div>

      {/* 3. Your Insights & Gentle Pattern Alerts */}
      <InsightHighlights
        patterns={patterns}
        overallSeverity={overallSeverity}
      />

      {/* 4. Ask AI Assistant */}
      <QuickAskAi />

      {/* Daily check-in drawer */}
      <DailyLogDrawer
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        date={todayStr}
        onSaved={fetchData}
      />
    </div>
  );
}
