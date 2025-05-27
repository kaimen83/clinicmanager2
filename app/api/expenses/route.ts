import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Expense from '@/lib/models/Expense';
import { currentUser } from '@clerk/nextjs/server';
import { toKstDate } from '@/lib/utils';
import { createCashExpenseRecord } from '@/lib/utils/cashManagement';

// 지출 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStart = searchParams.get('dateStart');
    const dateEnd = searchParams.get('dateEnd');
    const method = searchParams.get('method');
    const vendor = searchParams.get('vendor');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // 날짜 범위가 지정된 경우 (일별 조회) 페이징 비활성화
    const isDateRangeQuery = dateStart && dateEnd && dateStart === dateEnd;
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    await dbConnect();
    
    // 검색 쿼리 구성
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
    
    // 지불 방법 필터
    if (method) {
      searchQuery.method = method;
    }
    
    // 거래처 필터
    if (vendor) {
      searchQuery.vendor = { $regex: vendor, $options: 'i' };
    }
    
    // 총 데이터 수 계산
    const total = await Expense.countDocuments(searchQuery);
    
    let expenses;
    let pagination;
    
    if (isDateRangeQuery) {
      // 일별 조회인 경우 페이징 없이 모든 데이터 반환
      expenses = await Expense.find(searchQuery)
        .sort({ date: -1 });
      
      pagination = {
        total: expenses.length,
        page: 1,
        limit: expenses.length,
        pages: 1
      };
    } else {
      // 일반 조회인 경우 페이징 적용
      expenses = await Expense.find(searchQuery)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      
      pagination = {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      };
    }
    
    return NextResponse.json({
      success: true,
      data: expenses,
      pagination
    });
  } catch (error) {
    console.error('지출 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: '지출 목록을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 지출 등록
export async function POST(request: NextRequest) {
  try {
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const body = await request.json();
    
    // 날짜 데이터 처리
    if (body.date) {
      body.date = toKstDate(body.date);
    }
    
    const newExpense = new Expense({
      ...body,
      createdBy: userId
    });
    
    await newExpense.save();
    
    // 현금 지출인 경우 시재 기록 생성
    if (body.method === '현금') {
      try {
        await createCashExpenseRecord({
          _id: newExpense._id,
          amount: newExpense.amount,
          description: newExpense.description,
          date: newExpense.date
        });
      } catch (cashError) {
        console.error('시재 기록 생성 중 오류:', cashError);
        // 시재 기록 실패는 로그만 남기고 지출은 계속 진행
      }
    }
    
    return NextResponse.json({
      success: true,
      data: newExpense
    }, { status: 201 });
  } catch (error) {
    console.error('지출 등록 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: '지출을 등록하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 