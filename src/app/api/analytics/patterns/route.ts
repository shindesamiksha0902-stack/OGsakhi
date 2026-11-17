import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { dbRead } from '@/lib/supabase-db';

async function hydrateUser(email: string) {
  // Try Supabase Storage first (Vercel-safe)
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
  // Fallback for local dev
  try {
    const { ServerStorage } = await import('@/lib/server-storage');
    const user = ServerStorage.getUser(email);
    if (user) DataRepository.loadUserData(user, email);
  } catch {}
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email) await hydrateUser(email);

    const analysis = DataRepository.getPatterns();
    const stats    = DataRepository.getCycleStats();

    return NextResponse.json({
      success: true,
      data: {
        patterns:        analysis.patterns,
        overallSeverity: analysis.overallSeverity,
        baselines:       analysis.baselines,
        cycleStats:      stats,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
