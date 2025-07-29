'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Download, RefreshCw, Users, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatCurrency, createKstDateForMongoDB } from '@/lib/utils';
import { isSameCardCompany } from '@/lib/utils/depositCalculations';
import IndividualDepositModal from './IndividualDepositModal';
import BulkDepositModal from './BulkDepositModal';
import EditDepositModal from './EditDepositModal';

export interface CardSettlementData {
  _id: {
    date: string;
    cardCompany: string;
  };
  totalAmount: number;
  transactionCount: number;
  expectedDepositDate: string;
  actualDepositDate?: string;
  actualDepositAmount?: number;
  fee?: number;
  feeRate?: number;
  isProcessed?: boolean; // 처리 완료 여부
}

export default function CardSettlement() {
  const [data, setData] = useState<CardSettlementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7일 전
    end: new Date() // 오늘
  });
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [selectedCardCompany, setSelectedCardCompany] = useState<string>('all'); // 카드사 필터
  
  // 선택 및 모달 관련 상태
  const [selectedItems, setSelectedItems] = useState<CardSettlementData[]>([]);
  const [modalType, setModalType] = useState<'individual' | 'bulk' | 'edit' | null>(null);
  const [currentItem, setCurrentItem] = useState<CardSettlementData | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/card-settlement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: createKstDateForMongoDB(dateRange.start).toISOString(),
          endDate: createKstDateForMongoDB(dateRange.end).toISOString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
      } else {
        console.error('Failed to fetch card settlement data');
      }
    } catch (error) {
      console.error('Error fetching card settlement data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (date) {
      setDateRange(prev => ({
        ...prev,
        [type]: date
      }));
    }
  };

  // 통계 계산
  const calculateStats = () => {
    const filteredData = selectedCardCompany === 'all' 
      ? data 
      : data.filter(item => item._id.cardCompany === selectedCardCompany);
      
    const totalSales = filteredData.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalActualDeposits = filteredData.reduce((sum, item) => sum + (item.actualDepositAmount || 0), 0);
    const totalUndeposited = filteredData.reduce((sum, item) => {
      return sum + (item.actualDepositAmount ? 0 : item.totalAmount);
    }, 0);
    const totalFees = filteredData.reduce((sum, item) => sum + (item.fee || 0), 0);

    return {
      totalSales,
      totalActualDeposits,
      totalUndeposited,
      totalFees
    };
  };

  const stats = calculateStats();

  // 필터링된 데이터
  const filteredData = selectedCardCompany === 'all' 
    ? data 
    : data.filter(item => item._id.cardCompany === selectedCardCompany);

  // 고유한 카드사 목록 추출
  const cardCompanies = Array.from(new Set(data.map(item => item._id.cardCompany))).sort();

  // 체크박스 선택 핸들러
  const handleItemSelect = (item: CardSettlementData, checked: boolean) => {
    if (checked) {
      // 이미 처리된 항목은 선택 불가
      if (item.isProcessed) {
        alert('이미 처리된 항목입니다.');
        return;
      }
      
      // 첫 선택이거나 같은 카드사인 경우만 허용
      if (selectedItems.length === 0 || selectedItems[0]._id.cardCompany === item._id.cardCompany) {
        setSelectedItems(prev => [...prev, item]);
      } else {
        alert('같은 카드사 항목만 일괄처리 가능합니다.');
      }
    } else {
      setSelectedItems(prev => prev.filter(selected => 
        !(selected._id.date === item._id.date && selected._id.cardCompany === item._id.cardCompany)
      ));
    }
  };

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 처리되지 않은 항목들만 선택
      const unprocessedItems = filteredData.filter(item => !item.isProcessed);
      setSelectedItems(unprocessedItems);
    } else {
      setSelectedItems([]);
    }
  };

  // 개별 처리 시작
  const handleIndividualProcess = (item: CardSettlementData) => {
    if (item.isProcessed) {
      alert('이미 처리된 항목입니다.');
      return;
    }
    setCurrentItem(item);
    setModalType('individual');
  };

  // 일괄 처리 시작
  const handleBulkProcess = () => {
    if (selectedItems.length === 0) {
      alert('처리할 항목을 선택해주세요.');
      return;
    }
    
    if (!isSameCardCompany(selectedItems)) {
      alert('같은 카드사 항목만 일괄처리 가능합니다.');
      return;
    }
    
    setModalType('bulk');
  };

  // 입금처리 수정 시작
  const handleEditProcess = (item: CardSettlementData) => {
    if (!item.isProcessed) {
      alert('처리된 항목만 수정할 수 있습니다.');
      return;
    }
    setCurrentItem(item);
    setModalType('edit');
  };

  // 모달 닫기
  const handleModalClose = () => {
    setModalType(null);
    setCurrentItem(null);
  };

  // 처리 완료 후 데이터 새로고침
  const handleProcessComplete = () => {
    setSelectedItems([]);
    setModalType(null);
    setCurrentItem(null);
    fetchData(); // 데이터 새로고침
  };

  return (
    <div className="space-y-4">
      {/* 헤더 및 필터 */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">카드정산 현황</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                엑셀
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">기간:</span>
              <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-3">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {format(dateRange.start, 'MM-dd', { locale: ko })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.start}
                    onSelect={(date) => {
                      handleDateChange('start', date);
                      setShowStartCalendar(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-sm text-gray-500">~</span>
              <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-3">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {format(dateRange.end, 'MM-dd', { locale: ko })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.end}
                    onSelect={(date) => {
                      handleDateChange('end', date);
                      setShowEndCalendar(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* 카드사 필터 추가 */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">카드사:</span>
              <select
                value={selectedCardCompany}
                onChange={(e) => setSelectedCardCompany(e.target.value)}
                className="h-8 px-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체</option>
                {cardCompanies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 매출액</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">입금완료액</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalActualDeposits)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">미입금액</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalUndeposited)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 수수료</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalFees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 선택된 항목 액션 영역 */}
      {selectedItems.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">
                  {selectedItems.length}개 항목 선택됨 
                  ({selectedItems[0]?._id.cardCompany})
                </span>
                <span className="text-sm text-blue-600">
                  총 {formatCurrency(selectedItems.reduce((sum, item) => sum + item.totalAmount, 0))}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItems([])}
                >
                  선택 해제
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkProcess}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  일괄 입금처리
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 데이터 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">카드정산 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-600">데이터를 불러오는 중...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              해당 기간에 카드 결제 내역이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      <Checkbox
                        checked={selectedItems.length === data.filter(item => !item.isProcessed).length && data.filter(item => !item.isProcessed).length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left p-2">매출일자</th>
                    <th className="text-left p-2">카드사</th>
                    <th className="text-right p-2">매출금액</th>
                    <th className="text-center p-2">입금예정일</th>
                    <th className="text-center p-2">실제입금일</th>
                    <th className="text-right p-2">실제입금액</th>
                    <th className="text-right p-2">수수료</th>
                    <th className="text-center p-2">수수료율</th>
                    <th className="text-center p-2">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => {
                    const isSelected = selectedItems.some(selected => 
                      selected._id.date === item._id.date && selected._id.cardCompany === item._id.cardCompany
                    );
                    
                    return (
                      <tr
                        key={index}
                        className={`border-b hover:bg-gray-50 ${
                          item.isProcessed ? 'bg-green-50' : ''
                        } ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleItemSelect(item, checked as boolean)}
                            disabled={item.isProcessed}
                          />
                        </td>
                        <td className="p-2">
                          {format(new Date(item._id.date), 'yyyy-MM-dd (EEE)', { locale: ko })}
                        </td>
                        <td className="p-2">{item._id.cardCompany}</td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(item.totalAmount)}
                        </td>
                        <td className="p-2 text-center text-sm">
                          {format(new Date(item.expectedDepositDate), 'MM-dd (EEE)', { locale: ko })}
                        </td>
                        <td className="p-2 text-center text-sm">
                          {item.actualDepositDate ? 
                            format(new Date(item.actualDepositDate), 'MM-dd (EEE)', { locale: ko }) : 
                            '-'
                          }
                        </td>
                        <td className="p-2 text-right">
                          {item.actualDepositAmount ? 
                            formatCurrency(item.actualDepositAmount) : 
                            '-'
                          }
                        </td>
                        <td className="p-2 text-right text-red-600">
                          {item.fee ? formatCurrency(item.fee) : '-'}
                        </td>
                        <td className="p-2 text-center text-red-600">
                          {item.feeRate ? `${item.feeRate}%` : '-'}
                        </td>
                        <td className="p-2 text-center">
                          {item.isProcessed ? (
                            <div className="flex items-center gap-2 justify-center">
                              <span className="text-green-600 text-sm font-medium">입금완료</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditProcess(item)}
                                className="text-xs px-2 py-1 h-auto"
                              >
                                수정
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleIndividualProcess(item)}
                            >
                              입금처리
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 모달들 */}
      {modalType === 'individual' && currentItem && (
        <IndividualDepositModal
          item={currentItem}
          onClose={handleModalClose}
          onComplete={handleProcessComplete}
        />
      )}

      {modalType === 'bulk' && selectedItems.length > 0 && (
        <BulkDepositModal
          items={selectedItems}
          onClose={handleModalClose}
          onComplete={handleProcessComplete}
        />
      )}

      {modalType === 'edit' && currentItem && (
        <EditDepositModal
          item={currentItem}
          onClose={handleModalClose}
          onComplete={handleProcessComplete}
        />
      )}
    </div>
  );
}