import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import CashRecord from '@/lib/models/CashRecord';
import { currentUser } from '@clerk/nextjs/server';

// 시재 마감
export async function POST(request: NextRequest) {
  try {
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    await dbConnect();
    
    const body = await request.json();
    const { date, closingAmount } = body;
    
    if (!date || closingAmount === undefined) {
      return NextResponse.json({ error: '날짜와 마감금액이 필요합니다.' }, { status: 400 });
    }
    
    const targetDate = new Date(date);
    
    // 해당 날짜의 시작과 끝 시간 설정
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // 1. 해당 날짜의 모든 기록 마감 처리
    await CashRecord.updateMany(
      {
        date: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      },
      { 
        $set: { 
          isClosed: true,
          closingAmount: Number(closingAmount),
          closedAt: new Date()
        }
      }
    );

    // 2. 이후 날짜들의 시재 재계산 (필요시 구현)
    // await recalculateFollowingBalances(targetDate);

    return NextResponse.json({
      message: '시재가 마감되었습니다.'
    });
  } catch (error) {
    console.error('시재 마감 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: '시재 마감 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}