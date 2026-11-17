import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { hydrateUser } from '@/lib/hydrate';

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
