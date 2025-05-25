'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyStats, MonthlyStats, ExtraIncome } from '@/lib/types';
import { toISODateString } from '@/lib/utils';
import PaymentListModal from './PaymentListModal';
import CardCompanyStatsModal from './CardCompanyStatsModal';
import ExtraIncomeListModal from './ExtraIncomeListModal';
import { useDateContext } from '@/lib/context/dateContext';

type Props = {
  date: Date;
};

export default function ClinicStats({ date }: Props) {
  const { statsRefreshTrigger } = useDateContext();
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [extraincomes, setextraincomes] = useState<ExtraIncome[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCardStatsModalOpen, setIsCardStatsModalOpen] = useState(false);
  const [isExtraIncomeModalOpen, setIsExtraIncomeModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | undefined>(undefined);
  
  // 통계 데이터 가져오기 함수
  const fetchStats = useCallback(async (type: 'daily' | 'monthly') => {
    try {
      setLoading(true);
      setError(null);
      
      const dateString = toISODateString(date);
      const response = await fetch(`/api/stats?date=${dateString}&type=${type}`, {
        cache: 'default'
      });
      
      if (!response.ok) {
        throw new Error('통계 데이터를 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      if (type === 'daily') {
        setDailyStats(data.stats);
        if (data.extraincomes) {
          setextraincomes(data.extraincomes);
        }
      } else {
        setMonthlyStats(data.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      console.error('통계 데이터 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [date]);
  
  // 날짜가 변경될 때 데이터 가져오기
  useEffect(() => {
    fetchStats('daily');
    fetchStats('monthly');
  }, [fetchStats]);
  
  // 통계 새로고침 트리거 감지
  useEffect(() => {
    if (statsRefreshTrigger > 0) {
      fetchStats('daily');
      fetchStats('monthly');
    }
  }, [statsRefreshTrigger, fetchStats]);
  
  // 탭이 변경될 때 필요한 데이터만 가져오기
  useEffect(() => {
    if (activeTab === 'daily' && !dailyStats) {
      fetchStats('daily');
    } else if (activeTab === 'monthly' && !monthlyStats) {
      fetchStats('monthly');
    }
  }, [activeTab]);
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };
  
  // 결제 목록 모달 열기
  const handleOpenPaymentModal = (label: string, paymentMethod?: string) => {
    // 카드 결제인 경우 카드사별 통계 모달 열기
    if (paymentMethod === '카드') {
      setModalTitle(`${label} 통계`);
      setIsCardStatsModalOpen(true);
      return;
    }
    
    // 진료외수입인 경우 진료외수입 목록 모달 열기
    if (label === '진료외수입') {
      setModalTitle(`${label} 목록`);
      setIsExtraIncomeModalOpen(true);
      return;
    }
    
    // 다른 결제 방식은 기존 목록 모달 열기
    setModalTitle(`${label} 내역`);
    setSelectedPaymentMethod(paymentMethod);
    setIsPaymentModalOpen(true);
  };
  
  // 결제 목록 모달 닫기
  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };
  
  // 카드사별 통계 모달 닫기
  const handleCloseCardStatsModal = () => {
    setIsCardStatsModalOpen(false);
  };
  
  // 진료외수입 목록 모달 닫기
  const handleCloseExtraIncomeModal = () => {
    setIsExtraIncomeModalOpen(false);
  };
  
  // 통계 항목 렌더링 함수 (클릭 가능 여부 추가)
  const renderStatItem = (
    label: string, 
    value: string | number, 
    isAmount: boolean = true, 
    isClickable: boolean = false, 
    paymentMethod?: string
  ) => {
    const content = (
      <>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-semibold">
          {isAmount ? `₩${formatAmount(value as number)}` : value}
        </p>
      </>
    );
    
    if (isClickable) {
      return (
        <div 
          className="p-2 border rounded-lg bg-white cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => handleOpenPaymentModal(label, paymentMethod)}
        >
          {content}
        </div>
      );
    }
    
    return (
      <div className="p-2 border rounded-lg bg-white">
        {content}
      </div>
    );
  };
  
  // 로딩 상태 표시
  if (loading && ((activeTab === 'daily' && !dailyStats) || (activeTab === 'monthly' && !monthlyStats))) {
    return (
      <Card className="w-full shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>진료 통계</CardTitle>
          <CardDescription>데이터를 불러오는 중...</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-4">
          통계 데이터를 불러오는 중입니다...
        </CardContent>
      </Card>
    );
  }
  
  // 오류 상태 표시
  if (error) {
    return (
      <Card className="w-full shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>진료 통계</CardTitle>
          <CardDescription className="text-red-500">오류 발생</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-4 text-red-500">
          {error}
        </CardContent>
      </Card>
    );
  }
  
  // 기본값 설정 (API 응답이 오기 전)
  const defaultStats = {
    totalPatients: 0,
    newPatients: 0,
    cashTransferAmount: 0,
    cardAmount: 0,
    totalPaymentAmount: 0,
    nonMedicalIncome: 0,
    totalIncome: 0,
    totalExpenses: 0,
    consultationAgreedAmount: 0,
    consultationNonAgreedAmount: 0
  };
  
  const currentDailyStats = dailyStats || defaultStats;
  const currentMonthlyStats = monthlyStats || defaultStats;
  
  // 중요한 지표만 표시하는 간소화된 버전
  const renderCompactDailyStats = () => (
    <div className="grid grid-cols-2 gap-2">
      {renderStatItem('총 내원인원', currentDailyStats.totalPatients, false)}
      {renderStatItem('신환', currentDailyStats.newPatients, false)}
      {renderStatItem('현금/계좌이체', currentDailyStats.cashTransferAmount, true, true, '현금')}
      {renderStatItem('카드 수납금액', currentDailyStats.cardAmount, true, true, '카드')}
      {renderStatItem('전체 수납금액', currentDailyStats.totalPaymentAmount, true, true)}
      {renderStatItem('진료외수입', currentDailyStats.nonMedicalIncome, true, true)}
      {renderStatItem('총수입', currentDailyStats.totalIncome)}
      {renderStatItem('총지출', currentDailyStats.totalExpenses)}
      {renderStatItem('상담 동의금액', currentDailyStats.consultationAgreedAmount)}
      {renderStatItem('상담 미동의금액', currentDailyStats.consultationNonAgreedAmount)}
    </div>
  );
  
  const renderCompactMonthlyStats = () => (
    <div className="grid grid-cols-2 gap-2">
      {renderStatItem('총 내원인원', currentMonthlyStats.totalPatients, false)}
      {renderStatItem('신환', currentMonthlyStats.newPatients, false)}
      {renderStatItem('현금/계좌이체', currentMonthlyStats.cashTransferAmount, true, true, '현금')}
      {renderStatItem('카드 수납금액', currentMonthlyStats.cardAmount, true, true, '카드')}
      {renderStatItem('전체 수납금액', currentMonthlyStats.totalPaymentAmount, true, true)}
      {renderStatItem('진료외수입', currentMonthlyStats.nonMedicalIncome, true, true)}
      {renderStatItem('총수입', currentMonthlyStats.totalIncome)}
      {renderStatItem('총지출', currentMonthlyStats.totalExpenses)}
      {renderStatItem('상담 동의금액', currentMonthlyStats.consultationAgreedAmount)}
      {renderStatItem('상담 미동의금액', currentMonthlyStats.consultationNonAgreedAmount)}
    </div>
  );
  
  return (
    <>
      <Card className="w-full shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">진료 통계</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <Tabs defaultValue="daily" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-2 h-8">
              <TabsTrigger value="daily" className="text-xs py-1">일간 통계</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs py-1">월간 통계</TabsTrigger>
            </TabsList>
            
            <TabsContent value="daily" className="pt-2">
              {renderCompactDailyStats()}
            </TabsContent>
            
            <TabsContent value="monthly" className="pt-2">
              {renderCompactMonthlyStats()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* 결제 내역 모달 */}
      <PaymentListModal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
        title={modalTitle}
        date={date}
        paymentMethod={selectedPaymentMethod}
        type={activeTab as 'daily' | 'monthly'}
      />
      
      {/* 카드사별 통계 모달 */}
      <CardCompanyStatsModal
        isOpen={isCardStatsModalOpen}
        onClose={handleCloseCardStatsModal}
        title={modalTitle}
        date={date}
        type={activeTab as 'daily' | 'monthly'}
      />
      
      {/* 진료외수입 목록 모달 */}
      <ExtraIncomeListModal
        isOpen={isExtraIncomeModalOpen}
        onClose={handleCloseExtraIncomeModal}
        title={modalTitle}
        date={date}
        type={activeTab as 'daily' | 'monthly'}
      />
    </>
  );
} 