import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// PATCH 요청 처리 - 동의여부 토글
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { db } = await connectToDatabase();

    // 기존 상담 정보 조회
    const consultation = await db
      .collection('consultations')
      .findOne({ _id: new ObjectId(params.id) });

    if (!consultation) {
      return NextResponse.json(
        { error: "상담 내역을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 동의 상태 변경
    const newAgreedStatus = !consultation.agreed;
    const updateData: any = {
      agreed: newAgreedStatus,
      updatedAt: new Date()
    };

    // 미동의로 변경되는 경우 confirmedDate를 null로 설정
    if (!newAgreedStatus) {
      updateData.confirmedDate = null;
    } else {
      // 동의로 변경되는 경우 confirmedDate를 현재 날짜로 설정
      updateData.confirmedDate = body.confirmedDate ? new Date(body.confirmedDate) : new Date();
    }

    // 상담 정보 업데이트
    const result = await db
      .collection('consultations')
      .updateOne(
        { _id: new ObjectId(params.id) },
        { $set: updateData }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "동의여부 수정에 실패했습니다." },
        { status: 404 }
      );
    }

    // 업데이트된 상담 정보 반환
    const updatedConsultation = await db
      .collection('consultations')
      .findOne({ _id: new ObjectId(params.id) });

    return NextResponse.json(updatedConsultation);
  } catch (error) {
    console.error('동의여부 토글 중 에러:', error);
    return NextResponse.json(
      { error: "동의여부 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 