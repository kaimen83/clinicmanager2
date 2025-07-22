import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;

    // MongoDB 연결
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db('hospital_accounting');
    
    // transactionIds 배열에서 해당 거래 ID를 포함하는 카드매출 조회
    const cardDeposit = await db.collection('carddeposits').findOne({
      transactionIds: new ObjectId(transactionId)
    });

    await client.close();

    if (!cardDeposit) {
      return NextResponse.json({ error: '해당 거래의 카드 입금 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json(cardDeposit);

  } catch (error) {
    console.error('카드 입금 정보 조회 오류:', error);
    return NextResponse.json({ 
      error: '카드 입금 정보 조회에 실패했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}