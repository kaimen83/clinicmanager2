const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DentalProduct = require('../models/DentalProduct');
const DentalProductSale = require('../models/DentalProductSale');
const DentalProductInventoryLog = require('../models/DentalProductInventoryLog');

// 구강용품 목록 조회
router.get('/', auth, async (req, res) => {
    try {
        const products = await DentalProduct.find().sort({ name: 1, specification: 1 });
        res.json(products);
    } catch (error) {
        console.error('구강용품 목록 조회 중 오류:', error);
        res.status(500).json({ message: '구강용품 목록을 불러오는데 실패했습니다.' });
    }
});

// 입고 처리
router.post('/:id/stock-in', auth, async (req, res) => {
    try {
        const { quantity, purchasePrice, notes } = req.body;
        const product = await DentalProduct.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: '해당 구강용품을 찾을 수 없습니다.' });
        }

        // 재고 업데이트
        product.stock = (product.stock || 0) + quantity;
        
        // 매입가가 제공된 경우 업데이트
        if (purchasePrice) {
            product.purchasePrice = purchasePrice;
        }

        // 입고 기록 저장
        await new DentalProductInventoryLog({
            productId: product._id,
            type: 'IN',
            quantity,
            price: purchasePrice || product.purchasePrice,
            notes,
            userId: req.user._id
        }).save();

        await product.save();
        res.json({ message: '입고 처리가 완료되었습니다.', product });

    } catch (error) {
        res.status(500).json({ message: '입고 처리 중 오류가 발생했습니다.' });
    }
});

// 출고 처리
router.post('/:id/stock-out', auth, async (req, res) => {
    try {
        const { quantity, reason, notes } = req.body;
        const product = await DentalProduct.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: '해당 구강용품을 찾을 수 없습니다.' });
        }

        // 재고 확인
        if (!product.stock || product.stock < quantity) {
            return res.status(400).json({ message: '재고가 부족합니다.' });
        }

        // 재고 업데이트
        product.stock -= quantity;

        // 출고 기록 저장
        await new DentalProductInventoryLog({
            productId: product._id,
            type: 'OUT',
            quantity,
            price: product.purchasePrice,
            notes,
            userId: req.user._id
        }).save();

        await product.save();
        res.json({ message: '출고 처리가 완료되었습니다.', product });

    } catch (error) {
        res.status(500).json({ message: '출고 처리 중 오류가 발생했습니다.' });
    }
});

// 판매 통계 조회
router.get('/statistics', auth, async (req, res) => {
    try {
        const { startDate, endDate, view = 'date' } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ message: '시작일과 종료일을 모두 지정해주세요.' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: '올바른 날짜 형식이 아닙니다.' });
        }

        // 판매 데이터 조회
        const sales = await DentalProductSale.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: {
                    path: '$user',
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);

        // 입고/출고 데이터 조회
        const inventoryLogs = await DentalProductInventoryLog.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $lookup: {
                    from: 'dentalproducts',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: {
                    path: '$user',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: '$product'
            }
        ]);

        // 제품 정보 조회
        const productIds = [
            ...sales.flatMap(sale => sale.products.map(p => p.productId)),
            ...inventoryLogs.map(log => log.productId)
        ];
        const products = await DentalProduct.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map(p => [p._id.toString(), p]));

        let statistics = {
            totalSales: 0,
            totalQuantity: 0,
            totalProfit: 0,
            activities: [] // 모든 활동(판매, 입고, 출고)을 저장할 배열
        };

        // 판매 데이터 처리
        sales.forEach(sale => {
            const quantity = sale.products.reduce((sum, p) => sum + p.quantity, 0);
            const totalAmount = sale.products.reduce((sum, p) => sum + (p.quantity * p.salePrice), 0);
            const profit = sale.products.reduce((sum, p) => {
                const product = productMap.get(p.productId.toString());
                const purchasePrice = product ? product.purchasePrice || 0 : 0;
                return sum + ((p.salePrice - purchasePrice) * p.quantity);
            }, 0);

            statistics.totalSales += totalAmount;
            statistics.totalQuantity += quantity;
            statistics.totalProfit += profit;

            statistics.activities.push({
                type: 'SALE',
                date: sale.date,
                patientName: sale.patientName,
                userName: sale.user ? sale.user.name : '알 수 없음',
                products: sale.products.map(p => {
                    const productInfo = productMap.get(p.productId.toString());
                    return {
                        productId: p.productId.toString(),
                        name: productInfo && productInfo.specification 
                            ? `${p.name} ${productInfo.specification}`
                            : p.name,
                        quantity: p.quantity,
                        price: p.salePrice,
                        amount: p.quantity * p.salePrice
                    };
                }),
                totalAmount: totalAmount,
                notes: sale.notes,
                _id: sale._id.toString()
            });
        });

        // 입고/출고 데이터 처리
        inventoryLogs.forEach(log => {
            statistics.activities.push({
                type: log.type,
                date: log.date,
                userName: log.user ? log.user.name : '알 수 없음',
                products: [{
                    productId: log.product._id.toString(),
                    name: log.product.specification 
                        ? `${log.product.name} ${log.product.specification}`
                        : log.product.name,
                    quantity: log.quantity,
                    price: log.price,
                    amount: log.quantity * log.price
                }],
                totalAmount: log.quantity * log.price,
                notes: log.notes,
                _id: log._id.toString()
            });
        });

        // 날짜순 정렬
        statistics.activities.sort((a, b) => b.date - a.date);

        if (view === 'product') {
            // 품목별 통계 계산
            const productStats = new Map();

            statistics.activities.forEach(activity => {
                activity.products.forEach(product => {
                    if (!productStats.has(product.productId)) {
                        const productInfo = productMap.get(product.productId.toString());
                        productStats.set(product.productId, {
                            _id: product.productId,
                            name: product.name,
                            specification: productInfo ? productInfo.specification : '',  // 규격 정보 추가
                            totalQuantity: 0,
                            totalAmount: 0,
                            profit: 0,
                            activities: []
                        });
                    }

                    const stat = productStats.get(product.productId);
                    if (activity.type === 'SALE') {
                        stat.totalQuantity += product.quantity;
                        stat.totalAmount += product.amount;
                        // 해당 제품의 이익만 계산 (이익이 없는 경우 0으로 처리)
                        const productProfit = activity.profit ? (activity.profit / activity.products.length) : 0;
                        stat.profit += productProfit;
                    }

                    // 해당 제품의 활동 내역만 추가
                    const productActivity = {
                        _id: activity._id,  // 활동의 ID 추가
                        date: activity.date,
                        type: activity.type,
                        quantity: product.quantity,
                        price: product.price,
                        amount: product.amount,
                        notes: activity.notes,
                        patientName: activity.patientName
                    };

                    // 활동 내역이 이미 존재하는지 확인 (중복 방지)
                    const activityExists = stat.activities.some(existing => 
                        existing.date === productActivity.date && 
                        existing.type === productActivity.type && 
                        existing.quantity === productActivity.quantity &&
                        existing.amount === productActivity.amount
                    );

                    if (!activityExists) {
                        stat.activities.push(productActivity);
                    }
                });
            });

            statistics.productStats = Array.from(productStats.values());
        }

        res.json(statistics);

    } catch (error) {
        console.error('통계 데이터 조회 중 에러:', error);
        res.status(500).json({ message: '통계 데이터를 불러오는데 실패했습니다.' });
    }
});

