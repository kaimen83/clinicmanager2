import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { createNewDate, createKstDateForMongoDB } from '@/lib/utils';

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
    const disagreementReason = searchParams.get('disagreementReason');
    
    const { db } = await connectToDatabase();
    
    // 검색 쿼리 구성
    let searchQuery: any = {};
    let dateConditions: any[] = [];
    
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
    
    // 미동의 사유 필터 추가
    if (disagreementReason) {
      searchQuery['disagreementReason'] = disagreementReason;
    }
    
    // 날짜 필터 추가 (동의한 상담은 confirmedDate, 미동의 상담은 date 기준)
    if (dateStart && dateEnd) {
      // 시작 날짜와 종료 날짜를 한국 시간 기준으로 UTC 변환
      const startDate = new Date(`${dateStart}T00:00:00+09:00`);
      const endDate = new Date(`${dateEnd}T23:59:59+09:00`);
      
      // agreed 파라미터에 따라 날짜 필터 적용
      if (agreed === 'true') {
        // 동의한 상담만: confirmedDate 기준
        searchQuery['confirmedDate'] = {
          $gte: startDate,
          $lte: endDate,
          $ne: null
        };
      } else if (agreed === 'false') {
        // 미동의한 상담만: date 기준
        searchQuery['date'] = {
          $gte: startDate,
          $lte: endDate
        };
      } else {
        // agreed 파라미터가 없으면 두 조건 모두 포함
        dateConditions = [
          // 미동의 상담: date 기준
          {
            agreed: false,
            date: {
              $gte: startDate,
              $lte: endDate
            }
          },
          // 동의한 상담: confirmedDate 기준
          {
            agreed: true,
            confirmedDate: {
              $gte: startDate,
              $lte: endDate,
              $ne: null
            }
          }
        ];
      }
    } else if (dateStart) {
      const startDate = new Date(`${dateStart}T00:00:00+09:00`);
      
      if (agreed === 'true') {
        searchQuery['confirmedDate'] = { $gte: startDate, $ne: null };
      } else if (agreed === 'false') {
        searchQuery['date'] = { $gte: startDate };
      } else {
        dateConditions = [
          { agreed: false, date: { $gte: startDate } },
          { agreed: true, confirmedDate: { $gte: startDate, $ne: null } }
        ];
      }
    } else if (dateEnd) {
      const endDate = new Date(`${dateEnd}T23:59:59+09:00`);
      
      if (agreed === 'true') {
        searchQuery['confirmedDate'] = { $lte: endDate, $ne: null };
      } else if (agreed === 'false') {
        searchQuery['date'] = { $lte: endDate };
      } else {
        dateConditions = [
          { agreed: false, date: { $lte: endDate } },
          { agreed: true, confirmedDate: { $lte: endDate, $ne: null } }
        ];
      }
    }
    
    // 날짜 조건과 기존 조건을 결합 (agreed 파라미터가 없을 때만)
    if (dateConditions.length > 0) {
      if (searchQuery['$or']) {
        // 기존 $or 조건이 있으면 $and로 결합
        searchQuery = {
          $and: [
            { $or: searchQuery['$or'] },
            { $or: dateConditions }
          ],
          ...Object.fromEntries(Object.entries(searchQuery).filter(([key]) => key !== '$or'))
        };
      } else {
        searchQuery['$or'] = dateConditions;
      }
    }

    // 상담 내역 목록 조회
    const consultations = await db
      .collection('consultations')
      .find(searchQuery)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // 전체 상담 내역 수 조회
    const total = await db.collection('consultations').countDocuments(searchQuery);
    
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

    // 동의 안함일 때 추가 검증
    if (!body.agreed) {
      if (!body.disagreementReason) {
        return NextResponse.json(
          { error: "동의 거부 이유는 필수입니다." },
          { status: 400 }
        );
      }
      // 동의 거부 이유가 "기타"일 경우에만 비고 필수
      if (body.disagreementReason === '기타' && (!body.notes || body.notes.trim() === '')) {
        return NextResponse.json(
          { error: "동의 거부 이유가 '기타'일 경우 상세 내용(비고)은 필수입니다." },
          { status: 400 }
        );
      }
    }

    const now = createNewDate();
    
    const consultationData = {
      date: createKstDateForMongoDB(body.date),
      chartNumber: body.chartNumber,
      patientName: body.patientName,
      doctor: body.doctor,
      staff: body.staff,
      amount: Number(body.amount),
      agreed: Boolean(body.agreed),
      disagreementReason: body.agreed ? null : (body.disagreementReason || null),
      confirmedDate: body.agreed && body.confirmedDate ? createKstDateForMongoDB(body.confirmedDate) : null,
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