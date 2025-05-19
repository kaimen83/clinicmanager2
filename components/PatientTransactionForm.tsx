'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useDateContext } from '@/lib/context/dateContext';
import { Consultation, Payment } from '@/lib/types';
import { Check, ChevronLeft, ChevronRight, Plus, Trash } from 'lucide-react';

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
    '진료 정보',
    '수납 정보'
  ];
  
  return <h3 className="text-lg font-medium mb-4">{titles[step - 1]}</h3>;
};

// 상담 내역 입력 폼 컴포넌트
const ConsultationForm = ({ 
  onAdd,
  chartNumber,
  patientName,
  doctor
}: { 
  onAdd: (consultation: Omit<Consultation, '_id' | 'createdAt' | 'updatedAt'>) => void;
  chartNumber: string;
  patientName: string;
  doctor: string;
}) => {
  const { selectedDate } = useDateContext();
  const [formData, setFormData] = useState({
    date: selectedDate.toISOString().split('T')[0],
    chartNumber,
    patientName,
    doctor,
    staff: '',
    amount: 0,
    agreed: false,
    notes: ''
  });

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      chartNumber,
      patientName,
      doctor
    }));
  }, [chartNumber, patientName, doctor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      date: new Date(formData.date),
      confirmedDate: formData.agreed ? new Date(formData.date) : null
    });
    
    // 일부 필드 초기화
    setFormData(prev => ({
      ...prev,
      staff: '',
      amount: 0,
      agreed: false,
      notes: ''
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-md">
      <h4 className="font-medium">상담 내역 추가</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="staff">상담직원</Label>
          <Input
            id="staff"
            name="staff"
            value={formData.staff}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="amount">상담금액</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            value={formData.amount}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="agreed"
          name="agreed"
          checked={formData.agreed}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreed: checked }))}
        />
        <Label htmlFor="agreed">동의 여부</Label>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="notes">메모</Label>
        <Input
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
        />
      </div>
      
      <Button type="submit" className="w-full">추가</Button>
    </form>
  );
};

