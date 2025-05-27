import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import CashRecord from '@/lib/models/CashRecord';
import { currentUser } from '@clerk/nextjs/server';
import { toKstDate } from '@/lib/utils';

// 현금 기록 조회
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
    
    // 한국 시간대 기준으로 날짜 범위 설정
    const requestDate = new Date(date);
    const koreanDate = new Date(requestDate.getTime() + (9 * 60 * 60 * 1000));
    
    const startOfDay = new Date(koreanDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(koreanDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // MongoDB 쿼리용 UTC 시간으로 변환
    const queryStart = new Date(startOfDay.getTime() - (9 * 60 * 60 * 1000));
    const queryEnd = new Date(endOfDay.getTime() - (9 * 60 * 60 * 1000));
    
    const records = await CashRecord.find({
      date: {
        $gte: queryStart,
        $lt: queryEnd
      }
    }).sort({ date: 1 });
    
    return NextResponse.json(records);
  } catch (error) {
    console.error('현금 기록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: '현금 기록을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 현금 기록 추가 (통장입금만 허용)
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
    const { date, type, amount, description } = body;
    
    // 통장입금만 직접 추가 허용
    if (type !== '통장입금') {
      return NextResponse.json({ 
        error: '수입과 지출은 내원정보와 지출내역에서 관리됩니다. 통장입금만 직접 추가할 수 있습니다.' 
      }, { status: 400 });
    }
    
    // 날짜 데이터 처리
    const recordDate = toKstDate(date);
    
    const newRecord = new CashRecord({
      date: recordDate,
      type,
      amount: Number(amount),
      description: description || '통장입금'
    });
    
    await newRecord.save();
    
    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    console.error('현금 기록 추가 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: '현금 기록을 추가하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}