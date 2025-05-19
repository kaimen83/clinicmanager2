// 환자 진료 폼의 Props 타입
export type PatientTransactionFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded?: () => void;
};

// 진료 그룹 타입 정의
export type TreatmentGroup = {
  id: string;
  doctor: string;
  treatmentType: string;
  paymentMethod: string;
  cardCompany: string;
  cashReceipt: boolean;
  paymentAmount: number;
  notes: string;
};

// 환자 정보 폼 데이터 타입
export type PatientInfoFormData = {
  date: string;
  chartNumber: string;
  patientName: string;
  visitPath: string;
  isNew: boolean;
};

// 스텝 인디케이터 Props 타입
export type StepIndicatorProps = {
  currentStep: number;
  totalSteps: number;
};

// 스텝 타이틀 Props 타입
export type StepTitleProps = {
  step: number;
};

// 환자 정보 스텝 Props 타입
export type PatientInfoStepProps = {
  formData: PatientInfoFormData;
  errors: Record<string, string>;
  isLoading: boolean;
  patientNotFound: boolean;
  isNewPatientPrompt: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleChartNumberBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSwitchChange: (name: string, checked: boolean) => void;
};

// 진료 정보 스텝 Props 타입
export type TreatmentInfoStepProps = {
  treatmentGroups: TreatmentGroup[];
  currentTreatmentGroup: TreatmentGroup;
  errors: Record<string, string>;
  doctors: {value: string}[];
  treatmentTypes: {value: string}[];
  paymentMethods: {value: string}[];
  cardCompanies: {value: string}[];
  handleTreatmentInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTreatmentSelectChange: (name: string, value: string) => void;
  handleTreatmentSwitchChange: (name: string, checked: boolean) => void;
  addTreatmentGroup: () => boolean;
  removeTreatmentGroup: (id: string) => void;
  removeCurrentTreatmentGroup: () => void;
}; 