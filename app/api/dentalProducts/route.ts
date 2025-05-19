import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    const products = await db.collection('dentalproducts').find({}).sort({ name: 1 }).toArray();
    
    return NextResponse.json({ products }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('구강용품 조회 오류:', error);
    return NextResponse.json({ error: '구강용품을 조회하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, manufacturer, specification, purchasePrice, sellingPrice, stock } = body;
    
    // 필수 필드 검증
    if (!name || !manufacturer || purchasePrice === undefined || sellingPrice === undefined) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }
    
    // 가격 및 재고 숫자 변환 및 검증
    const numPurchasePrice = Number(purchasePrice);
    const numSellingPrice = Number(sellingPrice);
    const numStock = stock !== undefined ? Number(stock) : 0;
    
    if (isNaN(numPurchasePrice) || isNaN(numSellingPrice) || isNaN(numStock)) {
      return NextResponse.json({ error: '가격과 재고는 숫자여야 합니다.' }, { status: 400 });
    }
    
    if (numPurchasePrice < 0 || numSellingPrice < 0 || numStock < 0) {
      return NextResponse.json({ error: '가격과 재고는 0 이상이어야 합니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const { db } = await connectToDatabase();
    
    // 동일한 이름과 제조사 조합이 있는지 확인
    const existingProduct = await db.collection('dentalproducts').findOne({ name, manufacturer });
    if (existingProduct) {
      return NextResponse.json({ error: '이미 동일한 이름과 제조사의 제품이 존재합니다.' }, { status: 409 });
    }
    
    const newProduct = {
      name,
      manufacturer,
      specification: specification || '',
      purchasePrice: numPurchasePrice,
      sellingPrice: numSellingPrice,
      stock: numStock,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('dentalproducts').insertOne(newProduct);
    
    return NextResponse.json({ 
      message: '구강용품이 추가되었습니다.',
      product: {
        _id: result.insertedId,
        ...newProduct
      }
    });
  } catch (error) {
    console.error('구강용품 추가 오류:', error);
    return NextResponse.json({ error: '구강용품을 추가하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, manufacturer, specification, purchasePrice, sellingPrice, stock } = body;
    
    if (!id) {
      return NextResponse.json({ error: '제품 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const { db } = await connectToDatabase();
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (name !== undefined) updateData.name = name;
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer;
    if (specification !== undefined) updateData.specification = specification;
    
    if (purchasePrice !== undefined) {
      const numPurchasePrice = Number(purchasePrice);
      if (isNaN(numPurchasePrice) || numPurchasePrice < 0) {
        return NextResponse.json({ error: '구매가격은 0 이상의 숫자여야 합니다.' }, { status: 400 });
      }
      updateData.purchasePrice = numPurchasePrice;
    }
    
    if (sellingPrice !== undefined) {
      const numSellingPrice = Number(sellingPrice);
      if (isNaN(numSellingPrice) || numSellingPrice < 0) {
        return NextResponse.json({ error: '판매가격은 0 이상의 숫자여야 합니다.' }, { status: 400 });
      }
      updateData.sellingPrice = numSellingPrice;
    }
    
    if (stock !== undefined) {
      const numStock = Number(stock);
      if (isNaN(numStock) || numStock < 0) {
        return NextResponse.json({ error: '재고는 0 이상의 숫자여야 합니다.' }, { status: 400 });
      }
      updateData.stock = numStock;
    }
    
    const result = await db.collection('dentalproducts').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: '제품을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    return NextResponse.json({ message: '구강용품이 업데이트되었습니다.' });
  } catch (error) {
    console.error('구강용품 업데이트 오류:', error);
    return NextResponse.json({ error: '구강용품을 업데이트하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '제품 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const { db } = await connectToDatabase();
    
    const result = await db.collection('dentalproducts').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: '제품을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    return NextResponse.json({ message: '구강용품이 삭제되었습니다.' });
  } catch (error) {
    console.error('구강용품 삭제 오류:', error);
    return NextResponse.json({ error: '구강용품을 삭제하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 