import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

/**
 * 카드 입금처리 수정 API
 * 기존 입금처리 정보를 수정하고 관련 데이터를 업데이트
 */
export async function PUT(request: NextRequest) {
  try {
    // 인증 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const requestData = await request.json();
    const {
      cardCompany,
      saleDate,
      totalAmount,
      actualDepositDate,
      actualDepositAmount,
      fee,
      feeRate
    } = requestData;

    // 필수 필드 검증
    if (!cardCompany || !saleDate || !totalAmount || !actualDepositDate || !actualDepositAmount) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 금액 검증
    if (actualDepositAmount <= 0) {
      return NextResponse.json(
        { error: '입금액은 0보다 커야 합니다.' },
        { status: 400 }
      );
    }

    // 수수료 계산 검증
    const calculatedFee = totalAmount - actualDepositAmount;
    if (Math.abs(calculatedFee - fee) > 0.01) {
      return NextResponse.json(
        { error: '수수료 계산이 맞지 않습니다.' },
        { status: 400 }
      );
    }

    const { client, db } = await connectToDatabase();

    // 트랜잭션 시작
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 해당 날짜/카드사의 거래 내역 조회
        const salesDateObj = new Date(saleDate);
        const transactions = await db.collection('transactions')
          .find({
            date: salesDateObj,
            cardCompany: cardCompany,
            paymentMethod: "카드"
          })
          .toArray();

        if (transactions.length === 0) {
          throw new Error('해당하는 거래 내역을 찾을 수 없습니다.');
        }

        // 총 매출액 검증
        const totalSalesAmount = transactions.reduce(
          (sum: number, tx: any) => sum + tx.paymentAmount, 
          0
        );
        
        if (Math.abs(totalSalesAmount - totalAmount) > 0.01) {
          throw new Error('매출액이 일치하지 않습니다.');
        }

        // 기존 입금처리 내역 조회
        const existingDeposit = await db.collection('carddeposits')
          .findOne({
            cardCompany,
            saleDate: salesDateObj
          });

        if (!existingDeposit) {
          throw new Error('수정할 입금처리 내역을 찾을 수 없습니다.');
        }

        // carddeposits 컬렉션 업데이트
        await db.collection('carddeposits')
          .updateOne(
            {
              cardCompany,
              saleDate: salesDateObj
            },
            {
              $set: {
                actualDepositAmount,
                fee,
                feeRate,
                actualDepositDate: new Date(actualDepositDate),
                updatedBy: userId,
                updatedAt: new Date(),
                // 수정 이력 추가
                lastModified: {
                  by: userId,
                  at: new Date(),
                  previousValues: {
                    actualDepositAmount: existingDeposit.actualDepositAmount,
                    fee: existingDeposit.fee,
                    feeRate: existingDeposit.feeRate,
                    actualDepositDate: existingDeposit.actualDepositDate
                  }
                }
              }
            }
          );

        // 관련 transactions 상태 업데이트
        await db.collection('transactions')
          .updateMany(
            { _id: { $in: transactions.map((tx: any) => tx._id) } },
            {
              $set: {
                actualDepositDate: new Date(actualDepositDate),
                actualDepositAmount,
                fee,
                feeRate,
                updatedAt: new Date()
              }
            }
          );

        console.log(`입금처리 수정 완료: ${cardCompany} ${saleDate} ${actualDepositAmount}원`);
      });

      return NextResponse.json({
        success: true,
        message: '입금처리가 수정되었습니다.',
        data: {
          cardCompany,
          saleDate,
          actualDepositAmount,
          fee,
          feeRate
        }
      });

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      throw transactionError;
    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error('입금처리 수정 오류:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '입금처리 수정 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}