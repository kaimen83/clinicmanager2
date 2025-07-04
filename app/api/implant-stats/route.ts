import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const doctor = searchParams.get('doctor');
    const patientName = searchParams.get('patientName');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '시작 날짜와 종료 날짜가 필요합니다.' }, { status: 400 });
    }

    // 현재 기간의 쿼리
    let query: any = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (doctor && doctor !== 'all') {
      query.doctor = doctor;
    }

    if (patientName) {
      query.patientName = new RegExp(patientName, 'i');
    }

    // 누적 총계를 위한 쿼리
    let accumulatedQuery: any = {
      date: {
        $lte: new Date(endDate)
      }
    };

    if (doctor && doctor !== 'all') {
      accumulatedQuery.doctor = doctor;
    }

    // 현재 기간 데이터 조회
    const operations = await db.collection('firstops').find(query).sort({ date: -1 }).toArray();
    
    // 누적 데이터 조회
    const accumulatedOperations = await db.collection('firstops').find(accumulatedQuery).toArray();

    // 누적 총계 계산
    let accumulatedTotal = 0;
    accumulatedOperations.forEach((op: any) => {
      if (op.implants && op.implants.length > 0) {
        op.implants.forEach((imp: any) => {
          accumulatedTotal += imp.quantity;
        });
      }
    });

    // 날짜별로 데이터 그룹화
    const dailyStats: any = {};
    
    operations.forEach((op: any) => {
      const dateKey = op.date.toISOString().split('T')[0];
      
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          implants: {},
          fixtures: {},
          patients: [],
          totalImplants: 0
        };
      }

      // 임플란트 집계
      if (op.implants && op.implants.length > 0) {
        op.implants.forEach((imp: any) => {
          dailyStats[dateKey].implants[imp.manufacturer] = 
            (dailyStats[dateKey].implants[imp.manufacturer] || 0) + imp.quantity;
          dailyStats[dateKey].totalImplants += imp.quantity;
        });
      }

      // 이식재 집계
      if (op.fixtures && op.fixtures.length > 0) {
        op.fixtures.forEach((fix: any) => {
          dailyStats[dateKey].fixtures[fix.type] = 
            (dailyStats[dateKey].fixtures[fix.type] || 0) + fix.quantity;
        });
      }

      // 환자 정보에 임플란트와 이식재 데이터 포함하여 추가
      const patientImplants: any = {};
      const patientFixtures: any = {};
      let patientTotalImplants = 0;
      let patientTotalFixtures = 0;

      if (op.implants && op.implants.length > 0) {
        op.implants.forEach((imp: any) => {
          patientImplants[imp.manufacturer] = (patientImplants[imp.manufacturer] || 0) + imp.quantity;
          patientTotalImplants += imp.quantity;
        });
      }

      if (op.fixtures && op.fixtures.length > 0) {
        op.fixtures.forEach((fix: any) => {
          patientFixtures[fix.type] = (patientFixtures[fix.type] || 0) + fix.quantity;
          patientTotalFixtures += fix.quantity;
        });
      }

      dailyStats[dateKey].patients.push({
        chartNumber: op.chartNumber,
        patientName: op.patientName,
        doctor: op.doctor,
        implants: op.implants || [],
        fixtures: op.fixtures || [],
        totalImplants: patientTotalImplants,
        totalFixtures: patientTotalFixtures
      });
    });

    const result = Object.values(dailyStats);
    
    // 응답에 누적 총계 추가
    return NextResponse.json({
      data: result,
      accumulatedTotal: accumulatedTotal
    });

  } catch (error) {
    console.error('임플란트 통계 조회 중 에러:', error);
    return NextResponse.json({ 
      error: '통계 조회에 실패했습니다.' 
    }, { status: 500 });
  }
} 