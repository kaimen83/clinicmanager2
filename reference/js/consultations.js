const express = require('express');
const router = express.Router();
const Consultation = require('../models/Consultation');
const auth = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// 상담 내역 저장
router.post('/', auth, async (req, res) => {
    try {
        const consultation = new Consultation({
            ...req.body,
            createdBy: req.user._id
        });

        await consultation.save();
        await logActivity(
            req.user._id,
            'create',
            'consultation',
            `${consultation.chartNumber} ${consultation.patientName} 상담 추가`,
            {
                consultationId: consultation._id,
                details: [
                    `환자명: ${consultation.patientName}`,
                    `차트번호: ${consultation.chartNumber}`,
                    `상담 내용: ${consultation.consultationContent}`,
                    `예상 금액: ${consultation.amount.toLocaleString()}원`,
                    `동의 여부: ${consultation.hasConsent ? '동의' : '미동의'}`,
                    `날짜: ${consultation.date.toISOString().split('T')[0]}`,
                    `메모: ${consultation.notes || '없음'}`
                ]
            }
        );
        res.status(201).json(consultation);
    } catch (error) {
        console.error('상담 내역 저장 중 에러:', error);
        res.status(500).json({ message: '상담 내역 저장에 실패했습니다.' });
    }
});

// 상담 내역 조회
router.get('/', auth, async (req, res) => {
    try {
        const { chartNumber, patientName } = req.query;
        const query = {};
        
        if (chartNumber) query.chartNumber = chartNumber;
        if (patientName) query.patientName = patientName;

        const consultations = await Consultation.find(query).sort({ date: -1 });
        res.json(consultations);
    } catch (error) {
        res.status(500).json({ message: '상담 내역 조회에 실패했습니다.' });
    }
});

// 상담내역 삭제
router.delete('/:id', auth, async (req, res) => {
    try {
        const result = await Consultation.findOneAndDelete({
            _id: req.params.id
        });

        if (!result) {
            return res.status(404).json({ message: '상담내역을 찾을 수 없습니다.' });
        }

        await logActivity(
            req.user._id,
            'delete',
            'consultation',
            `${result.chartNumber} ${result.patientName} 상담 삭제`,
            {
                consultationId: result._id,
                details: [
                    `환자명: ${result.patientName}`,
                    `차트번호: ${result.chartNumber}`,
                    `상담 내용: ${result.consultationContent}`,
                    `예상 금액: ${result.amount.toLocaleString()}원`,
                    `동의 여부: ${result.hasConsent ? '동의' : '미동의'}`,
                    `날짜: ${result.date.toISOString().split('T')[0]}`,
                    `메모: ${result.notes || '없음'}`
                ]
            }
        );
        res.json({ message: '상담내역이 삭제되었습니다.' });
    } catch (error) {
        console.error('상담내역 삭제 중 에러:', error);
        res.status(500).json({ message: '상담내역 삭제에 실패했습니다.' });
    }
});

// 동의여부 토글
router.patch('/:id/toggle-agreed', auth, async (req, res) => {
    try {
        const consultation = await Consultation.findOne({
            _id: req.params.id
        });

        if (!consultation) {
            return res.status(404).json({ message: '상담내역을 찾을 수 없습니다.' });
        }

        // 동의 상태 변경
        consultation.agreed = !consultation.agreed;
        
        // 미동의로 변경되는 경우 confirmedDate를 null로 설정
        if (!consultation.agreed) {
            consultation.confirmedDate = null;
        } else {
            // 동의로 변경되는 경우 confirmedDate를 현재 날짜로 설정
            consultation.confirmedDate = req.body.confirmedDate || new Date();
        }

        await consultation.save();

        await logActivity(
            req.user._id,
            'update',
            'consultation',
            `${consultation.chartNumber} ${consultation.patientName} 상담 동의여부 변경`,
            { 
                consultationId: req.params.id,
                newAgreedStatus: consultation.agreed,
                confirmedDate: consultation.confirmedDate
            }
        );
        res.json(consultation);
    } catch (error) {
        console.error('동의여부 토글 중 에러:', error);
        res.status(500).json({ message: '동의여부 수정에 실패했습니다.' });
    }
});

// 단일 상담 정보 조회
router.get('/:id', auth, async (req, res) => {
    try {
        const consultation = await Consultation.findOne({
            _id: req.params.id
        });

        if (!consultation) {
            return res.status(404).json({ message: '상담 정보를 찾을 수 없습니다.' });
        }

        res.json(consultation);
    } catch (error) {
        console.error('상담 정보 조회 중 에러:', error);
        res.status(500).json({ message: '상담 정보 조회에 실패했습니다.' });
    }
});

// 상담 정보 수정
router.put('/:id', auth, async (req, res) => {
    try {
        const oldConsultation = await Consultation.findById(req.params.id);
        if (!oldConsultation) {
            return res.status(404).json({ message: '상담 정보를 찾을 수 없습니다.' });
        }

        const changes = [];
        if (oldConsultation.patientName !== req.body.patientName) {
            changes.push(`환자명: ${oldConsultation.patientName} → ${req.body.patientName}`);
        }
        if (oldConsultation.chartNumber !== req.body.chartNumber) {
            changes.push(`차트번호: ${oldConsultation.chartNumber} → ${req.body.chartNumber}`);
        }
        if (oldConsultation.consultationContent !== req.body.consultationContent) {
            changes.push(`상담 내용: ${oldConsultation.consultationContent} → ${req.body.consultationContent}`);
        }
        if (oldConsultation.amount !== Number(req.body.amount)) {
            const diff = Number(req.body.amount) - oldConsultation.amount;
            const diffText = diff > 0 ? `증가: +${diff.toLocaleString()}원` : `감소: ${diff.toLocaleString()}원`;
            changes.push(`예상 금액: ${oldConsultation.amount.toLocaleString()}원 → ${Number(req.body.amount).toLocaleString()}원 (${diffText})`);
        }
        if (oldConsultation.hasConsent !== req.body.hasConsent) {
            changes.push(`동의 여부: ${oldConsultation.hasConsent ? '동의' : '미동의'} → ${req.body.hasConsent ? '동의' : '미동의'}`);
        }
        if (oldConsultation.date.toISOString().split('T')[0] !== req.body.date) {
            changes.push(`날짜: ${oldConsultation.date.toISOString().split('T')[0]} → ${req.body.date}`);
        }
        if (oldConsultation.notes !== req.body.notes) {
            changes.push(`메모: ${oldConsultation.notes || '없음'} → ${req.body.notes || '없음'}`);
        }

        // 로그 기록 전에 디버깅 로그 추가

        const consultation = await Consultation.findOneAndUpdate(
            { _id: req.params.id },
            req.body,
            { new: true, runValidators: true }
        );

        // 변경사항이 있는 경우에만 로그 저장
        if (changes.length > 0) {
            await logActivity(
                req.user._id,
                'update',
                'consultation',
                `${oldConsultation.chartNumber} ${oldConsultation.patientName} 상담 수정`,
                {
                    consultationId: req.params.id,
                    details: changes
                }
            );
        }

        res.json(consultation);
    } catch (error) {
        console.error('상담 정보 수정 중 에러:', error);
        res.status(500).json({ message: '상담 정보 수정에 실패했습니다.' });
    }
});

module.exports = router; 