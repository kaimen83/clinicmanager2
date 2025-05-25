import mongoose, { Schema, Document, models, model } from 'mongoose';

export interface ICashRecord extends Document {
  date: Date;
  type: '수입' | '지출' | '통장입금';
  amount: number;
  description?: string;
  isCompleted: boolean;
  completedAt?: Date;
  groupId?: mongoose.Types.ObjectId;
  isGrouped: boolean;
  isClosed: boolean;
  closingAmount?: number;
  closedAt?: Date;
  transactionId?: mongoose.Types.ObjectId;
  expenseId?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICashRecordModel extends mongoose.Model<ICashRecord> {
  isClosedForDate(date: Date): Promise<boolean>;
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
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'CashRecordGroup'
  },
  isGrouped: {
    type: Boolean,
    default: false
  },
  isClosed: {
    type: Boolean,
    default: false
  },
  closingAmount: {
    type: Number
  },
  closedAt: {
    type: Date
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

// 같은 날짜의 마감 여부 확인 스태틱 메서드
cashRecordSchema.statics.isClosedForDate = async function(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const record = await this.findOne({
    date: {
      $gte: startOfDay,
      $lt: endOfDay
    },
    isClosed: true
  });
  
  return !!record;
};

export default (models.CashRecord as ICashRecordModel) || model<ICashRecord, ICashRecordModel>('CashRecord', cashRecordSchema);