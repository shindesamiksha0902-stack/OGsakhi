import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';
import { dbMerge } from '@/lib/supabase-db';
import { hydrateUser } from '@/lib/hydrate';
import { ReminderSettings } from '@/types';

// ─── GET /api/reminders ───────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email) {
      const stored = await hydrateUser(email) as any;
      if (stored?.settings && Object.keys(stored.settings).length > 0) {
        DataRepository.updateReminderSettings(stored.settings as ReminderSettings, email);
      }
    }

    const reminders = DataRepository.getActiveReminders();
    const settings  = DataRepository.getReminderSettings();
    return NextResponse.json({ success: true, data: { reminders, settings } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST /api/reminders ──────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body  = await req.json();
    const email = body.email;

    if (email) await hydrateUser(email);

    // Test reminder trigger
    if (body.action === 'trigger_test') {
      const type = body.type || 'period';
      const testReminder = {
        id:         `test-rem-${Date.now()}`,
        title:
          type === 'period'      ? '🔔 Period Expected Soon'
          : type === 'hydration' ? '💧 Time to Hydrate'
          : type === 'ovulation' ? '🌸 Fertile Window'
          : '✨ Evening Check-in',
        message:
          type === 'period'      ? 'Your period is estimated in approximately 3 days.'
          : type === 'hydration' ? 'Your body is asking for hydration!'
          : type === 'ovulation' ? 'You are in your vibrant ovulatory phase.'
          : 'Take a quiet moment to record your mood, energy, and symptoms.',
        type,
        priority:   'high' as const,
        timestamp:  'Just now',
        actionText: type === 'period' ? 'View Calendar' : 'Open Check-in',
        actionUrl:  type === 'period' ? '/calendar' : '/#log',
      };
      return NextResponse.json({ success: true, data: { reminder: testReminder } });
    }

    if (body.settings) {
      const updated = DataRepository.updateReminderSettings(body.settings, email);
      if (email) {
        await dbMerge(email, { settings: updated });
        try {
          const { ServerStorage } = await import('@/lib/server-storage');
          ServerStorage.syncUserData(email, { reminderSettings: updated });
        } catch {}
      }
      return NextResponse.json({ success: true, data: { settings: updated } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
