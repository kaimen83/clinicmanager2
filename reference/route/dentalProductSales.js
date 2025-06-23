const express = require('express');
const router = express.Router();
const DentalProduct = require('../models/DentalProduct');
const DentalProductSale = require('../models/DentalProductSale');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// 구강용품 판매 내역 조회
router.get('/', auth, async (req, res) => {
    try {
        const sales = await DentalProductSale.find()
            .sort({ date: -1 });
        res.json(sales);
    } catch (error) {
        console.error('판매 내역 조회 중 에러:', error);
        res.status(500).json({ message: '판매 내역을 불러오는데 실패했습니다.' });
    }
});

// 구강용품 판매 등록
router.post('/', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { date, chartNumber, patientName, doctor, products, userId } = req.body;

        // 데이터 검증
        if (!date || !chartNumber || !patientName || !doctor || !userId) {
            return res.status(400).json({ 
                message: '필수 입력 항목이 누락되었습니다. (날짜, 차트번호, 환자명, 의사, 사용자ID)'
            });
        }

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ 
                message: '구강용품을 선택해주세요.'
            });
        }

        // 제품 데이터 검증
        for (const product of products) {
            if (!product.productId || !product.name || !product.manufacturer || 
                !product.quantity || !product.salePrice) {
                return res.status(400).json({ 
                    message: '제품 정보가 올바르지 않습니다.'
                });
            }
        }

        // 재고 확인 및 업데이트
        for (const product of products) {
            const dentalProduct = await DentalProduct.findById(product.productId).session(session);
            if (!dentalProduct) {
                throw new Error(`상품을 찾을 수 없습니다: ${product.name}`);
            }
            if (dentalProduct.stock < product.quantity) {
                throw new Error(`재고가 부족합니다: ${product.name} (현재 재고: ${dentalProduct.stock})`);
            }
            dentalProduct.stock -= product.quantity;
            await dentalProduct.save();
        }

        // 총액 계산
        const totalAmount = products.reduce((sum, product) => {
            return sum + (product.quantity * product.salePrice);
        }, 0);

        // 판매 내역 저장
        const sale = new DentalProductSale({
            date: new Date(date),
            chartNumber,
            patientName,
            doctor,
            userId,
            products: products.map(p => ({
                productId: p.productId,
                name: p.name,
                manufacturer: p.manufacturer,
                quantity: p.quantity,
                salePrice: p.salePrice
            })),
            totalAmount
        });

        await sale.save({ session });
        await session.commitTransaction();
        
        res.status(201).json(sale);
    } catch (error) {
        await session.abortTransaction();
        console.error('판매 정보 저장 중 에러:', error);
        res.status(500).json({ message: error.message || '판매 정보 저장에 실패했습니다.' });
    } finally {
        session.endSession();
    }
});

// 구강용품 판매 내역 수정
router.put('/:id', auth, async (req, res) => {
    try {
        const { date, chartNumber, patientName, doctor, products } = req.body;
        const sale = await DentalProductSale.findById(req.params.id);
        
        if (!sale) {
            return res.status(404).json({ message: '판매 내역을 찾을 수 없습니다.' });
        }

        // 기존 재고 복구
        for (const product of sale.products) {
            const dentalProduct = await DentalProduct.findById(product.productId);
            if (dentalProduct) {
                await dentalProduct.updateStock(product.quantity);
            }
        }

        // 새로운 재고 차감
        for (const product of products) {
            const dentalProduct = await DentalProduct.findById(product.productId);
            if (!dentalProduct) {
                return res.status(404).json({ message: `상품을 찾을 수 없습니다: ${product.name}` });
            }
            if (dentalProduct.stock < product.quantity) {
                return res.status(400).json({ 
                    message: `재고가 부족합니다: ${product.name} (현재 재고: ${dentalProduct.stock})`
                });
            }
            await dentalProduct.updateStock(-product.quantity);
        }

        // 판매 내역 업데이트
        sale.date = new Date(date);
        sale.chartNumber = chartNumber;
        sale.patientName = patientName;
        sale.doctor = doctor;
        sale.products = products.map(p => ({
            productId: p.productId,
            name: p.name,
            manufacturer: p.manufacturer,
            quantity: p.quantity,
            salePrice: p.salePrice
        }));

        await sale.save();
        res.json(sale);
    } catch (error) {
        console.error('판매 내역 수정 중 에러:', error);
        res.status(500).json({ message: '판매 내역 수정에 실패했습니다.' });
    }
});

// 구강용품 판매 내역 삭제
router.delete('/:id', auth, async (req, res) => {
    try {
        const sale = await DentalProductSale.findById(req.params.id);
        
        if (!sale) {
            return res.status(404).json({ message: '판매 내역을 찾을 수 없습니다.' });
        }

        // 재고 복구
        for (const product of sale.products) {
            const dentalProduct = await DentalProduct.findById(product.productId);
            if (dentalProduct) {
                await dentalProduct.updateStock(product.quantity);
            }
        }

        await DentalProductSale.deleteOne({ _id: req.params.id });
        res.json({ message: '판매 내역이 삭제되었습니다.' });
    } catch (error) {
        console.error('판매 내역 삭제 중 에러:', error);
        res.status(500).json({ message: '판매 내역 삭제에 실패했습니다.' });
    }
});

module.exports = router; 