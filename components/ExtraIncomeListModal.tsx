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
import { ExtraIncome } from '@/lib/types';
import { toISODateString } from '@/lib/utils';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  date: Date;
  type: 'daily' | 'monthly'; // 일간 또는 월간 통계
};

export default function ExtraIncomeListModal({ isOpen, onClose, title, date, type }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [extraIncomes, setExtraIncomes] = useState<ExtraIncome[]>([]);

  // 진료외수입 목록 조회
  const fetchExtraIncomes = async () => {
    setIsLoading(true);
    
    try {
      let dateStart, dateEnd;
      
      if (type === 'daily') {
        // 일간: 해당 날짜만
        dateStart = toISODateString(date);
        dateEnd = dateStart;
      } else {
        // 월간: 해당 월의 첫날부터 마지막 날까지
        const year = date.getFullYear();
        const month = date.getMonth();
        dateStart = toISODateString(new Date(year, month, 1));
        dateEnd = toISODateString(new Date(year, month + 1, 0));
      }
      
      const response = await fetch(`/api/extraIncome?dateStart=${dateStart}&dateEnd=${dateEnd}`);
      
      if (!response.ok) {
        throw new Error('진료외수입 목록을 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      // 날짜 오름차순으로 정렬
      const sortedData = data.sort((a: ExtraIncome, b: ExtraIncome) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      setExtraIncomes(sortedData);
    } catch (error) {
      console.error('진료외수입 목록 조회 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 열릴 때 데이터 가져오기
  useEffect(() => {
    if (isOpen) {
      fetchExtraIncomes();
    }
  }, [isOpen, date, type]);

  // 금액 형식화
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // 날짜 형식화
  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return format(date, 'yyyy-MM-dd', { locale: ko });
  };

  // 총 금액 계산
  const calculateTotal = () => {
    return extraIncomes.reduce((total, item) => total + item.amount, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : extraIncomes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              해당 기간에 진료외수입이 없습니다.
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">날짜</TableHead>
                    <TableHead>항목</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>비고</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extraIncomes.map((income) => (
                    <TableRow key={income._id}>
                      <TableCell>{formatDate(income.date)}</TableCell>
                      <TableCell>{income.type}</TableCell>
                      <TableCell className="text-right">₩{formatAmount(income.amount)}</TableCell>
                      <TableCell>{income.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={2} className="font-bold">합계</TableCell>
                    <TableCell className="text-right font-bold">₩{formatAmount(calculateTotal())}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 