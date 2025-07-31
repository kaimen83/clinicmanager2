import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { toKstDate } from '@/lib/utils';

// GET 요청 처리 - 신환 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateType = searchParams.get('dateType') || 'daily'; // 'daily' 또는 'monthly'
    const date = searchParams.get('date'); // YYYY-MM-DD 또는 YYYY-MM
    
    if (!date) {
      return NextResponse.json(
        { error: "날짜 파라미터가 필요합니다." },
        { status: 400 }
      );
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const { db } = await connectToDatabase();
    
    // 날짜 범위 계산
    let startDate: Date, endDate: Date;
    
    if (dateType === 'daily') {
      // 일별 데이터
      const selectedDate = toKstDate(date);
      startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (dateType === 'monthly') {
      // 월별 데이터
      const [year, month] = date.split('-').map(Number);
      
      startDate = toKstDate(new Date(year, month - 1, 1));
      startDate.setHours(0, 0, 0, 0);
      
      endDate = toKstDate(new Date(year, month, 0));
      endDate.setHours(23, 59, 59, 999);
    } else {
      return NextResponse.json(
        { error: "dateType 파라미터는 'daily' 또는 'monthly'여야 합니다." },
        { status: 400 }
      );
    }
    
    // 신환 트랜잭션 데이터 조회 (isNew가 true인 경우)
    const newPatientTransactions = await db.collection('transactions')
      .find({
        date: { $gte: startDate, $lte: endDate },
        isNew: true,
        paymentMethod: { $ne: '수납없음' } // '수납없음' 결제방법 제외
      })
      .sort({ date: -1 })
      .toArray();
    
    // 차트번호별로 그룹화하여 중복 제거 (같은 날 같은 환자의 여러 거래는 하나로 표시)
    const patientMap = new Map();
    
    newPatientTransactions.forEach(transaction => {
      const key = `${transaction.chartNumber}-${transaction.date.toISOString().split('T')[0]}`;
      
      if (!patientMap.has(key)) {
        patientMap.set(key, {
          _id: transaction._id,
          date: transaction.date,
          chartNumber: transaction.chartNumber,
          patientName: transaction.patientName,
          paymentMethod: transaction.paymentMethod,
          paymentAmount: transaction.paymentAmount,
          visitPath: transaction.visitPath || '미설정',
          doctor: transaction.doctor || '미설정',
          treatments: [transaction.treatmentType || '미설정'],
          treatmentDetails: [transaction] // 상세 정보를 위해 원본 트랜잭션 보관
        });
      } else {
        // 같은 환자의 같은 날 추가 거래는 treatments 배열에 추가
        const existing = patientMap.get(key);
        existing.treatments.push(transaction.treatmentType || '미설정');
        existing.treatmentDetails.push(transaction);
        existing.paymentAmount += transaction.paymentAmount; // 총 결제금액 누적
        
        // 결제방법이 다른 경우 복합으로 표시
        if (existing.paymentMethod !== transaction.paymentMethod) {
          existing.paymentMethod = '복합';
        }
      }
    });
    
    // Map을 배열로 변환하고 날짜순으로 정렬 (오름차순)
    const newPatients = Array.from(patientMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return NextResponse.json({
      dateType,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      newPatients,
      totalCount: newPatients.length
    });
  } catch (error) {
    console.error('신환 목록 조회 중 에러:', error);
    return NextResponse.json(
      { error: "신환 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}