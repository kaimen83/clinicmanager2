'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          const doctorList = data.doctors || [];
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

  const getAllManufacturers = (dataSets: DayData[][]) => {
    const manufacturers = new Set<string>();
    dataSets.forEach(data => {
      data.forEach(day => {
        Object.keys(day.implants).forEach(manufacturer => manufacturers.add(manufacturer));
      });
    });
    return Array.from(manufacturers);
  };

  const getAllFixtureTypes = (dataSets: DayData[][]) => {
    const types = new Set<string>();
    dataSets.forEach(data => {
      data.forEach(day => {
        Object.keys(day.fixtures).forEach(type => types.add(type));
      });
    });
    return Array.from(types);
  };

  const renderComparisonTable = () => {
    if (!mainData || compareData.length === 0) return null;

    const allDataSets = [mainData.data, ...compareData.map(c => c.data.data)];
    const manufacturers = getAllManufacturers(allDataSets);
    const fixtureTypes = getAllFixtureTypes(allDataSets);
    const stats = [mainData, ...compareData.map(c => c.data)].map(data => calculateStats(data.data));

    // 헤더 생성
    const headers = ['항목'];
    if (currentPeriod === 'monthly') {
      headers.push(`${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`);
    } else {
      headers.push(`${selectedDate.getFullYear()}년`);
    }
    compareData.forEach(({ label }) => headers.push(label));

    return (
      <div className="stats-table-container">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {headers.map((header, index) => (
                <th key={index} className="border border-gray-300 p-2 text-left font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 임플란트 섹션 */}
            <tr className="bg-blue-50">
              <td colSpan={headers.length} className="border border-gray-300 p-2 font-semibold">
                임플란트
              </td>
            </tr>
            <tr className="bg-blue-100">
              <td className="border border-gray-300 p-2 font-medium">합계</td>
              {stats.map((stat, index) => (
                <td key={index} className="border border-gray-300 p-2">
                  {stat.totalImplants > 0 ? `${stat.totalImplants}개` : '-'}
                </td>
              ))}
            </tr>
            {manufacturers.map(manufacturer => (
              <tr key={manufacturer}>
                <td className="border border-gray-300 p-2 pl-4">{manufacturer}</td>
                {stats.map((stat, index) => (
                  <td key={index} className="border border-gray-300 p-2">
                    {(stat.implantsByManufacturer[manufacturer] || 0) > 0 
                      ? `${stat.implantsByManufacturer[manufacturer]}개` 
                      : '-'}
                  </td>
                ))}
              </tr>
            ))}

            {/* 이식재 섹션 */}
            <tr className="bg-green-50">
              <td colSpan={headers.length} className="border border-gray-300 p-2 font-semibold">
                이식재
              </td>
            </tr>
            <tr className="bg-green-100">
              <td className="border border-gray-300 p-2 font-medium">합계</td>
              {stats.map((stat, index) => (
                <td key={index} className="border border-gray-300 p-2">
                  {stat.totalFixtures > 0 ? `${stat.totalFixtures}개` : '-'}
                </td>
              ))}
            </tr>
            {fixtureTypes.map(type => (
              <tr key={type}>
                <td className="border border-gray-300 p-2 pl-4">{type}</td>
                {stats.map((stat, index) => (
                  <td key={index} className="border border-gray-300 p-2">
                    {(stat.fixturesByType[type] || 0) > 0 
                      ? `${stat.fixturesByType[type]}개` 
                      : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCalendar = () => {
    if (!mainData || compareData.length > 0) return null;

    const calendarTitle = currentPeriod === 'monthly' 
      ? `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`
      : `${selectedDate.getFullYear()}년`;

    return (
      <div className="calendar-container">
        <div className="calendar-header flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => navigateCalendar('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">{calendarTitle}</h3>
          <Button variant="outline" size="sm" onClick={() => navigateCalendar('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {currentPeriod === 'monthly' ? renderDailyCalendar() : renderMonthlyCalendar()}
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
      <div>
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map(weekday => (
            <div key={weekday} className="text-center py-2 font-medium text-gray-600">
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
                min-h-[100px] border border-gray-200 p-2 cursor-pointer hover:bg-gray-50
                ${dayInfo.isOtherMonth ? 'text-gray-400 bg-gray-50' : ''}
                ${dayInfo.data ? 'bg-blue-50' : ''}
              `}
              onClick={() => dayInfo.data && handleDayClick(dayInfo.data)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-medium">{dayInfo.day}</span>
                {dayInfo.data && (
                  <Badge variant="secondary" className="text-xs">
                    {dayInfo.data.totalImplants}개
                  </Badge>
                )}
              </div>
              
              {dayInfo.data && (
                <div className="text-xs space-y-1">
                  {Object.entries(dayInfo.data.implants).map(([manufacturer, count]) => (
                    <div key={manufacturer} className="flex justify-between">
                      <span className="truncate">{manufacturer}</span>
                      <span>{count}개</span>
                    </div>
                  ))}
                  {Object.entries(dayInfo.data.fixtures).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-green-600">
                      <span className="truncate">{type}</span>
                      <span>{count}개</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthlyCalendar = () => {
    if (!mainData) return null;

    const months = Array.from({length: 12}, (_, i) => {
      const date = new Date(selectedDate.getFullYear(), i, 1);
      const monthData = mainData.data.filter(d => {
        const dataDate = new Date(d.date);
        return dataDate.getMonth() === i && dataDate.getFullYear() === selectedDate.getFullYear();
      });
      return { date, data: monthData };
    });

    return (
      <div className="grid grid-cols-4 gap-4">
        {months.map(({date, data}, index) => {
          const totalImplants = data.reduce((sum, day) => sum + day.totalImplants, 0);
          const totalFixtures = data.reduce((sum, day) => sum + 
            Object.values(day.fixtures).reduce((s, count) => s + count, 0), 0);

          return (
            <div
              key={index}
              className={`
                border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 rounded-lg
                ${totalImplants > 0 ? 'bg-blue-50' : ''}
              `}
              onClick={() => data.length > 0 && handleMonthClick(date, data)}
            >
              <div className="text-center mb-2">
                <h4 className="font-semibold">{date.getMonth() + 1}월</h4>
                {totalImplants > 0 && (
                  <Badge variant="secondary">{totalImplants}개</Badge>
                )}
              </div>
              
              {totalImplants > 0 && (
                <div className="text-xs space-y-1">
                  <div className="text-blue-600">임플란트: {totalImplants}개</div>
                  {totalFixtures > 0 && (
                    <div className="text-green-600">이식재: {totalFixtures}개</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleDayClick = (dayData: DayData) => {
    setSelectedDayData(dayData);
    setShowDetailModal(true);
  };

  const handleMonthClick = (date: Date, monthData: DayData[]) => {
    // 월 클릭 시 해당 월의 전체 데이터를 표시
    const combinedData: DayData = {
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      implants: {},
      fixtures: {},
      totalImplants: 0,
      patients: []
    };

    monthData.forEach(day => {
      Object.entries(day.implants).forEach(([manufacturer, count]) => {
        combinedData.implants[manufacturer] = (combinedData.implants[manufacturer] || 0) + count;
        combinedData.totalImplants += count;
      });
      Object.entries(day.fixtures).forEach(([type, count]) => {
        combinedData.fixtures[type] = (combinedData.fixtures[type] || 0) + count;
      });
      combinedData.patients.push(...day.patients);
    });

    setSelectedDayData(combinedData);
    setShowDetailModal(true);
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

  return (
    <div className="implant-stats-container space-y-4">
      {/* 필터 섹션 */}
      <Card>
        <CardContent className="p-4">
          <div className="filter-section flex flex-wrap items-center gap-4">
            {/* 조회기간 선택 */}
            <div className="filter-group flex items-center gap-2">
              <span className="filter-label font-medium">조회기간</span>
              <Select value={currentPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">월간</SelectItem>
                  <SelectItem value="yearly">연간</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="filter-divider w-px h-6 bg-gray-300" />

            {/* 기준기간 선택 */}
            <div className="filter-group flex items-center gap-2">
              <span className="filter-label font-medium">기준기간</span>
              {currentPeriod === 'monthly' ? (
                <Input
                  type="month"
                  value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-40"
                />
              ) : (
                <Input
                  type="number"
                  value={selectedDate.getFullYear()}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min="2000"
                  max={new Date().getFullYear()}
                  className="w-24"
                />
              )}
            </div>

            <div className="filter-divider w-px h-6 bg-gray-300" />

            {/* 비교기간 선택 */}
            <div className="filter-group flex items-center gap-2">
              <span className="filter-label font-medium">비교기간</span>
              <div className="compare-buttons flex gap-1">
                {generateCompareButtons().map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={compareYears.has(key) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCompareToggle(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="filter-divider w-px h-6 bg-gray-300" />

            {/* 의사 선택 */}
            <div className="filter-group flex items-center gap-2">
              <span className="filter-label font-medium">의사</span>
              <Select value={currentDoctor} onValueChange={setCurrentDoctor}>
                <SelectTrigger className="w-32">
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
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">데이터를 불러오는 중...</p>
          </CardContent>
        </Card>
      )}

      {/* 비교 테이블 또는 달력 */}
      {!loading && mainData && (
        <Card>
          <CardContent className="p-4">
            {compareData.length > 0 ? renderComparisonTable() : renderCalendar()}
          </CardContent>
        </Card>
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
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">임플란트</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedDayData.totalImplants}개
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {Object.entries(selectedDayData.implants).map(([manufacturer, count]) => (
                        <div key={manufacturer}>{manufacturer}: {count}개</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">이식재</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(selectedDayData.fixtures).reduce((sum, count) => sum + count, 0)}개
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {Object.entries(selectedDayData.fixtures).map(([type, count]) => (
                        <div key={type}>{type}: {count}개</div>
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
                                임플란트
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