import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';

export async function GET() {
  try {
    const reminders = DataRepository.getActiveReminders();
    const settings = DataRepository.getReminderSettings();
    return NextResponse.json({
      success: true,
      data: {
        reminders,
        settings,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // If requesting a test trigger
    if (body.action === 'trigger_test') {
      const type = body.type || 'period';
      const testReminder = {
        id: `test-rem-${Date.now()}`,
        title:
          type === 'period'
            ? '🔔 Pop Reminder: Period Expected Soon'
            : type === 'hydration'
            ? '💧 Pop Reminder: Time to Hydrate'
            : type === 'ovulation'
            ? '🌸 Pop Reminder: Fertile Window'
            : '✨ Pop Reminder: Evening Check-in',
        message:
          type === 'period'
            ? 'Your period is estimated in approximately 3 days. Stay hydrated, prepare supplies, and enjoy gentle movement.'
            : type === 'hydration'
            ? 'Your body is asking for hydration! Drink a fresh glass of water to keep energy steady.'
            : type === 'ovulation'
            ? 'Your body is in its vibrant ovulatory phase. Great time for creative tasks!'
            : 'Take a quiet moment to record your mood, energy, and symptoms for today.',
        type: type,
        priority: 'high',
        timestamp: 'Just now',
        actionText: type === 'period' ? 'View Calendar' : 'Open Check-in',
        actionUrl: type === 'period' ? '/calendar' : '/#log',
      };

      return NextResponse.json({
        success: true,
        data: { reminder: testReminder },
      });
    }

    // Update settings
    if (body.settings) {
      const updated = DataRepository.updateReminderSettings(body.settings);
      return NextResponse.json({
        success: true,
        data: { settings: updated },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process reminder request' },
      { status: 500 }
    );
  }
}
