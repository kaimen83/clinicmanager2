import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    // 현재 날짜에서 15개월 전까지의 데이터 계산
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const months = [];
    
    // 15개월 전부터 현재 월까지의 년/월 목록 생성
    for (let i = 14; i >= 0; i--) {
      let year = currentYear;
      let month = currentMonth - i;
      
      if (month <= 0) {
        year--;
        month += 12;
      }
      
      months.push({
        year,
        month,
        key: `${year}-${String(month).padStart(2, '0')}`
      });
    }
    
    // 활성화된 내원경로 그룹 조회
    const visitPathGroups = await db.collection('visitpathgroups')
      .find({ isActive: true })
      .toArray();
    
    // 각 월별로 내원경로 그룹별 통계 계산
    const results = await Promise.all(months.map(async ({ year, month, key }) => {
      // 해당 월의 시작일과 종료일 계산 (한국 시간 기준)
      const startDateObj = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endDateObj = new Date(year, month, 0, 23, 59, 59, 999);
      
      // 한국 시간과 UTC 간의 시차 조정 (9시간)
      const kstOffset = 9 * 60 * 60 * 1000;
      const startDate = new Date(startDateObj.getTime() - kstOffset);
      const endDate = new Date(endDateObj.getTime() - kstOffset);
      
      // 각 그룹별 통계 계산 - 환자분석과 동일한 로직 사용
      const groups = await Promise.all(visitPathGroups.map(async (group) => {
        const stats = await getVisitPathGroupStats(db, group.visitPaths, startDate, endDate);
        
        return {
          groupName: group.name,
          patientCount: stats.totalPatientCount,
          paymentAmount: stats.paymentAmount,
          consultationAmount: stats.totalConsultationAmount
        };
      }));
      
      return {
        month: key,
        groups
      };
    }));
    
    return NextResponse.json({
      visitPathHistory: results
    });
  } catch (error) {
    console.error('내원경로별 통계 조회 중 에러:', error);
    return NextResponse.json(
      { error: "내원경로별 통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 환자분석과 동일한 로직: 그룹별 데이터 집계 (일자별 중복 허용)
async function getVisitPathGroupStats(db: any, visitPaths: string[], startUtc: Date, endUtc: Date) {
  // 그룹 전체에 대해 한 번에 집계 (환자분석과 동일한 로직)
  const pipeline = [
    // 1. 기간별 트랜잭션 데이터 필터링
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
    // 4. 해당 그룹의 내원경로들로 필터링
    {
      $match: {
        'patient.visitPath': { $in: visitPaths }
      }
    },
    // 5. 날짜별 환자 그룹핑 (환자분석과 동일한 로직)
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
    // 6. 날짜별, 환자별로 그룹핑 (같은 날 같은 환자는 1번만 카운트)
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
    // 7. 날짜별로 그룹핑
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
    // 8. 최종 집계
    {
      $group: {
        _id: null,
        totalPatientCount: { $sum: '$dailyPatients' },
        newPatientCount: { $sum: '$dailyNewPatients' },
        paymentAmount: { $sum: '$dailyPaymentAmount' }
      }
    },
    // 9. 재진 수 계산
    {
      $addFields: {
        revisitCount: { $subtract: ['$totalPatientCount', '$newPatientCount'] }
      }
    }
  ];

  const result = await db.collection('transactions').aggregate(pipeline).toArray();
  
  // 상담금액을 별도로 조회 (consultations에서)
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