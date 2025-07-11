import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET 요청 처리 - 요일별 환자 통계 조회
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
    
    // MongoDB aggregation을 사용하여 요일별 통계 계산
    const dayOfWeekStats = await db.collection('transactions').aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $addFields: {
          // 날짜를 한국 시간으로 변환
          dateKST: { $add: ["$date", 9 * 60 * 60 * 1000] }
        }
      },
      {
        $addFields: {
          // 요일 계산 (1=일요일, 2=월요일, ..., 7=토요일)
          dayOfWeek: { $dayOfWeek: "$dateKST" },
          // 날짜 문자열 생성
          dateString: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$dateKST",
              timezone: "UTC"
            }
          }
        }
      },
      {
        $group: {
          _id: {
            dayOfWeek: "$dayOfWeek",
            date: "$dateString",
            chartNumber: "$chartNumber"
          },
          isNew: { $max: "$isNew" }
        }
      },
      {
        $group: {
          _id: "$_id.dayOfWeek",
          visits: {
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
          dayOfWeek: "$_id",
          totalPatients: { $size: "$visits" },
          newPatients: {
            $size: {
              $filter: {
                input: "$visits",
                cond: { $eq: ["$$this.isNew", true] }
              }
            }
          }
        }
      },
      {
        $sort: { dayOfWeek: 1 }
      }
    ]).toArray();

    // 요일명 매핑 (1=일요일부터 시작)
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    
    // 모든 요일에 대한 데이터 생성 (데이터가 없는 요일도 0으로 표시)
    const result = [];
    for (let i = 1; i <= 7; i++) {
      const existingData = dayOfWeekStats.find(stat => stat.dayOfWeek === i);
      result.push({
        dayOfWeek: dayNames[i - 1],
        dayNumber: i,
        totalPatients: existingData ? existingData.totalPatients : 0,
        newPatients: existingData ? existingData.newPatients : 0
      });
    }

    return NextResponse.json({
      dayOfWeekStats: result
    });
  } catch (error) {
    console.error('요일별 통계 조회 중 에러:', error);
    return NextResponse.json(
      { error: "요일별 통계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}