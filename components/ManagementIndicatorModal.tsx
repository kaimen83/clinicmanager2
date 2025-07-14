'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, TrendingUp, MessageSquare, CreditCard, Calendar, Activity, Target, PieChart, Stethoscope, Award, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ComposedChart, Bar } from 'recharts';
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
  dailyAvgPatients: number;
  dailyAvgNewPatients: number;
  treatmentDays: number;
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
  avgNewPatients: number;
  avgTotalPatients: number;
  treatmentDays: number;
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

type DoctorRevenueStats = {
  doctor: string;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  consultationRevenue: number;
};

type DayOfWeekRevenueStats = {
  dayOfWeek: string;
  dayNumber: number;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
};

type RevenueHistoricalData = {
  month: string;
  totalRevenue: number;
  cashRevenue: number;
  cardRevenue: number;
  extraIncome: number;
  avgTotalRevenue: number;
  avgCashRevenue: number;
  treatmentDays: number;
};

type VisitPathHistoryData = {
  month: string;
  groups: Array<{
    groupName: string;
    patientCount: number;
    paymentAmount: number;
    consultationAmount: number;
  }>;
};

type ConsultationStats = {
  consultationAgreedAmount: number;
  consultationNonAgreedAmount: number;
  totalConsultationAmount: number;
  agreedCount: number;
  nonAgreedCount: number;
  totalConsultationCount: number;
  agreedPercentage: number;
  agreedAmountPercentage: number;
  nonAgreedAmount: number;
};

type ConsultationTrendData = {
  month: string;
  totalConsultations: number;
  agreedConsultations: number;
  nonAgreedConsultations: number;
  agreedPercentage: number;
  agreedAmountPercentage: number;
  avgConsultationAmount: number;
  totalAmount: number;
  agreedAmount: number;
  nonAgreedAmount: number;
  [key: string]: any; // 의사별, 직원별 동의율 데이터를 위한 동적 프로퍼티
};

type DoctorConsultationStats = {
  doctor: string;
  totalConsultations: number;
  agreedConsultations: number;
  nonAgreedConsultations: number;
  agreedPercentage: number;
  totalAmount: number;
  agreedAmount: number;
};

type StaffConsultationStats = {
  staff: string;
  totalConsultations: number;
  agreedConsultations: number;
  agreedPercentage: number;
};

