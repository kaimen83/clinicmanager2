'use client';

import { useState, useEffect } from 'react';
import { Transaction } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ChevronDown, ChevronUp, ArrowDownUp, ArrowDown, ArrowUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

// 의사별로 트랜잭션 목록 그룹화 함수
const groupTransactionsByDoctor = (transactions: Transaction[]) => {
  const grouped: Record<string, Transaction[]> = {};
  
  transactions.forEach(transaction => {
    if (!grouped[transaction.doctor]) {
      grouped[transaction.doctor] = [];
    }
    grouped[transaction.doctor].push(transaction);
  });
  
  return grouped;
};

// ObjectId 변환 함수 (MongoDB 객체 처리)
const normalizeId = (transaction: any): Transaction => {
  // _id가 객체인 경우 문자열로 변환
  if (transaction._id && typeof transaction._id === 'object' && transaction._id.toString) {
    return {
      ...transaction,
      _id: transaction._id.toString()
    };
  }
  return transaction as Transaction;
};

type Props = {
  date: Date;
};

type SortField = 'chartNumber' | 'patientName' | 'treatmentType' | 'paymentAmount' | 'paymentMethod' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

export default function PatientList({ date }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDoctors, setExpandedDoctors] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Transaction>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        
        // 시작 날짜와 종료 날짜를 같은 날짜로 설정하여 정확한 날짜 필터링
        const response = await fetch(`/api/transactions?dateStart=${dateString}&dateEnd=${dateString}`);
        
        if (!response.ok) {
          throw new Error('데이터를 가져오는데 실패했습니다.');
        }
        
        const data = await response.json();
        // MongoDB ObjectId 처리
        const normalizedTransactions = data.transactions.map(normalizeId);
        setTransactions(normalizedTransactions);
        
        console.log(`${dateString} 날짜로 데이터 조회 완료:`, normalizedTransactions.length);
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
  const sortTransactions = (transactions: Transaction[], field: SortField | null, direction: SortDirection) => {
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
  
  // 트랜잭션이 있을 때만 그룹화 및 정렬 처리
  const sortedTransactions = sortTransactions(transactions, sortField, sortDirection);
  const groupedTransactions = sortedTransactions.length > 0 ? groupTransactionsByDoctor(sortedTransactions) : {};
  const doctorNames = Object.keys(groupedTransactions);
  
  // 초기 상태는 모든 의사의 목록이 펼쳐져 있음
  useEffect(() => {
    const initialExpandedState: Record<string, boolean> = {};
    doctorNames.forEach(doctor => {
      initialExpandedState[doctor] = true;
    });
    setExpandedDoctors(initialExpandedState);
  }, [transactions]);
  
  const toggleDoctorExpand = (doctor: string) => {
    setExpandedDoctors(prev => ({
      ...prev,
      [doctor]: !prev[doctor]
    }));
  };
  
  // 수정 다이얼로그 열기
  const openEditDialog = (transaction: Transaction) => {
    setCurrentTransaction(transaction);
    setEditFormData({
      chartNumber: transaction.chartNumber,
      patientName: transaction.patientName,
      treatmentType: transaction.treatmentType,
      paymentAmount: transaction.paymentAmount,
      paymentMethod: transaction.paymentMethod,
      cardCompany: transaction.cardCompany,
      cashReceipt: transaction.cashReceipt
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };
  
  // 삭제 다이얼로그 열기
  const openDeleteDialog = (transaction: Transaction) => {
    setCurrentTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };
  
  // 폼 유효성 검사
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!editFormData.chartNumber) {
      errors.chartNumber = '차트번호를 입력해주세요.';
    }
    
    if (!editFormData.patientName) {
      errors.patientName = '환자성명을 입력해주세요.';
    }
    
    if (!editFormData.treatmentType) {
      errors.treatmentType = '진료내용을 입력해주세요.';
    }
    
    if (editFormData.paymentAmount === undefined || editFormData.paymentAmount < 0) {
      errors.paymentAmount = '올바른 수납금액을 입력해주세요.';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 트랜잭션 수정 처리
  const handleEditTransaction = async () => {
    if (!currentTransaction) return;
    if (!validateForm()) return;
    
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
      
      const updatedTransaction = await response.json();
      const normalizedTransaction = normalizeId(updatedTransaction);
      
      // 수정된 트랜잭션으로 상태 업데이트
      setTransactions(prevTransactions => 
        prevTransactions.map(t => t._id === currentTransaction._id ? normalizedTransaction : t)
      );
      
      setIsEditDialogOpen(false);
      toast({
        title: "환자 정보가 업데이트되었습니다.",
        description: `${normalizedTransaction.patientName} 환자의 정보가 성공적으로 수정되었습니다.`,
      });
    } catch (err) {
      console.error('트랜잭션 수정 오류:', err);
      toast({
        title: "오류가 발생했습니다.",
        description: "환자 정보 수정 중 오류가 발생했습니다. 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  };
  
  // 트랜잭션 삭제 처리
  const handleDeleteTransaction = async () => {
    if (!currentTransaction) return;
    
    try {
      const response = await fetch(`/api/transactions/${currentTransaction._id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('트랜잭션 삭제에 실패했습니다.');
      }
      
      // 삭제된 트랜잭션을 상태에서 제거
      setTransactions(prevTransactions => 
        prevTransactions.filter(t => t._id !== currentTransaction._id)
      );
      
      setIsDeleteDialogOpen(false);
      toast({
        title: "환자 정보가 삭제되었습니다.",
        description: `${currentTransaction.patientName} 환자의 정보가 성공적으로 삭제되었습니다.`,
      });
    } catch (err) {
      console.error('트랜잭션 삭제 오류:', err);
      toast({
        title: "오류가 발생했습니다.",
        description: "환자 정보 삭제 중 오류가 발생했습니다. 다시 시도해 주세요.",
        variant: "destructive",
      });
    }
  };
  
  // 입력 필드 변경 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setEditFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setEditFormData(prev => ({
        ...prev,
        [name]: parseFloat(value)
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // 입력 시 해당 필드의 오류 메시지 삭제
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };
  
  // 정렬 헤더 렌더링 함수
  const renderSortableHeader = (label: string, field: SortField) => {
    const isSorted = sortField === field;
    
    return (
      <div
        className="flex items-center gap-1 cursor-pointer"
        onClick={() => handleSort(field)}
      >
        <span>{label}</span>
        {isSorted ? (
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
    } else if (!transaction.paymentMethod || transaction.paymentAmount <= 0) {
      return <Badge variant="outline" className="bg-gray-100">수납없음</Badge>;
    }
    
    return transaction.paymentMethod;
  };
  
  if (loading) {
    return (
      <Card className="w-full h-full shadow-sm">
        <CardHeader>
          <CardTitle>진료 환자 목록</CardTitle>
          <CardDescription>데이터를 불러오는 중입니다...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full h-full shadow-sm">
        <CardHeader>
          <CardTitle>진료 환자 목록</CardTitle>
          <CardDescription className="text-red-500">오류: {error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (transactions.length === 0) {
    return (
      <Card className="w-full h-full shadow-sm">
        <CardHeader>
          <CardTitle>진료 환자 목록</CardTitle>
          <CardDescription>
            {date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}의 진료 내역
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center p-8">
          해당 날짜에 등록된 환자가 없습니다.
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="w-full h-full shadow-sm">
        <CardHeader className="sticky top-0 bg-white z-10">
          <CardTitle>진료 환자 목록</CardTitle>
          <CardDescription>
            {date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}의 진료 내역
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {doctorNames.length > 0 ? (
            doctorNames.map(doctor => (
              <div key={doctor} className="mb-4">
                <div 
                  className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer sticky top-[88px] z-10"
                  onClick={() => toggleDoctorExpand(doctor)}
                >
                  <h3 className="font-medium">{doctor} 의사 ({groupedTransactions[doctor].length}명)</h3>
                  {expandedDoctors[doctor] ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                
                {expandedDoctors[doctor] && (
                  <div className="overflow-x-auto">
                    <div className="max-h-[calc(56px*7)] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow>
                            <TableHead className="w-12 cursor-pointer" onClick={() => handleSort('updatedAt')}>
                              <div className="flex items-center gap-1">
                                <span>No.</span>
                                {sortField === 'updatedAt' ? (
                                  sortDirection === 'asc' ? (
                                    <ArrowUp className="h-4 w-4 text-primary" />
                                  ) : (
                                    <ArrowDown className="h-4 w-4 text-primary" />
                                  )
                                ) : (
                                  <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </TableHead>
                            <TableHead>{renderSortableHeader('차트번호', 'chartNumber')}</TableHead>
                            <TableHead>{renderSortableHeader('환자성명', 'patientName')}</TableHead>
                            <TableHead>{renderSortableHeader('진료내용', 'treatmentType')}</TableHead>
                            <TableHead className="text-right">{renderSortableHeader('수납금액', 'paymentAmount')}</TableHead>
                            <TableHead>{renderSortableHeader('수납방법', 'paymentMethod')}</TableHead>
                            <TableHead className="text-right">관리</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedTransactions[doctor].map((transaction, index) => (
                            <TableRow key={transaction._id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{transaction.chartNumber}</TableCell>
                              <TableCell>{transaction.patientName}</TableCell>
                              <TableCell>{transaction.treatmentType}</TableCell>
                              <TableCell className="text-right">{formatAmount(transaction.paymentAmount)}원</TableCell>
                              <TableCell>{formatPaymentMethod(transaction)}</TableCell>
                              <TableCell className="text-right">
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
                )}
              </div>
            ))
          ) : (
            <div className="text-center p-8">
              해당 날짜에 등록된 의사가 없습니다.
            </div>
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
                  className={formErrors.paymentAmount ? "border-red-500" : ""}
                />
                {formErrors.paymentAmount && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.paymentAmount}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentMethod" className="text-right">수납방법</Label>
              <div className="col-span-3">
                <Input
                  id="paymentMethod"
                  name="paymentMethod"
                  value={editFormData.paymentMethod || ''}
                  onChange={handleInputChange}
                  className={formErrors.paymentMethod ? "border-red-500" : ""}
                />
                {formErrors.paymentMethod && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.paymentMethod}</p>
                )}
              </div>
            </div>
            {editFormData.paymentMethod === '카드' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cardCompany" className="text-right">카드회사</Label>
                <Input
                  id="cardCompany"
                  name="cardCompany"
                  value={editFormData.cardCompany || ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
            )}
            {(editFormData.paymentMethod === '현금' || editFormData.paymentMethod === '계좌이체') && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">현금영수증</Label>
                <div className="flex items-center gap-2 col-span-3">
                  <input
                    type="checkbox"
                    id="cashReceipt"
                    name="cashReceipt"
                    checked={editFormData.cashReceipt || false}
                    onChange={handleInputChange}
                  />
                  <Label htmlFor="cashReceipt">발행</Label>
                </div>
              </div>
            )}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEditTransaction}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>환자 정보 삭제</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>{currentTransaction?.patientName} 환자의 정보를 삭제하시겠습니까?</p>
            <p className="text-sm text-gray-500 mt-2">이 작업은 되돌릴 수 없습니다.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteTransaction}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 