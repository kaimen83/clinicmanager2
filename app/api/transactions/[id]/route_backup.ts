import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { toKstDate } from '@/lib/utils';
import { updateCashRecordsForTransaction, deleteCashRecord, PAYMENT_METHODS } from '@/lib/utils/cashManagement';

// GET 요청 처리 - 특정 내원정보(트랜잭션) 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "유효하지 않은 내원정보 ID입니다." },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // 내원정보 조회
    const transaction = await db.collection('transactions').findOne({
      _id: new ObjectId(id)
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "해당 내원정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('내원정보 조회 중 에러:', error);
    return NextResponse.json(
      { error: "내원정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PATCH 요청 처리 - 내원정보 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "유효하지 않은 내원정보 ID입니다." },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    const { db } = await connectToDatabase();
    
    // 내원정보가 존재하는지 확인
    const existingTransaction = await db.collection('transactions').findOne({
      _id: new ObjectId(id)
    });
    
    if (!existingTransaction) {
      return NextResponse.json(
        { error: "해당 내원정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    
    // 날짜 형식 변환 (한국 시간대 고려)
    let updateData: any = { ...data };
    
    if (data.date) {
      updateData.date = toKstDate(data.date);
    }
    
    // 상담 내역 업데이트
    if (data.consultations) {
      updateData.consultations = data.consultations.map((consultation: any) => {
        // 기존 상담 업데이트
        if (consultation._id) {
          return {
            ...consultation,
            _id: typeof consultation._id === 'string' ? new ObjectId(consultation._id) : consultation._id,
            date: consultation.date ? toKstDate(consultation.date) : toKstDate(new Date()),
            confirmedDate: consultation.confirmedDate ? toKstDate(consultation.confirmedDate) : null,
            updatedAt: toKstDate(new Date())
          };
        }
        // 새 상담 추가
        return {
          ...consultation,
          _id: new ObjectId(),
          date: consultation.date ? toKstDate(consultation.date) : toKstDate(new Date()),
          confirmedDate: consultation.confirmedDate ? toKstDate(consultation.confirmedDate) : null,
          createdAt: toKstDate(new Date()),
          updatedAt: toKstDate(new Date())
        };
      });
    }
    
    // 수납 내역 업데이트
    if (data.payments) {
      updateData.payments = data.payments.map((payment: any) => {
        // 기존 수납 업데이트
        if (payment._id) {
          return {
            ...payment,
            _id: typeof payment._id === 'string' ? new ObjectId(payment._id) : payment._id,
            date: payment.date ? toKstDate(payment.date) : toKstDate(new Date())
          };
        }
        // 새 수납 추가
        return {
          ...payment,
          _id: new ObjectId(),
          date: payment.date ? toKstDate(payment.date) : toKstDate(new Date())
        };
      });
    }
    
    // 업데이트 시간 추가
    updateData.updatedAt = toKstDate(new Date());
    
    // 내원정보 업데이트
    await db.collection('transactions').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    // 업데이트된 내원정보 조회
    const updatedTransaction = await db.collection('transactions').findOne({
      _id: new ObjectId(id)
    });

    // 현금 결제 변경사항이 있는 경우 시재 기록 업데이트
    try {
      await updateCashRecordsForTransaction(existingTransaction, updatedTransaction);
    } catch (cashError) {
      console.error('시재 기록 업데이트 중 오류:', cashError);
      // 시재 기록 실패는 로그만 남기고 거래는 계속 진행
    }
    
    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error('내원정보 업데이트 중 에러:', error);
    return NextResponse.json(
      { error: "내원정보 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PUT 요청 처리 - 내원정보 업데이트 (PATCH와 동일한 로직)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "유효하지 않은 내원정보 ID입니다." },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    const { db } = await connectToDatabase();
    
    // 내원정보가 존재하는지 확인
    const existingTransaction = await db.collection('transactions').findOne({
      _id: new ObjectId(id)
    });
    
    if (!existingTransaction) {
      return NextResponse.json(
        { error: "해당 내원정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    
    // 날짜 형식 변환 (한국 시간대 고려)
    let updateData: any = { ...data };
    
    if (data.date) {
      updateData.date = toKstDate(data.date);
    }
    
    // 상담 내역 업데이트
    if (data.consultations) {
      updateData.consultations = data.consultations.map((consultation: any) => {
        // 기존 상담 업데이트
        if (consultation._id) {
          return {
            ...consultation,
            _id: typeof consultation._id === 'string' ? new ObjectId(consultation._id) : consultation._id,
            date: consultation.date ? toKstDate(consultation.date) : toKstDate(new Date()),
            confirmedDate: consultation.confirmedDate ? toKstDate(consultation.confirmedDate) : null,
            updatedAt: toKstDate(new Date())
          };
        }
        // 새 상담 추가
        return {
          ...consultation,
          _id: new ObjectId(),
          date: consultation.date ? toKstDate(consultation.date) : toKstDate(new Date()),
          confirmedDate: consultation.confirmedDate ? toKstDate(consultation.confirmedDate) : null,
          createdAt: toKstDate(new Date()),
          updatedAt: toKstDate(new Date())
        };
      });
    }
    
    // 수납 내역 업데이트
    if (data.payments) {
      updateData.payments = data.payments.map((payment: any) => {
        // 기존 수납 업데이트
        if (payment._id) {
          return {
            ...payment,
            _id: typeof payment._id === 'string' ? new ObjectId(payment._id) : payment._id,
            date: payment.date ? toKstDate(payment.date) : toKstDate(new Date())
          };
        }
        // 새 수납 추가
        return {
          ...payment,
          _id: new ObjectId(),
          date: payment.date ? toKstDate(payment.date) : toKstDate(new Date())
        };
      });
    }
    
    // 업데이트 시간 추가
    updateData.updatedAt = toKstDate(new Date());
    
    // 내원정보 업데이트
    await db.collection('transactions').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    // 업데이트된 내원정보 조회
    const updatedTransaction = await db.collection('transactions').findOne({
      _id: new ObjectId(id)
    });

    // 현금 결제 변경사항이 있는 경우 시재 기록 업데이트
    try {
      await updateCashRecordsForTransaction(existingTransaction, updatedTransaction);
    } catch (cashError) {
      console.error('시재 기록 업데이트 중 오류:', cashError);
      // 시재 기록 실패는 로그만 남기고 거래는 계속 진행
    }
    
    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error('내원정보 업데이트 중 에러:', error);
    return NextResponse.json(
      { error: "내원정보 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE 요청 처리 - 내원정보 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "유효하지 않은 내원정보 ID입니다." },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // 삭제할 내원정보 조회 (시재 기록 삭제를 위해)
    const transactionToDelete = await db.collection('transactions').findOne({
      _id: new ObjectId(id)
    });

    if (!transactionToDelete) {
      return NextResponse.json(
        { error: "해당 내원정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 현금 결제가 있는 경우 시재 기록 삭제
    try {
      console.log('내원정보 삭제 - 시재 기록 삭제 확인:', {
        transactionId: id,
        hasPayments: !!transactionToDelete.payments,
        paymentsLength: transactionToDelete.payments?.length,
        paymentMethod: transactionToDelete.paymentMethod
      });

      let cashPaymentFound = false;

      // 새로운 구조: payments 배열이 있는 경우
      if (transactionToDelete.payments && Array.isArray(transactionToDelete.payments) && transactionToDelete.payments.length > 0) {
        for (const payment of transactionToDelete.payments) {
          console.log('결제 정보 확인:', {
            method: payment.method,
            isCash: payment.method === PAYMENT_METHODS.CASH
          });
          
          if (payment.method === PAYMENT_METHODS.CASH) {
            console.log('현금 결제 발견 (새 구조), 시재 기록 삭제 시작');
            await deleteCashRecord(id, PAYMENT_METHODS.CASH);
            cashPaymentFound = true;
          }
        }
      }
      
      // 기존 구조: paymentMethod 필드가 직접 있는 경우 (새 구조에서 현금 결제를 찾지 못한 경우에만)
      if (!cashPaymentFound && transactionToDelete.paymentMethod === PAYMENT_METHODS.CASH) {
        console.log('기존 구조 현금 결제 발견, 시재 기록 삭제 시작');
        await deleteCashRecord(id, PAYMENT_METHODS.CASH);
      }
    } catch (cashError) {
      console.error('시재 기록 삭제 중 오류:', cashError);
      // 시재 기록 실패는 로그만 남기고 거래는 계속 진행
    }
    
    // 내원정보 삭제
    const result = await db.collection('transactions').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "해당 내원정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "내원정보가 성공적으로 삭제되었습니다." });
  } catch (error) {
    console.error('내원정보 삭제 중 에러:', error);
    return NextResponse.json(
      { error: "내원정보 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 