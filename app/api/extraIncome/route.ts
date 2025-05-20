import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { currentUser } from '@clerk/nextjs/server';
import { ObjectId } from 'mongodb';
import { toKstDate, createNewDate } from '@/lib/utils';

// 진료외수입 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStart = searchParams.get('dateStart');
    const dateEnd = searchParams.get('dateEnd');
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const { db } = await connectToDatabase();
    
    // 검색 쿼리 생성
    const searchQuery: any = {};
    
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
    
    const extraincomes = await db.collection('extraincomes')
      .find(searchQuery)
      .sort({ date: -1 })
      .toArray();
    
    return NextResponse.json(extraincomes);
  } catch (error) {
    console.error('진료외수입 조회 오류:', error);
    return NextResponse.json({ error: '진료외수입을 조회하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 진료외수입 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, type, amount, notes } = body;
    
    if (!date || !type || !amount) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const { db } = await connectToDatabase();
    
    // 한국 시간대로 변환된 날짜
    const kstDate = toKstDate(date);
    
    const extraIncome = {
      date: kstDate,
      type,
      amount: Number(amount),
      notes,
      createdBy: userId,
      createdAt: createNewDate(),
      updatedAt: createNewDate()
    };
    
    const result = await db.collection('extraincomes').insertOne(extraIncome);
    
    // 활동 로그 추가
    await db.collection('activityLogs').insertOne({
      userId,
      action: 'create',
      targetCollection: 'extraIncome',
      targetId: result.insertedId,
      description: '진료외수입 추가',
      details: [
        `수입 유형: ${type}`,
        `금액: ${Number(amount).toLocaleString()}원`,
        `날짜: ${kstDate.toISOString().split('T')[0]}`, 
        `메모: ${notes || '없음'}`
      ],
      createdAt: createNewDate()
    });
    
    return NextResponse.json({ 
      message: '진료외수입이 추가되었습니다.',
      extraIncome: {
        _id: result.insertedId,
        ...extraIncome
      }
    }, { status: 201 });
  } catch (error) {
    console.error('진료외수입 추가 오류:', error);
    return NextResponse.json({ error: '진료외수입을 추가하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 진료외수입 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, date, type, amount, notes } = body;
    
    if (!id || !date || !type || !amount) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const { db } = await connectToDatabase();
    
    // 기존 데이터 조회 (로그 기록용)
    const existingItem = await db.collection('extraincomes').findOne({ _id: new ObjectId(id) });
    
    if (!existingItem) {
      return NextResponse.json({ error: '해당 진료외수입 내역을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 한국 시간대로 변환된 날짜
    const kstDate = toKstDate(date);
    
    // 수정할 데이터
    const updateData = {
      date: kstDate,
      type,
      amount: Number(amount),
      notes,
      updatedAt: createNewDate()
    };
    
    // 데이터 업데이트
    const result = await db.collection('extraincomes').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: '해당 진료외수입 내역을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 활동 로그 추가
    await db.collection('activityLogs').insertOne({
      userId,
      action: 'update',
      targetCollection: 'extraIncome',
      targetId: new ObjectId(id),
      description: '진료외수입 수정',
      details: [
        `수입 유형: ${existingItem.type} → ${type}`,
        `금액: ${existingItem.amount.toLocaleString()}원 → ${Number(amount).toLocaleString()}원`,
        `날짜: ${new Date(existingItem.date).toISOString().split('T')[0]} → ${kstDate.toISOString().split('T')[0]}`,
        `메모: ${existingItem.notes || '없음'} → ${notes || '없음'}`
      ],
      createdAt: createNewDate()
    });
    
    return NextResponse.json({ 
      message: '진료외수입 내역이 수정되었습니다.',
      extraIncome: {
        _id: id,
        ...updateData,
        createdBy: existingItem.createdBy,
        createdAt: existingItem.createdAt
      }
    });
  } catch (error) {
    console.error('진료외수입 수정 오류:', error);
    return NextResponse.json({ error: '진료외수입을 수정하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 진료외수입 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '진료외수입 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    const { db } = await connectToDatabase();
    
    // 삭제할 진료외수입 찾기 (로그 기록용)
    const extraIncome = await db.collection('extraincomes').findOne({ _id: new ObjectId(id) });
    
    if (!extraIncome) {
      return NextResponse.json({ error: '해당 진료외수입 내역을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 진료외수입 삭제
    const result = await db.collection('extraincomes').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: '진료외수입 내역을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 활동 로그 추가
    await db.collection('activityLogs').insertOne({
      userId,
      action: 'delete',
      targetCollection: 'extraIncome',
      targetId: new ObjectId(id),
      description: '진료외수입 삭제',
      details: [
        `수입 유형: ${extraIncome.type}`,
        `금액: ${extraIncome.amount.toLocaleString()}원`,
        `날짜: ${new Date(extraIncome.date).toISOString().split('T')[0]}`,
        `메모: ${extraIncome.notes || '없음'}`
      ],
      createdAt: createNewDate()
    });
    
    return NextResponse.json({ message: '진료외수입 내역이 삭제되었습니다.' });
  } catch (error) {
    console.error('진료외수입 삭제 오류:', error);
    return NextResponse.json({ error: '진료외수입을 삭제하는 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 