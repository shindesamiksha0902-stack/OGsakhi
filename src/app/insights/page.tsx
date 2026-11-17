'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  Sparkles, AlertCircle, AlertTriangle, CheckCircle,
  Droplet, Moon, Zap, Activity, Heart, HeartPulse,
  TrendingUp, TrendingDown, Clock, Calendar,
} from 'lucide-react';
import {
  CycleRecord, CycleStats, DailyLogData,
  DetectedPatternItem, DeviationSeverity, BloodPressureLog,
} from '@/types';
import { useAuth } from '@/context/AuthContext';

// ─── helpers ──────────────────────────────────────────────────────────────────
const ENERGY_SCALE: Record<string, number> = {
  VERY_LOW: 1, LOW: 2, NORMAL: 3, HIGH: 4, VERY_HIGH: 5,
};
const MOOD_SCALE: Record<string, number> = {
  Low: 1, Irritated: 2, Neutral: 3, Calm: 4, Happy: 5,
};

function phaseForDay(day: number) {
  if (day <= 5)  return 'Menstrual';
  if (day <= 13) return 'Follicular';
  if (day <= 16) return 'Ovulatory';
  return 'Luteal';
}
function avg(arr: number[]) {
  return arr.length
    ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
    : null;
}
function symName(s: any): string {
  return typeof s === 'string' ? s : (s?.symptomName ?? '');
}

// ─── severity pill ────────────────────────────────────────────────────────────
function SeverityPill({ sev }: { sev: DeviationSeverity }) {
  if (sev === 'CONSIDER_CHECKING')
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
        <AlertTriangle className="w-3.5 h-3.5" /> Consider Checking
      </span>
    );
  if (sev === 'NOTICE')
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <AlertCircle className="w-3.5 h-3.5" /> Notice
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
      <CheckCircle className="w-3.5 h-3.5" /> Normal
    </span>
  );
}

// ─── pattern card ─────────────────────────────────────────────────────────────
function PatternCard({
  icon, title, observation, basis, color, empty,
}: {
  icon: React.ReactNode;
  title: string;
  observation: string;
  basis?: string;
  color?: string;
  empty?: boolean;
}) {
  return (
    <div className={`p-4 rounded-2xl border ${empty ? 'bg-slate-50/60 border-dashed border-slate-200' : `${color ?? 'bg-white border-slate-100'}`} space-y-2`}>
      <div className="flex items-center gap-2">
        <div className="shrink-0">{icon}</div>
        <span className="text-sm font-bold text-slate-800">{title}</span>
      </div>
      <p className={`text-xs leading-relaxed ${empty ? 'text-slate-400 italic' : 'text-slate-600'}`}>
        {observation}
      </p>
      {basis && !empty && (
        <p className="text-[10px] text-slate-400 font-medium">📊 {basis}</p>
      )}
    </div>
  );
}

// ─── timeline event ───────────────────────────────────────────────────────────
type TimelineEvent = {
  date: string;
  type: 'period' | 'bp' | 'wellness' | 'symptom';
  label: string;
  sub?: string;
  color: string;
  icon: string;
};

