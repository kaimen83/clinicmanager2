import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const chartNumber = searchParams.get('chartNumber');

    let query = {};
    if (chartNumber) {
      query = { chartNumber };
    }

    const sales = await db.collection('dentalproductsales')
      .find(query)
      .sort({ date: -1 })
      .toArray();

    return NextResponse.json(sales);
  } catch (error) {
    console.error('판매 내역 조회 중 오류:', error);
    return NextResponse.json(
      { error: '판매 내역 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();
    const { date, chartNumber, patientName, doctor, products } = body;

    // 필수 필드 검증
    if (!date || !chartNumber || !patientName || !doctor) {
      return NextResponse.json(
        { error: '날짜, 차트번호, 환자명, 의사는 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: '구강용품을 선택해주세요.' },
        { status: 400 }
      );
    }

    // 트랜잭션 시작 (MongoDB 트랜잭션 사용)
    const { client } = await connectToDatabase();
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 재고 확인 및 차감
        for (const product of products) {
          const dentalProduct = await db.collection('dentalproducts')
            .findOne({ _id: new ObjectId(product.productId) }, { session });
          
          if (!dentalProduct) {
            throw new Error(`상품을 찾을 수 없습니다: ${product.name}`);
          }
          
          if (dentalProduct.stock < product.quantity) {
            throw new Error(`재고가 부족합니다: ${product.name} (현재 재고: ${dentalProduct.stock})`);
          }
          
          // 재고 차감
          await db.collection('dentalproducts').updateOne(
            { _id: new ObjectId(product.productId) },
            { 
              $inc: { stock: -product.quantity },
              $set: { updatedAt: new Date() }
            },
            { session }
          );
        }

        // 총액 계산
        const totalAmount = products.reduce((sum: number, product: any) => 
          sum + (product.quantity * product.salePrice), 0);

        // 판매 내역 저장
        const sale = {
          date: new Date(date),
          chartNumber,
          patientName,
          doctor,
          products: products.map((p: any) => ({
            productId: new ObjectId(p.productId),
            name: p.name,
            manufacturer: p.manufacturer,
            quantity: p.quantity,
            salePrice: p.salePrice
          })),
          totalAmount,
          userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await db.collection('dentalproductsales').insertOne(sale, { session });
        return { _id: result.insertedId, ...sale };
      });

      return NextResponse.json({ message: '구강용품 판매가 등록되었습니다.' }, { status: 201 });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('판매 등록 중 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '판매 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 