import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// PATCH 요청 처리 - 수납 타입 토글 (일반수납 ↔ 상담수납)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();

    // 트랜잭션 조회
    const transaction = await db
      .collection('transactions')
      .findOne({ _id: new ObjectId(params.id) });

    if (!transaction) {
      return NextResponse.json(
        { error: "트랜잭션을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 현재 상담수납 상태 토글
    const newIsConsultation = !transaction.isConsultation;

    // 트랜잭션 업데이트
    const result = await db
      .collection('transactions')
      .updateOne(
        { _id: new ObjectId(params.id) },
        {
          $set: {
            isConsultation: newIsConsultation,
            updatedAt: new Date()
          }
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "수납 타입 변경에 실패했습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      _id: params.id,
      isConsultation: newIsConsultation
    });
  } catch (error) {
    console.error('수납 타입 토글 중 에러:', error);
    return NextResponse.json(
      { error: "수납 타입 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 