import { NextResponse } from 'next/server';
import { DataRepository } from '@/lib/data-repository';

export async function POST() {
  try {
    const result = DataRepository.resetToDemoData();
    return NextResponse.json({
      success: true,
      message: 'Demo dataset successfully loaded',
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset demo data' },
      { status: 500 }
    );
  }
}
