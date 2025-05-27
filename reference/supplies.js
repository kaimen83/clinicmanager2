const express = require('express');
const router = express.Router();
const Supply = require('../models/Supply');
const SelectedSupplies = require('../models/SelectedSupplies');
const auth = require('../middleware/auth');
const User = require('../models/User');

// 매입 목록 조회
router.get('/', auth, async (req, res) => {
    try {
        const supplies = await Supply.find()
            .sort({ date: -1 });
        res.json(supplies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 매입 내역 추가
router.post('/', auth, async (req, res) => {
    const supply = new Supply({
        date: new Date(req.body.date),
        vendor: req.body.vendor,
        amount: req.body.amount,
        note: req.body.note,
        isPaid: req.body.isPaid,
        createdBy: req.user._id
    });

    try {
        const newSupply = await supply.save();
        res.status(201).json(newSupply);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 매입 내역 수정
router.patch('/:id', auth, async (req, res) => {
    try {
        const supply = await Supply.findById(req.params.id);
        if (!supply) {
            return res.status(404).json({ message: '매입 내역을 찾을 수 없습니다.' });
        }

        if (req.body.date) supply.date = new Date(req.body.date);
        if (req.body.vendor) supply.vendor = req.body.vendor;
        if (req.body.amount) supply.amount = req.body.amount;
        if (req.body.note !== undefined) supply.note = req.body.note;
        if (req.body.isPaid !== undefined) supply.isPaid = req.body.isPaid;
        
        supply.updatedAt = Date.now();

        const updatedSupply = await supply.save();
        res.json(updatedSupply);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 매입 내역 삭제
router.delete('/:id', auth, async (req, res) => {
    try {
        const supply = await Supply.findById(req.params.id);
        if (!supply) {
            return res.status(404).json({ message: '매입 내역을 찾을 수 없습니다.' });
        }

        await supply.deleteOne();
        res.json({ message: '매입 내역이 삭제되었습니다.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 기간별 매입 내역 조회 (날짜 범위)
router.get('/date-range', auth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ message: '시작일과 종료일을 모두 지정해주세요.' });
        }

        // 시작일은 해당일 00:00:00, 종료일은 해당일 23:59:59로 설정
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const supplies = await Supply.find({
            date: {
                $gte: start,
                $lte: end
            }
        }).sort({ date: -1 });

        res.json(supplies);
    } catch (error) {
        console.error('날짜 범위 매입 내역 조회 중 에러:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 기간별 매입 내역 조회
router.get('/period/:period', auth, async (req, res) => {
    try {
        const { period } = req.params;
        const now = new Date();
        let startDate, endDate;

        switch (period) {
            case 'month':
                // 이번달
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'quarter':
                // 현재 날짜로부터 이전 3개월
                endDate = new Date(now);
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 3);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'year':
                // 현재 날짜로부터 이전 1년
                endDate = new Date(now);
                startDate = new Date(now);
                startDate.setFullYear(startDate.getFullYear() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            default:
                return res.status(400).json({ message: '잘못된 기간이 지정되었습니다.' });
        }

        const supplies = await Supply.find({
            date: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ date: -1 });

        res.json(supplies);
    } catch (error) {
        console.error('기간별 매입 내역 조회 중 에러:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 선택된 항목 저장 API
router.post('/selected-items', auth, async (req, res) => {
    try {
        // 단일 문서만 사용
        let selected = await SelectedSupplies.findOne();
        
        if (!selected) {
            selected = new SelectedSupplies({ items: [] });
        }
        
        selected.items = req.body.selectedItems;
        await selected.save();
        
        res.json({ message: '선택된 항목이 저장되었습니다.' });
    } catch (error) {
        console.error('선택된 항목 저장 중 에러:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 선택된 항목 조회 API
router.get('/selected-items', auth, async (req, res) => {
    try {
        const selected = await SelectedSupplies.findOne();
        res.json(selected?.items || []);
    } catch (error) {
        console.error('선택된 항목 조회 중 에러:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router; 