import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongoose';

// ImplantProduct 모델 스키마 정의
const implantProductSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['fixture', '이식재', '소모품', '기타']
  },
  name: {
    type: String,
    required: true
  },
  specification: {
    type: String,
    required: false
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  usage: {
    type: String,
    required: true,
    enum: ['원내', '기공소']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 인덱스 추가
implantProductSchema.index({ category: 1, name: 1 });

// 재고 업데이트 메서드
implantProductSchema.methods.updateStock = async function(quantity: number) {
  // 음수 재고 방지
  if (this.stock + quantity < 0) {
    throw new Error('재고가 부족합니다.');
  }
  
  // 재고 업데이트
  this.stock += quantity;
  this.updatedAt = new Date();
  
  // 변경사항 저장
  return await this.save();
};

// 모델이 이미 등록되어 있는지 확인 후 등록
const ImplantProduct = mongoose.models.ImplantProduct || mongoose.model('ImplantProduct', implantProductSchema);

// 모든 임플란트 제품 가져오기
export async function GET(request: NextRequest) {
  try {
    // 쿼리 파라미터 처리
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const category = searchParams.get('category');
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // MongoDB에 연결
    await dbConnect();
    
    // 특정 ID로 조회
    if (id) {
      try {
        const product = await ImplantProduct.findById(id);
        if (!product) {
          return NextResponse.json({ error: '임플란트 제품을 찾을 수 없습니다.' }, { status: 404 });
        }
        return NextResponse.json(product);
      } catch (error) {
        return NextResponse.json({ error: '잘못된 ID 형식입니다.' }, { status: 400 });
      }
    }
    
    // 카테고리별 조회
    const query = category ? { category } : {};
    const products = await ImplantProduct.find(query).sort({ category: 1, name: 1 });
    
    return NextResponse.json(products);
  } catch (error) {
    console.error('임플란트 제품 조회 오류:', error);
    return NextResponse.json({ error: '임플란트 제품 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 새 임플란트 제품 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, name, specification, price, stock, usage } = body;
    
    // 필수 필드 검증
    if (!category || !name || !price || !usage) {
      return NextResponse.json({ error: '카테고리, 이름, 가격, 사용처는 필수 입력사항입니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // MongoDB에 연결
    await dbConnect();
    
    // 새 임플란트 제품 생성
    const newProduct = new ImplantProduct({
      category,
      name,
      specification: specification || '',
      price,
      stock: stock || 0,
      usage,
    });
    
    const savedProduct = await newProduct.save();
    
    return NextResponse.json({
      message: '임플란트 제품이 등록되었습니다.',
      product: savedProduct
    }, { status: 201 });
  } catch (error: any) {
    console.error('임플란트 제품 생성 오류:', error);
    // 유효성 검사 에러 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: '임플란트 제품 등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 임플란트 제품 정보 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, category, name, specification, price, stock, usage } = body;
    
    if (!id) {
      return NextResponse.json({ error: '제품 ID가 필요합니다.' }, { status: 400 });
    }
    
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

// 임플란트 제품 삭제
export async function DELETE(request: NextRequest) {
  try {
    // 쿼리 파라미터 처리
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