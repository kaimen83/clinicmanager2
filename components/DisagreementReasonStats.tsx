'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Calendar } from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface DisagreementReasonStat {
  reason: string;
  count: number;
  totalAmount: number;
  avgAmount: number;
  percentage: number;
  amountPercentage: number;
  doctorCount: number;
}

interface DisagreementStatsResponse {
  type: string;
  date: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalCount: number;
    totalAmount: number;
    reasonCount: number;
  };
  stats: DisagreementReasonStat[];
}

interface TrendData {
  month: string;
  reasons: {
    [key: string]: {
      count: number;
      amount: number;
    };
  };
}

interface TrendResponse {
  dateRange: {
    start: string;
    end: string;
  };
  months: string[];
  monthlyData: TrendData[];
  reasons: string[];
  reasonTotals: Array<{
    reason: string;
    totalCount: number;
    totalAmount: number;
  }>;
}

interface DisagreementReasonStatsProps {
  selectedDate: string;
  onInsightsUpdate?: (insights: DisagreementInsights | null) => void;
}

export interface DisagreementInsights {
  topLossReason: {
    reason: string;
    totalAmount: number;
  };
  increasingReasons: string[];
  reasonCount: number;
}

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f59e0b'
];

export default function DisagreementReasonStats({ selectedDate, onInsightsUpdate }: DisagreementReasonStatsProps) {
  const [currentStats, setCurrentStats] = useState<DisagreementStatsResponse | null>(null);
  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'count' | 'amount'>('amount'); // 통합된 뷰 모드
  const [selectedReason, setSelectedReason] = useState<string | null>(null); // 선택된 사유
  const [patientList, setPatientList] = useState<any[]>([]); // 선택된 사유의 환자 목록
  const [patientListLoading, setPatientListLoading] = useState(false);
  
  // 날짜 범위 상태 (기본값: 이번 달)
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-${String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    return { startDate, endDate };
  });

  // 현재 기간 통계 조회
  const fetchCurrentStats = async () => {
    try {
      const response = await fetch(`/api/consultations/disagreement-stats?type=custom&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentStats(data);
      }
    } catch (error) {
      console.error('미동의 사유별 통계 조회 중 에러:', error);
    }
  };

  // 15개월 트렌드 조회
  const fetchTrendData = async () => {
    try {
      const response = await fetch(`/api/consultations/disagreement-trend?endDate=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setTrendData(data);
      }
    } catch (error) {
      console.error('미동의 사유별 트렌드 조회 중 에러:', error);
    }
  };

  // 선택된 사유의 환자 목록 조회
  const fetchPatientList = async (reason: string) => {
    setPatientListLoading(true);
    try {
      const response = await fetch(
        `/api/consultations?agreed=false&disagreementReason=${encodeURIComponent(reason)}&dateStart=${dateRange.startDate}&dateEnd=${dateRange.endDate}&limit=100`
      );
      if (response.ok) {
        const data = await response.json();
        setPatientList(data.consultations || []);
      }
    } catch (error) {
      console.error('환자 목록 조회 중 에러:', error);
      setPatientList([]);
    } finally {
      setPatientListLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchCurrentStats(),
        fetchTrendData()
      ]);
      setLoading(false);
    };

    fetchData();
    // 날짜 범위가 변경되면 선택된 사유 초기화
    setSelectedReason(null);
    setPatientList([]);
  }, [selectedDate, dateRange]);

  // 인사이트 데이터 업데이트
  useEffect(() => {
    if (currentStats && trendData && currentStats.stats.length > 0 && onInsightsUpdate) {
      const topLossReason = currentStats.stats[0];
      const increasingReasons = trendData.reasonTotals
        .filter(reason => {
          const recentMonths = trendData.monthlyData.slice(-3);
          const previousMonths = trendData.monthlyData.slice(-6, -3);
          const recentCount = recentMonths.reduce((sum, month) => sum + (month.reasons[reason.reason]?.count || 0), 0);
          const previousCount = previousMonths.reduce((sum, month) => sum + (month.reasons[reason.reason]?.count || 0), 0);
          return recentCount > previousCount;
        })
        .slice(0, 2)
        .map(r => r.reason);

      onInsightsUpdate({
        topLossReason: {
          reason: topLossReason.reason,
          totalAmount: topLossReason.totalAmount
        },
        increasingReasons,
        reasonCount: currentStats.summary.reasonCount
      });
    } else if (onInsightsUpdate) {
      onInsightsUpdate(null);
    }
  }, [currentStats, trendData, onInsightsUpdate]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    return `${year}.${month}`;
  };

  // 범례 클릭 핸들러
  const handleLegendClick = (reason: string) => {
    if (selectedReason === reason) {
      // 같은 사유 클릭 시 선택 해제
      setSelectedReason(null);
      setPatientList([]);
    } else {
      // 새로운 사유 선택
      setSelectedReason(reason);
      fetchPatientList(reason);
    }
  };

  // 트렌드 차트용 데이터 변환
  const trendChartData = trendData?.monthlyData.map(monthData => {
    const chartData: any = { month: formatMonth(monthData.month) };
    
    // 모든 사유 표시
    trendData.reasonTotals.forEach(({ reason }) => {
      chartData[reason] = monthData.reasons[reason]?.[viewMode] || 0;
    });
    
    return chartData;
  }) || [];

  const allReasons = trendData?.reasonTotals.map(r => r.reason) || [];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (!currentStats || !trendData || currentStats.stats.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        해당 기간에 미동의 사유 데이터가 없습니다.
      </div>
    );
  }

  // 가장 큰 손실 사유
  const topLossReason = currentStats.stats[0];
  const increasingReasons = trendData.reasonTotals
    .filter(reason => {
      const recentMonths = trendData.monthlyData.slice(-3);
      const previousMonths = trendData.monthlyData.slice(-6, -3);
      const recentCount = recentMonths.reduce((sum, month) => sum + (month.reasons[reason.reason]?.count || 0), 0);
      const previousCount = previousMonths.reduce((sum, month) => sum + (month.reasons[reason.reason]?.count || 0), 0);
      return recentCount > previousCount;
    })
    .slice(0, 2)
    .map(r => r.reason);

  return (
    <>
      {/* 날짜 범위 선택 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <Label className="text-sm font-medium">조회 기간</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="startDate" className="text-sm">시작일</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="endDate" className="text-sm">종료일</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-auto"
              />
            </div>
            <Button
              onClick={() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const startDate = `${year}-${month}-01`;
                const endDate = `${year}-${month}-${String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
                setDateRange({ startDate, endDate });
              }}
              variant="outline"
              size="sm"
            >
              이번 달
            </Button>
          </div>
        </div>

        {/* 건수/금액 토글 */}
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold">미동의 사유별 분포 ({dateRange.startDate} ~ {dateRange.endDate})</h4>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'count' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('count')}
            >
              건수
            </Button>
            <Button
              variant={viewMode === 'amount' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('amount')}
            >
              금액
            </Button>
          </div>
        </div>

        {/* 상단: 원형 그래프와 환자 리스트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 좌측: 도넛차트 */}
          <div>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={currentStats.stats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  dataKey={viewMode === 'count' ? 'count' : 'totalAmount'}
                  nameKey="reason"
                  onClick={(data) => handleLegendClick(data.reason)}
                >
                  {currentStats.stats.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={selectedReason && selectedReason !== entry.reason ? 0.3 : 1}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    viewMode === 'count' ? `${value}건` : `₩${formatAmount(value)}`,
                    name
                  ]} 
                />
                <Legend 
                  onClick={(data) => data.value && handleLegendClick(data.value)}
                  wrapperStyle={{ cursor: 'pointer' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 우측: 환자 리스트 */}
          <div>
            <h4 className="text-sm font-semibold mb-4">
              {selectedReason ? `"${selectedReason}" 사유 환자 목록` : '사유를 선택하세요'}
            </h4>
            {patientListLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-gray-500">환자 목록을 불러오는 중...</div>
              </div>
            ) : selectedReason && patientList.length > 0 ? (
              <div className="max-h-80 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0">
                    <TableRow>
                      <TableHead>차트번호</TableHead>
                      <TableHead>환자명</TableHead>
                      <TableHead className="text-right">상담금액</TableHead>
                      <TableHead>상담날짜</TableHead>
                      <TableHead>비고</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patientList.map((patient, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{patient.chartNumber}</TableCell>
                        <TableCell>{patient.patientName}</TableCell>
                        <TableCell className="text-right">₩{formatAmount(patient.amount)}</TableCell>
                        <TableCell>{new Date(patient.date).toLocaleDateString('ko-KR')}</TableCell>
                        <TableCell>{patient.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : selectedReason ? (
              <div className="text-center py-8 text-gray-500">
                해당 사유의 환자가 없습니다.
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                위 원형 그래프의 범례를 클릭하여 환자 목록을 확인하세요.
              </div>
            )}
          </div>
        </div>

        {/* 하단: 15개월 트렌드 라인차트 */}
        <div>
          <h4 className="text-sm font-semibold mb-4">미동의 사유별 15개월 추이</h4>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendChartData}>
              <XAxis dataKey="month" />
              <YAxis tickFormatter={viewMode === 'amount' ? (value) => `₩${(value / 10000).toFixed(0)}만` : undefined} />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip 
                labelFormatter={(label) => `${label}월`}
                formatter={(value: any, name: any) => [
                  viewMode === 'amount' ? `₩${formatAmount(value)}` : `${value}건`,
                  name
                ]}
              />
              <Legend 
                onClick={(data) => data.value && handleLegendClick(data.value)}
                wrapperStyle={{ cursor: 'pointer' }}
              />
              {allReasons.map((reason) => {
                // 원형 그래프의 currentStats.stats에서 해당 사유의 인덱스를 찾아 동일한 색상 사용
                const colorIndex = currentStats.stats.findIndex(stat => stat.reason === reason);
                const color = COLORS[colorIndex % COLORS.length];
                
                return (
                  <Line
                    key={reason}
                    type="monotone"
                    dataKey={reason}
                    stroke={color}
                    strokeWidth={2}
                    strokeOpacity={selectedReason && selectedReason !== reason ? 0.3 : 1}
                    dot={{ 
                      fill: color, 
                      r: 4,
                      fillOpacity: selectedReason && selectedReason !== reason ? 0.3 : 1
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
    </>
  );
}