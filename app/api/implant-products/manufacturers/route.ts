import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    // 임플란트(fixture) 제품에서 제조사(name) 목록 조회
    const manufacturers = await db.collection('implantproducts')
      .distinct('name', { category: 'fixture' });
    
    return NextResponse.json({
      manufacturers: manufacturers.filter(Boolean).sort()
    });
  } catch (error) {
    console.error('제조사 목록 조회 실패:', error);
    return NextResponse.json(
      { message: '제조사 목록을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 