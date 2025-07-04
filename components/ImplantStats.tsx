'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, User, Package } from 'lucide-react';
import { toISODateString } from '@/lib/utils';

interface DayData {
  date: string;
  implants: { [manufacturer: string]: number };
  fixtures: { [type: string]: number };
  totalImplants: number;
  patients: Array<{
    chartNumber: string;
    patientName: string;
    doctor: string;
    implants: Array<{ manufacturer: string; specification: string; quantity: number }>;
    fixtures: Array<{ type: string; specification: string; quantity: number }>;
  }>;
}

interface ImplantStatsData {
  data: DayData[];
  accumulatedTotal: number;
}

interface CompareData {
  key: string;
  data: ImplantStatsData;
  label: string;
}

const ImplantStats = () => {
  const [currentPeriod, setCurrentPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentDoctor, setCurrentDoctor] = useState('all');
  const [compareYears, setCompareYears] = useState<Set<string>>(new Set());
  const [doctors, setDoctors] = useState<string[]>([]);
  const [mainData, setMainData] = useState<ImplantStatsData | null>(null);
  const [compareData, setCompareData] = useState<CompareData[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(false);

  // 의사 목록 로드
  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          const doctorList = Array.isArray(data.doctor) 
            ? data.doctor.map((d: any) => d.value) 
            : [];
          setDoctors(doctorList);
        }
      } catch (error) {
        console.error('의사 목록 로드 실패:', error);
      }
    };
    loadDoctors();
  }, []);

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, [selectedDate, currentPeriod, currentDoctor, compareYears]);

  const getDateRange = () => {
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);

    switch(currentPeriod) {
      case 'monthly':
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        break;
      case 'yearly':
        startDate.setMonth(0, 1);
        endDate.setMonth(11, 31);
        break;
    }

    return {
      startDate: toISODateString(startDate),
      endDate: toISODateString(endDate)
    };
  };

  const getCompareRange = (key: string) => {
    const startDate = new Date(selectedDate);
    const endDate = new Date(selectedDate);

    if (key.startsWith('m')) {
      // 월 단위 비교
      const months = parseInt(key.substring(1));
      startDate.setMonth(startDate.getMonth() - months, 1);
      endDate.setMonth(endDate.getMonth() - months + 1, 0);
    } else {
      // 연 단위 비교
      const years = parseInt(key.substring(1));
      startDate.setFullYear(startDate.getFullYear() - years);
      endDate.setFullYear(endDate.getFullYear() - years);

      if (currentPeriod === 'monthly') {
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1, 0);
      } else {
        startDate.setMonth(0, 1);
        endDate.setMonth(11, 31);
      }
    }

    return {
      startDate: toISODateString(startDate),
      endDate: toISODateString(endDate)
    };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        doctor: currentDoctor
      });

      const response = await fetch(`/api/implant-stats?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMainData(data);

        // 비교 데이터 로드
        if (compareYears.size > 0) {
          const compareResults = await Promise.all(
            Array.from(compareYears).map(async (key) => {
              const compareRange = getCompareRange(key);
              const compareParams = new URLSearchParams({
                startDate: compareRange.startDate,
                endDate: compareRange.endDate,
                doctor: currentDoctor
              });
              
              const compareResponse = await fetch(`/api/implant-stats?${compareParams}`);
              if (compareResponse.ok) {
                const compareData = await compareResponse.json();
                return {
                  key,
                  data: compareData,
                  label: getCompareLabel(key)
                };
              }
              return null;
            })
          );
          
          setCompareData(compareResults.filter(Boolean) as CompareData[]);
        } else {
          setCompareData([]);
        }
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
    setLoading(false);
  };

  const getCompareLabel = (key: string) => {
    const compareDate = new Date(selectedDate);
    if (key.startsWith('m')) {
      const months = parseInt(key.substring(1));
      compareDate.setMonth(compareDate.getMonth() - months);
      return `${compareDate.getFullYear()}년 ${compareDate.getMonth() + 1}월`;
    } else {
      const years = parseInt(key.substring(1));
      compareDate.setFullYear(compareDate.getFullYear() - years);
      if (currentPeriod === 'monthly') {
        return `${compareDate.getFullYear()}년 ${compareDate.getMonth() + 1}월`;
      } else {
        return `${compareDate.getFullYear()}년`;
      }
    }
  };

  const handlePeriodChange = (period: 'monthly' | 'yearly') => {
    setCurrentPeriod(period);
    setCompareYears(new Set()); // 비교 기간 초기화
  };

  const handleDateChange = (value: string) => {
    if (currentPeriod === 'monthly') {
      const [year, month] = value.split('-').map(Number);
      setSelectedDate(new Date(year, month - 1, 1));
    } else {
      setSelectedDate(new Date(parseInt(value), 0, 1));
    }
  };

  const handleCompareToggle = (key: string) => {
    const newCompareYears = new Set(compareYears);
    if (newCompareYears.has(key)) {
      newCompareYears.delete(key);
    } else {
      newCompareYears.add(key);
    }
    setCompareYears(newCompareYears);
  };

  const navigateCalendar = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (currentPeriod === 'monthly') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const calculateStats = (data: DayData[]) => {
    const stats = {
      totalImplants: 0,
      implantsByManufacturer: {} as { [key: string]: number },
      totalFixtures: 0,
      fixturesByType: {} as { [key: string]: number }
    };

    data.forEach(day => {
      // 임플란트 통계
      Object.entries(day.implants).forEach(([manufacturer, count]) => {
        stats.implantsByManufacturer[manufacturer] = (stats.implantsByManufacturer[manufacturer] || 0) + count;
        stats.totalImplants += count;
      });

      // 이식재 통계
      Object.entries(day.fixtures).forEach(([type, count]) => {
        stats.fixturesByType[type] = (stats.fixturesByType[type] || 0) + count;
        stats.totalFixtures += count;
      });
    });

    return stats;
  };

  const generateCompareButtons = () => {
    if (currentPeriod === 'monthly') {
      return [
        { key: 'm1', label: '전월' },
        { key: 'y1', label: '전년 동월' },
        { key: 'y2', label: '2년전 동월' },
        { key: 'y3', label: '3년전 동월' }
      ];
    } else {
      return [
        { key: 'y1', label: '작년' },
        { key: 'y2', label: '2년전' },
        { key: 'y3', label: '3년전' }
      ];
    }
  };

  const handleDayClick = (dayData: DayData) => {
    setSelectedDayData(dayData);
    setShowDetailModal(true);
  };

  const renderStatsSummary = () => {
    if (!mainData || compareData.length > 0) return null;

    const stats = calculateStats(mainData.data);
    
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateCalendar('prev')}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">이전</span>
          </Button>
          <h3 className="text-lg font-semibold">
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateCalendar('next')}
            className="h-8 w-8 p-0"
            disabled={new Date() <= selectedDate}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">다음</span>
          </Button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-blue-900">임플란트 통계</h4>
              <span className="text-sm text-blue-600">누적총계: {mainData.accumulatedTotal}개</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">총계</span>
                <span className="font-bold">{stats.totalImplants}개</span>
              </div>
              {Object.entries(stats.implantsByManufacturer).map(([manufacturer, count]) => (
                <div key={manufacturer} className="flex justify-between items-center text-sm">
                  <span>{manufacturer}</span>
                  <span>{count}개</span>
                </div>
              ))}
            </div>
          </div>

          {stats.totalFixtures > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-3">이식재 통계</h4>
              <div className="space-y-2">
                {Object.entries(stats.fixturesByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center text-sm">
                    <span>{type}</span>
                    <span>{count}개</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDailyCalendar = () => {
    if (!mainData) return null;

    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days = [];

    // 이전 달 날짜
    const prevMonthLastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0).getDate();
    for (let i = 0; i < startPadding; i++) {
      days.push({
        day: prevMonthLastDay - startPadding + i + 1,
        isOtherMonth: true,
        data: null
      });
    }

    // 현재 달 날짜
    for (let day = 1; day <= totalDays; day++) {
      const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const formattedDate = toISODateString(currentDate);
      const dayData = mainData.data.find(d => d.date === formattedDate);
      days.push({
        day,
        isOtherMonth: false,
        data: dayData
      });
    }

    // 다음 달 날짜
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        isOtherMonth: true,
        data: null
      });
    }

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map(weekday => (
            <div key={weekday} className="text-center py-2 font-medium text-gray-600 text-sm">
              {weekday}
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((dayInfo, index) => (
            <div
              key={index}
              className={`
                min-h-[80px] border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 text-xs
                ${dayInfo.isOtherMonth ? 'text-gray-300 bg-gray-50' : ''}
                ${dayInfo.data ? 'bg-blue-50 border-blue-200' : ''}
              `}
              onClick={() => dayInfo.data && handleDayClick(dayInfo.data)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-medium">{dayInfo.day}</span>
                {dayInfo.data && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                    {dayInfo.data.totalImplants}개
                  </Badge>
                )}
              </div>
              
              {dayInfo.data && (
                <div className="space-y-1">
                  <div className="text-xs text-blue-700 font-medium">Fixture</div>
                  {Object.entries(dayInfo.data.implants).map(([manufacturer, count]) => (
                    <div key={manufacturer} className="flex justify-between text-xs">
                      <span className="truncate">{manufacturer}</span>
                      <span>{count}개</span>
                    </div>
                  ))}
                  {Object.keys(dayInfo.data.fixtures).length > 0 && (
                    <>
                      <div className="text-xs text-green-700 font-medium">이식재</div>
                      {Object.entries(dayInfo.data.fixtures).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-xs text-green-600">
                          <span className="truncate">{type}</span>
                          <span>{count}개</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 필터 섹션 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* 조회기간 선택 */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 whitespace-nowrap">조회기간</span>
              <Select value={currentPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">월간</SelectItem>
                  <SelectItem value="yearly">연간</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 기준기간 선택 */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 whitespace-nowrap">기준기간</span>
              {currentPeriod === 'monthly' ? (
                <Input
                  type="month"
                  value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-36"
                />
              ) : (
                <Input
                  type="number"
                  value={selectedDate.getFullYear()}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min="2000"
                  max={new Date().getFullYear()}
                  className="w-20"
                />
              )}
            </div>

            {/* 비교기간 선택 */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 whitespace-nowrap">비교기간</span>
              <div className="flex gap-1">
                {generateCompareButtons().map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={compareYears.has(key) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCompareToggle(key)}
                    className="h-8 px-3"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 의사 선택 */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 whitespace-nowrap">의사</span>
              <Select value={currentDoctor} onValueChange={setCurrentDoctor}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 의사</SelectItem>
                  {doctors.map(doctor => (
                    <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 로딩 상태 */}
      {loading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">데이터를 불러오는 중...</p>
          </CardContent>
        </Card>
      )}

      {/* 메인 컨텐츠 */}
      {!loading && mainData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 통계 요약 */}
          <div className="lg:col-span-1">
            {renderStatsSummary()}
          </div>

          {/* 오른쪽: 달력 */}
          <div className="lg:col-span-2">
            {renderDailyCalendar()}
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDayData?.date} 상세 정보
            </DialogTitle>
          </DialogHeader>
          
          {selectedDayData && (
            <div className="space-y-4">
              {/* 통계 요약 */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600 mb-1">Fixture</div>
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {selectedDayData.totalImplants}개
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {Object.entries(selectedDayData.implants).map(([manufacturer, count]) => (
                        <div key={manufacturer} className="flex justify-between">
                          <span>{manufacturer}</span>
                          <span>{count}개</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-600 mb-1">이식재</div>
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {Object.values(selectedDayData.fixtures).reduce((sum, count) => sum + count, 0)}개
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {Object.entries(selectedDayData.fixtures).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span>{type}</span>
                          <span>{count}개</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 환자별 상세 정보 */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  환자별 사용 내역 ({selectedDayData.patients.length}명)
                </h4>
                <div className="space-y-3">
                  {selectedDayData.patients.map((patient, index) => (
                    <Card key={index}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium">{patient.patientName}</div>
                            <div className="text-sm text-gray-600">
                              차트번호: {patient.chartNumber} | 의사: {patient.doctor}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {patient.implants.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-blue-600 mb-1 flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                Fixture
                              </h5>
                              {patient.implants.map((implant, idx) => (
                                <div key={idx} className="text-xs bg-blue-50 p-2 rounded">
                                  {implant.manufacturer} {implant.specification} × {implant.quantity}개
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {patient.fixtures.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-green-600 mb-1 flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                이식재
                              </h5>
                              {patient.fixtures.map((fixture, idx) => (
                                <div key={idx} className="text-xs bg-green-50 p-2 rounded">
                                  {fixture.type} {fixture.specification} × {fixture.quantity}개
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImplantStats;