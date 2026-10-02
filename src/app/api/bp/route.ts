import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';

export async function GET() {
  try {
    const logs = DataRepository.getBpLogs();
    const analysis = DataRepository.getBpAnalysis();
    const cycleStats = DataRepository.getCycleStats();

    return NextResponse.json({
      success: true,
      data: {
        logs,
        analysis,
        cycleStats,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch blood pressure data' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { systolic, diastolic, pulse, feltFluctuations, fluctuationType, symptoms, posture, notes, time } = body;

    if (!systolic || !diastolic) {
      return NextResponse.json(
        { success: false, error: 'Systolic and Diastolic values are required' },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newLog = DataRepository.addBpLog({
      date: todayStr,
      time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      systolic: Number(systolic),
      diastolic: Number(diastolic),
      pulse: pulse ? Number(pulse) : undefined,
      feltFluctuations: Boolean(feltFluctuations),
      fluctuationType: fluctuationType || (feltFluctuations ? 'drop' : 'none'),
      symptoms: Array.isArray(symptoms) ? symptoms : [],
      posture: posture || 'Sitting',
      notes: notes || '',
    });

    const updatedAnalysis = DataRepository.getBpAnalysis();

    return NextResponse.json({
      success: true,
      data: {
        log: newLog,
        analysis: updatedAnalysis,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save blood pressure reading' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Log ID is required for deletion' },
        { status: 400 }
      );
    }

    const removed = DataRepository.deleteBpLog(id);
    const updatedAnalysis = DataRepository.getBpAnalysis();

    return NextResponse.json({
      success: true,
      removed,
      data: {
        analysis: updatedAnalysis,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete blood pressure entry' },
      { status: 500 }
    );
  }
}
