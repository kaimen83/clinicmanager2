const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    chartNumber: {
        type: String,
        required: [true, '차트번호는 필수입니다.'],
        unique: true,
        trim: true,
        validate: {
            validator: function(v) {
                return v && v.length > 0 && v !== 'null' && v !== 'undefined';
            },
            message: '유효한 차트번호를 입력해주세요.'
        }
    },
    name: {
        type: String,
        required: [true, '이름은 필수입니다.'],
        trim: true,
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: '유효한 이름을 입력해주세요.'
        }
    },
    visitPath: {
        type: String,
        required: [true, '내원경로는 필수입니다.']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    suppressReservedKeysWarning: true
});

// 저장 전 데이터 검증
patientSchema.pre('save', async function(next) {
    if (this.chartNumber) {
        this.chartNumber = this.chartNumber.trim();
    }
    if (this.name) {
        this.name = this.name.trim();
    }

    if (!this.chartNumber || this.chartNumber.trim() === '') {
        throw new Error('차트번호는 필수입니다.');
    }
    if (!this.name || this.name.trim() === '') {
        throw new Error('이름은 필수입니다.');
    }

    next();
});

// 모델 생성 전에 인덱스 설정
patientSchema.index({ chartNumber: 1 }, { unique: true });

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
