import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET 요청 처리 - 특정 환자의 내원 이력 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { chartNumber: string } }
) {
  try {
    // Next.js 15에서는 params를 사용하기 전에 await 해야 함
    const { chartNumber } = await params;
    
    if (!chartNumber) {
      return NextResponse.json(
        { error: "차트번호가 필요합니다." },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const { db } = await connectToDatabase();
    
    // 환자 존재 여부 확인
    const patient = await db.collection('patients').findOne({ chartNumber });
    
    if (!patient) {
      return NextResponse.json(
        { error: "해당 환자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    
    // 내원 이력 조회
    const transactions = await db.collection('transactions')
      .find({ chartNumber })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // 전체 내원 이력 수 조회
    const total = await db.collection('transactions').countDocuments({ chartNumber });

    return NextResponse.json({
      patient,
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('환자 내원 이력 조회 중 에러:', error);
    return NextResponse.json(
      { error: "환자 내원 이력 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 