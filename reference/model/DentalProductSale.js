const mongoose = require('mongoose');

const dentalProductSaleSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    chartNumber: {
        type: String,
        required: true
    },
    patientName: {
        type: String,
        required: true
    },
    doctor: {
        type: String
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DentalProduct',
            required: true
        },
        name: String,
        manufacturer: String,
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        salePrice: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// 인덱스 생성
dentalProductSaleSchema.index({ date: -1 });
dentalProductSaleSchema.index({ chartNumber: 1 });
dentalProductSaleSchema.index({ userId: 1 });

// 저장 전 총액 계산
dentalProductSaleSchema.pre('save', function(next) {
    this.totalAmount = this.products.reduce((sum, product) => 
        sum + (product.quantity * product.salePrice), 0);
    next();
});

module.exports = mongoose.model('DentalProductSale', dentalProductSaleSchema); 