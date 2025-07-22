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
    
    // 현재 문서 조회 (수수료 계산을 위해)
    const currentDoc = await db.collection('carddeposits').findOne({ _id: new ObjectId(id) });
    
    if (!currentDoc) {
      await client.close();
      return NextResponse.json({ error: '해당 데이터를 찾을 수 없습니다.' }, { status: 404 });
    }

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
        unsetData.fee = ""; // 입금액이 null이면 수수료도 null
      } else {
        setData.actualDepositAmount = body.actualDepositAmount;
        
        // 수수료 자동 계산 (음수 매출 처리 포함)
        const saleAmount = currentDoc.saleAmount || 0;
        if (saleAmount < 0) {
          setData.fee = 0; // 음수 매출인 경우 수수료 0
        } else {
          setData.fee = saleAmount - body.actualDepositAmount;
        }
      }
    }
    
    if (body.actualDepositDate !== undefined) {
      if (body.actualDepositDate === null) {
        unsetData.actualDepositDate = "";
      } else {
        setData.actualDepositDate = new Date(body.actualDepositDate);
      }
    }
    
    // fee는 자동 계산되므로 직접 설정하지 않음 (위에서 actualDepositAmount와 함께 처리됨)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // MongoDB 연결
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db('hospital_accounting');
    
    // 삭제할 카드매출 정보 조회
    const cardDeposit = await db.collection('carddeposits').findOne({ _id: new ObjectId(id) });
    
    if (!cardDeposit) {
      await client.close();
      return NextResponse.json({ error: '해당 데이터를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 카드매출 삭제
    const result = await db.collection('carddeposits').deleteOne({ _id: new ObjectId(id) });
    
    await client.close();

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '카드매출/입금 정보가 삭제되었습니다.',
      deletedId: id
    });

  } catch (error) {
    console.error('카드매출/입금 삭제 실패:', error);
    return NextResponse.json({ 
      error: '삭제에 실패했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 