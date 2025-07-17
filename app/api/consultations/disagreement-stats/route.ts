import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET 요청 처리 - 미동의 사유별 통계 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'monthly'; // daily, monthly, custom
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const { db } = await connectToDatabase();

    // 날짜 범위 설정 (한국 시간 기준)
    let startDate: Date, endDate: Date;
    
    if (type === 'custom' && startDateParam && endDateParam) {
      // 사용자 지정 기간
      startDate = new Date(`${startDateParam}T00:00:00+09:00`);
      endDate = new Date(`${endDateParam}T23:59:59+09:00`);
    } else if (type === 'daily') {
      // 일간: 해당 날짜의 00:00:00 ~ 23:59:59 (한국 시간 기준)
      startDate = new Date(`${date}T00:00:00+09:00`);
      endDate = new Date(`${date}T23:59:59+09:00`);
    } else {
      // 월간: 해당 월의 첫날 00:00:00 ~ 마지막날 23:59:59 (한국 시간 기준)
      const [year, month] = date.split('-').map(Number);
      startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+09:00`);
      const lastDayOfMonth = new Date(year, month, 0).getDate();
      endDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}T23:59:59+09:00`);
    }

    // 미동의 사유별 통계 조회
    const disagreementStats = await db.collection('consultations').aggregate([
      {
        $match: {
          agreed: false,
          disagreementReason: { $exists: true, $ne: null },
          date: { 
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: "$disagreementReason",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" },
          doctors: { $addToSet: "$doctor" }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]).toArray();

    // 전체 미동의 통계
    const totalDisagreementStats = await db.collection('consultations').aggregate([
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
          totalCount: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]).toArray();

    const totalCount = totalDisagreementStats[0]?.totalCount || 0;
    const totalAmount = totalDisagreementStats[0]?.totalAmount || 0;

    // 결과 가공
    const processedStats = disagreementStats.map(stat => ({
      reason: stat._id,
      count: stat.count,
      totalAmount: stat.totalAmount,
      avgAmount: Math.round(stat.avgAmount),
      percentage: totalCount > 0 ? Math.round((stat.count / totalCount) * 100) : 0,
      amountPercentage: totalAmount > 0 ? Math.round((stat.totalAmount / totalAmount) * 100) : 0,
      doctorCount: stat.doctors.length
    }));

    return NextResponse.json({
      type,
      date,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {
        totalCount,
        totalAmount,
        reasonCount: disagreementStats.length
      },
      stats: processedStats
    });

  } catch (error) {
    console.error('미동의 사유별 통계 조회 중 에러:', error);
    return NextResponse.json(
      { error: "미동의 사유별 통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}