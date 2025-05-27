const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ImplantProduct = require('../models/ImplantProduct');
const ImplantInventoryLog = require('../models/ImplantInventoryLog');

// 임플란트 제품 목록 조회
router.get('/', auth, async (req, res) => {
    try {
        const products = await ImplantProduct.find().sort({ category: 1, name: 1 });
        res.json(products);
    } catch (error) {
        console.error('임플란트 제품 조회 중 에러:', error);
        res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
});

// 통계 데이터 조회
router.get('/statistics', auth, async (req, res) => {
    try {
        const { startDate, endDate, category, usage, view, productName } = req.query;
        
        const query = {};
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate + 'T23:59:59.999Z')
            };
        }

        // 카테고리 필터
        if (category) {
            const products = await ImplantProduct.find({ category });
            query.productId = { $in: products.map(p => p._id) };
        }

        // 사용처 필터
        if (usage) {
            const products = await ImplantProduct.find({ usage });
            if (query.productId) {
                // 이미 카테고리 필터가 적용된 경우, 교집합 찾기
                const usageProductIds = products.map(p => p._id.toString());
                query.productId.$in = query.productId.$in
                    .filter(id => usageProductIds.includes(id.toString()));
            } else {
                query.productId = { $in: products.map(p => p._id) };
            }
        }

        // 품목명 필터
        if (productName) {
            const products = await ImplantProduct.find({ name: productName });
            if (query.productId) {
                // 이미 다른 필터가 적용된 경우, 교집합 찾기
                const nameProductIds = products.map(p => p._id.toString());
                query.productId.$in = query.productId.$in
                    .filter(id => nameProductIds.includes(id.toString()));
            } else {
                query.productId = { $in: products.map(p => p._id) };
            }
        }

        const logs = await ImplantInventoryLog.find(query)
            .populate('productId')
            .sort({ date: -1 });

        // 통계 데이터 계산
        const statistics = {
            totalUsage: 0,
            totalAmount: 0,
            totalStockIn: 0,
            totalStockInAmount: 0,
            totalDisposal: 0,
            activities: [],
            productStats: []
        };

        // 활동 내역 및 통계 계산
        logs.forEach(log => {
            if (log.type === 'OUT') {
                statistics.totalUsage += log.quantity;
                statistics.totalAmount += log.quantity * log.productId.price;
                if (log.outReason === '폐기') {
                    statistics.totalDisposal += log.quantity;
                }
            } else {
                statistics.totalStockIn += log.quantity;
                statistics.totalStockInAmount += log.quantity * log.productId.price;
            }

            statistics.activities.push({
                _id: log._id,
                date: log.date,
                type: log.type,
                category: log.productId.category,
                productName: log.productId.name,
                specification: log.productId.specification,
                quantity: log.quantity,
                patientName: log.patientName,
                doctor: log.doctor,
                outReason: log.outReason,
                notes: log.notes
            });
        });

        // 품목별 통계 계산
        if (view === 'product') {
            const products = await ImplantProduct.find();
            for (const product of products) {
                const productLogs = logs.filter(log => 
                    log.productId._id.toString() === product._id.toString()
                );

                const totalUsage = productLogs
                    .filter(log => log.type === 'OUT')
                    .reduce((sum, log) => sum + log.quantity, 0);

                const totalAmount = totalUsage * product.price;

                if (totalUsage > 0) {
                    statistics.productStats.push({
                        _id: product._id,
                        category: product.category,
                        name: product.name,
                        specification: product.specification,
                        usage: product.usage,
                        totalUsage,
                        totalAmount,
                        activities: productLogs.map(log => ({
                            date: log.date,
                            type: log.type,
                            quantity: log.quantity,
                            patientName: log.patientName,
                            doctor: log.doctor,
                            outReason: log.outReason,
                            notes: log.notes
                        }))
                    });
                }
            }
        }

        res.json(statistics);
    } catch (error) {
        console.error('통계 데이터 조회 중 에러:', error);
        res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
});

