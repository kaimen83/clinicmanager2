import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    const products = await db.collection('dentalproducts')
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({ products });
  } catch (error) {
    console.error('구강용품 조회 중 오류:', error);
    return NextResponse.json(
      { error: '구강용품 조회 중 오류가 발생했습니다.' },
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
    const { name, manufacturer, specification, purchasePrice, sellingPrice, stock } = body;

    // 필수 필드 검증
    if (!name || !manufacturer || purchasePrice === undefined || sellingPrice === undefined) {
      return NextResponse.json(
        { error: '제품명, 제조사, 매입가, 판매가는 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    const product = {
      name,
      manufacturer,
      specification: specification || '',
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      stock: Number(stock) || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('dentalproducts').insertOne(product);

    return NextResponse.json({ 
      product: {
        _id: result.insertedId,
        ...product 
      }
    }, { status: 201 });
  } catch (error) {
    console.error('구강용품 생성 중 오류:', error);
    return NextResponse.json(
      { error: '구강용품 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();
    const { id, name, manufacturer, specification, purchasePrice, sellingPrice, stock } = body;

    // 필수 필드 검증
    if (!id || !name || !manufacturer || purchasePrice === undefined || sellingPrice === undefined) {
      return NextResponse.json(
        { error: 'ID, 제품명, 제조사, 매입가, 판매가는 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    const updateData = {
      name,
      manufacturer,
      specification: specification || '',
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      stock: Number(stock) || 0,
      updatedAt: new Date()
    };

    const result = await db.collection('dentalproducts').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: '해당 구강용품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: '구강용품이 성공적으로 수정되었습니다.' 
    });
  } catch (error) {
    console.error('구강용품 수정 중 오류:', error);
    return NextResponse.json(
      { error: '구강용품 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '삭제할 구강용품의 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    const result = await db.collection('dentalproducts').deleteOne(
      { _id: new ObjectId(id) }
    );

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: '해당 구강용품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: '구강용품이 성공적으로 삭제되었습니다.' 
    });
  } catch (error) {
    console.error('구강용품 삭제 중 오류:', error);
    return NextResponse.json(
      { error: '구강용품 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 