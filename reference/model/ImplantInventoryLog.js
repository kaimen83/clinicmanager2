const mongoose = require('mongoose');

const implantInventoryLogSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ImplantProduct',
        required: true
    },
    type: {
        type: String,
        enum: ['IN', 'OUT'],
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    // 출고 시 필요한 정보
    chartNumber: {
        type: String,
        required: function() { 
            return this.type === 'OUT' && this.outReason === '환자사용';
        }
    },
    patientName: {
        type: String,
        required: function() {
            return this.type === 'OUT' && this.outReason === '환자사용';
        }
    },
    doctor: {
        type: String,
        required: function() {
            return this.type === 'OUT' && this.outReason === '환자사용';
        }
    },
    outReason: {
        type: String,
        enum: ['환자사용', '폐기', '기타'],
        required: function() { return this.type === 'OUT'; }
    },
    notes: String,
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// 인덱스 생성
implantInventoryLogSchema.index({ date: -1 });
implantInventoryLogSchema.index({ productId: 1 });
implantInventoryLogSchema.index({ chartNumber: 1 });
implantInventoryLogSchema.index({ type: 1 });

module.exports = mongoose.model('ImplantInventoryLog', implantInventoryLogSchema); 