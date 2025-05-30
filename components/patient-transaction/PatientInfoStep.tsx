import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StepTitle } from './StepComponents';
import { PatientInfoStepProps } from '@/types/patient-transaction';
import { Loader2, Calendar, Hash, User, MapPin, UserCheck } from 'lucide-react';

export default function PatientInfoStep({
  formData,
  errors,
  isLoading,
  patientNotFound,
  isNewPatientPrompt,
  chartNumberRef,
  handleInputChange,
  handleChartNumberBlur,
  handleSwitchChange
}: PatientInfoStepProps) {
  
  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextField = document.getElementById(nextFieldId);
      if (nextField) {
        nextField.focus();
      }
    }
  };

  return (
    <div className="space-y-6">
      <StepTitle step={1} />
      
      {/* 내원 날짜 - 컴팩트 버전 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date" className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            내원 날짜
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleInputChange}
            className={`transition-all duration-200 ${
              errors.date 
                ? "border-red-300 focus:border-red-500 focus:ring-red-200" 
                : "border-gray-300 focus:border-purple-500 focus:ring-purple-200"
            }`}
            tabIndex={1}
            onKeyDown={(e) => handleKeyDown(e, 'chartNumber')}
          />
          {errors.date && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <span className="w-1 h-1 bg-red-500 rounded-full"></span>
              {errors.date}
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* 환자 정보 카드 */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <CardTitle className="text-sm font-medium text-gray-700">환자 정보</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* 차트번호와 환자명 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chartNumber" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  차트번호
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="chartNumber"
                    name="chartNumber"
                    ref={chartNumberRef}
                    value={formData.chartNumber}
                    onChange={handleInputChange}
                    onBlur={handleChartNumberBlur}
                    className={`transition-all duration-200 ${
                      errors.chartNumber 
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200" 
                        : "border-gray-300 focus:border-purple-500 focus:ring-purple-200"
                    }`}
                    disabled={isLoading}
                    tabIndex={2}
                    onKeyDown={(e) => handleKeyDown(e, 'patientName')}
                    placeholder="차트번호를 입력하세요"
                  />
                  {isLoading && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    </div>
                  )}
                </div>
                {errors.chartNumber && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {errors.chartNumber}
                  </p>
                )}
                {patientNotFound && !isNewPatientPrompt && (
                  <p className="text-amber-600 text-xs flex items-center gap-1">
                    <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                    등록되지 않은 환자입니다.
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="patientName" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  환자명
                  <span className="text-red-500">*</span>
                  <Badge variant="secondary" className="text-xs ml-1">자동입력</Badge>
                </Label>
                <Input
                  id="patientName"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleInputChange}
                  className={`transition-all duration-200 bg-gray-50 ${
                    errors.patientName 
                      ? "border-red-300" 
                      : "border-gray-200"
                  }`}
                  disabled={true}
                  title="차트번호 입력 시 자동으로 채워집니다"
                  tabIndex={3}
                  onKeyDown={(e) => handleKeyDown(e, 'visitPath')}
                  placeholder="차트번호 입력 후 자동 설정"
                />
                {errors.patientName && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {errors.patientName}
                  </p>
                )}
              </div>
            </div>
            
            {/* 내원경로 */}
            <div className="space-y-2">
              <Label htmlFor="visitPath" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                내원경로
                <span className="text-red-500">*</span>
                <Badge variant="secondary" className="text-xs ml-1">자동입력</Badge>
              </Label>
              <Input
                id="visitPath"
                name="visitPath"
                value={formData.visitPath}
                onChange={handleInputChange}
                className={`transition-all duration-200 bg-gray-50 ${
                  errors.visitPath 
                    ? "border-red-300" 
                    : "border-gray-200"
                }`}
                disabled={true}
                title="차트번호 입력 시 자동으로 채워집니다"
                tabIndex={4}
                onKeyDown={(e) => handleKeyDown(e, 'isNew')}
                placeholder="차트번호 입력 후 자동 설정"
              />
              {errors.visitPath && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.visitPath}
                </p>
              )}
            </div>

            <Separator />
            
            {/* 신환 여부 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-gray-500" />
                <Label htmlFor="isNew" className="text-sm font-medium text-gray-700">
                  신환 여부
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="isNew"
                  checked={formData.isNew}
                  onCheckedChange={(checked) => handleSwitchChange('isNew', checked)}
                  disabled={isLoading}
                  tabIndex={5}
                />
                <Label htmlFor="isNew" className="cursor-pointer">
                  {formData.isNew ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      신환
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      재진
                    </Badge>
                  )}
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 