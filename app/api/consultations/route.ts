import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { createNewDate } from '@/lib/utils';

// GET 요청 처리 - 상담 내역 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const dateStart = searchParams.get('dateStart') || '';
    const dateEnd = searchParams.get('dateEnd') || '';
    const agreed = searchParams.get('agreed');
    const chartNumber = searchParams.get('chartNumber') || '';
    const patientName = searchParams.get('patientName') || '';
    
    const { db } = await connectToDatabase();
    
    // 검색 쿼리 구성
    let searchQuery: any = {};
    
    if (query) {
      searchQuery['$or'] = [
        { chartNumber: { $regex: query, $options: 'i' } },
        { patientName: { $regex: query, $options: 'i' } }
      ];
    }
    
    // 차트번호 필터
    if (chartNumber) {
      searchQuery['chartNumber'] = chartNumber;
    }
    
    // 환자명 필터
    if (patientName) {
      searchQuery['patientName'] = patientName;
    }
    
    // 날짜 필터 추가 (날짜의 시작과 끝 시간 설정 - 한국 시간 기준)
    if (dateStart) {
      // 시작 날짜: 해당 날짜의 00:00:00 (한국 시간)
      const startParts = dateStart.split('-').map(Number);
      const startDateObj = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
      
      // 한국 시간과 UTC 간의 시차 조정 (9시간)
      const kstOffset = 9 * 60 * 60 * 1000;
      const startUtc = new Date(startDateObj.getTime() - kstOffset);
      
      searchQuery['date'] = { $gte: startUtc };
    }

    if (dateEnd) {
      // 종료 날짜: 해당 날짜의 23:59:59.999 (한국 시간)
      const endParts = dateEnd.split('-').map(Number);
      const endDateObj = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);
      
      // 한국 시간과 UTC 간의 시차 조정 (9시간)
      const kstOffset = 9 * 60 * 60 * 1000;
      const endUtc = new Date(endDateObj.getTime() - kstOffset);
      
      searchQuery['date'] = { ...searchQuery['date'], $lte: endUtc };
    }
    
    // 동의 여부 필터 추가
    if (agreed) {
      searchQuery['agreed'] = agreed === 'true';
    }
    
    // consultations 컬렉션에서 직접 조회
    const consultations = await db
      .collection('consultations')
      .find(searchQuery)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // 전체 개수 조회
    const total = await db
      .collection('consultations')
      .countDocuments(searchQuery);
    
    return NextResponse.json({
      consultations: consultations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('상담 내역 목록 조회 중 에러:', error);
    return NextResponse.json(
      { error: "상담 내역 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST 요청 처리 - 상담 내역 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { db } = await connectToDatabase();

    // 필수 필드 검증
    if (!body.chartNumber || !body.patientName || !body.doctor || !body.staff || !body.amount) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    const now = createNewDate();
    
    const consultationData = {
      date: new Date(body.date),
      chartNumber: body.chartNumber,
      patientName: body.patientName,
      doctor: body.doctor,
      staff: body.staff,
      amount: Number(body.amount),
      agreed: Boolean(body.agreed),
      confirmedDate: body.agreed && body.confirmedDate ? new Date(body.confirmedDate) : null,
      notes: body.notes || '',
      createdAt: now,
      updatedAt: now
    };

    // 상담 내역 저장
    const result = await db.collection('consultations').insertOne(consultationData);
    
    // 저장된 상담 내역 조회
    const savedConsultation = await db.collection('consultations').findOne({
      _id: result.insertedId
    });

    return NextResponse.json(savedConsultation, { status: 201 });
  } catch (error) {
    console.error('상담 내역 저장 중 에러:', error);
    return NextResponse.json(
      { error: "상담 내역 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 