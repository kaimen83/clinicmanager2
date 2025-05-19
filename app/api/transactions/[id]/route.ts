import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// 트랜잭션 조회 (단일)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: '유효하지 않은 ID입니다.' }, { status: 400 });
    }
    
    const { db } = await connectToDatabase();
    const transaction = await db.collection('transactions').findOne({
      _id: new ObjectId(id)
    });
    
    if (!transaction) {
      return NextResponse.json({ error: '트랜잭션을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    return NextResponse.json(transaction, { status: 200 });
  } catch (error) {
    console.error('트랜잭션 조회 오류:', error);
    return NextResponse.json({ error: '트랜잭션 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 트랜잭션 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: '유효하지 않은 ID입니다.' }, { status: 400 });
    }
    
    const updateData = await request.json();
    
    const { db } = await connectToDatabase();
    
    // updatedAt 필드 자동 업데이트
    updateData.updatedAt = new Date();
    
    const result = await db.collection('transactions').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: '트랜잭션을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 업데이트된 트랜잭션 데이터 반환
    const updatedTransaction = await db.collection('transactions').findOne({
      _id: new ObjectId(id)
    });
    
    return NextResponse.json(updatedTransaction, { status: 200 });
  } catch (error) {
    console.error('트랜잭션 수정 오류:', error);
    return NextResponse.json({ error: '트랜잭션 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 트랜잭션 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: '유효하지 않은 ID입니다.' }, { status: 400 });
    }
    
    const { db } = await connectToDatabase();
    const result = await db.collection('transactions').deleteOne({
      _id: new ObjectId(id)
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: '트랜잭션을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    return NextResponse.json({ message: '트랜잭션이 성공적으로 삭제되었습니다.' }, { status: 200 });
  } catch (error) {
    console.error('트랜잭션 삭제 오류:', error);
    return NextResponse.json({ error: '트랜잭션 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 