import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// 한국 시간대(UTC+9)로 날짜 조정하는 함수
function adjustToKoreanTime(date: Date): Date {
  // 입력 날짜가 로컬 시간대로 해석되므로, UTC 기준으로 변환한 후 한국 시간대(+9시간)로 조정
  const utcDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  ));
  
  // UTC+9시간 조정 (밀리초 단위)
  utcDate.setTime(utcDate.getTime() - 9 * 60 * 60 * 1000);
  
  return utcDate;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    
    if (!dateParam) {
      return NextResponse.json({ error: '날짜 파라미터가 필요합니다.' }, { status: 400 });
    }
    
    // 날짜 파라미터를 기반으로 하루 시작과 끝을 계산 (한국 시간 기준)
    const date = new Date(dateParam);
    
    // 한국 시간 00:00:00 (UTC로는 전날 15:00:00)
    const koreaStartOfDay = new Date(date);
    koreaStartOfDay.setHours(0, 0, 0, 0);
    const startOfDay = adjustToKoreanTime(koreaStartOfDay);
    
    // 한국 시간 23:59:59 (UTC로는 당일 14:59:59)
    const koreaEndOfDay = new Date(date);
    koreaEndOfDay.setHours(23, 59, 59, 999);
    const endOfDay = adjustToKoreanTime(koreaEndOfDay);
    
    console.log('검색 날짜 범위 (한국 시간 기준):', koreaStartOfDay, '~', koreaEndOfDay);
    console.log('검색 날짜 범위 (UTC 기준):', startOfDay, '~', endOfDay);
    
    const { db } = await connectToDatabase();
    const transactions = await db.collection('transactions')
      .find({
        date: { $gte: startOfDay, $lte: endOfDay }
      })
      .toArray();
    
    // 응답에 한국 시간 기준 날짜 정보 포함
    return NextResponse.json({ 
      transactions,
      dateInfo: {
        koreaDate: dateParam,
        startOfDay: koreaStartOfDay.toISOString(),
        endOfDay: koreaEndOfDay.toISOString(),
        utcStartOfDay: startOfDay.toISOString(),
        utcEndOfDay: endOfDay.toISOString()
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Transactions 조회 오류:', error);
    return NextResponse.json({ error: '트랜잭션 데이터를 가져오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 