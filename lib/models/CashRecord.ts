import mongoose, { Schema, Document, models, model } from 'mongoose';

export interface ICashRecord extends Document {
  date: Date;
  type: '수입' | '지출' | '통장입금';
  amount: number;
  description?: string;
  transactionId?: mongoose.Types.ObjectId;
  expenseId?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const cashRecordSchema = new Schema<ICashRecord>({
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['수입', '지출', '통장입금'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String
  },
  transactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  expenseId: {
    type: Schema.Types.ObjectId,
    ref: 'Expense'
  }
}, {
  timestamps: true
});

export default (models.CashRecord as mongoose.Model<ICashRecord>) || model<ICashRecord>('CashRecord', cashRecordSchema);