import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';

// 성능 최적화를 위한 필수 인덱스 생성
async function ensureIndexes(db: any) {
  try {
    // consultations 컬렉션 인덱스
    await db.collection('consultations').createIndex(
      { date: 1, chartNumber: 1, agreed: 1 },
      { background: true, name: 'date_chartNumber_agreed_idx' }
    );
    
    // patients 컬렉션 인덱스
    await db.collection('patients').createIndex(
      { visitPath: 1, chartNumber: 1, createdAt: 1 },
      { background: true, name: 'visitPath_chartNumber_createdAt_idx' }
    );
    
    // 단일 필드 인덱스들
    await db.collection('consultations').createIndex(
      { date: 1 },
      { background: true, name: 'date_idx' }
    );
    
    await db.collection('patients').createIndex(
      { chartNumber: 1 },
      { background: true, name: 'chartNumber_idx' }
    );
    
    console.log('인덱스 생성 완료');
  } catch (error) {
    // 인덱스가 이미 존재하는 경우 무시
    console.log('인덱스 생성 중 오류 (이미 존재할 수 있음):', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // 성능 최적화를 위한 인덱스 확인 및 생성
    await ensureIndexes(db);
    
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
    // 그룹 보기 - 병렬 처리 최적화
    const groups = await db.collection('visitpathgroups').find({ isActive: true }).toArray();
    
    // 그룹별 데이터를 병렬로 처리
    const groupPromises = groups.map(async (group: any) => {
      // 그룹 데이터와 상세 데이터를 병렬로 처리
      const [groupData, detailsResults] = await Promise.all([
        getVisitPathGroupData(db, group.visitPaths, startUtc, endUtc),
        Promise.all(group.visitPaths.map(async (visitPath: string) => {
          const pathData = await getVisitPathData(db, visitPath, startUtc, endUtc);
          return {
            visitPath,
            ...pathData
          };
        }))
      ]);

      return {
        isGroup: true,
        groupId: group._id.toString(),
        visitPath: group.name,
        details: detailsResults,
        ...groupData
      };
    });

    // 그룹에 포함되지 않은 내원경로들도 병렬 처리
    const groupedPaths = groups.flatMap((g: any) => g.visitPaths);
    const allVisitPaths = await db.collection('settings').find({ type: 'visitPath', isActive: true }).toArray();
    const ungroupedPaths = allVisitPaths.filter((path: any) => !groupedPaths.includes(path.value));

    const ungroupedPromises = ungroupedPaths.map(async (path: any) => {
      const pathData = await getVisitPathData(db, path.value, startUtc, endUtc);
      return {
        isGroup: false,
        visitPath: path.value,
        ...pathData
      };
    });

    // 모든 작업을 병렬로 실행
    const [groupResults, ungroupedResults] = await Promise.all([
      Promise.all(groupPromises),
      Promise.all(ungroupedPromises)
    ]);

    return [...groupResults, ...ungroupedResults];
  } else {
    // 개별 보기 - 병렬 처리 최적화
    const visitPaths = await db.collection('settings').find({ type: 'visitPath', isActive: true }).toArray();
    
    // 모든 내원경로 데이터를 병렬로 처리
    const pathPromises = visitPaths.map(async (path: any) => {
      const pathData = await getVisitPathData(db, path.value, startUtc, endUtc);
      return {
        visitPath: path.value,
        ...pathData
      };
    });

    return await Promise.all(pathPromises);
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

// 내원경로별 데이터 조회 - 최적화된 버전
async function getVisitPathData(db: any, visitPath: string, startUtc: Date, endUtc: Date) {
  // MongoDB aggregation pipeline을 사용한 최적화된 쿼리
  const pipeline = [
    // 1. 기간별 상담 데이터 필터링
    {
      $match: {
        date: { $gte: startUtc, $lte: endUtc }
      }
    },
    // 2. 환자 정보와 조인
    {
      $lookup: {
        from: 'patients',
        localField: 'chartNumber',
        foreignField: 'chartNumber',
        as: 'patient'
      }
    },
    // 3. 환자 정보 언와인드
    {
      $unwind: '$patient'
    },
    // 4. 해당 내원경로로 필터링
    {
      $match: {
        'patient.visitPath': visitPath
      }
    },
    // 5. 집계 계산
    {
      $group: {
        _id: null,
        // 총환자수 (중복 제거)
        uniquePatients: { $addToSet: '$chartNumber' },
        // 신환 구분을 위한 환자 생성일 수집
        patientCreationDates: {
          $addToSet: {
            chartNumber: '$chartNumber',
            createdAt: '$patient.createdAt'
          }
        },
        // 결제금액 (agreed: true)
        paymentAmount: {
          $sum: {
            $cond: [
              { $eq: ['$agreed', true] },
              { $ifNull: ['$amount', 0] },
              0
            ]
          }
        },
        // 총 상담금액
        totalConsultationAmount: {
          $sum: { $ifNull: ['$amount', 0] }
        }
      }
    },
    // 6. 최종 결과 계산
    {
      $project: {
        totalPatientCount: { $size: '$uniquePatients' },
        newPatientCount: {
          $size: {
            $filter: {
              input: '$patientCreationDates',
              as: 'patient',
              cond: {
                $and: [
                  { $gte: ['$$patient.createdAt', startUtc] },
                  { $lte: ['$$patient.createdAt', endUtc] }
                ]
              }
            }
          }
        },
        paymentAmount: 1,
        totalConsultationAmount: 1
      }
    },
    // 7. 재진 수 계산
    {
      $addFields: {
        revisitCount: { $subtract: ['$totalPatientCount', '$newPatientCount'] }
      }
    }
  ];

  const result = await db.collection('consultations').aggregate(pipeline).toArray();
  
  if (result.length === 0) {
    return {
      totalPatientCount: 0,
      newPatientCount: 0,
      revisitCount: 0,
      paymentAmount: 0,
      totalConsultationAmount: 0
    };
  }

  return result[0];
} 