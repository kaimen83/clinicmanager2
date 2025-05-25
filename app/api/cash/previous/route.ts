import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import CashRecord from '@/lib/models/CashRecord';
import { currentUser } from '@clerk/nextjs/server';

// 전일 시재 조회
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
    
    const requestDate = new Date(date);
    const previousDate = new Date(requestDate);
    previousDate.setDate(previousDate.getDate() - 1);
    
    const startOfPreviousDay = new Date(previousDate);
    startOfPreviousDay.setHours(0, 0, 0, 0);
    
    const endOfPreviousDay = new Date(previousDate);
    endOfPreviousDay.setHours(23, 59, 59, 999);

    // 전일의 마감 기록이 있는지 확인
    const previousDayClosing = await CashRecord.findOne({
      date: {
        $gte: startOfPreviousDay,
        $lt: endOfPreviousDay
      },
      isClosed: true
    }).sort({ date: -1 });

    // 전일 마감 기록이 있으면 그 금액 반환
    if (previousDayClosing) {
      return NextResponse.json({ 
        closingAmount: previousDayClosing.closingAmount 
      });
    }

    // 전일 마감 기록이 없으면 그 이전 마지막 마감 찾기
    const lastClosing = await CashRecord.findOne({
      date: { $lt: startOfPreviousDay },
      isClosed: true
    }).sort({ date: -1 });

    let baseAmount = lastClosing?.closingAmount || 0;

    // 마지막 마감 이후부터 전일까지의 모든 거래 누적 계산
    const transactions = await CashRecord.find({
      date: {
        $gt: lastClosing ? lastClosing.date : new Date(0),
        $lt: endOfPreviousDay
      }
    }).sort({ date: 1 });

    // 거래 내역 누적 계산
    const balance = transactions.reduce((acc, record) => {
      if (record.type === '수입') {
        return acc + record.amount;
      } else if (record.type === '지출' || record.type === '통장입금') {
        return acc - record.amount;
      }
      return acc;
    }, baseAmount);

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