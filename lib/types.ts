// 환자 정보 타입
export type Patient = {
  id: number;
  chartNumber: string;
  name: string;
  treatment: string;
  amount: number;
  paymentMethod: '현금' | '카드' | '계좌이체';
  doctor: string;
};

// 환자 정보 타입 (MongoDB Patient 컬렉션)
export interface PatientData {
  _id?: string;
  chartNumber: string;
  name: string;
  visitPath?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  birthDate?: string;
  gender?: string;
  phoneNumber?: string;
  address?: string;
  memo?: string;
}

// Consultation 타입 (상담 내역)
export interface Consultation {
  _id: string;
  date: Date;
  chartNumber: string;
  patientName: string;
  doctor: string;
  staff: string;
  amount: number;
  agreed: boolean;
  confirmedDate?: Date | null;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Payment 타입 (수납 내역)
export interface Payment {
  _id?: string;
  date: Date;
  method: string;
  cardCompany?: string;
  amount: number;
  isConsultation?: boolean;
}

// Transaction 타입 (MongoDB 데이터 모델)
export interface Transaction {
  _id: string;
  date: Date;
  chartNumber: string;
  patientName: string;
  visitPath: string;
  doctor: string;
  treatmentType: string;
  isNew: boolean;
  isConsultation: boolean;
  paymentMethod: string;
  cardCompany?: string;
  paymentAmount: number;
  notes: string;
  createdBy: string;
  consultations: Consultation[];
  payments: Payment[];
  updatedAt: Date;
  cashReceipt: boolean;
  cashRecordId?: string;
}

// 진료외수입 타입
export interface ExtraIncome {
  _id?: string;
  date: Date;
  type: string;
  amount: number;
  notes?: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 지출 타입
export interface Expense {
  _id?: string;
  date: Date;
  details: string;
  amount: number;
  method: '현금' | '카드' | '계좌이체';
  hasReceipt: boolean;
  vendor?: string;
  account?: string;
  notes?: string;
  createdBy: string;
  cashRecordId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 일별 통계 타입
export type DailyStats = {
  totalPatients: number;
  newPatients: number;
  cashTransferAmount: number;
  cardAmount: number;
  totalPaymentAmount: number;
  nonMedicalIncome: number;
  totalIncome: number;
  totalExpenses: number;
  consultationAgreedAmount: number;
  consultationNonAgreedAmount: number;
  consultationAgreedCount: number;
  consultationNonAgreedCount: number;
};

// 월별 통계 타입
export type MonthlyStats = DailyStats;

// 상담 등록/수정 폼 데이터 타입
export interface ConsultationFormData {
  date: string;
  chartNumber: string;
  patientName: string;
  doctor: string;
  staff: string;
  amount: number;
  agreed: boolean;
  notes?: string;
} 