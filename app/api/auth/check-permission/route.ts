import { NextRequest, NextResponse } from 'next/server';
import { hasRole } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    
    if (!role) {
      return NextResponse.json(
        { error: '권한 타입이 필요합니다.' },
        { status: 400 }
      );
    }
    
    const hasPermission = await hasRole(role as any);
    
    return NextResponse.json({
      hasPermission
    });
  } catch (error) {
    console.error('권한 확인 오류:', error);
    return NextResponse.json(
      { error: '권한 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}