'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { toISODateString } from '@/lib/utils';
import { useUserRole } from './UserRoleProvider';
import { 
  Loader2, 
  MessageSquare, 
  Calendar, 
  User, 
  UserCheck, 
  DollarSign, 
  CheckCircle2, 
  FileText,
  Stethoscope,
  Users,
  Edit
} from 'lucide-react';

interface ConsultationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultation: any;
  onSuccess: () => void;
}

interface Settings {
  doctor: Array<{ value: string }>;
  staff: Array<{ value: string }>;
  consultationDisagreementReasons: Array<{ value: string }>;
}

export default function ConsultationEditModal({
  isOpen,
  onClose,
  consultation,
  onSuccess
}: ConsultationEditModalProps) {
  const { toast } = useToast();
  const { userWithRole } = useUserRole();
  const [formData, setFormData] = useState({
    date: '',
    chartNumber: '',
    patientName: '',
    doctor: '',
    staff: '',
    amount: '',
    agreed: false,
    disagreementReason: '',
    notes: ''
  });
  const [settings, setSettings] = useState<Settings>({ doctor: [], staff: [], consultationDisagreementReasons: [] });
  const [loading, setLoading] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 상담 정보 로드 및 폼 초기화
  useEffect(() => {
    if (isOpen && consultation) {
      loadSettings();
      
      // 기존 상담 정보로 폼 초기화
      const consultationDate = consultation.date ? new Date(consultation.date) : new Date();
      setFormData({
        date: toISODateString(consultationDate),
        chartNumber: consultation.chartNumber || '',
        patientName: consultation.patientName || '',
        doctor: consultation.doctor || '',
        staff: consultation.staff || '',
        amount: consultation.amount ? consultation.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '',
        agreed: Boolean(consultation.agreed),
        disagreementReason: consultation.disagreementReason || '',
        notes: consultation.notes || ''
      });
      setErrors({});
    }
  }, [isOpen, consultation]);

  const loadSettings = async () => {
    try {
      setIsLoadingSettings(true);
      // 의사 데이터 가져오기
      const doctorResponse = await fetch('/api/settings?type=doctor');
      let doctorData = [];
      if (doctorResponse.ok) {
        const data = await doctorResponse.json();
        doctorData = data.settings || [];
      }

      // 직원 데이터 가져오기
      const staffResponse = await fetch('/api/settings?type=staff');
      let staffData = [];
      if (staffResponse.ok) {
        const data = await staffResponse.json();
        staffData = data.settings || [];
      }

      // 상담 동의 거부 이유 데이터 가져오기
      const disagreementResponse = await fetch('/api/settings?type=consultationDisagreementReason');
      let disagreementData = [];
      if (disagreementResponse.ok) {
        const data = await disagreementResponse.json();
        disagreementData = data.settings || [];
      }

      setSettings({
        doctor: doctorData,
        staff: staffData,
        consultationDisagreementReasons: disagreementData
      });
    } catch (error) {
      console.error('설정 로드 중 오류:', error);
      toast({
        title: "오류",
        description: "설정을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // 상담금액 필드에 천단위 구분자 처리
    if (name === 'amount') {
      // 숫자만 추출
      const numericValue = value.replace(/[^\d]/g, '');
      // 천단위 구분자 추가
      const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 선택 시 해당 필드의 오류 메시지 삭제
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      agreed: checked,
      // 동의함으로 바뀔 때 동의 거부 이유 초기화
      disagreementReason: checked ? '' : prev.disagreementReason
    }));

    // 동의함으로 바뀔 때 관련 오류 메시지 삭제
    if (checked) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.disagreementReason;
        delete newErrors.notes;
        return newErrors;
      });
    }
  };

  // 폼 유효성 검사
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.doctor) {
      newErrors.doctor = '담당의사는 필수입니다.';
    }
    
    if (!formData.staff) {
      newErrors.staff = '상담직원은 필수입니다.';
    }
    
    if (!formData.amount) {
      newErrors.amount = '상담금액은 필수입니다.';
    } else {
      // 콤마 제거 후 숫자 검증
      const numericAmount = formData.amount.replace(/,/g, '');
      if (Number(numericAmount) < 0) {
        newErrors.amount = '상담금액은 0 이상이어야 합니다.';
      }
    }
    
    // 동의 안함일 때 추가 검증
    if (!formData.agreed) {
      if (!formData.disagreementReason) {
        newErrors.disagreementReason = '동의 거부 이유는 필수입니다.';
      }
      // 동의 거부 이유가 "기타"일 경우에만 비고 필수
      if (formData.disagreementReason === '기타' && (!formData.notes || formData.notes.trim() === '')) {
        newErrors.notes = '동의 거부 이유가 "기타"일 경우 상세 내용(비고)은 필수입니다.';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consultation?._id) {
      toast({
        title: "오류",
        description: "상담 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const updateData = {
        date: formData.date,
        chartNumber: formData.chartNumber,
        patientName: formData.patientName,
        doctor: formData.doctor,
        staff: formData.staff,
        amount: Number(formData.amount.replace(/,/g, '')),
        agreed: formData.agreed,
        disagreementReason: formData.agreed ? null : formData.disagreementReason,
        notes: formData.notes || ''
      };

      const response = await fetch(`/api/consultations/${consultation._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '상담 정보 수정에 실패했습니다.');
      }

      toast({
        title: "성공",
        description: "상담 정보가 수정되었습니다.",
      });
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('상담 정보 수정 중 오류:', error);
      toast({
        title: "오류",
        description: error.message || "상담 정보 수정에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!consultation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <Edit className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">상담 정보 수정</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">기존 상담 정보를 수정하고 관리하세요</p>
            </div>
          </div>
        </DialogHeader>

        {isLoadingSettings ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-gray-600">설정을 불러오는 중입니다...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* 기본 정보 카드 */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <CardTitle className="text-sm font-medium text-gray-700">기본 정보</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 상담날짜 */}
                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                        상담날짜
                      </Label>
                      <Input
                        type="date"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        disabled={userWithRole?.role === 'STAFF'}
                        required
                        className={`${
                          userWithRole?.role === 'STAFF' 
                            ? "bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                        }`}
                        title={userWithRole?.role === 'STAFF' ? "일반직원은 오늘 날짜로만 등록 가능합니다" : ""}
                      />
                    </div>

                    {/* 차트번호 */}
                    <div className="space-y-2">
                      <Label htmlFor="chartNumber" className="text-sm font-medium text-gray-700">
                        차트번호
                      </Label>
                      <Input
                        id="chartNumber"
                        name="chartNumber"
                        value={formData.chartNumber}
                        readOnly
                        className="bg-gray-50 border-gray-200 text-gray-700 font-mono"
                      />
                    </div>

                    {/* 환자명 */}
                    <div className="space-y-2">
                      <Label htmlFor="patientName" className="text-sm font-medium text-gray-700">
                        환자명
                      </Label>
                      <Input
                        id="patientName"
                        name="patientName"
                        value={formData.patientName}
                        readOnly
                        className="bg-gray-50 border-gray-200 text-gray-700"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* 담당자 정보 카드 */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <CardTitle className="text-sm font-medium text-gray-700">담당자 정보</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 담당의사 */}
                    <div className="space-y-2">
                      <Label htmlFor="doctor" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" />
                        담당의사
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.doctor} onValueChange={(value) => handleSelectChange('doctor', value)}>
                        <SelectTrigger className={`transition-all duration-200 ${
                          errors.doctor 
                            ? "border-red-300 focus:border-red-500 focus:ring-red-200" 
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                        }`}>
                          <SelectValue placeholder="담당의사를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {settings.doctor.map((doctor, index) => (
                            <SelectItem key={index} value={doctor.value} className="cursor-pointer">
                              {doctor.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.doctor && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          {errors.doctor}
                        </p>
                      )}
                    </div>

                    {/* 상담직원 */}
                    <div className="space-y-2">
                      <Label htmlFor="staff" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        상담직원
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.staff} onValueChange={(value) => handleSelectChange('staff', value)}>
                        <SelectTrigger className={`transition-all duration-200 ${
                          errors.staff 
                            ? "border-red-300 focus:border-red-500 focus:ring-red-200" 
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                        }`}>
                          <SelectValue placeholder="상담직원을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {settings.staff.map((staff, index) => (
                            <SelectItem key={index} value={staff.value} className="cursor-pointer">
                              {staff.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.staff && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          {errors.staff}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* 상담 상세 정보 카드 */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <CardTitle className="text-sm font-medium text-gray-700">상담 상세 정보</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* 상담금액과 동의여부 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 상담금액 */}
                      <div className="space-y-2">
                        <Label htmlFor="amount" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          상담금액
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          id="amount"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          required
                          className={`transition-all duration-200 ${
                            errors.amount 
                              ? "border-red-300 focus:border-red-500 focus:ring-red-200" 
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                          }`}
                          placeholder="금액을 입력하세요"
                        />
                        {errors.amount && (
                          <p className="text-red-500 text-xs flex items-center gap-1">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            {errors.amount}
                          </p>
                        )}
                      </div>

                      {/* 동의여부 */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">동의여부</Label>
                        <div className="flex items-center space-x-3 h-10">
                          <Switch
                            id="agreed"
                            checked={formData.agreed}
                            onCheckedChange={handleSwitchChange}
                          />
                          <Label htmlFor="agreed" className="cursor-pointer flex items-center gap-2">
                            {formData.agreed ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-green-700 font-medium">동의함</span>
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  확인됨
                                </Badge>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-600">동의 안함</span>
                                <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                  미확인
                                </Badge>
                              </>
                            )}
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* 동의 거부 이유 - 동의 안함일 때만 표시 */}
                    {!formData.agreed && (
                      <div className="space-y-2">
                        <Label htmlFor="disagreementReason" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          동의 거부 이유
                          <span className="text-red-500">*</span>
                        </Label>
                        <Select 
                          value={formData.disagreementReason} 
                          onValueChange={(value) => handleSelectChange('disagreementReason', value)}
                        >
                          <SelectTrigger className={`transition-all duration-200 ${
                            errors.disagreementReason 
                              ? "border-red-300 focus:border-red-500 focus:ring-red-200" 
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                          }`}>
                            <SelectValue placeholder="동의 거부 이유를 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {settings.consultationDisagreementReasons.map((reason, index) => (
                              <SelectItem key={index} value={reason.value} className="cursor-pointer">
                                {reason.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.disagreementReason && (
                          <p className="text-red-500 text-xs flex items-center gap-1">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            {errors.disagreementReason}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 비고 */}
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        비고
                        {!formData.agreed && formData.disagreementReason === '기타' && <span className="text-red-500">*</span>}
                      </Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className={`border-gray-300 focus:border-blue-500 focus:ring-blue-200 resize-none transition-all duration-200 ${
                          errors.notes 
                            ? "border-red-300 focus:border-red-500 focus:ring-red-200" 
                            : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                        }`}
                        placeholder={
                          formData.agreed 
                            ? "추가 메모나 특이사항을 입력하세요" 
                            : formData.disagreementReason === '기타'
                              ? "동의 거부 이유(기타) 상세 내용을 필수로 입력하세요"
                              : "추가 메모나 특이사항을 입력하세요"
                        }
                      />
                      {errors.notes && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          {errors.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-6" />

            {/* 버튼 영역 */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="px-6"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="px-6 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    수정 중...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    수정
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}