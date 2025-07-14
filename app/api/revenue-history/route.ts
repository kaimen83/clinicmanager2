import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET 요청 처리 - 15개월간 매출 기록 조회
export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    // 현재 날짜에서 15개월 전까지의 데이터 계산
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 0-based이므로 +1
    
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
    
    // 각 월별로 매출 통계 계산
    const results = await Promise.all(months.map(async ({ year, month, key }) => {
      // 해당 월의 시작일과 종료일 계산 (한국 시간 기준)
      const startDateObj = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endDateObj = new Date(year, month, 0, 23, 59, 59, 999);
      
      // 한국 시간과 UTC 간의 시차 조정 (9시간)
      const kstOffset = 9 * 60 * 60 * 1000;
      const startDate = new Date(startDateObj.getTime() - kstOffset);
      const endDate = new Date(endDateObj.getTime() - kstOffset);
      
      // 해당 월의 트랜잭션 데이터 조회
      const transactions = await db.collection('transactions')
        .find({
          date: { $gte: startDate, $lte: endDate }
        })
        .toArray();

      // 진료외수입 데이터 조회
      const extraincomes = await db.collection('extraincomes')
        .find({
          date: { $gte: startDate, $lte: endDate }
        })
        .toArray();
      
      // 매출 통계 계산
      let totalRevenue = 0;
      let cashRevenue = 0;
      let cardRevenue = 0;
      const dailyRevenueMap = new Map(); // 날짜별 매출 추적
      const doctorRevenueMap = new Map(); // 원장별 매출 추적
      const doctorDailyRevenueMap = new Map(); // 원장별 일별 매출 추적
      
      transactions.forEach(t => {
        const amount = t.paymentAmount || 0;
        const doctor = (t.doctor || '미분류').trim(); // 공백 제거
        totalRevenue += amount;
        
        if (t.paymentMethod === '현금' || t.paymentMethod === '계좌이체') {
          cashRevenue += amount;
        } else if (t.paymentMethod === '카드') {
          cardRevenue += amount;
        }
        
        // 날짜별 매출 기록
        const txDate = new Date(t.date);
        const dateStr = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;
        
        if (!dailyRevenueMap.has(dateStr)) {
          dailyRevenueMap.set(dateStr, 0);
        }
        dailyRevenueMap.set(dateStr, dailyRevenueMap.get(dateStr) + amount);
        
        // 원장별 매출 기록
        if (!doctorRevenueMap.has(doctor)) {
          doctorRevenueMap.set(doctor, 0);
          doctorDailyRevenueMap.set(doctor, new Set());
        }
        doctorRevenueMap.set(doctor, doctorRevenueMap.get(doctor) + amount);
        doctorDailyRevenueMap.get(doctor).add(dateStr);
      });
      
      // 진료외수입 계산
      const extraIncome = extraincomes.reduce((sum, income) => sum + (Number(income.amount) || 0), 0);
      
      // 실제 매출이 있었던 날짜 수 (0원이 아닌 날짜만)
      const treatmentDays = Array.from(dailyRevenueMap.values()).filter(revenue => revenue > 0).length;
      
      // 일평균 계산 (실제 매출이 있었던 날짜만 기준)
      const avgTotalRevenue = treatmentDays > 0 ? Math.round(totalRevenue / treatmentDays) : 0;
      const avgCashRevenue = treatmentDays > 0 ? Math.round(cashRevenue / treatmentDays) : 0;
      
      // 원장별 매출 및 일평균 계산
      const doctorRevenues: any = {};
      
      for (const [doctor, revenue] of doctorRevenueMap.entries()) {
        const doctorTreatmentDays = doctorDailyRevenueMap.get(doctor).size;
        doctorRevenues[`${doctor}_총매출`] = revenue;
        doctorRevenues[`${doctor}_일평균매출`] = doctorTreatmentDays > 0 ? Math.round(revenue / doctorTreatmentDays) : 0;
        doctorRevenues[`${doctor}_진료일수`] = doctorTreatmentDays;
      }
      
      return {
        month: key,
        totalRevenue,
        cashRevenue,
        cardRevenue,
        extraIncome,
        avgTotalRevenue,
        avgCashRevenue,
        treatmentDays,
        ...doctorRevenues
      };
    }));
    
    return NextResponse.json({
      revenueHistory: results
    });
  } catch (error) {
    console.error('매출 기록 조회 중 에러:', error);
    return NextResponse.json(
      { error: "매출 기록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}