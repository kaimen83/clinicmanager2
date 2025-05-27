import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const resolvedParams = await params;
    const activityId = resolvedParams.id;

    // 판매 기록에서 삭제 시도
    const deletedSale = await db.collection('dentalproductsales').findOneAndDelete({
      _id: new ObjectId(activityId)
    });
    
    if (deletedSale && deletedSale.value) {
      // 삭제된 제품들의 재고를 다시 증가시킴
      for (const product of deletedSale.value.products) {
        await db.collection('dentalproducts').updateOne(
          { _id: new ObjectId(product.productId) },
          { $inc: { stock: product.quantity } }
        );
      }
      return NextResponse.json({ message: '판매 기록이 삭제되었습니다.' });
    }

    // 입/출고 기록에서 삭제 시도
    const deletedLog = await db.collection('dentalproductinventorylogs').findOneAndDelete({
      _id: new ObjectId(activityId)
    });
    
    if (deletedLog && deletedLog.value) {
      try {
        // 입고 삭제의 경우 재고 감소, 출고 삭제의 경우 재고 증가
        const stockChange = deletedLog.value.type === 'IN' ? -deletedLog.value.quantity : deletedLog.value.quantity;
        await db.collection('dentalproducts').updateOne(
          { _id: new ObjectId(deletedLog.value.productId) },
          { $inc: { stock: stockChange } }
        );
        return NextResponse.json({ message: '입/출고 기록이 삭제되었습니다.' });
      } catch (updateError) {
        console.error('[Delete] 재고 업데이트 중 에러:', updateError);
        // 삭제된 기록 복구
        await db.collection('dentalproductinventorylogs').insertOne(deletedLog.value);
        throw new Error('재고 업데이트 중 오류가 발생했습니다.');
      }
    }

    return NextResponse.json({ error: '해당하는 활동 기록을 찾을 수 없습니다.' }, { status: 404 });

  } catch (error) {
    console.error('[Delete] 활동 삭제 중 에러:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '활동 삭제에 실패했습니다.' 
    }, { status: 500 });
  }
} 