import mongoose from 'mongoose';

const homeTaxCashReceiptSchema = new mongoose.Schema({
  매입일시: { type: String, required: true },
  사용자명: { type: String },
  가맹점사업자번호: { type: String },
  가맹점명: { type: String },
  업종코드: { type: String },
  업종: { type: String },
  업태: { type: String },
  공급가액: { type: Number, default: 0 },
  부가세: { type: Number, default: 0 },
  봉사료: { type: Number, default: 0 },
  매입금액: { type: Number, default: 0 },
  승인번호: { type: String, unique: true, required: true },
  발급수단: { type: String },
  거래구분: { type: String },
  거래일자: { type: String },
  가맹점납세자통합관리번호: { type: String },
  공제여부: { type: String },
  매칭여부: { type: Boolean, default: false },
  매칭된_지출ID: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }
}, {
  timestamps: true,
  collection: 'hometax_cash_receipts'
});

// 인덱스 생성
homeTaxCashReceiptSchema.index({ 승인번호: 1 });
homeTaxCashReceiptSchema.index({ 매입일시: 1 });
homeTaxCashReceiptSchema.index({ 매칭여부: 1 });

export const HomeTaxCashReceipt = mongoose.models.HomeTaxCashReceipt || mongoose.model('HomeTaxCashReceipt', homeTaxCashReceiptSchema);