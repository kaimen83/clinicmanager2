import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import CashRecord from '@/lib/models/CashRecord';
import { currentUser } from '@clerk/nextjs/server';

// 전일까지의 시재 잔액 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json({ error: '날짜 파라미터가 필요합니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    await dbConnect();
    
    // 요청 날짜 이전까지의 모든 거래 조회
    const requestDate = new Date(date);
    const previousDate = new Date(requestDate);
    previousDate.setDate(previousDate.getDate() - 1);
    
    const endOfPreviousDay = new Date(previousDate);
    endOfPreviousDay.setHours(23, 59, 59, 999);

    // 전일까지의 모든 거래 조회
    const transactions = await CashRecord.find({
      date: { $lte: endOfPreviousDay }
    }).sort({ date: 1 });

    // 거래 내역 누적 계산
    const balance = transactions.reduce((acc, record) => {
      if (record.type === '수입') {
        return acc + record.amount;
      } else if (record.type === '지출' || record.type === '통장입금') {
        return acc - record.amount;
      }
      return acc;
    }, 0);

    return NextResponse.json({ 
      closingAmount: balance 
    });
  } catch (error) {
    console.error('전일 시재 조회 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: '전일 시재를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}