'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Coins } from 'lucide-react';
import { Payment } from '@/lib/types';
import { toast } from 'sonner';

interface PaymentSectionProps {
  chartNumber: string;
  patientName: string;
  onPaymentChange?: (consultationPaymentTotal: number) => void;
}

export default function PaymentSection({
  chartNumber,
  patientName,
  onPaymentChange
}: PaymentSectionProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  // 수납 내역 조회
  const fetchPayments = async () => {
    if (!chartNumber || !patientName) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/transactions/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chartNumber, patientName }),
      });
      
      if (response.ok) {
        const paymentsData = await response.json();
        // 날짜 역순으로 정렬
        const sortedPayments = paymentsData.sort((a: Payment, b: Payment) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setPayments(sortedPayments);
        
        // 상담수납 금액 합계 계산하여 부모 컴포넌트에 전달
        const consultationTotal = sortedPayments
          .filter((payment: Payment) => payment.isConsultation)
          .reduce((sum: number, payment: Payment) => sum + payment.amount, 0);
        
        onPaymentChange?.(consultationTotal);
      }
    } catch (error) {
      console.error('수납 내역 조회 중 에러:', error);
      toast.error('수납 내역을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 차트번호나 환자명이 변경될 때 수납 내역 조회
  useEffect(() => {
    fetchPayments();
  }, [chartNumber, patientName]);

  // 수납 타입 토글 (일반수납 ↔ 상담수납)
  const togglePaymentType = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/transactions/${paymentId}/toggle-consultation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const updatedPayment = await response.json();
        setPayments(prev => 
          prev.map(p => 
            p._id === paymentId ? { ...p, isConsultation: updatedPayment.isConsultation } : p
          )
        );
        
        // 상담수납 금액 합계 재계산
        const updatedPayments = payments.map(p => 
          p._id === paymentId ? { ...p, isConsultation: updatedPayment.isConsultation } : p
        );
        const consultationTotal = updatedPayments
          .filter(payment => payment.isConsultation)
          .reduce((sum, payment) => sum + payment.amount, 0);
        
        onPaymentChange?.(consultationTotal);
        toast.success('수납 타입이 변경되었습니다.');
      } else {
        throw new Error('수납 타입 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('수납 타입 토글 중 에러:', error);
      toast.error('수납 타입 변경에 실패했습니다.');
    }
  };

  // 상담수납 금액 합계 계산
  const consultationPaymentTotal = payments
    .filter(payment => payment.isConsultation)
    .reduce((sum, payment) => sum + payment.amount, 0);

  // 수납 방법 표시 함수
  const getPaymentMethodDisplay = (payment: Payment) => {
    if (payment.method === '카드' && payment.cardCompany) {
      return `카드(${payment.cardCompany})`;
    }
    return payment.method;
  };

  // 수납 방법 아이콘
  const getPaymentIcon = (method: string) => {
    if (method === '카드') {
      return <CreditCard className="h-3 w-3" />;
    }
    return <Coins className="h-3 w-3" />;
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-sm">수납 내역</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 flex-1 min-h-0">
        {/* 수납 내역 목록 */}
        <div className="space-y-1 overflow-y-auto max-h-64">
          {loading ? (
            <div className="text-center py-4 text-sm text-gray-500">
              불러오는 중...
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              수납 내역이 없습니다.
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment._id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-gray-900">
                      {new Date(payment.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="font-semibold text-blue-600">
                      {payment.amount.toLocaleString()}원
                    </span>
                    <span className="text-gray-400">|</span>
                    <div className="flex items-center gap-1">
                      {getPaymentIcon(payment.method)}
                      <span className="text-gray-600">{getPaymentMethodDisplay(payment)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Button
                    size="sm"
                    variant={payment.isConsultation ? "default" : "outline"}
                    onClick={() => togglePaymentType(payment._id!)}
                    className="text-xs h-6 px-2"
                  >
                    {payment.isConsultation ? '상담' : '일반'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 상담수납금액 합계 */}
        <div className="border-t pt-2">
          <div className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded-md">
            <span className="font-medium text-gray-700">상담수납금액 합계</span>
            <span className="font-bold text-blue-600">
              {consultationPaymentTotal.toLocaleString()}원
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 