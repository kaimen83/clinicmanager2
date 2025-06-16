'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Expense } from '@/lib/types';
import { toISODateString, getCurrentKstDate } from '@/lib/utils';
import ExpenseModal from './ExpenseModal';

export default function EvidenceStatus() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  
  // 날짜 필터 상태
  const [dateFilters, setDateFilters] = useState(() => {
    const today = getCurrentKstDate();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    return {
      startDate: toISODateString(oneMonthAgo),
      endDate: toISODateString(today)
    };
  });

  // 지출 데이터 로드
  const loadExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilters.startDate) params.append('dateStart', dateFilters.startDate);
      if (dateFilters.endDate) params.append('dateEnd', dateFilters.endDate);
      params.append('limit', '1000'); // 많은 데이터를 가져오기 위해 limit 증가
      
      const response = await fetch(`/api/expenses?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('지출 데이터를 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        let filteredExpenses = data.data;
        
        // 영수증 필터 적용
        if (receiptFilter !== 'all') {
          filteredExpenses = data.data.filter((expense: Expense) => 
            receiptFilter === 'yes' ? expense.hasReceipt : !expense.hasReceipt
          );
        }
        
        setExpenses(filteredExpenses);
        
        // 총액 계산
        const total = filteredExpenses.reduce((sum: number, expense: Expense) => 
          sum + (expense.amount || 0), 0);
        setTotalAmount(total);
      } else {
        setExpenses([]);
        setTotalAmount(0);
      }
    } catch (error) {
      console.error('지출 데이터 로드 중 에러:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
      setExpenses([]);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 및 필터 변경 시 데이터 로드
  useEffect(() => {
    loadExpenses();
  }, [dateFilters.startDate, dateFilters.endDate, receiptFilter]);

  // 날짜 필터 변경 처리
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 지출 수정 모달 열기
  const handleEditExpense = (expense: Expense) => {
    setEditItem(expense);
    setIsModalOpen(true);
  };

  // 지출 삭제
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('정말 이 지출 내역을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('지출 정보 삭제에 실패했습니다.');
      }
      
      toast.success('지출 내역이 삭제되었습니다.');
      loadExpenses(); // 목록 새로고침
    } catch (error) {
      console.error('지출 정보 삭제 중 에러:', error);
      toast.error('지출 내역 삭제에 실패했습니다.');
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
  };

  // 지출 등록/수정 완료 처리
  const handleSuccess = () => {
    loadExpenses(); // 목록 새로고침
    handleCloseModal(); // 모달 닫기
  };

  // 자동 크롤링 기능 (추후 구현)
  const handleAutoCrawling = () => {
    toast.info('자동 크롤링 기능은 추후 구현 예정입니다.');
  };

  return (
    <div className="space-y-6">
      {/* 필터 영역 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">증빙자료 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="start-date">시작일</Label>
              <Input
                id="start-date"
                type="date"
                value={dateFilters.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">종료일</Label>
              <Input
                id="end-date"
                type="date"
                value={dateFilters.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-filter">영수증 필터</Label>
              <Select value={receiptFilter} onValueChange={(value: 'all' | 'yes' | 'no') => setReceiptFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="yes">있음</SelectItem>
                  <SelectItem value="no">없음</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Button onClick={handleAutoCrawling} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                자동 크롤링
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 결과 영역 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">지출 내역</CardTitle>
          <div className="text-sm font-medium">
            총 {expenses.length}건, {totalAmount.toLocaleString()}원
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">데이터를 불러오는 중...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              지출 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {/* 헤더 */}
              <div className="grid grid-cols-8 gap-4 p-3 bg-gray-50 rounded-lg font-medium text-sm">
                <div>지출일자</div>
                <div>지출내역</div>
                <div>거래처</div>
                <div>지출방법</div>
                <div>지출금액</div>
                <div>영수증</div>
                <div>비고</div>
                <div className="text-center">관리</div>
              </div>
              
              {/* 데이터 행들 */}
              <div className="max-h-[500px] overflow-y-auto space-y-1">
                {expenses.map((expense) => (
                  <div key={expense._id} className="grid grid-cols-8 gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="text-sm">
                      {new Date(expense.date).toLocaleDateString('ko-KR')}
                    </div>
                    <div className="text-sm font-medium">{expense.details}</div>
                    <div className="text-sm">{expense.vendor || '-'}</div>
                    <div className="text-sm">{expense.method}</div>
                    <div className="text-sm font-medium text-right">
                      {expense.amount.toLocaleString()}원
                    </div>
                    <div className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        expense.hasReceipt 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {expense.hasReceipt ? '있음' : '없음'}
                      </span>
                    </div>
                    <div className="text-sm truncate">{expense.notes || ''}</div>
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditExpense(expense)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteExpense(expense._id || '')}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 지출 등록/수정 모달 */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        defaultDate={new Date()}
        editItem={editItem}
      />
    </div>
  );
} 