'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Edit, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { 
  calculateFee, 
  validateDepositAmount, 
  validateDepositDate,
  formatNumberInput,
  parseFormattedNumber
} from '@/lib/utils/depositCalculations';
import { CardSettlementData } from './CardSettlement';

interface EditDepositModalProps {
  item: CardSettlementData;
  onClose: () => void;
  onComplete: () => void;
}

export default function EditDepositModal({ 
  item, 
  onClose, 
  onComplete 
}: EditDepositModalProps) {
  // 폼 상태 - 기존 값으로 초기화
  const [actualDepositDate, setActualDepositDate] = useState<Date>(
    item.actualDepositDate ? new Date(item.actualDepositDate) : new Date()
  );
  const [actualAmountInput, setActualAmountInput] = useState(
    item.actualDepositAmount ? formatNumberInput(item.actualDepositAmount.toString()) : ''
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 실시간 계산 결과
  const actualAmount = parseFormattedNumber(actualAmountInput);
  const feeCalculation = calculateFee(item.totalAmount, actualAmount);

  // 변경사항 감지
  const hasChanges = () => {
    const originalDate = item.actualDepositDate ? new Date(item.actualDepositDate).toDateString() : '';
    const currentDate = actualDepositDate.toDateString();
    const originalAmount = item.actualDepositAmount || 0;
    
    return originalDate !== currentDate || originalAmount !== actualAmount;
  };

  // 입력값 변경 핸들러
  const handleAmountChange = (value: string) => {
    const formatted = formatNumberInput(value);
    setActualAmountInput(formatted);
    setError(''); // 에러 초기화
  };

  // 수정 제출 핸들러
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      // 변경사항 확인
      if (!hasChanges()) {
        setError('변경된 내용이 없습니다.');
        return;
      }

      // 입력값 검증
      const amountValidation = validateDepositAmount(actualAmount, item.totalAmount);
      if (!amountValidation.isValid) {
        setError(amountValidation.message || '입력값이 올바르지 않습니다.');
        return;
      }

      const dateValidation = validateDepositDate(actualDepositDate, new Date(item._id.date));
      if (!dateValidation.isValid) {
        setError(dateValidation.message || '날짜가 올바르지 않습니다.');
        return;
      }

      // API 호출
      const response = await fetch('/api/card-settlement/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardCompany: item._id.cardCompany,
          saleDate: item._id.date,
          totalAmount: item.totalAmount,
          actualDepositDate: actualDepositDate.toISOString(),
          actualDepositAmount: actualAmount,
          fee: feeCalculation.fee,
          feeRate: feeCalculation.feeRate
        }),
      });

      if (response.ok) {
        onComplete();
      } else {
        const errorData = await response.json();
        setError(errorData.message || '수정 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error editing deposit:', error);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch('/api/card-settlement/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardCompany: item._id.cardCompany,
          saleDate: item._id.date
        }),
      });

      if (response.ok) {
        onComplete();
      } else {
        const errorData = await response.json();
        setError(errorData.message || '삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error deleting deposit:', error);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isSubmitting && actualAmount > 0 && hasChanges()) {
        handleSubmit();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actualAmount, isSubmitting, hasChanges]);

  // 삭제 확인 모달
  if (showDeleteConfirm) {
    return (
      <Dialog open={true} onOpenChange={() => setShowDeleteConfirm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              입금처리 삭제 확인
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm space-y-2">
                <div><span className="font-medium">매출일자:</span> {format(new Date(item._id.date), 'yyyy-MM-dd (EEE)', { locale: ko })}</div>
                <div><span className="font-medium">카드사:</span> {item._id.cardCompany}</div>
                <div><span className="font-medium">매출금액:</span> {formatCurrency(item.totalAmount)}</div>
                <div><span className="font-medium">입금액:</span> {formatCurrency(item.actualDepositAmount || 0)}</div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">주의사항</p>
                  <p>입금처리를 삭제하면 해당 항목이 미처리 상태로 되돌아갑니다.</p>
                  <p>이 작업은 되돌릴 수 없습니다.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? '삭제 중...' : '삭제하기'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            입금처리 수정 - {item._id.cardCompany}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 기본 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">매출일자:</span>
              <span className="font-medium">
                {format(new Date(item._id.date), 'yyyy-MM-dd (EEE)', { locale: ko })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">거래건수:</span>
              <span className="font-medium">{item.transactionCount}건</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">매출금액:</span>
              <span className="font-bold text-lg">{formatCurrency(item.totalAmount)}</span>
            </div>
          </div>

          {/* 현재 입금 정보 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">현재 입금 정보</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">입금일:</span>
                <span className="font-medium">
                  {item.actualDepositDate ? 
                    format(new Date(item.actualDepositDate), 'yyyy-MM-dd (EEE)', { locale: ko }) : 
                    '-'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">입금액:</span>
                <span className="font-medium">{formatCurrency(item.actualDepositAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">수수료:</span>
                <span className="font-medium text-red-600">{formatCurrency(item.fee || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">수수료율:</span>
                <span className="font-medium text-red-600">{item.feeRate || 0}%</span>
              </div>
            </div>
          </div>

          {/* 입금일 수정 */}
          <div className="space-y-2">
            <Label htmlFor="depositDate">실제입금일</Label>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(actualDepositDate, 'yyyy-MM-dd (EEE)', { locale: ko })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={actualDepositDate}
                  onSelect={(date) => {
                    if (date) {
                      setActualDepositDate(date);
                      setShowCalendar(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 입금액 수정 */}
          <div className="space-y-2">
            <Label htmlFor="actualAmount">실제입금액</Label>
            <Input
              id="actualAmount"
              value={actualAmountInput}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="입금액을 입력하세요"
              className="text-right"
            />
          </div>


          {/* 실시간 계산 결과 */}
          {actualAmount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">수정 후 계산</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">수정 후 수수료:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(feeCalculation.fee)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">수정 후 수수료율:</span>
                  <span className="font-medium text-red-600">
                    {feeCalculation.feeRate}%
                  </span>
                </div>
                {hasChanges() && (
                  <div className="mt-2 pt-2 border-t border-green-200">
                    <div className="flex items-center gap-1 text-green-700">
                      <span className="text-xs">✓ 변경사항이 있습니다</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting}
              className="px-3"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || actualAmount <= 0 || !hasChanges()}
              className="flex-1"
            >
              {isSubmitting ? '수정 중...' : '수정하기'}
            </Button>
          </div>

          {/* 키보드 단축키 안내 */}
          <div className="text-xs text-gray-500 text-center">
            Enter: 수정 | Esc: 취소
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}