const mongoose = require('mongoose');

const cardDepositSchema = new mongoose.Schema({
    cardCompany: {
        type: String,
        required: [true, '카드사는 필수입니다.']
    },
    saleDate: {
        type: Date,
        required: [true, '매출일자는 필수입니다.']
    },
    saleAmount: {
        type: Number,
        required: [true, '매출금액은 필수입니다.']
    },
    expectedDepositDate: {
        type: Date,
        required: [true, '입금예정일은 필수입니다.']
    },
    actualDepositDate: {
        type: Date
    },
    actualDepositAmount: {
        type: Number
    },
    fee: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        required: true,
        enum: ['미입금', '입금완료', '입금보류'],
        default: '미입금'
    },
    holdReason: {
        type: String,
        required: function() {
            return this.status === '입금보류';
        }
    },
    transactionIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            // 새로 생성되는 문서에만 required 적용
            return this.isNew;
        }
    }
}, {
    timestamps: true
});

// 입금예정일 자동 계산 (매출일 + 2영업일)
cardDepositSchema.pre('save', async function(next) {
    try {
        if (this.isModified('saleDate')) {
            const calculateExpectedDepositDate = (saleDate) => {
                let date = new Date(saleDate);
                let businessDays = 0;
                
                date.setDate(date.getDate() + 1);
                
                while (businessDays < 2) {
                    if (date.getDay() !== 0 && date.getDay() !== 6) {
                        businessDays++;
                    }
                    
                    if (businessDays < 2) {
                        date.setDate(date.getDate() + 1);
                    }
                }
                
                return date;
            };

            this.expectedDepositDate = calculateExpectedDepositDate(this.saleDate);
        }

        // 수수료 자동 계산 (음수 매출 고려)
        if (this.isModified('actualDepositAmount')) {
            if (this.actualDepositAmount === null) {
                this.fee = null;
            } else if (this.saleAmount < 0) {
                this.fee = 0;
            } else {
                this.fee = this.saleAmount - this.actualDepositAmount;
            }
        }

        next();
    } catch (error) {
        console.error('[CardDeposit 저장 오류]:', error);
        next(error);
    }
});

module.exports = mongoose.model('CardDeposit', cardDepositSchema);
