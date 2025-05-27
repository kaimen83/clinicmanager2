import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { quantity, purchasePrice, notes } = body;
    
    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: '수량은 1 이상이어야 합니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // params를 await로 기다림
    const { id } = await params;
    
    const { db } = await connectToDatabase();
    
    // 제품 조회
    const product = await db.collection('dentalproducts').findOne({ _id: new ObjectId(id) });
    if (!product) {
      return NextResponse.json({ error: '해당 구강용품을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 재고 업데이트
    const updateData: any = {
      stock: (product.stock || 0) + quantity,
      updatedAt: new Date()
    };
    
    // 매입가가 제공된 경우 업데이트
    if (purchasePrice) {
      updateData.purchasePrice = purchasePrice;
    }
    
    await db.collection('dentalproducts').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    // 입고 기록 저장
    await db.collection('dentalproductinventorylogs').insertOne({
      productId: new ObjectId(id),
      type: 'IN',
      quantity,
      price: purchasePrice || product.purchasePrice,
      notes,
      userId,
      date: new Date()
    });
    
    return NextResponse.json({ message: '입고 처리가 완료되었습니다.' });
  } catch (error) {
    console.error('입고 처리 오류:', error);
    return NextResponse.json({ error: '입고 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 