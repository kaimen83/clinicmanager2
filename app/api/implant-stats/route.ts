import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { toISODateString } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const doctor = searchParams.get('doctor');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '시작 날짜와 종료 날짜가 필요합니다.' }, { status: 400 });
    }

    // 한국 시간 기준 날짜 필터링 (date-rule 준수)
    // 프론트엔드에서 받은 날짜를 한국 시간으로 해석하여 UTC 범위 생성
    const startParts = startDate.split('-').map(Number);
    const startDateObj = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
    
    const endParts = endDate.split('-').map(Number);
    const endDateObj = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);
    
    // 한국 시간을 UTC로 변환 (9시간 빼기)
    const kstOffset = 9 * 60 * 60 * 1000;
    const startUtc = new Date(startDateObj.getTime() - kstOffset);
    const endUtc = new Date(endDateObj.getTime() - kstOffset);

    // 쿼리 조건 생성
    const query: any = {
      date: {
        $gte: startUtc,
        $lte: endUtc
      },
      type: 'OUT',
      outReason: '환자사용' // 폐기 제외
    };

    // 의사 필터 추가
    if (doctor && doctor !== 'all') {
      query.doctor = doctor;
    }

    // 임플란트 사용량 로그 조회
    const implantLogs = await db.collection('implantinventorylogs').find(query).toArray();

    // 제품 정보 조회 (productId로)
    const productIds = implantLogs.map((log: any) => log.productId);
    const products = await db.collection('implantproducts').find({
      _id: { $in: productIds }
    }).toArray();

    // 제품 정보를 맵으로 변환
    const productMap = new Map();
    products.forEach((product: any) => {
      productMap.set(product._id.toString(), product);
    });

    // 날짜별 데이터 집계
    const dateMap = new Map<string, any>();

    // 임플란트 로그 데이터 처리
    implantLogs.forEach((log: any) => {
      // MongoDB UTC 날짜를 한국 시간으로 직접 변환
      const utcDate = new Date(log.date);
      const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000)); // UTC + 9시간
      const dateStr = kstDate.toISOString().split('T')[0];
      
      const productInfo = productMap.get(log.productId.toString());
      
      if (!productInfo || !log.chartNumber) return; // 제품 정보나 차트번호가 없으면 스킵
      
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          date: dateStr,
          implants: {},
          fixtures: {},
          totalImplants: 0,
          patients: []
        });
      }

      const dayData = dateMap.get(dateStr);
      
      if (productInfo.category === 'fixture') {
        // 임플란트 (fixture) 데이터
        const manufacturer = productInfo.name;
        dayData.implants[manufacturer] = (dayData.implants[manufacturer] || 0) + log.quantity;
        dayData.totalImplants += log.quantity;
      } else if (productInfo.category === '이식재') {
        // 이식재 데이터
        const type = productInfo.name;
        dayData.fixtures[type] = (dayData.fixtures[type] || 0) + log.quantity;
      }

      // 환자별 데이터 추가
      let patient = dayData.patients.find((p: any) => p.chartNumber === log.chartNumber);
      if (!patient) {
        patient = {
          chartNumber: log.chartNumber,
          patientName: log.patientName || '',
          doctor: log.doctor || '',
          implants: [],
          fixtures: []
        };
        dayData.patients.push(patient);
      }

      if (productInfo.category === 'fixture') {
        patient.implants.push({
          manufacturer: productInfo.name,
          specification: productInfo.specification || '',
          quantity: log.quantity
        });
      } else if (productInfo.category === '이식재') {
        patient.fixtures.push({
          type: productInfo.name,
          specification: productInfo.specification || '',
          quantity: log.quantity
        });
      }
    });

    // 누적 총계 계산 (전체 기간의 fixture 사용량)
    const totalQuery: any = {
      type: 'OUT',
      outReason: '환자사용',
      date: { $lte: endUtc }
    };
    
    if (doctor && doctor !== 'all') {
      totalQuery.doctor = doctor;
    }

    const totalLogs = await db.collection('implantinventorylogs').find(totalQuery).toArray();
    const totalProductIds = totalLogs.map((log: any) => log.productId);
    const totalProducts = await db.collection('implantproducts').find({
      _id: { $in: totalProductIds }
    }).toArray();
    
    const totalProductMap = new Map();
    totalProducts.forEach((product: any) => {
      totalProductMap.set(product._id.toString(), product);
    });

    const accumulatedTotal = totalLogs
      .filter((log: any) => {
        const productInfo = totalProductMap.get(log.productId.toString());
        return productInfo && productInfo.category === 'fixture';
      })
      .reduce((sum: number, log: any) => sum + log.quantity, 0);

    // 결과 데이터 구성 (날짜순 정렬)
    const data = Array.from(dateMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // reference/js/implantStats.js가 기대하는 형태로 반환
    return NextResponse.json({
      data,
      accumulatedTotal
    });

  } catch (error) {
    console.error('임플란트 통계 조회 실패:', error);
    return NextResponse.json({ 
      error: '임플란트 통계를 조회하는 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 