import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // MongoDB 연결
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db('hospital_accounting');
    
    const cardCompanies = await db.collection('settings')
      .find({ 
        type: 'cardCompany', 
        isActive: true 
      })
      .sort({ order: 1, value: 1 })
      .toArray();

    await client.close();

    return NextResponse.json(cardCompanies);

  } catch (error) {
    console.error('카드사 목록 조회 실패:', error);
    return NextResponse.json({ error: '카드사 목록 조회에 실패했습니다.' }, { status: 500 });
  }
} 