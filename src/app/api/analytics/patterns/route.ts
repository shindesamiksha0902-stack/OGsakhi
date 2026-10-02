import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';

export async function GET() {
  try {
    const analysis = DataRepository.getPatterns();
    const stats = DataRepository.getCycleStats();

    return NextResponse.json({
      success: true,
      data: {
        patterns: analysis.patterns,
        overallSeverity: analysis.overallSeverity,
        baselines: analysis.baselines,
        cycleStats: stats,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to analyze patterns' },
      { status: 500 }
    );
  }
}
