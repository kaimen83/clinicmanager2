import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const doctor = searchParams.get('doctor');
    const { date } = await params;

    if (!date) {
      return NextResponse.json({ error: '날짜가 필요합니다.' }, { status: 400 });
    }

    // 한국 시간 기준으로 날짜 범위 설정
    // MongoDB의 date 필드는 한국 시간 기준으로 저장되어 있지만 UTC 형태로 저장됨
    const startDateObj = new Date(date + 'T00:00:00.000Z');
    const endDateObj = new Date(date + 'T23:59:59.999Z');

    // 쿼리 조건 생성
    const query: any = {
      date: {
        $gte: startDateObj,
        $lte: endDateObj
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

    if (implantLogs.length === 0) {
      return NextResponse.json({
        date,
        implants: {},
        fixtures: {},
        totalImplants: 0,
        patients: []
      });
    }

    // 제품 정보 조회
    const productIds = implantLogs.map((log: any) => log.productId);
    const products = await db.collection('implantproducts').find({
      _id: { $in: productIds }
    }).toArray();

    // 제품 정보를 맵으로 변환
    const productMap = new Map();
    products.forEach((product: any) => {
      productMap.set(product._id.toString(), product);
    });

    // 데이터 집계
    const dayData = {
      date,
      implants: {} as { [manufacturer: string]: number },
      fixtures: {} as { [type: string]: number },
      totalImplants: 0,
      patients: [] as Array<{
        chartNumber: string;
        patientName: string;
        doctor: string;
        implants: Array<{ manufacturer: string; specification: string; quantity: number }>;
        fixtures: Array<{ type: string; specification: string; quantity: number }>;
      }>
    };

    // 환자별 데이터를 저장할 맵
    const patientMap = new Map<string, any>();

    // 임플란트 로그 데이터 처리
    implantLogs.forEach((log: any) => {
      const productInfo = productMap.get(log.productId.toString());
      
      if (!productInfo || !log.chartNumber) return; // 제품 정보나 차트번호가 없으면 스킵
      
      // 실제로는 같은 날짜의 데이터만 조회하므로 날짜 변환이 필요하지 않지만,
      // 일관성을 위해 동일한 로직 적용
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

      // 환자별 데이터 처리
      const chartNumber = log.chartNumber;
      if (!patientMap.has(chartNumber)) {
        patientMap.set(chartNumber, {
          chartNumber: log.chartNumber,
          patientName: log.patientName || '',
          doctor: log.doctor || '',
          implants: [],
          fixtures: []
        });
      }

      const patient = patientMap.get(chartNumber);

      if (productInfo.category === 'fixture') {
        // 같은 제품이 이미 있는지 확인
        const existingImplant = patient.implants.find((item: any) => 
          item.manufacturer === productInfo.name && 
          item.specification === (productInfo.specification || '')
        );
        
        if (existingImplant) {
          existingImplant.quantity += log.quantity;
        } else {
          patient.implants.push({
            manufacturer: productInfo.name,
            specification: productInfo.specification || '',
            quantity: log.quantity
          });
        }
      } else if (productInfo.category === '이식재') {
        // 같은 제품이 이미 있는지 확인
        const existingFixture = patient.fixtures.find((item: any) => 
          item.type === productInfo.name && 
          item.specification === (productInfo.specification || '')
        );
        
        if (existingFixture) {
          existingFixture.quantity += log.quantity;
        } else {
          patient.fixtures.push({
            type: productInfo.name,
            specification: productInfo.specification || '',
            quantity: log.quantity
          });
        }
      }
    });

    // 환자 데이터를 배열로 변환
    dayData.patients = Array.from(patientMap.values());

    return NextResponse.json(dayData);

  } catch (error) {
    console.error('날짜별 임플란트 상세 정보 조회 실패:', error);
    return NextResponse.json({ 
      error: '날짜별 상세 정보를 조회하는 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 