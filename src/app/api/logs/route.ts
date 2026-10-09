import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { dbRead, dbMerge } from '@/lib/supabase-db';
import { DailyLogData } from '@/types';

async function hydrateUser(email: string) {
  const stored = await dbRead(email);
  if (stored) {
    DataRepository.loadUserData(
      {
        cycles:           stored.cycles ?? [],
        logs:             stored.logs   ?? [],
        bpLogs:           stored.bpLogs ?? [],
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date  = searchParams.get('date');
    const email = searchParams.get('email');

    if (email) await hydrateUser(email);

    if (date) {
      return NextResponse.json({ success: true, data: DataRepository.getLogForDate(date) });
    }
    return NextResponse.json({ success: true, data: DataRepository.getLogs() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: DailyLogData & { email?: string } = await req.json();

    if (!body.date) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
    }

    if (body.email) await hydrateUser(body.email);

    const savedLog = DataRepository.saveLog(body, body.email);
    const logs     = DataRepository.getLogs();

    if (body.email) {
      await dbMerge(body.email, { logs });
      try {
        const { ServerStorage } = await import('@/lib/server-storage');
        ServerStorage.syncUserData(body.email, { logs });
      } catch {}
    }

    return NextResponse.json({ success: true, data: { log: savedLog, stats: DataRepository.getCycleStats() } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
