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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div>
          {isLoading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : cardStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              해당 기간에 카드 결제 내역이 없습니다.
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>카드사</TableHead>
                    <TableHead className="text-right">건수</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead className="text-right">비율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardStats.map((stat) => (
                    <TableRow key={stat.cardCompany}>
                      <TableCell>{stat.cardCompany}</TableCell>
                      <TableCell className="text-right">{stat.count}건</TableCell>
                      <TableCell className="text-right">₩{formatAmount(stat.amount)}</TableCell>
                      <TableCell className="text-right">{formatPercentage(stat.percentage)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-bold">합계</TableCell>
                    <TableCell className="text-right font-bold">
                      {cardStats.reduce((sum, stat) => sum + stat.count, 0)}건
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ₩{formatAmount(totalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-bold">100%</TableCell>
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