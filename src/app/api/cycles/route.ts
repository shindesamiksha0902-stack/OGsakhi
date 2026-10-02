import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { CycleEngine } from '@/services/cycle-engine';

export async function GET() {
  try {
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
    const { startDate, endDate, isPeriodDay } = body;

    if (!startDate) {
      return NextResponse.json(
        { success: false, error: 'Start date is required' },
        { status: 400 }
      );
    }

    DataRepository.updatePeriodRecord(startDate);
    const stats = DataRepository.getCycleStats();

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
