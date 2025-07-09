import mongoose, { Schema, Document, models, model } from 'mongoose';

export interface IDailySettlementCheck extends Document {
    date: Date;
    income: {
        checked: boolean;
        checkedBy?: string;
        checkedAt?: Date;
    };
    expenses: {
        checked: boolean;
        checkedBy?: string;
        checkedAt?: Date;
    };
    cashRecords: {
        checked: boolean;
        checkedBy?: string;
        checkedAt?: Date;
    };
    implant: {
        checked: boolean;
        checkedBy?: string;
        checkedAt?: Date;
    };
    dentalProducts: {
        checked: boolean;
        checkedBy?: string;
        checkedAt?: Date;
    };
    consultations: {
        checked: boolean;
        checkedBy?: string;
        checkedAt?: Date;
    };
    cashReceipts: {
        checked: boolean;
        checkedBy?: string;
        checkedAt?: Date;
    };
    cardDeposits: {
        checked: boolean;
        checkedBy?: string;
        checkedAt?: Date;
    };
    isCompleted: boolean;
    completedBy?: string;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const dailySettlementCheckSchema = new Schema({
    date: {
        type: Date,
        required: true,
        unique: true
    },
    income: {
        checked: {
            type: Boolean,
            default: false
        },
        checkedBy: String,
        checkedAt: Date
    },
    expenses: {
        checked: {
            type: Boolean,
            default: false
        },
        checkedBy: String,
        checkedAt: Date
    },
    cashRecords: {
        checked: {
            type: Boolean,
            default: false
        },
        checkedBy: String,
        checkedAt: Date
    },
    implant: {
        checked: {
            type: Boolean,
            default: false
        },
        checkedBy: String,
        checkedAt: Date
    },
    dentalProducts: {
        checked: {
            type: Boolean,
            default: false
        },
        checkedBy: String,
        checkedAt: Date
    },
    consultations: {
        checked: {
            type: Boolean,
            default: false
        },
        checkedBy: String,
        checkedAt: Date
    },
    cashReceipts: {
        checked: {
            type: Boolean,
            default: false
        },
        checkedBy: String,
        checkedAt: Date
    },
    cardDeposits: {
        checked: {
            type: Boolean,
            default: false
        },
        checkedBy: String,
        checkedAt: Date
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    completedBy: String,
    completedAt: Date
}, {
    timestamps: true
});

// 날짜별 유니크 인덱스
dailySettlementCheckSchema.index({ date: 1 }, { unique: true });

export default models.DailySettlementCheck || model<IDailySettlementCheck>('DailySettlementCheck', dailySettlementCheckSchema);