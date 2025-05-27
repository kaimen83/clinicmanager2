import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import CashRecord from '@/lib/models/CashRecord';
import { currentUser } from '@clerk/nextjs/server';

// 개별 현금 기록 삭제 (통장입금만 허용)
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
    
    // 통장입금만 삭제 허용
    if (record.type !== '통장입금') {
      return NextResponse.json({ 
        error: '수입과 지출은 내원정보와 지출내역에서 관리됩니다. 통장입금만 삭제할 수 있습니다.' 
      }, { status: 400 });
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

// 개별 현금 기록 수정 (통장입금만 허용)
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
    
    // 통장입금만 수정 허용
    if (record.type !== '통장입금') {
      return NextResponse.json({ 
        error: '수입과 지출은 내원정보와 지출내역에서 관리됩니다. 통장입금만 수정할 수 있습니다.' 
      }, { status: 400 });
    }
    
    // 타입 변경 불허 (통장입금 → 다른 타입)
    if (type && type !== '통장입금') {
      return NextResponse.json({ 
        error: '통장입금 기록의 타입은 변경할 수 없습니다.' 
      }, { status: 400 });
    }
    
    // 기록 수정
    const updatedRecord = await CashRecord.findByIdAndUpdate(
      id,
      {
        amount: Number(amount),
        description: description || '통장입금'
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