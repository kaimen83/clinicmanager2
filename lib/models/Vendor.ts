import mongoose, { Document, Schema } from 'mongoose';

interface IVendor extends Document {
    name: string;
    businessNumber: string | null;
    phoneNumber: string | null;
    createdBy: mongoose.Types.ObjectId | string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const vendorSchema = new Schema({
    name: {
        type: String,
        required: [true, '상호명은 필수입력항목입니다.'],
        trim: true,
        maxlength: [100, '상호명은 100자를 초과할 수 없습니다.']
    },
    businessNumber: {
        type: String,
        sparse: true,
        trim: true,
        validate: {
            validator: function(v: string) {
                if (!v) return true; // 빈 값은 허용
                return /^\d{3}-\d{2}-\d{5}$/.test(v);
            },
            message: '올바른 사업자번호 형식이 아닙니다. (예: 123-45-67890)'
        }
    },
    phoneNumber: {
        type: String,
        trim: true,
        validate: {
            validator: function(v: string) {
                if (!v) return true; // 빈 값은 허용
                return /^\d{2,3}-\d{3,4}-\d{4}$/.test(v);
            },
            message: '올바른 전화번호 형식이 아닙니다. (예: 02-1234-5678)'
        }
    },
    createdBy: {
        type: String,  // Clerk에서는 String ID를 사용
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// 상호명 인덱스 설정 - 활성화된 업체만 유니크 제약 적용
vendorSchema.index(
    { name: 1 }, 
    { 
        unique: true,
        partialFilterExpression: { isActive: true }
    }
);

// 사업자번호 인덱스 설정 - 활성화되고 사업자번호가 있는 경우만 유니크 제약 적용
vendorSchema.index(
    { businessNumber: 1 }, 
    { 
        unique: true,
        sparse: true,
        partialFilterExpression: { 
            isActive: true,
            businessNumber: { $type: 'string', $ne: '' }
        }
    }
);

// isActive 필드에 대한 인덱스 - 검색 최적화
vendorSchema.index({ isActive: 1 });

// 저장 전 데이터 정리
vendorSchema.pre<IVendor>('save', function(next: mongoose.CallbackWithoutResultAndOptionalError) {
    if (!this.businessNumber) this.businessNumber = null;
    if (!this.phoneNumber) this.phoneNumber = null;
    next();
});

// 모델이 존재하지 않을 경우에만 모델 생성
export const Vendor = mongoose.models.Vendor || mongoose.model<IVendor>('Vendor', vendorSchema);

export type VendorType = {
    _id: string;
    name: string;
    businessNumber: string | null;
    phoneNumber: string | null;
    createdBy: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}; 