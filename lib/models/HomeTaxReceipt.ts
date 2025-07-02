import mongoose from 'mongoose';

const homeTaxReceiptSchema = new mongoose.Schema({
  작성일자: { type: String, required: true },
  발급일자: { type: String },
  전송일자: { type: String },
  공급자등록번호: { type: String },
  상호: { type: String },
  대표자명: { type: String },
  품목명: { type: String },
  합계금액: { type: Number, default: 0 },
  공급가액: { type: Number, default: 0 },
  세액: { type: Number, default: 0 },
  승인번호: { type: String, unique: true, required: true },
  매칭여부: { type: Boolean, default: false },
  매칭된_지출ID: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }
}, {
  timestamps: true,
  collection: 'hometax_receipts'
});

// 인덱스 생성
homeTaxReceiptSchema.index({ 승인번호: 1 });
homeTaxReceiptSchema.index({ 작성일자: 1 });
homeTaxReceiptSchema.index({ 매칭여부: 1 });

export const HomeTaxReceipt = mongoose.models.HomeTaxReceipt || mongoose.model('HomeTaxReceipt', homeTaxReceiptSchema);