import { Db, ObjectId } from 'mongodb';
import CashRecord from '@/lib/models/CashRecord';
import { connectToDatabase } from '@/lib/mongodb';
import { toKstDate } from '@/lib/utils';

// 결제 방법 상수
export const PAYMENT_METHODS = {
    CASH: '현금',
    CARD: '카드',
    TRANSFER: '계좌이체'
} as const;

// 현금 결제 거래에 대한 시재 기록 생성
export async function createCashRecord(transaction: any): Promise<void> {
    try {
        console.log('개별 시재 기록 생성 시작:', {
            transactionId: transaction._id || transaction.transactionId,
            amount: transaction.amount,
            patientName: transaction.patientName,
            date: transaction.date
        });

        const { db } = await connectToDatabase();
        
        // 날짜 처리 - 다양한 형태의 날짜 입력 처리
        let recordDate: Date;
        if (typeof transaction.date === 'string') {
            recordDate = toKstDate(transaction.date);
        } else if (transaction.date instanceof Date) {
            recordDate = transaction.date;
        } else {
            recordDate = toKstDate(new Date());
        }
        
        const cashRecord = {
            date: recordDate,
            type: '수입' as const,
            amount: Number(transaction.amount),
            description: `${transaction.patientName} 현금결제`,
            transactionId: new ObjectId(transaction._id || transaction.transactionId),
            createdAt: toKstDate(new Date()),
            updatedAt: toKstDate(new Date())
        };
        
        console.log('시재 기록 생성 데이터:', {
            date: cashRecord.date,
            amount: cashRecord.amount,
            description: cashRecord.description,
            transactionId: cashRecord.transactionId
        });
        
        const result = await db.collection('cashrecords').insertOne(cashRecord);
        
        console.log('시재 기록 생성 성공:', {
            insertedId: result.insertedId,
            acknowledged: result.acknowledged
        });
    } catch (error) {
        console.error('시재 기록 생성 중 상세 오류:', {
            error: error instanceof Error ? error.message : String(error),
            transaction: {
                id: transaction._id || transaction.transactionId,
                amount: transaction.amount,
                patientName: transaction.patientName
            }
        });
        throw new Error('시재 기록 생성에 실패했습니다.');
    }
}

// 거래 수정 시 시재 기록 업데이트
export async function updateCashRecord(
    oldPayment: any,
    newPayment: any,
    transactionId: string
): Promise<void> {
    try {
        const { db } = await connectToDatabase();
        
        const wasPaymentMethodCash = oldPayment?.paymentMethod === PAYMENT_METHODS.CASH;
        const isPaymentMethodCash = newPayment?.paymentMethod === PAYMENT_METHODS.CASH;
        const amountChanged = oldPayment?.amount !== newPayment?.amount;
        const dateChanged = oldPayment?.date !== newPayment?.date;

        // 기존 시재 기록 찾기
        const existingCashRecord = await db.collection('cashrecords').findOne({
            transactionId: new ObjectId(transactionId),
            type: '수입'
        });

        // Case 1: 현금 → 다른 결제방식
        if (wasPaymentMethodCash && !isPaymentMethodCash) {
            if (existingCashRecord) {
                await db.collection('cashrecords').deleteOne({ _id: existingCashRecord._id });
            }
        }
        // Case 2: 다른 결제방식 → 현금
        else if (!wasPaymentMethodCash && isPaymentMethodCash) {
            const cashRecord = {
                date: toKstDate(newPayment.date),
                type: '수입' as const,
                amount: Number(newPayment.amount),
                description: `${newPayment.patientName || '환자'} 현금결제`,
                transactionId: new ObjectId(transactionId),
                createdAt: toKstDate(new Date()),
                updatedAt: toKstDate(new Date())
            };
            await db.collection('cashrecords').insertOne(cashRecord);
        }
        // Case 3: 현금 → 현금 (금액 또는 날짜 변경)
        else if (wasPaymentMethodCash && isPaymentMethodCash && (amountChanged || dateChanged)) {
            if (existingCashRecord) {
                if (dateChanged) {
                    // 날짜가 변경된 경우 새로운 기록 생성
                    await db.collection('cashrecords').deleteOne({ _id: existingCashRecord._id });
                    const newCashRecord = {
                        date: toKstDate(newPayment.date),
                        type: '수입' as const,
                        amount: Number(newPayment.amount),
                        description: `${newPayment.patientName || '환자'} 현금결제`,
                        transactionId: new ObjectId(transactionId),
                        createdAt: toKstDate(new Date()),
                        updatedAt: toKstDate(new Date())
                    };
                    await db.collection('cashrecords').insertOne(newCashRecord);
                } else {
                    // 금액만 변경된 경우 기존 기록 업데이트
                    await db.collection('cashrecords').updateOne(
                        { _id: existingCashRecord._id },
                        { 
                            $set: { 
                                amount: Number(newPayment.amount),
                                updatedAt: toKstDate(new Date())
                            } 
                        }
                    );
                }
            }
        }
    } catch (error) {
        console.error('시재 기록 업데이트 중 오류:', error);
        throw error;
    }
}

