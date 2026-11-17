import { NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import { DataRepository } from '@/lib/data-repository';
import { dbRead, dbMerge } from '@/lib/supabase-db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email parameter required' }, { status: 400 });
    }

    // Try Supabase Storage first (Vercel-safe)
    const stored = await dbRead(email);
    if (stored) {
      DataRepository.loadUserData(
        {
          cycles:            stored.cycles            ?? [],
          logs:              stored.logs              ?? [],
          bpLogs:            stored.bpLogs            ?? [],
          onboardingProfile: stored.onboardingProfile ?? null,
          reminderSettings:  Object.keys(stored.settings ?? {}).length > 0
            ? (stored.settings as any)
            : undefined,
        },
        email
      );
      const stats = DataRepository.getCycleStats();
      return NextResponse.json({
        success: true,
        data: {
          user: {
            email,
            onboardingProfile: stored.onboardingProfile ?? null,
            cycles:            stored.cycles   ?? [],
            logs:              stored.logs     ?? [],
            bpLogs:            stored.bpLogs   ?? [],
            reminderSettings:  stored.settings ?? {},
          },
          stats,
        },
      });
    }

    // Fallback: local dev ServerStorage
    const user = ServerStorage.getUser(email);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    DataRepository.loadUserData(user, email);
    const stats = DataRepository.getCycleStats();

    return NextResponse.json({
      success: true,
      data: { user, stats },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = 'sync', email, password, name } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    if (action === 'register') {
      const reg = ServerStorage.registerUser(email, password, name);
      if (reg.error && !reg.user) {
        const auth = ServerStorage.authenticateUser(email, password);
        if (auth.error) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 400 });
        }
        const user = auth.user!;
        DataRepository.loadUserData(user, email);
        return NextResponse.json({ success: true, data: { user, stats: DataRepository.getCycleStats() } });
      }
      const user = reg.user!;
      if (body.onboardingProfile || body.cycles) {
        ServerStorage.syncUserData(email, body);
        // Also mirror to Supabase Storage
        await dbMerge(email, {
          cycles: body.cycles ?? [],
          logs:   body.logs   ?? [],
        });
      }
      DataRepository.loadUserData(user, email);
      return NextResponse.json({ success: true, data: { user, stats: DataRepository.getCycleStats() } });
    }

    if (action === 'login') {
      const auth = ServerStorage.authenticateUser(email, password);
      if (auth.error || !auth.user) {
        return NextResponse.json(
          { success: false, error: auth.error || 'Authentication failed' },
          { status: 401 }
        );
      }
      const user = auth.user;
      // Load Supabase Storage data (richer, Vercel-safe)
      const stored = await dbRead(email);
      if (stored) {
        DataRepository.loadUserData(
          { cycles: stored.cycles ?? [], logs: stored.logs ?? [], bpLogs: stored.bpLogs ?? [] },
          email
        );
        return NextResponse.json({
          success: true,
          data: {
            user: {
              ...user,
              cycles:  stored.cycles  ?? user.cycles,
              logs:    stored.logs    ?? user.logs,
              bpLogs:  stored.bpLogs  ?? user.bpLogs,
            },
            stats: DataRepository.getCycleStats(),
          },
        });
      }
      DataRepository.loadUserData(user, email);
      return NextResponse.json({ success: true, data: { user, stats: DataRepository.getCycleStats() } });
    }

    // Default: 'sync'
    const synced = ServerStorage.syncUserData(email, {
      name,
      password,
      onboardingProfile: body.onboardingProfile,
      cycles:            body.cycles,
      logs:              body.logs,
      bpLogs:            body.bpLogs,
      reminderSettings:  body.reminderSettings,
    });

    // Mirror to Supabase Storage
    if (body.cycles || body.logs || body.bpLogs) {
      await dbMerge(email, {
        cycles:   body.cycles   ?? [],
        logs:     body.logs     ?? [],
        bpLogs:   body.bpLogs   ?? [],
        settings: body.reminderSettings ?? {},
      });
    }

    DataRepository.loadUserData(synced, email);

    return NextResponse.json({
      success: true,
      data: { user: synced, stats: DataRepository.getCycleStats() },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
