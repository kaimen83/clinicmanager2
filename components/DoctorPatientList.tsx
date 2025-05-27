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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { toISODateString } from '@/lib/utils';
import { useDateContext } from '@/lib/context/dateContext';

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

// 의사별 통계 계산 함수
const calculateDoctorStats = (transactions: ExtendedTransaction[]) => {
  const uniquePatients = new Set<string>();
  const uniqueNewPatients = new Set<string>();
  let totalAmount = 0;
  
  transactions.forEach(transaction => {
    // 차트번호로 중복 제거
    uniquePatients.add(transaction.chartNumber);
    
    if (transaction.isNew) {
      uniqueNewPatients.add(transaction.chartNumber);
    }
    
    // 수납금액 합계 (treatments 배열 우선, 없으면 기존 필드 사용)
    const paymentAmount = transaction.treatments && transaction.treatments.length > 0 
      ? transaction.treatments[0].paymentAmount 
      : transaction.paymentAmount;
    
    // 문자열로 저장된 경우를 대비해 명시적으로 숫자로 변환
    totalAmount += Number(paymentAmount) || 0;
  });
  
  return {
    patientCount: uniquePatients.size,
    newPatientCount: uniqueNewPatients.size,
    totalAmount
  };
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
  const { refreshTrigger, triggerRefresh, triggerCashRefresh, triggerStatsRefresh } = useDateContext();
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
  
  // 수납금액 입력 관리를 위한 상태
  const [paymentAmountDisplay, setPaymentAmountDisplay] = useState('');
  const [isPaymentAmountFocused, setIsPaymentAmountFocused] = useState(false);
  
  // 설정 데이터 상태
  const [visitPaths, setVisitPaths] = useState<{value: string}[]>([]);
  const [doctors, setDoctors] = useState<{value: string}[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<{value: string}[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{value: string}[]>([]);
  const [cardCompanies, setCardCompanies] = useState<{value: string}[]>([]);
  
  // 설정 데이터 불러오기 함수들
  const fetchSettings = useCallback(async () => {
    try {
      // 내원경로 데이터 가져오기
      const visitPathResponse = await fetch('/api/settings?type=visitPath');
      if (visitPathResponse.ok) {
        const data = await visitPathResponse.json();
        setVisitPaths(data.settings || []);
      }

      // 의사 데이터 가져오기
      const doctorResponse = await fetch('/api/settings?type=doctor');
      if (doctorResponse.ok) {
        const data = await doctorResponse.json();
        setDoctors(data.settings || []);
        // 의사 목록과 순서 정보 저장
        setDoctorOrder(data.settings.map((doctor: any, index: number) => ({
          value: doctor.value,
          order: doctor.order || index // order 값이 없으면 index를 사용
        })));
      }

      // 진료내용 데이터 가져오기
      const treatmentResponse = await fetch('/api/settings?type=treatmentType');
      if (treatmentResponse.ok) {
        const data = await treatmentResponse.json();
        setTreatmentTypes(data.settings || []);
      }

      // 수납방법 데이터 가져오기
      const paymentMethodResponse = await fetch('/api/settings?type=paymentMethod');
      if (paymentMethodResponse.ok) {
        const data = await paymentMethodResponse.json();
        setPaymentMethods(data.settings || []);
      }

      // 카드사 데이터 가져오기
      const cardCompanyResponse = await fetch('/api/settings?type=cardCompany');
      if (cardCompanyResponse.ok) {
        const data = await cardCompanyResponse.json();
        setCardCompanies(data.settings || []);
      }
    } catch (err) {
      console.error('설정 데이터 조회 오류:', err);
    }
  }, []);
  
  // 설정 데이터 가져오기
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);
  
  // 수납금액 표시값 업데이트
  useEffect(() => {
    if (!isPaymentAmountFocused) {
      const amount = editFormData.paymentAmount || 0;
      if (amount === 0) {
        setPaymentAmountDisplay('');
      } else {
        setPaymentAmountDisplay(amount.toLocaleString());
      }
    }
  }, [editFormData.paymentAmount, isPaymentAmountFocused]);
  
  // 트랜잭션 데이터 조회
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const dateString = toISODateString(date); // 한국 시간 기준 YYYY-MM-DD 형식
        
        // 시작 날짜와 종료 날짜를 같은 날짜로 설정하여 정확한 날짜 필터링
        // limit을 1000으로 설정하여 하루 진료하는 모든 환자 데이터를 가져옴
        const response = await fetch(`/api/transactions?dateStart=${dateString}&dateEnd=${dateString}&limit=1000`, {
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
  }, [date, refreshTrigger]);
  
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
      visitPath: transaction.visitPath,
      doctor: transaction.doctor,
      treatmentType: transaction.treatmentType,
      isNew: transaction.isNew,
      isConsultation: transaction.isConsultation,
      paymentMethod: transaction.paymentMethod,
      cardCompany: transaction.cardCompany || '',
      paymentAmount: transaction.paymentAmount,
      notes: transaction.notes || '',
      cashReceipt: transaction.cashReceipt
    });
    setFormErrors({});
    
    // 수납금액 표시값 초기화
    setIsPaymentAmountFocused(false);
    const amount = transaction.paymentAmount || 0;
    if (amount === 0) {
      setPaymentAmountDisplay('');
    } else {
      setPaymentAmountDisplay(amount.toLocaleString());
    }
    
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
    
    if (!editFormData.treatmentType) {
      errors.treatmentType = '진료 내용을 입력해주세요';
    }
    
    if (!editFormData.doctor) {
      errors.doctor = '진료의를 선택해주세요';
    }
    
    if (!editFormData.paymentMethod) {
      errors.paymentMethod = '수납방법을 선택해주세요';
    }
    
    if (editFormData.paymentMethod === '카드' && !editFormData.cardCompany) {
      errors.cardCompany = '카드사를 선택해주세요';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 수정 트랜잭션 처리
  const handleEditTransaction = async () => {
    if (!validateForm() || !currentTransaction) return;
    
    try {
      // treatments 배열도 함께 업데이트하도록 데이터 구성
      const updateData = {
        ...editFormData,
        // treatments 배열이 있는 경우 함께 업데이트
        treatments: [{
          doctor: editFormData.doctor,
          treatmentType: editFormData.treatmentType,
          paymentMethod: editFormData.paymentMethod,
          cardCompany: editFormData.cardCompany || '',
          cashReceipt: editFormData.cashReceipt || false,
          paymentAmount: editFormData.paymentAmount || 0,
          notes: editFormData.notes || ''
        }]
      };

      const response = await fetch(`/api/transactions/${currentTransaction._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error('트랜잭션 수정에 실패했습니다.');
      }
      
      // 다이얼로그 닫기
      setIsEditDialogOpen(false);
      
      // 데이터 새로고침 (전체 데이터를 다시 불러와서 최신 상태 반영)
      triggerRefresh(); // 데이터 새로고침
      triggerCashRefresh(); // 시재 데이터 새로고침
      triggerStatsRefresh(); // 통계 데이터 새로고침
      
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
      triggerRefresh(); // 데이터 새로고침
      triggerCashRefresh(); // 시재 데이터 새로고침
      triggerStatsRefresh(); // 통계 데이터 새로고침
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // 수납방법이 "수납없음"일 때 수납금액 변경 방지
    if (name === 'paymentAmount' && editFormData.paymentMethod === '수납없음') {
      return;
    }
    
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

  // Select 변경 처리
  const handleSelectChange = (name: string, value: string) => {
    setEditFormData(prevData => {
      const newData = {
        ...prevData,
        [name]: value,
      };
      
      // 수납방법이 "수납없음"으로 변경되면 수납금액을 0으로 설정
      if (name === 'paymentMethod' && value === '수납없음') {
        newData.paymentAmount = 0;
        // 수납금액 표시값도 초기화
        setPaymentAmountDisplay('');
        setIsPaymentAmountFocused(false);
      }
      
      return newData;
    });
    
    if (formErrors[name]) {
      setFormErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Checkbox 변경 처리
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setEditFormData(prevData => ({
      ...prevData,
      [name]: checked,
    }));
  };
  
  // 금액 형식화
  const formatAmount = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // 숫자만 입력 허용하는 함수
  const formatNumberInput = (value: string): string => {
    // 숫자가 아닌 문자 제거
    const numbersOnly = value.replace(/[^\d]/g, '');
    // 천단위 구분자 추가
    return numbersOnly ? parseInt(numbersOnly).toLocaleString() : '';
  };

  // 수납금액 입력 처리
  const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 수납방법이 "수납없음"일 때 변경 방지
    if (editFormData.paymentMethod === '수납없음') {
      return;
    }
    
    const inputValue = e.target.value;
    const formattedValue = formatNumberInput(inputValue);
    setPaymentAmountDisplay(formattedValue);
    
    // 숫자 값으로 변환하여 상태 업데이트
    const numericValue = formattedValue.replace(/[^\d]/g, '');
    const amount = numericValue ? parseInt(numericValue) : 0;
    
    setEditFormData(prevData => ({
      ...prevData,
      paymentAmount: amount,
    }));
    
    // 오류 메시지 삭제
    if (formErrors.paymentAmount) {
      setFormErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        delete newErrors.paymentAmount;
        return newErrors;
      });
    }
  };

  // 수납금액 포커스 처리
  const handlePaymentAmountFocus = () => {
    // 수납방법이 "수납없음"일 때 포커스 방지
    if (editFormData.paymentMethod === '수납없음') {
      return;
    }
    
    setIsPaymentAmountFocused(true);
    setPaymentAmountDisplay(''); // 포커스 시 값 초기화
  };

  // 수납금액 블러 처리
  const handlePaymentAmountBlur = () => {
    setIsPaymentAmountFocused(false);
    // 현재 값으로 다시 포맷팅
    const amount = editFormData.paymentAmount || 0;
    if (amount === 0) {
      setPaymentAmountDisplay('');
    } else {
      setPaymentAmountDisplay(amount.toLocaleString());
    }
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
            height: '336px', // 7명의 환자가 보이도록 고정 높이 설정 (48px * 7 = 336px)
            overflowY: 'auto',
            width: '100%'
          }}>
            <TableRow style={{ display: 'table', width: '100%', tableLayout: 'fixed' }}>
              <TableCell colSpan={7} className="h-[336px] text-center">
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
                  <div className="bg-gray-100 p-3 sticky top-0 z-20 flex justify-between items-center">
                    <div className="font-medium">{doctor} 의사</div>
                    <div className="text-sm text-gray-600">
                      {(() => {
                        const stats = calculateDoctorStats(groupedTransactions[doctor]);
                        return `환자 ${stats.patientCount}명 | 신환 ${stats.newPatientCount}명 | 수납 ${stats.totalAmount.toLocaleString()}원`;
                      })()}
                    </div>
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
                        height: '336px', // 7명의 환자가 보이도록 고정 높이 설정 (48px * 7 = 336px)
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>환자 정보 수정</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4 py-4">
            {/* 차트번호 (읽기 전용) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="chartNumber" className="text-right">차트번호</Label>
              <div className="col-span-3">
                <Input
                  id="chartNumber"
                  name="chartNumber"
                  value={editFormData.chartNumber || ''}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>

            {/* 환자성명 (읽기 전용) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="patientName" className="text-right">환자성명</Label>
              <div className="col-span-3">
                <Input
                  id="patientName"
                  name="patientName"
                  value={editFormData.patientName || ''}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>

            {/* 내원경로 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="visitPath" className="text-right">내원경로</Label>
              <div className="col-span-3">
                <Select value={editFormData.visitPath || ''} onValueChange={(value) => handleSelectChange('visitPath', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="내원경로를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {visitPaths.map((path) => (
                      <SelectItem key={path.value} value={path.value}>
                        {path.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 진료의 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doctor" className="text-right">진료의 <span className="text-red-500">*</span></Label>
              <div className="col-span-3">
                <Select value={editFormData.doctor || ''} onValueChange={(value) => handleSelectChange('doctor', value)}>
                  <SelectTrigger className={formErrors.doctor ? "border-red-500" : ""}>
                    <SelectValue placeholder="진료의를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.value} value={doctor.value}>
                        {doctor.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.doctor && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.doctor}</p>
                )}
              </div>
            </div>

            {/* 진료내용 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="treatmentType" className="text-right">진료내용 <span className="text-red-500">*</span></Label>
              <div className="col-span-3">
                <Select value={editFormData.treatmentType || ''} onValueChange={(value) => handleSelectChange('treatmentType', value)}>
                  <SelectTrigger className={formErrors.treatmentType ? "border-red-500" : ""}>
                    <SelectValue placeholder="진료내용을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {treatmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.treatmentType && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.treatmentType}</p>
                )}
              </div>
            </div>

            {/* 신환여부 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isNew" className="text-right">신환여부</Label>
              <div className="col-span-3 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isNew"
                  checked={editFormData.isNew || false}
                  onChange={(e) => handleCheckboxChange('isNew', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isNew" className="text-sm">신환</Label>
              </div>
            </div>

            {/* 상담여부 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isConsultation" className="text-right">상담여부</Label>
              <div className="col-span-3 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isConsultation"
                  checked={editFormData.isConsultation || false}
                  onChange={(e) => handleCheckboxChange('isConsultation', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isConsultation" className="text-sm">상담</Label>
              </div>
            </div>

            {/* 수납방법 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentMethod" className="text-right">수납방법 <span className="text-red-500">*</span></Label>
              <div className="col-span-3">
                <Select value={editFormData.paymentMethod || ''} onValueChange={(value) => handleSelectChange('paymentMethod', value)}>
                  <SelectTrigger className={formErrors.paymentMethod ? "border-red-500" : ""}>
                    <SelectValue placeholder="수납방법을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.paymentMethod && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.paymentMethod}</p>
                )}
              </div>
            </div>

            {/* 카드사 (카드 결제시에만 표시) */}
            {editFormData.paymentMethod === '카드' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cardCompany" className="text-right">카드사 <span className="text-red-500">*</span></Label>
                <div className="col-span-3">
                  <Select value={editFormData.cardCompany || ''} onValueChange={(value) => handleSelectChange('cardCompany', value)}>
                    <SelectTrigger className={formErrors.cardCompany ? "border-red-500" : ""}>
                      <SelectValue placeholder="카드사를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {cardCompanies.map((company) => (
                        <SelectItem key={company.value} value={company.value}>
                          {company.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.cardCompany && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.cardCompany}</p>
                  )}
                </div>
              </div>
            )}

            {/* 현금영수증 (현금/계좌이체시에만 표시) */}
            {(editFormData.paymentMethod === '현금' || editFormData.paymentMethod === '계좌이체') && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cashReceipt" className="text-right">현금영수증</Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="cashReceipt"
                    checked={editFormData.cashReceipt || false}
                    onChange={(e) => handleCheckboxChange('cashReceipt', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="cashReceipt" className="text-sm">현금영수증 발행</Label>
                </div>
              </div>
            )}

            {/* 수납금액 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="paymentAmount" className="text-right">수납금액</Label>
              <div className="col-span-3">
                <Input
                  id="paymentAmount"
                  name="paymentAmount"
                  type="text"
                  value={paymentAmountDisplay}
                  onChange={handlePaymentAmountChange}
                  onFocus={handlePaymentAmountFocus}
                  onBlur={handlePaymentAmountBlur}
                  placeholder="0"
                  disabled={editFormData.paymentMethod === '수납없음'}
                  className={editFormData.paymentMethod === '수납없음' ? "bg-gray-100" : ""}
                />
              </div>
            </div>

            {/* 메모 */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="notes" className="text-right mt-2">메모</Label>
              <div className="col-span-3">
                <Textarea
                  id="notes"
                  name="notes"
                  value={editFormData.notes || ''}
                  onChange={handleInputChange}
                  placeholder="메모를 입력하세요"
                  rows={3}
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