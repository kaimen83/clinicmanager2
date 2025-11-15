import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// 한국 시간대 유틸리티 함수들
function toKstDate(date: string | Date): Date {
  const d = new Date(date);
  return new Date(d.getTime() + (9 * 60 * 60 * 1000));
}

function createNewDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + (9 * 60 * 60 * 1000));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  try {
    const { year, month } = await params;
    
    // 날짜 범위 설정 (MongoDB에 저장된 데이터는 KST 날짜가 UTC 00:00:00으로 저장됨)
    // 예: 2025-07-21 KST 데이터가 2025-07-21T00:00:00Z로 저장됨
    const startUtc = new Date(`${year}-${month.padStart(2, '0')}-01T00:00:00.000Z`);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    const endUtc = new Date(`${year}-${month.padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}T23:59:59.999Z`);

    const { db } = await connectToDatabase();
    
    // 거래 내역 조회 (수입)
    const transactions = await db.collection('transactions').find({
      date: { $gte: startUtc, $lte: endUtc }
    }).toArray();

    // 지출 내역 조회
    const expenses = await db.collection('expenses').find({
      date: { $gte: startUtc, $lte: endUtc }
    }).toArray();

    // 진료외 수입 조회
    const extraIncomes = await db.collection('extraincomes').find({
      date: { $gte: startUtc, $lte: endUtc }
    }).toArray();

    // 현금 기록 조회
    const cashRecords = await db.collection('cashrecords').find({
      date: { $gte: startUtc, $lte: endUtc }
    }).toArray();

    // 일별 데이터 집계
    const dailyData: any[] = [];
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      const dayStartUtc = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEndUtc = new Date(`${dateStr}T23:59:59.999Z`);

      // 해당 일의 거래 내역 필터링
      const dayTransactions = transactions.filter((t: any) => {
        const transactionDate = new Date(t.date);
        return transactionDate >= dayStartUtc && transactionDate <= dayEndUtc;
      });

      // 해당 일의 지출 내역 필터링
      const dayExpenses = expenses.filter((e: any) => {
        const expenseDate = new Date(e.date);
        return expenseDate >= dayStartUtc && expenseDate <= dayEndUtc;
      });

      // 해당 일의 진료외 수입 필터링
      const dayExtraIncomes = extraIncomes.filter((ei: any) => {
        const extraIncomeDate = new Date(ei.date);
        return extraIncomeDate >= dayStartUtc && extraIncomeDate <= dayEndUtc;
      });

      // 해당 일의 현금 기록 필터링
      const dayCashRecords = cashRecords.filter((cr: any) => {
        const cashRecordDate = new Date(cr.date);
        return cashRecordDate >= dayStartUtc && cashRecordDate <= dayEndUtc;
      });

      // 결제 방법별 집계 (수납없음 제외)
      const paidTransactions = dayTransactions.filter((t: any) => t.paymentMethod !== '수납없음' && t.paymentAmount > 0);
      
      // 카드 금액 계산 (마이너스 값 포함 - 환불 등)
      const cardAmount = dayTransactions
        .filter((t: any) => t.paymentMethod === '카드')
        .reduce((sum: number, t: any) => sum + (t.paymentAmount || 0), 0);

      const transferAmount = paidTransactions
        .filter((t: any) => t.paymentMethod === '계좌이체')
        .reduce((sum: number, t: any) => sum + (t.paymentAmount || 0), 0);

      const cashAmount = paidTransactions
        .filter((t: any) => t.paymentMethod === '현금')
        .reduce((sum: number, t: any) => sum + (t.paymentAmount || 0), 0);

      // 진료외 수입 합계
      const extraIncomeAmount = dayExtraIncomes.reduce((sum: number, ei: any) => sum + (ei.amount || 0), 0);

      // 총 수입 (카드 + 계좌이체 + 현금 + 진료외수입)
      const totalIncome = cardAmount + transferAmount + cashAmount + extraIncomeAmount;

      // 총 지출
      const totalExpense = dayExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      // 현금 입금 (원장님 전달) - 통장입금 타입
      const cashDeposit = dayCashRecords
        .filter((cr: any) => cr.type === '통장입금')
        .reduce((sum: number, cr: any) => sum + (cr.amount || 0), 0);

      // 신환 수 (중복 제거) - 대시보드 통계와 일치하도록 모든 거래 포함
      const uniqueNewPatients = new Set();
      dayTransactions.forEach((t: any) => {
        if (t.isNew === true) {
          uniqueNewPatients.add(t.chartNumber);
        }
      });
      const newPatients = uniqueNewPatients.size;

      // 총 환자 수 (중복 제거) - 대시보드 통계와 일치하도록 모든 거래 포함
      const uniquePatients = new Set();
      dayTransactions.forEach((t: any) => {
        uniquePatients.add(t.chartNumber);
      });
      const totalPatients = uniquePatients.size;

      // 입금 완료 여부 확인
      const isDepositCompleted = dayCashRecords.some((cr: any) => cr.isClosed === true);

      dailyData.push({
        date: dateStr,
        totalIncome,
        cardAmount,
        transferAmount,
        cashAmount,
        extraIncomeAmount,
        cashDeposit,
        totalExpense,
        newPatients,
        totalPatients,
        isDepositCompleted
      });
    }

    // 월간 합계 계산
    const summary = {
      totalIncome: dailyData.reduce((sum, day) => sum + day.totalIncome, 0),
      cardAmount: dailyData.reduce((sum, day) => sum + day.cardAmount, 0),
      transferAmount: dailyData.reduce((sum, day) => sum + day.transferAmount, 0),
      cashAmount: dailyData.reduce((sum, day) => sum + day.cashAmount, 0),
      extraIncomeAmount: dailyData.reduce((sum, day) => sum + day.extraIncomeAmount, 0),
      cashDeposit: dailyData.reduce((sum, day) => sum + day.cashDeposit, 0),
      totalExpense: dailyData.reduce((sum, day) => sum + day.totalExpense, 0),
      totalNewPatients: dailyData.reduce((sum, day) => sum + day.newPatients, 0),
      totalPatients: dailyData.reduce((sum, day) => sum + day.totalPatients, 0)
    };

    return NextResponse.json({
      dailyData,
      summary
    });

  } catch (error) {
    console.error('월간 일계표 데이터 조회 오류:', error);
    return NextResponse.json(
      { error: '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 