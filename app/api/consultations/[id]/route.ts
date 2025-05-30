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
    
    // 트랜잭션에서 해당 상담 내역 찾기
    const transaction = await db
      .collection('transactions')
      .findOne({
        'consultations._id': new ObjectId(params.id)
      });

    if (!transaction) {
      return NextResponse.json(
        { error: "상담 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const consultation = transaction.consultations.find(
      (c: any) => c._id.toString() === params.id
    );

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
    const transaction = await db
      .collection('transactions')
      .findOne({
        'consultations._id': new ObjectId(params.id)
      });

    if (!transaction) {
      return NextResponse.json(
        { error: "상담 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 상담 정보 업데이트
    const result = await db
      .collection('transactions')
      .updateOne(
        { 'consultations._id': new ObjectId(params.id) },
        {
          $set: {
            'consultations.$.date': new Date(body.date),
            'consultations.$.chartNumber': body.chartNumber,
            'consultations.$.patientName': body.patientName,
            'consultations.$.doctor': body.doctor,
            'consultations.$.staff': body.staff,
            'consultations.$.amount': body.amount,
            'consultations.$.agreed': body.agreed,
            'consultations.$.notes': body.notes,
            'consultations.$.updatedAt': new Date()
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
    const updatedTransaction = await db
      .collection('transactions')
      .findOne({
        'consultations._id': new ObjectId(params.id)
      });

    if (!updatedTransaction) {
      return NextResponse.json(
        { error: "업데이트된 상담 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const updatedConsultation = updatedTransaction.consultations.find(
      (c: any) => c._id.toString() === params.id
    );

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
      .collection('transactions')
      .updateOne(
        { 'consultations._id': new ObjectId(params.id) },
        {
          $pull: {
            consultations: { _id: new ObjectId(params.id) } as any
          }
        }
      );

    if (result.matchedCount === 0) {
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