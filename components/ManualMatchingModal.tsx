'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ManualMatchingModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchingResults: any;
  onComplete: () => void;
}

export default function ManualMatchingModal({ 
  isOpen, 
  onClose, 
  matchingResults,
  onComplete 
}: ManualMatchingModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processing, setProcessing] = useState(false);

  if (!isOpen || !matchingResults || !matchingResults.needConfirmation.length) {
    return null;
  }

  const currentMatch = matchingResults.needConfirmation[currentIndex];
  const totalCount = matchingResults.needConfirmation.length;

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/hometax/confirm-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          expenseId: currentMatch.expense._id,
          receiptId: currentMatch.receipt._id,
          receiptType: currentMatch.type
        })
      });

      if (!response.ok) {
        throw new Error('매칭 확인 실패');
      }

      toast.success('매칭이 확정되었습니다.');
      
      // 다음 항목으로 이동
      if (currentIndex < totalCount - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // 모든 항목 처리 완료
        toast.success('모든 수동 확인이 완료되었습니다.');
        onComplete();
        onClose();
      }
    } catch (error) {
      console.error('매칭 확인 오류:', error);
      toast.error('매칭 확인 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast.info('모든 항목을 확인했습니다.');
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">
            수동 매칭 확인 ({currentIndex + 1}/{totalCount})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* 지출 내역 카드 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                지출 내역
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">날짜:</span>
                  <span className="ml-2 font-medium">
                    {formatDate(currentMatch.expense.date)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">금액:</span>
                  <span className="ml-2 font-medium">
                    {formatAmount(currentMatch.expense.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">거래처:</span>
                  <span className="ml-2 font-medium">
                    {currentMatch.expense.vendor}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">내역:</span>
                  <span className="ml-2 font-medium">
                    {currentMatch.expense.details}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 매칭 화살표 */}
          <div className="flex justify-center">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
          </div>

          {/* 홈택스 영수증 카드 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                홈택스 {currentMatch.type === 'tax' ? '세금계산서' : '현금영수증'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">날짜:</span>
                  <span className="ml-2 font-medium">
                    {formatDate(
                      currentMatch.type === 'tax' 
                        ? currentMatch.receipt.작성일자 
                        : currentMatch.receipt.매입일시
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">금액:</span>
                  <span className="ml-2 font-medium">
                    {formatAmount(
                      currentMatch.type === 'tax' 
                        ? currentMatch.receipt.합계금액 
                        : currentMatch.receipt.매입금액
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">거래처:</span>
                  <span className="ml-2 font-medium">
                    {currentMatch.type === 'tax' 
                      ? currentMatch.receipt.상호 
                      : currentMatch.receipt.상호명}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">품목:</span>
                  <span className="ml-2 font-medium">
                    {currentMatch.type === 'tax' 
                      ? currentMatch.receipt.품목명 
                      : currentMatch.receipt.품명}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 매칭 차이점 표시 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">매칭 확인 필요</p>
                <p className="text-yellow-700 mt-1">
                  금액 또는 날짜가 완전히 일치하지 않습니다. 
                  동일한 거래인지 확인해주세요.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={processing}
          >
            건너뛰기
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={processing}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-2" />
            매칭 확정
          </Button>
        </div>
      </div>
    </div>
  );
}