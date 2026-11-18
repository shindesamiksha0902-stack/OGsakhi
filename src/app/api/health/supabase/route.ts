import { NextResponse } from 'next/server';
import { checkSupabaseHealth } from '@/lib/supabase-db';

export async function GET() {
  try {
    const health = await checkSupabaseHealth();
    return NextResponse.json({
      success: true,
      data: health,
      instructions: health.status === 'connected'
        ? 'Supabase is online and responding.'
        : 'If unreachable (DNS error), log into https://supabase.com/dashboard and check if your project is paused (free tier projects pause after 7 days of inactivity). Click "Restore Project" to resume.',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Supabase health check failed',
      },
      { status: 500 }
    );
  }
}
