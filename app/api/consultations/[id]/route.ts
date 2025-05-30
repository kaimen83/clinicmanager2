import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET 요청 처리 - 단일 상담 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();
    
    // consultations 컬렉션에서 직접 조회
    const consultation = await db
      .collection('consultations')
      .findOne({ _id: new ObjectId(params.id) });

    if (!consultation) {
      return NextResponse.json(
        { error: "상담 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(consultation);
  } catch (error) {
    console.error('상담 정보 조회 중 에러:', error);
    return NextResponse.json(
      { error: "상담 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT 요청 처리 - 상담 정보 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { db } = await connectToDatabase();

    // 기존 상담 정보 조회
    const existingConsultation = await db
      .collection('consultations')
      .findOne({ _id: new ObjectId(params.id) });

    if (!existingConsultation) {
      return NextResponse.json(
        { error: "상담 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 상담 정보 업데이트
    const result = await db
      .collection('consultations')
      .updateOne(
        { _id: new ObjectId(params.id) },
        {
          $set: {
            date: new Date(body.date),
            chartNumber: body.chartNumber,
            patientName: body.patientName,
            doctor: body.doctor,
            staff: body.staff,
            amount: body.amount,
            agreed: body.agreed,
            notes: body.notes,
            updatedAt: new Date()
          }
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "상담 정보 수정에 실패했습니다." },
        { status: 404 }
      );
    }

    // 업데이트된 상담 정보 반환
    const updatedConsultation = await db
      .collection('consultations')
      .findOne({ _id: new ObjectId(params.id) });

    return NextResponse.json(updatedConsultation);
  } catch (error) {
    console.error('상담 정보 수정 중 에러:', error);
    return NextResponse.json(
      { error: "상담 정보 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE 요청 처리 - 상담 내역 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();

    // 상담 내역 삭제
    const result = await db
      .collection('consultations')
      .deleteOne({ _id: new ObjectId(params.id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "상담 내역을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "상담 내역이 삭제되었습니다." });
  } catch (error) {
    console.error('상담 내역 삭제 중 에러:', error);
    return NextResponse.json(
      { error: "상담 내역 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 