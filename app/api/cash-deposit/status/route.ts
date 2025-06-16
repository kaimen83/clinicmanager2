import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import CashRecord from '@/lib/models/CashRecord';
import { currentUser } from '@clerk/nextjs/server';

// 월별 입금완료 상태 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    if (!year || !month) {
      return NextResponse.json({ error: '년도와 월이 필요합니다.' }, { status: 400 });
    }
    
    await dbConnect();
    
    // 해당 월의 시작과 끝 날짜 계산
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    
    // 해당 월의 모든 통장입금 내역 조회
    const records = await CashRecord.find({
      type: '통장입금',
      date: { $gte: startDate, $lte: endDate }
    });
    
    // 날짜별로 그룹화하고 완료 상태 확인
    const statusByDate: Record<string, { hasIncomplete: boolean; totalAmount: number; completedAmount: number }> = {};
    
    records.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      
      if (!statusByDate[dateKey]) {
        statusByDate[dateKey] = {
          hasIncomplete: false,
          totalAmount: 0,
          completedAmount: 0
        };
      }
      
      statusByDate[dateKey].totalAmount += record.amount;
      
      if (record.isCompleted) {
        statusByDate[dateKey].completedAmount += record.amount;
      } else {
        statusByDate[dateKey].hasIncomplete = true;
      }
    });
    
    return NextResponse.json(statusByDate);
  } catch (error) {
    console.error('입금 상태 조회 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: '입금 상태를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 