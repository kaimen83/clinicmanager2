import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const cardCompany = searchParams.get('cardCompany');

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
    const matchStage: any = {
      date: { $gte: startUtc, $lte: endUtc },
      paymentMethod: '카드'
    };

    // 카드사 필터 추가
    if (cardCompany && cardCompany !== 'all') {
      matchStage.cardCompany = cardCompany;
    }

    const cardSalesAggregation = await db.collection('transactions')
      .aggregate([
        { $match: matchStage },
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
    const extendedStartUtc = new Date(startUtc);
    extendedStartUtc.setDate(extendedStartUtc.getDate() - 5);
    const extendedEndUtc = new Date(endUtc);
    extendedEndUtc.setDate(extendedEndUtc.getDate() + 5);
    
    const depositQuery: any = {
      saleDate: { $gte: extendedStartUtc, $lte: extendedEndUtc }
    };

    if (cardCompany && cardCompany !== 'all') {
      depositQuery.cardCompany = cardCompany;
    }
    
    const existingDeposits = await db.collection('carddeposits')
      .find(depositQuery)
      .sort({ updatedAt: -1 })
      .toArray();

    await client.close();

    // 입금 정보를 카드사+금액으로 매핑
    const existingDepositsMap = new Map();
    existingDeposits.forEach((deposit: any) => {
      const key = `${deposit.cardCompany}_${deposit.saleAmount}`;
      if (!existingDepositsMap.has(key)) {
        existingDepositsMap.set(key, deposit);
      }
    });

    // 데이터 병합 및 엑셀 형식으로 변환
    const cardDeposits = cardSalesAggregation.map((sale: any) => {
      const key = `${sale.cardCompany}_${sale.saleAmount}`;
      const existingDeposit = existingDepositsMap.get(key);
      
      const expectedDepositDate = new Date(sale.saleDate);
      expectedDepositDate.setDate(expectedDepositDate.getDate() + 2);
      
      return {
        매출일자: new Date(sale.saleDate).toLocaleDateString('ko-KR'),
        카드사: sale.cardCompany,
        매출금액: sale.saleAmount,
        입금예정일: (existingDeposit?.expectedDepositDate ? 
          new Date(existingDeposit.expectedDepositDate).toLocaleDateString('ko-KR') : 
          expectedDepositDate.toLocaleDateString('ko-KR')),
        실제입금일: existingDeposit?.actualDepositDate ? 
          new Date(existingDeposit.actualDepositDate).toLocaleDateString('ko-KR') : '-',
        실제입금액: existingDeposit?.actualDepositAmount || '-',
        수수료: existingDeposit?.fee || '-',
        수수료율: existingDeposit?.fee && sale.saleAmount ? 
          `${((existingDeposit.fee / sale.saleAmount) * 100).toFixed(2)}%` : '-',
        상태: existingDeposit?.status || '미입금',
        보류사유: existingDeposit?.holdReason || '-',
        거래건수: sale.transactionCount
      };
    });

    // 엑셀 워크북 생성
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(cardDeposits);

    // 열 너비 조정
    const columnWidths = [
      { wch: 12 }, // 매출일자
      { wch: 15 }, // 카드사
      { wch: 15 }, // 매출금액
      { wch: 12 }, // 입금예정일
      { wch: 12 }, // 실제입금일
      { wch: 15 }, // 실제입금액
      { wch: 15 }, // 수수료
      { wch: 10 }, // 수수료율
      { wch: 10 }, // 상태
      { wch: 20 }, // 보류사유
      { wch: 10 }  // 거래건수
    ];
    worksheet['!cols'] = columnWidths;

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, '카드매출입금');

    // 엑셀 파일을 버퍼로 생성
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });

    // 파일명 생성 (한국어 날짜 형식)
    const fileName = `카드매출입금_${startDate}_${endDate}${cardCompany && cardCompany !== 'all' ? `_${cardCompany}` : ''}.xlsx`;

    // 응답 헤더 설정
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    headers.set('Content-Length', excelBuffer.length.toString());

    return new NextResponse(excelBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('엑셀 내보내기 실패:', error);
    return NextResponse.json({ 
      error: '엑셀 내보내기에 실패했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}