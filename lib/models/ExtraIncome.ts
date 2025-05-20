import mongoose, { Schema } from 'mongoose';

const ExtraIncomeSchema = new Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  notes: String,
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.models.ExtraIncome || mongoose.model('ExtraIncome', ExtraIncomeSchema); 