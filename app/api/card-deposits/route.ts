import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '시작일과 종료일이 필요합니다.' }, { status: 400 });
    }

    // 날짜 필터 설정 (한국 시간 기준)
    const startParts = startDate.split('-').map(Number);
    const endParts = endDate.split('-').map(Number);
    
    const startDateObj = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
    const endDateObj = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);
    
    // 한국 시간과 UTC 간의 시차 조정 (9시간)
    const kstOffset = 9 * 60 * 60 * 1000;
    const startUtc = new Date(startDateObj.getTime() - kstOffset);
    const endUtc = new Date(endDateObj.getTime() - kstOffset);

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