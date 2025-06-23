import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    // 이식재 제품에서 타입(name) 목록 조회
    const fixtures = await db.collection('implantproducts')
      .distinct('name', { category: '이식재' });
    
    return NextResponse.json({
      fixtures: fixtures.filter(Boolean).sort()
    });
  } catch (error) {
    console.error('이식재 목록 조회 실패:', error);
    return NextResponse.json(
      { message: '이식재 목록을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 