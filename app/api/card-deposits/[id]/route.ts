import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // MongoDB 연결
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db('hospital_accounting');
    
    // 업데이트할 데이터 준비
    const setData: any = {
      status: body.status,
      updatedAt: new Date()
    };

    const unsetData: any = {};

    // 각 필드별로 설정 또는 제거 처리
    if (body.actualDepositAmount !== undefined) {
      if (body.actualDepositAmount === null) {
        unsetData.actualDepositAmount = "";
      } else {
        setData.actualDepositAmount = body.actualDepositAmount;
      }
    }
    
    if (body.actualDepositDate !== undefined) {
      if (body.actualDepositDate === null) {
        unsetData.actualDepositDate = "";
      } else {
        setData.actualDepositDate = new Date(body.actualDepositDate);
      }
    }
    
    if (body.fee !== undefined) {
      if (body.fee === null) {
        unsetData.fee = "";
      } else {
        setData.fee = body.fee;
      }
    }
    
    if (body.holdReason !== undefined) {
      if (body.holdReason === null) {
        unsetData.holdReason = "";
      } else {
        setData.holdReason = body.holdReason;
      }
    }

    // MongoDB 업데이트 쿼리 구성
    const updateQuery: any = { $set: setData };
    if (Object.keys(unsetData).length > 0) {
      updateQuery.$unset = unsetData;
    }

    const result = await db.collection('carddeposits').updateOne(
      { _id: new ObjectId(id) },
      updateQuery
    );

    await client.close();

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: '해당 데이터를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('카드매출/입금 수정 실패:', error);
    return NextResponse.json({ error: '데이터 수정에 실패했습니다.' }, { status: 500 });
  }
} 