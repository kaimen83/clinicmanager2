const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Models
const Transaction = require('../models/Transaction');
const CashRecord = require('../models/CashRecord');
const CardDeposit = require('../models/CardDeposit');
const HometaxCashReceipt = require('../models/hometax_CashReceipt');

// Middleware
const auth = require('../middleware/auth');

// Utilities
const { calculateExpectedDepositDate } = require('./cardDeposits');
const { logActivity } = require('../utils/logger');

// Constants
const PAYMENT_METHODS = {
    CASH: '현금',
    CARD: '카드',
    TRANSFER: '계좌이체'
};

const CARD_DEPOSIT_STATUS = {
    PENDING: '미입금',
    COMPLETED: '입금완료'
};

// Helper Functions
const selectTransactionFields = [
    '_id',
    'date',
    'chartNumber',
    'patientName',
    'visitPath',
    'doctor',
    'treatmentType',
    'isNew',
    'isConsultation',
    'paymentMethod',
    'cardCompany',
    'cashReceipt',
    'paymentAmount',
    'notes',
    'createdAt'
];

/**
 * Format payment method for display
 * @param {string} method 
 * @param {string} cardCompany 
 * @returns {string}
 */
const formatPaymentMethod = (method, cardCompany) => {
    return method === PAYMENT_METHODS.CARD && cardCompany
        ? `${PAYMENT_METHODS.CARD}(${cardCompany})`
        : method;
};

/**
 * Create a CashRecord based on transaction
 * @param {Object} transaction 
 */
const createCashRecord = async (transaction) => {
    const cashRecord = new CashRecord({
        date: transaction.date,
        type: '수입',
        amount: transaction.paymentAmount,
        description: `${transaction.patientName} 현금결제`,
        transactionId: transaction._id
    });
    await cashRecord.save();
};

/**
 * Update CardDeposit based on transaction changes
 * @param {Object} oldTransaction 
 * @param {Object} newTransaction 
 * @param {Object} session 
 * @param {Object} userId 
 */
const updateCardDeposits = async (oldTransaction, newTransaction, session, userId) => {
    const {
        paymentMethod: oldPaymentMethod,
        cardCompany: oldCardCompany,
        paymentAmount: oldAmount,
        date: oldDate
    } = oldTransaction;

    const {
        paymentMethod: newPaymentMethod,
        cardCompany: newCardCompany,
        paymentAmount: newAmount,
        date: newDate
    } = newTransaction;

    const methodChanged = oldPaymentMethod !== newPaymentMethod;
    const cardCompanyChanged = oldCardCompany !== newCardCompany;
    const amountChanged = oldAmount !== newAmount;
    const dateChanged = oldDate.toISOString().split('T')[0] !== newDate;

    if (methodChanged || cardCompanyChanged || amountChanged || dateChanged) {
        // Remove transaction from existing CardDeposits
        const deposits = await CardDeposit.find({
            transactionIds: oldTransaction._id
        }).session(session);

        for (const deposit of deposits) {
            deposit.transactionIds = deposit.transactionIds.filter(
                id => id.toString() !== oldTransaction._id.toString()
            );

            if (deposit.transactionIds.length === 0) {
                await CardDeposit.deleteOne({ _id: deposit._id }).session(session);
            } else {
                const remainingTransactions = await Transaction.find({
                    _id: { $in: deposit.transactionIds }
                }).session(session);

                deposit.saleAmount = remainingTransactions.reduce(
                    (sum, t) => sum + t.paymentAmount,
                    0
                );
                await deposit.save({ session });
            }
        }

        // Add transaction to new CardDeposit if payment method is CARD
        if (newPaymentMethod === PAYMENT_METHODS.CARD) {
            let newDeposit = await CardDeposit.findOne({
                saleDate: new Date(newDate),
                cardCompany: newCardCompany
            }).session(session);

            if (newDeposit) {
                // 기존 문서에 createdBy 필드가 없다면 추가
                if (!newDeposit.createdBy) {
                    newDeposit.createdBy = userId;
                }
                if (!newDeposit.transactionIds.includes(newTransaction._id)) {
                    newDeposit.transactionIds.push(newTransaction._id);
                    newDeposit.saleAmount += Number(newAmount);
                    await newDeposit.save({ session });
                }
            } else {
                // 새로운 CardDeposit 생성 시 createdBy 필드 명시적 설정
                if (!userId) {
                    throw new Error('사용자 ID가 없습니다. CardDeposit을 생성할 수 없습니다.');
                }
                newDeposit = new CardDeposit({
                    cardCompany: newCardCompany,
                    saleDate: new Date(newDate),
                    saleAmount: Number(newAmount),
                    expectedDepositDate: calculateExpectedDepositDate(new Date(newDate)),
                    status: CARD_DEPOSIT_STATUS.PENDING,
                    transactionIds: [newTransaction._id],
                    createdBy: userId
                });
                await newDeposit.save({ session });
            }
        }
    }
};

