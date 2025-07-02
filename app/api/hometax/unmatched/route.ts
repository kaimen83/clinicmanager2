import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { MongoClient, ObjectId } from 'mongodb';
import { format } from 'date-fns';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined');
}

const client = new MongoClient(process.env.MONGODB_URI);

// 매칭되지 않은 홈택스 데이터 조회
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateStart = searchParams.get('dateStart');
    const dateEnd = searchParams.get('dateEnd');
    const status = searchParams.get('status') || 'unmatched';

    await client.connect();
    const db = client.db('hospital_accounting');
    
    // 기본 필터 (status와 날짜 필터를 모두 적용)
    const filter: any = { status };
    
    // 날짜 필터 추가 (날짜 파라미터가 없으면 기본적으로 최근 3개월로 제한)
    if (dateStart || dateEnd) {
      filter.거래일자 = {};
      if (dateStart) {
        filter.거래일자.$gte = dateStart;
      }
      if (dateEnd) {
        filter.거래일자.$lte = dateEnd;
      }
    } else {
      // 날짜 파라미터가 없으면 최근 3개월 데이터만 조회
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const startDate = threeMonthsAgo.toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      filter.거래일자 = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    console.log('📊 매칭되지 않은 데이터 조회 필터:', JSON.stringify(filter, null, 2));

    const unmatchedData = await db.collection('hometax_unmatched')
      .find(filter)
      .sort({ 거래일자: -1, verifiedAt: -1 })
      .toArray();

    // 날짜별로 그룹화
    const groupedByDate = unmatchedData.reduce((acc, item) => {
      const date = item.거래일자;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      data: groupedByDate,
      totalCount: unmatchedData.length
    });

  } catch (error) {
    console.error('매칭되지 않은 홈택스 데이터 조회 에러:', error);
    return NextResponse.json(
      { error: '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

// 매칭되지 않은 홈택스 데이터 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs are required' }, { status: 400 });
    }

    await client.connect();
    const db = client.db('hospital_accounting');
    
    // ObjectId로 변환
    const objectIds = ids.map((id: string) => new ObjectId(id));
    
    const result = await db.collection('hometax_unmatched').deleteMany({
      _id: { $in: objectIds }
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('매칭되지 않은 홈택스 데이터 삭제 에러:', error);
    return NextResponse.json(
      { error: '데이터 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

// 매칭되지 않은 홈택스 데이터 상태 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids, status } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0 || !status) {
      return NextResponse.json({ error: 'IDs and status are required' }, { status: 400 });
    }

    await client.connect();
    const db = client.db('hospital_accounting');
    
    // ObjectId로 변환
    const objectIds = ids.map((id: string) => new ObjectId(id));
    
    const result = await db.collection('hometax_unmatched').updateMany(
      { _id: { $in: objectIds } },
      { 
        $set: { 
          status,
          updatedAt: new Date(),
          updatedBy: userId
        }
      }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('매칭되지 않은 홈택스 데이터 상태 업데이트 에러:', error);
    return NextResponse.json(
      { error: '상태 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
} 