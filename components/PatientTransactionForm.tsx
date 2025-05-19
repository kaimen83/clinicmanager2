'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useDateContext } from '@/lib/context/dateContext';
import { PatientData } from '@/lib/types';
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';

// 타입 및 컴포넌트 임포트
import { 
  PatientTransactionFormProps, 
  PatientInfoFormData,
  TreatmentGroup 
} from '@/types/patient-transaction';
import { StepIndicator } from './patient-transaction/StepComponents';
import PatientInfoStep from './patient-transaction/PatientInfoStep';
import TreatmentInfoStep from './patient-transaction/TreatmentInfoStep';

export default function PatientTransactionForm({ isOpen, onClose, onTransactionAdded }: PatientTransactionFormProps) {
  const { selectedDate } = useDateContext();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;
  
  // 폼 상태 관리
  const [formData, setFormData] = useState<PatientInfoFormData>({
    date: selectedDate.toISOString().split('T')[0],
    chartNumber: '',
    patientName: '',
    visitPath: '',
    isNew: false,
  });

  // 추가 상태 변수
  const [isLoading, setIsLoading] = useState(false);
  const [isNewPatientPrompt, setIsNewPatientPrompt] = useState(false);
  const [patientNotFound, setPatientNotFound] = useState(false);
  
  // 시스템 설정 데이터
  const [doctors, setDoctors] = useState<{value: string}[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<{value: string}[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{value: string}[]>([]);
  const [cardCompanies, setCardCompanies] = useState<{value: string}[]>([]);

  // 진료 그룹 관리
  const [treatmentGroups, setTreatmentGroups] = useState<TreatmentGroup[]>([]);
  const [currentTreatmentGroup, setCurrentTreatmentGroup] = useState<TreatmentGroup>({
    id: crypto.randomUUID(),
    doctor: '',
    treatmentType: '',
    paymentMethod: '현금',
    cardCompany: '',
    cashReceipt: false,
    paymentAmount: 0,
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 시스템 설정 데이터 가져오기
  const fetchSettings = async () => {
    try {
      // 진료의 데이터 가져오기
      const doctorResponse = await fetch('/api/settings?type=doctor');
      if (doctorResponse.ok) {
        const data = await doctorResponse.json();
        setDoctors(data.settings || []);
      }
      
      // 진료내용 데이터 가져오기
      const treatmentResponse = await fetch('/api/settings?type=treatmentType');
      if (treatmentResponse.ok) {
        const data = await treatmentResponse.json();
        setTreatmentTypes(data.settings || []);
      }

      // 수납방법 데이터 가져오기
      const paymentMethodResponse = await fetch('/api/settings?type=paymentMethod');
      if (paymentMethodResponse.ok) {
        const data = await paymentMethodResponse.json();
        // 수납없음 옵션이 없다면 추가
        let methods = data.settings || [];
        if (!methods.some((m: {value: string}) => m.value === '수납없음')) {
          methods.push({ value: '수납없음' });
        }
        setPaymentMethods(methods);
        
        // 기본값 설정
        if (methods.length > 0) {
          setCurrentTreatmentGroup(prev => ({
            ...prev,
            paymentMethod: methods[0].value
          }));
        }
      }
      
      // 카드사 데이터 가져오기
      const cardCompanyResponse = await fetch('/api/settings?type=cardCompany');
      if (cardCompanyResponse.ok) {
        const data = await cardCompanyResponse.json();
        setCardCompanies(data.settings || []);
      }
    } catch (error) {
      console.error('설정 데이터 조회 오류:', error);
      toast({
        title: "오류",
        description: "설정 데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };
  
  // 모달이 열릴 때 설정 데이터 가져오기
  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  // 환자 정보 조회 함수
  const fetchPatientInfo = async (chartNumber: string) => {
    if (!chartNumber.trim()) return;
    
    setIsLoading(true);
    setPatientNotFound(false);
    
    try {
      const response = await fetch(`/api/patients/${chartNumber}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // 환자 정보가 없는 경우
          setPatientNotFound(true);
          setIsNewPatientPrompt(true);
          
          // 신규 환자로 설정
          setFormData(prev => ({
            ...prev,
            isNew: true,
            patientName: '',
            visitPath: ''
          }));
        } else {
          throw new Error('환자 정보 조회 중 오류가 발생했습니다.');
        }
        return;
      }
      
      // 환자 정보 가져오기 성공
      const patientData: PatientData = await response.json();
      
      // 폼 데이터 자동 입력
      setFormData(prev => ({
        ...prev,
        patientName: patientData.name,
        visitPath: patientData.visitPath || '',
        isNew: false
      }));
      
      toast({
        title: "환자 정보 조회 완료",
        description: `${patientData.name} 환자의 정보가 자동으로 입력되었습니다.`,
      });
    } catch (err) {
      console.error('환자 정보 조회 오류:', err);
      toast({
        title: "오류",
        description: err instanceof Error ? err.message : "환자 정보 조회 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 차트번호 입력 후 실행되는 함수
  const handleChartNumberBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const chartNumber = e.target.value.trim();
    if (chartNumber) {
      fetchPatientInfo(chartNumber);
    }
  };

  // 신규 환자 등록 확인
  const handleConfirmNewPatient = () => {
    setIsNewPatientPrompt(false);
    toast({
      title: "신규 환자",
      description: "새 환자로 등록됩니다. 환자 정보를 입력해주세요.",
    });
  };

  // 신규 환자 등록 취소
  const handleCancelNewPatient = () => {
    setIsNewPatientPrompt(false);
    setFormData(prev => ({
      ...prev,
      chartNumber: '',
      patientName: '',
      visitPath: '',
      isNew: false
    }));
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      date: selectedDate.toISOString().split('T')[0],
      chartNumber: '',
      patientName: '',
      visitPath: '',
      isNew: false,
    });
    setTreatmentGroups([]);
    resetCurrentTreatmentGroup();
    setErrors({});
    setCurrentStep(1);
    setPatientNotFound(false);
  };

  // 현재 진료 그룹 초기화
  const resetCurrentTreatmentGroup = () => {
    const defaultPaymentMethod = paymentMethods.length > 0 ? paymentMethods[0].value : '현금';
    
    setCurrentTreatmentGroup({
      id: crypto.randomUUID(),
      doctor: '',
      treatmentType: '',
      paymentMethod: defaultPaymentMethod,
      cardCompany: '',
      cashReceipt: false,
      paymentAmount: 0,
      notes: ''
    });
  };

  // 현재 진료 그룹 삭제
  const removeCurrentTreatmentGroup = () => {
    resetCurrentTreatmentGroup();
    toast({
      title: "입력 초기화",
      description: "현재 입력 중인 진료 정보가 초기화되었습니다.",
    });
  };

  // 진료 그룹 추가
  const addTreatmentGroup = () => {
    // 현재 그룹의 유효성 검사
    const newErrors: Record<string, string> = {};
    
    if (!currentTreatmentGroup.doctor) {
      newErrors.doctor = '진료의사는 필수입니다.';
    }
    
    if (!currentTreatmentGroup.treatmentType) {
      newErrors.treatmentType = '진료내용은 필수입니다.';
    }
    
    if (!currentTreatmentGroup.paymentMethod) {
      newErrors.paymentMethod = '수납방법은 필수입니다.';
    }
    
    if (currentTreatmentGroup.paymentMethod === '카드' && !currentTreatmentGroup.cardCompany) {
      newErrors.cardCompany = '카드 결제 시 카드사 정보는 필수입니다.';
    }
    
    if (currentTreatmentGroup.paymentMethod !== '수납없음' && currentTreatmentGroup.paymentAmount <= 0) {
      newErrors.paymentAmount = '수납금액은 0보다 커야 합니다.';
    }
    
    setErrors(newErrors);
    
    // 오류가 있으면 추가하지 않음
    if (Object.keys(newErrors).length > 0) {
      return false;
    }
    
    // 현재 그룹을 목록에 추가
    const newGroup = { ...currentTreatmentGroup };
    setTreatmentGroups(prev => [...prev, newGroup]);
    
    // 현재 그룹 초기화
    resetCurrentTreatmentGroup();
    
    // 토스트 메시지
    toast({
      title: "진료 정보 추가",
      description: "진료 정보가 추가되었습니다. 추가 정보를 입력하거나 등록 버튼을 눌러주세요.",
    });
    
    return true;
  };

  // 진료 그룹 삭제
  const removeTreatmentGroup = (id: string) => {
    setTreatmentGroups(prev => prev.filter(group => group.id !== id));
    
    toast({
      title: "진료 정보 삭제",
      description: "선택한 진료 정보가 삭제되었습니다.",
    });
  };

  // 모달이 닫힐 때 폼 초기화
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // 입력 필드 변경 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // 입력 시 해당 필드의 오류 메시지 삭제
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 진료 그룹 입력 필드 변경 처리
  const handleTreatmentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setCurrentTreatmentGroup(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setCurrentTreatmentGroup(prev => ({
        ...prev,
        [name]: parseFloat(value)
      }));
    } else {
      setCurrentTreatmentGroup(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // 입력 시 해당 필드의 오류 메시지 삭제
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Switch 필드 변경 처리
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // 진료 그룹 Switch 필드 변경 처리
  const handleTreatmentSwitchChange = (name: string, checked: boolean) => {
    setCurrentTreatmentGroup(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Select 필드 변경 처리
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 입력 시 해당 필드의 오류 메시지 삭제
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 진료 그룹 Select 필드 변경 처리
  const handleTreatmentSelectChange = (name: string, value: string) => {
    setCurrentTreatmentGroup(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 수납방법 변경 시 추가 처리
    if (name === 'paymentMethod') {
      // 결제 방식이 카드가 아닌 경우 카드사 초기화
      if (value !== '카드') {
        setCurrentTreatmentGroup(prev => ({
          ...prev,
          cardCompany: ''
        }));
      }
      
      // 수납없음인 경우 수납금액 0으로 설정
      if (value === '수납없음') {
        setCurrentTreatmentGroup(prev => ({
          ...prev,
          paymentAmount: 0
        }));
      }
    }
    
    // 입력 시 해당 필드의 오류 메시지 삭제
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 현재 단계 유효성 검사
  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (currentStep === 1) {
      if (!formData.date) {
        newErrors.date = '내원 날짜는 필수입니다.';
      }
      
      if (!formData.chartNumber) {
        newErrors.chartNumber = '차트번호는 필수입니다.';
      }
      
      if (!formData.patientName) {
        newErrors.patientName = '환자 이름은 필수입니다.';
      }
      
      if (!formData.visitPath) {
        newErrors.visitPath = '내원경로는 필수입니다.';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 다음 단계로 이동
  const goToNextStep = () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      // 2단계로 이동 시 오류 메시지 초기화
      setErrors({});
    }
  };

  // 이전 단계로 이동
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      // 오류 메시지 초기화
      setErrors({});
    }
  };

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 최종 유효성 검사
    if (!validateCurrentStep()) {
      return;
    }
    
    // 현재 작업 중인 그룹이 있고 필수 필드가 입력된 경우 자동으로 추가
    const hasCurrentGroup = currentTreatmentGroup.doctor && currentTreatmentGroup.treatmentType && currentTreatmentGroup.paymentMethod;
    
    // 진료 그룹이 없는 경우 오류 메시지
    if (treatmentGroups.length === 0 && !hasCurrentGroup) {
      toast({
        title: "오류",
        description: "최소 하나 이상의 진료 정보를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 처리할 진료 그룹 목록 (현재 작업 중인 그룹이 있으면 포함)
      const groupsToProcess = hasCurrentGroup 
        ? [...treatmentGroups, currentTreatmentGroup]
        : treatmentGroups;
      
      // 각 진료 그룹마다 API 호출을 수행
      const promises = groupsToProcess.map(async (group) => {
        // 서버에 전송할 데이터
        const transactionData = {
          // 1단계 환자 정보
          date: formData.date,
          chartNumber: formData.chartNumber,
          patientName: formData.patientName,
          visitPath: formData.visitPath,
          isNew: formData.isNew,
          
          // 2단계 진료 및 수납 정보 (그룹별)
          doctor: group.doctor,
          treatmentType: group.treatmentType,
          paymentMethod: group.paymentMethod,
          cardCompany: group.cardCompany,
          cashReceipt: group.cashReceipt,
          paymentAmount: group.paymentAmount,
          notes: group.notes
        };
        
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '내원정보 등록에 실패했습니다.');
        }
        
        return response.json();
      });
      
      // 모든 Promise 실행
      await Promise.all(promises);
      
      toast({
        title: "내원정보가 등록되었습니다.",
        description: `${formData.patientName} 환자의 내원정보 ${groupsToProcess.length}건이 성공적으로 등록되었습니다.`,
      });
      
      resetForm();
      onClose();
      
      // 부모 컴포넌트에 알림
      if (onTransactionAdded) {
        onTransactionAdded();
      }
    } catch (err) {
      console.error('내원정보 등록 오류:', err);
      toast({
        title: "오류가 발생했습니다.",
        description: err instanceof Error ? err.message : "내원정보 등록 중 오류가 발생했습니다. 다시 시도해 주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 단계별 컨텐츠 렌더링
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PatientInfoStep
            formData={formData}
            errors={errors}
            isLoading={isLoading}
            patientNotFound={patientNotFound}
            isNewPatientPrompt={isNewPatientPrompt}
            handleInputChange={handleInputChange}
            handleChartNumberBlur={handleChartNumberBlur}
            handleSwitchChange={handleSwitchChange}
          />
        );
      case 2:
        return (
          <TreatmentInfoStep
            treatmentGroups={treatmentGroups}
            currentTreatmentGroup={currentTreatmentGroup}
            errors={errors}
            doctors={doctors}
            treatmentTypes={treatmentTypes}
            paymentMethods={paymentMethods}
            cardCompanies={cardCompanies}
            handleTreatmentInputChange={handleTreatmentInputChange}
            handleTreatmentSelectChange={handleTreatmentSelectChange}
            handleTreatmentSwitchChange={handleTreatmentSwitchChange}
            addTreatmentGroup={addTreatmentGroup}
            removeTreatmentGroup={removeTreatmentGroup}
            removeCurrentTreatmentGroup={removeCurrentTreatmentGroup}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>내원정보 등록</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
            
            {renderStepContent()}
            
            <DialogFooter className="flex justify-between items-center mt-6 pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting || isLoading}
                >
                  취소
                </Button>
                
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goToPreviousStep}
                    disabled={isSubmitting || isLoading}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    이전
                  </Button>
                )}
              </div>
              
              <div>
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={goToNextStep}
                    disabled={isSubmitting || isLoading}
                  >
                    다음
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                  >
                    {isSubmitting ? '처리 중...' : '등록'}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 신규 환자 등록 확인 다이얼로그 */}
      <Dialog open={isNewPatientPrompt} onOpenChange={setIsNewPatientPrompt}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>신규 환자 등록</DialogTitle>
            <DialogDescription>
              입력하신 차트번호({formData.chartNumber})로 등록된 환자 정보를 찾을 수 없습니다. 
              새로운 환자로 등록하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={handleCancelNewPatient}>
              취소
            </Button>
            <Button onClick={handleConfirmNewPatient}>
              신규 환자로 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 