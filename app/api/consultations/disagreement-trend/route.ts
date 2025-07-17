import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET 요청 처리 - 미동의 사유별 15개월 트렌드 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    const { db } = await connectToDatabase();

    // 15개월 전 날짜 계산
    const endDateObj = new Date(endDate);
    const startDateObj = new Date(endDateObj);
    startDateObj.setMonth(startDateObj.getMonth() - 14); // 15개월 전
    startDateObj.setDate(1); // 월 첫날
    
    // 한국 시간 기준으로 변환
    const startDate = new Date(`${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, '0')}-01T00:00:00+09:00`);
    const endDateRange = new Date(`${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(new Date(endDateObj.getFullYear(), endDateObj.getMonth() + 1, 0).getDate()).padStart(2, '0')}T23:59:59+09:00`);

    // 15개월간 미동의 사유별 월별 통계 조회
    const trendData = await db.collection('consultations').aggregate([
      {
        $match: {
          agreed: false,
          disagreementReason: { $exists: true, $ne: null },
          date: { 
            $gte: startDate,
            $lte: endDateRange
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: { $dateAdd: { startDate: "$date", unit: "hour", amount: 9 } } }, // KST 변환
            month: { $month: { $dateAdd: { startDate: "$date", unit: "hour", amount: 9 } } }, // KST 변환
            reason: "$disagreementReason"
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.reason": 1 }
      }
    ]).toArray();

    // 모든 사유 목록 추출
    const allReasons = [...new Set(trendData.map(item => item._id.reason))];

    // 15개월간의 모든 월 생성
    const months: string[] = [];
    for (let i = 0; i < 15; i++) {
      const monthDate = new Date(startDateObj);
      monthDate.setMonth(monthDate.getMonth() + i);
      const monthString = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthString);
    }

    // 월별 데이터 구조 생성
    const monthlyData = months.map(month => {
      const [year, monthNum] = month.split('-').map(Number);
      const reasons: { [key: string]: { count: number; amount: number } } = {};
      
      // 모든 사유를 0으로 초기화
      allReasons.forEach(reason => {
        reasons[reason] = { count: 0, amount: 0 };
      });
      
      // 실제 데이터 채우기
      trendData.forEach(item => {
        if (item._id.year === year && item._id.month === monthNum) {
          reasons[item._id.reason] = {
            count: item.count,
            amount: item.totalAmount
          };
        }
      });
      
      return {
        month,
        reasons
      };
    });

    // 사유별 전체 통계 (정렬용)
    const reasonTotals = allReasons.map(reason => {
      const totalCount = trendData
        .filter(item => item._id.reason === reason)
        .reduce((sum, item) => sum + item.count, 0);
      const totalAmount = trendData
        .filter(item => item._id.reason === reason)
        .reduce((sum, item) => sum + item.totalAmount, 0);
      
      return {
        reason,
        totalCount,
        totalAmount
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);

    return NextResponse.json({
      dateRange: {
        start: startDate.toISOString(),
        end: endDateRange.toISOString()
      },
      months,
      monthlyData,
      reasons: allReasons,
      reasonTotals
    });

  } catch (error) {
    console.error('미동의 사유별 트렌드 조회 중 에러:', error);
    return NextResponse.json(
      { error: "미동의 사유별 트렌드 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}