'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyStats, MonthlyStats, ExtraIncome } from '@/lib/types';
import { toISODateString } from '@/lib/utils';

type Props = {
  date: Date;
};

export default function ClinicStats({ date }: Props) {
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [extraincomes, setextraincomes] = useState<ExtraIncome[]>([]);
  
  // 통계 데이터 가져오기 함수
  const fetchStats = async (type: 'daily' | 'monthly') => {
    try {
      setLoading(true);
      setError(null);
      
      let dateParam;
      if (type === 'daily') {
        dateParam = toISODateString(date);
      } else {
        // YYYY-MM 형식으로 변환 (한국 시간대 고려)
        dateParam = toISODateString(date).substring(0, 7);
      }
      
      const response = await fetch(`/api/stats?type=${type}&date=${dateParam}`);
      
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
  };
  
  // 날짜가 변경될 때 데이터 가져오기
  useEffect(() => {
    fetchStats('daily');
    fetchStats('monthly');
  }, [date]);
  
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
  
  // 통계 항목 렌더링 함수
  const renderStatItem = (label: string, value: string | number, isAmount: boolean = true) => {
    return (
      <div className="p-2 border rounded-lg bg-white">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-semibold">
          {isAmount ? `₩${formatAmount(value as number)}` : value}
        </p>
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
      {renderStatItem('현금/계좌이체', currentDailyStats.cashTransferAmount)}
      {renderStatItem('카드 수납금액', currentDailyStats.cardAmount)}
      {renderStatItem('전체 수납금액', currentDailyStats.totalPaymentAmount)}
      {renderStatItem('진료외수입', currentDailyStats.nonMedicalIncome)}
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
      {renderStatItem('현금/계좌이체', currentMonthlyStats.cashTransferAmount)}
      {renderStatItem('카드 수납금액', currentMonthlyStats.cardAmount)}
      {renderStatItem('전체 수납금액', currentMonthlyStats.totalPaymentAmount)}
      {renderStatItem('진료외수입', currentMonthlyStats.nonMedicalIncome)}
      {renderStatItem('총수입', currentMonthlyStats.totalIncome)}
      {renderStatItem('총지출', currentMonthlyStats.totalExpenses)}
      {renderStatItem('상담 동의금액', currentMonthlyStats.consultationAgreedAmount)}
      {renderStatItem('상담 미동의금액', currentMonthlyStats.consultationNonAgreedAmount)}
    </div>
  );
  
  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">진료 통계</CardTitle>
        <CardDescription className="text-xs">
          {activeTab === 'daily' 
            ? `${date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}의 통계`
            : `${date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}의 통계`
          }
        </CardDescription>
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
  );
} 