import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET 요청 처리 - 상담 통계 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily'; // daily 또는 monthly
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const { db } = await connectToDatabase();

    // 날짜 문자열 설정 (한국 시간 기준)
    let targetDateStrings: string[];
    
    if (type === 'daily') {
      // 일별: 해당 날짜만
      targetDateStrings = [date]; // 예: ["2025-06-14"]
    } else {
      // 월별: 해당 월의 모든 날짜
      const [year, month] = date.split('-').map(Number);
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      targetDateStrings = [];
      
      for (let day = 1; day <= lastDayOfMonth; day++) {
        const dayStr = String(day).padStart(2, '0');
        targetDateStrings.push(`${year}-${String(month).padStart(2, '0')}-${dayStr}`);
      }
    }

    // 동의한 상담 통계 조회 (confirmedDate를 한국 시간 기준으로 변환하여 날짜 비교)
    const agreedConsultationStats = await db.collection('consultations').aggregate([
      {
        $addFields: {
          // confirmedDate를 한국 시간으로 변환하여 날짜 부분만 추출
          confirmedDateKST: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $add: ["$confirmedDate", 9 * 60 * 60 * 1000] }, // UTC + 9시간
              timezone: "UTC"
            }
          }
        }
      },
      {
        $match: {
          agreed: true,
          confirmedDate: { $ne: null },
          confirmedDateKST: { $in: targetDateStrings }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // 미동의한 상담 통계 조회 (date를 한국 시간 기준으로 변환하여 날짜 비교)
    const nonAgreedConsultationStats = await db.collection('consultations').aggregate([
      {
        $addFields: {
          // date를 한국 시간으로 변환하여 날짜 부분만 추출
          dateKST: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $add: ["$date", 9 * 60 * 60 * 1000] }, // UTC + 9시간
              timezone: "UTC"
            }
          }
        }
      },
      {
        $match: {
          agreed: false,
          dateKST: { $in: targetDateStrings }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // 의사별 동의한 상담 통계 (confirmedDate를 한국 시간 기준으로 변환하여 날짜 비교)
    const agreedDoctorStats = await db.collection('consultations').aggregate([
      {
        $addFields: {
          // confirmedDate를 한국 시간으로 변환하여 날짜 부분만 추출
          confirmedDateKST: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $add: ["$confirmedDate", 9 * 60 * 60 * 1000] }, // UTC + 9시간
              timezone: "UTC"
            }
          }
        }
      },
      {
        $match: {
          agreed: true,
          confirmedDate: { $ne: null },
          confirmedDateKST: { $in: targetDateStrings }
        }
      },
      {
        $group: {
          _id: "$doctor",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // 의사별 미동의한 상담 통계 (date를 한국 시간 기준으로 변환하여 날짜 비교)
    const nonAgreedDoctorStats = await db.collection('consultations').aggregate([
      {
        $addFields: {
          // date를 한국 시간으로 변환하여 날짜 부분만 추출
          dateKST: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $add: ["$date", 9 * 60 * 60 * 1000] }, // UTC + 9시간
              timezone: "UTC"
            }
          }
        }
      },
      {
        $match: {
          agreed: false,
          dateKST: { $in: targetDateStrings }
        }
      },
      {
        $group: {
          _id: "$doctor",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // 결과 처리
    let consultationAgreedAmount = 0;
    let consultationNonAgreedAmount = 0;
    let agreedCount = 0;
    let nonAgreedCount = 0;

    // 동의한 상담 통계 처리
    if (agreedConsultationStats.length > 0) {
      consultationAgreedAmount = agreedConsultationStats[0].totalAmount || 0;
      agreedCount = agreedConsultationStats[0].count || 0;
    }

    // 미동의한 상담 통계 처리
    if (nonAgreedConsultationStats.length > 0) {
      consultationNonAgreedAmount = nonAgreedConsultationStats[0].totalAmount || 0;
      nonAgreedCount = nonAgreedConsultationStats[0].count || 0;
    }

    // 의사별 통계 합치기
    const doctorStatsMap = new Map();

    // 동의한 상담 의사별 통계 추가
    agreedDoctorStats.forEach(stat => {
      const doctor = stat._id;
      if (!doctorStatsMap.has(doctor)) {
        doctorStatsMap.set(doctor, {
          doctor,
          agreedAmount: 0,
          nonAgreedAmount: 0,
          agreedCount: 0,
          nonAgreedCount: 0,
          totalAmount: 0,
          totalCount: 0
        });
      }
      const doctorStat = doctorStatsMap.get(doctor);
      doctorStat.agreedAmount = stat.totalAmount || 0;
      doctorStat.agreedCount = stat.count || 0;
      doctorStat.totalAmount += stat.totalAmount || 0;
      doctorStat.totalCount += stat.count || 0;
    });

    // 미동의한 상담 의사별 통계 추가
    nonAgreedDoctorStats.forEach(stat => {
      const doctor = stat._id;
      if (!doctorStatsMap.has(doctor)) {
        doctorStatsMap.set(doctor, {
          doctor,
          agreedAmount: 0,
          nonAgreedAmount: 0,
          agreedCount: 0,
          nonAgreedCount: 0,
          totalAmount: 0,
          totalCount: 0
        });
      }
      const doctorStat = doctorStatsMap.get(doctor);
      doctorStat.nonAgreedAmount = stat.totalAmount || 0;
      doctorStat.nonAgreedCount = stat.count || 0;
      doctorStat.totalAmount += stat.totalAmount || 0;
      doctorStat.totalCount += stat.count || 0;
    });

    // 의사별 통계 배열로 변환 및 정렬
    const doctorStats = Array.from(doctorStatsMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const totalConsultationAmount = consultationAgreedAmount + consultationNonAgreedAmount;
    const totalConsultationCount = agreedCount + nonAgreedCount;

    return NextResponse.json({
      type,
      date,
      dateRange: {
        start: targetDateStrings[0],
        end: targetDateStrings[targetDateStrings.length - 1]
      },
      summary: {
        consultationAgreedAmount,
        consultationNonAgreedAmount,
        totalConsultationAmount,
        agreedCount,
        nonAgreedCount,
        totalConsultationCount,
        agreedPercentage: totalConsultationCount > 0 ? Math.round((agreedCount / totalConsultationCount) * 100) : 0,
        agreedAmountPercentage: totalConsultationAmount > 0 ? Math.round((consultationAgreedAmount / totalConsultationAmount) * 100) : 0
      },
      doctorStats: doctorStats.map(doctor => ({
        doctor: doctor.doctor,
        agreedAmount: doctor.agreedAmount || 0,
        nonAgreedAmount: doctor.nonAgreedAmount || 0,
        totalAmount: doctor.totalAmount || 0,
        agreedCount: doctor.agreedCount || 0,
        nonAgreedCount: doctor.nonAgreedCount || 0,
        totalCount: doctor.totalCount || 0,
        agreedPercentage: doctor.totalCount > 0 ? Math.round((doctor.agreedCount / doctor.totalCount) * 100) : 0
      }))
    });

  } catch (error) {
    console.error('상담 통계 조회 중 에러:', error);
    return NextResponse.json(
      { error: "상담 통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 