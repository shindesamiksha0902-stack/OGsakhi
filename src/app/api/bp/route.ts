import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { classifyBloodPressure, analyzeBloodPressure } from '@/lib/bp-engine';
import { DataRepository } from '@/lib/data-repository';
import { ServerStorage } from '@/lib/server-storage';
import { BloodPressureLog } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Supabase helpers ────────────────────────────────────────────────────────

async function dbGetBpLogs(email: string): Promise<BloodPressureLog[] | null> {
  try {
    const { data, error } = await supabase
      .from('User')
      .select('bp_data')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    if (error) {
      if (error.code === '42703') return null; // column doesn't exist yet
      console.error('[BP] dbGetBpLogs error:', error.message);
      return null;
    }
    return Array.isArray(data?.bp_data) ? (data.bp_data as BloodPressureLog[]) : null;
  } catch {
    return null;
  }
}

async function dbSaveBpLogs(email: string, logs: BloodPressureLog[]): Promise<boolean> {
  try {
    const normalized = email.trim().toLowerCase();
    // Try update first (user exists)
    const { data: existing } = await supabase
      .from('User')
      .select('id')
      .eq('email', normalized)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('User')
        .update({ bp_data: logs, updatedAt: new Date().toISOString() })
        .eq('email', normalized);
      if (error) { console.error('[BP] dbSaveBpLogs update error:', error.message); return false; }
    } else {
      const { error } = await supabase
        .from('User')
        .insert({
          email: normalized,
          passwordHash: 'app-auto',
          name: normalized.split('@')[0],
          bp_data: logs,
          onboardingCompleted: false,
        });
      if (error) { console.error('[BP] dbSaveBpLogs insert error:', error.message); return false; }
    }
    return true;
  } catch (e) {
    console.error('[BP] dbSaveBpLogs exception:', e);
    return false;
  }
}

function hydrateMemory(email: string) {
  try {
    const user = ServerStorage.getUser(email);
    if (user) DataRepository.loadUserData(user, email);
  } catch {}
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email) {
      hydrateMemory(email);

      const supaLogs = await dbGetBpLogs(email);
      if (supaLogs !== null) {
        // Load supabase logs into DataRepository for analysis
        DataRepository.loadUserData({ bpLogs: supaLogs }, email);
        const stats    = DataRepository.getCycleStats();
        const analysis = analyzeBloodPressure(supaLogs, stats.currentCycleDay, stats.currentPhase);
        return NextResponse.json({ success: true, data: { logs: supaLogs, analysis, cycleStats: stats } });
      }
      // Supabase column not yet available — fall through to in-memory
    }

    const logs      = DataRepository.getBpLogs();
    const analysis  = DataRepository.getBpAnalysis();
    const cycleStats = DataRepository.getCycleStats();
    return NextResponse.json({ success: true, data: { logs, analysis, cycleStats } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { systolic, diastolic, pulse, feltFluctuations, fluctuationType,
            symptoms, posture, notes, time, email } = body;

    if (!systolic || !diastolic) {
      return NextResponse.json({ success: false, error: 'Systolic and Diastolic required' }, { status: 400 });
    }

    if (email) hydrateMemory(email);
    const stats = DataRepository.getCycleStats();

    const todayStr  = new Date().toISOString().split('T')[0];
    const timeValue = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const category  = classifyBloodPressure(Number(systolic), Number(diastolic));

    const newLog: BloodPressureLog = {
      id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: todayStr,
      time: timeValue,
      systolic:        Number(systolic),
      diastolic:       Number(diastolic),
      pulse:           pulse ? Number(pulse) : undefined,
      feltFluctuations: Boolean(feltFluctuations),
      fluctuationType: fluctuationType || (feltFluctuations ? 'drop' : 'none'),
      symptoms:        Array.isArray(symptoms) ? symptoms : [],
      posture:         posture || 'Sitting',
      notes:           notes || '',
      category,
      cycleDay:  stats.currentCycleDay,
      cyclePhase: stats.currentPhase,
    };

    if (email) {
      const existing = (await dbGetBpLogs(email)) ?? [];
      const updated  = [newLog, ...existing];
      const saved    = await dbSaveBpLogs(email, updated);

      if (saved) {
        DataRepository.loadUserData({ bpLogs: updated }, email);
        const analysis = analyzeBloodPressure(updated, stats.currentCycleDay, stats.currentPhase);
        return NextResponse.json({ success: true, data: { log: newLog, analysis } });
      }
      // Supabase failed — still save to in-memory as best-effort
      console.error('[BP] Supabase save failed, using in-memory fallback');
    }

    // In-memory fallback (no email or Supabase unavailable)
    const saved      = DataRepository.addBpLog({ date: todayStr, time: timeValue, systolic: Number(systolic),
      diastolic: Number(diastolic), pulse: pulse ? Number(pulse) : undefined,
      feltFluctuations: Boolean(feltFluctuations), fluctuationType: fluctuationType || 'none',
      symptoms: Array.isArray(symptoms) ? symptoms : [], posture: posture || 'Sitting', notes: notes || '' }, email);
    return NextResponse.json({ success: true, data: { log: saved, analysis: DataRepository.getBpAnalysis() } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id    = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    if (email) {
      const existing = (await dbGetBpLogs(email)) ?? [];
      const updated  = existing.filter((l) => l.id !== id);
      await dbSaveBpLogs(email, updated);
      DataRepository.loadUserData({ bpLogs: updated }, email);
      const stats    = DataRepository.getCycleStats();
      const analysis = analyzeBloodPressure(updated, stats.currentCycleDay, stats.currentPhase);
      return NextResponse.json({ success: true, removed: true, data: { analysis } });
    }

    const removed = DataRepository.deleteBpLog(id);
    return NextResponse.json({ success: true, removed, data: { analysis: DataRepository.getBpAnalysis() } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
