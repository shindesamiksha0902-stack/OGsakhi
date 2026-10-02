import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { CycleEngine } from '@/services/cycle-engine';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email) {
      const { ServerStorage } = await import('@/lib/server-storage');
      const user = ServerStorage.getUser(email);
      if (user) {
        DataRepository.loadUserData(user);
      }
    }

    const cycles = DataRepository.getCycles();
    const stats = DataRepository.getCycleStats();
    const logs = DataRepository.getLogs();
    const bpLogs = DataRepository.getBpLogs();
    const dailyGoals = CycleEngine.generateDailyRhythmGoals(logs, stats.currentPhase, bpLogs);

    return NextResponse.json({
      success: true,
      data: {
        cycles,
        stats,
        dailyGoals,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch cycle telemetry' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { startDate, endDate, isPeriodDay, email } = body;

    if (!startDate) {
      return NextResponse.json(
        { success: false, error: 'Start date is required' },
        { status: 400 }
      );
    }

    DataRepository.updatePeriodRecord(startDate);
    const stats = DataRepository.getCycleStats();

    if (email) {
      const { ServerStorage } = await import('@/lib/server-storage');
      ServerStorage.syncUserData(email, {
        cycles: DataRepository.getCycles(),
      });
    }

    return NextResponse.json({
      success: true,
      data: { stats },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record period' },
      { status: 500 }
    );
  }
}
