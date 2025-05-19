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
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded?: () => void;
};

// 스텝 인디케이터 컴포넌트
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  return (
    <div className="flex items-center justify-center mb-6 gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`
            flex items-center justify-center w-8 h-8 rounded-full border 
            ${
              index + 1 === currentStep
                ? 'bg-primary text-white border-primary'
                : index + 1 < currentStep
                ? 'bg-primary/20 border-primary/20'
                : 'bg-gray-100 border-gray-200'
            }
          `}
        >
          {index + 1 < currentStep ? (
            <Check className="h-4 w-4" />
          ) : (
            <span>{index + 1}</span>
          )}
        </div>
      ))}
    </div>
  );
};

// 단계별 제목 컴포넌트
const StepTitle = ({ step }: { step: number }) => {
  const titles = [
    '환자 정보',
    '진료 및 수납 정보'
  ];
  
  return <h3 className="text-lg font-medium mb-4">{titles[step - 1]}</h3>;
};

export default function PatientTransactionForm({ isOpen, onClose, onTransactionAdded }: Props) {
  const { selectedDate } = useDateContext();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2; // 단계를 2단계로 줄임
  
  // 폼 상태 관리
  const [formData, setFormData] = useState({
    date: selectedDate.toISOString().split('T')[0], // 내원 날짜 추가
    chartNumber: '',
    patientName: '',
    visitPath: '',
    doctor: '',
    treatmentType: '',
    isNew: false,
    paymentMethod: '현금',
    cardCompany: '',
    cashReceipt: false,
    paymentAmount: 0,
    notes: ''
  });

  // 추가 상태 변수
  const [isLoading, setIsLoading] = useState(false);
  const [isNewPatientPrompt, setIsNewPatientPrompt] = useState(false);
  const [patientNotFound, setPatientNotFound] = useState(false);
  
  // 시스템 설정 데이터
  const [doctors, setDoctors] = useState<{value: string}[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<{value: string}[]>([]);

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
      doctor: '',
      treatmentType: '',
      isNew: false,
      paymentMethod: '현금',
      cardCompany: '',
      cashReceipt: false,
      paymentAmount: 0,
      notes: ''
    });
    setErrors({});
    setCurrentStep(1);
    setPatientNotFound(false);
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

  // Select 필드 변경 처리
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 결제 방식이 카드가 아닌 경우 카드사 초기화
    if (name === 'paymentMethod' && value !== '카드') {
      setFormData(prev => ({
        ...prev,
        cardCompany: ''
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
    } else if (currentStep === 2) {
      if (!formData.doctor) {
        newErrors.doctor = '진료의사는 필수입니다.';
      }
      
      if (!formData.treatmentType) {
        newErrors.treatmentType = '진료내용은 필수입니다.';
      }
      
      if (!formData.paymentMethod) {
        newErrors.paymentMethod = '수납방법은 필수입니다.';
      }
      
      if (formData.paymentMethod === '카드' && !formData.cardCompany) {
        newErrors.cardCompany = '카드 결제 시 카드사 정보는 필수입니다.';
      }
      
      if (formData.paymentAmount <= 0) {
        newErrors.paymentAmount = '수납금액은 0보다 커야 합니다.';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 다음 단계로 이동
  const goToNextStep = () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // 이전 단계로 이동
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 최종 유효성 검사
    if (!validateCurrentStep()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 서버에 전송할 데이터
      const transactionData = {
        ...formData,
        date: formData.date,
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
      
      toast({
        title: "내원정보가 등록되었습니다.",
        description: `${formData.patientName} 환자의 내원정보가 성공적으로 등록되었습니다.`,
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

  // 1단계: 환자 정보 입력 단계
  const renderPatientInfoStep = () => (
    <div className="space-y-4">
      <StepTitle step={1} />
      
      <div className="space-y-2">
        <Label htmlFor="date">내원 날짜</Label>
        <Input
          id="date"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleInputChange}
          className={errors.date ? "border-red-500" : ""}
        />
        {errors.date && (
          <p className="text-red-500 text-xs">{errors.date}</p>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="chartNumber">차트번호</Label>
          <div className="relative">
            <Input
              id="chartNumber"
              name="chartNumber"
              value={formData.chartNumber}
              onChange={handleInputChange}
              onBlur={handleChartNumberBlur}
              className={errors.chartNumber ? "border-red-500" : ""}
              disabled={isLoading}
            />
            {isLoading && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
          {errors.chartNumber && (
            <p className="text-red-500 text-xs">{errors.chartNumber}</p>
          )}
          {patientNotFound && !isNewPatientPrompt && (
            <p className="text-amber-500 text-xs">등록되지 않은 환자입니다.</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="patientName">환자명</Label>
          <Input
            id="patientName"
            name="patientName"
            value={formData.patientName}
            onChange={handleInputChange}
            className={errors.patientName ? "border-red-500" : ""}
            disabled={true} // 차트번호 검색으로만 입력 가능하도록 비활성화
            readOnly
          />
          {errors.patientName && (
            <p className="text-red-500 text-xs">{errors.patientName}</p>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="visitPath">내원경로</Label>
        <Input
          id="visitPath"
          name="visitPath"
          value={formData.visitPath}
          onChange={handleInputChange}
          className={errors.visitPath ? "border-red-500" : ""}
          disabled={true} // 차트번호 검색으로만 입력 가능하도록 비활성화
          readOnly
        />
        {errors.visitPath && (
          <p className="text-red-500 text-xs">{errors.visitPath}</p>
        )}
      </div>
      
      <div className="space-y-2 flex items-center">
        <div className="flex-1">
          <Label htmlFor="isNew">신환</Label>
        </div>
        <Switch
          id="isNew"
          checked={formData.isNew}
          onCheckedChange={(checked) => handleSwitchChange('isNew', checked)}
          disabled={true} // 차트번호 검색 결과에 따라 자동으로 설정되도록 비활성화
        />
      </div>
    </div>
  );

  // 2단계: 진료 및 수납 정보 입력 단계 (기존 2,3단계 통합)
  const renderTreatmentInfoStep = () => (
    <div className="space-y-4">
      <StepTitle step={2} />
      
      <div className="space-y-2">
        <Label htmlFor="doctor">진료의</Label>
        <Select 
          onValueChange={(value) => handleSelectChange('doctor', value)}
          value={formData.doctor}
        >
          <SelectTrigger className={errors.doctor ? "border-red-500" : ""}>
            <SelectValue placeholder="선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {doctors.map((doctor, index) => (
              <SelectItem key={index} value={doctor.value}>{doctor.value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.doctor && (
          <p className="text-red-500 text-xs">{errors.doctor}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="treatmentType">진료내용</Label>
        <Select 
          onValueChange={(value) => handleSelectChange('treatmentType', value)}
          value={formData.treatmentType}
        >
          <SelectTrigger className={errors.treatmentType ? "border-red-500" : ""}>
            <SelectValue placeholder="선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {treatmentTypes.map((treatment, index) => (
              <SelectItem key={index} value={treatment.value}>{treatment.value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.treatmentType && (
          <p className="text-red-500 text-xs">{errors.treatmentType}</p>
        )}
      </div>
      
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-4">수납 정보</h4>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">수납방법</Label>
            <Select 
              onValueChange={(value) => handleSelectChange('paymentMethod', value)}
              value={formData.paymentMethod}
            >
              <SelectTrigger className={errors.paymentMethod ? "border-red-500" : ""}>
                <SelectValue placeholder="선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="현금">현금</SelectItem>
                <SelectItem value="카드">카드</SelectItem>
                <SelectItem value="계좌이체">계좌이체</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-red-500 text-xs">{errors.paymentMethod}</p>
            )}
          </div>
          
          {formData.paymentMethod === '카드' && (
            <div className="space-y-2">
              <Label htmlFor="cardCompany">카드사</Label>
              <Select 
                onValueChange={(value) => handleSelectChange('cardCompany', value)}
                value={formData.cardCompany}
              >
                <SelectTrigger className={errors.cardCompany ? "border-red-500" : ""}>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="신한">신한</SelectItem>
                  <SelectItem value="삼성">삼성</SelectItem>
                  <SelectItem value="현대">현대</SelectItem>
                  <SelectItem value="BC">BC</SelectItem>
                  <SelectItem value="국민">국민</SelectItem>
                  <SelectItem value="롯데">롯데</SelectItem>
                  <SelectItem value="우리">우리</SelectItem>
                  <SelectItem value="하나">하나</SelectItem>
                  <SelectItem value="농협">농협</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
              {errors.cardCompany && (
                <p className="text-red-500 text-xs">{errors.cardCompany}</p>
              )}
            </div>
          )}
          
          {(formData.paymentMethod === '현금' || formData.paymentMethod === '계좌이체') && (
            <div className="space-y-2 flex items-center">
              <div className="flex-1">
                <Label htmlFor="cashReceipt">현금영수증</Label>
              </div>
              <Switch
                id="cashReceipt"
                checked={formData.cashReceipt}
                onCheckedChange={(checked) => handleSwitchChange('cashReceipt', checked)}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="paymentAmount">수납금액</Label>
            <Input
              id="paymentAmount"
              name="paymentAmount"
              type="number"
              value={formData.paymentAmount}
              onChange={handleInputChange}
              className={errors.paymentAmount ? "border-red-500" : ""}
            />
            {errors.paymentAmount && (
              <p className="text-red-500 text-xs">{errors.paymentAmount}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">메모</Label>
            <Input
              id="notes"
              name="notes"
              value={formData.notes || ''}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // 단계별 컨텐츠 렌더링
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderPatientInfoStep();
      case 2:
        return renderTreatmentInfoStep();
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