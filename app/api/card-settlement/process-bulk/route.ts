import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

/**
 * 일괄 카드 입금처리 API
 * 같은 카드사의 여러 날짜 결제건들을 일괄로 처리하고
 * 비율에 따라 분배하여 각각 carddeposits에 저장 및 transactions 업데이트
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
      items,
      actualDepositDate,
      totalActualAmount,
      distributions
    } = requestData;

    // 필수 필드 검증
    if (!cardCompany || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: '카드사 및 처리할 항목 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!actualDepositDate || !totalActualAmount || !distributions) {
      return NextResponse.json(
        { error: '입금 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 금액 검증
    if (totalActualAmount <= 0) {
      return NextResponse.json(
        { error: '입금액은 0보다 커야 합니다.' },
        { status: 400 }
      );
    }

    // 분배 결과 검증
    const totalSalesAmount = items.reduce((sum: number, item: any) => sum + item.totalAmount, 0);
    const distributionSum = distributions.reduce((sum: number, dist: any) => sum + dist.actualAmount, 0);
    
    if (Math.abs(distributionSum - totalActualAmount) > 0.01) {
      return NextResponse.json(
        { error: '분배 금액이 총 입금액과 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    const { client, db } = await connectToDatabase();

    // 트랜잭션 시작
    const session = client.startSession();
    const results: any[] = [];
    
    try {
      await session.withTransaction(async () => {
        // 각 날짜별로 처리
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const distribution = distributions[i];
          
          const salesDateObj = new Date(item.date);
          
          // 해당 날짜/카드사의 거래 내역 조회
          const transactions = await db.collection('transactions')
            .find({
              date: salesDateObj,
              cardCompany: cardCompany,
              paymentMethod: "카드"
            })
            .toArray();

          if (transactions.length === 0) {
            throw new Error(`${item.date}에 해당하는 거래 내역을 찾을 수 없습니다.`);
          }

          // 매출액 검증
          const itemSalesAmount = transactions.reduce(
            (sum: number, tx: any) => sum + tx.paymentAmount, 
            0
          );
          
          if (Math.abs(itemSalesAmount - item.totalAmount) > 0.01) {
            throw new Error(`${item.date} 매출액이 일치하지 않습니다.`);
          }

          // 이미 처리된 항목인지 확인
          const existingDeposit = await db.collection('carddeposits')
            .findOne({
              cardCompany,
              saleDate: salesDateObj
            });

          if (existingDeposit) {
            throw new Error(`${item.date}는 이미 처리된 항목입니다.`);
          }

          // carddeposits 컬렉션에 새 레코드 생성
          const depositRecord = {
            cardCompany,
            saleDate: salesDateObj,
            saleAmount: item.totalAmount,
            actualDepositAmount: distribution.actualAmount,
            fee: distribution.fee,
            feeRate: distribution.feeRate,
            expectedDepositDate: new Date(transactions[0].expectedDepositDate || actualDepositDate),
            actualDepositDate: new Date(actualDepositDate),
            status: "입금완료",
            transactionIds: transactions.map((tx: any) => tx._id),
            createdBy: userId,
            holdReason: null,
            // 일괄처리 관련 메타데이터
            bulkProcessed: true,
            bulkProcessedAt: new Date(),
            bulkTotalAmount: totalActualAmount,
            bulkItemCount: items.length,
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
                  actualDepositAmount: distribution.actualAmount,
                  fee: distribution.fee,
                  feeRate: distribution.feeRate,
                  // 일괄처리 표시
                  bulkProcessed: true,
                  bulkProcessedAt: new Date(),
                  updatedAt: new Date()
                }
              }
            );

          results.push({
            date: item.date,
            saleAmount: item.totalAmount,
            actualAmount: distribution.actualAmount,
            fee: distribution.fee,
            feeRate: distribution.feeRate,
            transactionCount: transactions.length
          });
        }

        console.log(`일괄 입금처리 완료: ${cardCompany} ${items.length}건 총 ${totalActualAmount}원`);
      });

      return NextResponse.json({
        success: true,
        message: `${items.length}건의 입금처리가 완료되었습니다.`,
        data: {
          cardCompany,
          totalItems: items.length,
          totalSalesAmount,
          totalActualAmount,
          totalFee: totalSalesAmount - totalActualAmount,
          overallFeeRate: Number(((totalSalesAmount - totalActualAmount) / totalSalesAmount * 100).toFixed(2)),
          results
        }
      });

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      throw transactionError;
    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error('일괄 입금처리 오류:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '일괄 입금처리 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}