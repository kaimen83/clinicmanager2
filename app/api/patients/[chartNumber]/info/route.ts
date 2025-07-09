import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chartNumber: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    const { chartNumber } = await params;

    // 환자 기본 정보 조회
    const patient = await db.collection('patients').findOne({ chartNumber });
    if (!patient) {
      return NextResponse.json({ error: '환자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 상담 내역 조회 (최신순)
    const consultations = await db.collection('consultations')
      .find({ chartNumber })
      .sort({ date: -1 })
      .toArray();

    // 수납 내역 조회 (최신순)
    const transactions = await db.collection('transactions')
      .find({ chartNumber })
      .sort({ date: -1 })
      .toArray();

    const responseData = {
      patient: {
        chartNumber: patient.chartNumber,
        name: patient.name,
        visitPath: patient.visitPath,
        createdAt: patient.createdAt
      },
      consultations: consultations.map((consultation: any) => ({
        _id: consultation._id,
        date: consultation.date,
        doctor: consultation.doctor,
        staff: consultation.staff,
        amount: consultation.amount,
        agreed: consultation.agreed,
        notes: consultation.notes || '',
        confirmedDate: consultation.confirmedDate
      })),
      transactions: transactions.map((transaction: any) => ({
        _id: transaction._id,
        date: transaction.date,
        doctor: transaction.doctor,
        treatmentType: transaction.treatmentType,
        isNew: transaction.isNew,
        isConsultation: transaction.isConsultation,
        paymentMethod: transaction.paymentMethod,
        cardCompany: transaction.cardCompany || null,
        paymentAmount: transaction.paymentAmount,
        cashReceipt: transaction.cashReceipt || false,
        notes: transaction.notes || ''
      }))
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('환자 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '환자 정보를 조회하는데 실패했습니다.' },
      { status: 500 }
    );
  }
}