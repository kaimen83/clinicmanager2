import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET 요청 처리 - 상담 통계 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily'; // daily 또는 monthly
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const { db } = await connectToDatabase();

    // 날짜 범위 설정
    let startDate: Date, endDate: Date;
    
    if (type === 'daily') {
      // 일별: 해당 날짜의 00:00:00 ~ 23:59:59.999 (한국 시간)
      const dateParts = date.split('-').map(Number);
      const startDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0);
      const endDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59, 999);
      
      // 한국 시간과 UTC 간의 시차 조정 (9시간)
      const kstOffset = 9 * 60 * 60 * 1000;
      startDate = new Date(startDateObj.getTime() - kstOffset);
      endDate = new Date(endDateObj.getTime() - kstOffset);
    } else {
      // 월별: 해당 월의 첫날 00:00:00 ~ 마지막날 23:59:59.999 (한국 시간)
      const [year, month] = date.split('-').map(Number);
      const startDateObj = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endDateObj = new Date(year, month, 0, 23, 59, 59, 999);
      
      // 한국 시간과 UTC 간의 시차 조정 (9시간)
      const kstOffset = 9 * 60 * 60 * 1000;
      startDate = new Date(startDateObj.getTime() - kstOffset);
      endDate = new Date(endDateObj.getTime() - kstOffset);
    }

    // 동의한 상담 통계 조회 (confirmedDate 기준)
    const agreedConsultationStats = await db.collection('consultations').aggregate([
      {
        $match: {
          agreed: true,
          confirmedDate: { 
            $gte: startDate, 
            $lte: endDate,
            $ne: null  // confirmedDate가 null이 아닌 경우만 포함
          }
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

    // 미동의한 상담 통계 조회 (date 기준)
    const nonAgreedConsultationStats = await db.collection('consultations').aggregate([
      {
        $match: {
          agreed: false,
          date: { 
            $gte: startDate, 
            $lte: endDate
          }
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

    // 의사별 동의한 상담 통계 (confirmedDate 기준)
    const agreedDoctorStats = await db.collection('consultations').aggregate([
      {
        $match: {
          agreed: true,
          confirmedDate: { 
            $gte: startDate, 
            $lte: endDate,
            $ne: null  // confirmedDate가 null이 아닌 경우만 포함
          }
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

    // 의사별 미동의한 상담 통계 (date 기준)
    const nonAgreedDoctorStats = await db.collection('consultations').aggregate([
      {
        $match: {
          agreed: false,
          date: { 
            $gte: startDate, 
            $lte: endDate
          }
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
        start: startDate.toISOString(),
        end: endDate.toISOString()
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