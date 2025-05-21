const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');
const CashRecord = require('../models/CashRecord');
const { logActivity } = require('../utils/logger');

// 지출 목록 조회
router.get('/', auth, async (req, res) => {
    try {
        const expenses = await Expense.find()
            .sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        console.error('지출 목록 조회 중 에러:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 지출 추가
router.post('/', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const expense = new Expense({
            date: req.body.date,
            details: req.body.details,
            amount: req.body.amount,
            method: req.body.method,
            hasReceipt: req.body.hasReceipt,
            vendor: req.body.vendor,
            account: req.body.account,
            notes: req.body.notes,
            createdBy: req.user._id
        });

        const savedExpense = await expense.save({ session });

        if (req.body.method === '현금') {
            const cashRecord = new CashRecord({
                date: new Date(req.body.date),
                type: '지출',
                amount: Number(req.body.amount),
                description: req.body.details,
                expenseId: savedExpense._id
            });
            const savedCashRecord = await cashRecord.save({ session });

            savedExpense.cashRecordId = savedCashRecord._id;
            await savedExpense.save({ session });
        }

        await logActivity(
            req.user._id,
            'create',
            'expense',
            '지출 추가',
            {
                expenseId: savedExpense._id,
                details: [
                    `지출 내역: ${savedExpense.details}`,
                    `금액: ${savedExpense.amount.toLocaleString()}원`,
                    `지출 방법: ${savedExpense.method}`,
                    `거래처: ${savedExpense.vendor || '없음'}`,
                    `영수증: ${savedExpense.hasReceipt ? '있음' : '없음'}`,
                    `날짜: ${savedExpense.date.toISOString().split('T')[0]}`,
                    `메모: ${savedExpense.notes || '없음'}`
                ]
            }
        );

        await session.commitTransaction();
        res.status(201).json(savedExpense);

    } catch (error) {
        await session.abortTransaction();
        console.error('지출 추가 중 에러:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    } finally {
        session.endSession();
    }
});

// 지출 삭제
router.delete('/:id', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const expense = await Expense.findById(req.params.id).session(session);
        if (!expense) {
            await session.abortTransaction();
            return res.status(404).json({ message: '해당 지출 내역을 찾을 수 없습니다.' });
        }

        if (expense.method === '현금') {
            const deletedCashRecord = await CashRecord.findOneAndDelete(
                { expenseId: req.params.id },
                { session }
            );
            
            if (!deletedCashRecord) {
                console.error('현금 기록을 찾을 수 없음:', {
                    expenseId: req.params.id,
                    expense
                });
                await session.abortTransaction();
                return res.status(500).json({ 
                    message: '연결된 현금 기록을 찾을 수 없습니다.',
                    error: 'CASH_RECORD_NOT_FOUND'
                });
            }
        }

        await Expense.findByIdAndDelete(req.params.id, { session });
        
        await logActivity(
            req.user._id,
            'delete',
            'expense',
            '지출 삭제',
            {
                expenseId: expense._id,
                details: [
                    `지출 내역: ${expense.details}`,
                    `금액: ${expense.amount.toLocaleString()}원`,
                    `지출 방법: ${expense.method}`,
                    `거래처: ${expense.vendor || '없음'}`,
                    `영수증: ${expense.hasReceipt ? '있음' : '없음'}`,
                    `날짜: ${expense.date.toISOString().split('T')[0]}`,
                    `메모: ${expense.notes || '없음'}`
                ]
            }
        );

        await session.commitTransaction();
        res.json({ message: '지출이 성공적으로 삭제되었습니다.' });

    } catch (error) {
        await session.abortTransaction();
        console.error('지출 삭제 중 오류:', error);
        res.status(500).json({ 
            message: '지출 삭제에 실패했습니다.',
            error: error.message 
        });
    } finally {
        session.endSession();
    }
});

// 지출 수정
router.put('/:id', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const oldExpense = await Expense.findById(req.params.id).session(session);
        if (!oldExpense) {
            await session.abortTransaction();
            return res.status(404).json({ message: '지출을 찾을 수 없습니다.' });
        }

        const oldWasCash = oldExpense.method === '현금';
        const newIsCash = req.body.method === '현금';

        if (oldWasCash) {
            const deletedCashRecord = await CashRecord.findOneAndDelete(
                { expenseId: req.params.id },
                { session }
            );
            if (!deletedCashRecord) {
                await session.abortTransaction();
                return res.status(500).json({ 
                    message: '기존 현금 기록을 찾을 수 없습니다.',
                    error: 'CASH_RECORD_NOT_FOUND'
                });
            }
        }

        const updateData = {
            ...req.body,
            amount: Number(req.body.amount),
            createdBy: oldExpense.createdBy,
            cashRecordId: undefined
        };

        const updatedExpense = await Expense.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, session }
        );

        if (newIsCash) {
            const cashRecord = new CashRecord({
                date: new Date(req.body.date),
                type: '지출',
                amount: Number(req.body.amount),
                description: req.body.details,
                expenseId: req.params.id
            });
            const savedCashRecord = await cashRecord.save({ session });

            updatedExpense.cashRecordId = savedCashRecord._id;
            await updatedExpense.save({ session });
        }

        const changes = [];

        if (oldExpense.details !== req.body.details) {
            changes.push(`지출 내역: ${oldExpense.details} → ${req.body.details}`);
        }
        if (oldExpense.amount !== Number(req.body.amount)) {
            const diff = Number(req.body.amount) - oldExpense.amount;
            const diffText = diff > 0 ? `증가: +${diff.toLocaleString()}원` : `감소: ${diff.toLocaleString()}원`;
            changes.push(`금액: ${oldExpense.amount.toLocaleString()}원 → ${Number(req.body.amount).toLocaleString()}원 (${diffText})`);
        }
        if (oldExpense.method !== req.body.method) {
            changes.push(`지출 방법: ${oldExpense.method} → ${req.body.method}`);
        }
        if (oldExpense.vendor !== req.body.vendor) {
            const oldVendor = oldExpense.vendor || '없음';
            const newVendor = req.body.vendor || '없음';
            changes.push(`거래처: ${oldVendor} → ${newVendor}`);
        }
        if (oldExpense.hasReceipt !== req.body.hasReceipt) {
            changes.push(`영수증: ${oldExpense.hasReceipt ? '있음' : '없음'} → ${req.body.hasReceipt ? '있음' : '없음'}`);
        }
        if (oldExpense.date.toISOString().split('T')[0] !== req.body.date) {
            changes.push(`날짜: ${oldExpense.date.toISOString().split('T')[0]} → ${req.body.date}`);
        }
        if (oldExpense.notes !== req.body.notes) {
            changes.push(`메모: ${oldExpense.notes || '없음'} → ${req.body.notes || '없음'}`);
        }

        await logActivity(
            req.user._id,
            'update',
            'expense',
            '지출 수정',
            {
                expenseId: req.params.id,
                changes: changes
            }
        );

        await session.commitTransaction();
        res.json(updatedExpense);

    } catch (error) {
        await session.abortTransaction();
        console.error('지출 수정 중 오류:', error);
        res.status(500).json({ 
            message: '지출 수정에 실패했습니다.',
            error: error.message 
        });
    } finally {
        session.endSession();
    }
});

