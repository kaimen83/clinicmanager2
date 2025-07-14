import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET 요청 처리 - 15개월 상담 트렌드 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();

    // 15개월 전 날짜 계산
    const currentDate = new Date();
    const fifteenMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 14, 1);

    // 15개월간 상담 트렌드 데이터 조회
    const consultationTrends = await db.collection('consultations').aggregate([
      {
        $match: {
          date: { $gte: fifteenMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          totalConsultations: { $sum: 1 },
          agreedConsultations: { $sum: { $cond: [{ $eq: ["$agreed", true] }, 1, 0] } },
          nonAgreedConsultations: { $sum: { $cond: [{ $eq: ["$agreed", false] }, 1, 0] } },
          totalAmount: { $sum: "$amount" },
          agreedAmount: { $sum: { $cond: [{ $eq: ["$agreed", true] }, "$amount", 0] } },
          nonAgreedAmount: { $sum: { $cond: [{ $eq: ["$agreed", false] }, "$amount", 0] } }
        }
      },
      {
        $addFields: {
          month_str: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              { $cond: [
                { $lt: ["$_id.month", 10] },
                { $concat: ["0", { $toString: "$_id.month" }] },
                { $toString: "$_id.month" }
              ] }
            ]
          },
          agreedPercentage: {
            $round: [
              { $multiply: [
                { $divide: ["$agreedConsultations", "$totalConsultations"] },
                100
              ] },
              1
            ]
          },
          agreedAmountPercentage: {
            $round: [
              { $multiply: [
                { $divide: ["$agreedAmount", "$totalAmount"] },
                100
              ] },
              1
            ]
          },
          avgConsultationAmount: {
            $round: [
              { $divide: ["$totalAmount", "$totalConsultations"] },
              0
            ]
          }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]).toArray();

    // 의사별 15개월 트렌드 데이터 조회
    const doctorTrends = await db.collection('consultations').aggregate([
      {
        $match: {
          date: { $gte: fifteenMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            doctor: "$doctor"
          },
          totalConsultations: { $sum: 1 },
          agreedConsultations: { $sum: { $cond: [{ $eq: ["$agreed", true] }, 1, 0] } },
          totalAmount: { $sum: "$amount" },
          agreedAmount: { $sum: { $cond: [{ $eq: ["$agreed", true] }, "$amount", 0] } }
        }
      },
      {
        $addFields: {
          month_str: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              { $cond: [
                { $lt: ["$_id.month", 10] },
                { $concat: ["0", { $toString: "$_id.month" }] },
                { $toString: "$_id.month" }
              ] }
            ]
          },
          agreedPercentage: {
            $round: [
              { $multiply: [
                { $divide: ["$agreedConsultations", "$totalConsultations"] },
                100
              ] },
              1
            ]
          }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.doctor": 1 }
      }
    ]).toArray();

    // 직원별 15개월 트렌드 데이터 조회 (상위 5명)
    const staffTrends = await db.collection('consultations').aggregate([
      {
        $match: {
          date: { $gte: fifteenMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            staff: "$staff"
          },
          totalConsultations: { $sum: 1 },
          agreedConsultations: { $sum: { $cond: [{ $eq: ["$agreed", true] }, 1, 0] } },
          totalAmount: { $sum: "$amount" },
          agreedAmount: { $sum: { $cond: [{ $eq: ["$agreed", true] }, "$amount", 0] } }
        }
      },
      {
        $addFields: {
          month_str: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              { $cond: [
                { $lt: ["$_id.month", 10] },
                { $concat: ["0", { $toString: "$_id.month" }] },
                { $toString: "$_id.month" }
              ] }
            ]
          },
          agreedPercentage: {
            $round: [
              { $multiply: [
                { $divide: ["$agreedConsultations", "$totalConsultations"] },
                100
              ] },
              1
            ]
          }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.staff": 1 }
      }
    ]).toArray();

    // 의사별로 그룹화
    const doctorsByMonth = new Map();
    doctorTrends.forEach(trend => {
      const key = trend.month_str;
      if (!doctorsByMonth.has(key)) {
        doctorsByMonth.set(key, {});
      }
      doctorsByMonth.get(key)[`${trend._id.doctor}_동의율`] = trend.agreedPercentage;
      doctorsByMonth.get(key)[`${trend._id.doctor}_상담건수`] = trend.totalConsultations;
      doctorsByMonth.get(key)[`${trend._id.doctor}_상담금액`] = trend.totalAmount;
    });

    // 직원별로 그룹화 (상위 5명만)
    const staffTotalStats = new Map();
    staffTrends.forEach(trend => {
      const staff = trend._id.staff;
      if (!staffTotalStats.has(staff)) {
        staffTotalStats.set(staff, 0);
      }
      staffTotalStats.set(staff, staffTotalStats.get(staff) + trend.totalConsultations);
    });

    const topStaffs = Array.from(staffTotalStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    const staffsByMonth = new Map();
    staffTrends.forEach(trend => {
      if (topStaffs.includes(trend._id.staff)) {
        const key = trend.month_str;
        if (!staffsByMonth.has(key)) {
          staffsByMonth.set(key, {});
        }
        staffsByMonth.get(key)[`${trend._id.staff}_동의율`] = trend.agreedPercentage;
        staffsByMonth.get(key)[`${trend._id.staff}_상담건수`] = trend.totalConsultations;
      }
    });

    // 15개월 전체 범위 생성 (빈 월도 포함)
    const result = [];
    const currentDate = new Date();
    
    for (let i = 14; i >= 0; i--) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      
      // 해당 월의 실제 데이터 찾기
      const monthTrend = consultationTrends.find(trend => trend.month_str === monthStr);
      
      const monthData = {
        month: monthStr,
        totalConsultations: monthTrend ? monthTrend.totalConsultations : 0,
        agreedConsultations: monthTrend ? monthTrend.agreedConsultations : 0,
        nonAgreedConsultations: monthTrend ? monthTrend.nonAgreedConsultations : 0,
        agreedPercentage: monthTrend ? monthTrend.agreedPercentage : 0,
        agreedAmountPercentage: monthTrend ? monthTrend.agreedAmountPercentage : 0,
        avgConsultationAmount: monthTrend ? monthTrend.avgConsultationAmount : 0,
        totalAmount: monthTrend ? monthTrend.totalAmount : 0,
        agreedAmount: monthTrend ? monthTrend.agreedAmount : 0,
        nonAgreedAmount: monthTrend ? monthTrend.nonAgreedAmount : 0
      };

      // 의사별 데이터 추가
      const doctorData = doctorsByMonth.get(monthStr) || {};
      Object.assign(monthData, doctorData);

      // 직원별 데이터 추가
      const staffData = staffsByMonth.get(monthStr) || {};
      Object.assign(monthData, staffData);

      result.push(monthData);
    }

    // 의사 이름 목록
    const doctors = await db.collection('consultations').distinct('doctor');
    
    return NextResponse.json({
      trends: result,
      doctors: doctors,
      topStaffs: topStaffs
    });

  } catch (error) {
    console.error('상담 트렌드 조회 중 에러:', error);
    return NextResponse.json(
      { error: "상담 트렌드 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}