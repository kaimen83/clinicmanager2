import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { toKstDate } from '@/lib/utils';

// GET 요청 처리 - 지출 내역 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateType = searchParams.get('dateType') || 'daily'; // 'daily' 또는 'monthly'
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
    
    // 날짜 범위 계산 (한국 시간 기준)
    let startDate: Date, endDate: Date;
    
    if (dateType === 'daily') {
      // 일별 데이터 - 한국 시간 기준
      const dateParts = date.split('-').map(Number);
      const startDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0);
      const endDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59, 999);
      
      // 한국 시간과 UTC 간의 시차 조정 (9시간)
      const kstOffset = 9 * 60 * 60 * 1000;
      startDate = new Date(startDateObj.getTime() - kstOffset);
      endDate = new Date(endDateObj.getTime() - kstOffset);
    } else if (dateType === 'monthly') {
      // 월별 데이터 - 한국 시간 기준
      const [year, month] = date.split('-').map(Number);
      const startDateObj = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endDateObj = new Date(year, month, 0, 23, 59, 59, 999);
      
      // 한국 시간과 UTC 간의 시차 조정 (9시간)
      const kstOffset = 9 * 60 * 60 * 1000;
      startDate = new Date(startDateObj.getTime() - kstOffset);
      endDate = new Date(endDateObj.getTime() - kstOffset);
    } else {
      return NextResponse.json(
        { error: "dateType 파라미터는 'daily' 또는 'monthly'여야 합니다." },
        { status: 400 }
      );
    }
    
    // 지출 데이터 조회 (MongoDB Expense 컬렉션 사용)
    const expenses = await db.collection('expenses')
      .find({
        date: { $gte: startDate, $lte: endDate }
      })
      .sort({ date: 1 }) // 날짜 오름차순 정렬
      .toArray();
    
    return NextResponse.json({
      dateType,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      expenses,
      totalCount: expenses.length,
      totalAmount: expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    });
  } catch (error) {
    console.error('지출 내역 조회 중 에러:', error);
    return NextResponse.json(
      { error: "지출 내역 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}