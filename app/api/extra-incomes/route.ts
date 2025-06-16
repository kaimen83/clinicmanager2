import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    // 진료외 수입 데이터 조회 (최근 1년간)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const extraIncomes = await db.collection('extraincomes').find({
      date: { $gte: oneYearAgo }
    }).sort({ date: -1 }).toArray();

    return NextResponse.json(extraIncomes);

  } catch (error) {
    console.error('진료외 수입 데이터 조회 오류:', error);
    return NextResponse.json(
      { error: '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 