import mongoose, { Schema, Document, models, model } from 'mongoose';

export interface IExpense extends Document {
    date: Date;
    details: string;
    amount: number;
    method: '현금' | '카드' | '계좌이체';
    hasReceipt: boolean;
    vendor?: string;
    account?: string;
    notes?: string;
    createdBy: string;
    cashRecordId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const expenseSchema = new Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    details: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    method: {
        type: String,
        required: true,
        enum: ['현금', '카드', '계좌이체']
    },
    hasReceipt: {
        type: Boolean,
        default: false
    },
    vendor: String,
    account: String,
    notes: String,
    createdBy: {
        type: String,
        required: true
    },
    cashRecordId: {
        type: Schema.Types.ObjectId,
        ref: 'CashRecord'
    }
}, {
    timestamps: true
});

export default models.Expense || model<IExpense>('Expense', expenseSchema); 