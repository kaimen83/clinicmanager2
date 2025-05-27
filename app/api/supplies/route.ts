import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { Supply, SupplyType } from '@/lib/models/Supply';
import dbConnect from '@/lib/mongoose';

// 매입 내역 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const dateStart = searchParams.get('dateStart');
    const dateEnd = searchParams.get('dateEnd');
    const vendor = searchParams.get('vendor');
    const isPaid = searchParams.get('isPaid');
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // MongoDB에 연결
    await dbConnect();
    
    // 특정 ID 조회
    if (id) {
      try {
        const supply = await Supply.findById(id);
        if (!supply) {
          return NextResponse.json({ error: '매입 내역을 찾을 수 없습니다.' }, { status: 404 });
        }
        return NextResponse.json(supply);
      } catch (error) {
        return NextResponse.json({ error: '잘못된 ID 형식입니다.' }, { status: 400 });
      }
    }
    
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
    
    // 거래처 필터
    if (vendor) {
      searchQuery['vendor'] = { $regex: vendor, $options: 'i' };
    }
    
    // 결제 상태 필터
    if (isPaid !== null && isPaid !== undefined) {
      searchQuery['isPaid'] = isPaid === 'true';
    }
    
    // 매입 내역 조회 (최신순 정렬)
    const supplies = await Supply.find(searchQuery).sort({ date: -1, createdAt: -1 });
    
    return NextResponse.json(supplies);
  } catch (error) {
    console.error('매입 내역 조회 오류:', error);
    return NextResponse.json({ error: '매입 내역 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 새 매입 내역 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, vendor, amount, note, isPaid } = body;
    
    if (!date || !vendor || amount === undefined || amount === null) {
      return NextResponse.json({ 
        error: '날짜, 거래처, 금액은 필수 입력사항입니다.' 
      }, { status: 400 });
    }
    
    if (amount < 0) {
      return NextResponse.json({ 
        error: '매입 금액은 0 이상이어야 합니다.' 
      }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // MongoDB에 연결
    await dbConnect();
    
    // 날짜 처리 - 한국 시간대 고려
    const dateParts = date.split('-').map(Number);
    const kstDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    
    // 한국 시간과 UTC 간의 시차 조정 (9시간)
    const kstOffset = 9 * 60 * 60 * 1000;
    const utcDate = new Date(kstDate.getTime() - kstOffset);
    
    // 신규 매입 내역 생성
    const newSupply = new Supply({
      date: utcDate,
      vendor: vendor.trim(),
      amount: Number(amount),
      note: note?.trim() || '',
      isPaid: Boolean(isPaid),
      createdBy: userId
    });
    
    const savedSupply = await newSupply.save();
    
    return NextResponse.json({ 
      message: '매입 내역이 등록되었습니다.',
      supply: savedSupply
    }, { status: 201 });
  } catch (error: any) {
    console.error('매입 내역 생성 오류:', error);
    // 유효성 검사 에러 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: '매입 내역 등록 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 매입 내역 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, date, vendor, amount, note, isPaid } = body;
    
    if (!id) {
      return NextResponse.json({ error: '매입 내역 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // MongoDB에 연결
    await dbConnect();
    
    // 해당 매입 내역 존재 확인
    const supply = await Supply.findById(id);
    if (!supply) {
      return NextResponse.json({ error: '매입 내역을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 필드 업데이트
    if (date) {
      const dateParts = date.split('-').map(Number);
      const kstDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      const kstOffset = 9 * 60 * 60 * 1000;
      const utcDate = new Date(kstDate.getTime() - kstOffset);
      supply.date = utcDate;
    }
    
    if (vendor) {
      supply.vendor = vendor.trim();
    }
    
    if (amount !== undefined && amount !== null) {
      if (amount < 0) {
        return NextResponse.json({ 
          error: '매입 금액은 0 이상이어야 합니다.' 
        }, { status: 400 });
      }
      supply.amount = Number(amount);
    }
    
    if (note !== undefined) {
      supply.note = note?.trim() || '';
    }
    
    if (isPaid !== undefined) {
      supply.isPaid = Boolean(isPaid);
    }
    
    // 저장
    const updatedSupply = await supply.save();
    
    return NextResponse.json({ 
      message: '매입 내역이 수정되었습니다.',
      supply: updatedSupply
    });
  } catch (error: any) {
    console.error('매입 내역 수정 오류:', error);
    // 유효성 검사 에러 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: '매입 내역 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 매입 내역 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '매입 내역 ID가 필요합니다.' }, { status: 400 });
    }
    
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    // MongoDB에 연결
    await dbConnect();
    
    // 해당 매입 내역 존재 확인 및 삭제
    const supply = await Supply.findById(id);
    if (!supply) {
      return NextResponse.json({ error: '매입 내역을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    await Supply.findByIdAndDelete(id);
    
    return NextResponse.json({ 
      message: '매입 내역이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('매입 내역 삭제 오류:', error);
    return NextResponse.json({ error: '매입 내역 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 