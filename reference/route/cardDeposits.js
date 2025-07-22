const express = require('express');
const router = express.Router();
const CardDeposit = require('../models/CardDeposit');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const auth = require('../middleware/auth');
const XLSX = require('xlsx');
const DailyActualCardDeposit = require('../models/DailyActualCardDeposit');

// 입금예정일 계산 함수
const calculateExpectedDepositDate = (saleDate) => {
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

// 카드 입금 정보 업데이트 또는 삭제 함수
const updateOrDeleteCardDeposit = async (deposit) => {

    if (!deposit.transactionIds || deposit.transactionIds.length === 0) {
        await CardDeposit.deleteOne({ _id: deposit._id });
        return;
    }

    // 남은 거래들 조회 (카드 결제만)
    const transactions = await Transaction.find({
        _id: { $in: deposit.transactionIds },
        paymentMethod: '카드'
    });
    
    
    if (transactions.length === 0) {
        await CardDeposit.deleteOne({ _id: deposit._id });
        return;
    }

    // 카드사 확인 및 처리
    const cardCompanies = [...new Set(transactions.map(t => t.cardCompany))];

    if (cardCompanies.length > 1) {
        await CardDeposit.deleteOne({ _id: deposit._id });

        // 카드사별로 새로운 입금 정보 생성
        for (const company of cardCompanies) {
            const companyTransactions = transactions.filter(t => t.cardCompany === company);
            const saleAmount = companyTransactions.reduce((sum, t) => sum + t.paymentAmount, 0);

            const newDeposit = new CardDeposit({
                cardCompany: company,
                saleDate: deposit.saleDate,
                saleAmount: saleAmount,
                expectedDepositDate: calculateExpectedDepositDate(deposit.saleDate),
                status: '미입금',
                transactionIds: companyTransactions.map(t => t._id),
                createdBy: deposit.createdBy
            });
            await newDeposit.save();
        }
    } else {
        // 단일 카드사의 경우 기존 정보 업데이트
        const saleAmount = transactions.reduce((sum, t) => sum + t.paymentAmount, 0);

        deposit.cardCompany = cardCompanies[0];
        deposit.saleAmount = saleAmount;
        deposit.transactionIds = transactions.map(t => t._id);
        
        await deposit.save();
    }
};

// 거래 ID로 관련 카드 입금 정보 동기화
const synchronizeCardDeposit = async (transactionId, userId) => {
    try {
        
        // 해당 거래가 포함된 카드 입금 정보 찾기
        const deposits = await CardDeposit.find({
            transactionIds: transactionId
        });


        // 거래 정보 조회
        const transaction = await Transaction.findById(transactionId);
        
        if (!transaction) {
            // 모든 관련 입금 정보에서 해당 거래 ID 제거
            for (const deposit of deposits) {
                deposit.transactionIds = deposit.transactionIds.filter(id => id.toString() !== transactionId);
                if (deposit.transactionIds.length === 0) {
                    await CardDeposit.deleteOne({ _id: deposit._id });
                } else {
                    // 남은 거래들의 총액 재계산
                    const remainingTransactions = await Transaction.find({
                        _id: { $in: deposit.transactionIds }
                    });
                    deposit.saleAmount = remainingTransactions.reduce((sum, t) => sum + t.paymentAmount, 0);
                    await deposit.save();
                }
            }
            return;
        }

        // 카드 결제가 아닌 경우 입금 정보에서 제거
        if (transaction.paymentMethod !== '카드') {
            for (const deposit of deposits) {
                await updateOrDeleteCardDeposit(deposit);
            }
            return;
        }

        // 기존 입금 정보가 있는 경우
        if (deposits.length > 0) {
            for (const deposit of deposits) {
                await updateOrDeleteCardDeposit(deposit);
            }
        } else {
            // 같은 날짜, 같은 카드사의 입금 정보 찾기
            const sameGroupDeposit = await CardDeposit.findOne({
                saleDate: transaction.date,
                cardCompany: transaction.cardCompany,
                createdBy: userId
            });

            if (sameGroupDeposit) {
                sameGroupDeposit.transactionIds.push(transactionId);
                sameGroupDeposit.saleAmount += transaction.paymentAmount;
                await sameGroupDeposit.save();
            } else {
                const newDeposit = new CardDeposit({
                    cardCompany: transaction.cardCompany,
                    saleDate: transaction.date,
                    saleAmount: transaction.paymentAmount,
                    expectedDepositDate: calculateExpectedDepositDate(transaction.date),
                    status: '미입금',
                    transactionIds: [transactionId],
                    createdBy: userId
                });
                await newDeposit.save();
            }
        }
        
    } catch (error) {
        console.error('카드 입금 정보 동기화 오류:', error);
        throw error;
    }
};

// 카드 매출/입금 목록 조회 (일별/월별)
router.get('/', auth, async (req, res) => {
    try {
        const { startDate, endDate, view = 'daily' } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                message: '시작일자와 종료일자는 필수입니다.' 
            });
        }

        // Transaction 데이터 조회
        const transactions = await Transaction.find({
            paymentMethod: '카드',
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).sort({ date: 1 });

        // 날짜별, 카드사별로 그룹화
        const groupedTransactions = transactions.reduce((acc, trans) => {
            if (!trans.cardCompany) {
                return acc;
            }

            const dateKey = trans.date.toISOString().split('T')[0];
            const cardKey = trans.cardCompany;
            const key = `${dateKey}-${cardKey}`;

            if (!acc[key]) {
                acc[key] = {
                    date: trans.date,
                    cardCompany: trans.cardCompany,
                    transactions: []
                };
            }
            acc[key].transactions.push(trans);
            return acc;
        }, {});

        // 각 그룹에 대해 CardDeposit 데이터 생성 또는 업데이트
        for (const key in groupedTransactions) {
            const group = groupedTransactions[key];
            
            const transactionIds = group.transactions.map(t => t._id);
            const saleAmount = group.transactions.reduce((sum, t) => sum + t.paymentAmount, 0);

            try {
                // 기존 데이터 확인
                const existingDeposit = await CardDeposit.findOne({
                    saleDate: group.date,
                    cardCompany: group.cardCompany
                });

                const expectedDepositDate = calculateExpectedDepositDate(group.date);

                const deposit = await CardDeposit.findOneAndUpdate(
                    {
                        saleDate: group.date,
                        cardCompany: group.cardCompany
                    },
                    {
                        $set: {
                            saleAmount,
                            transactionIds,
                            expectedDepositDate
                        },
                        $setOnInsert: {
                            status: '미입금',
                            actualDepositAmount: null,
                            fee: null
                        }
                    },
                    {
                        upsert: true,
                        new: true,
                        runValidators: true
                    }
                );

            } catch (error) {
                throw error;
            }
        }

        // 저장된 데이터 조회
        const matchStage = {
            saleDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        const deposits = await CardDeposit.find({
            saleDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).populate('transactionIds');

        res.json(deposits);
    } catch (error) {
        res.status(500).json({ 
            message: '데이터 조회에 실패했습니다.',
            error: error.message 
        });
    }
});

// 카드 입금 정보 등록
router.post('/', auth, async (req, res) => {
    try {
        const { cardCompany, saleDate, transactionIds } = req.body;

        // 해당 거래 내역의 총 금액 계산
        const transactions = await Transaction.find({
            _id: { $in: transactionIds },
            cardCompany,
            paymentMethod: '카드'
        });

        const saleAmount = transactions.reduce((sum, t) => sum + t.paymentAmount, 0);

        const deposit = new CardDeposit({
            ...req.body,
            saleAmount,
            createdBy: req.user._id
        });

        await deposit.save();
        res.status(201).json(deposit);
    } catch (error) {
        res.status(500).json({ message: '입금 정보 등록에 실패했습니다.' });
    }
});

// 카드 입금 정보 수정
router.patch('/:id', auth, async (req, res) => {
    try {
        const updates = req.body;

        // 입금완료 상태로 변경 시 입금액 처리
        if (updates.status === '입금완료') {
            if (updates.actualDepositAmount === undefined) {
                return res.status(400).json({ message: '입금액은 필수입니다.' });
            }
            if (updates.actualDepositDate === undefined) {
                return res.status(400).json({ message: '입금일자는 필수입니다.' });
            }
        }

        // 1. 먼저 현재 문서 조회
        const cardDeposit = await CardDeposit.findById(req.params.id);

        if (!cardDeposit) {
            return res.status(404).json({ message: '입금 정보를 찾을 수 없습니다.' });
        }

        const previousStatus = cardDeposit.status;
        const previousDepositDate = cardDeposit.actualDepositDate;

        // 2. 업데이트할 필드만 변경 (createdBy 제외)
        Object.keys(updates).forEach(key => {
            if (key !== 'createdBy') {  // createdBy는 업데이트하지 않음
                cardDeposit[key] = updates[key];
            }
        });

        // createdBy가 없는 경우 현재 사용자의 ID로 설정
        if (!cardDeposit.createdBy) {
            cardDeposit.createdBy = req.user._id;
        }

        // DailyActualCardDeposit 처리
        // 이전 상태가 입금완료였고, 새로운 상태가 다른 경우 (입금완료 -> 미입금/입금보류)
        if (previousStatus === '입금완료' && cardDeposit.status !== '입금완료') {
            const previousDailyDeposit = await DailyActualCardDeposit.findOne({
                depositDate: previousDepositDate
            });

            if (previousDailyDeposit) {
                // deposits 배열에서 해당 cardDepositId 제거
                previousDailyDeposit.deposits = previousDailyDeposit.deposits.filter(
                    deposit => deposit.cardDepositId.toString() !== cardDeposit._id.toString()
                );

                // totalAmount 재계산
                previousDailyDeposit.totalAmount = previousDailyDeposit.deposits.reduce(
                    (sum, deposit) => sum + deposit.amount, 
                    0
                );

                if (previousDailyDeposit.deposits.length === 0) {
                    await DailyActualCardDeposit.deleteOne({ _id: previousDailyDeposit._id });
                } else {
                    await previousDailyDeposit.save();
                }
            }
        }
        // 새로운 상태가 입금완료인 경우 (미입금/입금보류 -> 입금완료)
        else if (cardDeposit.status === '입금완료') {
            // 입금일자의 시작과 끝 시간 설정 (KST 기준)
            const depositDateStart = new Date(cardDeposit.actualDepositDate);
            depositDateStart.setHours(0, 0, 0, 0);
            const depositDateEnd = new Date(cardDeposit.actualDepositDate);
            depositDateEnd.setHours(23, 59, 59, 999);

            if (updates.bulkDeposit) {
                // 일괄입금인 경우 atomic operation 사용
                const result = await DailyActualCardDeposit.findOneAndUpdate(
                    {
                        depositDate: {
                            $gte: depositDateStart,
                            $lte: depositDateEnd
                        }
                    },
                    {
                        $setOnInsert: {
                            depositDate: depositDateStart
                        },
                        $addToSet: {
                            deposits: {
                                cardDepositId: cardDeposit._id,
                                amount: cardDeposit.actualDepositAmount,
                                cardCompany: cardDeposit.cardCompany
                            }
                        },
                        $inc: {
                            totalAmount: cardDeposit.actualDepositAmount
                        }
                    },
                    {
                        new: true,
                        upsert: true
                    }
                );
            } else {
                // 단일 입금인 경우 기존 로직 사용
                let dailyDeposit = await DailyActualCardDeposit.findOne({
                    depositDate: {
                        $gte: depositDateStart,
                        $lte: depositDateEnd
                    }
                });

                if (!dailyDeposit) {
                    dailyDeposit = new DailyActualCardDeposit({
                        depositDate: depositDateStart,
                        totalAmount: 0,
                        deposits: []
                    });
                }

                // 이미 존재하는 deposit 제거 (중복 방지)
                dailyDeposit.deposits = dailyDeposit.deposits.filter(
                    deposit => deposit.cardDepositId.toString() !== cardDeposit._id.toString()
                );

                // 새로운 deposit 추가
                dailyDeposit.deposits.push({
                    cardDepositId: cardDeposit._id,
                    amount: cardDeposit.actualDepositAmount,
                    cardCompany: cardDeposit.cardCompany
                });

                // totalAmount 재계산
                dailyDeposit.totalAmount = dailyDeposit.deposits.reduce(
                    (sum, deposit) => sum + deposit.amount,
                    0
                );

                await dailyDeposit.save();
            }
        }

        // 3. 변경사항 저장
        const updatedDeposit = await cardDeposit.save();
        
        res.json(updatedDeposit);
    } catch (error) {
        res.status(500).json({ 
            message: '입금 정보 수정에 실패했습니다.',
            error: error.message 
        });
    }
});

// 엑셀 다운로드
router.get('/export', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const deposits = await CardDeposit.find({
            createdBy: req.user._id,
            saleDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).populate('transactionIds');

        const workbook = XLSX.utils.book_new();
        
        const data = deposits.map(d => ({
            '매출일자': d.saleDate.toLocaleDateString(),
            '카드사': d.cardCompany,
            '매출금액': d.saleAmount,
            '입금예정일': d.expectedDepositDate.toLocaleDateString(),
            '실제입금일': d.actualDepositDate ? d.actualDepositDate.toLocaleDateString() : '',
            '실제입금액': d.actualDepositAmount || '',
            '수수료': d.fee || '',
            '상태': d.status,
            '보류사유': d.holdReason || ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, '카드매출입금현황');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=카드매출입금현황_${startDate}_${endDate}.xlsx`);
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ message: '엑셀 다운로드에 실패했습니다.' });
    }
});

// 트랜잭션 ID로 카드 입금 정보 조회
router.get('/by-transaction/:transactionId', auth, async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const cardDeposit = await CardDeposit.findOne({
            transactionIds: transactionId
        }).populate('transactionIds');

        if (!cardDeposit) {
            return res.status(404).json({ message: '해당 거래의 카드 입금 정보를 찾을 수 없습니다.' });
        }

        res.json(cardDeposit);
    } catch (error) {
        console.error('카드 입금 정보 조회 오류:', error);
        res.status(500).json({ 
            message: '카드 입금 정보 조회에 실패했습니다.',
            error: error.message 
        });
    }
});

// 트랜잭션 변경사항 동기화 API
router.post('/sync-transaction', auth, async (req, res) => {
    
    try {
        const { transactionId } = req.body;
        
        if (!transactionId) {
            return res.status(400).json({ message: '거래 ID가 필요합니다.' });
        }

        await synchronizeCardDeposit(transactionId, req.user._id);
        
        res.json({ message: '동기화가 완료되었습니다.' });
    } catch (error) {
        res.status(500).json({ 
            message: '동기화에 실패했습니다.',
            error: error.message 
        });
    }
});

// 카드 입금 정보 삭제
router.delete('/:id', auth, async (req, res) => {
    try {
        const cardDeposit = await CardDeposit.findOne({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!cardDeposit) {
            return res.status(404).json({ message: '입금 정보를 찾을 수 없습니다.' });
        }

        await CardDeposit.deleteOne({ _id: req.params.id });
        
        res.json({ message: '입금 정보가 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ 
            message: '입금 정보 삭제에 실패했습니다.',
            error: error.message 
        });
    }
});

// 크롤링 데이터 처리 라우트
router.post('/process-crawled-data', auth, async (req, res) => {
    try {
        const { deposits } = req.body;
        const processedResults = [];
        const errors = [];

        // 카드사 이름 매핑
        const cardCompanyMapping = {
            'KB카드': '국민카드',
            '농협NH카드': '농협카드'
        };

        // 전체 미입금 데이터 조회 (createdBy 조건 제거)
        const allUnpaidDeposits = await CardDeposit.find({
            status: '미입금'
        });

        for (const deposit of deposits) {
            try {
                // 금액에서 콤마 제거하고 숫자로 변환
                const saleAmount = parseInt(deposit.매출금액.replace(/[^0-9]/g, ''));
                
                // 카드사 이름 매핑
                const cardCompany = cardCompanyMapping[deposit.카드사] || deposit.카드사;

                // 미입금 상태인 데이터 찾기 (createdBy 조건 제거)
                const existingDeposit = await CardDeposit.findOne({
                    cardCompany: cardCompany,
                    saleAmount: saleAmount,
                    status: '미입금',
                    $or: [
                        { actualDepositAmount: { $exists: false } },
                        { actualDepositAmount: null }
                    ]
                });

                if (existingDeposit) {
                    // 실제 입금액이 있는 경우에만 입금 처리
                    const actualAmount = parseInt(deposit.실입금액.replace(/[^0-9]/g, ''));
                    if (!isNaN(actualAmount) && actualAmount > 0) {
                        const fee = existingDeposit.saleAmount - actualAmount;

                        // 날짜 처리
                        const depositDate = new Date(deposit.날짜);
                        depositDate.setHours(0, 0, 0, 0); // 시간을 00:00:00으로 설정

                        // 해당 날짜에 이미 처리된 입금이 있는지 확인
                        const existingDailyDeposit = await DailyActualCardDeposit.findOne({
                            'deposits.cardDepositId': existingDeposit._id
                        });

                        if (existingDailyDeposit) {
                            continue;
                        }

                        // 입금 처리
                        existingDeposit.status = '입금완료';
                        existingDeposit.actualDepositAmount = actualAmount;
                        existingDeposit.actualDepositDate = depositDate;
                        existingDeposit.fee = fee;
                        
                        await existingDeposit.save();
                        
                        // DailyActualCardDeposit 처리
                        const startOfDay = new Date(depositDate);
                        startOfDay.setHours(0, 0, 0, 0);
                        const endOfDay = new Date(depositDate);
                        endOfDay.setHours(23, 59, 59, 999);

                        let dailyDeposit = await DailyActualCardDeposit.findOne({
                            depositDate: {
                                $gte: startOfDay,
                                $lte: endOfDay
                            }
                        });

                        if (!dailyDeposit) {
                            dailyDeposit = new DailyActualCardDeposit({
                                depositDate: startOfDay,  // 항상 일자의 시작으로 저장
                                totalAmount: 0,
                                deposits: []
                            });
                        }

                        // cardDepositId를 기준으로 중복 제거
                        const uniqueDeposits = [];
                        const seenIds = new Set();
                        
                        // 기존 deposits에서 중복 제거
                        for (const deposit of dailyDeposit.deposits) {
                            const idString = deposit.cardDepositId.toString();
                            if (!seenIds.has(idString)) {
                                seenIds.add(idString);
                                uniqueDeposits.push(deposit);
                            }
                        }

                        // 새로운 deposit이 아직 없는 경우에만 추가
                        const newDepositId = existingDeposit._id.toString();
                        if (!seenIds.has(newDepositId)) {
                            uniqueDeposits.push({
                                cardDepositId: existingDeposit._id,
                                amount: actualAmount,
                                cardCompany: existingDeposit.cardCompany
                            });
                        }

                        // 중복이 제거된 deposits로 업데이트
                        dailyDeposit.deposits = uniqueDeposits;

                        // totalAmount 재계산
                        dailyDeposit.totalAmount = uniqueDeposits.reduce(
                            (sum, deposit) => sum + deposit.amount,
                            0
                        );

                        await dailyDeposit.save();
                        
                        processedResults.push({
                            id: existingDeposit._id,
                            status: 'success',
                            message: '입금 처리 완료',
                            data: {
                                originalCardCompany: deposit.카드사,
                                mappedCardCompany: cardCompany,
                                saleAmount: existingDeposit.saleAmount,
                                actualAmount: actualAmount,
                                fee: fee
                            }
                        });
                    }
                } else {
                    // 비슷한 금액의 미입금 데이터가 있는지 확인 (createdBy 조건 제거)
                    const similarAmountDeposits = await CardDeposit.find({
                        cardCompany: cardCompany,
                        status: '미입금',
                        saleAmount: {
                            $gte: saleAmount * 1.0,
                            $lte: saleAmount * 1.0
                        }
                    });

                    errors.push({
                        data: {
                            originalCardCompany: deposit.카드사,
                            mappedCardCompany: cardCompany,
                            saleAmount: saleAmount,
                            date: deposit.날짜
                        },
                        error: '매칭되는 미입금 데이터를 찾을 수 없습니다.'
                    });
                }
            } catch (error) {
                errors.push({
                    data: deposit,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            processed: processedResults,
            errors: errors
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '데이터 처리 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// 크롤링 실행 라우트
router.post('/crawl', auth, async (req, res) => {
    try {
        const runCrawler = require('../scripts/runCrawler');
        const result = await runCrawler();

        if (!result.success) {
            throw new Error(result.message || '크롤링 실패');
        }

        res.json({
            success: true,
            message: '크롤링이 완료되었습니다.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || '크롤링 중 오류가 발생했습니다.'
        });
    }
});

module.exports = router;
module.exports.calculateExpectedDepositDate = calculateExpectedDepositDate;