/**
 * Log changes between old and new transaction
 * @param {Object} oldTransaction 
 * @param {Object} newTransaction 
 * @param {Object} userId 
 */
const logTransactionChanges = async (oldTransaction, newTransaction, userId) => {
    const changes = [];

    // Compare and log each field
    if (oldTransaction.isNew !== newTransaction.isNew) {
        changes.push(`신환여부: ${oldTransaction.isNew ? '신환' : '구환'} → ${newTransaction.isNew ? '신환' : '구환'}`);
    }

    if (oldTransaction.visitPath !== newTransaction.visitPath) {
        changes.push(`내원경로: ${oldTransaction.visitPath || '없음'} → ${newTransaction.visitPath || '없음'}`);
    }

    if (oldTransaction.doctor !== newTransaction.doctor) {
        changes.push(`진료의: ${oldTransaction.doctor} → ${newTransaction.doctor}`);
    }

    if (oldTransaction.treatmentType !== newTransaction.treatmentType) {
        changes.push(`진료내용: ${oldTransaction.treatmentType} → ${newTransaction.treatmentType}`);
    }

    const oldAmount = parseInt(oldTransaction.paymentAmount) || 0;
    const newAmount = parseInt(newTransaction.paymentAmount) || 0;
    if (oldAmount !== newAmount) {
        const diff = newAmount - oldAmount;
        const diffText = diff > 0 ? `증가: +${diff.toLocaleString()}원` : `감소: ${diff.toLocaleString()}원`;
        changes.push(`결제금액: ${oldAmount.toLocaleString()}원 → ${newAmount.toLocaleString()}원 (${diffText})`);
    }

    if (oldTransaction.paymentMethod !== newTransaction.paymentMethod) {
        changes.push(`결제방법: ${oldTransaction.paymentMethod} → ${newTransaction.paymentMethod}`);
    }

    if (oldTransaction.cardCompany !== newTransaction.cardCompany) {
        const oldCompany = oldTransaction.cardCompany || '없음';
        const newCompany = newTransaction.cardCompany || '없음';
        changes.push(`카드사: ${oldCompany} → ${newCompany}`);
    }

    if (
        oldTransaction.cashReceipt !== newTransaction.cashReceipt &&
        [PAYMENT_METHODS.CASH, PAYMENT_METHODS.TRANSFER].includes(newTransaction.paymentMethod)
    ) {
        changes.push(`현금영수증: ${oldTransaction.cashReceipt ? '발행' : '미발행'} → ${newTransaction.cashReceipt ? '발행' : '미발행'}`);
    }

    const oldDate = oldTransaction.date.toISOString().split('T')[0];
    if (oldDate !== newTransaction.date) {
        changes.push(`날짜: ${oldDate} → ${newTransaction.date}`);
    }

    if (oldTransaction.notes !== newTransaction.notes) {
        const oldNotes = oldTransaction.notes || '없음';
        const newNotes = newTransaction.notes || '없음';
        changes.push(`메모: ${oldNotes} → ${newNotes}`);
    }

    if (changes.length > 0) {
        await logActivity(
            userId,
            'update',
            'transaction',
            `${oldTransaction.chartNumber} ${oldTransaction.patientName} 거래 내역 수정`,
            {
                transactionId: oldTransaction._id,
                patientName: newTransaction.patientName,
                chartNumber: newTransaction.chartNumber,
                details: changes
            }
        );
    }
};

