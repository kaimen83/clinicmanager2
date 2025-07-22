import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

// 입금예정일 계산 함수
const calculateExpectedDepositDate = (saleDate: Date) => {
  let date = new Date(saleDate);
  let businessDays = 0;
  
  // 시작일을 다음날로 설정
  date.setDate(date.getDate() + 1);
  
  while (businessDays < 2) {
    // 주말이 아닌 경우에만 영업일 카운트
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      businessDays++;
    }
    
    // 다음 날로 이동
    if (businessDays < 2) {
      date.setDate(date.getDate() + 1);
    }
  }
  
  return date;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId } = body;
    
    if (!transactionId) {
      return NextResponse.json({ error: '거래 ID가 필요합니다.' }, { status: 400 });
    }

    // MongoDB 연결
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    
    await client.connect();
    const db = client.db('hospital_accounting');
    
    // 해당 거래가 포함된 카드 입금 정보 찾기
    const deposits = await db.collection('carddeposits').find({
      transactionIds: new ObjectId(transactionId)
    }).toArray();

    // 거래 정보 조회
    const transaction = await db.collection('transactions').findOne({ 
      _id: new ObjectId(transactionId) 
    });
    
    if (!transaction) {
      // 거래가 삭제된 경우 모든 관련 입금 정보에서 해당 거래 ID 제거
      for (const deposit of deposits) {
        const updatedTransactionIds = deposit.transactionIds.filter(
          (id: ObjectId) => id.toString() !== transactionId
        );
        
        if (updatedTransactionIds.length === 0) {
          // 더 이상 거래가 없으면 카드매출 삭제
          await db.collection('carddeposits').deleteOne({ _id: deposit._id });
        } else {
          // 남은 거래들의 총액 재계산
          const remainingTransactions = await db.collection('transactions').find({
            _id: { $in: updatedTransactionIds }
          }).toArray();
          
          const saleAmount = remainingTransactions.reduce((sum: number, t: any) => sum + t.paymentAmount, 0);
          
          await db.collection('carddeposits').updateOne(
            { _id: deposit._id },
            { 
              $set: { 
                transactionIds: updatedTransactionIds,
                saleAmount: saleAmount,
                updatedAt: new Date()
              }
            }
          );
        }
      }
      
      await client.close();
      return NextResponse.json({ message: '거래 삭제로 인한 동기화가 완료되었습니다.' });
    }

    // 카드 결제가 아닌 경우 입금 정보에서 제거
    if (transaction.paymentMethod !== '카드') {
      for (const deposit of deposits) {
        const updatedTransactionIds = deposit.transactionIds.filter(
          (id: ObjectId) => id.toString() !== transactionId
        );
        
        if (updatedTransactionIds.length === 0) {
          await db.collection('carddeposits').deleteOne({ _id: deposit._id });
        } else {
          const remainingTransactions = await db.collection('transactions').find({
            _id: { $in: updatedTransactionIds }
          }).toArray();
          
          const saleAmount = remainingTransactions.reduce((sum: number, t: any) => sum + t.paymentAmount, 0);
          
          await db.collection('carddeposits').updateOne(
            { _id: deposit._id },
            { 
              $set: { 
                transactionIds: updatedTransactionIds,
                saleAmount: saleAmount,
                updatedAt: new Date()
              }
            }
          );
        }
      }
      
      await client.close();
      return NextResponse.json({ message: '비카드 결제로 인한 동기화가 완료되었습니다.' });
    }

    // 기존 입금 정보가 있는 경우 업데이트
    if (deposits.length > 0) {
      for (const deposit of deposits) {
        // 거래들의 카드사가 동일한지 확인
        const transactionIds = deposit.transactionIds;
        const allTransactions = await db.collection('transactions').find({
          _id: { $in: transactionIds }
        }).toArray();
        
        const cardCompanies = [...new Set(allTransactions.map((t: any) => t.cardCompany))];
        
        if (cardCompanies.length > 1) {
          // 카드사가 여러 개인 경우 기존 입금 정보 삭제 후 카드사별로 새로 생성
          await db.collection('carddeposits').deleteOne({ _id: deposit._id });
          
          for (const company of cardCompanies) {
            const companyTransactions = allTransactions.filter((t: any) => t.cardCompany === company);
            const saleAmount = companyTransactions.reduce((sum: number, t: any) => sum + t.paymentAmount, 0);
            
            await db.collection('carddeposits').insertOne({
              cardCompany: company,
              saleDate: new Date(deposit.saleDate),
              saleAmount: saleAmount,
              expectedDepositDate: calculateExpectedDepositDate(new Date(deposit.saleDate)),
              status: '미입금',
              transactionIds: companyTransactions.map((t: any) => t._id),
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        } else {
          // 단일 카드사의 경우 기존 정보 업데이트
          const saleAmount = allTransactions.reduce((sum: number, t: any) => sum + t.paymentAmount, 0);
          
          await db.collection('carddeposits').updateOne(
            { _id: deposit._id },
            { 
              $set: {
                cardCompany: cardCompanies[0],
                saleAmount: saleAmount,
                transactionIds: allTransactions.map((t: any) => t._id),
                updatedAt: new Date()
              }
            }
          );
        }
      }
    } else {
      // 새로운 입금 정보 생성
      // 같은 날짜, 같은 카드사의 입금 정보가 있는지 확인
      const sameGroupDeposit = await db.collection('carddeposits').findOne({
        saleDate: transaction.date,
        cardCompany: transaction.cardCompany
      });

      if (sameGroupDeposit) {
        // 기존 그룹에 추가
        await db.collection('carddeposits').updateOne(
          { _id: sameGroupDeposit._id },
          { 
            $push: { transactionIds: new ObjectId(transactionId) },
            $inc: { saleAmount: transaction.paymentAmount },
            $set: { updatedAt: new Date() }
          }
        );
      } else {
        // 새로운 그룹 생성
        await db.collection('carddeposits').insertOne({
          cardCompany: transaction.cardCompany,
          saleDate: transaction.date,
          saleAmount: transaction.paymentAmount,
          expectedDepositDate: calculateExpectedDepositDate(transaction.date),
          status: '미입금',
          transactionIds: [new ObjectId(transactionId)],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    await client.close();
    return NextResponse.json({ message: '동기화가 완료되었습니다.' });

  } catch (error) {
    console.error('동기화 실패:', error);
    return NextResponse.json({ 
      error: '동기화에 실패했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}