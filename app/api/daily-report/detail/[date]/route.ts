import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    
    // 선택된 날짜의 시작과 끝 시간 설정 (MongoDB에 저장된 데이터는 실제로는 KST 날짜가 UTC로 저장됨)
    const targetDate = new Date(date);
    const startUtc = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endUtc = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const { db } = await connectToDatabase();
    
    // 해당 날짜의 거래 내역 조회 (수입)
    const transactions = await db.collection('transactions').find({
      date: { $gte: startUtc, $lte: endUtc }
    }).toArray();

    // 해당 날짜의 지출 내역 조회
    const expenses = await db.collection('expenses').find({
      date: { $gte: startUtc, $lte: endUtc }
    }).toArray();

    // 수입 내역 포맷팅
    const income = transactions.map((transaction: any) => ({
      patientName: transaction.patientName || '알 수 없음',
      description: transaction.treatmentType || '진료',
      paymentMethod: transaction.paymentMethod || '현금',
      amount: transaction.paymentAmount || 0
    }));

    // 지출 내역 포맷팅
    const expenseData = expenses.map((expense: any) => ({
      description: expense.details || '지출',
      amount: expense.amount || 0,
      note: expense.notes || ''
    }));

    return NextResponse.json({
      income,
      expenses: expenseData
    });

  } catch (error) {
    console.error('일일 상세 데이터 조회 오류:', error);
    return NextResponse.json(
      { error: '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 