import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongoose';
import DailySettlementCheck from '@/lib/models/DailySettlementCheck';
import { toKstDate } from '@/lib/utils';

// GET 요청 - 특정 날짜의 일일결산 체크 상태 조회
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!date) {
      return NextResponse.json(
        { error: "날짜 파라미터가 필요합니다. (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    await dbConnect();

    // 날짜 범위 계산 (해당 날짜 00:00:00 ~ 23:59:59)
    const selectedDate = toKstDate(date);
    const startDate = new Date(selectedDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(selectedDate);
    endDate.setHours(23, 59, 59, 999);

    // 해당 날짜의 체크 상태 조회
    let settlementCheck = await DailySettlementCheck.findOne({
      date: { $gte: startDate, $lte: endDate }
    });

    // 없으면 기본값으로 생성
    if (!settlementCheck) {
      settlementCheck = new DailySettlementCheck({
        date: startDate,
        income: { checked: false },
        expenses: { checked: false },
        cashRecords: { checked: false },
        implant: { checked: false },
        dentalProducts: { checked: false },
        consultations: { checked: false },
        cashReceipts: { checked: false },
        isCompleted: false
      });
      await settlementCheck.save();
    }

    return NextResponse.json(settlementCheck);
  } catch (error) {
    console.error('일일결산 체크 상태 조회 중 에러:', error);
    return NextResponse.json(
      { error: "일일결산 체크 상태 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST 요청 - 특정 영역의 체크 상태 업데이트
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { date, section, checked, checkedBy } = body;

    if (!date || !section || typeof checked !== 'boolean') {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다. (date, section, checked)" },
        { status: 400 }
      );
    }

    // 유효한 섹션인지 확인
    const validSections = ['income', 'expenses', 'cashRecords', 'implant', 'dentalProducts', 'consultations', 'cashReceipts'];
    if (!validSections.includes(section)) {
      return NextResponse.json(
        { error: "유효하지 않은 섹션입니다." },
        { status: 400 }
      );
    }

    await dbConnect();

    // 날짜 범위 계산
    const selectedDate = toKstDate(date);
    const startDate = new Date(selectedDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(selectedDate);
    endDate.setHours(23, 59, 59, 999);

    // 해당 날짜의 체크 상태 조회 또는 생성
    let settlementCheck = await DailySettlementCheck.findOne({
      date: { $gte: startDate, $lte: endDate }
    });

    if (!settlementCheck) {
      settlementCheck = new DailySettlementCheck({
        date: startDate,
        income: { checked: false },
        expenses: { checked: false },
        cashRecords: { checked: false },
        implant: { checked: false },
        dentalProducts: { checked: false },
        consultations: { checked: false },
        cashReceipts: { checked: false },
        isCompleted: false
      });
    }

    // 특정 섹션의 체크 상태 업데이트
    const updateData: any = {};
    updateData[`${section}.checked`] = checked;
    updateData[`${section}.checkedBy`] = checked ? checkedBy || userId : null;
    updateData[`${section}.checkedAt`] = checked ? new Date() : null;

    // 모든 섹션이 체크되었는지 확인
    const allSections = ['income', 'expenses', 'cashRecords', 'implant', 'dentalProducts', 'consultations', 'cashReceipts'];
    let allChecked = true;
    
    for (const sec of allSections) {
      if (sec === section) {
        if (!checked) {
          allChecked = false;
          break;
        }
      } else {
        if (!settlementCheck[sec]?.checked) {
          allChecked = false;
          break;
        }
      }
    }

    // 전체 완료 상태 업데이트
    updateData.isCompleted = allChecked;
    if (allChecked) {
      updateData.completedBy = checkedBy || userId;
      updateData.completedAt = new Date();
    } else {
      updateData.completedBy = null;
      updateData.completedAt = null;
    }

    // 업데이트 실행
    const updatedCheck = await DailySettlementCheck.findOneAndUpdate(
      { date: { $gte: startDate, $lte: endDate } },
      { $set: updateData },
      { upsert: true, new: true }
    );

    return NextResponse.json(updatedCheck);
  } catch (error) {
    console.error('일일결산 체크 상태 업데이트 중 에러:', error);
    return NextResponse.json(
      { error: "일일결산 체크 상태 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}