import mongoose from 'mongoose';

const productPriceSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true
    },
    specification: {
        type: String,
        default: ''
    },
    price: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const implantContractSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true
    },
    contractDate: {
        type: Date,
        required: true
    },
    promotionAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    markupRate: {
        type: Number,
        default: 0,
        min: 0
    },
    paymentMethod: {
        type: String,
        default: ''
    },
    paymentTerms: {
        type: String,
        default: ''
    },
    benefits: {
        type: String,
        default: ''
    },
    productPrices: [productPriceSchema],
    isActive: {
        type: Boolean,
        default: true
    },
    userId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// 인덱스 생성
implantContractSchema.index({ companyName: 1 });
implantContractSchema.index({ contractDate: -1 });
implantContractSchema.index({ isActive: 1 });
implantContractSchema.index({ 'productPrices.productName': 1 });

export default mongoose.models.ImplantContract || mongoose.model('ImplantContract', implantContractSchema);