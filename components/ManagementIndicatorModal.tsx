'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, MessageSquare, MapPin } from 'lucide-react';
import { useDateContext } from '@/lib/context/dateContext';
import { useManagementData } from '@/hooks/useManagementData';
import { ManagementIndicatorModalProps } from '@/types/management-indicator';

// 컴포넌트 임포트
import MonthNavigation from './management/MonthNavigation';
import VisitIndicatorTab from './management/VisitIndicatorTab';
import RevenueIndicatorTab from './management/RevenueIndicatorTab';
import VisitPathTab from './management/VisitPathTab';
import ConsultationIndicatorTab from './management/ConsultationIndicatorTab';

export default function ManagementIndicatorModal({ isOpen, onClose }: ManagementIndicatorModalProps) {
  const { selectedDate } = useDateContext();
  const [activeTab, setActiveTab] = useState('visit');
  const [currentDate, setCurrentDate] = useState(selectedDate);

  // 커스텀 훅으로 데이터 관리
  const {
    loading,
    monthlyStats,
    historicalData,
    doctorStats,
    dayOfWeekStats,
    doctorRevenueStats,
    dayOfWeekRevenueStats,
    revenueHistoricalData,
    doctorNames,
    visitPathHistoryData,
    visitPathGroupNames,
    consultationStats,
    consultationTrendData,
    doctorConsultationStats,
    consultationDoctorNames,
    allStaffs
  } = useManagementData(currentDate, activeTab, isOpen);

  // 모달이 열릴 때 currentDate를 selectedDate로 초기화
  useEffect(() => {
    if (isOpen) {
      setCurrentDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-800">경영지표 대시보드</DialogTitle>
            
            <MonthNavigation 
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              loading={loading}
            />
          </div>
        </DialogHeader>
        
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-14 mb-6 bg-gray-100/50">
              <TabsTrigger 
                value="visit" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md flex items-center gap-2 text-sm font-medium"
              >
                <Users className="h-4 w-4" />
                내원지표
              </TabsTrigger>
              <TabsTrigger 
                value="revenue" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md flex items-center gap-2 text-sm font-medium"
              >
                <TrendingUp className="h-4 w-4" />
                매출지표
              </TabsTrigger>
              <TabsTrigger 
                value="visitpath" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md flex items-center gap-2 text-sm font-medium"
              >
                <MapPin className="h-4 w-4" />
                내원경로별
              </TabsTrigger>
              <TabsTrigger 
                value="consultation" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md flex items-center gap-2 text-sm font-medium"
              >
                <MessageSquare className="h-4 w-4" />
                상담지표
              </TabsTrigger>
            </TabsList>

            {/* 내원지표 탭 */}
            <TabsContent value="visit">
              <VisitIndicatorTab
                loading={loading}
                monthlyStats={monthlyStats}
                historicalData={historicalData}
                doctorStats={doctorStats}
                dayOfWeekStats={dayOfWeekStats}
              />
            </TabsContent>

            {/* 매출지표 탭 */}
            <TabsContent value="revenue">
              <RevenueIndicatorTab
                loading={loading}
                monthlyStats={monthlyStats}
                doctorRevenueStats={doctorRevenueStats}
                dayOfWeekRevenueStats={dayOfWeekRevenueStats}
                revenueHistoricalData={revenueHistoricalData}
                doctorNames={doctorNames}
              />
            </TabsContent>

            {/* 내원경로별 통계 탭 */}
            <TabsContent value="visitpath">
              <VisitPathTab
                visitPathHistoryData={visitPathHistoryData}
                visitPathGroupNames={visitPathGroupNames}
              />
            </TabsContent>

            {/* 상담지표 탭 */}
            <TabsContent value="consultation">
              <ConsultationIndicatorTab
                loading={loading}
                consultationStats={consultationStats}
                consultationTrendData={consultationTrendData}
                doctorConsultationStats={doctorConsultationStats}
                consultationDoctorNames={consultationDoctorNames}
                allStaffs={allStaffs}
                currentDate={currentDate}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}