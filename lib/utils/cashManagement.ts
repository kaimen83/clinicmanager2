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
            isCompleted: false,
            isGrouped: false,
            isClosed: false,
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
                // 마감 여부 확인
                const isClosed = await checkIfClosedForDate(existingCashRecord.date);
                if (isClosed) {
                    throw new Error('마감된 날짜의 시재 기록은 수정할 수 없습니다.');
                }
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
                isCompleted: false,
                isGrouped: false,
                isClosed: false,
                createdAt: toKstDate(new Date()),
                updatedAt: toKstDate(new Date())
            };
            await db.collection('cashrecords').insertOne(cashRecord);
        }
        // Case 3: 현금 → 현금 (금액 또는 날짜 변경)
        else if (wasPaymentMethodCash && isPaymentMethodCash && (amountChanged || dateChanged)) {
            if (existingCashRecord) {
                // 마감 여부 확인
                const isClosed = await checkIfClosedForDate(existingCashRecord.date);
                if (isClosed) {
                    throw new Error('마감된 날짜의 시재 기록은 수정할 수 없습니다.');
                }

                if (dateChanged) {
                    // 날짜가 변경된 경우 새로운 기록 생성
                    await db.collection('cashrecords').deleteOne({ _id: existingCashRecord._id });
                    const newCashRecord = {
                        date: toKstDate(newPayment.date),
                        type: '수입' as const,
                        amount: Number(newPayment.amount),
                        description: `${newPayment.patientName || '환자'} 현금결제`,
                        transactionId: new ObjectId(transactionId),
                        isCompleted: false,
                        isGrouped: false,
                        isClosed: false,
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
            // 마감 여부 확인
            const isClosed = await checkIfClosedForDate(cashRecord.date);
            if (isClosed) {
                throw new Error('마감된 날짜의 시재 기록은 삭제할 수 없습니다.');
            }

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

// 특정 날짜의 마감 여부 확인
async function checkIfClosedForDate(date: Date): Promise<boolean> {
    try {
        const { db } = await connectToDatabase();
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const record = await db.collection('cashrecords').findOne({
            date: {
                $gte: startOfDay,
                $lt: endOfDay
            },
            isClosed: true
        });
        
        return !!record;
    } catch (error) {
        console.error('마감 여부 확인 중 오류:', error);
        return false; // 오류 시 안전하게 처리
    }
}

// payments 배열에서 현금 결제 찾기
export function findCashPayment(payments: any[]): any | null {
    if (!payments || !Array.isArray(payments)) {
        return null;
    }
    
    return payments.find(payment => payment.paymentMethod === PAYMENT_METHODS.CASH) || null;
}

// 거래 내 모든 현금 결제에 대해 시재 기록 생성
export async function createCashRecordsForTransaction(transaction: any): Promise<void> {
    try {
        console.log('시재 기록 생성 시작:', {
            transactionId: transaction._id,
            patientName: transaction.patientName,
            paymentMethod: transaction.paymentMethod,
            paymentAmount: transaction.paymentAmount
        });

        // 개별 필드에서 현금 결제 확인 (기존 방식)
        if (transaction.paymentMethod === PAYMENT_METHODS.CASH && transaction.paymentAmount > 0) {
            console.log('개별 필드에서 현금 결제 감지:', {
                paymentMethod: transaction.paymentMethod,
                amount: transaction.paymentAmount
            });
            
            await createCashRecord({
                _id: transaction._id,
                transactionId: transaction._id,
                date: transaction.date,
                amount: transaction.paymentAmount,
                patientName: transaction.patientName
            });
            
            console.log('시재 기록 생성 완료 (개별 필드)');
            return;
        }

        // payments 배열에서 현금 결제 확인 (새로운 방식)
        if (transaction.payments && Array.isArray(transaction.payments)) {
            const cashPayments = transaction.payments.filter(
                (payment: any) => payment.paymentMethod === PAYMENT_METHODS.CASH
            );

            console.log('payments 배열에서 현금 결제 감지:', {
                totalPayments: transaction.payments.length,
                cashPayments: cashPayments.length
            });

            for (const payment of cashPayments) {
                await createCashRecord({
                    _id: transaction._id,
                    transactionId: transaction._id,
                    date: payment.date || transaction.date,
                    amount: payment.amount || payment.paymentAmount,
                    patientName: transaction.patientName
                });
            }
            
            if (cashPayments.length > 0) {
                console.log('시재 기록 생성 완료 (payments 배열)');
            }
        }

        // treatments 배열에서 현금 결제 확인 (추가 방식)
        if (transaction.treatments && Array.isArray(transaction.treatments)) {
            const cashTreatments = transaction.treatments.filter(
                (treatment: any) => treatment.paymentMethod === PAYMENT_METHODS.CASH
            );

            console.log('treatments 배열에서 현금 결제 감지:', {
                totalTreatments: transaction.treatments.length,
                cashTreatments: cashTreatments.length
            });

            for (const treatment of cashTreatments) {
                await createCashRecord({
                    _id: transaction._id,
                    transactionId: transaction._id,
                    date: treatment.date || transaction.date,
                    amount: treatment.paymentAmount,
                    patientName: transaction.patientName
                });
            }
            
            if (cashTreatments.length > 0) {
                console.log('시재 기록 생성 완료 (treatments 배열)');
            }
        }

        console.log('시재 기록 생성 과정 완료');
    } catch (error) {
        console.error('거래 내 현금 결제 시재 기록 생성 중 오류:', error);
        throw error;
    }
}

// 거래 업데이트 시 시재 기록들 업데이트
export async function updateCashRecordsForTransaction(
    oldTransaction: any,
    newTransaction: any
): Promise<void> {
    try {
        const oldCashPayments = oldTransaction.payments?.filter(
            (p: any) => p.paymentMethod === PAYMENT_METHODS.CASH
        ) || [];
        
        const newCashPayments = newTransaction.payments?.filter(
            (p: any) => p.paymentMethod === PAYMENT_METHODS.CASH
        ) || [];

        // 기존 현금 결제들 삭제
        for (const oldPayment of oldCashPayments) {
            await deleteCashRecord(oldTransaction._id, PAYMENT_METHODS.CASH);
        }

        // 새로운 현금 결제들 생성
        for (const newPayment of newCashPayments) {
            await createCashRecord({
                _id: newTransaction._id,
                transactionId: newTransaction._id,
                date: newPayment.date || newTransaction.date,
                amount: newPayment.amount,
                patientName: newTransaction.patientName
            });
        }
    } catch (error) {
        console.error('거래 업데이트 시 시재 기록 처리 중 오류:', error);
        throw error;
    }
} 