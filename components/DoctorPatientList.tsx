'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowDownUp, ArrowDown, ArrowUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { toISODateString } from '@/lib/utils';

// Transaction 타입 확장 (기존 Transaction 타입에 treatments 추가)
interface ExtendedTransaction extends Transaction {
  treatments?: Array<{
    doctor: string;
    treatmentType: string;
    paymentMethod: string;
    paymentAmount: number;
    cardCompany?: string;
    cashReceipt?: boolean;
  }>;
}

// 의사별로 트랜잭션 목록 그룹화 함수
const groupTransactionsByDoctor = (transactions: ExtendedTransaction[], doctorOrder: {value: string, order: number}[]) => {
  const grouped: Record<string, ExtendedTransaction[]> = {};
  
  transactions.forEach(transaction => {
    // treatments 배열에서 doctor 정보 가져오기
    const doctor = transaction.treatments && transaction.treatments.length > 0 
      ? transaction.treatments[0].doctor 
      : transaction.doctor;
      
    if (!grouped[doctor]) {
      grouped[doctor] = [];
    }
    grouped[doctor].push(transaction);
  });
  
  return grouped;
};

// 의사 목록 정렬 함수
const sortDoctors = (doctors: string[], doctorOrder: {value: string, order: number}[]) => {
  // 시스템 설정의 의사 순서를 기준으로 정렬
  return [...doctors].sort((a, b) => {
    const orderA = doctorOrder.find(d => d.value === a)?.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = doctorOrder.find(d => d.value === b)?.order ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
};

// ObjectId 변환 함수 (MongoDB 객체 처리)
const normalizeId = (transaction: any): ExtendedTransaction => {
  // _id가 객체인 경우 문자열로 변환
  if (transaction._id && typeof transaction._id === 'object' && transaction._id.toString) {
    return {
      ...transaction,
      _id: transaction._id.toString()
    };
  }
  return transaction as ExtendedTransaction;
};

type Props = {
  date: Date;
};

type SortField = 'chartNumber' | 'patientName' | 'treatmentType' | 'paymentAmount' | 'paymentMethod' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

export default function DoctorPatientList({ date }: Props) {
  const [transactions, setTransactions] = useState<ExtendedTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [currentTransaction, setCurrentTransaction] = useState<ExtendedTransaction | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<ExtendedTransaction>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [doctorOrder, setDoctorOrder] = useState<{value: string, order: number}[]>([]);
  
  // 의사 정보 불러오기 함수를 useCallback으로 감싸기
  const fetchDoctors = useCallback(async () => {
    try {
      const response = await fetch('/api/settings?type=doctor', {
        cache: 'default'
      });
      
      if (!response.ok) {
        throw new Error('의사 정보를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      // 의사 목록과 순서 정보 저장
      setDoctorOrder(data.settings.map((doctor: any, index: number) => ({
        value: doctor.value,
        order: doctor.order || index // order 값이 없으면 index를 사용
      })));
    } catch (err) {
      console.error('의사 정보 조회 오류:', err);
    }
  }, []);
  
  // 의사 정보 가져오기
  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);
  
  // 트랜잭션 데이터 조회
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const dateString = toISODateString(date); // 한국 시간 기준 YYYY-MM-DD 형식
        
        // 시작 날짜와 종료 날짜를 같은 날짜로 설정하여 정확한 날짜 필터링
        const response = await fetch(`/api/transactions?dateStart=${dateString}&dateEnd=${dateString}`, {
          cache: 'default'
        });
        
        if (!response.ok) {
          throw new Error('데이터를 가져오는데 실패했습니다.');
        }
        
        const data = await response.json();
        // MongoDB ObjectId 처리
        const normalizedTransactions = data.transactions.map(normalizeId);
        setTransactions(normalizedTransactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        console.error('트랜잭션 데이터 조회 오류:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [date]);
  
  // 정렬 함수
  const sortTransactions = (transactions: ExtendedTransaction[], field: SortField | null, direction: SortDirection) => {
    if (!field) return transactions;
    
    return [...transactions].sort((a, b) => {
      let valueA, valueB;
      
      // 필드에 따른 정렬 처리
      switch(field) {
        case 'chartNumber':
          valueA = a.chartNumber;
          valueB = b.chartNumber;
          break;
        case 'patientName':
          valueA = a.patientName;
          valueB = b.patientName;
          break;
        case 'treatmentType':
          valueA = a.treatmentType;
          valueB = b.treatmentType;
          break;
        case 'paymentAmount':
          valueA = a.paymentAmount;
          valueB = b.paymentAmount;
          break;
        case 'paymentMethod':
          valueA = a.paymentMethod;
          valueB = b.paymentMethod;
          break;
        case 'updatedAt':
          valueA = new Date(a.updatedAt).getTime();
          valueB = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }
      
      if (valueA < valueB) {
        return direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };
  
  // 정렬 열 변경 처리
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 같은 필드를 다시 클릭하면 정렬 방향 변경
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 필드를 클릭하면 해당 필드로 정렬하고 방향은 오름차순으로 설정
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // 수정 다이얼로그 열기
  const openEditDialog = (transaction: ExtendedTransaction) => {
    setCurrentTransaction(transaction);
    setEditFormData({
      chartNumber: transaction.chartNumber,
      patientName: transaction.patientName,
      treatmentType: transaction.treatmentType,
      paymentAmount: transaction.paymentAmount,
      paymentMethod: transaction.paymentMethod,
      doctor: transaction.doctor,
      isNew: transaction.isNew
    });
    setIsEditDialogOpen(true);
  };
  
  // 삭제 다이얼로그 열기
  const openDeleteDialog = (transaction: ExtendedTransaction) => {
    setCurrentTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };
  
  // 폼 유효성 검사
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!editFormData.chartNumber) {
      errors.chartNumber = '차트번호를 입력해주세요';
    }
    
    if (!editFormData.patientName) {
      errors.patientName = '환자 성명을 입력해주세요';
    }
    
    if (!editFormData.treatmentType) {
      errors.treatmentType = '진료 내용을 입력해주세요';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 수정 트랜잭션 처리
  const handleEditTransaction = async () => {
    if (!validateForm() || !currentTransaction) return;
    
    try {
      const response = await fetch(`/api/transactions/${currentTransaction._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });
      
      if (!response.ok) {
        throw new Error('트랜잭션 수정에 실패했습니다.');
      }
      
      // 트랜잭션 목록 업데이트
      setTransactions(prevTransactions => 
        prevTransactions.map(transaction => 
          transaction._id === currentTransaction._id 
            ? { ...transaction, ...editFormData } as ExtendedTransaction
            : transaction
        )
      );
      
      setIsEditDialogOpen(false);
      toast({
        title: '성공',
        description: '트랜잭션이 성공적으로 수정되었습니다.',
      });
    } catch (err) {
      console.error('트랜잭션 수정 오류:', err);
      toast({
        title: '오류',
        description: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };
  
  // 삭제 트랜잭션 처리
  const handleDeleteTransaction = async () => {
    if (!currentTransaction) return;
    
    try {
      const response = await fetch(`/api/transactions/${currentTransaction._id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('트랜잭션 삭제에 실패했습니다.');
      }
      
      // 트랜잭션 목록에서 삭제된 트랜잭션 제거
      setTransactions(prevTransactions => 
        prevTransactions.filter(transaction => transaction._id !== currentTransaction._id)
      );
      
      setIsDeleteDialogOpen(false);
      toast({
        title: '성공',
        description: '트랜잭션이 성공적으로 삭제되었습니다.',
      });
    } catch (err) {
      console.error('트랜잭션 삭제 오류:', err);
      toast({
        title: '오류',
        description: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };
  
  // 입력 변경 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    setEditFormData(prevData => ({
      ...prevData,
      [name]: type === 'number' ? parseFloat(value) : value,
    }));
    
    if (formErrors[name]) {
      setFormErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // 금액 형식화
  const formatAmount = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // 정렬 가능한 헤더 렌더링
  const renderSortableHeader = (label: string, field: SortField) => {
    return (
      <div 
        className="flex items-center gap-1 cursor-pointer" 
        onClick={() => handleSort(field)}
      >
        <span>{label}</span>
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="h-4 w-4 text-primary" />
          ) : (
            <ArrowDown className="h-4 w-4 text-primary" />
          )
        ) : (
          <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    );
  };
  
  // 결제 방법 포맷팅
  const formatPaymentMethod = (transaction: ExtendedTransaction) => {
    if (transaction.treatments && transaction.treatments.length > 0) {
      const treatment = transaction.treatments[0];
      
      if (treatment.paymentMethod === '현금' || treatment.paymentMethod === '계좌이체') {
        return (
          <div className="flex items-center gap-1">
            {treatment.paymentMethod}
            {treatment.cashReceipt ? (
              <Badge variant="outline" className="ml-1 text-xs">영수증 발행</Badge>
            ) : (
              <Badge variant="outline" className="ml-1 text-xs bg-gray-100">미발행</Badge>
            )}
          </div>
        );
      } else if (treatment.paymentMethod === '카드') {
        return (
          <div className="flex items-center gap-1">
            카드
            {treatment.cardCompany && (
              <Badge variant="outline" className="ml-1 text-xs">{treatment.cardCompany}</Badge>
            )}
          </div>
        );
      } else if (treatment.paymentMethod === '수납없음' || treatment.paymentAmount <= 0) {
        return <Badge variant="outline" className="bg-gray-100">수납없음</Badge>;
      }
      
      return treatment.paymentMethod;
    }
    
    // 기존 로직 (이전 버전 호환성 유지)
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
    } else if (!transaction.paymentMethod || transaction.paymentAmount <= 0) {
      return <Badge variant="outline" className="bg-gray-100">수납없음</Badge>;
    }
    
    return transaction.paymentMethod;
  };

  // 데이터 가공 - 의사별 환자 목록
  const sortedTransactions = useMemo(() => 
    sortTransactions(transactions, sortField, sortDirection),
    [transactions, sortField, sortDirection]
  );
  
  const groupedTransactions = useMemo(() => 
    sortedTransactions.length > 0 ? groupTransactionsByDoctor(sortedTransactions, doctorOrder) : {},
    [sortedTransactions, doctorOrder]
  );
  
  const doctorNames = useMemo(() => 
    sortDoctors(Object.keys(groupedTransactions), doctorOrder),
    [groupedTransactions, doctorOrder]
  );
  
  // 의사 수에 따라 동적으로 그리드 높이 계산
  const calculateGridTemplateRows = () => {
    const doctorCount = doctorNames.length;
    // 의사가 없거나 한 명이면 전체 높이 사용
    if (doctorCount <= 1) return 'minmax(0, 1fr)';
    
    // 의사 수에 따라 균등하게 높이 배분
    return `repeat(${doctorCount}, minmax(0, 1fr))`;
  };
  
  if (loading) {
    return (
      <Card className="w-full shadow-sm">
        <CardHeader>
          <CardTitle>진료 환자 목록</CardTitle>
          <CardDescription>데이터를 불러오는 중입니다...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full shadow-sm">
        <CardHeader>
          <CardTitle>진료 환자 목록</CardTitle>
          <CardDescription className="text-red-500">오류: {error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // 환자가 없는 경우에도 테이블 표시
  const EmptyDoctorSection = () => (
    <div className="min-h-0 flex flex-col overflow-hidden">
      <div className="bg-gray-100 p-3 font-medium sticky top-0 z-20">
        의사 목록 없음
      </div>
      <div className="flex-1 overflow-hidden">
        <Table className="w-full border-collapse">
          <TableHeader className="sticky top-0 bg-white z-10" style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
            <TableRow>
              <TableHead className="w-12">No.</TableHead>
              <TableHead className="w-24">차트번호</TableHead>
              <TableHead className="w-32">환자성명</TableHead>
              <TableHead>진료내용</TableHead>
              <TableHead className="w-40 text-right">수납금액</TableHead>
              <TableHead className="w-44">수납방법</TableHead>
              <TableHead className="w-24 text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody style={{
            display: 'block',
            height: '350px', // 7명의 환자 정보를 표시할 수 있는 높이로 증가
            overflowY: 'auto',
            width: '100%'
          }}>
            <TableRow style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
              <TableCell colSpan={7} className="h-[350px] text-center">
                해당 날짜에 등록된 환자가 없습니다.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
  
  return (
    <>
      <Card className="w-full shadow-sm">
        <CardHeader className="sticky top-0 bg-white z-30">
          <CardTitle>진료 환자 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {doctorNames.length > 0 ? (
            <div 
              className="grid gap-2" 
              style={{ 
                gridTemplateRows: calculateGridTemplateRows(),
                height: '100%',
                maxHeight: '100%'
              }}
            >
              {doctorNames.map(doctor => (
                <div key={doctor} className="min-h-0 flex flex-col overflow-hidden">
                  <div className="bg-gray-100 p-3 font-medium sticky top-0 z-20">
                    {doctor} 의사 ({groupedTransactions[doctor].length}명)
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <Table className="w-full border-collapse">
                      <TableHeader className="sticky top-0 bg-white z-10" style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
                        <TableRow>
                          <TableHead className="w-12">No.</TableHead>
                          <TableHead className="w-28">{renderSortableHeader('차트번호', 'chartNumber')}</TableHead>
                          <TableHead className="w-32">{renderSortableHeader('환자성명', 'patientName')}</TableHead>
                          <TableHead>{renderSortableHeader('진료내용', 'treatmentType')}</TableHead>
                          <TableHead className="w-28 text-right">{renderSortableHeader('수납금액', 'paymentAmount')}</TableHead>
                          <TableHead className="w-44">{renderSortableHeader('수납방법', 'paymentMethod')}</TableHead>
                          <TableHead className="w-24 text-right">관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody style={{
                        display: 'block',
                        height: '350px', // 7명의 환자 정보를 표시할 수 있는 높이로 증가
                        overflowY: 'auto',
                        width: '100%'
                      }}>
                        {groupedTransactions[doctor].map((transaction, index) => (
                          <TableRow key={transaction._id} style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
                            <TableCell className="py-2 w-12">{index + 1}</TableCell>
                            <TableCell className="py-2 w-24">{transaction.chartNumber}</TableCell>
                            <TableCell className="py-2 w-32">
                              <div className="flex items-center gap-1">
                                {transaction.patientName}
                                {transaction.isNew && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">신환</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 truncate">
                              {transaction.treatments && transaction.treatments.length > 0 
                                ? transaction.treatments[0].treatmentType
                                : transaction.treatmentType
                              }
                            </TableCell>
                            <TableCell className="py-2 text-right w-28">
                              {transaction.treatments && transaction.treatments.length > 0 
                                ? `${formatAmount(transaction.treatments[0].paymentAmount)}원`
                                : `${formatAmount(transaction.paymentAmount)}원`
                              }
                            </TableCell>
                            <TableCell className="py-2 w-44">{formatPaymentMethod(transaction)}</TableCell>
                            <TableCell className="py-2 text-right w-24">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(transaction)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(transaction)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyDoctorSection />
          )}
        </CardContent>
      </Card>
      
      {/* 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>환자 정보 수정</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="chartNumber" className="text-right">차트번호</Label>
              <div className="col-span-3">
                <Input
                  id="chartNumber"
                  name="chartNumber"
                  value={editFormData.chartNumber || ''}
                  onChange={handleInputChange}
                  className={formErrors.chartNumber ? "border-red-500" : ""}
                />
                {formErrors.chartNumber && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.chartNumber}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="patientName" className="text-right">환자성명</Label>
              <div className="col-span-3">
                <Input
                  id="patientName"
                  name="patientName"
                  value={editFormData.patientName || ''}
                  onChange={handleInputChange}
                  className={formErrors.patientName ? "border-red-500" : ""}
                />
                {formErrors.patientName && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.patientName}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="treatmentType" className="text-right">진료내용</Label>
              <div className="col-span-3">
                <Input
                  id="treatmentType"
                  name="treatmentType"
                  value={editFormData.treatmentType || ''}
                  onChange={handleInputChange}
                  className={formErrors.treatmentType ? "border-red-500" : ""}
                />
                {formErrors.treatmentType && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.treatmentType}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentAmount" className="text-right">수납금액</Label>
              <div className="col-span-3">
                <Input
                  id="paymentAmount"
                  name="paymentAmount"
                  type="number"
                  value={editFormData.paymentAmount || 0}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>취소</Button>
            <Button onClick={handleEditTransaction}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 삭제 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>환자 정보 삭제</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>정말로 이 환자 정보를 삭제하시겠습니까?</p>
            <p className="text-sm text-muted-foreground mt-2">
              이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleDeleteTransaction}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 