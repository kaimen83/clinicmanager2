import mongoose from 'mongoose';

const HomeTaxInvoiceSchema = new mongoose.Schema({
  작성일자: { type: String, required: true },
  발급일자: { type: String, required: true },
  전송일자: { type: String, required: true },
  공급자등록번호: { type: String, required: true },
  상호: { type: String, required: true },
  대표자명: { type: String, required: true },
  품목명: { type: String, required: true },
  합계금액: { type: Number, required: true },
  공급가액: { type: Number, required: true },
  세액: { type: Number, required: true, default: 0 }, // 전자계산서는 세액이 0
  승인번호: { type: String, required: true, unique: true },
  매칭여부: { type: Boolean, default: false },
  매칭된_지출ID: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 인덱스 추가
HomeTaxInvoiceSchema.index({ 승인번호: 1 });
HomeTaxInvoiceSchema.index({ 작성일자: 1 });
HomeTaxInvoiceSchema.index({ 매칭여부: 1 });
HomeTaxInvoiceSchema.index({ 합계금액: 1 });

export const HomeTaxInvoice = mongoose.models.HomeTaxInvoice || mongoose.model('HomeTaxInvoice', HomeTaxInvoiceSchema);