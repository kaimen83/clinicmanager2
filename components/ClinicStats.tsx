'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyStats, MonthlyStats } from '@/lib/types';

// 샘플 데이터
const SAMPLE_DAILY_STATS: DailyStats = {
  totalPatients: 38,
  newPatients: 5,
  cashTransferAmount: 1450000,
  cardAmount: 2150000,
  totalPaymentAmount: 3600000,
  nonMedicalIncome: 580000,
  totalIncome: 4180000,
  totalExpenses: 890000,
  consultationAgreedAmount: 1200000,
  consultationNonAgreedAmount: 300000,
};

const SAMPLE_MONTHLY_STATS: MonthlyStats = {
  totalPatients: 845,
  newPatients: 122,
  cashTransferAmount: 32450000,
  cardAmount: 48750000,
  totalPaymentAmount: 81200000,
  nonMedicalIncome: 11580000,
  totalIncome: 92780000,
  totalExpenses: 25890000,
  consultationAgreedAmount: 32200000,
  consultationNonAgreedAmount: 8300000,
};

type Props = {
  date: Date;
  dailyStats?: DailyStats;
  monthlyStats?: MonthlyStats;
};

export default function ClinicStats({ 
  date, 
  dailyStats = SAMPLE_DAILY_STATS,
  monthlyStats = SAMPLE_MONTHLY_STATS 
}: Props) {
  const [activeTab, setActiveTab] = useState('daily');
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };
  
  // 통계 항목 렌더링 함수
  const renderStatItem = (label: string, value: string | number, isAmount: boolean = true) => {
    return (
      <div className="p-4 border rounded-lg bg-white">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold mt-1">
          {isAmount ? `₩${formatAmount(value as number)}` : value}
        </p>
      </div>
    );
  };
  
  return (
    <Card className="w-full h-full shadow-sm">
      <CardHeader>
        <CardTitle>진료 통계</CardTitle>
        <CardDescription>
          {activeTab === 'daily' 
            ? `${date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}의 통계`
            : `${date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}의 통계`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="daily">일간 통계</TabsTrigger>
            <TabsTrigger value="monthly">월간 통계</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {renderStatItem('총 내원인원', dailyStats.totalPatients, false)}
              {renderStatItem('신환', dailyStats.newPatients, false)}
              {renderStatItem('현금/계좌이체', dailyStats.cashTransferAmount)}
              {renderStatItem('카드 수납금액', dailyStats.cardAmount)}
              {renderStatItem('전체 수납금액', dailyStats.totalPaymentAmount)}
              {renderStatItem('진료외수입', dailyStats.nonMedicalIncome)}
              {renderStatItem('총수입', dailyStats.totalIncome)}
              {renderStatItem('총지출', dailyStats.totalExpenses)}
              {renderStatItem('상담 동의금액', dailyStats.consultationAgreedAmount)}
              {renderStatItem('상담 미동의금액', dailyStats.consultationNonAgreedAmount)}
            </div>
          </TabsContent>
          
          <TabsContent value="monthly" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {renderStatItem('총 내원인원', monthlyStats.totalPatients, false)}
              {renderStatItem('신환', monthlyStats.newPatients, false)}
              {renderStatItem('현금/계좌이체', monthlyStats.cashTransferAmount)}
              {renderStatItem('카드 수납금액', monthlyStats.cardAmount)}
              {renderStatItem('전체 수납금액', monthlyStats.totalPaymentAmount)}
              {renderStatItem('진료외수입', monthlyStats.nonMedicalIncome)}
              {renderStatItem('총수입', monthlyStats.totalIncome)}
              {renderStatItem('총지출', monthlyStats.totalExpenses)}
              {renderStatItem('상담 동의금액', monthlyStats.consultationAgreedAmount)}
              {renderStatItem('상담 미동의금액', monthlyStats.consultationNonAgreedAmount)}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 