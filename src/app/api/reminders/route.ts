import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DataRepository } from '@/lib/data-repository';
import { ServerStorage } from '@/lib/server-storage';
import { ReminderSettings } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function dbGetSettings(email: string): Promise<ReminderSettings | null> {
  try {
    const { data, error } = await supabase
      .from('User')
      .select('settings_data')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    if (error?.code === '42703') return null; // column doesn't exist yet
    if (error || !data?.settings_data) return null;
    return data.settings_data as ReminderSettings;
  } catch {
    return null;
  }
}

async function dbSaveSettings(email: string, settings: ReminderSettings): Promise<void> {
  try {
    const normalized = email.trim().toLowerCase();
    const { data: existing } = await supabase
      .from('User')
      .select('id')
      .eq('email', normalized)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('User')
        .update({ settings_data: settings, updatedAt: new Date().toISOString() })
        .eq('email', normalized);
    } else {
      await supabase
        .from('User')
        .insert({ email: normalized, passwordHash: 'app-auto', name: normalized.split('@')[0], settings_data: settings });
    }
  } catch (e) {
    console.error('[Settings] dbSaveSettings error:', e);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (email) {
      // Try Supabase first
      const supaSettings = await dbGetSettings(email);
      if (supaSettings) {
        // Merge into DataRepository so active-reminder calculations work
        try {
          const user = ServerStorage.getUser(email);
          if (user) DataRepository.loadUserData(user, email);
        } catch {}
        DataRepository.updateReminderSettings(supaSettings, email);
        const reminders = DataRepository.getActiveReminders();
        return NextResponse.json({ success: true, data: { reminders, settings: supaSettings } });
      }

      // Fallback: server-storage (works on local dev)
      try {
        const user = ServerStorage.getUser(email);
        if (user) DataRepository.loadUserData(user, email);
      } catch {}
    }

    const reminders = DataRepository.getActiveReminders();
    const settings  = DataRepository.getReminderSettings();
    return NextResponse.json({ success: true, data: { reminders, settings } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body  = await req.json();
    const email = body.email;

    if (email) {
      try {
        const user = ServerStorage.getUser(email);
        if (user) DataRepository.loadUserData(user, email);
      } catch {}
    }

    // Test reminder trigger (unchanged)
    if (body.action === 'trigger_test') {
      const type = body.type || 'period';
      const testReminder = {
        id: `test-rem-${Date.now()}`,
        title:
          type === 'period'   ? '🔔 Pop Reminder: Period Expected Soon'
          : type === 'hydration' ? '💧 Pop Reminder: Time to Hydrate'
          : type === 'ovulation' ? '🌸 Pop Reminder: Fertile Window'
          : '✨ Pop Reminder: Evening Check-in',
        message:
          type === 'period'   ? 'Your period is estimated in approximately 3 days.'
          : type === 'hydration' ? 'Your body is asking for hydration!'
          : type === 'ovulation' ? 'Your body is in its vibrant ovulatory phase.'
          : 'Take a quiet moment to record your mood, energy, and symptoms.',
        type,
        priority: 'high',
        timestamp: 'Just now',
        actionText: type === 'period' ? 'View Calendar' : 'Open Check-in',
        actionUrl:  type === 'period' ? '/calendar' : '/#log',
      };
      return NextResponse.json({ success: true, data: { reminder: testReminder } });
    }

    if (body.settings) {
      const updated = DataRepository.updateReminderSettings(body.settings, email);
      // Persist to Supabase
      if (email) {
        await dbSaveSettings(email, updated).catch(() => {});
      }
      return NextResponse.json({ success: true, data: { settings: updated } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
