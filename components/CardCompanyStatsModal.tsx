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
import { toISODateString } from '@/lib/utils';

// 카드사별 통계 인터페이스
interface CardCompanyStats {
  cardCompany: string;
  count: number;
  amount: number;
  percentage: number;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  date: Date;
  type: 'daily' | 'monthly';
};

export default function CardCompanyStatsModal({ isOpen, onClose, title, date, type }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [cardStats, setCardStats] = useState<CardCompanyStats[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [displayMonth, setDisplayMonth] = useState('');

  // 모달이 열릴 때 월 표시 설정
  useEffect(() => {
    if (isOpen && type === 'monthly') {
      // YYYY년 MM월 형식으로 표시
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      setDisplayMonth(`${year}년 ${month}월`);
    }
  }, [isOpen, date, type]);

  // 카드사별 통계 정보 가져오기
  const fetchCardStats = async () => {
    setIsLoading(true);
    
    try {
      let dateParam;
      if (type === 'daily') {
        dateParam = toISODateString(date);
      } else {
        // YYYY-MM 형식으로 변환 (한국 시간대 고려)
        dateParam = toISODateString(date).substring(0, 7);
      }
      
      const response = await fetch(`/api/transactions/cardStats?type=${type}&date=${dateParam}`);
      
      if (!response.ok) {
        throw new Error('카드사별 통계 정보를 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      setCardStats(data.cardStats || []);
      setTotalAmount(data.totalAmount || 0);
    } catch (error) {
      console.error('카드사별 통계 조회 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 열릴 때 데이터 가져오기
  useEffect(() => {
    if (isOpen) {
      fetchCardStats();
    }
  }, [isOpen, date, type]);

  // 금액 형식화
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // 퍼센트 형식화
  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white rounded-2xl shadow-xl border border-gray-100">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {title}
              {type === 'monthly' && displayMonth && (
                <span className="ml-2 text-sm font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                  {displayMonth}
                </span>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="pt-2">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">데이터를 불러오는 중...</span>
              </div>
            </div>
          ) : cardStats.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-3 text-3xl opacity-50">💳</div>
              <div className="text-gray-500 font-medium">해당 기간에 카드 결제 내역이 없습니다.</div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
              <Table>
                <TableHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                  <TableRow className="border-b border-blue-200 hover:bg-blue-50">
                    <TableHead className="font-bold text-blue-800 py-3">카드사</TableHead>
                    <TableHead className="text-right font-bold text-blue-800 py-3">건수</TableHead>
                    <TableHead className="text-right font-bold text-blue-800 py-3">금액</TableHead>
                    <TableHead className="text-right font-bold text-blue-800 py-3">비율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardStats.map((stat, index) => (
                    <TableRow 
                      key={stat.cardCompany} 
                      className={`hover:bg-blue-50/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <TableCell className="py-3 font-medium text-gray-700">{stat.cardCompany}</TableCell>
                      <TableCell className="text-right py-3 text-gray-600">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm font-medium">
                          {stat.count}건
                        </span>
                      </TableCell>
                      <TableCell className="text-right py-3 font-semibold text-blue-700">
                        ₩{formatAmount(stat.amount)}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md text-sm font-medium">
                          {formatPercentage(stat.percentage)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gradient-to-r from-blue-600 to-blue-700 border-t-2 border-blue-300">
                    <TableCell className="font-bold text-white py-4">합계</TableCell>
                    <TableCell className="text-right font-bold text-white py-4">
                      <span className="bg-white/20 px-2 py-1 rounded-md">
                        {cardStats.reduce((sum, stat) => sum + stat.count, 0)}건
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-white py-4">
                      ₩{formatAmount(totalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-white py-4">
                      <span className="bg-white/20 px-2 py-1 rounded-md">100%</span>
                    </TableCell>
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