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
      setTransactions(data.transactions || []);
      setFilteredTransactions(data.transactions || []);
    } catch (error) {
      console.error('트랜잭션 목록 조회 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 열릴 때 트랜잭션 목록 조회
  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
      setSearchTerm('');
    }
  }, [isOpen, date, paymentMethod, type]);

  // 검색어 변경 처리
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTransactions(transactions);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = transactions.filter(
        (tx) =>
          tx.chartNumber?.toLowerCase().includes(term) ||
          tx.patientName?.toLowerCase().includes(term)
      );
      setFilteredTransactions(filtered);
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
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="차트번호 또는 환자명으로 검색"
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? '검색 결과가 없습니다.' : '해당 기간에 트랜잭션이 없습니다.'}
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">날짜</TableHead>
                    <TableHead className="w-24">차트번호</TableHead>
                    <TableHead>환자명</TableHead>
                    <TableHead>결제방법</TableHead>
                    <TableHead>현금영수증</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx._id}>
                      <TableCell>{formatDate(tx.date)}</TableCell>
                      <TableCell>{tx.chartNumber}</TableCell>
                      <TableCell>{tx.patientName}</TableCell>
                      <TableCell>{tx.paymentMethod}</TableCell>
                      <TableCell>{tx.cashReceipt ? '발행' : '-'}</TableCell>
                      <TableCell className="text-right">₩{formatAmount(tx.paymentAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 