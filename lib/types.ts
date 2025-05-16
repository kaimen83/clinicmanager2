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
};

// 월별 통계 타입
export type MonthlyStats = DailyStats; 