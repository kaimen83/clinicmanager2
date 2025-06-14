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
    
    // 날짜 필터 추가 - 동의 여부에 따라 다른 날짜 필드 사용 (한국 시간 기준)
    let hasDateFilter = false;
    let targetDateStrings: string[] = [];
    
    if (dateStart || dateEnd) {
      hasDateFilter = true;
      
      // 날짜 범위 문자열 배열 생성
      if (dateStart && dateEnd) {
        const start = new Date(dateStart);
        const end = new Date(dateEnd);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          targetDateStrings.push(`${year}-${month}-${day}`);
        }
      } else if (dateStart) {
        targetDateStrings = [dateStart];
      } else if (dateEnd) {
        targetDateStrings = [dateEnd];
      }
    }
    
    // MongoDB aggregation을 사용하여 한국 시간 기준 날짜 필터링
    let pipeline: any[] = [];
    
    // 날짜 필드를 한국 시간으로 변환하여 추가
    if (hasDateFilter) {
      pipeline.push({
        $addFields: {
          confirmedDateKST: {
            $cond: {
              if: { $ne: ["$confirmedDate", null] },
              then: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: { $add: ["$confirmedDate", 9 * 60 * 60 * 1000] },
                  timezone: "UTC"
                }
              },
              else: null
            }
          },
          dateKST: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $add: ["$date", 9 * 60 * 60 * 1000] },
              timezone: "UTC"
            }
          }
        }
      });
    }
    
    // 필터 조건 구성
    let matchConditions: any = {};
    
    // 기본 검색 조건
    if (query) {
      matchConditions['$or'] = [
        { chartNumber: { $regex: query, $options: 'i' } },
        { patientName: { $regex: query, $options: 'i' } }
      ];
    }
    
    if (chartNumber) {
      matchConditions['chartNumber'] = chartNumber;
    }
    
    if (patientName) {
      matchConditions['patientName'] = patientName;
    }
    
    if (agreed) {
      matchConditions['agreed'] = agreed === 'true';
    }
    
    // 날짜 필터 조건 추가
    if (hasDateFilter) {
      if (agreed === 'true') {
        // 동의한 상담: confirmedDate 기준
        matchConditions['confirmedDate'] = { $ne: null };
        matchConditions['confirmedDateKST'] = { $in: targetDateStrings };
      } else if (agreed === 'false') {
        // 미동의한 상담: date 기준
        matchConditions['dateKST'] = { $in: targetDateStrings };
      } else {
        // 동의 여부 필터가 없는 경우: 두 조건을 OR로 결합
        const dateOrConditions = [
          { agreed: true, confirmedDate: { $ne: null }, confirmedDateKST: { $in: targetDateStrings } },
          { agreed: false, dateKST: { $in: targetDateStrings } }
        ];
        
        if (matchConditions['$or']) {
          // 기존 $or 조건이 있다면 $and로 결합
          matchConditions = {
            $and: [
              { $or: matchConditions['$or'] },
              { $or: dateOrConditions }
            ]
          };
          delete matchConditions['$or'];
        } else {
          matchConditions['$or'] = dateOrConditions;
        }
      }
    }
    
    pipeline.push({ $match: matchConditions });
    pipeline.push({ $sort: { date: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });
    
    // consultations 컬렉션에서 aggregation으로 조회
    const consultations = await db
      .collection('consultations')
      .aggregate(pipeline)
      .toArray();
    
    // 전체 개수 조회를 위한 별도 pipeline
    const countPipeline = pipeline.slice(0, -2); // sort, skip, limit 제외
    countPipeline.push({ $count: "total" });
    
    const countResult = await db
      .collection('consultations')
      .aggregate(countPipeline)
      .toArray();
    
    const total = countResult.length > 0 ? countResult[0].total : 0;
    
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