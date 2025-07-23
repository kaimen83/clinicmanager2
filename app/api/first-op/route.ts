import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import FirstOp, { IFirstOp, IImplantItem, IFixtureItem } from '@/lib/models/FirstOp';
import { createKstDateForMongoDB } from '@/lib/utils';

// 1st OP 정보 생성 (POST)
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const {
      date,
      chartNumber,
      patientName,
      doctor,
      implants,
      fixtures
    }: {
      date: string;
      chartNumber: string;
      patientName: string;
      doctor: string;
      implants?: IImplantItem[];
      fixtures?: IFixtureItem[];
    } = body;

    // 기본 데이터 유효성 검사
    if (!date || !chartNumber || !patientName || !doctor) {
      return NextResponse.json(
        { message: '날짜, 차트번호, 환자명, 담당의는 필수 정보입니다.' },
        { status: 400 }
      );
    }

    // 임플란트와 이식재 중 하나 이상 있는지 확인
    if ((!implants || !implants.length) && (!fixtures || !fixtures.length)) {
      return NextResponse.json(
        { message: '임플란트 또는 이식재 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // 임플란트 데이터 유효성 검사 (있는 경우에만)
    if (implants && implants.length) {
      const isValidImplants = implants.every(imp => 
        imp.manufacturer && 
        typeof imp.quantity === 'number' && 
        imp.quantity > 0
      );

      if (!isValidImplants) {
        return NextResponse.json(
          { message: '잘못된 임플란트 정보가 포함되어 있습니다.' },
          { status: 400 }
        );
      }
    }

    // 이식재 데이터 유효성 검사 (있는 경우에만)
    if (fixtures && fixtures.length) {
      const isValidFixtures = fixtures.every(fix => 
        fix.type && 
        typeof fix.quantity === 'number' && 
        fix.quantity > 0
      );

      if (!isValidFixtures) {
        return NextResponse.json(
          { message: '잘못된 이식재 정보가 포함되어 있습니다.' },
          { status: 400 }
        );
      }
    }

    // 새로운 1st OP 정보 생성
    const firstOp = new FirstOp({
      date: createKstDateForMongoDB(date),
      chartNumber,
      patientName,
      doctor,
      implants: implants || [],
      fixtures: fixtures || []
    });

    await firstOp.save();

    return NextResponse.json(firstOp, { status: 201 });
  } catch (error) {
    console.error('1st OP 정보 저장 중 서버 에러:', error);
    console.error('에러 상세:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    
    return NextResponse.json(
      { 
        message: '1st OP 정보 저장에 실패했습니다.',
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}

// 1st OP 정보 조회 (GET)
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const chartNumber = searchParams.get('chartNumber');
    const date = searchParams.get('date');

    let query: any = {};

    if (chartNumber) {
      query.chartNumber = chartNumber;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      query.date = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const firstOps = await FirstOp.find(query).sort({ date: -1 });

    return NextResponse.json(firstOps);
  } catch (error) {
    console.error('1st OP 정보 조회 중 에러:', error);
    return NextResponse.json(
      { message: '1st OP 정보 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
} 