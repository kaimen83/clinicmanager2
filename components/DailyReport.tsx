'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CashDepositModal from './CashDepositModal';

interface DailyData {
  date: string;
  totalIncome: number;
  cardAmount: number;
  transferAmount: number;
  cashAmount: number;
  extraIncomeAmount: number;
  cardDepositsAmount: number;
  cashDeposit: number;
  totalExpense: number;
  newPatients: number;
  totalPatients: number;
  isDepositCompleted: boolean;
  hasIncompleteDeposit?: boolean;
}

interface DailySummary {
  totalIncome: number;
  cardAmount: number;
  transferAmount: number;
  cashAmount: number;
  extraIncomeAmount: number;
  totalCardDeposits: number;
  cashDeposit: number;
  totalExpense: number;
  totalNewPatients: number;
  totalPatients: number;
}

interface DailyReportData {
  dailyData: DailyData[];
  summary: DailySummary;
}

interface DepositStatus {
  hasIncomplete: boolean;
  totalAmount: number;
  completedAmount: number;
}

type ViewType = 'daily' | 'monthly';

export default function DailyReport() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewType, setViewType] = useState<ViewType>('daily');
  const [data, setData] = useState<DailyReportData>({ dailyData: [], summary: {} as DailySummary });
  const [depositStatus, setDepositStatus] = useState<Record<string, DepositStatus>>({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  // 입금 상태 로드
  const loadDepositStatus = async () => {
    if (viewType !== 'daily') return;
    
    try {
      const [year, month] = currentMonth.split('-');
      const response = await fetch(`/api/cash-deposit/status?year=${year}&month=${month}`);
      
      if (response.ok) {
        const statusData = await response.json();
        setDepositStatus(statusData);
      }
    } catch (error) {
      console.error('입금 상태 로드 중 오류:', error);
    }
  };

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    try {
      if (viewType === 'daily') {
        await Promise.all([loadDailyData(), loadDepositStatus()]);
      } else {
        await loadMonthlyData();
      }
    } catch (error) {
      console.error('데이터 로드 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 일간 데이터 로드
  const loadDailyData = async () => {
    const [year, month] = currentMonth.split('-');
    
    try {
      const [reportResponse, cardDepositsResponse] = await Promise.all([
        fetch(`/api/daily-report/monthly/${year}/${month}`),
        fetch(`/api/daily-actual-card-deposits/monthly/${year}/${month}`)
      ]);

      if (!reportResponse.ok || !cardDepositsResponse.ok) {
        throw new Error('데이터 로드 중 오류가 발생했습니다.');
      }

      const [reportData, cardDepositsData] = await Promise.all([
        reportResponse.json(),
        cardDepositsResponse.json()
      ]);

      // 카드사 입금 데이터를 날짜별로 매핑
      const cardDepositsByDate: Record<string, number> = {};
      cardDepositsData.forEach((deposit: any) => {
        // depositDate는 이미 올바른 날짜 형식으로 저장되어 있음
        const depositDate = new Date(deposit.depositDate);
        const dateKey = depositDate.toISOString().split('T')[0];
        cardDepositsByDate[dateKey] = deposit.totalAmount;
      });

      // 데이터 병합
      const mergedData = {
        ...reportData,
        dailyData: reportData.dailyData.map((day: DailyData) => ({
          ...day,
          cardDepositsAmount: cardDepositsByDate[day.date] || 0
        }))
      };

      mergedData.summary.totalCardDeposits = Object.values(cardDepositsByDate).reduce((sum: number, amount: number) => sum + amount, 0);

      setData(mergedData);
    } catch (error) {
      console.error('일간 데이터 로드 오류:', error);
      throw error;
    }
  };

  // 월간 데이터 로드
  const loadMonthlyData = async () => {
    const year = currentMonth.split('-')[0];
    const monthlyData: DailyReportData = { dailyData: [], summary: {} as DailySummary };
    
    try {
      // 1월부터 12월까지의 데이터 로드
      for (let month = 1; month <= 12; month++) {
        const [reportResponse, cardDepositsResponse] = await Promise.all([
          fetch(`/api/daily-report/monthly/${year}/${month}`),
          fetch(`/api/daily-actual-card-deposits/monthly/${year}/${month}`)
        ]);

        if (!reportResponse.ok || !cardDepositsResponse.ok) continue;

        const [monthData, cardDepositsData] = await Promise.all([
          reportResponse.json(),
          cardDepositsResponse.json()
        ]);

        const totalCardDeposits = cardDepositsData.reduce((sum: number, deposit: any) => sum + deposit.totalAmount, 0);

        monthlyData.dailyData.push({
          date: `${year}-${String(month).padStart(2, '0')}`,
          ...monthData.summary,
          cardDepositsAmount: totalCardDeposits
        });
      }

      // 연간 합계 계산
      monthlyData.summary = monthlyData.dailyData.reduce((sum, month) => ({
        totalIncome: (sum.totalIncome || 0) + (month.totalIncome || 0),
        cardAmount: (sum.cardAmount || 0) + (month.cardAmount || 0),
        transferAmount: (sum.transferAmount || 0) + (month.transferAmount || 0),
        cashAmount: (sum.cashAmount || 0) + (month.cashAmount || 0),
        extraIncomeAmount: (sum.extraIncomeAmount || 0) + (month.extraIncomeAmount || 0),
        totalCardDeposits: (sum.totalCardDeposits || 0) + (month.cardDepositsAmount || 0),
        cashDeposit: (sum.cashDeposit || 0) + (month.cashDeposit || 0),
        totalExpense: (sum.totalExpense || 0) + (month.totalExpense || 0),
                 totalNewPatients: (sum.totalNewPatients || 0) + (month.newPatients || 0),
        totalPatients: (sum.totalPatients || 0) + (month.totalPatients || 0)
      }), {} as DailySummary);

      setData(monthlyData);
    } catch (error) {
      console.error('월간 데이터 로드 오류:', error);
      throw error;
    }
  };

  // 이전 월/년도로 이동
  const goToPrevious = () => {
    if (viewType === 'daily') {
      const [year, month] = currentMonth.split('-').map(Number);
      let prevYear = year;
      let prevMonth = month - 1;
      
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear--;
      }
      
      setCurrentMonth(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
    } else {
      const year = parseInt(currentMonth.split('-')[0]);
      setCurrentMonth(`${year - 1}-01`);
    }
  };

  // 다음 월/년도로 이동
  const goToNext = () => {
    const now = new Date();
    
    if (viewType === 'daily') {
      const [year, month] = currentMonth.split('-').map(Number);
      const currentYearMonth = now.getFullYear() * 12 + now.getMonth();
      const selectedYearMonth = year * 12 + (month - 1);
      
      if (selectedYearMonth >= currentYearMonth) return;
      
      let nextYear = year;
      let nextMonth = month + 1;
      
      if (nextMonth === 13) {
        nextMonth = 1;
        nextYear++;
      }
      
      setCurrentMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
    } else {
      const year = parseInt(currentMonth.split('-')[0]);
      if (year >= now.getFullYear()) return;
      
      setCurrentMonth(`${year + 1}-01`);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${month}/${day} (${dayOfWeek})`;
  };

  // 금액 포맷팅
  const formatAmount = (amount: number) => {
    if (!amount || isNaN(amount)) {
      amount = 0;
    }
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  // 테이블 행 클릭 핸들러
  const handleRowClick = (date: string, columnIndex: number) => {
    setSelectedDate(date);
    if (columnIndex === 7) { // 현금입금 컬럼
      setShowDepositModal(true);
    } else {
      setShowDetailModal(true);
    }
  };

  // 테이블 데이터 생성
  const generateTableData = () => {
    if (viewType === 'daily') {
      const [year, month] = currentMonth.split('-');
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const today = new Date().toISOString().split('T')[0];
      
      return Array.from({length: daysInMonth}, (_, i) => {
        const date = new Date(parseInt(year), parseInt(month) - 1, i + 1);
        const dateStr = `${parseInt(year)}-${String(parseInt(month)).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
        const dayData = data.dailyData.find(d => d.date === dateStr) || {
          date: dateStr,
          totalIncome: 0,
          cardAmount: 0,
          transferAmount: 0,
          cashAmount: 0,
          extraIncomeAmount: 0,
          cardDepositsAmount: 0,
          cashDeposit: 0,
          totalExpense: 0,
          newPatients: 0,
          totalPatients: 0,
          isDepositCompleted: false
        };

        const isSunday = date.getDay() === 0;
        const isToday = dateStr === today;
        const hasIncompleteDeposit = depositStatus[dateStr]?.hasIncomplete || false;
        
        return { ...dayData, isSunday, isToday, hasIncompleteDeposit };
      });
    } else {
      return data.dailyData.map(monthData => ({
        ...monthData,
        isSunday: false,
        isToday: false,
        hasIncompleteDeposit: false
      }));
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth, viewType]);

  // 입금완료 이벤트 리스너
  useEffect(() => {
    const handleDepositCompleted = () => {
      loadData(); // 데이터와 입금 상태 새로고침
    };

    document.addEventListener('depositCompleted', handleDepositCompleted);
    
    return () => {
      document.removeEventListener('depositCompleted', handleDepositCompleted);
    };
  }, [currentMonth, viewType]);

  const tableData = generateTableData();

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col space-y-4">
            {/* 뷰 타입 선택 */}
            <div className="flex space-x-2">
              <Button
                variant={viewType === 'daily' ? 'default' : 'outline'}
                onClick={() => setViewType('daily')}
                size="sm"
              >
                일간
              </Button>
              <Button
                variant={viewType === 'monthly' ? 'default' : 'outline'}
                onClick={() => setViewType('monthly')}
                size="sm"
              >
                월간
              </Button>
            </div>

            {/* 월별 네비게이션 */}
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={goToPrevious}>
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>
              
              {viewType === 'daily' ? (
                <input
                  type="month"
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                />
              ) : (
                <input
                  type="number"
                  value={currentMonth.split('-')[0]}
                  onChange={(e) => setCurrentMonth(`${e.target.value}-01`)}
                  min="2000"
                  max="2100"
                  className="px-3 py-2 border rounded-md w-20"
                />
              )}
              
              <Button variant="outline" size="sm" onClick={goToNext}>
                다음
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">데이터를 불러오는 중...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 범례 */}
            {viewType === 'daily' && (
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-bold">⚠️ 미완료 입금 있음</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-semibold">✅ 모든 입금 완료</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">일반 표시 (입금 내역 없음)</span>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    {viewType === 'daily' ? '날짜' : '월'}
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-right">총수입</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">카드</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">계좌입금</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">현금</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">진료외수입</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">카드사 입금</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">원장님 전달</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">총지출</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">신환</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">총환자수</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, index) => (
                  <tr
                    key={row.date}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      row.isSunday ? 'bg-red-50' : ''
                    } ${row.isToday ? 'bg-blue-50' : ''}`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      const cellIndex = Array.from(target.parentElement?.children || []).indexOf(target);
                      handleRowClick(row.date, cellIndex);
                    }}
                  >
                    <td className="border border-gray-300 px-4 py-2">
                      {viewType === 'daily' ? formatDate(row.date) : `${new Date(row.date).getMonth() + 1}월`}
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 text-right ${row.totalIncome > 0 ? 'text-blue-600 font-semibold' : ''}`}>
                      {formatAmount(row.totalIncome)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {formatAmount(row.cardAmount)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {formatAmount(row.transferAmount)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {formatAmount(row.cashAmount)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {formatAmount(row.extraIncomeAmount)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {formatAmount(row.cardDepositsAmount)}
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 text-right ${
                      row.hasIncompleteDeposit 
                        ? 'text-red-600 font-bold' 
                        : row.cashDeposit > 0 && !row.hasIncompleteDeposit 
                        ? 'text-green-600 font-semibold' 
                        : ''
                    }`}>
                      {formatAmount(row.cashDeposit)}
                      {row.hasIncompleteDeposit && (
                        <span className="ml-1 text-xs">⚠️</span>
                      )}
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 text-right ${row.totalExpense > 0 ? 'text-red-600' : ''}`}>
                      {formatAmount(row.totalExpense)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {row.newPatients}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {row.totalPatients}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="border border-gray-300 px-4 py-2">
                    {viewType === 'daily' ? '월 합계' : '연간 합계'}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatAmount(data.summary.totalIncome || 0)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatAmount(data.summary.cardAmount || 0)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatAmount(data.summary.transferAmount || 0)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatAmount(data.summary.cashAmount || 0)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatAmount(data.summary.extraIncomeAmount || 0)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatAmount(data.summary.totalCardDeposits || 0)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatAmount(data.summary.cashDeposit || 0)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatAmount(data.summary.totalExpense || 0)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {data.summary.totalNewPatients || 0}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {data.summary.totalPatients || 0}
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* 계좌입금 상세 모달 */}
    <CashDepositModal
      isOpen={showDepositModal}
      onClose={() => setShowDepositModal(false)}
      selectedDate={selectedDate || ''}
    />
  </>
  );
} 