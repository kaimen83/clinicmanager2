import mongoose from 'mongoose';

// 임플란트 정보 스키마
const implantItemSchema = new mongoose.Schema({
  manufacturer: {
    type: String,
    required: true
  },
  specification: {
    type: String,
    required: false
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

// 이식재 정보 스키마
const fixtureItemSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  specification: {
    type: String,
    required: false
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

// 1st OP 메인 스키마
const firstOpSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
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
  implants: [implantItemSchema],
  fixtures: [fixtureItemSchema]
}, {
  timestamps: true
});

// 인덱스 생성
firstOpSchema.index({ chartNumber: 1, date: -1 });
firstOpSchema.index({ date: -1 });

// TypeScript 인터페이스 정의
export interface IImplantItem {
  manufacturer: string;
  specification?: string;
  quantity: number;
}

export interface IFixtureItem {
  type: string;
  specification?: string;
  quantity: number;
}

export interface IFirstOp {
  _id?: string;
  date: Date;
  chartNumber: string;
  patientName: string;
  doctor: string;
  implants: IImplantItem[];
  fixtures: IFixtureItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

const FirstOp = mongoose.models.FirstOp || mongoose.model<IFirstOp>('FirstOp', firstOpSchema);

export default FirstOp; 