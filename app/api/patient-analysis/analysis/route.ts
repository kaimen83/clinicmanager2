import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();
    const { periodType, year, month, quarter, comparePeriods, useGroups } = body;

    // 기준 기간 설정
    const baseRange = getPeriodRange(periodType, { year, month, quarter });
    
    // 현재 기간 데이터 조회
    const currentData = await getPatientAnalysisData(db, baseRange, useGroups);
    
    // 비교 기간별 데이터 조회
    const comparisons: { [key: string]: any[] } = {};
    
    for (const comparePeriod of comparePeriods) {
      const compareRange = getComparePeriodRange(periodType, { year, month, quarter }, comparePeriod);
      comparisons[comparePeriod] = await getPatientAnalysisData(db, compareRange, useGroups);
    }

    return NextResponse.json({
      current: currentData,
      comparisons,
      isGrouped: useGroups
    });

  } catch (error) {
    console.error('환자 분석 데이터 조회 오류:', error);
    return NextResponse.json({ error: '데이터 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 기간 범위 계산
function getPeriodRange(periodType: string, params: { year: number; month?: number; quarter?: number }) {
  const { year, month, quarter } = params;
  
  switch (periodType) {
    case 'month': {
      const startDate = new Date(year, month! - 1, 1);
      const endDate = new Date(year, month!, 0, 23, 59, 59, 999);
      return { startDate, endDate };
    }
    case 'quarter': {
      const startMonth = (quarter! - 1) * 3;
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
      return { startDate, endDate };
    }
    case 'year': {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      return { startDate, endDate };
    }
    default:
      throw new Error('잘못된 기간 타입입니다.');
  }
}

// 비교 기간 범위 계산
function getComparePeriodRange(periodType: string, basePeriod: { year: number; month?: number; quarter?: number }, comparePeriod: string) {
  const { year, month, quarter } = basePeriod;
  
  let compareYear = year;
  let compareMonth = month;
  let compareQuarter = quarter;
  
  switch (comparePeriod) {
    case 'prev':
      if (periodType === 'month') {
        compareMonth = month! - 1;
        if (compareMonth === 0) {
          compareMonth = 12;
          compareYear--;
        }
      } else if (periodType === 'quarter') {
        compareQuarter = quarter! - 1;
        if (compareQuarter === 0) {
          compareQuarter = 4;
          compareYear--;
        }
      } else if (periodType === 'year') {
        compareYear--;
      }
      break;
    case 'prev-year':
      compareYear = year - 1;
      break;
    case 'prev-2year':
      compareYear = year - 2;
      break;
    case 'prev-3year':
      compareYear = year - 3;
      break;
  }
  
  return getPeriodRange(periodType, { year: compareYear, month: compareMonth, quarter: compareQuarter });
}

// 환자 분석 데이터 조회
async function getPatientAnalysisData(db: any, dateRange: { startDate: Date; endDate: Date }, useGroups: boolean) {
  const { startDate, endDate } = dateRange;

  // 한국 시간 기준으로 날짜 범위 조정
  const kstOffset = 9 * 60 * 60 * 1000;
  const startUtc = new Date(startDate.getTime() - kstOffset);
  const endUtc = new Date(endDate.getTime() - kstOffset);

  if (useGroups) {
    // 그룹 보기
    const groups = await db.collection('visitpathgroups').find({ isActive: true }).toArray();
    const result = [];

    for (const group of groups) {
      const groupData = await getVisitPathGroupData(db, group.visitPaths, startUtc, endUtc);
      
      // 각 내원경로별 상세 데이터
      const details = [];
      for (const visitPath of group.visitPaths) {
        const pathData = await getVisitPathData(db, visitPath, startUtc, endUtc);
        details.push({
          visitPath,
          ...pathData
        });
      }

      result.push({
        isGroup: true,
        groupId: group._id.toString(),
        visitPath: group.name,
        details,
        ...groupData
      });
    }

    // 그룹에 포함되지 않은 내원경로들
    const groupedPaths = groups.flatMap((g: any) => g.visitPaths);
    const allVisitPaths = await db.collection('settings').find({ type: 'visitPath', isActive: true }).toArray();
    const ungroupedPaths = allVisitPaths.filter((path: any) => !groupedPaths.includes(path.value));

    for (const path of ungroupedPaths) {
      const pathData = await getVisitPathData(db, path.value, startUtc, endUtc);
      result.push({
        isGroup: false,
        visitPath: path.value,
        ...pathData
      });
    }

    return result;
  } else {
    // 개별 보기
    const visitPaths = await db.collection('settings').find({ type: 'visitPath', isActive: true }).toArray();
    const result = [];

    for (const path of visitPaths) {
      const pathData = await getVisitPathData(db, path.value, startUtc, endUtc);
      result.push({
        visitPath: path.value,
        ...pathData
      });
    }

    return result;
  }
}

// 그룹별 데이터 집계
async function getVisitPathGroupData(db: any, visitPaths: string[], startUtc: Date, endUtc: Date) {
  let totalPatientCount = 0;
  let newPatientCount = 0;
  let revisitCount = 0;
  let paymentAmount = 0;
  let totalConsultationAmount = 0;

  for (const visitPath of visitPaths) {
    const pathData = await getVisitPathData(db, visitPath, startUtc, endUtc);
    totalPatientCount += pathData.totalPatientCount;
    newPatientCount += pathData.newPatientCount;
    revisitCount += pathData.revisitCount;
    paymentAmount += pathData.paymentAmount;
    totalConsultationAmount += pathData.totalConsultationAmount;
  }

  return {
    totalPatientCount,
    newPatientCount,
    revisitCount,
    paymentAmount,
    totalConsultationAmount
  };
}

// 내원경로별 데이터 조회
async function getVisitPathData(db: any, visitPath: string, startUtc: Date, endUtc: Date) {
  // 해당 기간의 상담 데이터
  const consultations = await db.collection('consultations').find({
    date: { $gte: startUtc, $lte: endUtc }
  }).toArray();

  // 해당 내원경로 환자들의 차트번호 조회
  const patients = await db.collection('patients').find({ visitPath }).toArray();
  const chartNumbers = patients.map((p: any) => p.chartNumber);

  // 해당 내원경로 환자들의 상담 필터링
  const pathConsultations = consultations.filter((c: any) => chartNumbers.includes(c.chartNumber));

  // 총환자수 (중복 제거)
  const uniquePatients = [...new Set(pathConsultations.map((c: any) => c.chartNumber))];
  const totalPatientCount = uniquePatients.length;

  // 신환 수 (해당 기간에 생성된 환자)
  const newPatients = await db.collection('patients').find({
    visitPath,
    createdAt: { $gte: startUtc, $lte: endUtc }
  }).toArray();
  const newPatientChartNumbers = newPatients.map((p: any) => p.chartNumber);
  const newPatientConsultations = pathConsultations.filter((c: any) => newPatientChartNumbers.includes(c.chartNumber));
  const newPatientCount = [...new Set(newPatientConsultations.map((c: any) => c.chartNumber))].length;

  // 재진 수
  const revisitCount = totalPatientCount - newPatientCount;

  // 결제금액 (agreed: true)
  const paymentAmount = pathConsultations
    .filter((c: any) => c.agreed === true)
    .reduce((sum: any, c: any) => sum + (c.amount || 0), 0);

  // 총 상담금액 (모든 상담)
  const totalConsultationAmount = pathConsultations
    .reduce((sum: any, c: any) => sum + (c.amount || 0), 0);

  return {
    totalPatientCount,
    newPatientCount,
    revisitCount,
    paymentAmount,
    totalConsultationAmount
  };
} 