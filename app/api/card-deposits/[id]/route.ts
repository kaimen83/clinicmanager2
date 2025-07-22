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

    // 입금완료 상태로 변경 시 필수 검증
    if (body.status === '입금완료') {
      if (body.actualDepositAmount === undefined || body.actualDepositAmount === null) {
        await client.close();
        return NextResponse.json({ error: '입금액은 필수입니다.' }, { status: 400 });
      }
      if (body.actualDepositDate === undefined || body.actualDepositDate === null) {
        await client.close();
        return NextResponse.json({ error: '입금일자는 필수입니다.' }, { status: 400 });
      }
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

    // 이전 상태 저장
    const previousStatus = currentDoc.status;
    const previousDepositDate = currentDoc.actualDepositDate;
    const previousDepositAmount = currentDoc.actualDepositAmount;

    const result = await db.collection('carddeposits').updateOne(
      { _id: new ObjectId(id) },
      updateQuery
    );

    if (result.matchedCount === 0) {
      await client.close();
      return NextResponse.json({ error: '해당 데이터를 찾을 수 없습니다.' }, { status: 404 });
    }

    // DailyActualCardDeposit 처리
    try {
      // 이전 상태가 입금완료였고, 새로운 상태가 다른 경우 (입금완료 -> 미입금/입금보류)
      if (previousStatus === '입금완료' && body.status && body.status !== '입금완료') {
        if (previousDepositDate) {
          const depositDateStart = new Date(previousDepositDate);
          depositDateStart.setHours(0, 0, 0, 0);
          const depositDateEnd = new Date(previousDepositDate);
          depositDateEnd.setHours(23, 59, 59, 999);

          const previousDailyDeposit = await db.collection('dailyactualcarddeposits').findOne({
            depositDate: {
              $gte: depositDateStart,
              $lte: depositDateEnd
            }
          });

          if (previousDailyDeposit) {
            // deposits 배열에서 해당 cardDepositId 제거
            const updatedDeposits = previousDailyDeposit.deposits.filter(
              (deposit: any) => deposit.cardDepositId.toString() !== id
            );

            // totalAmount 재계산
            const newTotalAmount = updatedDeposits.reduce(
              (sum: number, deposit: any) => sum + deposit.amount, 
              0
            );

            if (updatedDeposits.length === 0) {
              await db.collection('dailyactualcarddeposits').deleteOne({ _id: previousDailyDeposit._id });
            } else {
              await db.collection('dailyactualcarddeposits').updateOne(
                { _id: previousDailyDeposit._id },
                {
                  $set: {
                    deposits: updatedDeposits,
                    totalAmount: newTotalAmount
                  }
                }
              );
            }
          }
        }
      }
      // 새로운 상태가 입금완료인 경우 (미입금/입금보류 -> 입금완료)
      else if (body.status === '입금완료' && body.actualDepositDate && body.actualDepositAmount) {
        const depositDate = new Date(body.actualDepositDate);
        const depositDateStart = new Date(depositDate);
        depositDateStart.setHours(0, 0, 0, 0);
        const depositDateEnd = new Date(depositDate);
        depositDateEnd.setHours(23, 59, 59, 999);

        let dailyDeposit = await db.collection('dailyactualcarddeposits').findOne({
          depositDate: {
            $gte: depositDateStart,
            $lte: depositDateEnd
          }
        });

        if (!dailyDeposit) {
          dailyDeposit = {
            depositDate: depositDateStart,
            totalAmount: 0,
            deposits: []
          };
          const insertResult = await db.collection('dailyactualcarddeposits').insertOne(dailyDeposit);
          dailyDeposit._id = insertResult.insertedId;
        }

        // 이미 존재하는 deposit 제거 (중복 방지)
        const filteredDeposits = dailyDeposit.deposits.filter(
          (deposit: any) => deposit.cardDepositId.toString() !== id
        );

        // 새로운 deposit 추가
        filteredDeposits.push({
          cardDepositId: new ObjectId(id),
          amount: body.actualDepositAmount,
          cardCompany: currentDoc.cardCompany
        });

        // totalAmount 재계산
        const newTotalAmount = filteredDeposits.reduce(
          (sum: number, deposit: any) => sum + deposit.amount,
          0
        );

        await db.collection('dailyactualcarddeposits').updateOne(
          { _id: dailyDeposit._id },
          {
            $set: {
              deposits: filteredDeposits,
              totalAmount: newTotalAmount
            }
          }
        );
      }
    } catch (dailyDepositError) {
      console.error('DailyActualCardDeposit 처리 중 오류:', dailyDepositError);
      // 에러 로그만 남기고 계속 진행
    }

    await client.close();
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