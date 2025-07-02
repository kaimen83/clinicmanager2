import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 현재 크롤링 상태 반환 (폴링 방식)
    const status = global.crawlingStatus || {
      progress: 0,
      message: '크롤링 상태를 확인할 수 없습니다.',
      isRunning: false
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('크롤링 상태 API 오류:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}