export default function InsightsPage() {
  const { user } = useAuth();

  // ─ state ──
  const [loading, setLoading]               = useState(true);
  const [activeTab, setActiveTab]           = useState<'overview' | 'patterns' | 'timeline'>('overview');
  const [cycles, setCycles]                 = useState<CycleRecord[]>([]);
  const [logs, setLogs]                     = useState<DailyLogData[]>([]);
  const [bpLogs, setBpLogs]                 = useState<BloodPressureLog[]>([]);
  const [stats, setStats]                   = useState<CycleStats | null>(null);
  const [patterns, setPatterns]             = useState<DetectedPatternItem[]>([]);
  const [overallSeverity, setOverallSeverity] = useState<DeviationSeverity>('NORMAL');
  const [baselines, setBaselines]           = useState<any>(null);

  // ─ fetch ──
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const q = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
        const [cRes, pRes, lRes, bRes] = await Promise.all([
          fetch(`/api/cycles${q}`),
          fetch(`/api/analytics/patterns${q}`),
          fetch(`/api/logs${q}`),
          fetch(`/api/bp${q}`),
        ]);
        const [cJ, pJ, lJ, bJ] = await Promise.all([cRes.json(), pRes.json(), lRes.json(), bRes.json()]);
        if (cJ.success) { setCycles(cJ.data.cycles); setStats(cJ.data.stats); }
        if (pJ.success) { setPatterns(pJ.data.patterns); setOverallSeverity(pJ.data.overallSeverity); setBaselines(pJ.data.baselines); }
        if (lJ.success) setLogs(lJ.data ?? []);
        if (bJ.success) setBpLogs(bJ.data?.logs ?? []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  // ─── OVERVIEW computations ───────────────────────────────────────────────
  const cycleChartData = cycles.filter(c => c.lengthDays).map((c, i) => ({
    cycle: `C${i + 1}`, length: c.lengthDays, period: c.periodDays || 5,
  }));

  const sortedCycles = [...cycles].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  function logPhase(log: DailyLogData): string | null {
    const ld = new Date(log.date).getTime();
    const c = sortedCycles.find(c => {
      const s = new Date(c.startDate).getTime();
      const e = c.cycleEndDate ? new Date(c.cycleEndDate).getTime() : s + 35 * 86400000;
      return ld >= s && ld <= e;
    });
    if (!c) return null;
    return phaseForDay(Math.floor((ld - new Date(c.startDate).getTime()) / 86400000) + 1);
  }

  const phaseComparisonData = (() => {
    if (logs.length < 5 || cycles.length === 0) return [];
    const buckets: Record<string, { energy: number[]; mood: number[] }> = {
      Menstrual: { energy: [], mood: [] }, Follicular: { energy: [], mood: [] },
      Ovulatory: { energy: [], mood: [] }, Luteal:    { energy: [], mood: [] },
    };
    logs.forEach(l => {
      const ph = logPhase(l);
      if (!ph) return;
      if (l.energyLevel && ENERGY_SCALE[l.energyLevel] !== undefined) buckets[ph].energy.push(ENERGY_SCALE[l.energyLevel]);
      if (l.moodPrimary  && MOOD_SCALE[l.moodPrimary]  !== undefined) buckets[ph].mood.push(MOOD_SCALE[l.moodPrimary]);
    });
    return ['Menstrual','Follicular','Ovulatory','Luteal']
      .map(ph => ({ phase: ph, energy: avg(buckets[ph].energy), mood: avg(buckets[ph].mood) }))
      .filter(p => p.energy !== null || p.mood !== null);
  })();

  const symptomData = baselines?.topSymptoms || [];

  // ─── PATTERN computations ─────────────────────────────────────────────────

  // 1. Cycle & Symptoms — which symptoms appear most before period
  const cycleSympPattern = (() => {
    if (logs.length < 10 || cycles.length < 1) return null;
    const lutealLogs = logs.filter(l => logPhase(l) === 'Luteal');
    const otherLogs  = logs.filter(l => { const p = logPhase(l); return p && p !== 'Luteal'; });
    if (lutealLogs.length < 3) return null;
    const count = (arr: DailyLogData[]) => {
      const map: Record<string,number> = {};
      arr.forEach(l => (l.symptoms ?? []).forEach((s: any) => { const n = symName(s); if (n) map[n] = (map[n]||0)+1; }));
      return map;
    };
    const lut = count(lutealLogs);
    const oth = count(otherLogs);
    const lutRate = (sym: string) => (lut[sym]||0) / lutealLogs.length;
    const othRate = (sym: string) => (oth[sym]||0) / Math.max(otherLogs.length, 1);
    const topSym = Object.keys(lut).sort((a,b) => lut[b]-lut[a])[0];
    if (!topSym) return null;
    const ratio = othRate(topSym) > 0 ? lutRate(topSym) / othRate(topSym) : 10;
    if (lutRate(topSym) < 0.15) return null;
    return {
      symptom: topSym,
      lutealCount: lut[topSym],
      lutealDays: lutealLogs.length,
      moreFrequent: ratio >= 1.5,
      basis: `${logs.length} logged days across ${cycles.length} cycle(s)`,
    };
  })();

  // 2. Sleep & Energy
  const sleepEnergyPattern = (() => {
    const shortSleep = logs.filter(l => (l.sleepHours ?? 7) < 6.5);
    if (shortSleep.length < 3) return null;
    const lowEnergy = shortSleep.filter(l => ['LOW','VERY_LOW'].includes(l.energyLevel ?? ''));
    const rate = Math.round((lowEnergy.length / shortSleep.length) * 100);
    const goodSleep = logs.filter(l => (l.sleepHours ?? 0) >= 7.5);
    const goodEnergy = goodSleep.filter(l => ['HIGH','VERY_HIGH'].includes(l.energyLevel ?? ''));
    const goodRate = goodSleep.length > 0 ? Math.round((goodEnergy.length / goodSleep.length) * 100) : 0;
    return { shortNights: shortSleep.length, lowEnergyRate: rate, goodEnergyRate: goodRate, basis: `${logs.length} days of data` };
  })();

  // 3. Mood & Stress
  const moodStressPattern = (() => {
    const withStress = logs.filter(l => l.stressLevel !== undefined && l.stressLevel !== null);
    if (withStress.length < 5) return null;
    const highStress = withStress.filter(l => (l.stressLevel ?? 0) >= 4);
    const negMood    = highStress.filter(l => ['Low','Irritated'].includes(l.moodPrimary ?? ''));
    const lowStress  = withStress.filter(l => (l.stressLevel ?? 5) <= 2);
    const posMood    = lowStress.filter(l => ['Calm','Happy'].includes(l.moodPrimary ?? ''));
    if (highStress.length < 2 && lowStress.length < 2) return null;
    const negRate = highStress.length > 0 ? Math.round((negMood.length / highStress.length) * 100) : 0;
    const posRate = lowStress.length  > 0 ? Math.round((posMood.length  / lowStress.length)  * 100) : 0;
    return { highStressDays: highStress.length, negMoodRate: negRate, lowStressDays: lowStress.length, posMoodRate: posRate, basis: `${withStress.length} days with stress logged` };
  })();

  // 4. Cycle & Blood Pressure
  const cycleBpPattern = (() => {
    if (bpLogs.length < 4) return null;
    const byPhase: Record<string, number[]> = { Menstrual:[], Follicular:[], Ovulatory:[], Luteal:[] };
    bpLogs.forEach(b => { if (b.cyclePhase && byPhase[b.cyclePhase]) byPhase[b.cyclePhase].push(b.systolic); });
    const avgs = Object.entries(byPhase)
      .map(([phase, vals]) => ({ phase, avg: avg(vals), n: vals.length }))
      .filter(p => p.avg !== null && p.n >= 1)
      .sort((a, b) => (b.avg as number) - (a.avg as number));
    if (avgs.length < 2) return null;
    const highest = avgs[0];
    const lowest  = avgs[avgs.length - 1];
    const diff = Math.round((highest.avg as number) - (lowest.avg as number));
    if (diff < 4) return null;
    return { highest, lowest, diff, basis: `${bpLogs.length} BP readings across phases` };
  })();

  // 5. Hydration & Headache (from logs)
  const hydrationPattern = (() => {
    if (logs.length < 5) return null;
    const lowWater = logs.filter(l => (l.waterIntakeMl ?? 2000) < 1500);
    if (lowWater.length < 2) return null;
    const withHeadache = lowWater.filter(l =>
      (l.symptoms ?? []).some((s: any) => symName(s).toLowerCase().includes('headache'))
    );
    const rate = Math.round((withHeadache.length / lowWater.length) * 100);
    return { lowWaterDays: lowWater.length, headacheRate: rate, basis: `${logs.length} logged days` };
  })();

  // ─── TIMELINE ────────────────────────────────────────────────────────────
  const timelineEvents: TimelineEvent[] = (() => {
    const events: TimelineEvent[] = [];

    logs.forEach(l => {
      if (l.isPeriodDay) {
        events.push({ date: l.date, type: 'period', icon: '🩸', label: 'Period day', sub: l.flowIntensity ? `Flow: ${l.flowIntensity}` : undefined, color: 'bg-rose-50 border-rose-200 text-rose-800' });
      }
      const parts: string[] = [];
      if (l.moodPrimary)  parts.push(`${l.moodPrimary} mood`);
      if (l.energyLevel)  parts.push(`${l.energyLevel.replace('_',' ').toLowerCase()} energy`);
      if (l.sleepHours)   parts.push(`${l.sleepHours}h sleep`);
      if (l.waterIntakeMl) parts.push(`${l.waterIntakeMl}ml water`);
      if (parts.length > 0) {
        events.push({ date: l.date, type: 'wellness', icon: '✨', label: parts.join(' · '), sub: l.stressLevel ? `Stress: ${l.stressLevel}/5` : undefined, color: 'bg-slate-50 border-slate-200 text-slate-700' });
      }
      const syms = (l.symptoms ?? []).map(symName).filter(Boolean);
      if (syms.length > 0) {
        events.push({ date: l.date, type: 'symptom', icon: '💊', label: `Symptoms: ${syms.join(', ')}`, color: 'bg-amber-50 border-amber-200 text-amber-800' });
      }
    });

    bpLogs.forEach(b => {
      events.push({
        date: b.date, type: 'bp', icon: '❤️',
        label: `BP ${b.systolic}/${b.diastolic} mmHg · ${b.category}`,
        sub: b.pulse ? `Pulse: ${b.pulse} bpm` : undefined,
        color: b.category?.includes('High') ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-indigo-50 border-indigo-200 text-indigo-800',
      });
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 60);
  })();

  // Group timeline by date
  const timelineByDate = timelineEvents.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  const sortedDates = Object.keys(timelineByDate).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

  function formatDate(d: string) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (d === today) return 'Today';
    if (d === yesterday) return 'Yesterday';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ─ tabs config ─
  const TABS = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'patterns', label: 'Patterns',  icon: <Sparkles  className="w-3.5 h-3.5" /> },
    { id: 'timeline', label: 'Timeline',  icon: <Clock     className="w-3.5 h-3.5" /> },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-slate-400">
        <Sparkles className="w-5 h-5 text-sakhi-500 animate-spin mr-2" />
        Loading your wellness data…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Your Wellness Analytics</h1>
          <p className="text-xs text-slate-500">Personalized trends, cycle rhythms, and lifestyle observations</p>
        </div>
        <SeverityPill sev={overallSeverity} />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-sakhi-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB 1 — OVERVIEW
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Avg Cycle', value: `${stats?.averageCycleLength ?? 28} days`, sub: stats && stats.totalCyclesTracked > 0 ? 'Personalised' : 'Default baseline', color: 'text-slate-800' },
              { label: 'Variation', value: `±${stats?.cycleVariationDays ?? 0} days`, sub: (stats?.cycleVariationDays ?? 0) <= 3 ? 'High regularity' : 'Some variation', color: 'text-sakhi-600' },
              { label: 'Period', value: `${stats?.averagePeriodLength ?? 5} days`, sub: 'Avg duration', color: 'text-slate-800' },
              { label: 'Sleep', value: baselines?.avgSleep ? `${baselines.avgSleep} hrs` : '--', sub: 'Nightly avg', color: 'text-indigo-600' },
            ].map(c => (
              <div key={c.label} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-xs">
                <span className="text-xs font-semibold text-slate-400 uppercase">{c.label}</span>
                <div className={`text-xl font-extrabold mt-1 ${c.color}`}>{c.value}</div>
                <span className="text-[11px] text-slate-500">{c.sub}</span>
              </div>
            ))}
          </div>

          {/* Cycle History Chart */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🌸</span>
              <h3 className="text-sm font-bold text-slate-800">Historical Cycle Lengths</h3>
            </div>
            <p className="text-xs text-slate-400">Your cycle lengths compared to your {stats?.averageCycleLength ?? 28}-day baseline</p>
            {cycleChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                Log at least one completed cycle to see your history chart.
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cycleChartData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" vertical={false} />
                    <XAxis dataKey="cycle" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[24,34]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius:'12px', border:'1px solid #fecdd3', fontSize:'12px' }} formatter={(v: any) => [`${v} days`, 'Length']} />
                    <ReferenceLine y={stats?.averageCycleLength ?? 28} stroke="#fda4af" strokeDasharray="4 4" label={{ value:`Avg`, fill:'#e11d48', fontSize:10, position:'insideTopRight' }} />
                    <Area type="monotone" dataKey="length" stroke="#f43f5e" strokeWidth={3} fill="url(#roseGrad)" dot={{ r:5, fill:'#f43f5e', stroke:'#fff', strokeWidth:2 }} activeDot={{ r:7 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Energy & Mood chart */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base">✨</span>
              <h3 className="text-sm font-bold text-slate-800">Energy &amp; Mood Across Phases</h3>
            </div>
            <p className="text-xs text-slate-400">Averaged from your actual daily check-ins per phase</p>
            {phaseComparisonData.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center gap-2 text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <span className="text-2xl">✨</span>
                Log mood &amp; energy daily to build your personal phase map.
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={phaseComparisonData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="phase" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[1,5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius:'12px', border:'1px solid #e2e8f0', fontSize:'12px' }} formatter={(v: any, n: any) => [`${v}/5`, n === 'energy' ? '⚡ Energy' : '😊 Mood']} />
                    <Line type="monotone" dataKey="energy" stroke="#10b981" strokeWidth={3.5} dot={{ r:5, fill:'#10b981', stroke:'#fff', strokeWidth:2 }} name="energy" />
                    <Line type="monotone" dataKey="mood"   stroke="#f59e0b" strokeWidth={3.5} dot={{ r:5, fill:'#f59e0b', stroke:'#fff', strokeWidth:2 }} name="mood"   />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Symptoms */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Most Logged Symptoms</h3>
            {symptomData.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                No symptoms logged yet.
              </div>
            ) : (
              <div className="space-y-2">
                {symptomData.map((item: any) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-700">
                      <span className="font-medium">{item.name}</span>
                      <span className="font-semibold text-slate-500">{item.count}×</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-sakhi-500 rounded-full" style={{ width: `${Math.min(100, item.count * 12)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 2 — PATTERNS
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'patterns' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 px-1">
            Observations are computed only from data you have logged. Nothing is assumed or fabricated.
          </p>

          {/* Pattern 1: Cycle & Symptoms */}
          {cycleSympPattern ? (
            <PatternCard
              icon={<span className="text-xl">🩸</span>}
              title="Cycle & Symptoms"
              observation={
                cycleSympPattern.moreFrequent
                  ? `${cycleSympPattern.symptom} appears on ${Math.round((cycleSympPattern.lutealCount / cycleSympPattern.lutealDays) * 100)}% of your luteal (pre-period) days — noticeably more than in other phases. This is a common hormonal pattern.`
                  : `${cycleSympPattern.symptom} has appeared ${cycleSympPattern.lutealCount} time(s) in your luteal phase. Keep logging to confirm whether it's phase-related.`
              }
              basis={cycleSympPattern.basis}
              color="bg-rose-50/60 border-rose-200"
            />
          ) : (
            <PatternCard
              icon={<span className="text-xl">🩸</span>}
              title="Cycle & Symptoms"
              observation="Log symptoms daily across 2+ cycles to see if any appear more frequently at certain points in your cycle."
              empty
            />
          )}

          {/* Pattern 2: Sleep & Energy */}
          {sleepEnergyPattern ? (
            <PatternCard
              icon={<Moon className="w-5 h-5 text-indigo-500" />}
              title="Sleep & Energy"
              observation={
                sleepEnergyPattern.lowEnergyRate >= 50
                  ? `On ${sleepEnergyPattern.lowEnergyRate}% of your nights with under 6.5 hours of sleep, you logged low energy. Nights with 7.5+ hours are followed by high energy ${sleepEnergyPattern.goodEnergyRate}% of the time.`
                  : `You had ${sleepEnergyPattern.shortNights} short-sleep nights. Your energy appears resilient — low-sleep nights only led to lower energy ${sleepEnergyPattern.lowEnergyRate}% of the time.`
              }
              basis={sleepEnergyPattern.basis}
              color="bg-indigo-50/60 border-indigo-200"
            />
          ) : (
            <PatternCard
              icon={<Moon className="w-5 h-5 text-indigo-400" />}
              title="Sleep & Energy"
              observation="Log sleep hours and energy level for at least 5 days to see how your sleep affects your daytime energy."
              empty
            />
          )}

          {/* Pattern 3: Mood & Stress */}
          {moodStressPattern ? (
            <PatternCard
              icon={<span className="text-xl">🧠</span>}
              title="Mood & Stress"
              observation={
                moodStressPattern.negMoodRate >= 40
                  ? `On ${moodStressPattern.negMoodRate}% of your high-stress days (stress ≥4) you also logged a low or irritated mood. On low-stress days, ${moodStressPattern.posMoodRate}% of moods were calm or happy.`
                  : `You logged ${moodStressPattern.highStressDays} high-stress days. Your mood has held up well under stress — only ${moodStressPattern.negMoodRate}% of those days had a negative mood.`
              }
              basis={moodStressPattern.basis}
              color="bg-purple-50/60 border-purple-200"
            />
          ) : (
            <PatternCard
              icon={<span className="text-xl">🧠</span>}
              title="Mood & Stress"
              observation="Log your stress level and mood together for at least 5 days to discover how stress influences your emotional state."
              empty
            />
          )}

          {/* Pattern 4: Cycle & Blood Pressure */}
          {cycleBpPattern ? (
            <PatternCard
              icon={<HeartPulse className="w-5 h-5 text-rose-500" />}
              title="Cycle & Blood Pressure"
              observation={`Your average systolic BP is highest in the ${cycleBpPattern.highest.phase} phase (~${cycleBpPattern.highest.avg} mmHg) and lowest in the ${cycleBpPattern.lowest.phase} phase (~${cycleBpPattern.lowest.avg} mmHg) — a ${cycleBpPattern.diff} mmHg difference. Hormonal fluctuations commonly influence blood pressure.`}
              basis={cycleBpPattern.basis}
              color="bg-rose-50/60 border-rose-200"
            />
          ) : (
            <PatternCard
              icon={<HeartPulse className="w-5 h-5 text-rose-400" />}
              title="Cycle & Blood Pressure"
              observation="Log at least 4 BP readings across different cycle phases to see how your blood pressure varies with your hormonal cycle."
              empty
            />
          )}

          {/* Pattern 5: Hydration & Headaches */}
          {hydrationPattern ? (
            <PatternCard
              icon={<Droplet className="w-5 h-5 text-sky-500" />}
              title="Hydration & Headaches"
              observation={
                hydrationPattern.headacheRate >= 35
                  ? `On ${hydrationPattern.headacheRate}% of your low-water days (under 1500 ml) you also logged a headache. Staying hydrated appears to help you avoid tension headaches.`
                  : `You had ${hydrationPattern.lowWaterDays} low-hydration days. Your headache rate on those days is ${hydrationPattern.headacheRate}% — relatively low. Keep maintaining good water intake.`
              }
              basis={hydrationPattern.basis}
              color="bg-sky-50/60 border-sky-200"
            />
          ) : (
            <PatternCard
              icon={<Droplet className="w-5 h-5 text-sky-400" />}
              title="Hydration & Headaches"
              observation="Log water intake and symptoms for at least 5 days to see if dehydration correlates with your headaches."
              empty
            />
          )}

          {/* Detected Patterns from pattern-detector service */}
          {patterns.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">AI Engine Observations</h3>
              {patterns.map(p => (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border ${
                    p.severity === 'CONSIDER_CHECKING' ? 'bg-rose-50/50 border-rose-200'
                    : p.severity === 'NOTICE'          ? 'bg-amber-50/40 border-amber-200'
                    :                                    'bg-slate-50/50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">{p.title}</span>
                    <SeverityPill sev={p.severity} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{p.observation}</p>
                </div>
              ))}
            </div>
          )}

          {!cycleSympPattern && !sleepEnergyPattern && !moodStressPattern && !cycleBpPattern && !hydrationPattern && patterns.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <span className="text-3xl block">🌱</span>
              <p className="font-semibold text-slate-600">Your pattern garden is growing</p>
              <p>Use the Quick Check-in daily. Patterns appear after 7–10 days of consistent logging.</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 3 — TIMELINE
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'timeline' && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500 px-1 pb-2">
            Your personal health timeline — all logged events in one place.
          </p>

          {sortedDates.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <span className="text-3xl block">📅</span>
              <p className="font-semibold text-slate-600">No events yet</p>
              <p>Start logging daily check-ins, periods, and BP readings to populate your timeline.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map(date => (
                <div key={date}>
                  {/* Date header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-sakhi-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-600">{formatDate(date)}</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  {/* Events for this date */}
                  <div className="pl-4 space-y-2">
                    {timelineByDate[date].map((ev, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs ${ev.color}`}
                      >
                        <span className="text-base leading-none shrink-0 mt-0.5">{ev.icon}</span>
                        <div>
                          <p className="font-semibold leading-snug">{ev.label}</p>
                          {ev.sub && <p className="text-[11px] opacity-70 mt-0.5">{ev.sub}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-center text-[11px] text-slate-400 py-2">Showing last 60 events</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
