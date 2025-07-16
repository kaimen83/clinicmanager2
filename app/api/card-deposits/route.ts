import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '시작일과 종료일이 필요합니다.' }, { status: 400 });
    }

    // 날짜 필터 설정 (UTC 기준으로 직접 생성)
    const startUtc = new Date(`${startDate}T00:00:00.000Z`);
    const endUtc = new Date(`${endDate}T23:59:59.999Z`);

    // MongoDB 연결 및 조회
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db('hospital_accounting');
    
    // transactions 컬렉션에서 카드사별 매출 집계
    const cardSalesAggregation = await db.collection('transactions')
      .aggregate([
        {
          $match: {
            date: { $gte: startUtc, $lte: endUtc },
            paymentMethod: '카드'
          }
        },
        {
          $group: {
            _id: {
              cardCompany: '$cardCompany',
              saleDate: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$date'
                }
              }
            },
            saleAmount: { $sum: '$paymentAmount' },
            transactionIds: { $push: '$_id' },
            transactionCount: { $sum: 1 }
          }
        },
        {
          $project: {
            cardCompany: '$_id.cardCompany',
            saleDate: { $dateFromString: { dateString: '$_id.saleDate' } },
            saleAmount: 1,
            transactionIds: 1,
            transactionCount: 1,
            _id: 0
          }
        },
        {
          $sort: { saleDate: 1, cardCompany: 1 }
        }
      ])
      .toArray();

    // 기존 carddeposits 컬렉션에서 입금 상태 정보 조회
    const existingDeposits = await db.collection('carddeposits')
      .find({
        saleDate: { $gte: startUtc, $lte: endUtc }
      })
      .toArray();

    // 기존 입금 정보를 키로 매핑 (cardCompany + saleDate)
    const existingDepositsMap = new Map();
    existingDeposits.forEach(deposit => {
      const key = `${deposit.cardCompany}_${deposit.saleDate.toISOString().split('T')[0]}`;
      existingDepositsMap.set(key, deposit);
    });

    // transactions 기반 데이터와 기존 입금 정보 병합
    const cardDeposits = cardSalesAggregation.map(sale => {
      const key = `${sale.cardCompany}_${sale.saleDate.toISOString().split('T')[0]}`;
      const existingDeposit = existingDepositsMap.get(key);
      
      // 입금 예정일 계산 (매출일 + 2 영업일, 기본값)
      const expectedDepositDate = new Date(sale.saleDate);
      expectedDepositDate.setDate(expectedDepositDate.getDate() + 2);
      
      return {
        _id: existingDeposit?._id || `temp_${Date.now()}_${Math.random()}`,
        cardCompany: sale.cardCompany,
        saleDate: sale.saleDate,
        saleAmount: sale.saleAmount,
        expectedDepositDate: existingDeposit?.expectedDepositDate || expectedDepositDate,
        actualDepositDate: existingDeposit?.actualDepositDate || null,
        actualDepositAmount: existingDeposit?.actualDepositAmount || null,
        fee: existingDeposit?.fee || null,
        status: existingDeposit?.status || '미입금',
        holdReason: existingDeposit?.holdReason || null,
        transactionIds: sale.transactionIds,
        transactionCount: sale.transactionCount,
        createdBy: existingDeposit?.createdBy || null,
        createdAt: existingDeposit?.createdAt || new Date(),
        updatedAt: existingDeposit?.updatedAt || new Date()
      };
    });

    await client.close();

    return NextResponse.json(cardDeposits);

  } catch (error) {
    console.error('카드매출/입금 조회 실패:', error);
    return NextResponse.json({ error: '데이터 조회에 실패했습니다.' }, { status: 500 });
  }
} 