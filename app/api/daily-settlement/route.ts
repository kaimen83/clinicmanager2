import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import dbConnect from '@/lib/mongoose';
import Expense from '@/lib/models/Expense';
import { toKstDate } from '@/lib/utils';

// GET 요청 처리 - 일일결산 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date'); // YYYY-MM-DD
    
    if (!date) {
      return NextResponse.json(
        { error: "날짜 파라미터가 필요합니다. (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    await dbConnect();
    
    // 일별 날짜 범위 계산
    const selectedDate = toKstDate(date);
    const startDate = new Date(selectedDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(selectedDate);
    endDate.setHours(23, 59, 59, 999);
    
    // 1. 수입내역 (결제 방법별)
    const transactions = await db.collection('transactions')
      .find({
        date: { $gte: startDate, $lte: endDate }
      })
      .toArray();
    
    // 결제 방법별 그룹화
    const paymentByMethod = transactions.reduce((acc, t) => {
      const method = t.paymentMethod || '기타';
      if (!acc[method]) {
        acc[method] = { count: 0, amount: 0, transactions: [] };
      }
      acc[method].count += 1;
      acc[method].amount += Number(t.paymentAmount) || 0;
      acc[method].transactions.push(t);
      return acc;
    }, {});

    // 카드 결제 세부 정보 (카드사별 그룹화)
    const cardTransactions = transactions.filter(t => t.paymentMethod === '카드');
    const cardByCompany = cardTransactions.reduce((acc, t) => {
      const company = t.cardCompany || '기타카드';
      if (!acc[company]) {
        acc[company] = { count: 0, amount: 0 };
      }
      acc[company].count += 1;
      acc[company].amount += Number(t.paymentAmount) || 0;
      return acc;
    }, {});
    
    // 2. 지출내역
    const dateParts = date.split('-').map(Number);
    const startDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0);
    const endDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59, 999);
    
    const kstOffset = 9 * 60 * 60 * 1000;
    const expenseStartDate = new Date(startDateObj.getTime() - kstOffset);
    const expenseEndDate = new Date(endDateObj.getTime() - kstOffset);
    
    const expenses = await Expense.find({
      date: { $gte: expenseStartDate, $lte: expenseEndDate }
    });
    
    // 3. 데스크 현금시재
    const cashRecords = await db.collection('cashrecords')
      .find({
        date: { $gte: startDate, $lte: endDate }
      })
      .toArray();
    
    // 현금 흐름 계산
    const cashIncome = cashRecords
      .filter(record => record.type === '수입')
      .reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
    
    const cashExpense = cashRecords
      .filter(record => record.type === '지출')
      .reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
    
    const bankDeposit = cashRecords
      .filter(record => record.type === '통장입금')
      .reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
    
    // 전일까지의 모든 현금 기록으로 전일이월 잔액 계산
    const previousDate = new Date(startDate);
    previousDate.setDate(previousDate.getDate() - 1);
    previousDate.setHours(23, 59, 59, 999);
    
    const previousCashRecords = await db.collection('cashrecords')
      .find({
        date: { $lt: startDate }
      })
      .toArray();
    
    // 전일까지의 누적 잔액 계산
    let previousBalance = 0;
    previousCashRecords.forEach(record => {
      if (record.type === '수입') {
        previousBalance += Number(record.amount) || 0;
      } else if (record.type === '지출') {
        previousBalance -= Number(record.amount) || 0;
      } else if (record.type === '통장입금') {
        previousBalance -= Number(record.amount) || 0;
      }
    });
    
    // 4. 임플란트 식립 데이터 (FirstOp 컬렉션에서 조회)
    const firstOps = await db.collection('firstops')
      .find({
        date: { $gte: startDate, $lte: endDate }
      })
      .toArray();
    
    // 임플란트 및 이식재 총 개수 계산
    let totalImplantCount = 0;
    let totalFixtureCount = 0;
    
    firstOps.forEach(op => {
      if (op.implants && Array.isArray(op.implants)) {
        totalImplantCount += op.implants.reduce((sum, implant) => sum + (implant.quantity || 0), 0);
      }
      if (op.fixtures && Array.isArray(op.fixtures)) {
        totalFixtureCount += op.fixtures.reduce((sum, fixture) => sum + (fixture.quantity || 0), 0);
      }
    });
    
    // 5. 구강용품 판매 데이터 (DentalProductSale 컬렉션에서 조회)
    const dentalProductSales = await db.collection('dentalproductsales')
      .find({
        date: { $gte: startDate, $lte: endDate }
      })
      .toArray();
    
    // 구강용품 입고 데이터 (DentalProductInventoryLog 컬렉션에서 조회)
    const dentalProductInventoryLogs = await db.collection('dentalproductinventorylogs')
      .find({
        date: { $gte: startDate, $lte: endDate },
        type: 'in'
      })
      .toArray();
    
    // 6. 현금영수증 발행내역
    const cashReceiptTransactions = transactions.filter(t => t.cashReceipt === true);
    const nonIssuedCashReceiptTransactions = transactions.filter(t => t.cashReceipt === false && (t.paymentMethod === '현금' || t.paymentMethod === '계좌이체'));
    
    // 7. 상담내역
    const consultations = await db.collection('consultations')
      .find({
        $or: [
          { date: { $gte: startDate, $lte: endDate } },
          { confirmedDate: { $gte: startDate, $lte: endDate } }
        ]
      })
      .toArray();
    
    // 진료외수입 데이터
    const extraIncomes = await db.collection('extraincomes')
      .find({
        date: { $gte: startDate, $lte: endDate }
      })
      .toArray();
    
    // 신환수 계산 (오늘 처음 방문한 환자)
    const newPatients = await db.collection('patients')
      .find({
        createdAt: { $gte: startDate, $lte: endDate }
      })
      .toArray();
    
    // 응답 데이터 구성
    const settlementData = {
      date,
      
      // 1. 수입내역
      income: {
        paymentByMethod,
        cardByCompany,
        totalAmount: transactions.reduce((sum, t) => sum + (Number(t.paymentAmount) || 0), 0),
        extraIncomes,
        extraIncomeTotal: extraIncomes.reduce((sum, income) => sum + (Number(income.amount) || 0), 0)
      },
      
      // 2. 지출내역
      expenses: {
        items: expenses,
        totalAmount: expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
      },
      
      // 3. 데스크 현금시재
      cashRecords: {
        records: cashRecords,
        summary: {
          previousBalance, // 전일이월
          cashIncome,
          cashExpense,
          bankDeposit,
          netCash: cashIncome - cashExpense - bankDeposit,
          endBalance: previousBalance + cashIncome - cashExpense - bankDeposit // 당일마감 시재
        }
      },
      
      // 4. 임플란트 관련
      implant: {
        implantCount: totalImplantCount,
        fixtureCount: totalFixtureCount,
        placements: firstOps
      },
      
      // 5. 구강용품 관련
      dentalProducts: {
        sales: dentalProductSales,
        inventoryLogs: dentalProductInventoryLogs
      },
      
      // 6. 현금영수증 발행내역
      cashReceipts: {
        transactions: cashReceiptTransactions,
        count: cashReceiptTransactions.length,
        totalAmount: cashReceiptTransactions.reduce((sum, t) => sum + (Number(t.paymentAmount) || 0), 0),
        nonIssuedTransactions: nonIssuedCashReceiptTransactions
      },
      
      // 7. 상담내역
      consultations: {
        all: consultations,
        agreed: consultations.filter(c => c.agreed === true),
        nonAgreed: consultations.filter(c => c.agreed === false),
        agreedAmount: consultations.filter(c => c.agreed === true).reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
        nonAgreedAmount: consultations.filter(c => c.agreed === false).reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
      },
      
      // 8. 신환수
      newPatientCount: newPatients.length
    };
    
    return NextResponse.json(settlementData);
  } catch (error) {
    console.error('일일결산 데이터 조회 중 에러:', error);
    return NextResponse.json(
      { error: "일일결산 데이터 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}