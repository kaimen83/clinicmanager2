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
import { Search, Users, Calendar, Stethoscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  type: 'daily' | 'monthly';
};

// 그룹화된 트랜잭션 타입
type GroupedTransaction = {
  chartNumber: string;
  patientName: string;
  date: string;
  doctor: string;
  visitPath: string;
  treatmentTypes: string[];
  totalPaymentAmount: number;
  totalConsultationAmount: number;
  transactions: Transaction[];
};

export default function NewPatientListModal({ isOpen, onClose, date, type }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransaction[]>([]);
  const [filteredGroupedTransactions, setFilteredGroupedTransactions] = useState<GroupedTransaction[]>([]);

  // 신환 트랜잭션 목록 조회
  const fetchNewPatientTransactions = async () => {
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
        isNew: 'true', // 신환만 필터링
      });
      
      const response = await fetch(`/api/transactions/stats?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('신환 내원 정보를 가져오는데 실패했습니다.');
      }
      
      const data = await response.json();
      const newPatientTransactions = (data.transactions || [])
        .filter((t: Transaction) => t.isNew)
        .sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
      setTransactions(newPatientTransactions);
      
      // 같은 날짜, 같은 환자별로 그룹화
      const grouped = groupTransactionsByPatientAndDate(newPatientTransactions);
      setGroupedTransactions(grouped);
      setFilteredGroupedTransactions(grouped);
    } catch (error) {
      console.error('신환 내원 정보 조회 에러:', error);
      setTransactions([]);
      setGroupedTransactions([]);
      setFilteredGroupedTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 같은 날짜, 같은 환자별로 트랜잭션 그룹화
  const groupTransactionsByPatientAndDate = (transactions: Transaction[]): GroupedTransaction[] => {
    const groups = new Map<string, GroupedTransaction>();
    
    transactions.forEach(transaction => {
      const dateStr = format(new Date(transaction.date), 'yyyy-MM-dd');
      const key = `${transaction.chartNumber}_${dateStr}`;
      
      if (groups.has(key)) {
        const existing = groups.get(key)!;
        existing.treatmentTypes.push(transaction.treatmentType);
        existing.totalPaymentAmount += transaction.paymentAmount;
        existing.transactions.push(transaction);
        
        // 상담금액 계산 - isConsultation이 true인 경우 해당 트랜잭션의 paymentAmount를 상담금액으로 간주
        if (transaction.isConsultation) {
          existing.totalConsultationAmount += transaction.paymentAmount;
        }
      } else {
        groups.set(key, {
          chartNumber: transaction.chartNumber,
          patientName: transaction.patientName,
          date: dateStr,
          doctor: transaction.doctor,
          visitPath: transaction.visitPath,
          treatmentTypes: [transaction.treatmentType],
          totalPaymentAmount: transaction.paymentAmount,
          totalConsultationAmount: transaction.isConsultation ? transaction.paymentAmount : 0,
          transactions: [transaction]
        });
      }
    });
    
    // 중복 제거 및 정렬
    Array.from(groups.values()).forEach(group => {
      group.treatmentTypes = [...new Set(group.treatmentTypes)];
    });
    
    return Array.from(groups.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // 모달이 열릴 때 데이터 조회
  useEffect(() => {
    if (isOpen) {
      fetchNewPatientTransactions();
      setSearchTerm('');
    }
  }, [isOpen, date, type]);

  // 검색 필터링
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredGroupedTransactions(groupedTransactions);
    } else {
      const filtered = groupedTransactions.filter(group =>
        group.chartNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.treatmentTypes.some(type => type.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredGroupedTransactions(filtered);
    }
  }, [searchTerm, groupedTransactions]);

  // 통화 포맷팅
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  // 날짜 포맷팅 (시간 제외)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'MM/dd', { locale: ko });
  };

  // 제목 생성
  const getModalTitle = () => {
    if (type === 'daily') {
      return `신환 내원 정보 (${format(date, 'yyyy년 MM월 dd일', { locale: ko })})`;
    } else {
      return `신환 내원 정보 (${format(date, 'yyyy년 MM월', { locale: ko })})`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Users className="h-5 w-5 text-blue-600" />
            {getModalTitle()}
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
              총 {filteredGroupedTransactions.length}명
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* 검색창 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="차트번호, 환자명, 담당의, 진료유형으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-slate-600">신환 내원 정보를 불러오는 중...</div>
          </div>
        )}

        {/* 데이터가 없는 경우 */}
        {!isLoading && filteredGroupedTransactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Users className="h-12 w-12 mb-3 text-slate-300" />
            <p className="text-lg font-medium mb-1">신환 내원 정보가 없습니다</p>
            <p className="text-sm text-slate-400">
              {searchTerm ? '검색 조건에 맞는 신환이 없습니다.' : '해당 기간에 신환 내원이 없습니다.'}
            </p>
          </div>
        )}

        {/* 테이블 */}
        {!isLoading && filteredGroupedTransactions.length > 0 && (
          <div className="rounded-lg border overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-24 font-semibold text-slate-700">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      내원일
                    </div>
                  </TableHead>
                  <TableHead className="w-28 font-semibold text-slate-700">차트번호</TableHead>
                  <TableHead className="w-24 font-semibold text-slate-700">환자명</TableHead>
                  <TableHead className="w-20 font-semibold text-slate-700">담당의</TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    <div className="flex items-center gap-1">
                      <Stethoscope className="h-4 w-4" />
                      진료유형
                    </div>
                  </TableHead>
                  <TableHead className="w-32 font-semibold text-slate-700 text-right">상담금액</TableHead>
                  <TableHead className="w-32 font-semibold text-slate-700 text-right">수납금액</TableHead>
                  <TableHead className="w-24 font-semibold text-slate-700">내원경로</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroupedTransactions.map((group, index) => {
                  return (
                    <TableRow 
                      key={`${group.chartNumber}_${group.date}`} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-700">
                        {formatDate(group.date)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-600">
                        {group.chartNumber}
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        {group.patientName}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {group.doctor}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {group.treatmentTypes.map((type, typeIndex) => (
                            <Badge 
                              key={typeIndex} 
                              variant="outline" 
                              className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                            >
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {group.totalConsultationAmount > 0 ? (
                          <span className="text-emerald-600">
                            ₩{formatCurrency(group.totalConsultationAmount)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-800">
                        ₩{formatCurrency(group.totalPaymentAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                          {group.visitPath}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 통계 요약 */}
        {!isLoading && filteredGroupedTransactions.length > 0 && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-slate-600">총 신환</div>
                <div className="text-lg font-semibold text-slate-800">
                  {filteredGroupedTransactions.length}명
                </div>
              </div>
              <div className="text-center">
                <div className="text-slate-600">총 상담금액</div>
                <div className="text-lg font-semibold text-emerald-600">
                  ₩{formatCurrency(
                    filteredGroupedTransactions.reduce((sum, group) => sum + group.totalConsultationAmount, 0)
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-slate-600">총 수납금액</div>
                <div className="text-lg font-semibold text-slate-800">
                  ₩{formatCurrency(
                    filteredGroupedTransactions.reduce((sum, group) => sum + group.totalPaymentAmount, 0)
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}