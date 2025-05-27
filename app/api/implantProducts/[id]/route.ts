import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongoose';

// 모델이 이미 등록되어 있는지 확인 후 등록
const ImplantProduct = mongoose.models.ImplantProduct;

// 특정 ID 임플란트 제품 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // MongoDB에 연결
    await dbConnect();
    
    try {
      const product = await ImplantProduct.findById(id);
      if (!product) {
        return NextResponse.json({ error: '임플란트 제품을 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json(product);
    } catch (error) {
      return NextResponse.json({ error: '잘못된 ID 형식입니다.' }, { status: 400 });
    }
  } catch (error) {
    console.error('임플란트 제품 조회 오류:', error);
    return NextResponse.json({ error: '임플란트 제품 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 특정 ID 임플란트 제품 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();
    const { category, name, specification, price, stock, usage } = body;
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // MongoDB에 연결
    await dbConnect();
    
    // 해당 제품 존재 확인
    const product = await ImplantProduct.findById(id);
    if (!product) {
      return NextResponse.json({ error: '임플란트 제품을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 필드 업데이트
    if (category) product.category = category;
    if (name) product.name = name;
    if (specification !== undefined) product.specification = specification;
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (usage) product.usage = usage;
    
    // 업데이트 시간 설정
    product.updatedAt = new Date();
    
    // 저장
    const updatedProduct = await product.save();
    
    return NextResponse.json({
      message: '임플란트 제품 정보가 업데이트되었습니다.',
      product: updatedProduct
    });
  } catch (error: any) {
    console.error('임플란트 제품 업데이트 오류:', error);
    // 유효성 검사 에러 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: '임플란트 제품 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 특정 ID 임플란트 제품 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // MongoDB에 연결
    await dbConnect();
    
    // 해당 제품이 존재하는지 확인
    const product = await ImplantProduct.findById(id);
    if (!product) {
      return NextResponse.json({ error: '임플란트 제품을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 제품 삭제
    await ImplantProduct.findByIdAndDelete(id);
    
    return NextResponse.json({ message: '임플란트 제품이 삭제되었습니다.' });
  } catch (error) {
    console.error('임플란트 제품 삭제 오류:', error);
    return NextResponse.json({ error: '임플란트 제품 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 