import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import CashRecord from '@/lib/models/CashRecord';
import { currentUser } from '@clerk/nextjs/server';

// 최근 계좌입금 내역 조회
export async function GET(request: NextRequest) {
  console.log('=== 계좌입금 내역 조회 API 호출됨 ===');
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    console.log('요청 파라미터 - date:', date);
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    console.log('사용자 ID:', userId);
    
    if (!userId) {
      console.log('인증되지 않은 요청');
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    await dbConnect();
    console.log('MongoDB 연결 완료');
    
    // 최근 2개월간의 통장입금 내역 조회 (완료되지 않은 것들 우선)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
    console.log('조회 기간:', twoMonthsAgo, '~', new Date());
    
    const records = await CashRecord.find({
      type: '통장입금',
      date: { $gte: twoMonthsAgo }
    }).sort({ 
      isCompleted: 1,  // 완료되지 않은 것들 먼저
      date: -1         // 최신 날짜 순
    });
    
    console.log('조회된 레코드 수:', records.length);
    console.log('조회된 레코드들:', records.map(r => ({ id: r._id, date: r.date, amount: r.amount, isCompleted: r.isCompleted })));
    
    return NextResponse.json(records);
  } catch (error) {
    console.error('계좌입금 내역 조회 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: '계좌입금 내역을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 