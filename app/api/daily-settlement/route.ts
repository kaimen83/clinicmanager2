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
    
    // 4. 임플란트 식립수 및 입출고
    const implantLogs = await db.collection('implantinventorylogs')
      .find({
        date: { $gte: startDate, $lte: endDate }
      })
      .toArray();
    
    // 임플란트 식립수 계산 (type="out"이고 outReason이 "식립" 관련)
    const implantPlacements = implantLogs.filter(log => 
      log.type === 'out' && 
      (log.outReason?.includes('식립') || log.outReason?.includes('임플란트'))
    );
    
    const implantPlacementCount = implantPlacements.reduce((sum, log) => sum + (log.quantity || 0), 0);
    
    // 5. 구강용품 입출고
    const dentalProductLogs = await db.collection('dentalproductinventorylogs')
      .find({
        date: { $gte: startDate, $lte: endDate }
      })
      .toArray();
    
    // 6. 현금영수증 발행내역
    const cashReceiptTransactions = transactions.filter(t => t.cashReceipt === true);
    
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
    
    // 응답 데이터 구성
    const settlementData = {
      date,
      
      // 1. 수입내역
      income: {
        paymentByMethod,
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
      cashRecords,
      
      // 4. 임플란트 관련
      implant: {
        placementCount: implantPlacementCount,
        placementDetails: implantPlacements,
        inventoryLogs: implantLogs,
        inCount: implantLogs.filter(log => log.type === 'in').reduce((sum, log) => sum + (log.quantity || 0), 0),
        outCount: implantLogs.filter(log => log.type === 'out').reduce((sum, log) => sum + (log.quantity || 0), 0)
      },
      
      // 5. 구강용품 입출고
      dentalProducts: {
        inventoryLogs: dentalProductLogs,
        inCount: dentalProductLogs.filter(log => log.type === 'in').reduce((sum, log) => sum + (log.quantity || 0), 0),
        outCount: dentalProductLogs.filter(log => log.type === 'out').reduce((sum, log) => sum + (log.quantity || 0), 0)
      },
      
      // 6. 현금영수증 발행내역
      cashReceipts: {
        transactions: cashReceiptTransactions,
        count: cashReceiptTransactions.length,
        totalAmount: cashReceiptTransactions.reduce((sum, t) => sum + (Number(t.paymentAmount) || 0), 0)
      },
      
      // 7. 상담내역
      consultations: {
        all: consultations,
        agreed: consultations.filter(c => c.agreed === true),
        nonAgreed: consultations.filter(c => c.agreed === false),
        agreedAmount: consultations.filter(c => c.agreed === true).reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
        nonAgreedAmount: consultations.filter(c => c.agreed === false).reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
      }
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