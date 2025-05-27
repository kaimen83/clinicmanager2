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
        console.log('시재 기록 삭제 시작:', {
            transactionId,
            paymentMethod,
            isCash: paymentMethod === PAYMENT_METHODS.CASH,
            PAYMENT_METHODS_CASH: PAYMENT_METHODS.CASH
        });

        if (paymentMethod !== PAYMENT_METHODS.CASH) {
            console.log('현금 결제가 아니므로 시재 기록 삭제를 건너뜁니다.');
            return; // 현금 결제가 아니면 시재에 영향 없음
        }

        // Mongoose와 MongoDB 직접 접근 모두 시도
        try {
            // 1. Mongoose 모델 사용 시도
            const dbConnect = (await import('@/lib/mongoose')).default;
            await dbConnect();
            
            const CashRecord = (await import('@/lib/models/CashRecord')).default;
            
            console.log('Mongoose 모델로 시재 기록 조회 중...');
            const cashRecordMongoose = await CashRecord.findOne({
                transactionId: new ObjectId(transactionId),
                type: '수입'
            });
            
            console.log('Mongoose로 조회된 시재 기록:', cashRecordMongoose);
            
            if (cashRecordMongoose) {
                console.log('Mongoose로 시재 기록 삭제 실행 중:', { cashRecordId: cashRecordMongoose._id });
                
                const deleteResult = await CashRecord.deleteOne({ _id: cashRecordMongoose._id });
                
                console.log('Mongoose 시재 기록 삭제 결과:', {
                    deletedCount: deleteResult.deletedCount,
                    acknowledged: deleteResult.acknowledged
                });
                
                if (deleteResult.deletedCount > 0) {
                    console.log('Mongoose 시재 기록 삭제 성공');
                    return;
                }
            }
        } catch (mongooseError) {
            console.log('Mongoose 삭제 실패, MongoDB 직접 접근 시도:', mongooseError);
        }

        // 2. MongoDB 직접 접근 시도
        const { db } = await connectToDatabase();
        
        // 먼저 모든 관련 시재 기록을 조회해보자
        const allCashRecords = await db.collection('cashrecords').find({
            transactionId: new ObjectId(transactionId)
        }).toArray();
        
        console.log('MongoDB 직접 접근으로 조회된 모든 시재 기록:', {
            transactionId,
            count: allCashRecords.length,
            records: allCashRecords
        });
        
        // 수입 타입 시재 기록 조회
        const cashRecord = await db.collection('cashrecords').findOne({
            transactionId: new ObjectId(transactionId),
            type: '수입'
        });

        console.log('MongoDB 직접 접근으로 조회된 수입 시재 기록:', cashRecord);

        if (cashRecord) {
            console.log('MongoDB 직접 접근으로 시재 기록 삭제 실행 중:', { cashRecordId: cashRecord._id });
            
            const deleteResult = await db.collection('cashrecords').deleteOne({ _id: cashRecord._id });
            
            console.log('MongoDB 직접 접근 시재 기록 삭제 결과:', {
                deletedCount: deleteResult.deletedCount,
                acknowledged: deleteResult.acknowledged
            });
            
            if (deleteResult.deletedCount === 0) {
                throw new Error(`시재 기록 삭제 실패 (ID: ${cashRecord._id})`);
            }
            
            console.log('MongoDB 직접 접근 시재 기록 삭제 성공');
        } else {
            console.log('삭제할 시재 기록을 찾을 수 없습니다. 다른 조건으로 재시도...');
            
            // 혹시 type 없이 저장된 기록이 있는지 확인
            const anyRecord = await db.collection('cashrecords').findOne({
                transactionId: new ObjectId(transactionId)
            });
            
            console.log('type 조건 없이 조회된 시재 기록:', anyRecord);
            
            if (anyRecord) {
                console.log('type 조건 없는 시재 기록 삭제 실행 중:', { cashRecordId: anyRecord._id });
                
                const deleteResult = await db.collection('cashrecords').deleteOne({ _id: anyRecord._id });
                
                console.log('type 조건 없는 시재 기록 삭제 결과:', {
                    deletedCount: deleteResult.deletedCount,
                    acknowledged: deleteResult.acknowledged
                });
                
                if (deleteResult.deletedCount > 0) {
                    console.log('type 조건 없는 시재 기록 삭제 성공');
                }
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
        // 새로운 구조: payments 배열에서 현금 결제 찾기
        let cashPayment = null;
        if (transaction.payments && Array.isArray(transaction.payments)) {
            cashPayment = findCashPayment(transaction.payments);
        }
        
        // 기존 구조: paymentMethod 필드 확인
        const isLegacyCashPayment = transaction.paymentMethod === PAYMENT_METHODS.CASH;
        
        if (cashPayment) {
            console.log('현금 결제 발견 (새 구조), 시재 기록 생성:', {
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
        } else if (isLegacyCashPayment && transaction.paymentAmount > 0) {
            console.log('현금 결제 발견 (기존 구조), 시재 기록 생성:', {
                transactionId: transaction._id,
                amount: transaction.paymentAmount,
                patientName: transaction.patientName
            });

            await createCashRecord({
                _id: transaction._id,
                amount: transaction.paymentAmount,
                patientName: transaction.patientName,
                date: transaction.date
            });
        } else {
            console.log('현금 결제가 없어 시재 기록을 생성하지 않습니다.');
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
        // 새로운 구조: payments 배열에서 현금 결제 찾기
        const oldCashPayment = oldTransaction.payments ? findCashPayment(oldTransaction.payments) : null;
        const newCashPayment = newTransaction.payments ? findCashPayment(newTransaction.payments) : null;
        
        // 기존 구조: paymentMethod 필드 확인
        const oldIsLegacyCash = oldTransaction.paymentMethod === PAYMENT_METHODS.CASH;
        const newIsLegacyCash = newTransaction.paymentMethod === PAYMENT_METHODS.CASH;

        console.log('거래 시재 기록 업데이트:', {
            transactionId: newTransaction._id,
            oldCashPayment: oldCashPayment ? { amount: oldCashPayment.amount } : null,
            newCashPayment: newCashPayment ? { amount: newCashPayment.amount } : null,
            oldIsLegacyCash,
            newIsLegacyCash
        });

        // 기존 결제 정보 구성
        let oldPaymentInfo = null;
        if (oldCashPayment) {
            oldPaymentInfo = {
                paymentMethod: PAYMENT_METHODS.CASH,
                amount: oldCashPayment.amount,
                date: oldTransaction.date,
                patientName: oldTransaction.patientName
            };
        } else if (oldIsLegacyCash && oldTransaction.paymentAmount > 0) {
            oldPaymentInfo = {
                paymentMethod: PAYMENT_METHODS.CASH,
                amount: oldTransaction.paymentAmount,
                date: oldTransaction.date,
                patientName: oldTransaction.patientName
            };
        }

        // 새로운 결제 정보 구성
        let newPaymentInfo = null;
        if (newCashPayment) {
            newPaymentInfo = {
                paymentMethod: PAYMENT_METHODS.CASH,
                amount: newCashPayment.amount,
                date: newTransaction.date,
                patientName: newTransaction.patientName
            };
        } else if (newIsLegacyCash && newTransaction.paymentAmount > 0) {
            newPaymentInfo = {
                paymentMethod: PAYMENT_METHODS.CASH,
                amount: newTransaction.paymentAmount,
                date: newTransaction.date,
                patientName: newTransaction.patientName
            };
        }

        await updateCashRecord(oldPaymentInfo, newPaymentInfo, newTransaction._id);
    } catch (error) {
        console.error('거래 시재 기록 업데이트 중 오류:', error);
        throw error;
    }
} 