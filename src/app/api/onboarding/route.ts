import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { dbRead, dbMerge } from '@/lib/supabase-db';
import { hydrateUser } from '@/lib/hydrate';
import { UserOnboardingProfile } from '@/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email) {
      const stored = await dbRead(email);
      if (stored) {
        // Return stored onboardingProfile from Supabase Storage
        if (stored.onboardingProfile?.completed) {
          DataRepository.loadUserData(
            {
              cycles:            stored.cycles            ?? [],
              logs:              stored.logs              ?? [],
              bpLogs:            stored.bpLogs            ?? [],
              onboardingProfile: stored.onboardingProfile,
            },
            email
          );
          return NextResponse.json({
            success: true,
            data: { completed: true, profile: stored.onboardingProfile },
          });
        }
        // Has cycle data but no profile stored — treat as completed
        if ((stored.cycles ?? []).length > 0) {
          const profile = DataRepository.getOnboardingProfile();
          return NextResponse.json({
            success: true,
            data: { completed: Boolean(profile?.completed), profile },
          });
        }
      }
    }

    const profile = DataRepository.getOnboardingProfile();
    return NextResponse.json({
      success: true,
      data: { completed: Boolean(profile?.completed), profile },
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
      email,
    } = body;

    if (!lastPeriodStartDate) {
      return NextResponse.json({ success: false, error: 'Last period start date required' }, { status: 400 });
    }

    const profile: UserOnboardingProfile = {
      completed: true,
      lastPeriodStartDate,
      typicalCycleLength:  Number(typicalCycleLength)  || 28,
      typicalPeriodLength: Number(typicalPeriodLength) || 5,
      cycleRegularity,
      primaryGoals,
      dizzinessOrBpHistory,
      completedAt: new Date().toISOString(),
    };

    // Load any existing user data first to preserve BP logs etc.
    if (email) await hydrateUser(email);

    const result = DataRepository.saveOnboardingProfile(profile);
    const cycles = DataRepository.getCycles();
    const logs   = DataRepository.getLogs();

    // Persist to Supabase Storage — includes onboardingProfile now (Vercel-safe)
    if (email) {
      await dbMerge(email, { cycles, logs, onboardingProfile: profile });
    }

    // Also persist to ServerStorage for local dev fallback
    if (email) {
      try {
        const { ServerStorage } = await import('@/lib/server-storage');
        ServerStorage.syncUserData(email, { onboardingProfile: profile, cycles, logs });
      } catch {}
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
