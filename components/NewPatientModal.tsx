'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface NewPatientModalProps {
  isOpen: boolean;
  chartNumber: string;
  onClose: () => void;
  onSuccess: (patientData: { chartNumber: string; name: string; visitPath: string }) => void;
}

interface PatientFormData {
  name: string;
  visitPath: string;
}

export default function NewPatientModal({ isOpen, chartNumber, onClose, onSuccess }: NewPatientModalProps) {
  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    visitPath: ''
  });
  const [visitPaths, setVisitPaths] = useState<{value: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 내원경로 설정 데이터 가져오기
  const fetchVisitPaths = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings?type=visitPath');
      if (response.ok) {
        const data = await response.json();
        setVisitPaths(data.settings || []);
      } else {
        throw new Error('내원경로 설정을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('내원경로 설정 로드 중 에러:', error);
      toast({
        title: "오류",
        description: "내원경로 설정을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 열릴 때 내원경로 데이터 가져오기
  useEffect(() => {
    if (isOpen) {
      fetchVisitPaths();
      // 폼 초기화
      setFormData({ name: '', visitPath: '' });
      setErrors({});
    }
  }, [isOpen]);

  // 입력 필드 변경 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
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

  // 선택 필드 변경 처리
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      visitPath: value
    }));
    
    // 선택 시 해당 필드의 오류 메시지 삭제
    if (errors.visitPath) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.visitPath;
        return newErrors;
      });
    }
  };

  // 폼 유효성 검사
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '환자명은 필수입니다.';
    }
    
    if (!formData.visitPath) {
      newErrors.visitPath = '내원경로는 필수입니다.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 신규 환자 등록 API 호출
  const registerNewPatient = async (patientData: { chartNumber: string; name: string; visitPath: string }) => {
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || '환자 등록에 실패했습니다.');
      }

      return responseData;
    } catch (error) {
      console.error('환자 등록 중 에러:', error);
      throw error;
    }
  };

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const patientData = {
        chartNumber,
        name: formData.name.trim(),
        visitPath: formData.visitPath
      };

      await registerNewPatient(patientData);
      
      toast({
        title: "등록 완료",
        description: "새로운 환자가 성공적으로 등록되었습니다.",
      });
      
      // 성공 콜백 호출
      onSuccess(patientData);
      
      // 모달 닫기
      onClose();
    } catch (error) {
      toast({
        title: "등록 실패",
        description: error instanceof Error ? error.message : "환자 등록에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>새 환자 등록</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">설정을 불러오는 중입니다...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 차트번호 (읽기 전용) */}
            <div className="space-y-2">
              <Label htmlFor="chartNumber">차트번호</Label>
              <Input
                id="chartNumber"
                value={chartNumber}
                disabled
                className="bg-gray-100"
              />
            </div>
            
            {/* 환자명 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                환자명 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={errors.name ? "border-red-500" : ""}
                placeholder="환자명을 입력하세요"
                required
              />
              {errors.name && (
                <p className="text-red-500 text-xs">{errors.name}</p>
              )}
            </div>
            
            {/* 내원경로 */}
            <div className="space-y-2">
              <Label htmlFor="visitPath">
                내원경로 <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.visitPath} onValueChange={handleSelectChange}>
                <SelectTrigger className={errors.visitPath ? "border-red-500" : ""}>
                  <SelectValue placeholder="내원경로를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {visitPaths.map((path) => (
                    <SelectItem key={path.value} value={path.value}>
                      {path.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.visitPath && (
                <p className="text-red-500 text-xs">{errors.visitPath}</p>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  '등록'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
} 