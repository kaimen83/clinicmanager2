'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyStats, MonthlyStats, ExtraIncome } from '@/lib/types';
import { toISODateString } from '@/lib/utils';
import PaymentListModal from './PaymentListModal';
import CardCompanyStatsModal from './CardCompanyStatsModal';
import ExtraIncomeListModal from './ExtraIncomeListModal';
import ConsultationStatsModal from './ConsultationStatsModal';
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
  const [isConsultationStatsModalOpen, setIsConsultationStatsModalOpen] = useState(false);
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
    // 상담 통계인 경우 상담 통계 모달 열기
    if (label === '상담 동의금액' || label === '상담 미동의금액') {
      setIsConsultationStatsModalOpen(true);
      return;
    }
    
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
    paymentMethod?: string,
    count?: number
  ) => {
    // 라벨에 따른 색상 및 스타일 정의
    const getStyleByLabel = (label: string) => {
      switch (label) {
        case '전체 수납금액':
          return {
            borderColor: 'border-l-indigo-400',
            bgColor: 'bg-gradient-to-r from-indigo-50 to-white',
            textColor: 'text-indigo-700',
            hoverColor: 'hover:from-indigo-100'
          };
        case '총수입':
          return {
            borderColor: 'border-l-green-400',
            bgColor: 'bg-gradient-to-r from-green-50 to-white',
            textColor: 'text-green-700',
            hoverColor: 'hover:from-green-100'
          };
        case '총지출':
          return {
            borderColor: 'border-l-red-400',
            bgColor: 'bg-gradient-to-r from-red-50 to-white',
            textColor: 'text-red-700',
            hoverColor: 'hover:from-red-100'
          };
        default:
          // 나머지 모든 항목은 동일한 기본 스타일
          return {
            borderColor: 'border-l-slate-300',
            bgColor: 'bg-gradient-to-r from-slate-50 to-white',
            textColor: 'text-slate-700',
            hoverColor: 'hover:from-slate-100'
          };
      }
    };

    const style = getStyleByLabel(label);
    
    const content = (
      <>
        <p className="text-xs text-slate-600 font-medium">{label}</p>
        <p className={`text-lg font-bold ${style.textColor}`}>
          {count !== undefined ? (
            <span>
              <span className="text-sm text-slate-500 font-normal">{count}건 / </span>
              {isAmount ? `₩${formatAmount(value as number)}` : value}
            </span>
          ) : (
            isAmount ? `₩${formatAmount(value as number)}` : value
          )}
        </p>
      </>
    );
    
    if (isClickable) {
      return (
        <div 
          className={`p-3 rounded-xl border-l-4 ${style.borderColor} ${style.bgColor} ${style.hoverColor} cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-105 transform`}
          onClick={() => handleOpenPaymentModal(label, paymentMethod)}
        >
          {content}
        </div>
      );
    }
    
    return (
      <div className={`p-3 rounded-xl border-l-4 ${style.borderColor} ${style.bgColor} transition-all duration-300`}>
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
    consultationNonAgreedAmount: 0,
    consultationAgreedCount: 0,
    consultationNonAgreedCount: 0
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
      {renderStatItem('상담 동의금액', currentDailyStats.consultationAgreedAmount, true, true, undefined, currentDailyStats.consultationAgreedCount)}
      {renderStatItem('상담 미동의금액', currentDailyStats.consultationNonAgreedAmount, true, true, undefined, currentDailyStats.consultationNonAgreedCount)}
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
      {renderStatItem('상담 동의금액', currentMonthlyStats.consultationAgreedAmount, true, true, undefined, currentMonthlyStats.consultationAgreedCount)}
      {renderStatItem('상담 미동의금액', currentMonthlyStats.consultationNonAgreedAmount, true, true, undefined, currentMonthlyStats.consultationNonAgreedCount)}
    </div>
  );
  
  return (
    <>
      <div className="w-full">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-indigo-800 mb-2">📊 진료 통계</h3>
          <Tabs defaultValue="daily" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4 h-10 bg-white/70 backdrop-blur-sm border border-indigo-200">
              <TabsTrigger value="daily" className="text-sm font-medium data-[state=active]:bg-indigo-500 data-[state=active]:text-white">일간 통계</TabsTrigger>
              <TabsTrigger value="monthly" className="text-sm font-medium data-[state=active]:bg-indigo-500 data-[state=active]:text-white">월간 통계</TabsTrigger>
            </TabsList>
            
            <TabsContent value="daily" className="pt-2">
              {renderCompactDailyStats()}
            </TabsContent>
            
            <TabsContent value="monthly" className="pt-2">
              {renderCompactMonthlyStats()}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
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
      
      {/* 상담 통계 모달 */}
      <ConsultationStatsModal
        isOpen={isConsultationStatsModalOpen}
        onClose={() => setIsConsultationStatsModalOpen(false)}
        date={toISODateString(date)}
        type={activeTab as 'daily' | 'monthly'}
      />
    </>
  );
} 