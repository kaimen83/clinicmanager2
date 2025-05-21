'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn, createNewDate } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Expense } from '@/lib/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: Expense) => void;
  defaultDate?: Date;
  editItem?: Expense | null;
};

export default function ExpenseModal({ isOpen, onClose, onSuccess, defaultDate, editItem }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [vendors, setVendors] = useState<Array<{_id: string; name: string}>>([]);
  const [accountTypes, setAccountTypes] = useState<Array<{_id: string; value: string}>>([]);
  const [formData, setFormData] = useState({
    date: defaultDate || createNewDate(),
    details: '',
    amount: '',
    method: '현금',
    hasReceipt: false,
    vendor: 'none',
    account: 'none',
    notes: ''
  });
  
  const isEditMode = !!editItem;

  // 거래처 목록 조회
  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors?onlyActive=true');
      
      if (!response.ok) {
        throw new Error('거래처 목록을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setVendors(data || []);
    } catch (error) {
      console.error('거래처 조회 에러:', error);
      toast.error('거래처 목록을 불러오는데 실패했습니다.');
    }
  };

  // 지출계정 목록 조회
  const fetchAccountTypes = async () => {
    try {
      const response = await fetch('/api/settings?type=expenseAccount');
      
      if (!response.ok) {
        throw new Error('지출계정 목록을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      if (data.settings && Array.isArray(data.settings)) {
        setAccountTypes(data.settings);
      }
    } catch (error) {
      console.error('지출계정 조회 에러:', error);
      toast.error('지출계정 목록을 불러오는데 실패했습니다.');
    }
  };

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      fetchVendors();
      fetchAccountTypes();
      
      // 수정 모드일 때와 새로 등록할 때 분리하여 처리
      if (isEditMode && editItem) {
        setFormData({
          date: new Date(editItem.date),
          details: editItem.details,
          amount: editItem.amount.toString(),
          method: editItem.method,
          hasReceipt: editItem.hasReceipt,
          vendor: editItem.vendor || 'none',
          account: editItem.account || 'none',
          notes: editItem.notes || ''
        });
      } else {
        setFormData({
          date: defaultDate || createNewDate(),
          details: '',
          amount: '',
          method: '현금',
          hasReceipt: false,
          vendor: 'none',
          account: 'none',
          notes: ''
        });
      }
    }
  }, [isOpen, isEditMode, editItem, defaultDate]);

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

  // 지불 방법 변경 처리
  const handleMethodChange = (value: string) => {
    setFormData(prev => ({ ...prev, method: value as '현금' | '카드' | '계좌이체' }));
  };

  // 영수증 여부 변경 처리
  const handleReceiptChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, hasReceipt: checked }));
  };

  // 거래처 변경 처리
  const handleVendorChange = (value: string) => {
    setFormData(prev => ({ ...prev, vendor: value }));
  };

  // 계정과목 변경 처리
  const handleAccountChange = (value: string) => {
    setFormData(prev => ({ ...prev, account: value }));
  };

  // 지출 추가/수정 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!formData.details) {
      toast.error('지출 내역을 입력해주세요.');
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
        details: formData.details,
        amount: Number(formData.amount),
        method: formData.method,
        hasReceipt: formData.hasReceipt,
        vendor: formData.vendor !== 'none' ? formData.vendor : undefined,
        account: formData.account !== 'none' ? formData.account : undefined,
        notes: formData.notes || undefined
      };
      
      let response;
      
      if (isEditMode && editItem?._id) {
        // 수정 요청
        response = await fetch(`/api/expenses/${editItem._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reqBody),
        });
      } else {
        // 추가 요청
        response = await fetch('/api/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reqBody),
        });
      }
      
      if (!response.ok) {
        throw new Error(isEditMode ? '지출 수정에 실패했습니다.' : '지출 등록에 실패했습니다.');
      }
      
      const data = await response.json();
      toast.success(isEditMode ? '지출이 수정되었습니다.' : '지출이 등록되었습니다.');
      
      if (onSuccess) {
        onSuccess(data.data);
      }
      
      onClose();
    } catch (error) {
      console.error(isEditMode ? '지출 수정 에러:' : '지출 등록 에러:', error);
      toast.error(isEditMode ? '지출 수정에 실패했습니다.' : '지출 등록에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '지출 수정' : '지출 등록'}</DialogTitle>
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
          
          {/* 지출 내역 입력 */}
          <div className="space-y-2">
            <Label htmlFor="details">지출 내역</Label>
            <Input
              id="details"
              name="details"
              value={formData.details}
              onChange={handleChange}
              required
              placeholder="지출 내역 입력"
            />
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
          
          {/* 지불 방법 선택 */}
          <div className="space-y-2">
            <Label htmlFor="method">지불 방법</Label>
            <Select value={formData.method} onValueChange={handleMethodChange}>
              <SelectTrigger>
                <SelectValue placeholder="지불 방법 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="현금">현금</SelectItem>
                <SelectItem value="카드">카드</SelectItem>
                <SelectItem value="계좌이체">계좌이체</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 영수증 여부 */}
          <div className="flex items-center space-x-2">
            <Switch
              id="hasReceipt"
              checked={formData.hasReceipt}
              onCheckedChange={handleReceiptChange}
            />
            <Label htmlFor="hasReceipt">영수증 있음</Label>
          </div>
          
          {/* 거래처 선택 */}
          <div className="space-y-2">
            <Label htmlFor="vendor">거래처</Label>
            <Select value={formData.vendor} onValueChange={handleVendorChange}>
              <SelectTrigger>
                <SelectValue placeholder="거래처 선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">선택 안함</SelectItem>
                {vendors.map(vendor => (
                  <SelectItem key={vendor._id} value={vendor.name}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* 계정과목 선택 */}
          <div className="space-y-2">
            <Label htmlFor="account">계정과목</Label>
            <Select value={formData.account} onValueChange={handleAccountChange}>
              <SelectTrigger>
                <SelectValue placeholder="계정과목 선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">선택 안함</SelectItem>
                {accountTypes.map(account => (
                  <SelectItem key={account._id} value={account.value}>
                    {account.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* 비고 입력 */}
          <div className="space-y-2">
            <Label htmlFor="notes">비고</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="비고 입력 (선택사항)"
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              type="button" 
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