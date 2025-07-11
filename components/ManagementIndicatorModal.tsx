'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, MessageSquare, CreditCard, Calendar, Activity, Target, PieChart, Stethoscope, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useDateContext } from '@/lib/context/dateContext';

interface ManagementIndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MonthlyStats = {
  totalPatients: number;
  newPatients: number;
  cashTransferAmount: number;
  cardAmount: number;
  totalPaymentAmount: number;
  nonMedicalIncome: number;
  totalIncome: number;
  totalExpenses: number;
  consultationAgreedAmount: number;
  consultationNonAgreedAmount: number;
  consultationAgreedCount: number;
  consultationNonAgreedCount: number;
};

type HistoricalData = {
  month: string;
  newPatients: number;
  totalPatients: number;
};

type DoctorStats = {
  doctor: string;
  totalPatients: number;
  newPatients: number;
};

type DayOfWeekStats = {
  dayOfWeek: string;
  dayNumber: number;
  totalPatients: number;
  newPatients: number;
};

export default function ManagementIndicatorModal({ isOpen, onClose }: ManagementIndicatorModalProps) {
  const { selectedDate } = useDateContext();
  const [activeTab, setActiveTab] = useState('visit');
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [doctorStats, setDoctorStats] = useState<DoctorStats[]>([]);
  const [dayOfWeekStats, setDayOfWeekStats] = useState<DayOfWeekStats[]>([]);
  const [loading, setLoading] = useState(false);

  // 현재 월 통계 데이터 가져오기
  useEffect(() => {
    if (isOpen) {
      fetchMonthlyStats();
      fetchHistoricalData();
      fetchDoctorStats();
      fetchDayOfWeekStats();
    }
  }, [isOpen, selectedDate]);

  const fetchMonthlyStats = async () => {
    setLoading(true);
    try {
      const month = format(selectedDate, 'yyyy-MM');
      const response = await fetch(`/api/stats?type=monthly&date=${month}`);
      const data = await response.json();
      if (data.stats) {
        setMonthlyStats(data.stats);
      }
    } catch (error) {
      console.error('월간 통계 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const response = await fetch('/api/patient-history');
      const data = await response.json();
      if (data.history) {
        setHistoricalData(data.history);
      }
    } catch (error) {
      console.error('환자 내원 기록 조회 실패:', error);
    }
  };

  const fetchDoctorStats = async () => {
    try {
      const month = format(selectedDate, 'yyyy-MM');
      const response = await fetch(`/api/doctor-stats?date=${month}`);
      const data = await response.json();
      if (data.doctorStats) {
        setDoctorStats(data.doctorStats);
      }
    } catch (error) {
      console.error('의사별 통계 조회 실패:', error);
    }
  };

  const fetchDayOfWeekStats = async () => {
    try {
      const month = format(selectedDate, 'yyyy-MM');
      const response = await fetch(`/api/dayofweek-stats?date=${month}`);
      const data = await response.json();
      if (data.dayOfWeekStats) {
        setDayOfWeekStats(data.dayOfWeekStats);
      }
    } catch (error) {
      console.error('요일별 통계 조회 실패:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <DialogTitle className="text-2xl font-bold text-gray-800">경영지표 대시보드</DialogTitle>
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
                value="consultation" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md flex items-center gap-2 text-sm font-medium"
              >
                <MessageSquare className="h-4 w-4" />
                상담지표
              </TabsTrigger>
              <TabsTrigger 
                value="expense" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-md flex items-center gap-2 text-sm font-medium"
              >
                <CreditCard className="h-4 w-4" />
                지출지표
              </TabsTrigger>
            </TabsList>

            {/* 내원지표 탭 */}
            <TabsContent value="visit" className="space-y-6 mt-0">
              {/* 현재 월 내원 통계 - 컴팩트 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium text-gray-600">총 내원</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {loading ? '...' : monthlyStats?.totalPatients?.toLocaleString() || '0'}
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-medium text-gray-600">신환</span>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {loading ? '...' : monthlyStats?.newPatients?.toLocaleString() || '0'}
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-medium text-gray-600">총 수납</span>
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    {loading ? '...' : (monthlyStats?.totalPaymentAmount || 0).toLocaleString()}
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-medium text-gray-600">상담</span>
                  </div>
                  <div className="text-xl font-bold text-orange-600">
                    {loading ? '...' : ((monthlyStats?.consultationAgreedCount || 0) + (monthlyStats?.consultationNonAgreedCount || 0)).toLocaleString()}
                  </div>
                </Card>
              </div>

              {/* 의사별 통계와 요일별 통계를 2열로 배치 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 의사별 통계 - 컴팩트 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Stethoscope className="h-4 w-4" />
                      의사별 내원 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {doctorStats.map((doctor, index) => {
                        const newPatientRate = doctor.totalPatients > 0 
                          ? (doctor.newPatients / doctor.totalPatients * 100) 
                          : 0;
                        
                        return (
                          <div 
                            key={doctor.doctor} 
                            className="relative p-3 rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-sm transition-all duration-200"
                          >
                            {/* 순위 뱃지 */}
                            {index < 3 && (
                              <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                index === 0 ? 'bg-yellow-500' : 
                                index === 1 ? 'bg-gray-400' : 
                                'bg-orange-400'
                              }`}>
                                {index + 1}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1 bg-blue-100 rounded">
                                <Stethoscope className="h-3 w-3 text-blue-600" />
                              </div>
                              <h3 className="font-medium text-sm text-gray-900">{doctor.doctor}</h3>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">총 내원</span>
                                <span className="font-bold text-blue-600">
                                  {doctor.totalPatients.toLocaleString()}
                                </span>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">신환</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-green-600 text-sm">
                                    {doctor.newPatients.toLocaleString()}
                                  </span>
                                  <Badge 
                                    variant="secondary" 
                                    className="text-xs px-1 py-0 h-4 bg-green-100 text-green-700"
                                  >
                                    {newPatientRate.toFixed(0)}%
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {doctorStats.length === 0 && !loading && (
                      <div className="text-center py-6 text-gray-500">
                        <Stethoscope className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">해당 월에 진료한 의사 데이터가 없습니다.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 요일별 통계 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-4 w-4" />
                      요일별 내원 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-7 gap-2">
                      {dayOfWeekStats.map((day) => {
                        const maxPatients = Math.max(...dayOfWeekStats.map(d => d.totalPatients));
                        const heightPercentage = maxPatients > 0 ? (day.totalPatients / maxPatients) * 100 : 0;
                        
                        return (
                          <div key={day.dayOfWeek} className="text-center">
                            <div className="mb-2">
                              <div className={`text-xs font-medium ${
                                day.dayOfWeek === '일' ? 'text-red-600' : 
                                day.dayOfWeek === '토' ? 'text-blue-600' : 
                                'text-gray-700'
                              }`}>
                                {day.dayOfWeek}
                              </div>
                            </div>
                            
                            {/* 막대 그래프 */}
                            <div className="relative h-20 flex items-end justify-center mb-2">
                              <div 
                                className={`w-8 rounded-t transition-all duration-300 ${
                                  day.dayOfWeek === '일' ? 'bg-red-200 border-red-300' : 
                                  day.dayOfWeek === '토' ? 'bg-blue-200 border-blue-300' : 
                                  'bg-gray-200 border-gray-300'
                                } border-2 border-solid`}
                                style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                              />
                              {day.totalPatients > 0 && (
                                <div className="absolute -top-5 text-xs font-semibold text-gray-700">
                                  {day.totalPatients}
                                </div>
                              )}
                            </div>
                            
                            {/* 통계 정보 */}
                            <div className="space-y-1">
                              <div className="text-xs text-gray-600">
                                총: <span className="font-semibold">{day.totalPatients}</span>
                              </div>
                              <div className="text-xs text-green-600">
                                신환: <span className="font-semibold">{day.newPatients}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 15개월 트렌드 차트 */}
              <Card>
                <CardHeader>
                  <CardTitle>최근 15개월 내원 추이</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="totalPatients" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          name="총 내원인원"
                          dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2 }}
                        >
                          <LabelList 
                            dataKey="totalPatients" 
                            position="top" 
                            style={{ fontSize: '12px', fill: '#8884d8', fontWeight: 'bold' }}
                            offset={8}
                          />
                        </Line>
                        <Line 
                          type="monotone" 
                          dataKey="newPatients" 
                          stroke="#82ca9d" 
                          strokeWidth={2}
                          name="신환"
                          dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#82ca9d', strokeWidth: 2 }}
                        >
                          <LabelList 
                            dataKey="newPatients" 
                            position="top" 
                            style={{ fontSize: '12px', fill: '#82ca9d', fontWeight: 'bold' }}
                            offset={8}
                          />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 매출지표 탭 */}
            <TabsContent value="revenue" className="space-y-4 mt-0">
              {/* 매출지표 컨텐츠 */}
            </TabsContent>

            {/* 상담지표 탭 */}
            <TabsContent value="consultation" className="space-y-4 mt-0">
              {/* 상담지표 컨텐츠 */}
            </TabsContent>

            {/* 지출지표 탭 */}
            <TabsContent value="expense" className="space-y-4 mt-0">
              {/* 지출지표 컨텐츠 */}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}