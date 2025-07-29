import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

/**
 * 카드 입금처리 삭제 API
 * 입금처리를 삭제하고 관련 거래 내역을 미처리 상태로 되돌림
 */
export async function DELETE(request: NextRequest) {
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
    const { cardCompany, saleDate } = requestData;

    // 필수 필드 검증
    if (!cardCompany || !saleDate) {
      return NextResponse.json(
        { error: '카드사와 매출일자가 필요합니다.' },
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

        // 기존 입금처리 내역 조회
        const existingDeposit = await db.collection('carddeposits')
          .findOne({
            cardCompany,
            saleDate: salesDateObj
          });

        if (!existingDeposit) {
          throw new Error('삭제할 입금처리 내역을 찾을 수 없습니다.');
        }

        // 삭제 이력 저장 (삭제하기 전에 백업)
        await db.collection('carddeposits_deleted')
          .insertOne({
            ...existingDeposit,
            deletedBy: userId,
            deletedAt: new Date(),
            originalId: existingDeposit._id
          });

        // carddeposits 컬렉션에서 삭제
        await db.collection('carddeposits')
          .deleteOne({
            cardCompany,
            saleDate: salesDateObj
          });

        // 관련 transactions 상태를 미처리로 되돌림
        await db.collection('transactions')
          .updateMany(
            { _id: { $in: transactions.map((tx: any) => tx._id) } },
            {
              $unset: {
                depositStatus: "",
                depositId: "",
                actualDepositDate: "",
                actualDepositAmount: "",
                fee: "",
                feeRate: "",
                bulkProcessed: "",
                bulkProcessedAt: ""
              },
              $set: {
                updatedAt: new Date()
              }
            }
          );

        console.log(`입금처리 삭제 완료: ${cardCompany} ${saleDate}`);
      });

      return NextResponse.json({
        success: true,
        message: '입금처리가 삭제되었습니다.',
        data: {
          cardCompany,
          saleDate
        }
      });

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      throw transactionError;
    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error('입금처리 삭제 오류:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '입금처리 삭제 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}