/**
 * Update CashRecord based on transaction changes
 * @param {Object} oldTransaction 
 * @param {Object} newTransaction 
 * @param {Object} session 
 */
const updateCashRecord = async (oldTransaction, newTransaction, session) => {
    const wasPaymentMethodCash = oldTransaction.paymentMethod === PAYMENT_METHODS.CASH;
    const isPaymentMethodCash = newTransaction.paymentMethod === PAYMENT_METHODS.CASH;
    const amountChanged = oldTransaction.paymentAmount !== newTransaction.paymentAmount;
    const dateChanged = oldTransaction.date.toISOString().split('T')[0] !== newTransaction.date;

    // 날짜 범위 설정
    const startDate = new Date(oldTransaction.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(oldTransaction.date);
    endDate.setHours(23, 59, 59, 999);

    // 기존 현금시재 기록 찾기
    const existingCashRecord = await CashRecord.findOne({
        transactionId: oldTransaction._id,
        type: '수입',
        date: {
            $gte: startDate,
            $lt: endDate
        }
    }).session(session);

    // Case 1: 현금 -> 다른 결제방식
    if (wasPaymentMethodCash && !isPaymentMethodCash) {
        if (existingCashRecord) {
            // 마감 여부 확인
            const isClosed = await CashRecord.isClosedForDate(existingCashRecord.date);
            if (isClosed) {
                throw new Error('마감된 날짜의 시재 기록은 수정할 수 없습니다.');
            }
            await CashRecord.deleteOne({ _id: existingCashRecord._id }).session(session);
        }
    }
    // Case 2: 다른 결제방식 -> 현금
    else if (!wasPaymentMethodCash && isPaymentMethodCash) {
        const cashRecord = new CashRecord({
            date: newTransaction.date,
            type: '수입',
            amount: newTransaction.paymentAmount,
            description: `${newTransaction.patientName} 현금결제`,
            transactionId: newTransaction._id
        });
        await cashRecord.save({ session });
    }
    // Case 3: 현금 -> 현금 (금액 또는 날짜 변경)
    else if (wasPaymentMethodCash && isPaymentMethodCash && (amountChanged || dateChanged)) {
        if (existingCashRecord) {
            // 마감 여부 확인
            const isClosed = await CashRecord.isClosedForDate(existingCashRecord.date);
            if (isClosed) {
                throw new Error('마감된 날짜의 시재 기록은 수정할 수 없습니다.');
            }

            if (dateChanged) {
                // 날짜가 변경된 경우 새로운 기록 생성
                await CashRecord.deleteOne({ _id: existingCashRecord._id }).session(session);
                const newCashRecord = new CashRecord({
                    date: newTransaction.date,
                    type: '수입',
                    amount: newTransaction.paymentAmount,
                    description: `${newTransaction.patientName} 현금결제`,
                    transactionId: newTransaction._id
                });
                await newCashRecord.save({ session });
            } else {
                // 금액만 변경된 경우 기존 기록 업데이트
                existingCashRecord.amount = newTransaction.paymentAmount;
                await existingCashRecord.save({ session });
            }
        }
    }
};

// Routes

/**
 * @route   GET /transactions
 * @desc    Retrieve all transactions
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
    try {

        let query = {};

        // 의사별 통계를 위한 날짜 범위 파라미터가 있는 경우
        if (req.query.doctor && req.query.startDate && req.query.endDate) {

            // UTC 기준 날짜 변환
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(req.query.endDate);
            startDate.setUTCHours(0, 0, 0, 0);
            endDate.setUTCHours(23, 59, 59, 999);


            query = {
                doctor: req.query.doctor,
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            };

        }

        const transactions = await Transaction.find(query)
            .select(selectTransactionFields)
            .lean()
            .sort({ date: -1 });


        // 의사별 통계 로깅
        if (req.query.doctor) {
            const doctorTransactions = transactions;
            
            // 날짜별 매출 집계
            const dailyRevenue = {};
            doctorTransactions.forEach(t => {
                const dateKey = new Date(t.date).toISOString().split('T')[0];
                dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (t.paymentAmount || 0);
            });


            // 전체 통계
            const totalStats = {
                의사: req.query.doctor,
                전체_거래_수: transactions.length,
                총_결제금액: doctorTransactions.reduce((sum, t) => sum + (t.paymentAmount || 0), 0),
                환자_수: new Set(doctorTransactions.map(t => t.chartNumber)).size,
                거래_상세: doctorTransactions.map(t => ({
                    날짜: new Date(t.date).toISOString().split('T')[0],
                    차트번호: t.chartNumber,
                    환자명: t.patientName,
                    금액: t.paymentAmount
                }))
            };

        }

        const formattedTransactions = transactions.map(transaction => ({
            ...transaction,
            paymentMethod: formatPaymentMethod(transaction.paymentMethod, transaction.cardCompany)
        }));

        res.json(formattedTransactions);
    } catch (err) {
        console.error('[거래내역 조회] 오류 발생:', err);
        res.status(500).json({
            message: '서버 오류가 발생했습니다.',
            error: err.message
        });
    }
});

/**
 * @route   GET /transactions/:id
 * @desc    Retrieve a single transaction by ID
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findById(id)
            .select(selectTransactionFields)
            .lean();

        if (!transaction) {
            return res.status(404).json({ message: '거래 내역을 찾을 수 없습니다.' });
        }

        res.json(transaction);
    } catch (err) {
        res.status(500).json({ message: '서버 오류가 발생했습니다.', error: err.message });
    }
});

/**
 * @route   POST /transactions
 * @desc    Create a new transaction
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { body, user } = req;
        const transactionData = {
            ...body,
            createdBy: user._id
        };

        const transaction = new Transaction(transactionData);
        await transaction.save({ session });

        // Handle CashRecord if payment method is CASH
        if (transaction.paymentMethod === PAYMENT_METHODS.CASH) {
            await createCashRecord(transaction);
        }

        const savedTransaction = await Transaction.findById(transaction._id)
            .select(selectTransactionFields)
            .lean()
            .session(session);

        // Log Activity
        await logActivity(
            user._id,
            'create',
            'transaction',
            `${savedTransaction.chartNumber} ${savedTransaction.patientName} 거래 내역 추가`,
            {
                transactionId: savedTransaction._id,
                patientName: savedTransaction.patientName,
                chartNumber: savedTransaction.chartNumber,
                details: [
                    `환자명: ${savedTransaction.patientName}`,
                    `차트번호: ${savedTransaction.chartNumber}`,
                    `결제금액: ${savedTransaction.paymentAmount.toLocaleString()}원`,
                    `결제방법: ${savedTransaction.paymentMethod}`,
                    `카드사: ${savedTransaction.cardCompany || '없음'}`,
                    `현금영수증: ${savedTransaction.cashReceipt ? '발행' : '미발행'}`,
                    `진료의: ${savedTransaction.doctor}`,
                    `진료내용: ${savedTransaction.treatmentType}`,
                    `날짜: ${savedTransaction.date.toISOString().split('T')[0]}`,
                    `메모: ${savedTransaction.notes || '없음'}`
                ]
            }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(201).json(savedTransaction);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: '입력값이 유효하지 않습니다.',
                errors: Object.values(err.errors).map(e => e.message)
            });
        }

        res.status(500).json({ message: '서버 오류가 발생했습니다.', error: err.message });
    }
});

/**
 * @route   PUT /transactions/:id
 * @desc    Update an existing transaction
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { body, user } = req;

        if (!user || !user._id) {
            throw new Error('사용자 인증 정보가 없습니다.');
        }

        // Retrieve and validate existing transaction
        const oldTransaction = await Transaction.findById(id).session(session);
        if (!oldTransaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: '거래를 찾을 수 없습니다.' });
        }

        // Create a snapshot of the old transaction for logging
        const oldTransactionSnapshot = { ...oldTransaction.toObject() };

        // Update transaction fields while preserving createdBy
        const { createdBy: existingCreatedBy } = oldTransaction;
        Object.assign(oldTransaction, body);
        oldTransaction.createdBy = existingCreatedBy;  // Preserve createdBy
        await oldTransaction.save({ session });

        // Handle CashRecord updates
        await updateCashRecord(oldTransactionSnapshot, oldTransaction, session);

        // Update CardDeposits based on changes
        await updateCardDeposits(oldTransactionSnapshot, oldTransaction, session, user._id);

        // Log Activity with changes
        await logTransactionChanges(oldTransactionSnapshot, oldTransaction, user._id);

        await session.commitTransaction();
        session.endSession();

        const updatedTransaction = await Transaction.findById(id)
            .select(selectTransactionFields)
            .lean();

        res.json(updatedTransaction);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        res.status(400).json({ message: err.message });
    }
});

/**
 * @route   DELETE /transactions/:id
 * @desc    Delete a transaction
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { user } = req;


        // 1. Retrieve transaction
        const transaction = await Transaction.findById(id).session(session);
        if (!transaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: '거래 내역을 찾을 수 없습니다.' });
        }


        // 2. Handle based on payment method
        if (transaction.paymentMethod === PAYMENT_METHODS.CARD) {

            const cardDeposit = await CardDeposit.findOne({
                transactionIds: transaction._id
            }).session(session);

            if (cardDeposit) {

                if (cardDeposit.status === CARD_DEPOSIT_STATUS.COMPLETED) {
                    console.error('입금 완료된 카드 거래 삭제 시도');
                    throw new Error('이미 입금 완료된 카드 거래는 삭제할 수 없습니다.');
                }

                // Remove transaction ID from CardDeposit
                cardDeposit.transactionIds = cardDeposit.transactionIds.filter(
                    tId => tId.toString() !== transaction._id.toString()
                );

                if (cardDeposit.transactionIds.length === 0) {
                    const deleteDepositResult = await CardDeposit.deleteOne({ _id: cardDeposit._id }).session(session);

                    if (deleteDepositResult.deletedCount === 0) {
                        throw new Error('카드 입금 정보 삭제 실패');
                    }
                } else {
                    // Recalculate saleAmount
                    const remainingTransactions = await Transaction.find({
                        _id: { $in: cardDeposit.transactionIds }
                    }).session(session);

                    cardDeposit.saleAmount = remainingTransactions.reduce(
                        (sum, t) => sum + t.paymentAmount,
                        0
                    );
                    await cardDeposit.save({ session });
                }
            } else {
            }
        } else if (transaction.paymentMethod === PAYMENT_METHODS.CASH) {

            // Define start and end of the transaction date
            const startDate = new Date(transaction.date);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(transaction.date);
            endDate.setHours(23, 59, 59, 999);

            const cashRecord = await CashRecord.findOne({
                transactionId: transaction._id,
                type: '수입',
                date: {
                    $gte: startDate,
                    $lt: endDate
                }
            }).session(session);

            if (cashRecord) {

                // Check if the cash record is closed
                const isClosed = await CashRecord.isClosedForDate(cashRecord.date);
                if (isClosed) {
                    throw new Error('마감된 날짜의 시재 기록은 삭제할 수 없습니다.');
                }

                const deleteResult = await CashRecord.deleteOne({ _id: cashRecord._id }).session(session);

                if (deleteResult.deletedCount === 0) {
                    throw new Error(`시재 기록 삭제 실패 (ID: ${cashRecord._id})`);
                }
            }
        }

        // 3. Delete the transaction
        const deleteResult = await Transaction.deleteOne({ _id: transaction._id }).session(session);
        if (deleteResult.deletedCount === 0) {
            throw new Error(`거래 내역 삭제 실패 (ID: ${transaction._id})`);
        }

        // 4. Log Activity
        await logActivity(
            user._id,
            'delete',
            'transaction',
            `${transaction.chartNumber} ${transaction.patientName} 거래 내역 삭제`,
            {
                transactionId: transaction._id,
                patientName: transaction.patientName,
                chartNumber: transaction.chartNumber,
                details: [
                    `환자명: ${transaction.patientName}`,
                    `차트번호: ${transaction.chartNumber}`,
                    `결제금액: ${transaction.paymentAmount.toLocaleString()}원`,
                    `결제방법: ${transaction.paymentMethod}`,
                    `카드사: ${transaction.cardCompany || '없음'}`,
                    `진료의: ${transaction.doctor}`,
                    `진료내용: ${transaction.treatmentType}`,
                    `날짜: ${transaction.date.toISOString().split('T')[0]}`,
                    `메모: ${transaction.notes || '없음'}`
                ]
            }
        );

        await session.commitTransaction();
        session.endSession();


        res.json({
            message: '거래 내역이 삭제되었습니다.',
            deletedTransaction: {
                id: transaction._id,
                paymentMethod: transaction.paymentMethod,
                amount: transaction.paymentAmount,
                date: transaction.date,
                cardCompany: transaction.cardCompany
            }
        });
    } catch (error) {
        console.error('거래 삭제 중 오류 발생:', error);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({
            message: error.message || '거래 내역 삭제에 실패했습니다.',
            error: error.message
        });
    }
});

/**
 * @route   POST /transactions/payments
 * @desc    Retrieve payments by patient
 * @access  Private
 */
router.post('/payments', auth, async (req, res) => {
    try {
        const { chartNumber, patientName } = req.body;

        const payments = await Transaction.find({
            chartNumber,
            patientName
        })
            .select('date paymentAmount paymentMethod cardCompany isConsultation')
            .sort({ date: -1 })
            .lean();

        res.json(payments);
    } catch (error) {
        console.error('수납 내역 조회 중 에러:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.', error: error.message });
    }
});

