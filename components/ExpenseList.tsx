'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ExpenseModal from './ExpenseModal';
import { Expense } from '@/lib/types';
import { toISODateString } from '@/lib/utils';
import { useDateContext } from '@/lib/context/dateContext';

type ExpenseListProps = {
  date: Date;
};

export default function ExpenseList({ date }: ExpenseListProps) {
  const { expenseRefreshTrigger, triggerStatsRefresh, triggerCashRefresh } = useDateContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);

  // 지출 내역 가져오기
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const dateStr = toISODateString(date);
      // API에서 일별 조회 시 자동으로 모든 데이터를 반환하도록 수정됨
      const response = await fetch(`/api/expenses?dateStart=${dateStr}&dateEnd=${dateStr}`);
      
      if (!response.ok) {
        throw new Error('지출 내역을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setExpenses(data.data);
        
        // 총 지출액 계산
        const total = data.data.reduce((sum: number, item: Expense) => sum + item.amount, 0);
        setTotalAmount(total);
      } else {
        setExpenses([]);
        setTotalAmount(0);
      }
    } catch (error) {
      console.error('지출 내역 조회 에러:', error);
      toast.error('지출 내역을 불러오는데 실패했습니다.');
      setExpenses([]);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  // 날짜가 변경되거나 지출 새로고침 트리거가 변경되면 지출 내역 다시 가져오기
  useEffect(() => {
    fetchExpenses();
  }, [date, expenseRefreshTrigger]);

  // 지출 수정 모달 열기
  const handleEditExpense = (expense: Expense) => {
    setEditItem(expense);
    setIsModalOpen(true);
  };

  // 지출 삭제
  const handleDeleteExpense = async (id: string) => {
    if (!confirm('정말로 이 지출 내역을 삭제하시겠습니까?')) return;
    
    // 삭제할 지출의 정보를 미리 가져와서 현금 지출인지 확인
    const expenseToDelete = expenses.find(expense => expense._id === id);
    
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('지출 내역 삭제에 실패했습니다.');
      }
      
      toast.success('지출 내역이 삭제되었습니다.');
      fetchExpenses(); // 목록 새로고침
      triggerStatsRefresh(); // 통계 새로고침
      
      // 현금 지출이었다면 시재 데이터도 새로고침
      if (expenseToDelete?.method === '현금') {
        triggerCashRefresh();
      }
    } catch (error) {
      console.error('지출 삭제 에러:', error);
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
    fetchExpenses(); // 목록 새로고침
    triggerStatsRefresh(); // 통계 새로고침
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between py-4 px-6 sticky top-0 bg-white z-10">
        <CardTitle className="text-lg font-semibold">지출 내역</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            총 {expenses.length}건, {totalAmount.toLocaleString()}원
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {loading ? (
          <div className="text-center py-4">데이터를 불러오는 중...</div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground min-h-[100px] flex items-center justify-center">
            등록된 지출 내역이 없습니다.
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>지출 내역</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>지불 방법</TableHead>
                  <TableHead>영수증</TableHead>
                  <TableHead>비고</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense._id}>
                    <TableCell className="font-medium">{expense.details}</TableCell>
                    <TableCell>{expense.amount.toLocaleString()}원</TableCell>
                    <TableCell>{expense.method}</TableCell>
                    <TableCell>{expense.hasReceipt ? '있음' : '없음'}</TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      {expense.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditExpense(expense)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(expense._id || '')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* 지출 등록/수정 모달 */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        defaultDate={date}
        editItem={editItem}
      />
    </Card>
  );
} 