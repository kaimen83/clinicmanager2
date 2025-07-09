import mongoose, { Schema } from 'mongoose';

const CardDepositSchema = new Schema({
  cardCompany: {
    type: String,
    required: true
  },
  saleDate: {
    type: Date,
    required: true
  },
  saleAmount: {
    type: Number,
    required: true
  },
  expectedDepositDate: {
    type: Date,
    required: true
  },
  actualDepositDate: {
    type: Date
  },
  actualDepositAmount: {
    type: Number
  },
  fee: {
    type: Number
  },
  status: {
    type: String,
    enum: ['미입금', '입금완료', '입금보류'],
    default: '미입금'
  },
  holdReason: {
    type: String
  },
  transactionIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  createdBy: {
    type: String, // Clerk User ID
    required: true
  }
}, {
  timestamps: true
});

// 복합 인덱스
CardDepositSchema.index({ saleDate: 1, cardCompany: 1 });
CardDepositSchema.index({ status: 1 });
CardDepositSchema.index({ createdBy: 1 });

const CardDeposit = mongoose.models.CardDeposit || mongoose.model('CardDeposit', CardDepositSchema);

export default CardDeposit;