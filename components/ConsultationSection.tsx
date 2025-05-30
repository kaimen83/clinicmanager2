'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Consultation } from '@/lib/types';
import { toast } from 'sonner';
import ConsultationAddModal from './ConsultationAddModal';

interface ConsultationSectionProps {
  chartNumber: string;
  patientName: string;
  consultationPaymentTotal: number;
  onConsultationChange?: () => void;
}

export default function ConsultationSection({
  chartNumber,
  patientName,
  consultationPaymentTotal,
  onConsultationChange
}: ConsultationSectionProps) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

  // 상담 내역 조회
  const fetchConsultations = async () => {
    if (!chartNumber || !patientName) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/consultations?chartNumber=${chartNumber}&patientName=${patientName}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setConsultations(data.consultations || []);
      }
    } catch (error) {
      console.error('상담 내역 조회 중 에러:', error);
      toast.error('상담 내역을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 차트번호나 환자명이 변경될 때 상담 내역 조회
  useEffect(() => {
    fetchConsultations();
  }, [chartNumber, patientName]);

  // 상담 추가 성공 콜백
  const handleConsultationAddSuccess = () => {
    fetchConsultations(); // 상담 내역 새로고침
    onConsultationChange?.(); // 부모 컴포넌트에 변경 알림
  };

  // 동의여부 토글
  const toggleAgreed = async (consultationId: string) => {
    try {
      const response = await fetch(`/api/consultations/${consultationId}/toggle-agreed`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmedDate: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const updatedConsultation = await response.json();
        setConsultations(prev => 
          prev.map(c => 
            c._id === consultationId ? updatedConsultation : c
          )
        );
        onConsultationChange?.();
        toast.success('동의여부가 변경되었습니다.');
      } else {
        throw new Error('동의여부 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('동의여부 토글 중 에러:', error);
      toast.error('동의여부 변경에 실패했습니다.');
    }
  };

  // 상담 내역 삭제
  const deleteConsultation = async (consultationId: string) => {
    if (!confirm('이 상담 내역을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConsultations(prev => prev.filter(c => c._id !== consultationId));
        onConsultationChange?.();
        toast.success('상담 내역이 삭제되었습니다.');
      } else {
        throw new Error('상담 내역 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('상담 내역 삭제 중 에러:', error);
      toast.error('상담 내역 삭제에 실패했습니다.');
    }
  };

  // 동의된 상담 금액 합계 계산
  const agreedTotal = consultations
    .filter(consultation => consultation.agreed)
    .reduce((sum, consultation) => sum + consultation.amount, 0);

  // 상담 수납 상태 계산
  const difference = agreedTotal - consultationPaymentTotal;
  
  const getStatusInfo = () => {
    if (difference > 0) {
      return {
        status: 'underpaid',
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        text: '상담내용 미수납',
        amount: `-${difference.toLocaleString()}원`,
        className: 'text-red-500'
      };
    } else if (difference < 0) {
      return {
        status: 'overpaid',
        icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
        text: '상담내용 과수납',
        amount: `+${Math.abs(difference).toLocaleString()}원`,
        className: 'text-orange-500'
      };
    } else {
      return {
        status: 'fully-paid',
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        text: '완납',
        amount: '0원',
        className: 'text-green-500'
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">상담 내역</CardTitle>
          <Button
            size="sm"
            onClick={() => setIsConsultationModalOpen(true)}
            disabled={!chartNumber || !patientName}
            className="h-7 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            추가
          </Button>
        </div>
      </CardHeader>
      
      {/* 상담 내역 목록 - 고정 높이 스크롤 영역 */}
      <div className="flex-1 min-h-0 px-6">
        <div className="space-y-1 overflow-y-auto h-48">
          {loading ? (
            <div className="text-center py-4 text-sm text-gray-500">
              불러오는 중...
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              상담 내역이 없습니다.
            </div>
          ) : (
            consultations.map((consultation) => (
              <div
                key={consultation._id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-gray-900">
                      {new Date(consultation.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-gray-600">|</span>
                    <span className="font-semibold text-blue-600">
                      {consultation.amount.toLocaleString()}원
                    </span>
                    {consultation.confirmedDate && (
                      <>
                        <span className="text-gray-400">|</span>
                        <span className="text-xs text-green-600 font-medium">
                          확정({new Date(consultation.confirmedDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })})
                        </span>
                      </>
                    )}
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500">{consultation.staff}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">동의</span>
                    <Switch
                      checked={consultation.agreed}
                      onCheckedChange={() => toggleAgreed(consultation._id)}
                      className="scale-75"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteConsultation(consultation._id)}
                    className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 하단 고정 영역 - 합계 및 상태 */}
      <div className="flex-shrink-0 px-6 pb-4 space-y-2">
        {/* 상담 동의금액 합계 */}
        <div className="border-t pt-2">
          <div className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded-md">
            <span className="font-medium text-gray-700">상담 동의금액 합계</span>
            <span className="font-bold text-gray-900">{agreedTotal.toLocaleString()}원</span>
          </div>
        </div>

        {/* 상담 수납 상태 - 컴팩트한 디자인 */}
        {consultations.length > 0 && (
          <div className={`relative overflow-hidden rounded-md border ${
            statusInfo.status === 'underpaid' ? 'border-red-200 bg-red-50' :
            statusInfo.status === 'overpaid' ? 'border-orange-200 bg-orange-50' :
            'border-green-200 bg-green-50'
          }`}>
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <div className={`p-0.5 rounded-full ${
                  statusInfo.status === 'underpaid' ? 'bg-red-100' :
                  statusInfo.status === 'overpaid' ? 'bg-orange-100' :
                  'bg-green-100'
                }`}>
                  {statusInfo.icon}
                </div>
                <div>
                  <div className={`text-xs font-semibold ${statusInfo.className}`}>
                    {statusInfo.text}
                  </div>
                </div>
              </div>
              <div className={`text-xs font-bold ${statusInfo.className}`}>
                {statusInfo.amount}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 상담 추가 모달 */}
      <ConsultationAddModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        chartNumber={chartNumber}
        patientName={patientName}
        onSuccess={handleConsultationAddSuccess}
      />
    </Card>
  );
} 