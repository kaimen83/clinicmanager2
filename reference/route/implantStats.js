const express = require('express');
const router = express.Router();
const FirstOp = require('../models/FirstOp');
const auth = require('../middleware/auth');

// 임플란트 통계 조회
router.get('/', auth, async (req, res) => {
    try {
        const { startDate, endDate, doctor, patientName } = req.query;
        
        // 현재 기간의 쿼리
        let query = {
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        if (doctor && doctor !== 'all') {
            query.doctor = doctor;
        }

        if (patientName) {
            query.patientName = new RegExp(patientName, 'i');
        }

        // 누적 총계를 위한 쿼리
        let accumulatedQuery = {
            date: {
                $lte: new Date(endDate)
            }
        };

        if (doctor && doctor !== 'all') {
            accumulatedQuery.doctor = doctor;
        }

        // 현재 기간 데이터 조회
        const operations = await FirstOp.find(query).sort({ date: -1 });
        
        // 누적 데이터 조회
        const accumulatedOperations = await FirstOp.find(accumulatedQuery);

        // 누적 총계 계산
        let accumulatedTotal = 0;
        accumulatedOperations.forEach(op => {
            if (op.implants && op.implants.length > 0) {
                op.implants.forEach(imp => {
                    accumulatedTotal += imp.quantity;
                });
            }
        });

        // 날짜별로 데이터 그룹화
        const dailyStats = {};
        
        operations.forEach(op => {
            const dateKey = op.date.toISOString().split('T')[0];
            
            if (!dailyStats[dateKey]) {
                dailyStats[dateKey] = {
                    date: dateKey,
                    implants: {},
                    fixtures: {},
                    patients: [],
                    totalImplants: 0
                };
            }

            // 임플란트 집계
            if (op.implants && op.implants.length > 0) {
                op.implants.forEach(imp => {
                    dailyStats[dateKey].implants[imp.manufacturer] = 
                        (dailyStats[dateKey].implants[imp.manufacturer] || 0) + imp.quantity;
                    dailyStats[dateKey].totalImplants += imp.quantity;
                });
            }

            // 이식재 집계
            if (op.fixtures && op.fixtures.length > 0) {
                op.fixtures.forEach(fix => {
                    dailyStats[dateKey].fixtures[fix.type] = 
                        (dailyStats[dateKey].fixtures[fix.type] || 0) + fix.quantity;
                });
            }

            // 환자 정보에 임플란트와 이식재 데이터 포함하여 추가
            const patientImplants = {};
            const patientFixtures = {};
            let patientTotalImplants = 0;
            let patientTotalFixtures = 0;

            if (op.implants && op.implants.length > 0) {
                op.implants.forEach(imp => {
                    patientImplants[imp.manufacturer] = (patientImplants[imp.manufacturer] || 0) + imp.quantity;
                    patientTotalImplants += imp.quantity;
                });
            }

            if (op.fixtures && op.fixtures.length > 0) {
                op.fixtures.forEach(fix => {
                    patientFixtures[fix.type] = (patientFixtures[fix.type] || 0) + fix.quantity;
                    patientTotalFixtures += fix.quantity;
                });
            }

            dailyStats[dateKey].patients.push({
                chartNumber: op.chartNumber,
                patientName: op.patientName,
                doctor: op.doctor,
                implants: patientImplants,
                fixtures: patientFixtures,
                totalImplants: patientTotalImplants,
                totalFixtures: patientTotalFixtures
            });
        });

        const result = Object.values(dailyStats);
        
        // 응답에 누적 총계 추가
        res.json({
            data: result,
            accumulatedTotal: accumulatedTotal
        });

    } catch (error) {
        console.error('임플란트 통계 조회 중 에러:', error);
        res.status(500).json({ message: '통계 조회에 실패했습니다.' });
    }
});

router.get('/:date', auth, async (req, res) => {
    try {
        const { date } = req.params;
        const { doctor } = req.query;

        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        let query = {
            date: {
                $gte: startDate,
                $lt: endDate
            }
        };

        if (doctor && doctor !== 'all') {
            query.doctor = doctor;
        }

        // 전체 수술 데이터 조회
        const operations = await FirstOp.find(query);

        // day-level 통계
        const detail = {
            date: date,
            implants: {},
            fixtures: {},
            patients: [],
            totalImplants: 0,
            // 필요하다면 day-level totalFixtures도 추가 가능
            // totalFixtures: 0
        };

        operations.forEach(op => {
            // ----------------------
            // 1) day-level implants
            // ----------------------
            if (op.implants && op.implants.length > 0) {
                op.implants.forEach(imp => {
                    detail.implants[imp.manufacturer] = 
                        (detail.implants[imp.manufacturer] || 0) + imp.quantity;
                    detail.totalImplants += imp.quantity;
                });
            }

            // ----------------------
            // 2) day-level fixtures
            // ----------------------
            if (op.fixtures && op.fixtures.length > 0) {
                op.fixtures.forEach(fix => {
                    detail.fixtures[fix.type] = 
                        (detail.fixtures[fix.type] || 0) + fix.quantity;
                    // 필요하다면 day-level totalFixtures도 합산
                    // detail.totalFixtures += fix.quantity;
                });
            }

            // ----------------------
            // 3) 환자별 implants
            // ----------------------
            const patientImplants = {};
            let patientTotalImplants = 0;
            if (op.implants && op.implants.length > 0) {
                op.implants.forEach(imp => {
                    patientImplants[imp.manufacturer] = 
                        (patientImplants[imp.manufacturer] || 0) + imp.quantity;
                    patientTotalImplants += imp.quantity;
                });
            }

            // ----------------------
            // 4) 환자별 fixtures (누락되어 있던 부분 추가)
            // ----------------------
            const patientFixtures = {};
            let patientTotalFixtures = 0;
            if (op.fixtures && op.fixtures.length > 0) {
                op.fixtures.forEach(fix => {
                    patientFixtures[fix.type] = 
                        (patientFixtures[fix.type] || 0) + fix.quantity;
                    patientTotalFixtures += fix.quantity;
                });
            }

            // ----------------------
            // 5) 최종 환자 정보에 fixtures도 포함
            // ----------------------
            detail.patients.push({
                chartNumber: op.chartNumber,
                patientName: op.patientName,
                doctor: op.doctor,
                implants: patientImplants,
                fixtures: patientFixtures,
                totalImplants: patientTotalImplants,
                totalFixtures: patientTotalFixtures
            });
        });

        res.json(detail);

    } catch (error) {
        console.error('상세 정보 조회 중 에러:', error);
        res.status(500).json({ message: '상세 정보 조회에 실패했습니다.' });
    }
});



// 특정 환자의 정보 조회
router.get('/:date/:chartNumber', auth, async (req, res) => {
    try {
        const { date, chartNumber } = req.params;
        
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        const operation = await FirstOp.findOne({
            date: {
                $gte: startDate,
                $lt: endDate
            },
            chartNumber: chartNumber
        });

        if (!operation) {
            return res.status(404).json({ message: '환자 정보를 찾을 수 없습니다.' });
        }

        res.json({
            chartNumber: operation.chartNumber,
            patientName: operation.patientName,
            doctor: operation.doctor,
            date: date,
            implants: operation.implants || [],
            fixtures: operation.fixtures || []
        });

    } catch (error) {
        console.error('환자 정보 조회 중 에러:', error);
        res.status(500).json({ message: '환자 정보 조회에 실패했습니다.' });
    }
});

// 환자 정보 수정
router.put('/:date/:chartNumber', auth, async (req, res) => {
    try {
        const { date, chartNumber } = req.params;
        const { patientName, doctor, implants, fixtures } = req.body;
        
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        const operation = await FirstOp.findOne({
            date: {
                $gte: startDate,
                $lt: endDate
            },
            chartNumber: chartNumber
        });

        if (!operation) {
            return res.status(404).json({ message: '환자 정보를 찾을 수 없습니다.' });
        }

        // 데이터 업데이트
        operation.patientName = patientName;
        operation.doctor = doctor;
        operation.implants = implants;
        operation.fixtures = fixtures;
        
        await operation.save();

        res.json({ message: '환자 정보가 수정되었습니다.' });

    } catch (error) {
        console.error('환자 정보 수정 중 에러:', error);
        res.status(500).json({ message: '환자 정보 수정에 실패했습니다.' });
    }
});

// 환자 정보 삭제
router.delete('/:date/:chartNumber', auth, async (req, res) => {
    try {
        const { date, chartNumber } = req.params;
        
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        const result = await FirstOp.deleteOne({
            date: {
                $gte: startDate,
                $lt: endDate
            },
            chartNumber: chartNumber
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: '환자 정보를 찾을 수 없습니다.' });
        }

        res.json({ message: '환자 정보가 삭제되었습니다.' });

    } catch (error) {
        console.error('환자 정보 삭제 중 에러:', error);
        res.status(500).json({ message: '환자 정보 삭제에 실패했습니다.' });
    }
});

module.exports = router; 