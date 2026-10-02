import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';

export async function POST() {
  try {
    const result = DataRepository.clearAllData();
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
