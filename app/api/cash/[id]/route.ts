import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import CashRecord from '@/lib/models/CashRecord';
import { currentUser } from '@clerk/nextjs/server';

// 개별 현금 기록 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { id } = params;
    
    // 기록 조회
    const record = await CashRecord.findById(id);
    if (!record) {
      return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 마감된 기록인지 확인
    if (record.isClosed) {
      return NextResponse.json({ error: '마감된 기록은 삭제할 수 없습니다.' }, { status: 400 });
    }
    
    // 해당 날짜가 마감되었는지 확인
    const isClosed = await CashRecord.isClosedForDate(record.date);
    if (isClosed) {
      return NextResponse.json({ error: '마감된 날짜의 기록은 삭제할 수 없습니다.' }, { status: 400 });
    }
    
    // 기록 삭제
    await CashRecord.findByIdAndDelete(id);
    
    return NextResponse.json({
      message: '기록이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('현금 기록 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: '기록 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 개별 현금 기록 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const { type, amount, description } = body;
    
    // 기록 조회
    const record = await CashRecord.findById(id);
    if (!record) {
      return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 마감된 기록인지 확인
    if (record.isClosed) {
      return NextResponse.json({ error: '마감된 기록은 수정할 수 없습니다.' }, { status: 400 });
    }
    
    // 해당 날짜가 마감되었는지 확인
    const isClosed = await CashRecord.isClosedForDate(record.date);
    if (isClosed) {
      return NextResponse.json({ error: '마감된 날짜의 기록은 수정할 수 없습니다.' }, { status: 400 });
    }
    
    // 기록 수정
    const updatedRecord = await CashRecord.findByIdAndUpdate(
      id,
      {
        type,
        amount: Number(amount),
        description
      },
      { new: true }
    );
    
    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error('현금 기록 수정 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: '기록 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}