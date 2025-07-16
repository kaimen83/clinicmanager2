import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '시작일과 종료일이 필요합니다.' }, { status: 400 });
    }

    // 날짜 필터 설정 (UTC 기준으로 직접 생성)
    // MongoDB에 저장된 날짜가 UTC 00:00:00이므로 직접 UTC Date 객체 생성
    const startUtc = new Date(`${startDate}T00:00:00.000Z`);
    const endUtc = new Date(`${endDate}T23:59:59.999Z`);

    // MongoDB 연결 및 조회
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db('hospital_accounting');
    
    const cardDeposits = await db.collection('carddeposits')
      .find({
        saleDate: {
          $gte: startUtc,
          $lte: endUtc
        }
      })
      .sort({ saleDate: 1 })
      .toArray();

    await client.close();

    return NextResponse.json(cardDeposits);

  } catch (error) {
    console.error('카드매출/입금 조회 실패:', error);
    return NextResponse.json({ error: '데이터 조회에 실패했습니다.' }, { status: 500 });
  }
} 