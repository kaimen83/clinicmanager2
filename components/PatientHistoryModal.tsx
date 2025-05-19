'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Transaction } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type Props = {
  isOpen: boolean;
  chartNumber: string;
  patientName: string;
  onClose: () => void;
};

// 트랜잭션 데이터의 ObjectId 처리를 위한 유틸 함수
const normalizeId = (transaction: any): Transaction => {
  return {
    ...transaction,
    _id: transaction._id || transaction.id
  };
};

export default function PatientHistoryModal({
  isOpen,
  chartNumber,
  patientName,
  onClose
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    if (isOpen && chartNumber) {
      setLoading(true);
      setError(null);
      
      // 환자 내원 이력 조회 API 호출
      fetch(`/api/transactions/patient/${chartNumber}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('환자 이력을 조회할 수 없습니다.');
          }
          return response.json();
        })
        .then(data => {
          // ObjectId 정규화 처리
          const normalizedTransactions = data.map(normalizeId);
          // 날짜 역순 정렬 (최신 내원 이력이 상단에 표시)
          setTransactions(normalizedTransactions.sort((a: Transaction, b: Transaction) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          ));
        })
        .catch(err => {
          console.error('환자 이력 조회 오류:', err);
          setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, chartNumber]);
  
  // 수납방법 포맷팅 함수
  const formatPaymentMethod = (transaction: Transaction) => {
    if (transaction.paymentMethod === '현금' || transaction.paymentMethod === '계좌이체') {
      return (
        <div className="flex items-center gap-1">
          {transaction.paymentMethod}
          {transaction.cashReceipt ? (
            <Badge variant="outline" className="ml-1 text-xs">영수증 발행</Badge>
          ) : (
            <Badge variant="outline" className="ml-1 text-xs bg-gray-100">미발행</Badge>
          )}
        </div>
      );
    } else if (transaction.paymentMethod === '카드') {
      return (
        <div className="flex items-center gap-1">
          카드
          {transaction.cardCompany && (
            <Badge variant="outline" className="ml-1 text-xs">{transaction.cardCompany}</Badge>
          )}
        </div>
      );
    }
    
    return transaction.paymentMethod;
  };
  
  // 금액 포맷팅 함수
  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{patientName} ({chartNumber}) 내원 이력</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">정보를 불러오는 중입니다...</span>
          </div>
        ) : error ? (
          <div className="py-4 text-center text-red-500">
            <p>{error}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-4 text-center text-gray-500">
            <p>내원 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>내원일자</TableHead>
                  <TableHead>진료의</TableHead>
                  <TableHead>진료내용</TableHead>
                  <TableHead className="text-right">수납금액</TableHead>
                  <TableHead>수납방법</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(transaction => (
                  <TableRow 
                    key={transaction._id}
                    className={transaction.isNew ? 'bg-blue-50' : ''}
                  >
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                      {transaction.isNew && (
                        <Badge variant="outline" className="ml-2 bg-blue-100">신환</Badge>
                      )}
                    </TableCell>
                    <TableCell>{transaction.doctor}</TableCell>
                    <TableCell>{transaction.treatmentType}</TableCell>
                    <TableCell className="text-right">{formatAmount(transaction.paymentAmount)}원</TableCell>
                    <TableCell>{formatPaymentMethod(transaction)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 