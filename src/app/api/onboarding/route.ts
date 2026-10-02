import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { UserOnboardingProfile } from '@/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email) {
      const { ServerStorage } = await import('@/lib/server-storage');
      const user = ServerStorage.getUser(email);
      if (user?.onboardingProfile) {
        DataRepository.loadUserData(user);
        return NextResponse.json({
          success: true,
          data: {
            completed: Boolean(user.onboardingProfile.completed),
            profile: user.onboardingProfile,
          },
        });
      }
    }

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

    // Persist to ServerStorage for cross-device synchronization
    const email = body.email;
    if (email) {
      const { ServerStorage } = await import('@/lib/server-storage');
      ServerStorage.syncUserData(email, {
        onboardingProfile: profile,
        cycles: DataRepository.getCycles(),
        logs: DataRepository.getLogs(),
      });
    }

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
