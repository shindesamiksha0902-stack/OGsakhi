import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { DailyLogData } from '@/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (date) {
      const log = DataRepository.getLogForDate(date);
      return NextResponse.json({ success: true, data: log });
    }

    const logs = DataRepository.getLogs();
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body: DailyLogData = await req.json();

    if (!body.date) {
      return NextResponse.json(
        { success: false, error: 'Date is required for daily check-in' },
        { status: 400 }
      );
    }

    const savedLog = DataRepository.saveLog(body);
    const updatedStats = DataRepository.getCycleStats();

    return NextResponse.json({
      success: true,
      data: {
        log: savedLog,
        stats: updatedStats,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save daily check-in' },
      { status: 500 }
    );
  }
}
