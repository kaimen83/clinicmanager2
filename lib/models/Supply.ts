import mongoose, { Document, Schema } from 'mongoose';

interface ISupply extends Document {
    date: Date;
    vendor: string;
    amount: number;
    note?: string;
    isPaid: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const supplySchema = new Schema({
    date: {
        type: Date,
        required: [true, '매입 날짜는 필수입력항목입니다.']
    },
    vendor: {
        type: String,
        required: [true, '거래처는 필수입력항목입니다.'],
        trim: true,
        maxlength: [100, '거래처명은 100자를 초과할 수 없습니다.']
    },
    amount: {
        type: Number,
        required: [true, '매입 금액은 필수입력항목입니다.'],
        min: [0, '매입 금액은 0 이상이어야 합니다.']
    },
    note: {
        type: String,
        trim: true,
        maxlength: [500, '메모는 500자를 초과할 수 없습니다.']
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: String,  // Clerk에서는 String ID를 사용
        required: true
    }
}, {
    timestamps: true
});

// 날짜 인덱스 설정 - 날짜별 조회 최적화
supplySchema.index({ date: -1 });

// 거래처 인덱스 설정 - 거래처별 조회 최적화
supplySchema.index({ vendor: 1 });

// 결제 상태 인덱스 설정 - 미결제 내역 조회 최적화
supplySchema.index({ isPaid: 1 });

// 복합 인덱스 - 날짜와 거래처별 조회 최적화
supplySchema.index({ date: -1, vendor: 1 });

// 모델이 존재하지 않을 경우에만 모델 생성
export const Supply = mongoose.models.Supply || mongoose.model<ISupply>('Supply', supplySchema);

export type SupplyType = {
    _id: string;
    date: Date;
    vendor: string;
    amount: number;
    note?: string;
    isPaid: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}; 