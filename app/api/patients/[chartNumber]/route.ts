import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET 요청 처리 - 특정 환자 정보 조회
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

    const { db } = await connectToDatabase();
    
    // 환자 정보 조회
    const patient = await db.collection('patients').findOne({
      chartNumber
    });

    if (!patient) {
      return NextResponse.json(
        { error: "해당 환자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error('환자 정보 조회 중 에러:', error);
    return NextResponse.json(
      { error: "환자 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PATCH 요청 처리 - 환자 정보 업데이트
export async function PATCH(
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
    
    const data = await request.json();
    const { db } = await connectToDatabase();
    
    // 환자가 존재하는지 확인
    const existingPatient = await db.collection('patients').findOne({
      chartNumber
    });
    
    if (!existingPatient) {
      return NextResponse.json(
        { error: "해당 환자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    
    // 업데이트 데이터 준비
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    // 차트번호는 변경할 수 없음
    delete updateData.chartNumber;
    
    // 환자 정보 업데이트
    await db.collection('patients').updateOne(
      { chartNumber },
      { $set: updateData }
    );
    
    // 업데이트된 환자 정보 조회
    const updatedPatient = await db.collection('patients').findOne({
      chartNumber
    });
    
    return NextResponse.json(updatedPatient);
  } catch (error) {
    console.error('환자 정보 업데이트 중 에러:', error);
    return NextResponse.json(
      { error: "환자 정보 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE 요청 처리 - 환자 정보 삭제
export async function DELETE(
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

    const { db } = await connectToDatabase();
    
    // 환자 정보 삭제
    const result = await db.collection('patients').deleteOne({
      chartNumber
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "해당 환자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "환자 정보가 성공적으로 삭제되었습니다." });
  } catch (error) {
    console.error('환자 정보 삭제 중 에러:', error);
    return NextResponse.json(
      { error: "환자 정보 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 