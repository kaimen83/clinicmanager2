import mongoose, { Document, Schema } from 'mongoose';

export interface IProductSaleItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  manufacturer: string;
  quantity: number;
  salePrice: number;
}

export interface IDentalProductSale extends Document {
  date: Date;
  chartNumber: string;
  patientName: string;
  doctor: string;
  products: IProductSaleItem[];
  totalAmount: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSaleItemSchema: Schema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'DentalProduct',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  manufacturer: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  salePrice: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: true });

const DentalProductSaleSchema: Schema = new Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  chartNumber: {
    type: String,
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  doctor: {
    type: String,
    required: true
  },
  products: [ProductSaleItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  userId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// 인덱스 생성
DentalProductSaleSchema.index({ date: -1 });
DentalProductSaleSchema.index({ chartNumber: 1 });
DentalProductSaleSchema.index({ userId: 1 });

// 저장 전 총액 계산
DentalProductSaleSchema.pre('save', function(this: IDentalProductSale, next) {
  this.totalAmount = this.products.reduce((sum: number, product: IProductSaleItem) => 
    sum + (product.quantity * product.salePrice), 0);
  next();
});

export default mongoose.models.DentalProductSale || mongoose.model<IDentalProductSale>('DentalProductSale', DentalProductSaleSchema); 