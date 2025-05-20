import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { toKstDate } from '@/lib/utils';

// GET 요청 처리 - 카드사별 통계 정보 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily'; // 'daily' 또는 'monthly'
    const date = searchParams.get('date'); // YYYY-MM-DD 또는 YYYY-MM
    
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
    
    if (type === 'daily') {
      // 일별 데이터
      const selectedDate = toKstDate(date);
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (type === 'monthly') {
      // 월별 데이터
      const [year, month] = date.split('-').map(Number);
      
      startDate = toKstDate(new Date(year, month - 1, 1));
      startDate.setHours(0, 0, 0, 0);
      
      endDate = toKstDate(new Date(year, month, 0));
      endDate.setHours(23, 59, 59, 999);
    } else {
      return NextResponse.json(
        { error: "type 파라미터는 'daily' 또는 'monthly'여야 합니다." },
        { status: 400 }
      );
    }
    
    // 카드 결제 트랜잭션 조회
    const transactions = await db.collection('transactions')
      .find({
        date: { $gte: startDate, $lte: endDate },
        paymentMethod: '카드',
        // 유효한 카드사 정보가 있는 트랜잭션만 필터링
        cardCompany: { $exists: true, $ne: '' }
      })
      .toArray();
    
    // 카드사별 통계 계산
    const cardCompanyMap = new Map<string, { count: number; amount: number }>();
    let totalAmount = 0;
    
    // 카드사별 결제액 및 건수 집계
    transactions.forEach(tx => {
      const cardCompany = tx.cardCompany;
      const amount = tx.paymentAmount || 0;
      
      totalAmount += amount;
      
      if (!cardCompanyMap.has(cardCompany)) {
        cardCompanyMap.set(cardCompany, { count: 0, amount: 0 });
      }
      
      const current = cardCompanyMap.get(cardCompany)!;
      cardCompanyMap.set(cardCompany, {
        count: current.count + 1,
        amount: current.amount + amount
      });
    });
    
    // 비율 계산 및 정렬
    const cardStats = Array.from(cardCompanyMap.entries()).map(([cardCompany, stats]) => ({
      cardCompany,
      count: stats.count,
      amount: stats.amount,
      percentage: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0
    }));
    
    // 금액 기준 내림차순 정렬
    cardStats.sort((a, b) => b.amount - a.amount);
    
    return NextResponse.json({
      type,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      totalAmount,
      transactionCount: transactions.length,
      cardStats
    });
  } catch (error) {
    console.error('카드사별 통계 조회 중 에러:', error);
    return NextResponse.json(
      { error: "카드사별 통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 