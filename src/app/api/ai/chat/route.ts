import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { AiService } from '@/services/ai-service';

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A question is required' },
        { status: 400 }
      );
    }

    const stats = DataRepository.getCycleStats();
    const allLogs = DataRepository.getLogs();
    const analysis = DataRepository.getPatterns();
    const profile = DataRepository.getOnboardingProfile();

    const recentLogs = allLogs.slice(-14);

    const answer = await AiService.answerWellnessQuestion({
      userQuestion: question,
      stats,
      recentLogs,
      patterns: analysis.patterns,
      baselines: analysis.baselines,
      onboardingProfile: profile,
    });

    return NextResponse.json({
      success: true,
      data: answer,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process AI inquiry' },
      { status: 500 }
    );
  }
}
