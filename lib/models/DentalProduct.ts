import mongoose, { Document, Schema } from 'mongoose';

export interface IDentalProduct extends Document {
  name: string;
  manufacturer: string;
  specification?: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

const DentalProductSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  manufacturer: {
    type: String,
    required: true,
    trim: true
  },
  specification: {
    type: String,
    trim: true
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
});

// 인덱스 생성
DentalProductSchema.index({ name: 1 });
DentalProductSchema.index({ manufacturer: 1 });
DentalProductSchema.index({ stock: 1 });

export default mongoose.models.DentalProduct || mongoose.model<IDentalProduct>('DentalProduct', DentalProductSchema); 