// 지출 상세 정보 조회
router.get('/:id', auth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: '유효하지 않은 지출 ID입니다.' });
        }

        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ message: '해당 지출 내역을 찾을 수 없습니다.' });
        }

        res.json(expense);
    } catch (error) {
        console.error('지출 조회 중 에러:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 월별 지출 데이터 조회 라우트 추가
router.get('/monthly/:month', auth, async (req, res) => {
    try {
        const [year, month] = req.params.month.split('-');
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const expenses = await Expense.find({
            date: {
                $gte: startDate,
                $lte: endDate
            },
            vendor: { $exists: true, $ne: '' } // 거래처가 있는 지출만
        }).sort({ date: -1 });

        // 거래처별로 데이터 그룹화
        const vendorMap = new Map();
        expenses.forEach(expense => {
            if (!vendorMap.has(expense.vendor)) {
                vendorMap.set(expense.vendor, {
                    name: expense.vendor,
                    totalAmount: 0,
                    transactionCount: 0,
                    transactions: []
                });
            }
            const vendorData = vendorMap.get(expense.vendor);
            vendorData.totalAmount += expense.amount;
            vendorData.transactionCount += 1;
            vendorData.transactions.push({
                date: expense.date,
                details: expense.details,
                amount: expense.amount,
                method: expense.method
            });
        });

        const responseData = {
            totalVendors: vendorMap.size,
            totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
            vendors: Array.from(vendorMap.values())
        };

        res.json(responseData);
    } catch (error) {
        console.error('월별 지출 데이터 조회 중 에러:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 기간별 지출 데이터 조회
router.get('/period/:period', auth, async (req, res) => {
    try {
        const { period } = req.params;
        const now = new Date();
        let startDate, endDate = now;

        // 기간 설정
        switch (period) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                break;
            default:
                return res.status(400).json({ message: '유효하지 않은 기간입니다.' });
        }

        const expenses = await Expense.find({
            date: {
                $gte: startDate,
                $lte: endDate
            },
            vendor: { $exists: true, $ne: '' } // 거래처가 있는 지출만
        }).sort({ date: -1 });

        // 거래처별로 ��이터 그룹화
        const vendorMap = new Map();
        expenses.forEach(expense => {
            if (!vendorMap.has(expense.vendor)) {
                vendorMap.set(expense.vendor, {
                    name: expense.vendor,
                    totalAmount: 0,
                    transactionCount: 0,
                    transactions: []
                });
            }
            const vendorData = vendorMap.get(expense.vendor);
            vendorData.totalAmount += expense.amount;
            vendorData.transactionCount += 1;
            vendorData.transactions.push({
                date: expense.date,
                details: expense.details,
                amount: expense.amount,
                method: expense.method
            });
        });

        const responseData = {
            totalVendors: vendorMap.size,
            totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
            vendors: Array.from(vendorMap.values())
        };

        res.json(responseData);
    } catch (error) {
        console.error('기간별 지출 데이터 조회 중 에러:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router; 