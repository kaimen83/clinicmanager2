import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { toKstDate } from '@/lib/utils';

// GET 요청 처리 - 통계 정보 조회 (일별 또는 월별)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'daily'; // 기본값은 일별 통계
    const date = searchParams.get('date'); // YYYY-MM-DD 또는 YYYY-MM
    
    if (!date) {
      return NextResponse.json(
        { error: "날짜 파라미터가 필요합니다. (YYYY-MM-DD 또는 YYYY-MM)" },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    // 날짜 범위 계산
    let startDate: Date, endDate: Date;
    
    if (type === 'daily') {
      // 일별 통계 - 하루 동안의 데이터
      const selectedDate = toKstDate(date);
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (type === 'monthly') {
      // 월별 통계 - 한 달 동안의 데이터
      const [year, month] = date.split('-').map(Number);
      
      startDate = toKstDate(new Date(year, month - 1, 1));
      startDate.setHours(0, 0, 0, 0);
      
      endDate = toKstDate(new Date(year, month, 0));
      endDate.setHours(23, 59, 59, 999);
    } else {
      return NextResponse.json(
        { error: "type 파라미터는 'daily' 또는 'monthly'여야 합니다." },
        { status: 400 }
      );
    }
    
    // 트랜잭션 데이터 조회
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
    
    // 비의료 수입 및 지출 데이터 조회
    const nonMedicalTransactions = await db.collection('nonMedicalTransactions')
      .find({
        date: { $gte: startDate, $lte: endDate }
      })
      .toArray();
    
    // 환자 통계 계산 (일별과 월별 다르게 처리)
    let totalPatients = 0;
    let newPatients = 0;

    if (type === 'daily') {
      // 일별 통계 - 차트번호 기준으로 중복 제거
      const uniqueChartNumbers = new Set();
      const uniqueNewPatientChartNumbers = new Set();

      transactions.forEach(t => {
        uniqueChartNumbers.add(t.chartNumber);
        if (t.isNew) {
          uniqueNewPatientChartNumbers.add(t.chartNumber);
        }
      });
      
      totalPatients = uniqueChartNumbers.size;
      newPatients = uniqueNewPatientChartNumbers.size;
    } else {
      // 월별 통계 - 일자별로 중복 허용, 같은 날 내 중복은 제거
      // 날짜별 환자 집계를 위한 맵
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
      totalPatients = Array.from(dailyPatientMap.values())
        .reduce((total, patientSet) => total + patientSet.size, 0);
      
      // 일별 신환 환자 수 총합 계산 (중복 허용)
      newPatients = Array.from(dailyNewPatientMap.values())
        .reduce((total, patientSet) => total + patientSet.size, 0);
    }
    
    // 진료외수입 총액 계산
    const extraIncomeTotal = extraincomes.reduce((sum, income) => sum + (income.amount || 0), 0);
    
    // 통계 계산
    const stats = {
      totalPatients,
      newPatients,
      cashTransferAmount: transactions
        .filter(t => t.paymentMethod === '현금' || t.paymentMethod === '계좌이체')
        .reduce((sum, t) => sum + (t.paymentAmount || 0), 0),
      cardAmount: transactions
        .filter(t => t.paymentMethod === '카드')
        .reduce((sum, t) => sum + (t.paymentAmount || 0), 0),
      totalPaymentAmount: transactions
        .reduce((sum, t) => sum + (t.paymentAmount || 0), 0),
      nonMedicalIncome: extraIncomeTotal, // 진료외수입을 사용
      totalIncome: 0, // 후에 계산
      totalExpenses: nonMedicalTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0),
      consultationAgreedAmount: 0,
      consultationNonAgreedAmount: 0
    };
    
    // 상담 관련 금액 계산
    let consultationAgreedAmount = 0;
    let consultationNonAgreedAmount = 0;
    
    transactions.forEach(transaction => {
      if (transaction.consultations && transaction.consultations.length > 0) {
        transaction.consultations.forEach((consultation: any) => {
          if (consultation.agreed) {
            consultationAgreedAmount += consultation.amount || 0;
          } else {
            consultationNonAgreedAmount += consultation.amount || 0;
          }
        });
      }
    });
    
    stats.consultationAgreedAmount = consultationAgreedAmount;
    stats.consultationNonAgreedAmount = consultationNonAgreedAmount;
    
    // 총 수입 계산 (전체 수납금액 + 진료외수입)
    stats.totalIncome = stats.totalPaymentAmount + stats.nonMedicalIncome;
    
    return NextResponse.json({
      type,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      stats,
      extraincomes // 진료외수입 목록도 함께 반환
    });
  } catch (error) {
    console.error('통계 정보 조회 중 에러:', error);
    return NextResponse.json(
      { error: "통계 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 