import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';

// 내원경로 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    const visitPaths = await db.collection('settings').find({ 
      type: 'visitPath',
      isActive: true 
    }).sort({ order: 1 }).toArray();

    // value 배열로 반환
    const pathValues = visitPaths.map((path: any) => path.value);

    return NextResponse.json(pathValues);
  } catch (error) {
    console.error('내원경로 목록 조회 오류:', error);
    return NextResponse.json({ error: '내원경로 목록을 조회하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 