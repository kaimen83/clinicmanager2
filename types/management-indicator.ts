export interface ManagementIndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface MonthlyStats {
  totalPatients: number;
  newPatients: number;
  dailyAvgPatients: number;
  dailyAvgNewPatients: number;
  treatmentDays: number;
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
}

export interface HistoricalData {
  month: string;
  newPatients: number;
  totalPatients: number;
  avgNewPatients: number;
  avgTotalPatients: number;
  treatmentDays: number;
}

export interface DoctorStats {
  doctor: string;
  totalPatients: number;
  newPatients: number;
}

export interface DayOfWeekStats {
  dayOfWeek: string;
  dayNumber: number;
  totalPatients: number;
  newPatients: number;
}

export interface DoctorRevenueStats {
  doctor: string;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  consultationRevenue: number;
}

export interface DayOfWeekRevenueStats {
  dayOfWeek: string;
  dayNumber: number;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
}

export interface RevenueHistoricalData {
  month: string;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  extraIncome: number;
  avgTotalRevenue: number;
  avgCashRevenue: number;
  treatmentDays: number;
  [key: string]: any; // 의사별 매출 데이터를 위한 동적 프로퍼티
}

export interface VisitPathHistoryData {
  month: string;
  groups: Array<{
    groupName: string;
    patientCount: number;
    paymentAmount: number;
    consultationAmount: number;
  }>;
}

export interface ConsultationStats {
  consultationAgreedAmount: number;
  consultationNonAgreedAmount: number;
  totalConsultationAmount: number;
  agreedCount: number;
  nonAgreedCount: number;
  totalConsultationCount: number;
  agreedPercentage: number;
  agreedAmountPercentage: number;
  nonAgreedAmount: number;
}

export interface ConsultationTrendData {
  month: string;
  totalConsultations: number;
  agreedConsultations: number;
  nonAgreedConsultations: number;
  agreedPercentage: number;
  agreedAmountPercentage: number;
  avgConsultationAmount: number;
  totalAmount: number;
  agreedAmount: number;
  nonAgreedAmount: number;
  [key: string]: any; // 의사별, 직원별 동의율 데이터를 위한 동적 프로퍼티
}

export interface DoctorConsultationStats {
  doctor: string;
  totalConsultations: number;
  agreedConsultations: number;
  nonAgreedConsultations: number;
  agreedPercentage: number;
  totalAmount: number;
  agreedAmount: number;
}

export interface StaffConsultationStats {
  staff: string;
  totalConsultations: number;
  agreedConsultations: number;
  agreedPercentage: number;
}

export type AgreementType = 'count' | 'amount';