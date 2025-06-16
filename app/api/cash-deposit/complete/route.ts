import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import CashRecord from '@/lib/models/CashRecord';
import { currentUser } from '@clerk/nextjs/server';
import mongoose from 'mongoose';

// 선택된 계좌입금 항목들을 완료 처리
export async function POST(request: NextRequest) {
  console.log('=== 입금완료 처리 API 호출됨 ===');
  try {
    // 현재 인증된 사용자 가져오기
    const user = await currentUser();
    const userId = user?.id;
    console.log('사용자 ID:', userId);
    
    if (!userId) {
      console.log('인증되지 않은 요청');
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }
    
    await dbConnect();
    console.log('MongoDB 연결 완료');
    
    const body = await request.json();
    const { recordIds, groupIds } = body;
    
    console.log('입금완료 처리 요청:', { recordIds, groupIds });
    console.log('recordIds 타입:', typeof recordIds, 'length:', recordIds?.length);
    console.log('groupIds 타입:', typeof groupIds, 'length:', groupIds?.length);
    
    const updateData = {
      isCompleted: true,
      completedAt: new Date()
    };
    
    let updatedRecordsCount = 0;
    let updatedGroupsCount = 0;
    
    // 개별 레코드들 완료 처리
    if (recordIds && recordIds.length > 0) {
      console.log('개별 레코드 처리 시작:', recordIds);
      // ObjectId 변환
      const objectIds = recordIds.map((id: string) => {
        console.log('ID 변환:', id, '->', new mongoose.Types.ObjectId(id));
        return new mongoose.Types.ObjectId(id);
      });
      
      console.log('변환된 ObjectIds:', objectIds);
      
      const result = await CashRecord.updateMany(
        { 
          _id: { $in: objectIds },
          type: '통장입금'
        },
        updateData
      );
      updatedRecordsCount = result.modifiedCount;
      console.log('개별 레코드 업데이트 결과:', result);
      console.log('업데이트된 개별 레코드 수:', updatedRecordsCount);
    }
    
    // 그룹 레코드들 완료 처리 (현재는 개별 레코드만 처리)
    if (groupIds && groupIds.length > 0) {
      console.log('그룹 레코드 처리 시작:', groupIds);
      // ObjectId 변환
      const objectIds = groupIds.map((id: string) => {
        console.log('그룹 ID 변환:', id, '->', new mongoose.Types.ObjectId(id));
        return new mongoose.Types.ObjectId(id);
      });
      
      const result = await CashRecord.updateMany(
        { 
          _id: { $in: objectIds },
          type: '통장입금'
        },
        updateData
      );
      updatedGroupsCount = result.modifiedCount;
      console.log('그룹 레코드 업데이트 결과:', result);
      console.log('업데이트된 그룹 레코드 수:', updatedGroupsCount);
    }
    
    const responseData = {
      message: '입금완료 처리되었습니다.',
      updatedRecords: updatedRecordsCount,
      updatedGroups: updatedGroupsCount,
      requestedRecords: recordIds?.length || 0,
      requestedGroups: groupIds?.length || 0
    };
    
    console.log('응답 데이터:', responseData);
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('입금완료 처리 중 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: '입금완료 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 