/**
 * @route   PATCH /transactions/:id/toggle-consultation
 * @desc    Toggle the isConsultation status of a transaction
 * @access  Private
 */
router.patch('/:id/toggle-consultation', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;

        // Retrieve the current transaction
        const currentTransaction = await Transaction.findById(id).session(session);
        if (!currentTransaction) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: '거래 내역을 찾을 수 없습니다.' });
        }

        // Toggle isConsultation
        currentTransaction.isConsultation = !currentTransaction.isConsultation;

        // Save the updated transaction
        await currentTransaction.save({ session });

        // Optionally, log the toggle action
        await logActivity(
            req.user._id,
            'update',
            'transaction',
            `${currentTransaction.chartNumber} ${currentTransaction.patientName} 상담수납 상태 토글`,
            {
                transactionId: currentTransaction._id,
                isConsultation: currentTransaction.isConsultation
            }
        );

        await session.commitTransaction();
        session.endSession();
        res.json(currentTransaction);
    } catch (error) {
        console.error('상담수납 상태 토글 중 에러:', error);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: '상담수납 상태 수정에 실패했습니다.', error: error.message });
    }
});

/**
 * @route   POST /transactions/cash-receipts
 * @desc    Retrieve cash and transfer payment transactions
 * @access  Private
 */
