import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';

export async function POST(req: Request) {
  try {
    let email: string | undefined;
    try {
      const body = await req.json();
      email = body.email;
    } catch {}

    if (!email) {
      const { searchParams } = new URL(req.url);
      email = searchParams.get('email') || undefined;
    }

    const result = DataRepository.clearAllData(email);
    return NextResponse.json({
      success: true,
      message: 'App cleared to 0 data (fresh state)',
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to clear data' },
      { status: 500 }
    );
  }
}
