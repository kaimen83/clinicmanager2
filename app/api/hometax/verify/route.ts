import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { MongoClient } from 'mongodb';
import { format } from 'date-fns';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined');
}

const client = new MongoClient(process.env.MONGODB_URI);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, includeLastMonth = true } = await request.json();
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    await client.connect();
    const db = client.db('hospital_accounting');
    
    // 조회 시작일 계산 (지난 달 1일부터)
    const baseDate = new Date(date);
    let queryStartDate = new Date(baseDate);
    
    if (includeLastMonth) {
      // 지난 달 1일로 설정
      queryStartDate.setMonth(queryStartDate.getMonth() - 1);
      queryStartDate.setDate(1);
      queryStartDate.setHours(0, 0, 0, 0);
    } else {
      // 해당 날짜만
      queryStartDate.setHours(0, 0, 0, 0);
    }
    
    const queryEndDate = new Date(baseDate);
    queryEndDate.setHours(23, 59, 59, 999);

    // 기간 내 현금영수증 발행 거래 조회
    const transactions = await db.collection('transactions').find({
      date: { $gte: queryStartDate, $lte: queryEndDate },
      paymentMethod: { $in: ['현금', '계좌이체'] },
      cashReceipt: true
    }).toArray();

    // 홈텍스 현금영수증 데이터 조회 (전체 기간)
    const hometaxReceipts = await db.collection('hometaxcashreceipts').find({}).toArray();

    // 매칭 로직
    let matchedCount = 0;
    const updatePromises = [];

    for (const transaction of transactions) {
      // 이미 확인된 거래는 스킵
      if (transaction.hometaxVerified) continue;

      // 홈텍스 데이터와 매칭 시도
      const matched = hometaxReceipts.find(receipt => {
        // 날짜 매칭
        const transactionDateStr = format(new Date(transaction.date), 'yyyy-MM-dd');
        if (receipt.거래일자 !== transactionDateStr) return false;
        
        // 금액 매칭 (부가세 포함 총액)
        const receiptAmount = receipt.매입금액 || (receipt.공급가액 + receipt.부가세 + receipt.봉사료);
        return receiptAmount === transaction.paymentAmount;
      });

      if (matched) {
        // 매칭된 경우 hometaxVerified를 true로 업데이트
        updatePromises.push(
          db.collection('transactions').updateOne(
            { _id: transaction._id },
            { $set: { hometaxVerified: true } }
          )
        );
        matchedCount++;
      }
    }

    // 모든 업데이트 실행
    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      totalTransactions: transactions.length,
      matchedCount,
      hometaxReceiptsCount: hometaxReceipts.length
    });

  } catch (error) {
    console.error('홈텍스 검증 에러:', error);
    return NextResponse.json(
      { error: '홈텍스 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}