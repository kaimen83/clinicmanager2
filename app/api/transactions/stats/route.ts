import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { toKstDate } from '@/lib/utils';

// GET 요청 처리 - 결제 방법별 트랜잭션 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateType = searchParams.get('dateType') || 'daily'; // 'daily' 또는 'monthly'
    const date = searchParams.get('date'); // YYYY-MM-DD 또는 YYYY-MM
    const paymentMethod = searchParams.get('paymentMethod'); // '현금', '카드', '계좌이체' 또는 null(전체)
    
    if (!date) {
      return NextResponse.json(
        { error: "날짜 파라미터가 필요합니다." },
        { status: 400 }
      );
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const { db } = await connectToDatabase();
    
    // 날짜 범위 계산
    let startDate: Date, endDate: Date;
    
    if (dateType === 'daily') {
      // 일별 데이터
      const selectedDate = toKstDate(date);
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (dateType === 'monthly') {
      // 월별 데이터
      const [year, month] = date.split('-').map(Number);
      
      startDate = toKstDate(new Date(year, month - 1, 1));
      startDate.setHours(0, 0, 0, 0);
      
      endDate = toKstDate(new Date(year, month, 0));
      endDate.setHours(23, 59, 59, 999);
    } else {
      return NextResponse.json(
        { error: "dateType 파라미터는 'daily' 또는 'monthly'여야 합니다." },
        { status: 400 }
      );
    }
    
    // 쿼리 조건 생성
    const query: any = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    // 결제 방법 필터링
    if (paymentMethod) {
      if (paymentMethod === '현금' || paymentMethod === '계좌이체') {
        query.paymentMethod = { $in: ['현금', '계좌이체'] };
      } else {
        query.paymentMethod = paymentMethod;
      }
    }
    
    // 트랜잭션 데이터 조회
    const transactions = await db.collection('transactions')
      .find(query)
      .sort({ date: -1 })
      .toArray();
    
    return NextResponse.json({
      dateType,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      paymentMethod,
      transactions
    });
  } catch (error) {
    console.error('트랜잭션 목록 조회 중 에러:', error);
    return NextResponse.json(
      { error: "트랜잭션 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 