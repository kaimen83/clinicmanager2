import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string; chartNumber: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { date, chartNumber } = await params;

    // 날짜 필터 생성 (한국 시간 기준)
    const dateParts = date.split('-').map(Number);
    const startDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0);
    const endDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59, 999);
    
    // 한국 시간과 UTC 간의 시차 조정 (9시간)
    const kstOffset = 9 * 60 * 60 * 1000;
    const startUtc = new Date(startDateObj.getTime() - kstOffset);
    const endUtc = new Date(endDateObj.getTime() - kstOffset);

    // 특정 환자의 임플란트 사용량 로그 조회
    const implantLogs = await db.collection('implantinventorylogs').find({
      date: {
        $gte: startUtc,
        $lte: endUtc
      },
      chartNumber,
      type: 'OUT'
    }).toArray();

    if (implantLogs.length === 0) {
      return NextResponse.json({ error: '해당 환자의 데이터를 찾을 수 없습니다.' }, { status: 404 });
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

    // 환자 정보 구성
    const firstLog = implantLogs[0];
    const implants: any[] = [];
    const fixtures: any[] = [];

    implantLogs.forEach((log: any) => {
      const productInfo = productMap.get(log.productId.toString());
      if (!productInfo) return;

      if (productInfo.category === 'fixture') {
        implants.push({
          manufacturer: productInfo.name,
          specification: productInfo.specification || '',
          quantity: log.quantity
        });
      } else if (productInfo.category === '이식재') {
        fixtures.push({
          type: productInfo.name,
          specification: productInfo.specification || '',
          quantity: log.quantity
        });
      }
    });

    const result = {
      chartNumber,
      patientName: firstLog.patientName,
      doctor: firstLog.doctor,
      date,
      implants,
      fixtures
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('환자별 임플란트 정보 조회 실패:', error);
    return NextResponse.json({ 
      error: '환자별 임플란트 정보를 조회하는 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ date: string; chartNumber: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { date, chartNumber } = await params;
    const body = await request.json();
    const { patientName, doctor, implants, fixtures } = body;

    // 날짜 필터 생성 (한국 시간 기준)
    const dateParts = date.split('-').map(Number);
    const startDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0);
    const endDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59, 999);
    
    const kstOffset = 9 * 60 * 60 * 1000;
    const startUtc = new Date(startDateObj.getTime() - kstOffset);
    const endUtc = new Date(endDateObj.getTime() - kstOffset);

    // 기존 로그 삭제
    await db.collection('implantinventorylogs').deleteMany({
      date: {
        $gte: startUtc,
        $lte: endUtc
      },
      chartNumber,
      type: 'OUT'
    });

    // 새로운 로그 추가
    const newLogs: any[] = [];
    const currentDate = new Date();

    // 임플란트 로그 추가
    for (const implant of implants) {
      if (implant.quantity > 0) {
        // 제품 정보 조회
        const product = await db.collection('implantproducts').findOne({
          category: 'fixture',
          name: implant.manufacturer,
          specification: implant.specification
        });

        if (product) {
          newLogs.push({
            productId: product._id,
            type: 'OUT',
            quantity: implant.quantity,
            chartNumber,
            patientName,
            doctor,
            outReason: '환자사용',
            notes: '수정됨',
            userId: user.id,
            date: currentDate,
            createdAt: currentDate,
            updatedAt: currentDate
          });
        }
      }
    }

    // 이식재 로그 추가
    for (const fixture of fixtures) {
      if (fixture.quantity > 0) {
        // 제품 정보 조회
        const product = await db.collection('implantproducts').findOne({
          category: '이식재',
          name: fixture.type,
          specification: fixture.specification
        });

        if (product) {
          newLogs.push({
            productId: product._id,
            type: 'OUT',
            quantity: fixture.quantity,
            chartNumber,
            patientName,
            doctor,
            outReason: '환자사용',
            notes: '수정됨',
            userId: user.id,
            date: currentDate,
            createdAt: currentDate,
            updatedAt: currentDate
          });
        }
      }
    }

    // 새로운 로그 삽입
    if (newLogs.length > 0) {
      await db.collection('implantinventorylogs').insertMany(newLogs);
    }

    return NextResponse.json({ message: '수정이 완료되었습니다.' });

  } catch (error) {
    console.error('환자별 임플란트 정보 수정 실패:', error);
    return NextResponse.json({ 
      error: '환자별 임플란트 정보를 수정하는 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ date: string; chartNumber: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { date, chartNumber } = await params;

    // 날짜 필터 생성 (한국 시간 기준)
    const dateParts = date.split('-').map(Number);
    const startDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0);
    const endDateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59, 999);
    
    const kstOffset = 9 * 60 * 60 * 1000;
    const startUtc = new Date(startDateObj.getTime() - kstOffset);
    const endUtc = new Date(endDateObj.getTime() - kstOffset);

    // 해당 환자의 임플란트 사용량 로그 삭제
    const result = await db.collection('implantinventorylogs').deleteMany({
      date: {
        $gte: startUtc,
        $lte: endUtc
      },
      chartNumber,
      type: 'OUT'
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: '삭제할 데이터를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ message: '삭제가 완료되었습니다.' });

  } catch (error) {
    console.error('환자별 임플란트 정보 삭제 실패:', error);
    return NextResponse.json({ 
      error: '환자별 임플란트 정보를 삭제하는 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 