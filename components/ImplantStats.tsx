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
    setCompareYears(new Set()); // 비교 기간 초기화 (reference와 동일)
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
            {currentPeriod === 'monthly' 
              ? `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`
              : `${selectedDate.getFullYear()}년`
            }
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateCalendar('next')}
            className="h-8 w-8 p-0"
            disabled={
              currentPeriod === 'monthly' 
                ? new Date().getFullYear() * 12 + new Date().getMonth() <= selectedDate.getFullYear() * 12 + selectedDate.getMonth()
                : selectedDate.getFullYear() >= new Date().getFullYear()
            }
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

  const renderComparisonTable = () => {
    if (compareData.length === 0 || !mainData) return null;

    // 비교 데이터 정렬 (참조 코드와 동일)
    const sortedCompareData = [...compareData].sort((a, b) => {
      const getMonthsAgo = (key: string) => {
        if (key.startsWith('m')) {
          return parseInt(key.substring(1));
        } else {
          return parseInt(key.substring(1)) * 12;
        }
      };
      return getMonthsAgo(a.key) - getMonthsAgo(b.key);
    });

    // 헤더 생성
    const headers = ['항목'];
    
    // 기준 기간 헤더
    if (currentPeriod === 'monthly') {
      headers.push(`${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`);
    } else {
      headers.push(`${selectedDate.getFullYear()}년`);
    }

    // 비교 기간 헤더
    sortedCompareData.forEach(({ key }) => {
      const compareDate = new Date(selectedDate);
      if (key.startsWith('m')) {
        const months = parseInt(key.substring(1));
        compareDate.setMonth(compareDate.getMonth() - months);
        headers.push(`${compareDate.getFullYear()}년 ${compareDate.getMonth() + 1}월`);
      } else {
        const years = parseInt(key.substring(1));
        compareDate.setFullYear(compareDate.getFullYear() - years);
        if (currentPeriod === 'monthly') {
          headers.push(`${compareDate.getFullYear()}년 ${compareDate.getMonth() + 1}월`);
        } else {
          headers.push(`${compareDate.getFullYear()}년`);
        }
      }
    });

    // 모든 데이터셋 생성
    const allDataSets = [mainData, ...sortedCompareData.map(c => c.data)];
    
    // 모든 제조사와 이식재 타입 수집
    const allManufacturers = new Set<string>();
    const allFixtureTypes = new Set<string>();
    
    allDataSets.forEach(dataSet => {
      dataSet.data.forEach(day => {
        Object.keys(day.implants).forEach(m => allManufacturers.add(m));
        Object.keys(day.fixtures).forEach(t => allFixtureTypes.add(t));
      });
    });

    const manufacturers = Array.from(allManufacturers).sort();
    const fixtureTypes = Array.from(allFixtureTypes).sort();

    // 각 데이터셋의 통계 계산
    const stats = allDataSets.map(dataSet => calculateStats(dataSet.data));

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">기간별 비교 통계</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                {headers.map((header, index) => (
                  <th key={index} className="text-left p-3 font-semibold bg-gray-50">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 임플란트 섹션 */}
              <tr className="bg-blue-50">
                <td colSpan={headers.length} className="p-3 font-semibold text-blue-900">
                  임플란트
                </td>
              </tr>
              <tr className="border-b font-medium">
                <td className="p-3">합계</td>
                {stats.map((stat, index) => (
                  <td key={index} className="p-3">
                    {stat.totalImplants > 0 ? `${stat.totalImplants}개` : '-'}
                  </td>
                ))}
              </tr>
              {manufacturers.map(manufacturer => (
                <tr key={manufacturer} className="border-b text-sm">
                  <td className="p-3 pl-6">{manufacturer}</td>
                  {stats.map((stat, index) => (
                    <td key={index} className="p-3">
                      {stat.implantsByManufacturer[manufacturer] || 0 > 0 
                        ? `${stat.implantsByManufacturer[manufacturer] || 0}개` 
                        : '-'
                      }
                    </td>
                  ))}
                </tr>
              ))}

              {/* 이식재 섹션 */}
              {fixtureTypes.length > 0 && (
                <>
                  <tr className="bg-green-50">
                    <td colSpan={headers.length} className="p-3 font-semibold text-green-900">
                      이식재
                    </td>
                  </tr>
                  <tr className="border-b font-medium">
                    <td className="p-3">합계</td>
                    {stats.map((stat, index) => (
                      <td key={index} className="p-3">
                        {stat.totalFixtures > 0 ? `${stat.totalFixtures}개` : '-'}
                      </td>
                    ))}
                  </tr>
                  {fixtureTypes.map(type => (
                    <tr key={type} className="border-b text-sm">
                      <td className="p-3 pl-6">{type}</td>
                      {stats.map((stat, index) => (
                        <td key={index} className="p-3">
                          {stat.fixturesByType[type] || 0 > 0 
                            ? `${stat.fixturesByType[type] || 0}개` 
                            : '-'
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDailyCalendar = () => {
    if (!mainData || currentPeriod !== 'monthly') return null;

    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const today = new Date();

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
      const isToday = today.getDate() === day && 
                     today.getMonth() === selectedDate.getMonth() && 
                     today.getFullYear() === selectedDate.getFullYear();
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      days.push({
        day,
        isOtherMonth: false,
        data: dayData,
        isToday,
        isWeekend
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
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-400 to-blue-500 px-6 py-4">
          <h3 className="text-white font-semibold text-lg">
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 캘린더
          </h3>
        </div>

        <div className="p-6">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekdays.map((weekday, index) => (
              <div 
                key={weekday} 
                className={`text-center py-3 font-semibold text-sm rounded-lg ${
                  index === 0 ? 'text-red-600 bg-red-50' : 
                  index === 6 ? 'text-blue-600 bg-blue-50' : 
                  'text-gray-700 bg-gray-50'
                }`}
              >
                {weekday}
              </div>
            ))}
          </div>

          {/* 달력 그리드 */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((dayInfo, index) => {
              const hasData = dayInfo.data && dayInfo.data.totalImplants > 0;
              
              return (
                <div
                  key={index}
                  className={`
                    relative min-h-[100px] rounded-xl border-2 transition-all duration-200 ease-in-out
                    ${dayInfo.isOtherMonth 
                      ? 'text-gray-300 bg-gray-50/50 border-gray-100 cursor-default' 
                      : hasData 
                        ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-150 cursor-pointer transform hover:scale-[1.02] hover:shadow-md' 
                        : dayInfo.isToday
                          ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300 hover:border-amber-400'
                          : dayInfo.isWeekend
                            ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                    ${hasData ? 'shadow-sm' : ''}
                  `}
                  onClick={() => dayInfo.data && handleDayClick(dayInfo.data)}
                >
                  {/* 날짜 헤더 */}
                  <div className="flex justify-between items-center p-3 pb-2">
                    <span className={`font-semibold ${
                      dayInfo.isToday 
                        ? 'text-amber-700 bg-amber-200 px-2 py-1 rounded-full text-xs' 
                        : dayInfo.isOtherMonth 
                          ? 'text-gray-300' 
                          : dayInfo.isWeekend 
                            ? 'text-gray-600' 
                            : 'text-gray-800'
                    }`}>
                      {dayInfo.day}
                    </span>
                    {hasData && (
                      <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                        {dayInfo.data.totalImplants}
                      </div>
                    )}
                  </div>
                  
                  {/* 데이터 내용 */}
                  {hasData && (
                    <div className="px-3 pb-3 space-y-2">
                      {/* 임플란트 데이터 */}
                      {Object.keys(dayInfo.data.implants).length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs font-medium text-blue-700">Fixture</span>
                          </div>
                          {Object.entries(dayInfo.data.implants).slice(0, 2).map(([manufacturer, count]) => (
                            <div key={manufacturer} className="flex justify-between text-xs bg-white/70 rounded px-2 py-1">
                              <span className="truncate font-medium text-gray-700">{manufacturer}</span>
                              <span className="text-blue-600 font-semibold">{count}</span>
                            </div>
                          ))}
                          {Object.keys(dayInfo.data.implants).length > 2 && (
                            <div className="text-xs text-blue-600 font-medium text-center">
                              +{Object.keys(dayInfo.data.implants).length - 2}개 더
                            </div>
                          )}
                        </div>
                      )}

                      {/* 이식재 데이터 */}
                      {Object.keys(dayInfo.data.fixtures).length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs font-medium text-green-700">이식재</span>
                          </div>
                          {Object.entries(dayInfo.data.fixtures).slice(0, 1).map(([type, count]) => (
                            <div key={type} className="flex justify-between text-xs bg-white/70 rounded px-2 py-1">
                              <span className="truncate font-medium text-gray-700">{type}</span>
                              <span className="text-green-600 font-semibold">{count}</span>
                            </div>
                          ))}
                          {Object.keys(dayInfo.data.fixtures).length > 1 && (
                            <div className="text-xs text-green-600 font-medium text-center">
                              +{Object.keys(dayInfo.data.fixtures).length - 1}개 더
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 오늘 표시자 */}
                  {dayInfo.isToday && !dayInfo.isOtherMonth && (
                    <div className="absolute top-1 right-1">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthlyCalendar = () => {
    if (!mainData || currentPeriod !== 'yearly') return null;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const months = Array.from({length: 12}, (_, i) => {
      const monthData = mainData.data.filter(d => {
        const dataDate = new Date(d.date);
        return dataDate.getMonth() === i && dataDate.getFullYear() === selectedDate.getFullYear();
      });

      // 월별 통계 계산
      const stats = {
        totalImplants: 0,
        implants: {} as { [key: string]: number },
        fixtures: {} as { [key: string]: number }
      };

      monthData.forEach(day => {
        // 임플란트 통계
        Object.entries(day.implants).forEach(([manufacturer, count]) => {
          stats.implants[manufacturer] = (stats.implants[manufacturer] || 0) + count;
          stats.totalImplants += count;
        });

        // 이식재 통계
        Object.entries(day.fixtures).forEach(([type, count]) => {
          stats.fixtures[type] = (stats.fixtures[type] || 0) + count;
        });
      });

      return {
        month: i,
        data: monthData,
        stats
      };
    });

    const today = new Date();

    return (
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-400 to-indigo-500 px-6 py-4">
          <h3 className="text-white font-semibold text-lg">
            {selectedDate.getFullYear()}년 연간 개요
          </h3>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {months.map(({ month, data, stats }) => {
              const isCurrentMonth = month === today.getMonth() && selectedDate.getFullYear() === today.getFullYear();
              const hasData = stats.totalImplants > 0;
              const maxImplants = Math.max(...months.map(m => m.stats.totalImplants));
              const intensity = hasData ? (stats.totalImplants / maxImplants) : 0;
              
              return (
                <div
                  key={month}
                  className={`
                    relative overflow-hidden rounded-xl border-2 transition-all duration-300 ease-in-out cursor-pointer group
                    ${hasData 
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-300 hover:from-blue-100 hover:to-indigo-200 hover:border-blue-400 transform hover:scale-105 shadow-lg hover:shadow-xl' 
                      : isCurrentMonth
                        ? 'bg-gradient-to-br from-amber-50 to-orange-100 border-amber-300 hover:border-amber-400'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                  onClick={() => {
                    if (data.length > 0) {
                      // 월별 데이터를 하나의 DayData로 합침
                      const monthSummary: DayData = {
                        date: `${selectedDate.getFullYear()}-${String(month + 1).padStart(2, '0')}`,
                        implants: stats.implants,
                        fixtures: stats.fixtures,
                        totalImplants: stats.totalImplants,
                        patients: data.flatMap(d => d.patients)
                      };
                      handleDayClick(monthSummary);
                    }
                  }}
                >
                  {/* 강도 표시 바 */}
                  {hasData && (
                    <div 
                      className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                      style={{ width: `${intensity * 100}%` }}
                    />
                  )}

                  <div className="p-4">
                    {/* 월 헤더 */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className={`font-bold text-lg ${
                          hasData ? 'text-blue-800' : 
                          isCurrentMonth ? 'text-amber-700' : 'text-gray-700'
                        }`}>
                          {month + 1}월
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {monthNames[month]}
                        </div>
                      </div>
                      {hasData && (
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                          {stats.totalImplants}
                        </div>
                      )}
                    </div>

                    {/* 통계 데이터 */}
                    {hasData ? (
                      <div className="space-y-3">
                        {/* 임플란트 데이터 */}
                        {Object.keys(stats.implants).length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
                              <span className="text-xs font-semibold text-blue-700">Fixture</span>
                            </div>
                            <div className="space-y-1">
                              {Object.entries(stats.implants).slice(0, 3).map(([manufacturer, count]) => (
                                <div key={manufacturer} className="flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
                                  <span className="text-xs font-medium text-gray-700 truncate">{manufacturer}</span>
                                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                    {count}
                                  </span>
                                </div>
                              ))}
                              {Object.keys(stats.implants).length > 3 && (
                                <div className="text-xs text-blue-600 font-semibold text-center py-1">
                                  +{Object.keys(stats.implants).length - 3}개 제조사 더
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 이식재 데이터 */}
                        {Object.keys(stats.fixtures).length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                              <span className="text-xs font-semibold text-green-700">이식재</span>
                            </div>
                            <div className="space-y-1">
                              {Object.entries(stats.fixtures).slice(0, 2).map(([type, count]) => (
                                <div key={type} className="flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
                                  <span className="text-xs font-medium text-gray-700 truncate">{type}</span>
                                  <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                    {count}
                                  </span>
                                </div>
                              ))}
                              {Object.keys(stats.fixtures).length > 2 && (
                                <div className="text-xs text-green-600 font-semibold text-center py-1">
                                  +{Object.keys(stats.fixtures).length - 2}개 더
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="text-gray-400 text-xs">데이터 없음</div>
                      </div>
                    )}

                    {/* 현재 월 표시 */}
                    {isCurrentMonth && !hasData && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-sm"></div>
                      </div>
                    )}
                  </div>

                  {/* 호버 효과 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              );
            })}
          </div>
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
        <>
          {compareData.length > 0 ? (
            // 비교 테이블 렌더링
            renderComparisonTable()
          ) : (
            // 기본 달력 뷰
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* 왼쪽: 통계 요약 */}
              <div className="lg:col-span-1">
                {renderStatsSummary()}
              </div>

              {/* 오른쪽: 달력 */}
              <div className="lg:col-span-3">
                {currentPeriod === 'monthly' ? renderDailyCalendar() : renderMonthlyCalendar()}
              </div>
            </div>
          )}
        </>
      )}

      {/* 상세 모달 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDayData?.date.includes('-') && selectedDayData.date.length <= 7 
                ? `${selectedDayData.date.split('-')[0]}년 ${parseInt(selectedDayData.date.split('-')[1])}월 통계`
                : selectedDayData?.date.length === 10 
                  ? `${new Date(selectedDayData.date).getFullYear()}년 ${new Date(selectedDayData.date).getMonth() + 1}월 ${new Date(selectedDayData.date).getDate()}일`
                  : selectedDayData?.date
              } 상세 정보
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