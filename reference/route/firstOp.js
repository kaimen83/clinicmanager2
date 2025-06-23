const express = require('express');
const router = express.Router();
const FirstOp = require('../models/FirstOp');
const auth = require('../middleware/auth');

// 1st OP 정보 생성
router.post('/', auth, async (req, res) => {
    try {
        const {
            date,
            chartNumber,
            patientName,
            doctor,
            implants,
            fixtures
        } = req.body;

        // 기본 데이터 유효성 검사
        if (!date || !chartNumber || !patientName || !doctor) {
            return res.status(400).json({ message: '날짜, 차트번호, 환자명, 담당의는 필수 정보입니다.' });
        }

        // 임플란트와 이식재 중 하나 이상 있는지 확인
        if ((!implants || !implants.length) && (!fixtures || !fixtures.length)) {
            return res.status(400).json({ message: '임플란트 또는 이식재 정보가 필요합니다.' });
        }

        // 임플란트 데이터 유효성 검사 (있는 경우에만)
        if (implants && implants.length) {
            const isValidImplants = implants.every(imp => 
                imp.manufacturer && 
                typeof imp.quantity === 'number' && 
                imp.quantity > 0
            );

            if (!isValidImplants) {
                return res.status(400).json({ message: '잘못된 임플란트 정보가 포함되어 있습니다.' });
            }
        }

        // 이식재 데이터 유효성 검사 (있는 경우에만)
        if (fixtures && fixtures.length) {
            const isValidFixtures = fixtures.every(fix => 
                fix.type && 
                typeof fix.quantity === 'number' && 
                fix.quantity > 0
            );

            if (!isValidFixtures) {
                return res.status(400).json({ message: '잘못된 이식재 정보가 포함되어 있습니다.' });
            }
        }

        // 새로운 1st OP 정보 생성
        const firstOp = new FirstOp({
            date: new Date(date),
            chartNumber,
            patientName,
            doctor,
            implants: implants || [],
            fixtures: fixtures || [],
            createdBy: req.user._id
        });


        await firstOp.save();

        res.status(201).json(firstOp);
    } catch (error) {
        console.error('1st OP 정보 저장 중 서버 에러:', error);
        console.error('에러 상세:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            errors: error.errors
        });
        res.status(500).json({ 
            message: '1st OP 정보 저장에 실패했습니다.',
            error: error.message,
            validationErrors: error.errors
        });
    }
});

// 특정 환자의 1st OP 정보 조회
router.get('/patient/:chartNumber', auth, async (req, res) => {
    try {
        const firstOps = await FirstOp.find({ 
            chartNumber: req.params.chartNumber,
            createdBy: req.user._id 
        }).sort({ date: -1 });

        res.json(firstOps);
    } catch (error) {
        console.error('1st OP 정보 조회 중 에러:', error);
        res.status(500).json({ message: '1st OP 정보 조회에 실패했습니다.' });
    }
});

// 특정 날짜의 1st OP 정보 조회
router.get('/date/:date', auth, async (req, res) => {
    try {
        const startDate = new Date(req.params.date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        const firstOps = await FirstOp.find({
            createdBy: req.user._id,
            date: {
                $gte: startDate,
                $lt: endDate
            }
        });

        res.json(firstOps);
    } catch (error) {
        console.error('1st OP 정보 조회 중 에러:', error);
        res.status(500).json({ message: '1st OP 정보 조회에 실패했습니다.' });
    }
});

module.exports = router; 