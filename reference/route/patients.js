const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// 환자 검색 라우트 추가
router.get('/search', auth, async (req, res) => {
    try {
        const searchTerm = req.query.term;
        if (!searchTerm) {
            return res.status(400).json({ message: '검색어를 입력해주세요.' });
        }

        // 환자 검색
        const patients = await Patient.find({
            $or: [
                { chartNumber: { $regex: searchTerm, $options: 'i' } },
                { name: { $regex: searchTerm, $options: 'i' } }
            ]
        }).limit(20);

        // 각 환자의 최근 내원 날짜 조회
        const patientsWithLastVisit = await Promise.all(patients.map(async (patient) => {
            // Transaction 컬렉션에서 해당 차트번호의 가장 최근 내원일 조회
            const lastVisit = await Transaction.findOne(
                { 
                    chartNumber: patient.chartNumber,
                    date: { $exists: true, $ne: null }  // date 필드가 존재하고 null이 아닌 경우
                },
                { date: 1 }
            ).sort({ date: -1 });  // date 필드 기준 내림차순 정렬

            return {
                _id: patient._id,
                chartNumber: patient.chartNumber,
                name: patient.name,
                visitPath: patient.visitPath,
                lastVisitDate: lastVisit ? lastVisit.date : null
            };
        }));

        // 최근 내원일 기준으로 정렬 (최신순)
        const sortedPatients = patientsWithLastVisit.sort((a, b) => {
            if (!a.lastVisitDate && !b.lastVisitDate) return 0;
            if (!a.lastVisitDate) return 1;
            if (!b.lastVisitDate) return -1;
            return new Date(b.lastVisitDate) - new Date(a.lastVisitDate);
        });

        res.json(sortedPatients);
    } catch (error) {
        console.error('환자 검색 오류:', error);  // 오류 로깅 추가
        res.status(500).json({ message: error.message });
    }
});

// 차트번호로 환자 조회
router.get('/:chartNumber', auth, async (req, res) => {
    try {
        const patient = await Patient.findOne({ chartNumber: req.params.chartNumber });
        
        if (!patient) {
            return res.status(404).json({ message: '환자를 찾을 수 없습니다.' });
        }

        res.json(patient);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 환자 등록
router.post('/', auth, async (req, res) => {
    try {
        const { chartNumber, name, visitPath } = req.body;

        // 차트번호 중복 확인
        const existingPatient = await Patient.findOne({ chartNumber });
        if (existingPatient) {
            return res.status(400).json({ message: '이미 등록된 차트번호입니다.' });
        }

        const patient = new Patient({
            chartNumber,
            name,
            visitPath,
            createdBy: req.user._id
        });

        await patient.save();
        res.status(201).json(patient);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 환자 정보 수정
router.put('/:id', auth, async (req, res) => {
    try {
        const { chartNumber, name, visitPath } = req.body;
        
        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            { chartNumber, name, visitPath },
            { new: true }
        );

        if (!patient) {
            return res.status(404).json({ message: '환자를 찾을 수 없습니다.' });
        }

        res.json(patient);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 환자 삭제
router.delete('/:id', auth, async (req, res) => {
    try {
        const patient = await Patient.findByIdAndDelete(req.params.id);
        
        if (!patient) {
            return res.status(404).json({ message: '환자를 찾을 수 없습니다.' });
        }

        res.json({ message: '환자가 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;