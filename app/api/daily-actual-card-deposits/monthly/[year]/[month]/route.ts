import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  try {
    const { year, month } = await params;
    
    // 날짜 범위 설정 (MongoDB에 저장된 데이터는 실제로는 KST 날짜가 UTC로 저장됨)
    const startUtc = new Date(`${year}-${month.padStart(2, '0')}-01T00:00:00.000Z`);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    const endUtc = new Date(`${year}-${month.padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}T23:59:59.999Z`);

    const { db } = await connectToDatabase();
    
    // 일일 실제 카드 입금 데이터 조회
    const cardDeposits = await db.collection('dailyactualcarddeposits').find({
      depositDate: { $gte: startUtc, $lte: endUtc }
    }).toArray();

    return NextResponse.json(cardDeposits);

  } catch (error) {
    console.error('카드 입금 데이터 조회 오류:', error);
    return NextResponse.json(
      { error: '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 