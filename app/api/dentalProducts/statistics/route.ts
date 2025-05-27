import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view') || 'date';
    
    if (!startDate || !endDate) {
      return NextResponse.json({ error: '시작일과 종료일을 모두 지정해주세요.' }, { status: 400 });
    }

    // 날짜 범위 설정 (한국 시간 기준으로 처리)
    const startParts = startDate.split('-').map(Number);
    const endParts = endDate.split('-').map(Number);
    
    const start = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);
    
    // 한국 시간과 UTC 간의 시차 조정 (9시간)
    const kstOffset = 9 * 60 * 60 * 1000;
    const startUtc = new Date(start.getTime() - kstOffset);
    const endUtc = new Date(end.getTime() - kstOffset);

    if (isNaN(startUtc.getTime()) || isNaN(endUtc.getTime())) {
      return NextResponse.json({ error: '올바른 날짜 형식이 아닙니다.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // 판매 데이터 조회
    const sales = await db.collection('dentalproductsales').aggregate([
      {
        $match: {
          date: { $gte: startUtc, $lte: endUtc }
        }
      }
    ]).toArray();

    // 입고/출고 데이터 조회
    const inventoryLogs = await db.collection('dentalproductinventorylogs').aggregate([
      {
        $match: {
          date: { $gte: startUtc, $lte: endUtc }
        }
      },
      {
        $lookup: {
          from: 'dentalproducts',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      }
    ]).toArray();

    // 제품 정보 조회
    const productIds = [
      ...sales.flatMap(sale => sale.products.map((p: any) => p.productId)),
      ...inventoryLogs.map(log => log.productId)
    ];
    const products = await db.collection('dentalproducts').find({ 
      _id: { $in: productIds } 
    }).toArray();
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    let statistics = {
      totalSales: 0,
      totalQuantity: 0,
      totalProfit: 0,
      activities: [] as any[]
    };

    // 판매 데이터 처리
    sales.forEach((sale: any) => {
      const quantity = sale.products.reduce((sum: number, p: any) => sum + p.quantity, 0);
      const totalAmount = sale.products.reduce((sum: number, p: any) => sum + (p.quantity * p.salePrice), 0);
      const profit = sale.products.reduce((sum: number, p: any) => {
        const product = productMap.get(p.productId.toString());
        const purchasePrice = product ? product.purchasePrice || 0 : 0;
        return sum + ((p.salePrice - purchasePrice) * p.quantity);
      }, 0);

      statistics.totalSales += totalAmount;
      statistics.totalQuantity += quantity;
      statistics.totalProfit += profit;

      statistics.activities.push({
        type: 'SALE',
        date: sale.date,
        patientName: sale.patientName,
        userName: '사용자',
        products: sale.products.map((p: any) => {
          const productInfo = productMap.get(p.productId.toString());
          return {
            productId: p.productId.toString(),
            name: productInfo && productInfo.specification 
              ? `${p.name} ${productInfo.specification}`
              : p.name,
            quantity: p.quantity,
            price: p.salePrice,
            amount: p.quantity * p.salePrice
          };
        }),
        totalAmount: totalAmount,
        notes: sale.notes,
        _id: sale._id.toString()
      });
    });

    // 입고/출고 데이터 처리
    inventoryLogs.forEach((log: any) => {
      statistics.activities.push({
        type: log.type,
        date: log.date,
        userName: '사용자',
        products: [{
          productId: log.product._id.toString(),
          name: log.product.specification 
            ? `${log.product.name} ${log.product.specification}`
            : log.product.name,
          quantity: log.quantity,
          price: log.price,
          amount: log.quantity * log.price
        }],
        totalAmount: log.quantity * log.price,
        notes: log.notes,
        _id: log._id.toString()
      });
    });

    // 날짜순 정렬
    statistics.activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (view === 'product') {
      // 품목별 통계 계산
      const productStats = new Map();

      statistics.activities.forEach((activity: any) => {
        activity.products.forEach((product: any) => {
          if (!productStats.has(product.productId)) {
            const productInfo = productMap.get(product.productId.toString());
            productStats.set(product.productId, {
              _id: product.productId,
              name: productInfo ? productInfo.name : product.name.split(' ')[0], // 실제 제품명 사용
              specification: productInfo ? productInfo.specification : '',
              sellingPrice: productInfo ? productInfo.sellingPrice : 0,
              purchasePrice: productInfo ? productInfo.purchasePrice : 0,
              totalQuantity: 0,
              totalAmount: 0,
              profit: 0,
              activities: []
            });
          }

          const stat = productStats.get(product.productId);
          if (activity.type === 'SALE') {
            stat.totalQuantity += product.quantity;
            stat.totalAmount += product.amount;
            // 순이익 계산 - 실제 제품 정보의 가격 사용
            const productProfit = (stat.sellingPrice - stat.purchasePrice) * product.quantity;
            stat.profit += productProfit;
          }

          // 해당 제품의 활동 내역만 추가
          const productActivity = {
            _id: activity._id,
            date: activity.date,
            type: activity.type,
            quantity: product.quantity,
            price: product.price,
            amount: product.amount,
            notes: activity.notes,
            patientName: activity.patientName
          };

          // 중복 방지 - 더 정확한 중복 체크
          const activityExists = stat.activities.some((existing: any) => 
            existing._id === productActivity._id && 
            existing.type === productActivity.type
          );

          if (!activityExists) {
            stat.activities.push(productActivity);
          }
        });
      });

      // 판매량이 있는 제품만 필터링하고 정렬
      const filteredStats = Array.from(productStats.values()).filter((stat: any) => stat.totalQuantity > 0);
      filteredStats.sort((a: any, b: any) => b.totalAmount - a.totalAmount); // 판매금액 순으로 정렬

      (statistics as any).productStats = filteredStats;
    }

    return NextResponse.json(statistics);

  } catch (error) {
    console.error('통계 데이터 조회 중 에러:', error);
    return NextResponse.json({ error: '통계 데이터를 불러오는데 실패했습니다.' }, { status: 500 });
  }
} 