// 활동 삭제 API
router.delete('/activities/:id', auth, async (req, res) => {
    try {
        const activityId = req.params.id;

        // 판매 기록에서 삭제 시도
        const deletedSale = await DentalProductSale.findByIdAndDelete(activityId);
        if (deletedSale) {
            // 삭제된 제품들의 재고를 다시 증가시킴
            for (const product of deletedSale.products) {
                await DentalProduct.findByIdAndUpdate(
                    product.productId,
                    { $inc: { stock: product.quantity } }
                );
            }
            return res.json({ message: '판매 기록이 삭제되었습니다.' });
        }

        // 입/출고 기록에서 삭제 시도
        const deletedLog = await DentalProductInventoryLog.findByIdAndDelete(activityId);
        
        if (deletedLog) {
            try {
                // 입고 삭제의 경우 재고 감소, 출고 삭제의 경우 재고 증가
                const stockChange = deletedLog.type === 'IN' ? -deletedLog.quantity : deletedLog.quantity;
                await DentalProduct.findByIdAndUpdate(
                    deletedLog.product,  // _id 필드 대신 product 필드 사용
                    { $inc: { stock: stockChange } }
                );
                return res.json({ message: '입/출고 기록이 삭제되었습니다.' });
            } catch (updateError) {
                console.error('[Delete] 재고 업데이트 중 에러:', updateError);
                // 삭제된 기록 복구
                const restoredLog = new DentalProductInventoryLog(deletedLog);
                await restoredLog.save();
                throw new Error('재고 업데이트 중 오류가 발생했습니다.');
            }
        }

        return res.status(404).json({ message: '해당하는 활동 기록을 찾을 수 없습니다.' });

    } catch (error) {
        console.error('[Delete] 활동 삭제 중 에러:', error);
        res.status(500).json({ message: error.message || '활동 삭제에 실패했습니다.' });
    }
});

// 구강용품 등록
router.post('/', auth, async (req, res) => {
    try {
        const { name, manufacturer, specification, purchasePrice, sellingPrice } = req.body;
        
        // 필수 필드 검증
        if (!name || !purchasePrice || !sellingPrice) {
            return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
        }

        const newProduct = new DentalProduct({
            name,
            manufacturer,
            specification,
            purchasePrice,
            sellingPrice,
            stock: 0
        });

        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('구강용품 등록 중 오류:', error);
        res.status(500).json({ message: '구강용품 등록 중 오류가 발생했습니다.' });
    }
});

// 구강용품 삭제
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await DentalProduct.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: '해당 구강용품을 찾을 수 없습니다.' });
        }

        await DentalProduct.findByIdAndDelete(req.params.id);
        res.json({ message: '구강용품이 삭제되었습니다.' });
    } catch (error) {
        console.error('구강용품 삭제 중 오류:', error);
        res.status(500).json({ message: '구강용품 삭제 중 오류가 발생했습니다.' });
    }
});

module.exports = router;