// 임플란트 제품 등록
router.post('/', auth, async (req, res) => {
    try {
        const { category, name, specification, price, usage } = req.body;
        
        const product = new ImplantProduct({
            category,
            name,
            specification,
            price,
            usage
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error('임플란트 제품 등록 중 오류:', error);
        res.status(400).json({ message: error.message || '임플란트 제품 등록에 실패했습니다.' });
    }
});

// 임플란트 제품 삭제
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await ImplantProduct.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: '해당 제품을 찾을 수 없습니다.' });
        }
        res.json({ message: '제품이 삭제되었습니다.' });
    } catch (error) {
        console.error('임플란트 제품 삭제 중 오류:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 입고 처리
router.post('/:id/stock-in', auth, async (req, res) => {
    try {
        const { quantity, notes, date } = req.body;
        const product = await ImplantProduct.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
        }

        // 재고 업데이트
        await product.updateStock(quantity);

        // 입고 기록 생성
        const log = new ImplantInventoryLog({
            productId: product._id,
            type: 'IN',
            quantity,
            notes,
            date: date ? new Date(date) : undefined,
            userId: req.user._id
        });
        await log.save();

        res.json({ message: '입고가 완료되었습니다.', product });
    } catch (error) {
        console.error('입고 처리 중 에러:', error);
        res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
});

// 출고 처리
router.post('/:id/stock-out', auth, async (req, res) => {
    try {
        const { quantity, chartNumber, patientName, doctor, outReason, notes, date } = req.body;
        const product = await ImplantProduct.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ message: '재고가 부족합니다.' });
        }

        // 재고 업데이트
        await product.updateStock(-quantity);

        // 출고 기록 생성
        const log = new ImplantInventoryLog({
            productId: product._id,
            type: 'OUT',
            quantity,
            chartNumber,
            patientName,
            doctor,
            outReason,
            notes,
            date: date ? new Date(date) : undefined,
            userId: req.user._id
        });
        await log.save();

        res.json({ message: '출고가 완료되었습니다.', product });
    } catch (error) {
        console.error('출고 처리 중 에러:', error);
        res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
});

// 활동 내역 삭제
router.delete('/activities/:id', auth, async (req, res) => {
    try {
        const log = await ImplantInventoryLog.findById(req.params.id);
        if (!log) {
            return res.status(404).json({ message: '활동 내역을 찾을 수 없습니다.' });
        }

        const product = await ImplantProduct.findById(log.productId);
        if (!product) {
            return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
        }

        // 재고 수량 복구
        const quantityChange = log.type === 'IN' ? -log.quantity : log.quantity;
        await product.updateStock(quantityChange);

        // 활동 내역 삭제
        await log.remove();

        res.json({ message: '활동 내역이 삭제되었습니다.' });
    } catch (error) {
        console.error('활동 내역 삭제 중 에러:', error);
        res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
});

// 임플란트 제조사 목록 조회
router.get('/manufacturers', auth, async (req, res) => {
    try {
        const manufacturers = await ImplantProduct.distinct('name', { category: 'fixture' });
        if (!manufacturers || !Array.isArray(manufacturers)) {
            return res.status(200).json({ manufacturers: [] });
        }
        res.json({ manufacturers });
    } catch (error) {
        console.error('임플란트 제조사 목록 조회 중 에러:', error);
        res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
});

// 특정 제조사의 규격 목록 조회
router.get('/specifications/:manufacturer', auth, async (req, res) => {
    try {
        const { manufacturer } = req.params;
        const products = await ImplantProduct.find(
            { category: 'fixture', name: manufacturer },
            { specification: 1 }
        );
        const specifications = products.map(p => p.specification);
        res.json(specifications);
    } catch (error) {
        console.error('임플란트 규격 목록 조회 중 에러:', error);
        res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
});

// 이식재 목록 조회
router.get('/fixtures', auth, async (req, res) => {
    try {
        const fixtures = await ImplantProduct.distinct('name', { category: '이식재' });
        if (!fixtures || !Array.isArray(fixtures)) {
            return res.status(200).json({ fixtures: [] });
        }
        res.json({ fixtures });
    } catch (error) {
        console.error('이식재 목록 조회 중 에러:', error);
        res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
});

// 특정 이식재의 규격 목록 조회
router.get('/specifications-fixture/:name', auth, async (req, res) => {
    try {
        const { name } = req.params;
        const products = await ImplantProduct.find(
            { category: '이식재', name },
            { specification: 1 }
        );
        const specifications = products.map(p => p.specification);
        res.json(specifications);
    } catch (error) {
        console.error('이식재 규격 목록 조회 중 에러:', error);
        res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
});

// 규격 목록 조회
router.post('/specifications', auth, async (req, res) => {
    try {
        const { category, name } = req.body;

        if (!category || !name) {
            return res.status(400).json({ message: '카테고리와 제품명은 필수 항목입니다.' });
        }

        // 해당 제품의 모든 규격 조회
        const products = await ImplantProduct.find({
            category: category,
            name: name
        }).select('specification');

        // 규격 목록 추출 (중복 제거 및 null/undefined 제외)
        const specifications = [...new Set(
            products
                .map(p => p.specification)
                .filter(spec => spec != null && spec !== '')
        )];

        res.json(specifications);
    } catch (error) {
        console.error('규격 목록 조회 중 에러:', error);
        res.status(500).json({ message: '규격 목록 조회에 실패했습니다.' });
    }
});

module.exports = router; 