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
import { Transaction } from '@/lib/types';
import { toISODateString } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  date: Date;
  paymentMethod?: string; // '현금' | '카드' | '계좌이체' | undefined (undefined면 모든 결제 방식)
  type: 'daily' | 'monthly'; // 일간 또는 월간 통계
};

export default function PaymentListModal({ isOpen, onClose, title, date, paymentMethod, type }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  // 트랜잭션 목록 조회
  const fetchTransactions = async () => {
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
      
      if (paymentMethod) {
        queryParams.append('paymentMethod', paymentMethod);
      }
      
      const response = await fetch(`/api/transactions/stats?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('트랜잭션 목록을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      const sortedTransactions = sortTransactionsByDate(data.transactions || []);
      setTransactions(sortedTransactions);
      setFilteredTransactions(sortedTransactions);
    } catch (error) {
      console.error('트랜잭션 목록 조회 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 열릴 때 트랜잭션 목록 조회 및 권한 확인
  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
      setSearchTerm('');
    }
  }, [isOpen, date, paymentMethod, type]);


  // 트랜잭션 정렬 함수
  const sortTransactionsByDate = (transactions: Transaction[]) => {
    return [...transactions].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  // 검색어 변경 처리
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTransactions(sortTransactionsByDate(transactions));
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = transactions.filter(
        (tx) =>
          tx.chartNumber?.toLowerCase().includes(term) ||
          tx.patientName?.toLowerCase().includes(term)
      );
      setFilteredTransactions(sortTransactionsByDate(filtered));
    }
  }, [searchTerm, transactions]);

  // 금액 형식화
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // 날짜 형식화
  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return format(date, 'yyyy-MM-dd', { locale: ko });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[85vh] overflow-hidden flex flex-col bg-white rounded-2xl shadow-2xl border-0">
        <DialogHeader className="pb-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
              {paymentMethod ? (
                paymentMethod === '카드' ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="차트번호 또는 환자명으로 검색"
                className="pl-10 bg-gray-50 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
        </div>
        
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">데이터를 불러오는 중...</span>
              </div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-3 text-3xl opacity-50">📋</div>
              <div className="text-gray-500 font-medium">
                {searchTerm ? '검색 결과가 없습니다.' : '해당 기간에 트랜잭션이 없습니다.'}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
              <Table>
                <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <TableRow className="border-b border-gray-200">
                    <TableHead className="w-[100px] font-semibold text-gray-700 py-4 text-sm">날짜</TableHead>
                    <TableHead className="w-[80px] font-semibold text-gray-700 py-4 text-sm">차트번호</TableHead>
                    <TableHead className="w-[120px] font-semibold text-gray-700 py-4 text-sm">환자명</TableHead>
                    <TableHead className="w-[90px] font-semibold text-gray-700 py-4 text-sm">결제방법</TableHead>
                    <TableHead className="w-[120px] text-right font-semibold text-gray-700 py-4 text-sm pr-6">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx, index) => (
                    <TableRow 
                      key={tx._id} 
                      className={`hover:bg-gray-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <TableCell className="py-3.5 text-gray-700 font-medium text-sm whitespace-nowrap">{formatDate(tx.date)}</TableCell>
                      <TableCell className="py-3.5 text-gray-800 font-semibold text-sm">{tx.chartNumber}</TableCell>
                      <TableCell className="py-3.5 text-gray-800 font-medium text-sm">{tx.patientName}</TableCell>
                      <TableCell className="py-3.5 text-sm font-medium">
                        <span className={`
                          ${tx.paymentMethod === '카드' ? 'text-blue-700' : 
                            tx.paymentMethod === '현금' ? 'text-green-700' : 
                            'text-purple-700'}`}>
                          {tx.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-3.5 font-bold text-gray-900 pr-6 text-sm">
                        ₩{formatAmount(tx.paymentAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        
        {/* Footer with total */}
        {filteredTransactions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white rounded-b-xl">
            <div className="flex justify-between items-center px-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  총 <span className="font-bold text-gray-900 text-base">{filteredTransactions.length}</span>건
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">합계</span>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  ₩{formatAmount(filteredTransactions.reduce((sum, tx) => sum + tx.paymentAmount, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 