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
      
      // 각 그룹별 통계 계산
      const groups = await Promise.all(visitPathGroups.map(async (group) => {
        // 그룹에 속한 내원경로들의 트랜잭션 데이터 조회
        const transactions = await db.collection('transactions')
          .find({
            date: { $gte: startDate, $lte: endDate },
            visitPath: { $in: group.visitPaths }
          })
          .toArray();
        
        // 환자 수 계산 (중복 제거)
        const uniquePatients = new Set(transactions.map(t => t.chartNumber));
        const patientCount = uniquePatients.size;
        
        // 결제 금액 합계
        const paymentAmount = transactions.reduce((sum, t) => sum + (t.paymentAmount || 0), 0);
        
        // 상담 금액 계산 (해당 내원경로의 상담 데이터)
        // 먼저 해당 그룹의 내원경로를 가진 환자들의 차트번호를 구함
        const groupPatients = await db.collection('patients')
          .find({ visitPath: { $in: group.visitPaths } })
          .toArray();
        
        const groupChartNumbers = groupPatients.map(p => p.chartNumber);
        
        const consultations = await db.collection('consultations')
          .find({
            date: { $gte: startDate, $lte: endDate },
            chartNumber: { $in: groupChartNumbers }
          })
          .toArray();
        
        // 상담 금액 합계 (합의 + 비합의)
        const consultationAmount = consultations.reduce((sum, c) => {
          return sum + (c.amount || 0);
        }, 0);
        
        return {
          groupName: group.name,
          patientCount,
          paymentAmount,
          consultationAmount
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