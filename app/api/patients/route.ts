import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { requireRole } from '@/lib/utils/auth';

// GET 요청 처리 - 환자 목록 조회 (페이지네이션, 검색 지원)
export async function GET(request: NextRequest) {
  try {
    // 환자 조회는 기본 기능이므로 권한 검증 없이 허용
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const { db } = await connectToDatabase();
    
    // 검색 쿼리 구성
    const searchQuery = query
      ? {
          $or: [
            { chartNumber: { $regex: query, $options: 'i' } },
            { name: { $regex: query, $options: 'i' } }
          ]
        }
      : {};

    // 환자 목록 조회
    const patients = await db
      .collection('patients')
      .find(searchQuery)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // 전체 환자 수 조회
    const total = await db.collection('patients').countDocuments(searchQuery);

    return NextResponse.json({
      patients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('환자 목록 조회 중 에러:', error);
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Insufficient permissions')) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }
    return NextResponse.json(
      { error: "환자 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST 요청 처리 - 새 환자 등록
export async function POST(request: NextRequest) {
  try {
    // 권한 검증 - STAFF 이상 필요
    await requireRole('STAFF');
    const data = await request.json();
    const { chartNumber, name, visitPath } = data;

    // 필수 필드 검증
    if (!chartNumber || !name) {
      return NextResponse.json(
        { error: "차트번호와 환자명은 필수 입력 사항입니다." },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // 차트번호 중복 검사
    const existingPatient = await db.collection('patients').findOne({ chartNumber });
    if (existingPatient) {
      return NextResponse.json(
        { error: "이미 등록된 차트번호입니다." },
        { status: 409 } // Conflict
      );
    }

    // 현재 시간 및 사용자 정보 추가
    const now = new Date();
    const newPatient = {
      ...data,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy ? new ObjectId(data.createdBy) : null // 요청에서 사용자 ID 받아야 함
    };

    // 환자 정보 저장
    const result = await db.collection('patients').insertOne(newPatient);
    
    // 저장된 환자 정보 조회
    const insertedPatient = await db.collection('patients').findOne({
      _id: result.insertedId
    });

    return NextResponse.json(insertedPatient, { status: 201 });
  } catch (error) {
    console.error('환자 등록 중 에러:', error);
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Insufficient permissions')) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 });
    }
    return NextResponse.json(
      { error: "환자 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 