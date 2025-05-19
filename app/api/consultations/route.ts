import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
    
    const { db } = await connectToDatabase();
    
    // 검색 쿼리 구성
    let searchQuery: any = {};
    const transactionSearchQuery: any = {};
    
    if (query) {
      searchQuery['$or'] = [
        { chartNumber: { $regex: query, $options: 'i' } },
        { patientName: { $regex: query, $options: 'i' } }
      ];
    }
    
    // 날짜 필터 추가
    if (dateStart && dateEnd) {
      searchQuery['date'] = {
        $gte: new Date(dateStart),
        $lte: new Date(dateEnd)
      };
    } else if (dateStart) {
      searchQuery['date'] = { $gte: new Date(dateStart) };
    } else if (dateEnd) {
      searchQuery['date'] = { $lte: new Date(dateEnd) };
    }
    
    // 동의 여부 필터 추가
    if (agreed) {
      searchQuery['agreed'] = agreed === 'true';
    }
    
    // 전체 상담 내역 목록 조회 (트랜잭션 컬렉션에서 상담 내역 추출)
    const transactions = await db
      .collection('transactions')
      .find(transactionSearchQuery)
      .toArray();
    
    // 모든 상담 내역을 추출하고 필터링
    let allConsultations: any[] = [];
    
    transactions.forEach(transaction => {
      if (transaction.consultations && transaction.consultations.length > 0) {
        // 각 상담 내역에 트랜잭션 정보 추가
        const consultationsWithTransactionInfo = transaction.consultations.map((consultation: any) => ({
          ...consultation,
          transactionId: transaction._id,
          transactionDate: transaction.date
        }));
        
        allConsultations = [...allConsultations, ...consultationsWithTransactionInfo];
      }
    });
    
    // 필터링 적용
    let filteredConsultations = allConsultations;
    
    if (Object.keys(searchQuery).length > 0) {
      // 검색 쿼리에 맞는 항목만 필터링
      filteredConsultations = allConsultations.filter(consultation => {
        let matches = true;
        
        // 차트번호/환자명 검색
        if (searchQuery['$or']) {
          const orCondition = searchQuery['$or'];
          matches = orCondition.some((condition: any) => {
            const key = Object.keys(condition)[0];
            const value = Object.values(condition)[0] as { $regex: string, $options: string };
            const regex = new RegExp(value.$regex, value.$options);
            return regex.test(consultation[key]);
          });
          
          if (!matches) return false;
        }
        
        // 날짜 필터
        if (searchQuery['date']) {
          const dateCondition = searchQuery['date'];
          
          if (dateCondition.$gte && dateCondition.$lte) {
            // 날짜 범위
            matches = new Date(consultation.date) >= new Date(dateCondition.$gte) && 
                     new Date(consultation.date) <= new Date(dateCondition.$lte);
          } else if (dateCondition.$gte) {
            // 시작 날짜만
            matches = new Date(consultation.date) >= new Date(dateCondition.$gte);
          } else if (dateCondition.$lte) {
            // 종료 날짜만
            matches = new Date(consultation.date) <= new Date(dateCondition.$lte);
          }
          
          if (!matches) return false;
        }
        
        // 동의 여부 필터
        if ('agreed' in searchQuery) {
          matches = consultation.agreed === searchQuery.agreed;
          if (!matches) return false;
        }
        
        return matches;
      });
    }
    
    // 페이지네이션을 위한 정렬 및 잘라내기
    const sortedConsultations = filteredConsultations.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const paginatedConsultations = sortedConsultations.slice(skip, skip + limit);
    
    return NextResponse.json({
      consultations: paginatedConsultations,
      pagination: {
        total: filteredConsultations.length,
        page,
        limit,
        totalPages: Math.ceil(filteredConsultations.length / limit)
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