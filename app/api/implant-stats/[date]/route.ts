import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const doctor = searchParams.get('doctor');
    const { date } = await params;

    if (!date) {
      return NextResponse.json({ error: '날짜가 필요합니다.' }, { status: 400 });
    }

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    let query: any = {
      date: {
        $gte: startDate,
        $lt: endDate
      }
    };

    if (doctor && doctor !== 'all') {
      query.doctor = doctor;
    }

    // 전체 수술 데이터 조회
    const operations = await db.collection('firstops').find(query).toArray();

    // day-level 통계
    const detail = {
      date: date,
      implants: {} as { [manufacturer: string]: number },
      fixtures: {} as { [type: string]: number },
      patients: [] as Array<{
        chartNumber: string;
        patientName: string;
        doctor: string;
        implants: Array<{ manufacturer: string; specification: string; quantity: number }>;
        fixtures: Array<{ type: string; specification: string; quantity: number }>;
      }>,
      totalImplants: 0
    };

    operations.forEach((op: any) => {
      // day-level implants
      if (op.implants && op.implants.length > 0) {
        op.implants.forEach((imp: any) => {
          detail.implants[imp.manufacturer] = 
            (detail.implants[imp.manufacturer] || 0) + imp.quantity;
          detail.totalImplants += imp.quantity;
        });
      }

      // day-level fixtures
      if (op.fixtures && op.fixtures.length > 0) {
        op.fixtures.forEach((fix: any) => {
          detail.fixtures[fix.type] = 
            (detail.fixtures[fix.type] || 0) + fix.quantity;
        });
      }

      // 환자별 implants
      const patientImplants: any = {};
      let patientTotalImplants = 0;
      if (op.implants && op.implants.length > 0) {
        op.implants.forEach((imp: any) => {
          patientImplants[imp.manufacturer] = 
            (patientImplants[imp.manufacturer] || 0) + imp.quantity;
          patientTotalImplants += imp.quantity;
        });
      }

      // 환자별 fixtures
      const patientFixtures: any = {};
      let patientTotalFixtures = 0;
      if (op.fixtures && op.fixtures.length > 0) {
        op.fixtures.forEach((fix: any) => {
          patientFixtures[fix.type] = 
            (patientFixtures[fix.type] || 0) + fix.quantity;
          patientTotalFixtures += fix.quantity;
        });
      }

      // 최종 환자 정보에 fixtures도 포함
      detail.patients.push({
        chartNumber: op.chartNumber,
        patientName: op.patientName,
        doctor: op.doctor,
        implants: op.implants || [],
        fixtures: op.fixtures || []
      });
    });

    return NextResponse.json(detail);

  } catch (error) {
    console.error('상세 정보 조회 중 에러:', error);
    return NextResponse.json({ 
      error: '상세 정보 조회에 실패했습니다.' 
    }, { status: 500 });
  }
} 