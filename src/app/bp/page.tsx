'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  HeartPulse,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Plus,
  Clock,
  Calendar,
  ChevronRight,
  Info,
  CheckCircle2,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  Legend,
} from 'recharts';
import { BloodPressureLog, BpPredictionWarning, CycleStats } from '@/types';
import { COMMON_BP_SYMPTOMS } from '@/lib/bp-engine';

export default function BloodPressurePage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<BloodPressureLog[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [cycleStats, setCycleStats] = useState<CycleStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [systolic, setSystolic] = useState<number>(115);
  const [diastolic, setDiastolic] = useState<number>(75);
  const [pulse, setPulse] = useState<number>(72);
  const [timeStr, setTimeStr] = useState<string>('09:00 AM');
  const [feltFluctuations, setFeltFluctuations] = useState<boolean>(false);
  const [fluctuationType, setFluctuationType] = useState<'none' | 'drop' | 'spike' | 'irregular'>('none');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [posture, setPosture] = useState<'Sitting' | 'Lying down' | 'Standing'>('Sitting');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchBpData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bp');
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs);
        setAnalysis(json.data.analysis);
        setCycleStats(json.data.cycleStats);
      }
    } catch (err) {
      console.error('Error fetching BP telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBpData();
  }, []);

  const handleToggleSymptom = (label: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    );
  };

  const handleSaveBp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/bp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systolic,
          diastolic,
          pulse,
          time: timeStr,
          feltFluctuations,
          fluctuationType: feltFluctuations ? fluctuationType : 'none',
          symptoms: selectedSymptoms,
          posture,
          notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        // Reset form
        setSelectedSymptoms([]);
        setFeltFluctuations(false);
        setNotes('');
        await fetchBpData();
      }
    } catch (err) {
      console.error('Failed to save BP log:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this blood pressure log?')) return;
    try {
      const res = await fetch(`/api/bp?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        await fetchBpData();
      }
    } catch (err) {
      console.error('Failed to delete BP log:', err);
    }
  };

  // Prepare chart telemetry reversed (chronological order)
  const chartData = [...logs].reverse().map((l) => ({
    date: l.date.slice(5), // MM-DD
    fullDate: l.date,
    systolic: l.systolic,
    diastolic: l.diastolic,
    pulse: l.pulse,
    fluctuation: l.feltFluctuations,
    symptoms: l.symptoms,
    category: l.category,
  }));

  const latestLog = logs[0] || null;
  const prediction: BpPredictionWarning = analysis?.prediction;

  // Real-time classification for form
  const getFormCategory = () => {
    if (systolic < 90 || diastolic < 60) return { label: 'Low (Hypotension)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (systolic >= 140 || diastolic >= 90) return { label: 'Stage 2 High', color: 'text-red-700 bg-red-50 border-red-200' };
    if (systolic >= 130 || diastolic >= 80) return { label: 'Stage 1 High', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    if (systolic >= 120 && diastolic < 80) return { label: 'Elevated', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    return { label: 'Normal / Optimal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* 1. Header & Quick Log Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-rose-100/70 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center text-white shadow-card">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                Blood Pressure & Circulation
              </h1>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                AI Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Track daily readings, dizziness, breathlessness & AI hormonal cycle warnings
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-semibold text-xs shadow-md hover:shadow-card active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Record BP Reading</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Latest Reading */}
        <div className="bg-white rounded-2xl p-4 border border-rose-100/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Latest Reading</span>
            <Activity className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            {latestLog ? `${latestLog.systolic}/${latestLog.diastolic}` : '--/--'}
            <span className="text-xs font-normal text-slate-400 ml-1">mmHg</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-500 truncate">
            {latestLog?.category || 'No logs yet'}
          </div>
        </div>

        {/* 14-Day Average */}
        <div className="bg-white rounded-2xl p-4 border border-rose-100/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">14-Day Average</span>
            <TrendingDown className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            {analysis && logs.length > 0 ? `${analysis.averageSystolic}/${analysis.averageDiastolic}` : '--/--'}
            <span className="text-xs font-normal text-slate-400 ml-1">mmHg</span>
          </div>
          <div className="text-[11px] font-semibold text-emerald-600">
            {analysis && logs.length > 0 ? `Pulse ~${analysis.averagePulse} bpm` : 'Pulse -- bpm'}
          </div>
        </div>

        {/* Fluctuations Reported */}
        <div className="bg-white rounded-2xl p-4 border border-rose-100/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fluctuation Rate</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            {analysis?.fluctuationRatePercent ?? 0}%
            <span className="text-xs font-normal text-slate-400 ml-1">of days</span>
          </div>
          <div className="text-[11px] font-semibold text-amber-700">
            {analysis?.fluctuationCount ?? 0} sudden swings reported
          </div>
        </div>

        {/* Cycle Phase Connection */}
        <div className="bg-white rounded-2xl p-4 border border-rose-100/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cycle Context</span>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">
            {cycleStats && cycleStats.totalCyclesTracked > 0 ? `Day ${cycleStats.currentCycleDay}` : 'Ready'}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {cycleStats && cycleStats.totalCyclesTracked > 0 ? `${cycleStats.currentPhase} Phase Tone` : 'Clean Baseline'}
          </div>
        </div>
      </div>

      {/* 3. AI Predictive Model & Daily Warning Advisory Card */}
      {/* 3. Simple AI Daily Warning & Note Card */}
      {prediction && (
        <div
          className={`rounded-3xl p-5 border shadow-2xs transition-all ${
            prediction.riskLevel === 'urgent_clinical' || prediction.riskLevel === 'moderate_warning'
              ? 'bg-amber-50/70 border-amber-200/90 text-slate-800'
              : prediction.riskLevel === 'mild_alert'
              ? 'bg-yellow-50/60 border-yellow-200/90 text-slate-800'
              : 'bg-emerald-50/70 border-emerald-200/90 text-slate-800'
          }`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-xs mt-0.5 sm:mt-0 ${
                  prediction.riskLevel === 'urgent_clinical' || prediction.riskLevel === 'moderate_warning'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 border border-slate-200/60 text-slate-700">
                    AI Today Note
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Expected: {prediction.predictedRange}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {prediction.headline}
                </h2>
                <p className="text-xs text-slate-600">
                  {prediction.summary}
                </p>
              </div>
            </div>

            {/* Quick Sorted Action Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 md:pt-0">
              {prediction.recommendations.map((rec, i) => (
                <span
                  key={i}
                  className="inline-flex items-center text-xs bg-white text-slate-700 font-medium px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs"
                >
                  {rec}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Cute Interactive Wave Line Chart */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-rose-100/70 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Blood Pressure Trends & Normal Band</span>
              <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                Cute Dual Curve
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Green shaded band indicates optimal resting blood pressure (90-120 / 60-80 mmHg)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-xs" />
              <span className="text-slate-600 font-medium">Systolic (mmHg)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block shadow-xs" />
              <span className="text-slate-600 font-medium">Diastolic (mmHg)</span>
            </div>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-center p-6 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Activity className="w-8 h-8 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No vitals readings recorded yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Tap &apos;Record BP Reading&apos; above to record your first measurement. Your daily trend curve and optimal stability zone will appear here.
            </p>
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis domain={[50, 160]} stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} />
                {/* Optimal zone shaded band */}
                <ReferenceArea y1={60} y2={120} fill="#ecfdf5" fillOpacity={0.6} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-lg text-xs space-y-1.5">
                          <div className="font-bold text-slate-800 flex items-center justify-between gap-4">
                            <span>{data.fullDate}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {data.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-700">
                            <span className="text-rose-600 font-bold">Sys: {data.systolic}</span>
                            <span className="text-indigo-600 font-bold">Dia: {data.diastolic}</span>
                            {data.pulse && <span className="text-emerald-600 font-medium">Pulse: {data.pulse} bpm</span>}
                          </div>
                          {data.fluctuation && (
                            <div className="text-amber-700 text-[10px] font-semibold bg-amber-50 px-2 py-0.5 rounded-md">
                              ⚠️ Felt sudden fluctuation on this day
                            </div>
                          )}
                          {data.symptoms && data.symptoms.length > 0 && (
                            <div className="pt-1 border-t border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">
                                Felt Symptoms:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {data.symptoms.map((s: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-100"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                  name="Systolic"
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                  name="Diastolic"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 5. Reported Symptoms Breakdown */}
      {analysis?.symptomFrequency && Object.keys(analysis.symptomFrequency).length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-rose-100/70 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Symptoms Reported During BP Checks
            </h3>
            <span className="text-[11px] text-slate-400">Total logs studied: {logs.length}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(analysis.symptomFrequency as Record<string, number>).map(
              ([sym, count]) => {
                const meta = COMMON_BP_SYMPTOMS.find((s) => s.label === sym);
                return (
                  <div
                    key={sym}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700"
                  >
                    <span>{meta?.icon || '💫'}</span>
                    <span className="font-semibold">{sym}</span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full border border-rose-100">
                      {count}x
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* 6. Detailed Blood Pressure History Logs */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-rose-100/70 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Recent Blood Pressure Log History</h3>
          <span className="text-xs text-slate-400">{logs.length} readings recorded</span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-2 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
              <HeartPulse className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No blood pressure logs yet</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Start recording your daily systolic and diastolic readings. Your history and physiological rhythms will be tracked right here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-slate-50/60 p-2.5 rounded-2xl transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-slate-900 tracking-tight">
                      {log.systolic}/{log.diastolic} mmHg
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        log.category.includes('Low')
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : log.category.includes('High')
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {log.category}
                    </span>
                    {log.feltFluctuations && (
                      <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                        Fluctuation Felt
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{log.date}</span>
                    <span>•</span>
                    <span>{log.time}</span>
                    {log.pulse && (
                      <>
                        <span>•</span>
                        <span>Pulse: {log.pulse} bpm</span>
                      </>
                    )}
                    {log.cycleDay && (
                      <>
                        <span>•</span>
                        <span className="text-purple-600 font-medium">Cycle Day {log.cycleDay}</span>
                      </>
                    )}
                  </div>

                  {/* Symptoms chips */}
                  {log.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {log.symptoms.map((s, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium bg-rose-50/80 text-rose-700 px-2 py-0.5 rounded-md border border-rose-100"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {log.notes && (
                    <p className="text-xs text-slate-500 italic pt-0.5">&quot;{log.notes}&quot;</p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Record Blood Pressure Modal Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-500 flex items-center justify-center text-white">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record Blood Pressure</h3>
                  <p className="text-xs text-slate-400">Keep track of readings & how you felt</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBp} className="space-y-4">
              {/* Live Preview Category */}
              <div className="flex items-center justify-between p-3 rounded-2xl border bg-slate-50/70">
                <span className="text-xs font-bold text-slate-700">Classification Preview:</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getFormCategory().color}`}
                >
                  {getFormCategory().label}
                </span>
              </div>

              {/* Number Inputs: Systolic, Diastolic, Pulse */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">
                    Systolic
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="220"
                    value={systolic}
                    onChange={(e) => setSystolic(Number(e.target.value))}
                    required
                    className="w-full text-center font-black text-lg p-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center">Top (mmHg)</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">
                    Diastolic
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="140"
                    value={diastolic}
                    onChange={(e) => setDiastolic(Number(e.target.value))}
                    required
                    className="w-full text-center font-black text-lg p-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center">Bottom (mmHg)</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">
                    Pulse (BPM)
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="180"
                    value={pulse}
                    onChange={(e) => setPulse(Number(e.target.value))}
                    className="w-full text-center font-black text-lg p-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 block text-center">Heart rate</span>
                </div>
              </div>

              {/* Fluctuations Question */}
              <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Did you feel sudden blood pressure fluctuations today?</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={feltFluctuations}
                    onChange={(e) => setFeltFluctuations(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400"
                  />
                </div>
                {feltFluctuations && (
                  <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-amber-800">What did you feel?</span>
                    <select
                      value={fluctuationType}
                      onChange={(e) => setFluctuationType(e.target.value as any)}
                      className="text-xs bg-white border border-amber-300 rounded-xl px-2 py-1 text-slate-800 focus:outline-none"
                    >
                      <option value="drop">Sudden Drop / Faint feeling</option>
                      <option value="spike">Sudden Spike / Racing head</option>
                      <option value="irregular">Unstable swings across day</option>
                    </select>
                  </div>
                )}
              </div>

              {/* How did you feel? Symptoms chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>How did you feel? (Symptoms Checklist)</span>
                  <span className="text-[10px] text-slate-400">Select all that apply</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_BP_SYMPTOMS.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym.label);
                    return (
                      <button
                        key={sym.id}
                        type="button"
                        onClick={() => handleToggleSymptom(sym.label)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                          isSelected
                            ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm">{sym.icon}</span>
                        <span className="truncate">{sym.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Posture & Time */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Position / Posture</label>
                  <select
                    value={posture}
                    onChange={(e) => setPosture(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-2xl border border-slate-200 bg-white"
                  >
                    <option value="Sitting">Sitting comfortably</option>
                    <option value="Lying down">Lying down</option>
                    <option value="Standing">Standing upright</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Time of Day</label>
                  <input
                    type="text"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    placeholder="e.g. 09:00 AM"
                    className="w-full text-xs p-2.5 rounded-2xl border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Notes / Trigger Context</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Felt dizzy standing up before lunch, skipped water"
                  className="w-full text-xs p-2.5 rounded-2xl border border-slate-200"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-semibold text-xs shadow-md hover:shadow-card disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Reading'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
