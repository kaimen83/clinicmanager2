import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { createNewDate, toKstDate } from '@/lib/utils';

// GET 요청 처리 - 내원정보(트랜잭션) 목록 조회 (필터링, 페이지네이션 지원)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const dateStart = searchParams.get('dateStart') || '';
    const dateEnd = searchParams.get('dateEnd') || '';
    const doctor = searchParams.get('doctor') || '';
    
    const { db } = await connectToDatabase();
    
    // 검색 쿼리 구성
    let searchQuery: any = {};
    
    if (query) {
      searchQuery['$or'] = [
        { chartNumber: { $regex: query, $options: 'i' } },
        { patientName: { $regex: query, $options: 'i' } }
      ];
    }
    
    // 날짜 필터 추가 (날짜의 시작과 끝 시간 설정 - 한국 시간 기준)
    if (dateStart && dateEnd) {
      // 시작 날짜: 해당 날짜의 00:00:00 (한국 시간)
      const startParts = dateStart.split('-').map(Number);
      const startDateObj = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
      
      // 종료 날짜: 해당 날짜의 23:59:59.999 (한국 시간)
      const endParts = dateEnd.split('-').map(Number);
      const endDateObj = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);
      
      // 한국 시간과 UTC 간의 시차 (밀리초)
      const kstOffset = 9 * 60 * 60 * 1000;
      
      // UTC 기준으로 변환 (MongoDB는 UTC로 저장)
      const startUtc = new Date(startDateObj.getTime() - kstOffset);
      const endUtc = new Date(endDateObj.getTime() - kstOffset);
      
      searchQuery['date'] = {
        $gte: startUtc,
        $lte: endUtc
      };
    } else if (dateStart) {
      const startParts = dateStart.split('-').map(Number);
      const startDateObj = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
      const kstOffset = 9 * 60 * 60 * 1000;
      const startUtc = new Date(startDateObj.getTime() - kstOffset);
      
      searchQuery['date'] = { $gte: startUtc };
    } else if (dateEnd) {
      const endParts = dateEnd.split('-').map(Number);
      const endDateObj = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);
      const kstOffset = 9 * 60 * 60 * 1000;
      const endUtc = new Date(endDateObj.getTime() - kstOffset);
      
      searchQuery['date'] = { $lte: endUtc };
    }
    
    // 의사 필터 추가
    if (doctor) {
      searchQuery['doctor'] = doctor;
    }

    // 내원정보 목록 조회
    const transactions = await db
      .collection('transactions')
      .find(searchQuery)
      .sort({ date: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // 전체 내원정보 수 조회
    const total = await db.collection('transactions').countDocuments(searchQuery);

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('내원정보 목록 조회 중 에러:', error);
    return NextResponse.json(
      { error: "내원정보 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST 요청 처리 - 새 내원정보 등록
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { chartNumber, patientName, date, treatments } = data;

    // 필수 필드 검증
    if (!chartNumber || !patientName || !date) {
      return NextResponse.json(
        { error: "차트번호, 환자명, 날짜는 필수 입력 사항입니다." },
        { status: 400 }
      );
    }

    // 진료 정보가 없거나 빈 배열인 경우 검증
    if (!treatments || !Array.isArray(treatments) || treatments.length === 0) {
      return NextResponse.json(
        { error: "최소 하나 이상의 진료 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // 환자 존재 여부 확인
    const existingPatient = await db.collection('patients').findOne({ chartNumber });
    
    // 환자가 존재하지 않으면 환자 정보 생성
    if (!existingPatient) {
      const now = createNewDate();
      const newPatient = {
        chartNumber,
        name: patientName,
        visitPath: data.visitPath || '',
        createdAt: now,
        updatedAt: now,
        createdBy: data.createdBy ? new ObjectId(data.createdBy) : null
      };
      
      await db.collection('patients').insertOne(newPatient);
    }

    // 현재 시간 및 사용자 정보 추가
    const now = createNewDate();
    const newTransaction = {
      ...data,
      date: toKstDate(date),
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy ? new ObjectId(data.createdBy) : null,
      // 상담 내역이 있으면 각 상담에 대한 ID 및 시간 정보 추가
      consultations: data.consultations
        ? data.consultations.map((consultation: any) => ({
            ...consultation,
            _id: new ObjectId(),
            date: toKstDate(consultation.date),
            confirmedDate: consultation.confirmedDate ? toKstDate(consultation.confirmedDate) : null,
            createdAt: now,
            updatedAt: now
          }))
        : [],
      // 수납 내역 정보 추가
      payments: data.payments
        ? data.payments.map((payment: any) => ({
            ...payment,
            _id: new ObjectId(),
            date: toKstDate(payment.date)
          }))
        : []
    };

    // 내원정보 저장
    const result = await db.collection('transactions').insertOne(newTransaction);
    
    // 저장된 내원정보 조회
    const insertedTransaction = await db.collection('transactions').findOne({
      _id: result.insertedId
    });

    return NextResponse.json(insertedTransaction, { status: 201 });
  } catch (error) {
    console.error('내원정보 등록 중 에러:', error);
    return NextResponse.json(
      { error: "내원정보 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE 요청 처리 - 내원정보 삭제
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "삭제할 내원정보의 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // 내원정보 삭제
    const result = await db.collection('transactions').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "해당 내원정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "내원정보가 성공적으로 삭제되었습니다." });
  } catch (error) {
    console.error('내원정보 삭제 중 에러:', error);
    return NextResponse.json(
      { error: "내원정보 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 