export default function ManagementIndicatorModal({ isOpen, onClose }: ManagementIndicatorModalProps) {
  const { selectedDate } = useDateContext();
  const [activeTab, setActiveTab] = useState('visit');
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [doctorStats, setDoctorStats] = useState<DoctorStats[]>([]);
  const [dayOfWeekStats, setDayOfWeekStats] = useState<DayOfWeekStats[]>([]);
  const [visitPathHistoryData, setVisitPathHistoryData] = useState<VisitPathHistoryData[]>([]);
  const [visitPathGroupNames, setVisitPathGroupNames] = useState<string[]>([]);
  const [doctorRevenueStats, setDoctorRevenueStats] = useState<DoctorRevenueStats[]>([]);
  const [dayOfWeekRevenueStats, setDayOfWeekRevenueStats] = useState<DayOfWeekRevenueStats[]>([]);
  const [revenueHistoricalData, setRevenueHistoricalData] = useState<RevenueHistoricalData[]>([]);
  const [doctorNames, setDoctorNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // 상담지표 관련 상태
  const [consultationStats, setConsultationStats] = useState<ConsultationStats | null>(null);
  const [consultationTrendData, setConsultationTrendData] = useState<ConsultationTrendData[]>([]);
  const [doctorConsultationStats, setDoctorConsultationStats] = useState<DoctorConsultationStats[]>([]);
  const [staffConsultationStats, setStaffConsultationStats] = useState<StaffConsultationStats[]>([]);
  const [consultationDoctorNames, setConsultationDoctorNames] = useState<string[]>([]);
  const [allStaffs, setAllStaffs] = useState<string[]>([]);
  const [highlightedStaff, setHighlightedStaff] = useState<string | null>(null);
  const [doctorAgreementType, setDoctorAgreementType] = useState<'count' | 'amount'>('count');
  const [staffAgreementType, setStaffAgreementType] = useState<'count' | 'amount'>('count');
  const [doctorPerformanceType, setDoctorPerformanceType] = useState<'count' | 'amount'>('count');
  
  // 차트 하이라이트 상태 관리
  const [highlightedGroup, setHighlightedGroup] = useState<string | null>(null);

  // 직원별 차트 범례 클릭 핸들러
  const handleStaffLegendClick = (data: any) => {
    // 범례 이름 형태: "${staff} 동의율 (건수)" 또는 "${staff} 동의율 (금액)"
    const staffName = data.value.replace(/ 동의율 \(.*\)$/, '');
    setHighlightedStaff(highlightedStaff === staffName ? null : staffName);
  };

  // 모달이 열릴 때 currentDate를 selectedDate로 초기화
  useEffect(() => {
    if (isOpen) {
      setCurrentDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

  // 현재 월 통계 데이터 가져오기
  useEffect(() => {
    if (isOpen && currentDate) {
      fetchMonthlyStats();
      fetchHistoricalData();
      fetchDoctorStats();
      fetchDayOfWeekStats();
      fetchVisitPathHistoryData();
      if (activeTab === 'revenue') {
        fetchRevenueData();
      }
      if (activeTab === 'consultation') {
        fetchConsultationData();
      }
    }
  }, [isOpen, currentDate, activeTab]);

  const fetchMonthlyStats = async () => {
    setLoading(true);
    try {
      const month = format(currentDate, 'yyyy-MM');
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
      const month = format(currentDate, 'yyyy-MM');
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
      const month = format(currentDate, 'yyyy-MM');
      const response = await fetch(`/api/dayofweek-stats?date=${month}`);
      const data = await response.json();
      if (data.dayOfWeekStats) {
        setDayOfWeekStats(data.dayOfWeekStats);
      }
    } catch (error) {
      console.error('요일별 통계 조회 실패:', error);
    }
  };

  const fetchVisitPathHistoryData = async () => {
    try {
      const response = await fetch('/api/visit-path-history');
      const data = await response.json();
      if (data.visitPathHistory) {
        // 그룹명 추출
        const groupNames = data.visitPathHistory[0]?.groups.map((group: any) => group.groupName) || [];
        setVisitPathGroupNames(groupNames);
        
        // 차트용 데이터 변환
        const transformedData = data.visitPathHistory.map((monthData: any) => {
          const transformed: any = { month: monthData.month };
          monthData.groups.forEach((group: any, index: number) => {
            transformed[`${group.groupName}_환자수`] = group.patientCount;
            transformed[`${group.groupName}_결제금액`] = group.paymentAmount;
            transformed[`${group.groupName}_상담금액`] = group.consultationAmount;
          });
          return transformed;
        });
        setVisitPathHistoryData(transformedData);
      }
    } catch (error) {
      console.error('내원경로별 통계 조회 실패:', error);
    }
  };

  const fetchConsultationData = async () => {
    try {
      const month = format(currentDate, 'yyyy-MM');
      
      // 15개월 상담 트렌드 데이터 가져오기 (현재 월 통계 포함)
      const trendResponse = await fetch('/api/consultation-trends');
      const trendData = await trendResponse.json();
      
      if (trendData.trends) {
        setConsultationTrendData(trendData.trends);
        
        // 현재 월 데이터를 트렌드 데이터에서 추출
        const currentMonthData = trendData.trends.find((trend: any) => trend.month === month);
        
        if (currentMonthData) {
          const summary = {
            consultationAgreedAmount: currentMonthData.agreedAmount || 0,
            consultationNonAgreedAmount: currentMonthData.nonAgreedAmount || 0,
            totalConsultationAmount: currentMonthData.totalAmount || 0,
            agreedCount: currentMonthData.agreedConsultations || 0,
            nonAgreedCount: currentMonthData.nonAgreedConsultations || 0,
            totalConsultationCount: currentMonthData.totalConsultations || 0,
            agreedPercentage: currentMonthData.agreedPercentage || 0,
            agreedAmountPercentage: currentMonthData.agreedAmountPercentage || 0,
            nonAgreedAmount: currentMonthData.nonAgreedAmount || 0
          };
          setConsultationStats(summary);
        }
      }
      
      // 현재 월 의사별 통계 가져오기
      const statsResponse = await fetch(`/api/consultations/stats?type=monthly&date=${month}`);
      const statsData = await statsResponse.json();
      
      if (statsData.doctorStats) {
        const doctorStats = statsData.doctorStats.map((doctor: any) => ({
          doctor: doctor.doctor,
          totalConsultations: doctor.totalCount,
          agreedConsultations: doctor.agreedCount,
          nonAgreedConsultations: doctor.nonAgreedCount,
          agreedPercentage: doctor.agreedPercentage,
          totalAmount: doctor.totalAmount,
          agreedAmount: doctor.agreedAmount
        }));
        setDoctorConsultationStats(doctorStats);
      }
      
      if (trendData.doctors) {
        setConsultationDoctorNames(trendData.doctors);
      }
      
      if (trendData.allStaffs) {
        setAllStaffs(trendData.allStaffs);
      }
      
    } catch (error) {
      console.error('상담 데이터 조회 실패:', error);
    }
  };

  const fetchRevenueData = async () => {
    try {
      const month = format(currentDate, 'yyyy-MM');
      
      // 매출 기록 데이터 가져오기
      const response = await fetch('/api/revenue-history');
      const data = await response.json();
      
      if (data.revenueHistory) {
        setRevenueHistoricalData(data.revenueHistory);
        
        // 원장 이름 추출 (모든 월 데이터에서)
        if (data.revenueHistory.length > 0) {
          const doctors = new Set<string>();
          
          // 모든 월 데이터를 확인해서 원장 이름 추출
          data.revenueHistory.forEach((monthData: any) => {
            Object.keys(monthData).forEach(key => {
              if (key.includes('_총매출')) {
                const doctorName = key.replace('_총매출', '').trim();
                if (doctorName && doctorName !== '미분류') {
                  doctors.add(doctorName);
                }
              }
            });
          });
          
          setDoctorNames(Array.from(doctors));
        }
      }

      // 의사별, 요일별 매출 통계는 transactions 데이터를 직접 가공
      const [year, monthNum] = month.split('-').map(Number);
      const firstDay = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const lastDay = `${year}-${String(monthNum).padStart(2, '0')}-${new Date(year, monthNum, 0).getDate().toString().padStart(2, '0')}`;
      
      const transactionResponse = await fetch(`/api/transactions?dateStart=${firstDay}&dateEnd=${lastDay}&limit=1000`);
      const transactionData = await transactionResponse.json();
      
      if (transactionData.transactions) {
        // 의사별 매출 통계 계산
        const doctorRevenueMap = new Map();
        const dayOfWeekRevenueMap = new Map();

        transactionData.transactions.forEach((transaction: any) => {
          const doctor = transaction.doctor;
          const amount = transaction.paymentAmount || 0;
          const paymentMethod = transaction.paymentMethod;
          const isConsultation = transaction.isConsultation;
          const transactionDate = new Date(transaction.date);
          const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][transactionDate.getDay()];

          // 의사별 통계
          if (!doctorRevenueMap.has(doctor)) {
            doctorRevenueMap.set(doctor, {
              doctor,
              totalRevenue: 0,
              cashRevenue: 0,
              cardRevenue: 0,
              consultationRevenue: 0
            });
          }
          const doctorStats = doctorRevenueMap.get(doctor);
          doctorStats.totalRevenue += amount;
          
          if (paymentMethod === '현금' || paymentMethod === '계좌이체') {
            doctorStats.cashRevenue += amount;
          } else if (paymentMethod === '카드') {
            doctorStats.cardRevenue += amount;
          }
          
          if (isConsultation) {
            doctorStats.consultationRevenue += amount;
          }

          // 요일별 통계
          if (!dayOfWeekRevenueMap.has(dayOfWeek)) {
            dayOfWeekRevenueMap.set(dayOfWeek, {
              dayOfWeek,
              dayNumber: transactionDate.getDay(),
              totalRevenue: 0,
              cashRevenue: 0,
              cardRevenue: 0
            });
          }
          const dayStats = dayOfWeekRevenueMap.get(dayOfWeek);
          dayStats.totalRevenue += amount;
          
          if (paymentMethod === '현금' || paymentMethod === '계좌이체') {
            dayStats.cashRevenue += amount;
          } else if (paymentMethod === '카드') {
            dayStats.cardRevenue += amount;
          }
        });

        // 배열로 변환하고 정렬
        const doctorRevenueArray = Array.from(doctorRevenueMap.values())
          .sort((a, b) => b.totalRevenue - a.totalRevenue);
        setDoctorRevenueStats(doctorRevenueArray);

        // 요일별 데이터는 일요일부터 시작하는 순서로 정렬
        const dayOrder = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeekRevenueArray = dayOrder.map(day => 
          dayOfWeekRevenueMap.get(day) || {
            dayOfWeek: day,
            dayNumber: dayOrder.indexOf(day),
            totalRevenue: 0,
            cashRevenue: 0,
            cardRevenue: 0
          }
        );
        setDayOfWeekRevenueStats(dayOfWeekRevenueArray);
      }
    } catch (error) {
      console.error('매출 데이터 조회 실패:', error);
    }
  };

  // 월 이동 함수들
  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  // 캘린더에서 월 선택 핸들러
  const handleMonthSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date);
      setIsCalendarOpen(false);
    }
  };

  // 범례 클릭 핸들러
  const handleLegendClick = (entry: any) => {
    if (!entry || !entry.dataKey) return;
    
    // dataKey에서 그룹명 추출 (예: "센터치과 관련_환자수" -> "센터치과 관련")
    const groupName = entry.dataKey.split('_')[0];
    
    // 같은 그룹을 클릭하면 하이라이트 해제, 다른 그룹을 클릭하면 해당 그룹 하이라이트
    setHighlightedGroup(highlightedGroup === groupName ? null : groupName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-800">경영지표 대시보드</DialogTitle>
            
            {/* 월 네비게이션 */}
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                disabled={loading}
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="text-lg font-semibold text-gray-700 min-w-[120px] text-center p-2 hover:bg-white/50 rounded-lg transition-colors flex items-center justify-center gap-2">
                    {format(currentDate, 'yyyy년 MM월', { locale: ko })}
                    <Calendar className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <DayPicker
                    mode="single"
                    selected={currentDate}
                    onSelect={handleMonthSelect}
                    locale={ko}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={2030}
                    className="p-3"
                    classNames={{
                      months: "flex flex-col space-y-4",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                      day_range_end: "day-range-end",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                    }}
                  />
                </PopoverContent>
              </Popover>
              
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                disabled={loading}
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-14 mb-6 bg-gray-100/50">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium text-gray-600">총 내원</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {loading ? '...' : monthlyStats?.totalPatients?.toLocaleString() || '0'}
                    {!loading && monthlyStats?.dailyAvgPatients ? (
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        (일평균 {monthlyStats.dailyAvgPatients})
                      </span>
                    ) : null}
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-medium text-gray-600">신환</span>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {loading ? '...' : monthlyStats?.newPatients?.toLocaleString() || '0'}
                    {!loading && monthlyStats?.dailyAvgNewPatients ? (
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        (일평균 {monthlyStats.dailyAvgNewPatients})
                      </span>
                    ) : null}
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

              {/* 통합 15개월 트렌드 차트 */}
              <Card>
                <CardHeader>
                  <CardTitle>최근 15개월 내원 추이</CardTitle>
                  <CardDescription>월별 총계 및 일평균 내원인원과 신환 수 (진료일 기준)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          tickLine={{ stroke: '#d1d5db' }}
                        />
                        {/* 왼쪽 Y축 - 월별 총계 */}
                        <YAxis 
                          yAxisId="monthly"
                          tick={{ fontSize: 12 }}
                          tickLine={{ stroke: '#d1d5db' }}
                          label={{ value: '월별 총계 (명)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                        />
                        {/* 오른쪽 Y축 - 일평균 */}
                        <YAxis 
                          yAxisId="daily"
                          orientation="right"
                          tick={{ fontSize: 12 }}
                          tickLine={{ stroke: '#d1d5db' }}
                          label={{ value: '일평균 (명)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                        />
                        <Tooltip 
                          formatter={(value, name, props) => [
                            `${value}명`,
                            name
                          ]}
                          labelFormatter={(label) => `${label}`}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                        
                        {/* 월별 총계 라인 - 실선 */}
                        <Line 
                          yAxisId="monthly"
                          type="monotone" 
                          dataKey="totalPatients" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          name="월별 총 내원"
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                        >
                          <LabelList 
                            dataKey="totalPatients" 
                            position="top" 
                            style={{ fontSize: '10px', fill: '#3b82f6', fontWeight: 'bold' }}
                            offset={15}
                          />
                        </Line>
                        <Line 
                          yAxisId="monthly"
                          type="monotone" 
                          dataKey="newPatients" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          name="월별 신환"
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                        >
                          <LabelList 
                            dataKey="newPatients" 
                            position="bottom" 
                            style={{ fontSize: '10px', fill: '#10b981', fontWeight: 'bold' }}
                            offset={10}
                          />
                        </Line>
                        
                        {/* 일평균 막대 그래프 */}
                        <Bar 
                          yAxisId="daily"
                          dataKey="avgTotalPatients" 
                          fill="#f59e0b" 
                          fillOpacity={0.6}
                          name="일평균 총 내원"
                          stroke="#f59e0b"
                          strokeWidth={1}
                        >
                          <LabelList 
                            dataKey="avgTotalPatients" 
                            position="top" 
                            style={{ fontSize: '9px', fill: '#f59e0b', fontWeight: 'bold' }}
                            offset={5}
                          />
                        </Bar>
                        <Bar 
                          yAxisId="daily"
                          dataKey="avgNewPatients" 
                          fill="#ef4444" 
                          fillOpacity={0.6}
                          name="일평균 신환"
                          stroke="#ef4444"
                          strokeWidth={1}
                        >
                          <LabelList 
                            dataKey="avgNewPatients" 
                            position="insideTop" 
                            style={{ fontSize: '9px', fill: '#ffffff', fontWeight: 'bold', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}
                            offset={-5}
                          />
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* 차트 설명 */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-0.5 bg-blue-500"></div>
                          <span>라인: 월별 총계 (왼쪽 축)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-3 bg-orange-500 opacity-60"></div>
                          <span>막대: 진료일 기준 일평균 (오른쪽 축)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 매출지표 탭 */}
            <TabsContent value="revenue" className="space-y-6 mt-0">
              {/* 현재 월 매출 통계 - 컴팩트 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium text-gray-600">총 매출</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {loading ? '...' : (monthlyStats?.totalPaymentAmount || 0).toLocaleString()}원
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-medium text-gray-600">현금매출</span>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {loading ? '...' : (monthlyStats?.cashTransferAmount || 0).toLocaleString()}원
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-purple-500" />
                    <span className="text-xs font-medium text-gray-600">카드매출</span>
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    {loading ? '...' : (monthlyStats?.cardAmount || 0).toLocaleString()}원
                  </div>
                </Card>

                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-orange-500" />
                    <span className="text-xs font-medium text-gray-600">기타수익</span>
                  </div>
                  <div className="text-xl font-bold text-orange-600">
                    {loading ? '...' : (monthlyStats?.nonMedicalIncome || 0).toLocaleString()}원
                  </div>
                </Card>
              </div>

              {/* 의사별 매출 통계와 요일별 매출 통계를 2열로 배치 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 의사별 매출 통계 - 컴팩트 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Stethoscope className="h-4 w-4" />
                      의사별 매출 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {doctorRevenueStats.map((doctor, index) => {
                        const cashRatio = doctor.totalRevenue > 0 
                          ? (doctor.cashRevenue / doctor.totalRevenue * 100) 
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
                                <span className="text-xs text-gray-600">총 매출</span>
                                <span className="font-bold text-blue-600 text-sm">
                                  {(doctor.totalRevenue / 10000).toFixed(0)}만
                                </span>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">현금</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold text-green-600 text-sm">
                                    {(doctor.cashRevenue / 10000).toFixed(0)}만
                                  </span>
                                  <Badge 
                                    variant="secondary" 
                                    className="text-xs px-1 py-0 h-4 bg-green-100 text-green-700"
                                  >
                                    {cashRatio.toFixed(0)}%
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600">카드</span>
                                <span className="font-semibold text-purple-600 text-sm">
                                  {(doctor.cardRevenue / 10000).toFixed(0)}만
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {doctorRevenueStats.length === 0 && !loading && (
                      <div className="text-center py-6 text-gray-500">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">해당 월에 매출 데이터가 없습니다.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 요일별 매출 통계 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-4 w-4" />
                      요일별 매출 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-7 gap-2">
                      {dayOfWeekRevenueStats.map((day) => {
                        const maxRevenue = Math.max(...dayOfWeekRevenueStats.map(d => d.totalRevenue));
                        const heightPercentage = maxRevenue > 0 ? (day.totalRevenue / maxRevenue) * 100 : 0;
                        
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
                            </div>
                            
                            {/* 통계 정보 */}
                            <div className="space-y-1">
                              <div className="text-xs text-gray-600">
                                총: <span className="font-semibold">{(day.totalRevenue / 10000).toFixed(0)}만</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 15개월 매출 트렌드 차트 - 분리된 구성 */}
              <div className="space-y-6">
                {/* 1. 전체 매출 트렌드 */}
                <Card>
                  <CardHeader>
                    <CardTitle>전체 매출 트렌드 (15개월)</CardTitle>
                    <CardDescription>월별 총매출과 일평균 매출</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={revenueHistoricalData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: '#d1d5db' }}
                          />
                          <YAxis 
                            yAxisId="monthly"
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: '#d1d5db' }}
                            tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                            label={{ value: '매출 (만원)', angle: -90, position: 'insideLeft' }}
                          />
                          <YAxis 
                            yAxisId="daily"
                            orientation="right"
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: '#d1d5db' }}
                            tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                            label={{ value: '일평균 (만원)', angle: 90, position: 'insideRight' }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [
                              `${Number(value).toLocaleString()}원`,
                              name
                            ]}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend />
                          
                          {/* 월별 총매출 - 굵은 실선 */}
                          <Line 
                            yAxisId="monthly"
                            type="monotone" 
                            dataKey="totalRevenue" 
                            stroke="#3b82f6" 
                            strokeWidth={4}
                            name="월별 총매출"
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                            activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                          />
                          
                          {/* 일평균 총매출 - 라인 */}
                          <Line 
                            yAxisId="daily"
                            type="monotone" 
                            dataKey="avgTotalRevenue" 
                            stroke="#f59e0b" 
                            strokeWidth={2}
                            strokeDasharray="8 4"
                            name="일평균 총매출"
                            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: '#fff' }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. 원장별 매출 비교 */}
                <Card>
                  <CardHeader>
                    <CardTitle>원장별 매출 비교 (15개월)</CardTitle>
                    <CardDescription>각 원장의 월별 매출 추이 비교</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueHistoricalData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: '#d1d5db' }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: '#d1d5db' }}
                            tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                            label={{ value: '매출 (만원)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [
                              `${Number(value).toLocaleString()}원`,
                              name
                            ]}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend />
                          
                          {/* 원장별 월별 총매출 */}
                          {doctorNames.map((doctor, index) => {
                            const colors = ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
                            const color = colors[index % colors.length];
                            const dataKey = `${doctor}_총매출`;
                            
                            return (
                              <Line
                                key={`${doctor}_monthly`}
                                type="monotone"
                                dataKey={dataKey}
                                stroke={color}
                                strokeWidth={3}
                                name={`${doctor} 월별매출`}
                                dot={{ fill: color, strokeWidth: 2, r: 5 }}
                                activeDot={{ r: 7, stroke: color, strokeWidth: 2, fill: '#fff' }}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. 원장별 효율성 비교 (일평균) */}
                <Card>
                  <CardHeader>
                    <CardTitle>원장별 일평균 매출 효율성 (15개월)</CardTitle>
                    <CardDescription>실제 진료일 기준 일평균 매출 비교</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueHistoricalData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: '#d1d5db' }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: '#d1d5db' }}
                            tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                            label={{ value: '일평균 매출 (만원)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [
                              `${Number(value).toLocaleString()}원`,
                              name
                            ]}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend />
                          
                          {/* 전체 일평균 - 기준선 */}
                          <Line 
                            type="monotone" 
                            dataKey="avgTotalRevenue" 
                            stroke="#94a3b8" 
                            strokeWidth={2}
                            strokeDasharray="10 5"
                            name="전체 일평균 (기준)"
                            dot={{ fill: '#94a3b8', strokeWidth: 1, r: 3 }}
                          />
                          
                          {/* 원장별 일평균 매출 */}
                          {doctorNames.map((doctor, index) => {
                            const colors = ['#22c55e', '#a855f7', '#fb923c', '#f87171', '#38bdf8'];
                            const color = colors[index % colors.length];
                            const dataKey = `${doctor}_일평균매출`;
                            
                            return (
                              <Line
                                key={`${doctor}_daily`}
                                type="monotone"
                                dataKey={dataKey}
                                stroke={color}
                                strokeWidth={3}
                                name={`${doctor} 일평균`}
                                dot={{ fill: color, strokeWidth: 2, r: 5 }}
                                activeDot={{ r: 7, stroke: color, strokeWidth: 2, fill: '#fff' }}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 내원경로별 통계 탭 */}
            <TabsContent value="visitpath" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    내원경로별 15개월 통계
                  </CardTitle>
                  <CardDescription>대분류별 환자 수, 결제금액, 상담금액 추이</CardDescription>
                </CardHeader>
                <CardContent>
                  {visitPathHistoryData.length > 0 ? (
                    <div className="space-y-8">
                      {/* 환자 수 차트 */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-blue-700">환자 수 추이</h3>
                        <div className="h-[400px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart 
                              data={visitPathHistoryData}
                              margin={{ top: 30, right: 30, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis 
                                dataKey="month" 
                                tick={{ fontSize: 12 }}
                                tickLine={{ stroke: '#d1d5db' }}
                              />
                              <YAxis 
                                tick={{ fontSize: 12 }}
                                tickLine={{ stroke: '#d1d5db' }}
                                label={{ value: '환자 수 (명)', angle: -90, position: 'insideLeft' }}
                              />
                              <Tooltip 
                                formatter={(value, name) => [`${value}명`, name]}
                                labelFormatter={(label) => `${label}`}
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Legend 
                                onClick={handleLegendClick}
                                wrapperStyle={{ cursor: 'pointer' }}
                              />
                              {visitPathGroupNames.map((groupName, index) => {
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
                                const dataKey = `${groupName}_환자수`;
                                const isHighlighted = highlightedGroup === null || highlightedGroup === groupName;
                                const opacity = highlightedGroup === null ? 1 : (isHighlighted ? 1 : 0.15);
                                
                                return (
                                  <Line
                                    key={groupName}
                                    type="monotone"
                                    dataKey={dataKey}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={3}
                                    strokeOpacity={opacity}
                                    name={groupName}
                                    dot={{ r: 4, fillOpacity: opacity }}
                                    activeDot={{ r: 6, fillOpacity: opacity }}
                                  >
                                    {highlightedGroup === groupName && (
                                      <LabelList 
                                        dataKey={dataKey}
                                        position="top"
                                        style={{ fontSize: '11px', fill: colors[index % colors.length] }}
                                        formatter={(value: any) => typeof value === 'number' && value > 0 ? `${value}명` : ''}
                                      />
                                    )}
                                  </Line>
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* 결제 금액 차트 */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-green-700">결제 금액 추이</h3>
                        <div className="h-[400px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart 
                              data={visitPathHistoryData}
                              margin={{ top: 30, right: 30, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis 
                                dataKey="month" 
                                tick={{ fontSize: 12 }}
                                tickLine={{ stroke: '#d1d5db' }}
                              />
                              <YAxis 
                                tick={{ fontSize: 12 }}
                                tickLine={{ stroke: '#d1d5db' }}
                                label={{ value: '결제 금액 (원)', angle: -90, position: 'insideLeft' }}
                                tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                              />
                              <Tooltip 
                                formatter={(value, name) => [`${Number(value).toLocaleString()}원`, name]}
                                labelFormatter={(label) => `${label}`}
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Legend 
                                onClick={handleLegendClick}
                                wrapperStyle={{ cursor: 'pointer' }}
                              />
                              {visitPathGroupNames.map((groupName, index) => {
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
                                const dataKey = `${groupName}_결제금액`;
                                const isHighlighted = highlightedGroup === null || highlightedGroup === groupName;
                                const opacity = highlightedGroup === null ? 1 : (isHighlighted ? 1 : 0.15);
                                
                                return (
                                  <Line
                                    key={groupName}
                                    type="monotone"
                                    dataKey={dataKey}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={3}
                                    strokeOpacity={opacity}
                                    name={groupName}
                                    dot={{ r: 4, fillOpacity: opacity }}
                                    activeDot={{ r: 6, fillOpacity: opacity }}
                                  >
                                    {highlightedGroup === groupName && (
                                      <LabelList 
                                        dataKey={dataKey}
                                        position="top"
                                        style={{ fontSize: '11px', fill: colors[index % colors.length] }}
                                        formatter={(value: any) => typeof value === 'number' && value > 0 ? `${(value / 10000).toFixed(0)}만` : ''}
                                      />
                                    )}
                                  </Line>
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* 상담 금액 차트 */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-orange-700">상담 금액 추이</h3>
                        <div className="h-[400px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart 
                              data={visitPathHistoryData}
                              margin={{ top: 30, right: 30, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis 
                                dataKey="month" 
                                tick={{ fontSize: 12 }}
                                tickLine={{ stroke: '#d1d5db' }}
                              />
                              <YAxis 
                                tick={{ fontSize: 12 }}
                                tickLine={{ stroke: '#d1d5db' }}
                                label={{ value: '상담 금액 (원)', angle: -90, position: 'insideLeft' }}
                                tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                              />
                              <Tooltip 
                                formatter={(value, name) => [`${Number(value).toLocaleString()}원`, name]}
                                labelFormatter={(label) => `${label}`}
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Legend 
                                onClick={handleLegendClick}
                                wrapperStyle={{ cursor: 'pointer' }}
                              />
                              {visitPathGroupNames.map((groupName, index) => {
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
                                const dataKey = `${groupName}_상담금액`;
                                const isHighlighted = highlightedGroup === null || highlightedGroup === groupName;
                                const opacity = highlightedGroup === null ? 1 : (isHighlighted ? 1 : 0.15);
                                
                                return (
                                  <Line
                                    key={groupName}
                                    type="monotone"
                                    dataKey={dataKey}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={3}
                                    strokeOpacity={opacity}
                                    name={groupName}
                                    dot={{ r: 4, fillOpacity: opacity }}
                                    activeDot={{ r: 6, fillOpacity: opacity }}
                                  >
                                    {highlightedGroup === groupName && (
                                      <LabelList 
                                        dataKey={dataKey}
                                        position="top"
                                        style={{ fontSize: '11px', fill: colors[index % colors.length] }}
                                        formatter={(value: any) => typeof value === 'number' && value > 0 ? `${(value / 10000).toFixed(0)}만` : ''}
                                      />
                                    )}
                                  </Line>
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">내원경로별 통계 데이터를 불러오는 중입니다...</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 상담지표 탭 */}
            <TabsContent value="consultation" className="space-y-6 mt-0">
              {/* 현재 월 상담 핵심 지표 카드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="p-3 border-l-4 border-l-green-500">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-medium text-gray-600">총 상담건수</span>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {loading ? '...' : (consultationStats?.totalConsultationCount || 0).toLocaleString()}
                  </div>
                </Card>

                <Card className="p-3 border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium text-gray-600">상담 총금액</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {loading ? '...' : (consultationStats?.totalConsultationAmount || 0).toLocaleString()}원
                    {!loading && consultationStats && consultationStats.totalConsultationAmount > 0 && consultationStats.totalConsultationCount > 0 ? (
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        (평균 {Math.round((consultationStats.totalConsultationAmount / consultationStats.totalConsultationCount) / 10000)}만원)
                      </span>
                    ) : null}
                  </div>
                </Card>

                <Card className="p-3 border-l-4 border-l-purple-500">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-medium text-gray-600">동의 건수</span>
                    </div>
                    {!loading && consultationStats && consultationStats.totalConsultationCount > 0 && consultationStats.totalConsultationAmount > 0 ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">건별: <span className="font-semibold text-purple-600">{consultationStats.agreedPercentage}%</span></span>
                        <span className="text-gray-500">금액별: <span className="font-semibold text-purple-600">{consultationStats.agreedAmountPercentage}%</span></span>
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    {loading ? '...' : (consultationStats?.agreedCount || 0).toLocaleString()}
                  </div>
                </Card>

                <Card className="p-3 border-l-4 border-l-red-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-medium text-gray-600">미동의금액</span>
                  </div>
                  <div className="text-xl font-bold text-red-600">
                    {loading ? '...' : (consultationStats?.nonAgreedAmount || 0).toLocaleString()}원
                    {!loading && consultationStats && consultationStats.nonAgreedCount > 0 ? (
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        ({consultationStats.nonAgreedCount}건)
                      </span>
                    ) : null}
                  </div>
                </Card>
              </div>

              {/* 15개월 상담 트렌드 차트 */}
              <Card>
                <CardHeader>
                  <CardTitle>최근 15개월 상담 성과 트렌드</CardTitle>
                  <CardDescription>월별 상담건수, 동의율 및 평균상담금액 추이</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={consultationTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          tickLine={{ stroke: '#d1d5db' }}
                        />
                        {/* 왼쪽 Y축 - 상담건수 */}
                        <YAxis 
                          yAxisId="count"
                          tick={{ fontSize: 12 }}
                          tickLine={{ stroke: '#d1d5db' }}
                          label={{ value: '상담건수 (건)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                        />
                        {/* 오른쪽 Y축 - 동의율 */}
                        <YAxis 
                          yAxisId="percentage"
                          orientation="right"
                          tick={{ fontSize: 12 }}
                          tickLine={{ stroke: '#d1d5db' }}
                          domain={[0, 100]}
                          label={{ value: '동의율 (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                        />
                        <Tooltip 
                          formatter={(value, name, props) => {
                            const nameStr = String(name);
                            if (nameStr.includes('동의율')) {
                              return [`${value}%`, name];
                            } else if (nameStr.includes('건수')) {
                              return [`${value}건`, name];
                            } else {
                              return [`${Number(value).toLocaleString()}원`, name];
                            }
                          }}
                          labelFormatter={(label) => `${label}`}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                        
                        {/* 상담건수 막대 차트 */}
                        <Bar 
                          yAxisId="count"
                          dataKey="totalConsultations" 
                          fill="#3b82f6" 
                          fillOpacity={0.7}
                          name="월별 상담건수"
                          stroke="#3b82f6"
                          strokeWidth={1}
                        />
                        
                        {/* 동의율 라인 차트 */}
                        <Line 
                          yAxisId="percentage"
                          type="monotone" 
                          dataKey="agreedPercentage" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          name="건수기준 동의율"
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                        />
                        
                        <Line 
                          yAxisId="percentage"
                          type="monotone" 
                          dataKey="agreedAmountPercentage" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          strokeDasharray="8 4"
                          name="금액기준 동의율"
                          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: '#fff' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 의사별 성과 분석 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 의사별 상담 성과 */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Stethoscope className="h-4 w-4" />
                        의사별 상담 성과
                      </CardTitle>
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setDoctorPerformanceType('count')}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            doctorPerformanceType === 'count' 
                              ? 'bg-white text-blue-600 shadow-sm font-medium' 
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          건수
                        </button>
                        <button
                          onClick={() => setDoctorPerformanceType('amount')}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            doctorPerformanceType === 'amount' 
                              ? 'bg-white text-blue-600 shadow-sm font-medium' 
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          금액
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {doctorConsultationStats
                        .sort((a, b) => {
                          // Sort by the selected metric
                          if (doctorPerformanceType === 'count') {
                            return b.agreedConsultations - a.agreedConsultations;
                          } else {
                            return b.agreedAmount - a.agreedAmount;
                          }
                        })
                        .map((doctor, index) => {
                          // Calculate amount-based agreement percentage
                          const amountAgreedPercentage = doctor.totalAmount > 0 
                            ? Math.round((doctor.agreedAmount / doctor.totalAmount) * 100) 
                            : 0;
                          
                          const displayPercentage = doctorPerformanceType === 'count' 
                            ? doctor.agreedPercentage 
                            : amountAgreedPercentage;
                          
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
                              
                              {doctorPerformanceType === 'count' ? (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600">총 상담</span>
                                      <span className="font-bold text-blue-600 text-sm">
                                        {doctor.totalConsultations}건
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600">동의</span>
                                      <div className="flex items-center gap-1">
                                        <span className="font-semibold text-green-600 text-sm">
                                          {doctor.agreedConsultations}건
                                        </span>
                                        <Badge 
                                          variant="secondary" 
                                          className="text-xs px-1 py-0 h-4 bg-green-100 text-green-700"
                                        >
                                          {doctor.agreedPercentage}%
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600">평균 금액</span>
                                      <span className="font-bold text-purple-600 text-sm">
                                        {doctor.totalConsultations > 0 ? 
                                          (doctor.totalAmount / doctor.totalConsultations / 10000).toFixed(0) : 0}만원
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600">미동의</span>
                                      <span className="font-semibold text-red-600 text-sm">
                                        {doctor.nonAgreedConsultations}건
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600">총 금액</span>
                                      <span className="font-bold text-blue-600 text-sm">
                                        {(doctor.totalAmount / 10000).toFixed(0)}만원
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600">동의금액</span>
                                      <div className="flex items-center gap-1">
                                        <span className="font-semibold text-green-600 text-sm">
                                          {(doctor.agreedAmount / 10000).toFixed(0)}만원
                                        </span>
                                        <Badge 
                                          variant="secondary" 
                                          className="text-xs px-1 py-0 h-4 bg-green-100 text-green-700"
                                        >
                                          {amountAgreedPercentage}%
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600">평균 상담금액</span>
                                      <span className="font-bold text-purple-600 text-sm">
                                        {doctor.totalConsultations > 0 ? 
                                          (doctor.totalAmount / doctor.totalConsultations / 10000).toFixed(0) : 0}만원
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-600">미동의금액</span>
                                      <span className="font-semibold text-red-600 text-sm">
                                        {((doctor.totalAmount - doctor.agreedAmount) / 10000).toFixed(0)}만원
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* 동의율 진행바 */}
                              <div className="mt-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span>동의율 ({doctorPerformanceType === 'count' ? '건수' : '금액'})</span>
                                  <span className="font-semibold">{displayPercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                      displayPercentage >= 90 ? 'bg-green-500' :
                                      displayPercentage >= 80 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${displayPercentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    
                    {doctorConsultationStats.length === 0 && !loading && (
                      <div className="text-center py-6 text-gray-500">
                        <Stethoscope className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">해당 월에 상담 데이터가 없습니다.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 의사별 15개월 동의율 트렌드 */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <TrendingUp className="h-4 w-4" />
                          의사별 동의율 트렌드
                        </CardTitle>
                        <CardDescription>15개월간 의사별 동의율 변화 추이</CardDescription>
                      </div>
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setDoctorAgreementType('count')}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            doctorAgreementType === 'count' 
                              ? 'bg-white text-blue-600 shadow-sm font-medium' 
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          건수
                        </button>
                        <button
                          onClick={() => setDoctorAgreementType('amount')}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${
                            doctorAgreementType === 'amount' 
                              ? 'bg-white text-blue-600 shadow-sm font-medium' 
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                        >
                          금액
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={consultationTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: '#d1d5db' }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: '#d1d5db' }}
                            domain={[60, 100]}
                            label={{ value: '동의율 (%)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            formatter={(value, name) => [`${value}%`, name]}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend />
                          
                          {/* 전체 평균 기준선 */}
                          <Line 
                            type="monotone" 
                            dataKey={doctorAgreementType === 'count' ? "agreedPercentage" : "agreedAmountPercentage"} 
                            stroke="#94a3b8" 
                            strokeWidth={2}
                            strokeDasharray="10 5"
                            name={`전체 평균 (${doctorAgreementType === 'count' ? '건수' : '금액'})`}
                            dot={{ fill: '#94a3b8', strokeWidth: 1, r: 3 }}
                          />
                          
                          {/* 의사별 동의율 */}
                          {consultationDoctorNames.map((doctor, index) => {
                            const colors = ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
                            const color = colors[index % colors.length];
                            const dataKey = doctorAgreementType === 'count' ? `${doctor}_동의율` : `${doctor}_금액동의율`;
                            
                            return (
                              <Line
                                key={`${doctor}_agreed_${doctorAgreementType}`}
                                type="monotone"
                                dataKey={dataKey}
                                stroke={color}
                                strokeWidth={3}
                                name={`${doctor} 동의율 (${doctorAgreementType === 'count' ? '건수' : '금액'})`}
                                dot={{ fill: color, strokeWidth: 2, r: 5 }}
                                activeDot={{ r: 7, stroke: color, strokeWidth: 2, fill: '#fff' }}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 직원별 동의율 트렌드 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-4 w-4" />
                        직원별 동의율 트렌드
                      </CardTitle>
                      <CardDescription>15개월간 모든 직원별 동의율 변화 추이</CardDescription>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setStaffAgreementType('count')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          staffAgreementType === 'count' 
                            ? 'bg-white text-blue-600 shadow-sm font-medium' 
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        건수
                      </button>
                      <button
                        onClick={() => setStaffAgreementType('amount')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${
                          staffAgreementType === 'amount' 
                            ? 'bg-white text-blue-600 shadow-sm font-medium' 
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        금액
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={consultationTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          tickLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickLine={{ stroke: '#d1d5db' }}
                          domain={[60, 100]}
                          label={{ value: '동의율 (%)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value, name) => [`${value}%`, name]}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend 
                          onClick={handleStaffLegendClick}
                          wrapperStyle={{ cursor: 'pointer' }}
                        />
                        
                        {/* 전체 평균 기준선 */}
                        <Line 
                          type="monotone" 
                          dataKey={staffAgreementType === 'count' ? "agreedPercentage" : "agreedAmountPercentage"} 
                          stroke="#94a3b8" 
                          strokeWidth={2}
                          strokeDasharray="10 5"
                          name={`전체 평균 (${staffAgreementType === 'count' ? '건수' : '금액'})`}
                          dot={{ fill: '#94a3b8', strokeWidth: 1, r: 3 }}
                        />
                        
                        {/* 직원별 동의율 */}
                        {allStaffs.map((staff, index) => {
                          const colors = ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#3b82f6', '#ec4899', '#6366f1'];
                          const color = colors[index % colors.length];
                          const dataKey = staffAgreementType === 'count' ? `${staff}_동의율` : `${staff}_금액동의율`;
                          const isHighlighted = highlightedStaff === null || highlightedStaff === staff;
                          const opacity = highlightedStaff === null ? 1 : (isHighlighted ? 1 : 0.15);
                          
                          return (
                            <Line
                              key={`${staff}_agreed_${staffAgreementType}`}
                              type="monotone"
                              dataKey={dataKey}
                              stroke={color}
                              strokeWidth={3}
                              strokeOpacity={opacity}
                              name={`${staff} 동의율 (${staffAgreementType === 'count' ? '건수' : '금액'})`}
                              dot={{ fill: color, strokeWidth: 2, r: 5, fillOpacity: opacity }}
                              activeDot={{ r: 7, stroke: color, strokeWidth: 2, fill: '#fff', fillOpacity: opacity }}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 상담 인사이트 분석 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    상담 성과 인사이트
                  </CardTitle>
                  <CardDescription>상담 동의율 개선을 위한 분석 데이터</CardDescription>
                </CardHeader>
                <CardContent>
                  {consultationStats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 동의율 개선 효과 */}
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-green-600" />
                          <h4 className="font-semibold text-green-800">개선 효과</h4>
                        </div>
                        <p className="text-sm text-green-700 mb-2">
                          동의율 1% 개선시 예상 매출 증가
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          +{consultationStats.totalConsultationCount > 0 && consultationStats.totalConsultationAmount > 0 ? 
                            Math.round((consultationStats.totalConsultationAmount / consultationStats.totalConsultationCount) * (consultationStats.totalConsultationCount / 100) / 10000) : 0}만원
                        </p>
                      </div>
                      
                      {/* 미동의 상담 재상담 기회 */}
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-orange-600" />
                          <h4 className="font-semibold text-orange-800">재상담 기회</h4>
                        </div>
                        <p className="text-sm text-orange-700 mb-2">
                          미동의 {consultationStats.nonAgreedCount}건 재상담 시
                        </p>
                        <p className="text-lg font-bold text-orange-600">
                          최대 +{consultationStats.consultationNonAgreedAmount ? (consultationStats.consultationNonAgreedAmount / 10000).toFixed(0) : 0}만원
                        </p>
                      </div>
                      
                      {/* 평균 상담 단가 */}
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold text-blue-800">평균 단가</h4>
                        </div>
                        <p className="text-sm text-blue-700 mb-2">
                          건당 평균 상담금액
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          {consultationStats.totalConsultationCount > 0 && consultationStats.totalConsultationAmount > 0 ? 
                            Math.round((consultationStats.totalConsultationAmount / consultationStats.totalConsultationCount) / 10000) : 0}만원
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
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