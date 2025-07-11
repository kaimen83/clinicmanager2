import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET 요청 처리 - 15개월간 환자 내원 기록 조회
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
    
    // 각 월별로 환자 통계 계산
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
      
      // 월별 통계 계산 - 일자별로 중복 허용, 같은 날 내 중복은 제거
      const dailyPatientMap = new Map();
      const dailyNewPatientMap = new Map();
      
      transactions.forEach(t => {
        // 날짜 문자열 생성 (YYYY-MM-DD 형식)
        const txDate = new Date(t.date);
        const dateStr = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;
        
        // 해당 날짜의 환자 집합이 없으면 새로 생성
        if (!dailyPatientMap.has(dateStr)) {
          dailyPatientMap.set(dateStr, new Set());
        }
        
        // 해당 날짜에 방문한 환자 차트번호 추가
        dailyPatientMap.get(dateStr).add(t.chartNumber);
        
        // 신환 처리
        if (t.isNew) {
          if (!dailyNewPatientMap.has(dateStr)) {
            dailyNewPatientMap.set(dateStr, new Set());
          }
          dailyNewPatientMap.get(dateStr).add(t.chartNumber);
        }
      });
      
      // 일별 방문 환자 수 총합 계산 (중복 허용)
      const totalPatients = Array.from(dailyPatientMap.values())
        .reduce((total, patientSet) => total + patientSet.size, 0);
      
      // 일별 신환 환자 수 총합 계산 (중복 허용)
      const newPatients = Array.from(dailyNewPatientMap.values())
        .reduce((total, patientSet) => total + patientSet.size, 0);
      
      // 실제 진료한 날짜 수 계산 (환자 데이터가 있는 날짜만)
      const actualTreatmentDays = dailyPatientMap.size;
      
      // 일평균 계산 (실제 진료한 날짜만 기준)
      const avgTotalPatients = actualTreatmentDays > 0 
        ? Math.round((totalPatients / actualTreatmentDays) * 10) / 10 
        : 0;
      const avgNewPatients = actualTreatmentDays > 0 
        ? Math.round((newPatients / actualTreatmentDays) * 10) / 10 
        : 0;
      
      return {
        month: key,
        totalPatients,
        newPatients,
        avgTotalPatients,
        avgNewPatients,
        treatmentDays: actualTreatmentDays
      };
    }));
    
    return NextResponse.json({
      history: results
    });
  } catch (error) {
    console.error('환자 내원 기록 조회 중 에러:', error);
    return NextResponse.json(
      { error: "환자 내원 기록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}