// 거래 삭제 시 시재 기록 삭제
export async function deleteCashRecord(transactionId: string, paymentMethod: string): Promise<void> {
    try {
        if (paymentMethod !== PAYMENT_METHODS.CASH) {
            return; // 현금 결제가 아니면 시재에 영향 없음
        }

        const { db } = await connectToDatabase();
        
        const cashRecord = await db.collection('cashrecords').findOne({
            transactionId: new ObjectId(transactionId),
            type: '수입'
        });

        if (cashRecord) {
            const deleteResult = await db.collection('cashrecords').deleteOne({ _id: cashRecord._id });
            
            if (deleteResult.deletedCount === 0) {
                throw new Error(`시재 기록 삭제 실패 (ID: ${cashRecord._id})`);
            }
        }
    } catch (error) {
        console.error('시재 기록 삭제 중 오류:', error);
        throw error;
    }
}

// 현금 지출에 대한 시재 기록 생성
export async function createCashExpenseRecord(expense: any): Promise<void> {
    try {
        console.log('현금 지출 시재 기록 생성 시작:', {
            expenseId: expense._id || expense.expenseId,
            amount: expense.amount,
            description: expense.description,
            date: expense.date
        });

        const { db } = await connectToDatabase();
        
        // 날짜 처리
        let recordDate: Date;
        if (typeof expense.date === 'string') {
            recordDate = toKstDate(expense.date);
        } else if (expense.date instanceof Date) {
            recordDate = expense.date;
        } else {
            recordDate = toKstDate(new Date());
        }
        
        const cashRecord = {
            date: recordDate,
            type: '지출' as const,
            amount: Number(expense.amount),
            description: expense.description || '현금 지출',
            expenseId: new ObjectId(expense._id || expense.expenseId),
            createdAt: toKstDate(new Date()),
            updatedAt: toKstDate(new Date())
        };
        
        const result = await db.collection('cashrecords').insertOne(cashRecord);
        
        console.log('현금 지출 시재 기록 생성 성공:', {
            insertedId: result.insertedId,
            acknowledged: result.acknowledged
        });
    } catch (error) {
        console.error('현금 지출 시재 기록 생성 중 오류:', error);
        throw new Error('현금 지출 시재 기록 생성에 실패했습니다.');
    }
}

// 지출 수정 시 시재 기록 업데이트
export async function updateCashExpenseRecord(
    oldExpense: any,
    newExpense: any,
    expenseId: string
): Promise<void> {
    try {
        const { db } = await connectToDatabase();
        
        const wasPaymentMethodCash = oldExpense?.method === PAYMENT_METHODS.CASH;
        const isPaymentMethodCash = newExpense?.method === PAYMENT_METHODS.CASH;
        const amountChanged = oldExpense?.amount !== newExpense?.amount;
        const dateChanged = oldExpense?.date !== newExpense?.date;
        const descriptionChanged = oldExpense?.description !== newExpense?.description;

        // 기존 시재 기록 찾기
        const existingCashRecord = await db.collection('cashrecords').findOne({
            expenseId: new ObjectId(expenseId),
            type: '지출'
        });

        // Case 1: 현금 → 다른 결제방식
        if (wasPaymentMethodCash && !isPaymentMethodCash) {
            if (existingCashRecord) {
                await db.collection('cashrecords').deleteOne({ _id: existingCashRecord._id });
            }
        }
        // Case 2: 다른 결제방식 → 현금
        else if (!wasPaymentMethodCash && isPaymentMethodCash) {
            const cashRecord = {
                date: toKstDate(newExpense.date),
                type: '지출' as const,
                amount: Number(newExpense.amount),
                description: newExpense.description || '현금 지출',
                expenseId: new ObjectId(expenseId),
                createdAt: toKstDate(new Date()),
                updatedAt: toKstDate(new Date())
            };
            await db.collection('cashrecords').insertOne(cashRecord);
        }
        // Case 3: 현금 → 현금 (변경사항 있음)
        else if (wasPaymentMethodCash && isPaymentMethodCash && (amountChanged || dateChanged || descriptionChanged)) {
            if (existingCashRecord) {
                if (dateChanged) {
                    // 날짜가 변경된 경우 새로운 기록 생성
                    await db.collection('cashrecords').deleteOne({ _id: existingCashRecord._id });
                    const newCashRecord = {
                        date: toKstDate(newExpense.date),
                        type: '지출' as const,
                        amount: Number(newExpense.amount),
                        description: newExpense.description || '현금 지출',
                        expenseId: new ObjectId(expenseId),
                        createdAt: toKstDate(new Date()),
                        updatedAt: toKstDate(new Date())
                    };
                    await db.collection('cashrecords').insertOne(newCashRecord);
                } else {
                    // 금액이나 설명만 변경된 경우 기존 기록 업데이트
                    await db.collection('cashrecords').updateOne(
                        { _id: existingCashRecord._id },
                        { 
                            $set: { 
                                amount: Number(newExpense.amount),
                                description: newExpense.description || '현금 지출',
                                updatedAt: toKstDate(new Date())
                            } 
                        }
                    );
                }
            }
        }
    } catch (error) {
        console.error('현금 지출 시재 기록 업데이트 중 오류:', error);
        throw error;
    }
}

