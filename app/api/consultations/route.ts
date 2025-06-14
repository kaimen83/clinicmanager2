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
    
    // 동의 여부 필터 추가
    if (agreed) {
      searchQuery['agreed'] = agreed === 'true';
    }
    
    // 날짜 필터 추가 - 동의 여부에 따라 다른 날짜 필드 사용
    if (dateStart || dateEnd) {
      // 시작 날짜와 종료 날짜 계산 (한국 시간 기준)
      let startUtc: Date | undefined;
      let endUtc: Date | undefined;
      
      if (dateStart) {
        // 시작 날짜: 해당 날짜의 00:00:00 (한국 시간)
        const startParts = dateStart.split('-').map(Number);
        const startDateObj = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
        
        // 한국 시간과 UTC 간의 시차 조정 (9시간)
        const kstOffset = 9 * 60 * 60 * 1000;
        startUtc = new Date(startDateObj.getTime() - kstOffset);
      }

      if (dateEnd) {
        // 종료 날짜: 해당 날짜의 23:59:59.999 (한국 시간)
        const endParts = dateEnd.split('-').map(Number);
        const endDateObj = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);
        
        // 한국 시간과 UTC 간의 시차 조정 (9시간)
        const kstOffset = 9 * 60 * 60 * 1000;
        endUtc = new Date(endDateObj.getTime() - kstOffset);
      }
      
      // 동의 여부에 따라 다른 날짜 필드 사용
      if (agreed === 'true') {
        // 동의한 상담: confirmedDate 기준 (null이 아닌 경우만)
        // confirmedDate도 한국 시간 기준으로 필터링
        const dateFilter: any = { $ne: null };
        if (startUtc) dateFilter.$gte = startUtc;
        if (endUtc) dateFilter.$lte = endUtc;
        searchQuery['confirmedDate'] = dateFilter;
      } else if (agreed === 'false') {
        // 미동의한 상담: date 기준
        const dateFilter: any = {};
        if (startUtc) dateFilter.$gte = startUtc;
        if (endUtc) dateFilter.$lte = endUtc;
        searchQuery['date'] = dateFilter;
      } else {
        // 동의 여부 필터가 없는 경우: 두 조건을 OR로 결합
        const agreedDateFilter: any = { $ne: null };
        const nonAgreedDateFilter: any = {};
        
        if (startUtc) {
          agreedDateFilter.$gte = startUtc;
          nonAgreedDateFilter.$gte = startUtc;
        }
        if (endUtc) {
          agreedDateFilter.$lte = endUtc;
          nonAgreedDateFilter.$lte = endUtc;
        }
        
        searchQuery['$or'] = [
          { agreed: true, confirmedDate: agreedDateFilter },
          { agreed: false, date: nonAgreedDateFilter }
        ];
        
        // 기존 $or 조건이 있다면 $and로 결합
        if (query) {
          searchQuery = {
            $and: [
              {
                $or: [
                  { chartNumber: { $regex: query, $options: 'i' } },
                  { patientName: { $regex: query, $options: 'i' } }
                ]
              },
              {
                $or: [
                  { agreed: true, confirmedDate: agreedDateFilter },
                  { agreed: false, date: nonAgreedDateFilter }
                ]
              }
            ]
          };
        }
      }
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