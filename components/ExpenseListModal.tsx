'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Receipt } from 'lucide-react';
import { toISODateString } from '@/lib/utils';

// 지출 데이터 타입 정의
type Expense = {
  _id: string;
  date: string | Date;
  details: string;
  amount: number;
  method: string;
  vendor: string;
  hasReceipt: boolean;
  account?: string;
  notes?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  date: Date;
  type: 'daily' | 'monthly'; // 일간 또는 월간 통계
};

export default function ExpenseListModal({ isOpen, onClose, title, date, type }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);

  // 지출 내역 조회
  const fetchExpenses = async () => {
    setIsLoading(true);
    
    try {
      let dateParam;
      if (type === 'daily') {
        dateParam = toISODateString(date);
      } else {
        // YYYY-MM 형식으로 변환 (한국 시간대 고려)
        dateParam = toISODateString(date).substring(0, 7);
      }
      
      const queryParams = new URLSearchParams({
        dateType: type,
        date: dateParam,
      });
      
      const response = await fetch(`/api/expenses/list?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('지출 내역을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      const sortedExpenses = sortExpensesByDate(data.expenses || []);
      setExpenses(sortedExpenses);
      setFilteredExpenses(sortedExpenses);
    } catch (error) {
      console.error('지출 내역 조회 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 열릴 때 지출 내역 조회
  useEffect(() => {
    if (isOpen) {
      fetchExpenses();
      setSearchTerm('');
    }
  }, [isOpen, date, type]);

  // 지출 정렬 함수 (오름차순)
  const sortExpensesByDate = (expenses: Expense[]) => {
    return [...expenses].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  // 검색어 변경 처리
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredExpenses(sortExpensesByDate(expenses));
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = expenses.filter(
        (expense) =>
          expense.details?.toLowerCase().includes(term) ||
          expense.vendor?.toLowerCase().includes(term) ||
          expense.method?.toLowerCase().includes(term)
      );
      setFilteredExpenses(sortExpensesByDate(filtered));
    }
  }, [searchTerm, expenses]);

  // 금액 형식화
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // 날짜 형식화
  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return format(date, 'yyyy-MM-dd', { locale: ko });
  };

  // 결제방법별 색상 지정
  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case '카드':
        return 'text-blue-700 bg-blue-50';
      case '현금':
        return 'text-green-700 bg-green-50';
      case '계좌이체':
        return 'text-purple-700 bg-purple-50';
      case '무통장입금':
        return 'text-orange-700 bg-orange-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[85vh] overflow-hidden flex flex-col bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-lg">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="지출내역, 업체명 또는 결제방법으로 검색"
                className="pl-10 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-red-600">
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">데이터를 불러오는 중...</span>
              </div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-3 text-3xl opacity-50">💸</div>
              <div className="text-gray-500 font-medium">
                {searchTerm ? '검색 결과가 없습니다.' : '해당 기간에 지출 내역이 없습니다.'}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
              <Table>
                <TableHeader className="bg-gradient-to-r from-red-50 to-pink-50">
                  <TableRow className="border-b border-gray-200">
                    <TableHead className="w-[100px] font-semibold text-gray-700 py-4 text-sm">날짜</TableHead>
                    <TableHead className="w-[220px] font-semibold text-gray-700 py-4 text-sm">지출내역</TableHead>
                    <TableHead className="w-[120px] font-semibold text-gray-700 py-4 text-sm">업체명</TableHead>
                    <TableHead className="w-[90px] font-semibold text-gray-700 py-4 text-sm">결제방법</TableHead>
                    <TableHead className="w-[120px] text-right font-semibold text-gray-700 py-4 text-sm pr-6">금액</TableHead>
                    <TableHead className="w-[80px] text-center font-semibold text-gray-700 py-4 text-sm">영수증</TableHead>
                    <TableHead className="w-[150px] font-semibold text-gray-700 py-4 text-sm">비고</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense, index) => (
                    <TableRow 
                      key={expense._id} 
                      className={`hover:bg-red-50/50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <TableCell className="py-3.5 text-gray-700 font-medium text-sm whitespace-nowrap">
                        {formatDate(expense.date)}
                      </TableCell>
                      <TableCell className="py-3.5 text-gray-800 font-medium text-sm">
                        {expense.details}
                      </TableCell>
                      <TableCell className="py-3.5 text-gray-700 text-sm">
                        {expense.vendor || '-'}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPaymentMethodColor(expense.method)}`}>
                          {expense.method}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-3.5 font-bold text-red-700 pr-6 text-sm">
                        ₩{formatAmount(expense.amount)}
                      </TableCell>
                      <TableCell className="text-center py-3.5 text-sm font-medium">
                        {expense.hasReceipt ? (
                          <span className="text-green-700 font-semibold">보유</span>
                        ) : (
                          <span className="text-red-600 font-semibold">미보유</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 text-gray-600 text-sm max-w-[150px] truncate">
                        {expense.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        
        {/* Footer with total */}
        {filteredExpenses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 bg-gradient-to-r from-red-50 to-pink-50 rounded-b-xl">
            <div className="flex justify-between items-center px-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  총 <span className="font-bold text-gray-900 text-base">{filteredExpenses.length}</span>건의 지출
                </div>
                <div className="text-sm text-gray-600">
                  영수증 보유: <span className="font-bold text-green-700">
                    {filteredExpenses.filter(exp => exp.hasReceipt).length}건
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">총 지출금액</span>
                <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                  ₩{formatAmount(filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}