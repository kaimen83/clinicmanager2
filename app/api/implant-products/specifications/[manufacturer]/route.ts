import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { manufacturer: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const { manufacturer } = params;
    
    if (!manufacturer) {
      return NextResponse.json(
        { message: '제조사명이 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 해당 제조사의 규격 목록 조회
    const specifications = await db.collection('implantproducts')
      .distinct('specification', { 
        category: 'fixture', 
        name: manufacturer,
        $and: [
          { specification: { $exists: true } },
          { specification: { $ne: null } },
          { specification: { $ne: '' } }
        ]
      });
    
    return NextResponse.json(specifications.filter(Boolean).sort());
  } catch (error) {
    console.error('규격 목록 조회 실패:', error);
    return NextResponse.json(
      { message: '규격 목록을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 