router.post('/cash-receipts', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        // 날짜를 UTC 기준으로 변환
        const startDateTime = new Date(startDate);
        startDateTime.setUTCHours(0, 0, 0, 0);
        const endDateTime = new Date(endDate);
        endDateTime.setUTCHours(23, 59, 59, 999);
        
        // 날짜 범위로 거래 내역 조회
        const transactions = await Transaction.find({
            date: {
                $gte: startDateTime,
                $lte: endDateTime
            },
            paymentMethod: { $in: ['현금', '계좌이체'] }
        }).sort({ date: 1 });

        let hometaxReceipts = [];
        try {
            // 홈택스 현금영수증 데이터 조회
            hometaxReceipts = await HometaxCashReceipt.find({
                transactionDate: {
                    $gte: startDateTime,
                    $lte: endDateTime
                }
            });
        } catch (modelError) {
            console.error('홈택스 현금영수증 조회 중 에러:', modelError);
        }

        // 날짜를 YYYY-MM-DD 형식으로 변환하는 함수
        const formatDate = (date) => {
            const d = new Date(date);
            d.setUTCHours(0, 0, 0, 0);
            return d.toISOString().split('T')[0];
        };

        // 거래 내역에 홈택스 확인 여부 추가
        const transactionsWithHometaxStatus = transactions.map(transaction => {
            const transactionData = transaction.toObject();
            
            // 해당 거래와 일치하는 홈택스 데이터 찾기
            const transactionDateStr = formatDate(transaction.date);
            const transactionAmount = Number(transaction.paymentAmount);

            // 개별 거래 비교
            const matchingHometaxReceipt = hometaxReceipts.find(receipt => {
                const receiptDateStr = formatDate(receipt.transactionDate);
                const receiptAmount = Number(receipt.totalAmount);
                const sameDate = receiptDateStr === transactionDateStr;
                const sameAmount = receiptAmount === transactionAmount;

                return sameDate && sameAmount;
            });

            // 일치하는 항목이 없으면 같은 날짜의 합산 금액과 비교
            if (!matchingHometaxReceipt) {
                // 같은 날짜, 같은 환자의 모든 거래 찾기
                const sameDatePatientTransactions = transactions.filter(t => 
                    formatDate(t.date) === transactionDateStr &&
                    t.chartNumber === transaction.chartNumber &&
                    t.patientName === transaction.patientName
                );

                if (sameDatePatientTransactions.length > 1) {
                    // 합산 금액 계산
                    const totalAmount = sameDatePatientTransactions.reduce((sum, t) => 
                        sum + Number(t.paymentAmount), 0
                    );

                    // 합산 금액과 일치하는 홈택스 데이터 찾기
                    const matchingByTotal = hometaxReceipts.find(receipt => {
                        const receiptDateStr = formatDate(receipt.transactionDate);
                        const receiptAmount = Number(receipt.totalAmount);
                        const sameDate = receiptDateStr === transactionDateStr;
                        const sameAmount = receiptAmount === totalAmount;

                        return sameDate && sameAmount;
                    });

                    transactionData.hometaxConfirmed = !!matchingByTotal;
                } else {
                    transactionData.hometaxConfirmed = false;
                }
            } else {
                transactionData.hometaxConfirmed = true;
            }
            
            return transactionData;
        });

        res.json(transactionsWithHometaxStatus);
    } catch (error) {
        console.error('현금/계좌이체 내역 조회 중 에러:', error);
        res.status(500).json({ 
            message: '현금/계좌이체 내역을 조회하는데 실패했습니다.',
            error: error.message 
        });
    }
});

