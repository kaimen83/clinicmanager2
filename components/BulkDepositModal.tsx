'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { 
  calculateBulkDistribution,
  validateDistribution,
  validateDepositAmount,
  validateDepositDate,
  formatNumberInput,
  parseFormattedNumber
} from '@/lib/utils/depositCalculations';
import { CardSettlementData } from './CardSettlement';

interface BulkDepositModalProps {
  items: CardSettlementData[];
  onClose: () => void;
  onComplete: () => void;
}

export default function BulkDepositModal({ 
  items, 
  onClose, 
  onComplete 
}: BulkDepositModalProps) {
  // 폼 상태 - 입금예정일 중 가장 빠른 날짜를 기본값으로 설정
  const [actualDepositDate, setActualDepositDate] = useState<Date>(
    new Date(Math.min(...items.map(item => new Date(item.expectedDepositDate).getTime())))
  );
  const [totalActualAmountInput, setTotalActualAmountInput] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 계산된 값들
  const totalSalesAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalActualAmount = parseFormattedNumber(totalActualAmountInput);
  const totalFee = totalSalesAmount - totalActualAmount;
  const overallFeeRate = totalSalesAmount > 0 ? (totalFee / totalSalesAmount) * 100 : 0;

  // 분배 계산 결과
  const distributions = totalActualAmount > 0 ? 
    calculateBulkDistribution(items, totalActualAmount) : [];
  
  // 검증 결과
  const validation = distributions.length > 0 ? 
    validateDistribution(distributions, totalSalesAmount, totalActualAmount) : 
    { isValid: false, roundingError: 0 };

  // 입력값 변경 핸들러
  const handleTotalAmountChange = (value: string) => {
    const formatted = formatNumberInput(value);
    setTotalActualAmountInput(formatted);
    setError(''); // 에러 초기화
  };


  // 폼 제출 핸들러
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      // 입력값 검증
      const amountValidation = validateDepositAmount(totalActualAmount, totalSalesAmount);
      if (!amountValidation.isValid) {
        setError(amountValidation.message || '입력값이 올바르지 않습니다.');
        return;
      }

      const dateValidation = validateDepositDate(actualDepositDate, new Date(items[0]._id.date));
      if (!dateValidation.isValid) {
        setError(dateValidation.message || '날짜가 올바르지 않습니다.');
        return;
      }

      // 분배 검증
      if (!validation.isValid) {
        setError('분배 계산에 오류가 있습니다. 다시 확인해주세요.');
        return;
      }

      // API 호출
      const response = await fetch('/api/card-settlement/process-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardCompany: items[0]._id.cardCompany,
          items: items.map(item => ({
            date: item._id.date,
            totalAmount: item.totalAmount,
            transactionCount: item.transactionCount
          })),
          actualDepositDate: actualDepositDate.toISOString(),
          totalActualAmount,
          distributions: distributions.map(dist => ({
            date: dist._id.date,
            actualAmount: dist.actualAmount,
            fee: dist.fee,
            feeRate: dist.feeRate
          }))
        }),
      });

      if (response.ok) {
        onComplete();
      } else {
        const errorData = await response.json();
        setError(errorData.message || '처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error processing bulk deposit:', error);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isSubmitting && totalActualAmount > 0 && validation.isValid) {
        handleSubmit();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [totalActualAmount, isSubmitting, validation.isValid]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {items[0]._id.cardCompany} 일괄 입금처리
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 선택된 항목 요약 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">선택된 항목 ({items.length}건)</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">기간:</span>
                <span className="ml-2 font-medium">
                  {format(new Date(items[0]._id.date), 'MM/dd', { locale: ko })} ~ 
                  {format(new Date(items[items.length - 1]._id.date), 'MM/dd', { locale: ko })}
                </span>
              </div>
              <div>
                <span className="text-gray-600">총 거래건수:</span>
                <span className="ml-2 font-medium">
                  {items.reduce((sum, item) => sum + item.transactionCount, 0)}건
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">총 매출액:</span>
                <span className="ml-2 font-bold text-lg">
                  {formatCurrency(totalSalesAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* 입금일 입력 */}
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

          {/* 총 입금액 입력 */}
          <div className="space-y-2">
            <Label htmlFor="totalAmount">총 실제입금액</Label>
            <Input
              id="totalAmount"
              value={totalActualAmountInput}
              onChange={(e) => handleTotalAmountChange(e.target.value)}
              placeholder="총 입금액을 입력하세요"
              className="text-right"
            />
          </div>

          {/* 실시간 계산 요약 */}
          {totalActualAmount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-3">전체 계산 요약</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">총 수수료:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {formatCurrency(totalFee)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">수수료율:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {overallFeeRate.toFixed(2)}%
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  {validation.isValid ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-700 text-sm">
                        반올림 오차: {formatCurrency(validation.roundingError)}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-700 text-sm">계산 검증 필요</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 분배 결과 상세 */}
          {distributions.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b">
                <h4 className="font-medium">분배 결과</h4>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">날짜</th>
                      <th className="px-3 py-2 text-right">매출액</th>
                      <th className="px-3 py-2 text-right">입금액</th>
                      <th className="px-3 py-2 text-right">수수료</th>
                      <th className="px-3 py-2 text-right">수수료율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributions.map((dist, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">
                          {format(new Date(dist._id.date), 'MM/dd', { locale: ko })}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(dist.totalAmount)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(dist.actualAmount)}
                        </td>
                        <td className="px-3 py-2 text-right text-red-600">
                          {formatCurrency(dist.fee)}
                        </td>
                        <td className="px-3 py-2 text-right text-red-600">
                          {dist.feeRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || totalActualAmount <= 0 || !validation.isValid}
              className="flex-1"
            >
              {isSubmitting ? '처리 중...' : `일괄 입금처리 (${items.length}건)`}
            </Button>
          </div>

          {/* 키보드 단축키 안내 */}
          <div className="text-xs text-gray-500 text-center">
            Enter: 저장 | Esc: 취소
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}