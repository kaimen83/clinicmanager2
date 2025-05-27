import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongoose';
import ImplantInventoryLog from '@/lib/models/ImplantInventoryLog';
// import { toKstDate, toISODateString } from '@/lib/utils/dateUtils';

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

const ImplantProduct = mongoose.models.ImplantProduct || mongoose.model('ImplantProduct', implantProductSchema);

export async function GET(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const category = searchParams.get('category');
        const usage = searchParams.get('usage');
        const view = searchParams.get('view');
        const productName = searchParams.get('productName');

        const query: any = {};

        // 날짜 필터 추가 (한국 시간 기준)
        if (startDate && endDate) {
            // 시작 날짜: 해당 날짜의 00:00:00 (한국 시간)
            const startParts = startDate.split('-').map(Number);
            const startDateObj = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
            
            // 종료 날짜: 해당 날짜의 23:59:59.999 (한국 시간)
            const endParts = endDate.split('-').map(Number);
            const endDateObj = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);
            
            // 한국 시간과 UTC 간의 시차 조정 (9시간)
            const kstOffset = 9 * 60 * 60 * 1000;
            const startUtc = new Date(startDateObj.getTime() - kstOffset);
            const endUtc = new Date(endDateObj.getTime() - kstOffset);
            
            query.date = {
                $gte: startUtc,
                $lte: endUtc
            };
        }

        // 카테고리 필터
        if (category) {
            const products = await ImplantProduct.find({ category });
            query.productId = { $in: products.map(p => p._id) };
        }

        // 사용처 필터
        if (usage) {
            const products = await ImplantProduct.find({ usage });
            if (query.productId) {
                const usageProductIds = products.map(p => p._id.toString());
                query.productId.$in = query.productId.$in
                    .filter((id: any) => usageProductIds.includes(id.toString()));
            } else {
                query.productId = { $in: products.map(p => p._id) };
            }
        }

        // 품목명 필터
        if (productName) {
            const products = await ImplantProduct.find({ name: productName });
            if (query.productId) {
                const nameProductIds = products.map(p => p._id.toString());
                query.productId.$in = query.productId.$in
                    .filter((id: any) => nameProductIds.includes(id.toString()));
            } else {
                query.productId = { $in: products.map(p => p._id) };
            }
        }

        const logs = await ImplantInventoryLog.find(query)
            .populate('productId')
            .sort({ date: -1 });

        // 통계 데이터 계산
        const statistics = {
            totalUsage: 0,
            totalAmount: 0,
            totalStockIn: 0,
            totalStockInAmount: 0,
            totalDisposal: 0,
            activities: [] as any[],
            productStats: [] as any[]
        };

        // 활동 내역 및 통계 계산
        logs.forEach(log => {
            if (log.type === 'OUT') {
                statistics.totalUsage += log.quantity;
                statistics.totalAmount += log.quantity * (log.productId as any).price;
                if (log.outReason === '폐기') {
                    statistics.totalDisposal += log.quantity;
                }
            } else {
                statistics.totalStockIn += log.quantity;
                statistics.totalStockInAmount += log.quantity * (log.productId as any).price;
            }

            statistics.activities.push({
                _id: log._id,
                date: log.date,
                type: log.type,
                category: (log.productId as any).category,
                productName: (log.productId as any).name,
                specification: (log.productId as any).specification,
                usage: (log.productId as any).usage,
                quantity: log.quantity,
                patientName: log.patientName,
                doctor: log.doctor,
                outReason: log.outReason,
                notes: log.notes
            });
        });

        // 품목별 통계 계산
        if (view === 'product') {
            const products = await ImplantProduct.find();
            for (const product of products) {
                const productLogs = logs.filter(log => 
                    (log.productId as any)._id.toString() === product._id.toString()
                );

                const totalUsage = productLogs
                    .filter(log => log.type === 'OUT')
                    .reduce((sum, log) => sum + log.quantity, 0);

                const totalAmount = totalUsage * product.price;

                if (totalUsage > 0) {
                    statistics.productStats.push({
                        _id: product._id,
                        category: product.category,
                        name: product.name,
                        specification: product.specification,
                        usage: product.usage,
                        totalUsage,
                        totalAmount,
                        activities: productLogs.map(log => ({
                            _id: log._id,
                            date: log.date,
                            type: log.type,
                            quantity: log.quantity,
                            patientName: log.patientName,
                            doctor: log.doctor,
                            outReason: log.outReason,
                            notes: log.notes
                        }))
                    });
                }
            }
        }

        return NextResponse.json(statistics);
    } catch (error) {
        console.error('통계 데이터 조회 중 에러:', error);
        return NextResponse.json({ message: '서버 에러가 발생했습니다.' }, { status: 500 });
    }
} 