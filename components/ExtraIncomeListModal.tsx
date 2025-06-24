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
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-800">{title}</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 pt-2">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">데이터를 불러오는 중...</span>
              </div>
            </div>
          ) : extraIncomes.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-3 text-3xl opacity-50">💰</div>
              <div className="text-gray-500 font-medium">해당 기간에 진료외수입이 없습니다.</div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
              <Table>
                <TableHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                  <TableRow className="border-b border-purple-200 hover:bg-purple-50">
                    <TableHead className="w-24 font-bold text-purple-800 py-3">날짜</TableHead>
                    <TableHead className="font-bold text-purple-800 py-3">항목</TableHead>
                    <TableHead className="text-right font-bold text-purple-800 py-3">금액</TableHead>
                    <TableHead className="font-bold text-purple-800 py-3">비고</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extraIncomes.map((income, index) => (
                    <TableRow 
                      key={income._id} 
                      className={`hover:bg-purple-50/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <TableCell className="py-3 text-gray-600 font-medium">{formatDate(income.date)}</TableCell>
                      <TableCell className="py-3 text-gray-700 font-medium">{income.type}</TableCell>
                      <TableCell className="text-right py-3 font-semibold text-purple-700">
                        ₩{formatAmount(income.amount)}
                      </TableCell>
                      <TableCell className="py-3 text-gray-600">{income.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gradient-to-r from-purple-600 to-purple-700 border-t-2 border-purple-300">
                    <TableCell colSpan={2} className="font-bold text-white py-4">합계</TableCell>
                    <TableCell className="text-right font-bold text-white py-4">
                      ₩{formatAmount(calculateTotal())}
                    </TableCell>
                    <TableCell className="py-4"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        
        {/* Footer with summary */}
        {extraIncomes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                총 <span className="font-semibold text-gray-800">{extraIncomes.length}</span>건
              </div>
              <div className="text-lg font-bold text-purple-700">
                총 진료외수입: ₩{formatAmount(calculateTotal())}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 