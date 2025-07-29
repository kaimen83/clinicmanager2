import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

/**
 * 개별 카드 입금처리 API
 * 단일 카드 결제건에 대한 실제 입금 정보를 처리하고
 * carddeposits 컬렉션에 저장 후 관련 transactions 상태 업데이트
 */
export async function POST(request: NextRequest) {
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

        // 이미 처리된 항목인지 확인
        const existingDeposit = await db.collection('carddeposits')
          .findOne({
            cardCompany,
            saleDate: salesDateObj
          });

        if (existingDeposit) {
          throw new Error('이미 처리된 항목입니다.');
        }

        // carddeposits 컬렉션에 새 레코드 생성
        const depositRecord = {
          cardCompany,
          saleDate: salesDateObj,
          saleAmount: totalAmount,
          actualDepositAmount,
          fee,
          feeRate,
          expectedDepositDate: new Date(transactions[0].expectedDepositDate || actualDepositDate),
          actualDepositDate: new Date(actualDepositDate),
          status: "입금완료",
          transactionIds: transactions.map((tx: any) => tx._id),
          createdBy: userId,
          holdReason: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const insertResult = await db.collection('carddeposits')
          .insertOne(depositRecord);

        // 관련 transactions 상태 업데이트
        await db.collection('transactions')
          .updateMany(
            { _id: { $in: transactions.map((tx: any) => tx._id) } },
            {
              $set: {
                depositStatus: "입금완료",
                depositId: insertResult.insertedId,
                actualDepositDate: new Date(actualDepositDate),
                actualDepositAmount,
                fee,
                feeRate,
                updatedAt: new Date()
              }
            }
          );

        console.log(`개별 입금처리 완료: ${cardCompany} ${saleDate} ${actualDepositAmount}원`);
      });

      return NextResponse.json({
        success: true,
        message: '입금처리가 완료되었습니다.',
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
    console.error('개별 입금처리 오류:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '입금처리 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}