import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongoose';
import ImplantInventoryLog from '@/lib/models/ImplantInventoryLog';

// ImplantProduct 모델 (기존 route.ts에서 가져옴)
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
  }
}, {
  timestamps: true
});

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

const ImplantProduct = mongoose.models.ImplantProduct || mongoose.model('ImplantProduct', implantProductSchema);

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
        }

        await dbConnect();

        const log = await ImplantInventoryLog.findById(params.id);
        if (!log) {
            return NextResponse.json({ message: '활동 내역을 찾을 수 없습니다.' }, { status: 404 });
        }

        const product = await ImplantProduct.findById(log.productId);
        if (!product) {
            return NextResponse.json({ message: '제품을 찾을 수 없습니다.' }, { status: 404 });
        }

        // 재고 수량 복구
        const quantityChange = log.type === 'IN' ? -log.quantity : log.quantity;
        await product.updateStock(quantityChange);

        // 활동 내역 삭제
        await ImplantInventoryLog.findByIdAndDelete(params.id);

        return NextResponse.json({ message: '활동 내역이 삭제되었습니다.' });
    } catch (error) {
        console.error('활동 내역 삭제 중 에러:', error);
        return NextResponse.json({ message: '서버 에러가 발생했습니다.' }, { status: 500 });
    }
} 