// 상담 내역 목록 컴포넌트
const ConsultationList = ({ 
  consultations,
  onToggleAgreed,
  onDelete
}: { 
  consultations: Omit<Consultation, '_id' | 'createdAt' | 'updatedAt'>[];
  onToggleAgreed: (index: number) => void;
  onDelete: (index: number) => void;
}) => {
  if (consultations.length === 0) {
    return <p className="text-gray-500 text-center py-4">상담 내역이 없습니다.</p>;
  }
  
  return (
    <div className="mt-4 border rounded-md overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-xs font-medium text-gray-500 text-left">상담일자</th>
            <th className="px-4 py-2 text-xs font-medium text-gray-500 text-left">상담직원</th>
            <th className="px-4 py-2 text-xs font-medium text-gray-500 text-left">금액</th>
            <th className="px-4 py-2 text-xs font-medium text-gray-500 text-left">동의여부</th>
            <th className="px-4 py-2 text-xs font-medium text-gray-500 text-left">관리</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {consultations.map((consultation, index) => (
            <tr key={index}>
              <td className="px-4 py-2 text-sm">{new Date(consultation.date).toLocaleDateString()}</td>
              <td className="px-4 py-2 text-sm">{consultation.staff}</td>
              <td className="px-4 py-2 text-sm">{consultation.amount.toLocaleString()}원</td>
              <td className="px-4 py-2 text-sm">
                <Button 
                  variant="outline" 
                  size="sm"
                  className={consultation.agreed ? "bg-green-100" : "bg-gray-100"}
                  onClick={() => onToggleAgreed(index)}
                >
                  {consultation.agreed ? "동의" : "미동의"}
                </Button>
              </td>
              <td className="px-4 py-2 text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function PatientTransactionForm({ isOpen, onClose, onTransactionAdded }: Props) {
  const { selectedDate } = useDateContext();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  // 폼 상태 관리
  const [formData, setFormData] = useState({
    chartNumber: '',
    patientName: '',
    visitPath: '',
    doctor: '',
    treatmentType: '',
    isNew: false,
    isConsultation: false,
    paymentMethod: '현금',
    cardCompany: '',
    cashReceipt: false,
    paymentAmount: 0,
    notes: ''
  });

  // 상담 내역 상태 관리
  const [consultations, setConsultations] = useState<Omit<Consultation, '_id' | 'createdAt' | 'updatedAt'>[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      chartNumber: '',
      patientName: '',
      visitPath: '',
      doctor: '',
      treatmentType: '',
      isNew: false,
      isConsultation: false,
      paymentMethod: '현금',
      cardCompany: '',
      cashReceipt: false,
      paymentAmount: 0,
      notes: ''
    });
    setConsultations([]);
    setErrors({});
    setCurrentStep(1);
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
    } else if (currentStep === 3) {
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

  // 상담 내역 추가
  const handleAddConsultation = (consultation: Omit<Consultation, '_id' | 'createdAt' | 'updatedAt'>) => {
    setConsultations(prev => [...prev, consultation]);
  };

  // 상담 내역 동의 여부 토글
  const handleToggleConsultationAgreed = (index: number) => {
    setConsultations(prev => prev.map((consultation, i) => {
      if (i === index) {
        return {
          ...consultation,
          agreed: !consultation.agreed,
          confirmedDate: !consultation.agreed ? new Date() : null
        };
      }
      return consultation;
    }));
  };

  // 상담 내역 삭제
  const handleDeleteConsultation = (index: number) => {
    setConsultations(prev => prev.filter((_, i) => i !== index));
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
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // 서버에 전송할 데이터
      const transactionData = {
        ...formData,
        date: dateStr,
        consultations: consultations
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
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="chartNumber">차트번호</Label>
          <Input
            id="chartNumber"
            name="chartNumber"
            value={formData.chartNumber}
            onChange={handleInputChange}
            className={errors.chartNumber ? "border-red-500" : ""}
          />
          {errors.chartNumber && (
            <p className="text-red-500 text-xs">{errors.chartNumber}</p>
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
          />
          {errors.patientName && (
            <p className="text-red-500 text-xs">{errors.patientName}</p>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="visitPath">내원경로</Label>
        <Select 
          onValueChange={(value) => handleSelectChange('visitPath', value)}
          value={formData.visitPath}
        >
          <SelectTrigger className={errors.visitPath ? "border-red-500" : ""}>
            <SelectValue placeholder="선택하세요" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="지인소개">지인소개</SelectItem>
            <SelectItem value="네이버">네이버</SelectItem>
            <SelectItem value="구글">구글</SelectItem>
            <SelectItem value="인스타그램">인스타그램</SelectItem>
            <SelectItem value="기타">기타</SelectItem>
          </SelectContent>
        </Select>
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
        />
      </div>
    </div>
  );

  // 2단계: 진료 정보 입력 단계
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
            <SelectItem value="김원장">김원장</SelectItem>
            <SelectItem value="이원장">이원장</SelectItem>
            <SelectItem value="박원장">박원장</SelectItem>
          </SelectContent>
        </Select>
        {errors.doctor && (
          <p className="text-red-500 text-xs">{errors.doctor}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="treatmentType">진료내용</Label>
        <Input
          id="treatmentType"
          name="treatmentType"
          value={formData.treatmentType}
          onChange={handleInputChange}
          className={errors.treatmentType ? "border-red-500" : ""}
        />
        {errors.treatmentType && (
          <p className="text-red-500 text-xs">{errors.treatmentType}</p>
        )}
      </div>
      
      <div className="space-y-2 flex items-center">
        <div className="flex-1">
          <Label htmlFor="isConsultation">상담수납</Label>
        </div>
        <Switch
          id="isConsultation"
          checked={formData.isConsultation}
          onCheckedChange={(checked) => handleSwitchChange('isConsultation', checked)}
        />
      </div>
      
      {/* 상담 내역 섹션 */}
      <div className="mt-6 border-t pt-4">
        <h4 className="font-medium mb-4">상담 내역</h4>
        
        <ConsultationForm
          onAdd={handleAddConsultation}
          chartNumber={formData.chartNumber}
          patientName={formData.patientName}
          doctor={formData.doctor}
        />
        
        <ConsultationList
          consultations={consultations}
          onToggleAgreed={handleToggleConsultationAgreed}
          onDelete={handleDeleteConsultation}
        />
      </div>
    </div>
  );

  // 3단계: 수납 정보 입력 단계
  const renderPaymentInfoStep = () => (
    <div className="space-y-4">
      <StepTitle step={3} />
      
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
  );

  // 단계별 컨텐츠 렌더링
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderPatientInfoStep();
      case 2:
        return renderTreatmentInfoStep();
      case 3:
        return renderPaymentInfoStep();
      default:
        return null;
    }
  };

  return (
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
                disabled={isSubmitting}
              >
                취소
              </Button>
              
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPreviousStep}
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                >
                  다음
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '처리 중...' : '등록'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 