import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { UserOnboardingProfile } from '@/types';

export async function GET() {
  try {
    const profile = DataRepository.getOnboardingProfile();
    return NextResponse.json({
      success: true,
      data: {
        completed: Boolean(profile?.completed),
        profile,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch onboarding profile' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      lastPeriodStartDate,
      typicalCycleLength = 28,
      typicalPeriodLength = 5,
      cycleRegularity = 'REGULAR',
      primaryGoals = ['period_prediction'],
      dizzinessOrBpHistory = 'RARELY_NEVER',
    } = body;

    const profile: UserOnboardingProfile = {
      completed: true,
      lastPeriodStartDate,
      typicalCycleLength: Number(typicalCycleLength) || 28,
      typicalPeriodLength: Number(typicalPeriodLength) || 5,
      cycleRegularity,
      primaryGoals,
      dizzinessOrBpHistory,
      completedAt: new Date().toISOString(),
    };

    const result = DataRepository.saveOnboardingProfile(profile);

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed and cycle calibrated',
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save onboarding profile' },
      { status: 500 }
    );
  }
}