// 지출 삭제 시 시재 기록 삭제
export async function deleteCashExpenseRecord(expenseId: string, paymentMethod: string): Promise<void> {
    try {
        if (paymentMethod !== PAYMENT_METHODS.CASH) {
            return; // 현금 지출이 아니면 시재에 영향 없음
        }

        const { db } = await connectToDatabase();
        
        const cashRecord = await db.collection('cashrecords').findOne({
            expenseId: new ObjectId(expenseId),
            type: '지출'
        });

        if (cashRecord) {
            const deleteResult = await db.collection('cashrecords').deleteOne({ _id: cashRecord._id });
            
            if (deleteResult.deletedCount === 0) {
                throw new Error(`현금 지출 시재 기록 삭제 실패 (ID: ${cashRecord._id})`);
            }
        }
    } catch (error) {
        console.error('현금 지출 시재 기록 삭제 중 오류:', error);
        throw error;
    }
}

// 현금 결제 찾기 (기존 함수 유지)
export function findCashPayment(payments: any[]): any | null {
    return payments.find(payment => payment.method === PAYMENT_METHODS.CASH) || null;
}

// 거래에 대한 시재 기록 생성 (기존 함수 업데이트)
export async function createCashRecordsForTransaction(transaction: any): Promise<void> {
    try {
        if (!transaction.payments || !Array.isArray(transaction.payments)) {
            console.log('결제 정보가 없어 시재 기록을 생성하지 않습니다.');
            return;
        }

        const cashPayment = findCashPayment(transaction.payments);
        
        if (cashPayment) {
            console.log('현금 결제 발견, 시재 기록 생성:', {
                transactionId: transaction._id,
                amount: cashPayment.amount,
                patientName: transaction.patientName
            });

            await createCashRecord({
                _id: transaction._id,
                amount: cashPayment.amount,
                patientName: transaction.patientName,
                date: transaction.date
            });
        }
    } catch (error) {
        console.error('거래 시재 기록 생성 중 오류:', error);
        throw error;
    }
}

// 거래 수정 시 시재 기록 업데이트 (기존 함수 업데이트)
export async function updateCashRecordsForTransaction(
    oldTransaction: any,
    newTransaction: any
): Promise<void> {
    try {
        const oldCashPayment = oldTransaction.payments ? findCashPayment(oldTransaction.payments) : null;
        const newCashPayment = newTransaction.payments ? findCashPayment(newTransaction.payments) : null;

        console.log('거래 시재 기록 업데이트:', {
            transactionId: newTransaction._id,
            oldCashPayment: oldCashPayment ? { amount: oldCashPayment.amount } : null,
            newCashPayment: newCashPayment ? { amount: newCashPayment.amount } : null
        });

        await updateCashRecord(
            oldCashPayment ? { 
                paymentMethod: PAYMENT_METHODS.CASH, 
                amount: oldCashPayment.amount,
                date: oldTransaction.date,
                patientName: oldTransaction.patientName
            } : null,
            newCashPayment ? { 
                paymentMethod: PAYMENT_METHODS.CASH, 
                amount: newCashPayment.amount,
                date: newTransaction.date,
                patientName: newTransaction.patientName
            } : null,
            newTransaction._id
        );
    } catch (error) {
        console.error('거래 시재 기록 업데이트 중 오류:', error);
        throw error;
    }
} 