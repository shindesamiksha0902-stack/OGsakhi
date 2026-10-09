import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { CycleEngine } from '@/services/cycle-engine';
import { dbRead, dbMerge } from '@/lib/supabase-db';

async function hydrateUser(email: string) {
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
  try {
    const { ServerStorage } = await import('@/lib/server-storage');
    const user = ServerStorage.getUser(email);
    if (user) DataRepository.loadUserData(user, email);
  } catch {}
  return null;
}

// ─── GET /api/cycles ─────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    if (email) await hydrateUser(email);

    const cycles     = DataRepository.getCycles();
    const stats      = DataRepository.getCycleStats();
    const logs       = DataRepository.getLogs();
    const bpLogs     = DataRepository.getBpLogs();
    const dailyGoals = CycleEngine.generateDailyRhythmGoals(logs, stats.currentPhase, bpLogs);

    return NextResponse.json({ success: true, data: { cycles, stats, dailyGoals } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST /api/cycles ────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { startDate, email } = body;

    if (!startDate) {
      return NextResponse.json({ success: false, error: 'Start date is required' }, { status: 400 });
    }

    if (email) await hydrateUser(email);

    DataRepository.updatePeriodRecord(startDate);
    const stats  = DataRepository.getCycleStats();
    const cycles = DataRepository.getCycles();

    if (email) {
      await dbMerge(email, { cycles });
      try {
        const { ServerStorage } = await import('@/lib/server-storage');
        ServerStorage.syncUserData(email, { cycles });
      } catch {}
    }

    return NextResponse.json({ success: true, data: { stats } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
