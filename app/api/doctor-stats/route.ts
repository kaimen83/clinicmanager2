import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET 요청 처리 - 의사별 환자 통계 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date'); // YYYY-MM
    
    if (!date) {
      return NextResponse.json(
        { error: "날짜 파라미터가 필요합니다. (YYYY-MM)" },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    // 월별 날짜 범위 계산 (한국 시간 기준)
    const [year, month] = date.split('-').map(Number);
    const startDateObj = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDateObj = new Date(year, month, 0, 23, 59, 59, 999);
    
    // 한국 시간과 UTC 간의 시차 조정 (9시간)
    const kstOffset = 9 * 60 * 60 * 1000;
    const startDate = new Date(startDateObj.getTime() - kstOffset);
    const endDate = new Date(endDateObj.getTime() - kstOffset);
    
    // MongoDB aggregation을 사용하여 의사별 통계 계산
    const doctorStats = await db.collection('transactions').aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $addFields: {
          // 날짜를 한국 시간으로 변환하여 날짜 부분만 추출
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
        $group: {
          _id: {
            doctor: "$doctor",
            date: "$dateKST",
            chartNumber: "$chartNumber"
          },
          isNew: { $max: "$isNew" } // 같은 환자가 여러 번 방문해도 신환은 한 번만 카운트
        }
      },
      {
        $group: {
          _id: "$_id.doctor",
          dailyVisits: {
            $push: {
              date: "$_id.date",
              chartNumber: "$_id.chartNumber",
              isNew: "$isNew"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          doctor: "$_id",
          totalPatients: { $size: "$dailyVisits" },
          newPatients: {
            $size: {
              $filter: {
                input: "$dailyVisits",
                cond: { $eq: ["$$this.isNew", true] }
              }
            }
          }
        }
      },
      {
        $sort: { totalPatients: -1 }
      }
    ]).toArray();

    // 전체 통계도 함께 계산
    const totalStats = await db.collection('transactions').aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $addFields: {
          dateKST: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $add: ["$date", 9 * 60 * 60 * 1000] },
              timezone: "UTC"
            }
          }
        }
      },
      {
        $group: {
          _id: {
            date: "$dateKST",
            chartNumber: "$chartNumber"
          },
          isNew: { $max: "$isNew" }
        }
      },
      {
        $group: {
          _id: null,
          totalPatients: { $sum: 1 },
          newPatients: {
            $sum: { $cond: [{ $eq: ["$isNew", true] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    const total = totalStats.length > 0 ? totalStats[0] : { totalPatients: 0, newPatients: 0 };

    return NextResponse.json({
      doctorStats,
      total: {
        totalPatients: total.totalPatients,
        newPatients: total.newPatients
      }
    });
  } catch (error) {
    console.error('의사별 통계 조회 중 에러:', error);
    return NextResponse.json(
      { error: "의사별 통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}