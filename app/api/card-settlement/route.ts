import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// 업무일 기준으로 2일 후 날짜를 계산하는 함수
function calculateExpectedDepositDate(saleDate: Date): Date {
  const date = new Date(saleDate);
  let businessDaysToAdd = 2;
  
  while (businessDaysToAdd > 0) {
    date.setDate(date.getDate() + 1);
    
    // 주말 제외 (0: 일요일, 6: 토요일)
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysToAdd--;
    }
  }
  
  return date;
}

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate } = await request.json();
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '시작일과 종료일이 필요합니다.' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // 날짜 범위를 한국 시간 기준으로 변환
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // 하루의 끝까지 포함하도록 종료일을 다음날 00:00:00으로 설정
    endDateObj.setHours(23, 59, 59, 999);

    // MongoDB 집계 파이프라인
    const pipeline = [
      {
        $match: {
          date: {
            $gte: startDateObj,
            $lte: endDateObj
          },
          paymentMethod: "카드",
          cardCompany: { $nin: [null, ""] }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$date",
                timezone: "Asia/Seoul"
              }
            },
            cardCompany: "$cardCompany"
          },
          totalAmount: { $sum: "$paymentAmount" },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: {
          "_id.date": 1,
          "_id.cardCompany": 1
        }
      }
    ];

    const results = await db.collection('transactions').aggregate(pipeline).toArray();
    
    // carddeposits에서 처리 상태 조회
    const depositStatusMap = new Map();
    const deposits = await db.collection('carddeposits')
      .find({
        cardCompany: { $in: results.map(r => r._id.cardCompany) },
        saleDate: {
          $gte: startDateObj,
          $lte: endDateObj
        }
      })
      .toArray();
    
    // 처리 상태 맵 생성
    deposits.forEach((deposit: any) => {
      const key = `${deposit.saleDate.toISOString().split('T')[0]}_${deposit.cardCompany}`;
      depositStatusMap.set(key, {
        isProcessed: true,
        actualDepositDate: deposit.actualDepositDate,
        actualDepositAmount: deposit.actualDepositAmount,
        fee: deposit.fee,
        feeRate: deposit.feeRate
      });
    });
    
    // 입금예정일과 처리 상태를 계산하여 추가
    const processedResults = results.map(item => {
      const saleDate = new Date(item._id.date);
      const expectedDepositDate = calculateExpectedDepositDate(saleDate);
      
      // 처리 상태 확인
      const statusKey = `${item._id.date}_${item._id.cardCompany}`;
      const depositStatus = depositStatusMap.get(statusKey);
      
      return {
        ...item,
        expectedDepositDate: expectedDepositDate.toISOString(),
        isProcessed: depositStatus?.isProcessed || false,
        actualDepositDate: depositStatus?.actualDepositDate?.toISOString() || null,
        actualDepositAmount: depositStatus?.actualDepositAmount || null,
        fee: depositStatus?.fee || null,
        feeRate: depositStatus?.feeRate || null
      };
    });

    return NextResponse.json({
      success: true,
      data: processedResults,
      total: processedResults.length
    });

  } catch (error) {
    console.error('카드정산 데이터 조회 오류:', error);
    return NextResponse.json(
      { error: '데이터를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}