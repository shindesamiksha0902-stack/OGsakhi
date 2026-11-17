'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Droplet,
  Moon,
  Zap,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import {
  CycleRecord,
  CycleStats,
  DailyLogData,
  DetectedPatternItem,
  DeviationSeverity,
} from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function InsightsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<CycleRecord[]>([]);
  const [logs, setLogs] = useState<DailyLogData[]>([]);
  const [stats, setStats] = useState<CycleStats | null>(null);
  const [patterns, setPatterns] = useState<DetectedPatternItem[]>([]);
  const [overallSeverity, setOverallSeverity] = useState<DeviationSeverity>('NORMAL');
  const [baselines, setBaselines] = useState<any>(null);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        setLoading(true);
        const emailQuery = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
        const [cyclesRes, patternsRes, logsRes] = await Promise.all([
          fetch(`/api/cycles${emailQuery}`),
          fetch(`/api/analytics/patterns${emailQuery}`),
          fetch(`/api/logs${emailQuery}`),
        ]);

        const cyclesJson  = await cyclesRes.json();
        const patternsJson = await patternsRes.json();
        const logsJson    = await logsRes.json();

        if (cyclesJson.success) {
          setCycles(cyclesJson.data.cycles);
          setStats(cyclesJson.data.stats);
        }
        if (patternsJson.success) {
          setPatterns(patternsJson.data.patterns);
          setOverallSeverity(patternsJson.data.overallSeverity);
          setBaselines(patternsJson.data.baselines);
        }
        if (logsJson.success) {
          setLogs(logsJson.data ?? []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  }, [user]);

  // ── Cycle length history chart ──────────────────────────────────────────────
  const cycleChartData = cycles
    .filter((c) => c.lengthDays)
    .map((c, idx) => ({
      cycle: `Cycle ${idx + 1}`,
      length: c.lengthDays,
      period: c.periodDays || 5,
    }));

  // ── Phase comparison: energy & mood averaged from real logs ────────────────
  const ENERGY_SCALE: Record<string, number> = {
    VERY_LOW: 1, LOW: 2, NORMAL: 3, HIGH: 4, VERY_HIGH: 5,
  };
  const MOOD_SCALE: Record<string, number> = {
    Low: 1, Irritated: 2, Neutral: 3, Calm: 4, Happy: 5,
  };
  const PHASE_ORDER = ['Menstrual', 'Follicular', 'Ovulatory', 'Luteal'];

  function getPhaseForCycleDay(day: number): string {
    if (day <= 5)  return 'Menstrual';
    if (day <= 13) return 'Follicular';
    if (day <= 16) return 'Ovulatory';
    return 'Luteal';
  }

  const phaseComparisonData = (() => {
    if (logs.length < 5 || cycles.length === 0) return [];

    // For each log find its cycle day by comparing to the nearest cycle start
    const sortedCycles = [...cycles].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const phaseBuckets: Record<string, { energy: number[]; mood: number[] }> = {
      Menstrual:  { energy: [], mood: [] },
      Follicular: { energy: [], mood: [] },
      Ovulatory:  { energy: [], mood: [] },
      Luteal:     { energy: [], mood: [] },
    };

    logs.forEach((log) => {
      const logDate = new Date(log.date).getTime();
      // Find the cycle this log belongs to (closest start date before the log)
      let matchedCycle = sortedCycles.find((c) => {
        const start = new Date(c.startDate).getTime();
        const end   = c.cycleEndDate
          ? new Date(c.cycleEndDate).getTime()
          : start + 35 * 86400000;
        return logDate >= start && logDate <= end;
      });
      if (!matchedCycle) return;

      const cycleDay = Math.floor(
        (logDate - new Date(matchedCycle.startDate).getTime()) / 86400000
      ) + 1;
      const phase = getPhaseForCycleDay(cycleDay);

      if (log.energyLevel && ENERGY_SCALE[log.energyLevel] !== undefined) {
        phaseBuckets[phase].energy.push(ENERGY_SCALE[log.energyLevel]);
      }
      if (log.moodPrimary && MOOD_SCALE[log.moodPrimary] !== undefined) {
        phaseBuckets[phase].mood.push(MOOD_SCALE[log.moodPrimary]);
      }
    });

    const avg = (arr: number[]) =>
      arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

    return PHASE_ORDER
      .map((phase) => ({
        phase,
        energy: avg(phaseBuckets[phase].energy),
        mood:   avg(phaseBuckets[phase].mood),
      }))
      .filter((p) => p.energy !== null || p.mood !== null);
  })();

  // ── Lifestyle observations computed from real logs ─────────────────────────
  const lifestyleObs = (() => {
    if (logs.length < 5) return null;

    // Hydration vs headache
    const lowWaterWithHeadache = logs.filter(
      (l) => (l.waterIntakeMl ?? 2000) < 1500 &&
              (l.symptoms ?? []).some((s: any) =>
                (typeof s === 'string' ? s : s.symptomName ?? '').toLowerCase().includes('headache'))
    ).length;
    const lowWaterDays = logs.filter((l) => (l.waterIntakeMl ?? 2000) < 1500).length;
    const hydrationRate = lowWaterDays > 0
      ? Math.round((lowWaterWithHeadache / lowWaterDays) * 100)
      : 0;

    // Sleep vs energy
    const lowSleepLowEnergy = logs.filter(
      (l) => (l.sleepHours ?? 7) < 6.5 && ['LOW', 'VERY_LOW'].includes(l.energyLevel ?? '')
    ).length;
    const lowSleepDays = logs.filter((l) => (l.sleepHours ?? 7) < 6.5).length;
    const sleepEnergyRate = lowSleepDays > 0
      ? Math.round((lowSleepLowEnergy / lowSleepDays) * 100)
      : 0;

    // Exercise vs mood
    const activeGoodMood = logs.filter(
      (l) => (l.exerciseMinutes ?? 0) >= 20 && ['Calm', 'Happy'].includes(l.moodPrimary ?? '')
    ).length;
    const activeDays = logs.filter((l) => (l.exerciseMinutes ?? 0) >= 20).length;
    const exerciseMoodRate = activeDays > 0
      ? Math.round((activeGoodMood / activeDays) * 100)
      : 0;

    return { hydrationRate, sleepEnergyRate, exerciseMoodRate, lowWaterDays, lowSleepDays, activeDays };
  })();

  // ── Symptom frequency ──────────────────────────────────────────────────────
  const symptomData = baselines?.topSymptoms || [];

  const getSeverityPill = (sev: DeviationSeverity) => {
    if (sev === 'CONSIDER_CHECKING') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          Consider Checking
        </span>
      );
    }
    if (sev === 'NOTICE') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          Notice
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
        Normal Baseline
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Your Wellness Analytics</h1>
          <p className="text-xs text-slate-500">
            Personalized trends, cycle rhythms, and lifestyle observations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {getSeverityPill(overallSeverity)}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Avg Cycle Length</span>
          <div className="text-xl font-extrabold text-slate-800 mt-1">
            {stats?.averageCycleLength ?? 28} days
          </div>
          <span className="text-[11px] text-slate-500">
            {stats && stats.totalCyclesTracked > 0 ? 'Personalized baseline' : 'Initial baseline'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Cycle Variation</span>
          <div className="text-xl font-extrabold text-sakhi-600 mt-1">
            ±{stats?.cycleVariationDays ?? 0} days
          </div>
          <span className="text-[11px] text-slate-500">
            {stats && stats.totalCyclesTracked > 0
              ? stats.cycleVariationDays <= 3
                ? 'High regularity'
                : 'Moderate variation'
              : 'Awaiting logs'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Avg Period Flow</span>
          <div className="text-xl font-extrabold text-slate-800 mt-1">
            {stats?.averagePeriodLength ?? 5} days
          </div>
          <span className="text-[11px] text-slate-500">Bleeding duration</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase">Sleep Baseline</span>
          <div className="text-xl font-extrabold text-indigo-600 mt-1">
            {baselines?.avgSleep ? `${baselines.avgSleep} hrs` : '--'}
          </div>
          <span className="text-[11px] text-slate-500">Typical nightly rest</span>
        </div>
      </div>

      {/* Chart 1: Cycle History (Cute Area Curve) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">🌸</span>
              <h3 className="text-sm font-bold text-slate-800">Historical Cycle Lengths</h3>
            </div>
            <p className="text-xs text-slate-400">
              Smooth rhythm curve comparing past cycle lengths against your {stats?.averageCycleLength || 30}-day baseline
            </p>
          </div>
          <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
            Baseline: {stats?.averageCycleLength || 30} days
          </span>
        </div>

        {cycleChartData.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center text-center p-6 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <span className="text-2xl">🌸</span>
            <p className="text-xs font-semibold text-slate-600">No cycle length history recorded yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Log your past or current periods to build a historical comparison curve of cycle regularity.
            </p>
          </div>
        ) : (
          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cycleChartData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="cuteRoseGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" vertical={false} />
                <XAxis
                  dataKey="cycle"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[24, 34]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #fecdd3',
                    boxShadow: '0 4px 15px rgba(244, 63, 94, 0.08)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  formatter={(value: any) => [`${value} days`, 'Cycle Length']}
                />
                <ReferenceLine
                  y={stats?.averageCycleLength || 30}
                  stroke="#fda4af"
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg ${stats?.averageCycleLength || 30}d`,
                    fill: '#e11d48',
                    fontSize: 10,
                    position: 'insideTopRight',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="length"
                  name="Cycle Length"
                  stroke="#f43f5e"
                  strokeWidth={3.5}
                  fill="url(#cuteRoseGlow)"
                  dot={{ r: 5, fill: '#f43f5e', stroke: '#ffffff', strokeWidth: 2.5 }}
                  activeDot={{ r: 7, fill: '#be123c', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart 2: Energy & Mood Across Phases (Cute Dual Wave Lineplot) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">✨</span>
              <h3 className="text-sm font-bold text-slate-800">Energy & Mood Across Phases</h3>
            </div>
            <p className="text-xs text-slate-400">
              Gentle curves showing how your energy and mood naturally shift through each phase
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>⚡ Energy</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>😊 Mood</span>
            </div>
          </div>
        </div>

        {cycles.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center text-center p-6 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <span className="text-2xl">✨</span>
            <p className="text-xs font-semibold text-slate-600">Awaiting daily check-ins to map phase rhythms</p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Track your daily mood and energy levels. The AI engine will correlate how your stamina shifts across your menstrual and luteal phases.
            </p>
          </div>
        ) : (
          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={phaseComparisonData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="phase"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  formatter={(value: any, name: any) => [
                    `${value} / 5`,
                    name === 'energy' ? '⚡ Energy' : '😊 Mood',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  name="energy"
                  stroke="#10b981"
                  strokeWidth={3.5}
                  dot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2.5 }}
                  activeDot={{ r: 7, fill: '#059669', stroke: '#ffffff', strokeWidth: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  name="mood"
                  stroke="#f59e0b"
                  strokeWidth={3.5}
                  dot={{ r: 5, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2.5 }}
                  activeDot={{ r: 7, fill: '#d97706', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Symptoms & Lifestyle Relationships */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Frequent Symptoms */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Most Logged Symptoms</h3>
          {symptomData.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              No symptoms logged yet. Check in daily to track physical signals.
            </div>
          ) : (
            <div className="space-y-2">
              {symptomData.map((item: any) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-700">
                    <span className="font-medium">{item.name}</span>
                    <span className="font-semibold text-slate-500">{item.count} times</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-sakhi-500 rounded-full"
                      style={{ width: `${Math.min(100, item.count * 12)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Observed Lifestyle Relationships */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Lifestyle Observations</h3>
          <p className="text-[11px] text-slate-400">
            Observations reflect recurring correlations, not medical causes
          </p>

          {cycles.length === 0 || !lifestyleObs ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              Correlations (hydration, sleep &amp; stamina) will automatically appear as you log daily check-ins.
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100 text-xs space-y-1">
                <span className="font-bold text-sky-800 flex items-center gap-1">
                  <Droplet className="w-3.5 h-3.5" /> Hydration &amp; Headaches
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {lifestyleObs.lowWaterDays === 0
                    ? 'You have been staying well hydrated — no low-water days detected.'
                    : lifestyleObs.hydrationRate >= 40
                    ? `On ${lifestyleObs.hydrationRate}% of your low-hydration days (under 1500 ml) you also logged a headache. Drinking more water may help reduce headache frequency.`
                    : `You had ${lifestyleObs.lowWaterDays} low-hydration days. Headache correlation is low — keep maintaining good water intake.`}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-1">
                <span className="font-bold text-indigo-800 flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5" /> Sleep &amp; Energy
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {lifestyleObs.lowSleepDays === 0
                    ? 'You have consistently slept over 6.5 hours — great sleep hygiene!'
                    : lifestyleObs.sleepEnergyRate >= 40
                    ? `On ${lifestyleObs.sleepEnergyRate}% of your nights under 6.5 hours, you logged low energy the next day. Prioritising sleep in the luteal phase especially may help.`
                    : `You had ${lifestyleObs.lowSleepDays} short-sleep nights. Your energy levels appear resilient — good job!`}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-1">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Exercise &amp; Mood
                </span>
                <p className="text-slate-600 leading-relaxed">
                  {lifestyleObs.activeDays === 0
                    ? 'Log your exercise minutes to track how movement influences your mood across phases.'
                    : lifestyleObs.exerciseMoodRate >= 50
                    ? `On ${lifestyleObs.exerciseMoodRate}% of your active days (20+ mins movement) you logged a calm or happy mood. Regular gentle exercise appears to positively influence your wellbeing.`
                    : `You had ${lifestyleObs.activeDays} active days. Keep logging to build a clearer mood-exercise pattern over time.`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pattern & 'Something Seems Different' List */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sakhi-600" />
          <h3 className="text-sm font-bold text-slate-800">
            Detected Personal Patterns &amp; Awareness
          </h3>
        </div>

        {patterns.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            No deviations detected. You are starting fresh with a clean slate! Continue checking in daily.
          </div>
        ) : (
          <div className="grid gap-3">
            {patterns.map((p) => (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border ${
                  p.severity === 'CONSIDER_CHECKING'
                    ? 'bg-rose-50/50 border-rose-200'
                    : p.severity === 'NOTICE'
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-slate-50/50 border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">{p.title}</span>
                  {getSeverityPill(p.severity)}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{p.observation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
