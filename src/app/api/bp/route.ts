import { NextResponse } from 'next/server';
import { classifyBloodPressure, analyzeBloodPressure } from '@/lib/bp-engine';
import { DataRepository } from '@/lib/data-repository';
import { dbRead, dbWrite, dbMerge, dedupeBpLogs } from '@/lib/supabase-db';
import { BloodPressureLog } from '@/types';

/** Load user's full data from Storage into DataRepository memory */
async function hydrateUser(email: string) {
  // Try Supabase Storage first (works on Vercel)
  const stored = await dbRead(email);
  if (stored) {
    DataRepository.loadUserData(
      {
        cycles:           stored.cycles   ?? [],
        logs:             stored.logs     ?? [],
        bpLogs:           stored.bpLogs   ?? [],
        reminderSettings: Object.keys(stored.settings ?? {}).length > 0
          ? (stored.settings as any)
          : undefined,
      },
      email
    );
    return stored;
  }

  // Fallback: local ServerStorage (dev only)
  try {
    const { ServerStorage } = await import('@/lib/server-storage');
    const user = ServerStorage.getUser(email);
    if (user) DataRepository.loadUserData(user, email);
  } catch {}
  return null;
}

// ─── GET  /api/bp?email=... ───────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email) {
      const stored = await hydrateUser(email);
      const logs   = stored?.bpLogs ?? DataRepository.getBpLogs();
      const stats  = DataRepository.getCycleStats();
      const analysis = analyzeBloodPressure(logs, stats.currentCycleDay, stats.currentPhase);
      return NextResponse.json({ success: true, data: { logs, analysis, cycleStats: stats } });
    }

    return NextResponse.json({
      success: true,
      data: {
        logs:      DataRepository.getBpLogs(),
        analysis:  DataRepository.getBpAnalysis(),
        cycleStats: DataRepository.getCycleStats(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST  /api/bp ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      systolic, diastolic, pulse, feltFluctuations, fluctuationType,
      symptoms, posture, notes, time, email,
    } = body;

    if (!systolic || !diastolic) {
      return NextResponse.json({ success: false, error: 'Systolic and Diastolic required' }, { status: 400 });
    }

    // Load existing data so analysis has context
    const stored = email ? await hydrateUser(email) : null;
    const existingLogs: BloodPressureLog[] = stored?.bpLogs ?? DataRepository.getBpLogs();

    const stats     = DataRepository.getCycleStats();
    const todayStr  = new Date().toISOString().split('T')[0];
    const timeValue = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const category  = classifyBloodPressure(Number(systolic), Number(diastolic));

    const newLog: BloodPressureLog = {
      id:              body.id || `bp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date:            body.date || todayStr,
      time:            timeValue,
      systolic:        Number(systolic),
      diastolic:       Number(diastolic),
      pulse:           pulse ? Number(pulse) : undefined,
      feltFluctuations: Boolean(feltFluctuations),
      fluctuationType: fluctuationType || (feltFluctuations ? 'drop' : 'none'),
      symptoms:        Array.isArray(symptoms) ? symptoms : [],
      posture:         posture || 'Sitting',
      notes:           notes || '',
      category,
      cycleDay:   stats.currentCycleDay,
      cyclePhase: stats.currentPhase,
    };

    // Deduplicate: new log + existing (by id)
    const updatedLogs = dedupeBpLogs([newLog, ...existingLogs]);

    if (email) {
      await dbMerge(email, { bpLogs: updatedLogs });
    }

    DataRepository.loadUserData({ bpLogs: updatedLogs }, email || undefined);
    const analysis = analyzeBloodPressure(updatedLogs, stats.currentCycleDay, stats.currentPhase);
    return NextResponse.json({ success: true, data: { log: newLog, analysis } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── DELETE  /api/bp?id=...&email=... ────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id    = searchParams.get('id');
    const email = searchParams.get('email');

    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    const stored = email ? await hydrateUser(email) : null;
    const existing: BloodPressureLog[] = stored?.bpLogs ?? DataRepository.getBpLogs();
    const updated = existing.filter((l) => l.id !== id);

    if (email) await dbMerge(email, { bpLogs: updated });

    DataRepository.loadUserData({ bpLogs: updated }, email || undefined);
    const stats    = DataRepository.getCycleStats();
    const analysis = analyzeBloodPressure(updated, stats.currentCycleDay, stats.currentPhase);
    return NextResponse.json({ success: true, removed: true, data: { analysis } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
