'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CalendarIcon } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toISODateString, createNewDate } from '@/lib/utils';
import { ExtraIncome } from '@/lib/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: ExtraIncome) => void;
  defaultDate?: Date;
  editItem?: ExtraIncome | null;
};

export default function ExtraIncomeModal({ isOpen, onClose, onSuccess, defaultDate, editItem }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [incomeTypes, setIncomeTypes] = useState<{ _id: string; value: string }[]>([]);
  const [formData, setFormData] = useState({
    date: defaultDate || createNewDate(),
    type: '',
    amount: '',
    notes: ''
  });
  
  const isEditMode = !!editItem;

  // 진료외수입 유형 조회
  const fetchIncomeTypes = async () => {
    try {
      const response = await fetch('/api/settings?type=extraIncomeType');
      
      if (!response.ok) {
        throw new Error('진료외수입 유형을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      if (data.settings && Array.isArray(data.settings)) {
        setIncomeTypes(data.settings);
        
        // 수정 모드가 아니고 첫 번째 유형이 있을 경우 기본값으로 설정
        if (!isEditMode && data.settings.length > 0 && !formData.type) {
          setFormData(prev => ({ ...prev, type: data.settings[0].value }));
        }
      }
    } catch (error) {
      console.error('진료외수입 유형 조회 에러:', error);
      toast.error('진료외수입 유형을 불러오는데 실패했습니다.');
    }
  };

  // 모달이 열릴 때만 초기화하도록 수정
  useEffect(() => {
    if (isOpen) {
      fetchIncomeTypes();
      
      // 수정 모드일 때와 새로 등록할 때 분리하여 처리
      if (isEditMode && editItem) {
        setFormData({
          date: new Date(editItem.date),
          type: editItem.type,
          amount: editItem.amount.toString(),
          notes: editItem.notes || ''
        });
      } else {
        setFormData({
          date: defaultDate || createNewDate(),
          type: '',  // 유형은 fetchIncomeTypes에서 설정
          amount: '',
          notes: ''
        });
      }
    }
  }, [isOpen]); // isOpen만 의존성으로 설정

  // 입력값 변경 처리
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 날짜 변경 처리
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, date }));
    }
  };

  // 유형 변경 처리
  const handleTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, type: value }));
  };

  // 진료외수입 추가/수정 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!formData.type) {
      toast.error('수입 유형을 선택해주세요.');
      return;
    }
    
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      toast.error('유효한 금액을 입력해주세요.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const reqBody = {
        date: formData.date,
        type: formData.type,
        amount: Number(formData.amount),
        notes: formData.notes,
      };
      
      let response;
      
      if (isEditMode && editItem?._id) {
        // 수정 요청
        response = await fetch('/api/extraIncome', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editItem._id,
            ...reqBody
          }),
        });
      } else {
        // 추가 요청
        response = await fetch('/api/extraIncome', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reqBody),
        });
      }
      
      if (!response.ok) {
        throw new Error(isEditMode ? '진료외수입 수정에 실패했습니다.' : '진료외수입 등록에 실패했습니다.');
      }
      
      const data = await response.json();
      toast.success(isEditMode ? '진료외수입이 수정되었습니다.' : '진료외수입이 등록되었습니다.');
      
      if (onSuccess && (data.extraIncome || (isEditMode && editItem))) {
        onSuccess(data.extraIncome || editItem);
      }
      
      onClose();
    } catch (error) {
      console.error(isEditMode ? '진료외수입 수정 에러:' : '진료외수입 등록 에러:', error);
      toast.error(isEditMode ? '진료외수입 수정에 실패했습니다.' : '진료외수입 등록에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '진료외수입 수정' : '진료외수입 등록'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 날짜 선택 */}
          <div className="space-y-2">
            <Label htmlFor="date">날짜</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? (
                    format(formData.date, 'PPP', { locale: ko })
                  ) : (
                    <span>날짜 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* 수입 유형 선택 */}
          <div className="space-y-2">
            <Label htmlFor="type">수입 유형</Label>
            <Select value={formData.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="수입 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                {incomeTypes.map((type) => (
                  <SelectItem key={type._id} value={type.value}>
                    {type.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* 금액 입력 */}
          <div className="space-y-2">
            <Label htmlFor="amount">금액</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              required
              placeholder="금액 입력"
            />
          </div>
          
          {/* 비고 입력 */}
          <div className="space-y-2">
            <Label htmlFor="notes">비고</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="비고 사항 입력"
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : isEditMode ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 