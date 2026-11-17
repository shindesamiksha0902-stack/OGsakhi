import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { dbRead, dbMerge } from '@/lib/supabase-db';
import { UserOnboardingProfile } from '@/types';

async function hydrateUser(email: string) {
  const stored = await dbRead(email);
  if (stored) {
    DataRepository.loadUserData(
      {
        cycles:  stored.cycles ?? [],
        logs:    stored.logs   ?? [],
        bpLogs:  stored.bpLogs ?? [],
      },
      email
    );
    return stored;
  }
  try {
    const { ServerStorage } = await import('@/lib/server-storage');
    const user = ServerStorage.getUser(email);
    if (user) DataRepository.loadUserData(user, email);
    return user;
  } catch {}
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email) {
      // Check Supabase Storage first
      const stored = await dbRead(email);
      if (stored) {
        // Onboarding profile is stored separately - check ServerStorage or return completed if has cycles
        const hasCycles = (stored.cycles ?? []).length > 0;
        // Also try ServerStorage for onboarding profile
        try {
          const { ServerStorage } = await import('@/lib/server-storage');
          const user = ServerStorage.getUser(email);
          if (user?.onboardingProfile) {
            DataRepository.loadUserData(user, email);
            return NextResponse.json({
              success: true,
              data: { completed: true, profile: user.onboardingProfile },
            });
          }
        } catch {}
        // If user has cycle data stored, they completed onboarding
        if (hasCycles) {
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

    // Persist to Supabase Storage (Vercel-safe)
    if (email) {
      await dbMerge(email, { cycles, logs });
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
