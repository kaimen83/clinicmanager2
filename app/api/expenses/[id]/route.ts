import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Expense from '@/lib/models/Expense';
import { currentUser } from '@clerk/nextjs/server';
import { toKstDate } from '@/lib/utils';
import { updateCashExpenseRecord, deleteCashExpenseRecord } from '@/lib/utils/cashManagement';

// 특정 ID 지출 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // MongoDB에 연결
    await dbConnect();
    
    try {
      const expense = await Expense.findById(id);
      if (!expense) {
        return NextResponse.json({ error: '지출 내역을 찾을 수 없습니다.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: expense });
    } catch (error) {
      return NextResponse.json({ error: '잘못된 ID 형식입니다.' }, { status: 400 });
    }
  } catch (error) {
    console.error('지출 내역 조회 오류:', error);
    return NextResponse.json({ error: '지출 내역 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 지출 내역 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // MongoDB에 연결
    await dbConnect();
    
    // 해당 지출 내역 존재 확인
    const oldExpense = await Expense.findById(id);
    if (!oldExpense) {
      return NextResponse.json({ error: '지출 내역을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 기존 데이터 백업 (시재 기록 업데이트용)
    const oldExpenseData = {
      method: oldExpense.method,
      amount: oldExpense.amount,
      description: oldExpense.description,
      date: oldExpense.date
    };
    
    // 날짜 데이터 처리
    if (body.date) {
      body.date = toKstDate(body.date);
    }
    
    // 필드 업데이트
    Object.keys(body).forEach(key => {
      if (key !== '_id' && key !== 'createdBy' && key !== 'createdAt') {
        oldExpense[key] = body[key];
      }
    });
    
    // 저장
    const updatedExpense = await oldExpense.save();
    
    // 현금 지출 변경사항이 있는 경우 시재 기록 업데이트
    try {
      await updateCashExpenseRecord(oldExpenseData, updatedExpense, id);
    } catch (cashError) {
      console.error('시재 기록 업데이트 중 오류:', cashError);
      // 시재 기록 실패는 로그만 남기고 지출은 계속 진행
    }
    
    return NextResponse.json({
      success: true,
      message: '지출 내역이 업데이트되었습니다.',
      data: updatedExpense
    });
  } catch (error: any) {
    console.error('지출 내역 업데이트 오류:', error);
    
    // 유효성 검사 에러 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    
    return NextResponse.json({ error: '지출 내역 업데이트 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 지출 내역 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // MongoDB에 연결
    await dbConnect();
    
    // 해당 지출 내역 존재 확인
    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ error: '지출 내역을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 현금 지출인 경우 시재 기록 삭제
    try {
      await deleteCashExpenseRecord(id, expense.method);
    } catch (cashError) {
      console.error('시재 기록 삭제 중 오류:', cashError);
      // 시재 기록 삭제 실패 시 지출 삭제도 중단
      const errorMessage = cashError instanceof Error ? cashError.message : "시재 기록 삭제 중 오류가 발생했습니다.";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
    
    // 삭제 처리
    await Expense.findByIdAndDelete(id);
    
    return NextResponse.json({ 
      success: true,
      message: '지출 내역이 삭제되었습니다.' 
    });
  } catch (error) {
    console.error('지출 내역 삭제 오류:', error);
    return NextResponse.json({ error: '지출 내역 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 