/**
 * @route   POST /transactions/doctor-revenue
 * @desc    Calculate doctor's revenue for a specific period
 * @access  Private
 */
router.post('/doctor-revenue', auth, async (req, res) => {
    try {
        const { doctor, startDate, endDate } = req.body;


        // 날짜 변환
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);


        // MongoDB Aggregation을 사용하여 매출 집계
        const result = await Transaction.aggregate([
            {
                $match: {
                    doctor: doctor,
                    date: {
                        $gte: start,
                        $lte: end
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$paymentAmount" },
                    transactionCount: { $sum: 1 },
                    uniquePatients: { $addToSet: "$chartNumber" },
                    transactions: {
                        $push: {
                            date: "$date",
                            chartNumber: "$chartNumber",
                            patientName: "$patientName",
                            paymentAmount: "$paymentAmount"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalRevenue: 1,
                    transactionCount: 1,
                    uniquePatientCount: { $size: "$uniquePatients" },
                    transactions: 1
                }
            }
        ]);

        // 날짜별 매출 계산
        const dailyRevenue = {};
        if (result[0] && result[0].transactions) {
            result[0].transactions.forEach(t => {
                const dateKey = new Date(t.date).toISOString().split('T')[0];
                dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + t.paymentAmount;
            });
        }


        res.json({
            summary: result[0] || { totalRevenue: 0, transactionCount: 0, uniquePatientCount: 0 },
            dailyRevenue
        });
    } catch (error) {
        console.error('[의사매출집계] 오류:', error);
        res.status(500).json({ message: '매출 집계 중 오류가 발생했습니다.', error: error.message });
    }
});

// 홈텍스 동기화 API
router.post('/hometax/sync', auth, async (req, res) => {
    try {
        // 홈텍스 로그인 스크립트 실행
        const { spawn } = require('child_process');
        const path = require('path');
        
        const scriptPath = path.join(__dirname, '..', 'scripts', 'hometax_login.js');
        
        await new Promise((resolve, reject) => {
            const process = spawn('node', [scriptPath], {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let error = '';

            process.stderr.on('data', (data) => {
                error += data.toString();
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(error || '홈텍스 동기화 중 오류가 발생했습니다.'));
                } else {
                    resolve();
                }
            });
        });

        res.json({ message: '홈텍스 동기화가 완료되었습니다.' });
    } catch (error) {
        console.error('홈텍스 동기화 오류:', error);
        res.status(500).json({ error: error.message || '홈텍스 동기화 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
