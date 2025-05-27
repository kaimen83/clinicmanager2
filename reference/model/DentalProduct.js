const mongoose = require('mongoose');

const dentalProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    manufacturer: {
        type: String,
        required: true,
        trim: true
    },
    specification: {
        type: String,
        trim: true,
        default: ''
    },
    purchasePrice: {
        type: Number,
        required: true,
        min: 0
    },
    sellingPrice: {
        type: Number,
        required: true,
        min: 0
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// 재고 업데이트 메서드
dentalProductSchema.methods.updateStock = async function(quantity) {
    this.stock += quantity;
    this.updatedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('DentalProduct', dentalProductSchema); 