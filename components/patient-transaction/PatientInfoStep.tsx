import { FocusEvent, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PatientInfoStepProps } from '@/types/patient-transaction';
import { StepTitle } from './StepComponents';

export default function PatientInfoStep({
  formData,
  errors,
  isLoading,
  patientNotFound,
  isNewPatientPrompt,
  handleInputChange,
  handleChartNumberBlur,
  handleSwitchChange,
}: PatientInfoStepProps) {
  const chartNumberRef = useRef<HTMLInputElement>(null);

  // 컴포넌트가 마운트될 때 차트번호 입력란에 자동 포커스
  useEffect(() => {
    if (chartNumberRef.current) {
      chartNumberRef.current.focus();
    }
  }, []);

  // 키보드 이벤트 처리 함수 - Enter 키 입력 시 다음 필드로 이동
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextFieldId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextField = document.getElementById(nextFieldId) as HTMLInputElement;
      if (nextField) {
        nextField.focus();
      }
    }
  };

  return (
    <div className="space-y-4">
      <StepTitle step={1} />
      
      <div className="space-y-2">
        <Label htmlFor="date">
          내원 날짜 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="date"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleInputChange}
          className={errors.date ? "border-red-500" : ""}
          tabIndex={1}
          onKeyDown={(e) => handleKeyDown(e, 'chartNumber')}
        />
        {errors.date && (
          <p className="text-red-500 text-xs">{errors.date}</p>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="chartNumber">
            차트번호 <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="chartNumber"
              name="chartNumber"
              ref={chartNumberRef}
              value={formData.chartNumber}
              onChange={handleInputChange}
              onBlur={handleChartNumberBlur}
              className={errors.chartNumber ? "border-red-500" : ""}
              disabled={isLoading}
              tabIndex={2}
              onKeyDown={(e) => handleKeyDown(e, 'patientName')}
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
          <Label htmlFor="patientName">
            환자명 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="patientName"
            name="patientName"
            value={formData.patientName}
            onChange={handleInputChange}
            className={errors.patientName ? "border-red-500" : ""}
            disabled={true}
            title="차트번호 입력 시 자동으로 채워집니다"
            tabIndex={3}
            onKeyDown={(e) => handleKeyDown(e, 'visitPath')}
          />
          {errors.patientName && (
            <p className="text-red-500 text-xs">{errors.patientName}</p>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="visitPath">
          내원경로 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="visitPath"
          name="visitPath"
          value={formData.visitPath}
          onChange={handleInputChange}
          className={errors.visitPath ? "border-red-500" : ""}
          disabled={true}
          title="차트번호 입력 시 자동으로 채워집니다"
          tabIndex={4}
          onKeyDown={(e) => handleKeyDown(e, 'isNew')}
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
          disabled={isLoading}
          tabIndex={5}
        />
      </div>
    </div>
  );
} 