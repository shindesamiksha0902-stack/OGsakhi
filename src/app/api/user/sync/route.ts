import { NextResponse } from 'next/server';
import { ServerStorage } from '@/lib/server-storage';
import { DataRepository } from '@/lib/data-repository';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email parameter required' },
        { status: 400 }
      );
    }

    const user = ServerStorage.getUser(email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found on server' },
        { status: 404 }
      );
    }

    // Hydrate DataRepository with this user's records
    DataRepository.loadUserData(user);
    const stats = DataRepository.getCycleStats();

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          onboardingProfile: user.onboardingProfile,
          cycles: user.cycles,
          logs: user.logs,
          bpLogs: user.bpLogs,
          reminderSettings: user.reminderSettings,
        },
        stats,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync user data' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = 'sync', email, password, name } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    if (action === 'register') {
      const reg = ServerStorage.registerUser(email, password, name);
      if (reg.error && !reg.user) {
        // If already exists, authenticate and sync
        const auth = ServerStorage.authenticateUser(email, password);
        if (auth.error) {
          return NextResponse.json({ success: false, error: auth.error }, { status: 400 });
        }
        const user = auth.user!;
        DataRepository.loadUserData(user);
        return NextResponse.json({
          success: true,
          data: { user, stats: DataRepository.getCycleStats() },
        });
      }

      const user = reg.user!;
      if (body.onboardingProfile || body.cycles) {
        ServerStorage.syncUserData(email, body);
      }
      DataRepository.loadUserData(user);

      return NextResponse.json({
        success: true,
        data: { user, stats: DataRepository.getCycleStats() },
      });
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
      DataRepository.loadUserData(user);

      return NextResponse.json({
        success: true,
        data: { user, stats: DataRepository.getCycleStats() },
      });
    }

    // Default: 'sync'
    const synced = ServerStorage.syncUserData(email, {
      name,
      password,
      onboardingProfile: body.onboardingProfile,
      cycles: body.cycles,
      logs: body.logs,
      bpLogs: body.bpLogs,
      reminderSettings: body.reminderSettings,
    });

    DataRepository.loadUserData(synced);

    return NextResponse.json({
      success: true,
      data: {
        user: synced,
        stats: DataRepository.getCycleStats(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process sync request' },
      { status: 500 }
    );
  }
}
