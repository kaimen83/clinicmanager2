import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';

// 환자 분석 요약 데이터 생성 API
export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();
    const automationKey = request.headers.get('x-automation-key') || body.automationKey;
    
    // Allow automation access with special key or check user auth
    let isAuthorized = false;
    if (automationKey === 'optimize-patient-analysis-2024') {
      isAuthorized = true;
    } else {
      const user = await currentUser();
      const userId = user?.id;
      isAuthorized = !!userId;
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    const { periodType, year, month, quarter, force = false } = body;

    // 기존 요약 데이터 확인
    const existingQuery: any = { periodType, year };
    if (periodType === 'month' && month) existingQuery.month = month;
    if (periodType === 'quarter' && quarter) existingQuery.quarter = quarter;

    const existing = await db.collection('patient_analysis_summary').findOne(existingQuery);
    
    // force가 false이고 24시간 이내의 데이터가 있으면 재사용
    if (!force && existing && existing.updatedAt) {
      const hoursSinceUpdate = (Date.now() - new Date(existing.updatedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate < 24) {
        return NextResponse.json({
          message: '캐시된 데이터 사용',
          data: existing,
          cached: true
        });
      }
    }

    // 기간 범위 계산
    const baseRange = getPeriodRange(periodType, { year, month, quarter });
    
    // 그룹별 데이터와 개별 데이터 모두 생성
    const [groupedData, individualData] = await Promise.all([
      generateSummaryData(db, baseRange, true),
      generateSummaryData(db, baseRange, false)
    ]);

    // 요약 데이터 저장
    const summaryData = {
      periodType,
      year,
      month: periodType === 'month' ? month : undefined,
      quarter: periodType === 'quarter' ? quarter : undefined,
      groupedData,
      individualData,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date()
    };

    await db.collection('patient_analysis_summary').replaceOne(
      existingQuery,
      summaryData,
      { upsert: true }
    );

    return NextResponse.json({
      message: '요약 데이터 생성 완료',
      data: summaryData,
      cached: false
    });

  } catch (error) {
    console.error('요약 데이터 생성 중 오류:', error);
    return NextResponse.json({ error: '요약 데이터 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 요약 데이터 생성 로직 (기존 analysis 로직 재사용)
async function generateSummaryData(db: any, dateRange: { startDate: Date; endDate: Date }, useGroups: boolean) {
  const { startDate, endDate } = dateRange;
  const kstOffset = 9 * 60 * 60 * 1000;
  const startUtc = new Date(startDate.getTime() - kstOffset);
  const endUtc = new Date(endDate.getTime() - kstOffset);

  if (useGroups) {
    const groups = await db.collection('visitpathgroups').find({ isActive: true }).toArray();
    
    const groupPromises = groups.map(async (group: any) => {
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

    const [groupResults, ungroupedResults] = await Promise.all([
      Promise.all(groupPromises),
      Promise.all(ungroupedPromises)
    ]);

    return [...groupResults, ...ungroupedResults];
  } else {
    const visitPaths = await db.collection('settings').find({ type: 'visitPath', isActive: true }).toArray();
    
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

// 기간 범위 계산 (기존 함수 재사용)
function getPeriodRange(periodType: string, params: { year: number; month?: number; quarter?: number }) {
  const { year, month, quarter } = params;
  
  switch (periodType) {
    case 'month': {
      const startDate = new Date(year, month! - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(year, month!, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    case 'quarter': {
      const startMonth = (quarter! - 1) * 3;
      const startDate = new Date(year, startMonth, 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(year, startMonth + 3, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    case 'year': {
      const startDate = new Date(year, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(year, 11, 31);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    default:
      throw new Error('잘못된 기간 타입입니다.');
  }
}

// 그룹별 데이터 집계 함수 (기존 로직 재사용)
async function getVisitPathGroupData(db: any, visitPaths: string[], startUtc: Date, endUtc: Date) {
  const pipeline = [
    {
      $match: {
        date: { $gte: startUtc, $lte: endUtc }
      }
    },
    {
      $lookup: {
        from: 'patients',
        localField: 'chartNumber',
        foreignField: 'chartNumber',
        as: 'patient'
      }
    },
    {
      $unwind: '$patient'
    },
    {
      $match: {
        'patient.visitPath': { $in: visitPaths }
      }
    },
    {
      $addFields: {
        dateStr: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date",
            timezone: "UTC"
          }
        }
      }
    },
    {
      $group: {
        _id: {
          date: '$dateStr',
          chartNumber: '$chartNumber'
        },
        isNew: { $first: '$isNew' },
        paymentAmount: { $sum: { $ifNull: ['$paymentAmount', 0] } }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        dailyPatients: { $sum: 1 },
        dailyNewPatients: {
          $sum: {
            $cond: [
              { $eq: ['$isNew', true] },
              1,
              0
            ]
          }
        },
        dailyPaymentAmount: { $sum: '$paymentAmount' }
      }
    },
    {
      $group: {
        _id: null,
        totalPatientCount: { $sum: '$dailyPatients' },
        newPatientCount: { $sum: '$dailyNewPatients' },
        paymentAmount: { $sum: '$dailyPaymentAmount' }
      }
    },
    {
      $addFields: {
        revisitCount: { $subtract: ['$totalPatientCount', '$newPatientCount'] }
      }
    }
  ];

  const result = await db.collection('transactions').aggregate(pipeline).toArray();
  
  const consultationPipeline = [
    {
      $match: {
        date: { $gte: startUtc, $lte: endUtc }
      }
    },
    {
      $lookup: {
        from: 'patients',
        localField: 'chartNumber',
        foreignField: 'chartNumber',
        as: 'patient'
      }
    },
    {
      $unwind: '$patient'
    },
    {
      $match: {
        'patient.visitPath': { $in: visitPaths }
      }
    },
    {
      $group: {
        _id: null,
        totalConsultationAmount: {
          $sum: { $ifNull: ['$amount', 0] }
        }
      }
    }
  ];

  const consultationResult = await db.collection('consultations').aggregate(consultationPipeline).toArray();
  
  if (result.length === 0) {
    return {
      totalPatientCount: 0,
      newPatientCount: 0,
      revisitCount: 0,
      paymentAmount: 0,
      totalConsultationAmount: consultationResult.length > 0 
        ? consultationResult[0].totalConsultationAmount 
        : 0
    };
  }

  const finalResult = result[0];
  finalResult.totalConsultationAmount = consultationResult.length > 0 
    ? consultationResult[0].totalConsultationAmount 
    : 0;

  return finalResult;
}

// 내원경로별 데이터 조회 함수 (기존 로직 재사용)
async function getVisitPathData(db: any, visitPath: string, startUtc: Date, endUtc: Date) {
  const pipeline = [
    {
      $match: {
        date: { $gte: startUtc, $lte: endUtc }
      }
    },
    {
      $lookup: {
        from: 'patients',
        localField: 'chartNumber',
        foreignField: 'chartNumber',
        as: 'patient'
      }
    },
    {
      $unwind: '$patient'
    },
    {
      $match: {
        'patient.visitPath': visitPath
      }
    },
    {
      $addFields: {
        dateStr: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date",
            timezone: "UTC"
          }
        }
      }
    },
    {
      $group: {
        _id: {
          date: '$dateStr',
          chartNumber: '$chartNumber'
        },
        isNew: { $first: '$isNew' },
        paymentAmount: { $sum: { $ifNull: ['$paymentAmount', 0] } }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        dailyPatients: { $sum: 1 },
        dailyNewPatients: {
          $sum: {
            $cond: [
              { $eq: ['$isNew', true] },
              1,
              0
            ]
          }
        },
        dailyPaymentAmount: { $sum: '$paymentAmount' }
      }
    },
    {
      $group: {
        _id: null,
        totalPatientCount: { $sum: '$dailyPatients' },
        newPatientCount: { $sum: '$dailyNewPatients' },
        paymentAmount: { $sum: '$dailyPaymentAmount' }
      }
    },
    {
      $addFields: {
        revisitCount: { $subtract: ['$totalPatientCount', '$newPatientCount'] }
      }
    }
  ];

  const result = await db.collection('transactions').aggregate(pipeline).toArray();
  
  if (result.length === 0) {
    return {
      totalPatientCount: 0,
      newPatientCount: 0,
      revisitCount: 0,
      paymentAmount: 0,
      totalConsultationAmount: 0
    };
  }

  const consultationPipeline = [
    {
      $match: {
        date: { $gte: startUtc, $lte: endUtc }
      }
    },
    {
      $lookup: {
        from: 'patients',
        localField: 'chartNumber',
        foreignField: 'chartNumber',
        as: 'patient'
      }
    },
    {
      $unwind: '$patient'
    },
    {
      $match: {
        'patient.visitPath': visitPath
      }
    },
    {
      $group: {
        _id: null,
        totalConsultationAmount: {
          $sum: { $ifNull: ['$amount', 0] }
        }
      }
    }
  ];

  const consultationResult = await db.collection('consultations').aggregate(consultationPipeline).toArray();
  
  const finalResult = result[0];
  finalResult.totalConsultationAmount = consultationResult.length > 0 
    ? consultationResult[0].totalConsultationAmount 
    : 0;

  return finalResult;
}