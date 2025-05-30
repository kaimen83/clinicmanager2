import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// POST 요청 처리 - 특정 환자의 수납 내역 조회
export async function POST(request: NextRequest) {
  try {
    const { chartNumber, patientName } = await request.json();
    
    if (!chartNumber || !patientName) {
      return NextResponse.json(
        { error: "차트번호와 환자명이 필요합니다." },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // 해당 환자의 트랜잭션 조회
    const transactions = await db
      .collection('transactions')
      .find({
        chartNumber: chartNumber,
        patientName: patientName
      })
      .toArray();

    // 모든 수납 내역 추출
    const payments: any[] = [];
    
    transactions.forEach(transaction => {
      // 트랜잭션 자체의 수납 정보 추가
      if (transaction.paymentAmount > 0) {
        payments.push({
          _id: transaction._id,
          date: transaction.date,
          method: transaction.paymentMethod,
          cardCompany: transaction.cardCompany,
          amount: transaction.paymentAmount,
          isConsultation: transaction.isConsultation || false
        });
      }
      
      // 추가 수납 내역이 있다면 포함
      if (transaction.payments && transaction.payments.length > 0) {
        transaction.payments.forEach((payment: any) => {
          payments.push({
            ...payment,
            _id: payment._id || `${transaction._id}_${payment.date}`,
            isConsultation: payment.isConsultation || false
          });
        });
      }
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('수납 내역 조회 중 에러:', error);
    return NextResponse.json(
      { error: "수납 내역 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 