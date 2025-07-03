import mongoose, { Schema } from 'mongoose';

const DailyActualCardDepositSchema = new Schema({
  depositDate: {
    type: Date,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  deposits: [{
    cardDepositId: {
      type: Schema.Types.ObjectId,
      ref: 'CardDeposit',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    cardCompany: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});

// 날짜별 인덱스
DailyActualCardDepositSchema.index({ depositDate: 1 });

const DailyActualCardDeposit = mongoose.models.DailyActualCardDeposit || mongoose.model('DailyActualCardDeposit', DailyActualCardDepositSchema);

export default DailyActualCardDeposit;